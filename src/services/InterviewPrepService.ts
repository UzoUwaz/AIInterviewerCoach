import { JobParsingService } from './JobParsingService';
import { ResumeParser } from './ResumeParser';
import { ResumeJobMatcher } from './ResumeJobMatcher';
import { QuestionGenerator } from './QuestionGenerator';
import { JobDescriptionData } from '../types/parsing';
import { ResumeData, GapAnalysis, ResumeJobMatch } from '../types/resume';
import { Question } from '../types/index';

export interface InterviewPrepPlan {
  jobAnalysis: JobDescriptionData;
  resumeAnalysis?: ResumeData;
  gapAnalysis?: GapAnalysis;
  jobMatch?: ResumeJobMatch;
  recommendedQuestions: Question[];
  focusAreas: string[];
  preparationTips: string[];
  estimatedPrepTime: number;
}

export interface PrepOptions {
  questionCount?: number;
  includeResume?: boolean;
  focusOnWeakAreas?: boolean;
  difficultyLevel?: 'easy' | 'medium' | 'hard' | 'adaptive';
}

export class InterviewPrepService {
  private jobParsingService: JobParsingService;
  private resumeParser: ResumeParser;
  private jobMatcher: ResumeJobMatcher;
  private questionGenerator: QuestionGenerator;

  constructor() {
    this.jobParsingService = new JobParsingService();
    this.resumeParser = new ResumeParser();
    this.jobMatcher = new ResumeJobMatcher();
    this.questionGenerator = new QuestionGenerator();
  }

  /**
   * Create a comprehensive interview preparation plan
   */
  async createPrepPlan(
    jobDescriptionText: string,
    resumeFile?: File,
    options: PrepOptions = {}
  ): Promise<InterviewPrepPlan> {
    const {
      questionCount = 12,
      includeResume = true,
      focusOnWeakAreas = true,
      difficultyLevel = 'adaptive'
    } = options;

    // Parse job description
    const jobAnalysis = await this.jobParsingService.parseJobDescription(jobDescriptionText);

    let resumeAnalysis: ResumeData | undefined;
    let gapAnalysis: GapAnalysis | undefined;
    let jobMatch: ResumeJobMatch | undefined;

    // Parse resume if provided
    if (includeResume && resumeFile) {
      try {
        resumeAnalysis = await this.resumeParser.parseResumeFromFile(resumeFile);
        
        // Perform gap analysis and job matching
        gapAnalysis = await this.resumeParser.analyzeGaps(resumeAnalysis, jobAnalysis);
        jobMatch = await this.jobMatcher.analyzeMatch(resumeAnalysis, jobAnalysis);
      } catch (error) {
        console.warn('Resume parsing failed:', error);
      }
    }

    // Generate questions based on available data
    const questionSet = resumeAnalysis 
      ? await this.questionGenerator.getRecommendedQuestions(jobAnalysis, resumeAnalysis, {
          count: questionCount,
          randomize: true
        })
      : await this.questionGenerator.generateFromJobDescription(jobAnalysis, {
          count: questionCount,
          randomize: true
        });

    // Determine focus areas
    const focusAreas = this.determineFocusAreas(jobAnalysis, gapAnalysis);

    // Generate preparation tips
    const preparationTips = this.generatePreparationTips(jobAnalysis, gapAnalysis, jobMatch);

    // Estimate preparation time
    const estimatedPrepTime = this.estimatePreparationTime(
      questionSet.questions.length,
      focusAreas.length,
      gapAnalysis?.missingSkills.length || 0
    );

    return {
      jobAnalysis,
      resumeAnalysis,
      gapAnalysis,
      jobMatch,
      recommendedQuestions: questionSet.questions,
      focusAreas,
      preparationTips,
      estimatedPrepTime
    };
  }

  /**
   * Generate questions for specific skill gaps
   */
  async generateGapFocusedQuestions(
    gapAnalysis: GapAnalysis,
    jobDescription: JobDescriptionData,
    count: number = 8
  ): Promise<Question[]> {
    const missingSkills = gapAnalysis.missingSkills.slice(0, 5);
    
    // Create a modified job description focusing on missing skills
    const focusedJobDesc: JobDescriptionData = {
      ...jobDescription,
      skills: missingSkills,
      keywords: [...missingSkills, ...jobDescription.keywords.slice(0, 5)]
    };

    const questionSet = await this.questionGenerator.generateFromJobDescription(focusedJobDesc, {
      count,
      randomize: true
    });

    return questionSet.questions;
  }

  /**
   * Get practice recommendations based on performance
   */
  async getPracticeRecommendations(
    previousQuestions: Question[],
    performanceScores: number[],
    jobDescription: JobDescriptionData
  ): Promise<{
    nextQuestions: Question[];
    focusAreas: string[];
    improvementTips: string[];
  }> {
    // Generate adaptive questions based on performance
    const adaptiveQuestionSet = await this.questionGenerator.generateAdaptiveQuestions(
      previousQuestions,
      performanceScores,
      { count: 5 }
    );

    // Identify weak areas
    const weakCategories = this.identifyWeakCategories(previousQuestions, performanceScores);
    const focusAreas = this.categoriesToFocusAreas(weakCategories);

    // Generate improvement tips
    const improvementTips = this.generateImprovementTips(weakCategories, performanceScores);

    return {
      nextQuestions: adaptiveQuestionSet.questions,
      focusAreas,
      improvementTips
    };
  }

  /**
   * Analyze multiple job descriptions for common patterns
   */
  async analyzeJobMarket(jobTexts: string[]): Promise<{
    commonSkills: Array<{ skill: string; frequency: number }>;
    commonKeywords: Array<{ keyword: string; frequency: number }>;
    industryTrends: string[];
    recommendedSkills: string[];
  }> {
    const jobAnalyses = await this.jobParsingService.parseMultipleJobs(jobTexts);

    // Aggregate skills across all jobs
    const skillFrequency: Record<string, number> = {};
    const keywordFrequency: Record<string, number> = {};

    jobAnalyses.forEach(job => {
      job.skills.forEach(skill => {
        skillFrequency[skill] = (skillFrequency[skill] || 0) + 1;
      });
      
      job.keywords.forEach(keyword => {
        keywordFrequency[keyword] = (keywordFrequency[keyword] || 0) + 1;
      });
    });

    const commonSkills = Object.entries(skillFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([skill, frequency]) => ({ skill, frequency }));

    const commonKeywords = Object.entries(keywordFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15)
      .map(([keyword, frequency]) => ({ keyword, frequency }));

    // Identify industry trends
    const industries = jobAnalyses.map(job => job.industry);
    const industryTrends = [...new Set(industries)];

    // Recommend skills based on frequency and market demand
    const recommendedSkills = commonSkills
      .filter(({ frequency }) => frequency >= Math.ceil(jobAnalyses.length * 0.3))
      .map(({ skill }) => skill)
      .slice(0, 10);

    return {
      commonSkills,
      commonKeywords,
      industryTrends,
      recommendedSkills
    };
  }

  /**
   * Generate personalized study plan
   */
  async generateStudyPlan(
    gapAnalysis: GapAnalysis,
    timeAvailable: number, // hours per week
    targetDate: Date
  ): Promise<{
    weeklyPlan: Array<{
      week: number;
      focus: string[];
      activities: string[];
      estimatedHours: number;
    }>;
    milestones: Array<{
      date: Date;
      goal: string;
      assessment: string;
    }>;
    resources: Array<{
      skill: string;
      resources: string[];
    }>;
  }> {
    const weeksAvailable = Math.ceil(
      (targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7)
    );

    const prioritySkills = gapAnalysis.missingSkills.slice(0, 6);
    const skillsPerWeek = Math.max(1, Math.floor(prioritySkills.length / weeksAvailable));

    const weeklyPlan = [];
    for (let week = 1; week <= weeksAvailable; week++) {
      const startIndex = (week - 1) * skillsPerWeek;
      const weekSkills = prioritySkills.slice(startIndex, startIndex + skillsPerWeek);
      
      weeklyPlan.push({
        week,
        focus: weekSkills,
        activities: this.generateWeeklyActivities(weekSkills),
        estimatedHours: Math.min(timeAvailable, weekSkills.length * 3)
      });
    }

    const milestones = this.generateMilestones(weeksAvailable, targetDate);
    const resources = this.generateLearningResources(prioritySkills);

    return {
      weeklyPlan,
      milestones,
      resources
    };
  }

  private determineFocusAreas(
    jobAnalysis: JobDescriptionData,
    gapAnalysis?: GapAnalysis
  ): string[] {
    const focusAreas: string[] = [];

    // Add job-specific focus areas
    if (jobAnalysis.skills.length > 0) {
      focusAreas.push(`Technical skills: ${jobAnalysis.skills.slice(0, 3).join(', ')}`);
    }

    if (jobAnalysis.experienceLevel !== 'unknown') {
      focusAreas.push(`${jobAnalysis.experienceLevel}-level responsibilities`);
    }

    // Add gap-based focus areas
    if (gapAnalysis) {
      if (gapAnalysis.missingSkills.length > 0) {
        focusAreas.push(`Skill gaps: ${gapAnalysis.missingSkills.slice(0, 3).join(', ')}`);
      }

      if (gapAnalysis.overallMatch < 0.6) {
        focusAreas.push('Demonstrating relevant experience');
      }
    }

    // Add industry-specific areas
    if (jobAnalysis.industry !== 'Other') {
      focusAreas.push(`${jobAnalysis.industry} industry knowledge`);
    }

    return focusAreas.slice(0, 5);
  }

  private generatePreparationTips(
    jobAnalysis: JobDescriptionData,
    gapAnalysis?: GapAnalysis,
    jobMatch?: ResumeJobMatch
  ): string[] {
    const tips: string[] = [];

    // Job-specific tips
    tips.push(`Research ${jobAnalysis.company} thoroughly - their mission, values, and recent news`);
    tips.push(`Prepare specific examples demonstrating ${jobAnalysis.skills.slice(0, 2).join(' and ')} skills`);

    // Gap-based tips
    if (gapAnalysis) {
      if (gapAnalysis.missingSkills.length > 0) {
        tips.push(`Be prepared to discuss how you would learn ${gapAnalysis.missingSkills[0]} quickly`);
      }

      if (gapAnalysis.strengths.length > 0) {
        tips.push(`Emphasize your strong skills: ${gapAnalysis.strengths.slice(0, 2).join(', ')}`);
      }
    }

    // Match-based tips
    if (jobMatch) {
      if (jobMatch.overallFit === 'excellent' || jobMatch.overallFit === 'good') {
        tips.push('Highlight your relevant experience and strong skill alignment');
      } else {
        tips.push('Focus on transferable skills and enthusiasm for learning');
      }
    }

    // General tips
    tips.push('Practice the STAR method for behavioral questions');
    tips.push('Prepare thoughtful questions about the role and company culture');
    tips.push('Review your resume and be ready to discuss any project in detail');

    return tips.slice(0, 8);
  }

  private estimatePreparationTime(
    questionCount: number,
    focusAreaCount: number,
    skillGapCount: number
  ): number {
    // Base time for questions (15 minutes per question for practice)
    let totalMinutes = questionCount * 15;

    // Additional time for focus areas (30 minutes each)
    totalMinutes += focusAreaCount * 30;

    // Extra time for skill gaps (45 minutes each for research)
    totalMinutes += skillGapCount * 45;

    // Company research time
    totalMinutes += 60;

    return Math.ceil(totalMinutes / 60); // Return hours
  }

  private identifyWeakCategories(questions: Question[], scores: number[]): string[] {
    const categoryScores: Record<string, number[]> = {};

    questions.forEach((question, index) => {
      const category = question.category;
      if (!categoryScores[category]) {
        categoryScores[category] = [];
      }
      categoryScores[category].push(scores[index] || 0);
    });

    const weakCategories: string[] = [];
    for (const [category, categoryScores_] of Object.entries(categoryScores)) {
      const avgScore = categoryScores_.reduce((sum, score) => sum + score, 0) / categoryScores_.length;
      if (avgScore < 0.6) {
        weakCategories.push(category);
      }
    }

    return weakCategories;
  }

  private categoriesToFocusAreas(categories: string[]): string[] {
    const categoryMap: Record<string, string> = {
      'teamwork': 'Team collaboration and communication',
      'leadership': 'Leadership and project management',
      'problem_solving': 'Problem-solving and analytical thinking',
      'technical': 'Technical knowledge and implementation',
      'communication': 'Communication and presentation skills'
    };

    return categories.map(cat => categoryMap[cat] || cat);
  }

  private generateImprovementTips(categories: string[], scores: number[]): string[] {
    const tips: string[] = [];
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    if (avgScore < 0.5) {
      tips.push('Focus on providing more specific examples with clear outcomes');
      tips.push('Practice structuring your answers using the STAR method');
    }

    if (categories.includes('technical')) {
      tips.push('Review fundamental concepts and practice explaining them clearly');
      tips.push('Prepare code examples and be ready to walk through your thought process');
    }

    if (categories.includes('behavioral')) {
      tips.push('Prepare more diverse examples from different experiences');
      tips.push('Focus on quantifiable results and lessons learned');
    }

    return tips;
  }

  private generateWeeklyActivities(skills: string[]): string[] {
    const activities: string[] = [];
    
    skills.forEach(skill => {
      activities.push(`Study ${skill} fundamentals and best practices`);
      activities.push(`Complete hands-on ${skill} exercises or tutorials`);
      activities.push(`Practice explaining ${skill} concepts clearly`);
    });

    activities.push('Mock interview practice focusing on this week\'s skills');
    activities.push('Review and update resume/portfolio with new knowledge');

    return activities;
  }

  private generateMilestones(weeks: number, targetDate: Date): Array<{
    date: Date;
    goal: string;
    assessment: string;
  }> {
    const milestones = [];
    const weekMs = 7 * 24 * 60 * 60 * 1000;

    for (let i = 1; i <= weeks; i++) {
      const milestoneDate = new Date(targetDate.getTime() - (weeks - i) * weekMs);
      milestones.push({
        date: milestoneDate,
        goal: `Complete week ${i} skill development`,
        assessment: `Self-assessment quiz and practice interview`
      });
    }

    return milestones;
  }

  private generateLearningResources(skills: string[]): Array<{
    skill: string;
    resources: string[];
  }> {
    const resourceMap: Record<string, string[]> = {
      'javascript': ['MDN Web Docs', 'JavaScript.info', 'FreeCodeCamp'],
      'react': ['React Official Docs', 'React Tutorial', 'Scrimba React Course'],
      'python': ['Python.org Tutorial', 'Automate the Boring Stuff', 'Python Crash Course'],
      'sql': ['W3Schools SQL', 'SQLBolt', 'HackerRank SQL'],
      'communication': ['Toastmasters', 'TED Talks on Communication', 'Public Speaking Practice'],
      'leadership': ['Leadership Books', 'Management Courses', 'Team Project Practice']
    };

    return skills.map(skill => ({
      skill,
      resources: resourceMap[skill.toLowerCase()] || [
        'Online tutorials and documentation',
        'Practice projects and exercises',
        'Community forums and discussions'
      ]
    }));
  }
}