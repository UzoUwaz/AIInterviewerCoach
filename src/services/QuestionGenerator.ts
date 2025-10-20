import { 
  Question, 
  QuestionType, 
  QuestionCategory, 
  DifficultyLevel 
} from '../types/index';
import { JobDescriptionData } from '../types/parsing';
import { ResumeData } from '../types/resume';

export interface QuestionTemplate {
  id: string;
  template: string;
  type: QuestionType;
  category: QuestionCategory;
  difficulty: DifficultyLevel;
  expectedElements: string[];
  followUpTriggers: string[];
  keywords: string[];
  timeLimit?: number;
  experienceLevel?: string[];
  industry?: string[];
}

// Try to import question templates, but provide fallback if not available
let ALL_QUESTION_TEMPLATES: QuestionTemplate[] = [];
try {
  const templates = require('../data/questionTemplates');
  ALL_QUESTION_TEMPLATES = templates.ALL_QUESTION_TEMPLATES || [];
} catch (error) {
  console.warn('Question templates not found, will use fallback templates');
}

export interface QuestionGenerationOptions {
  count?: number;
  difficulty?: DifficultyLevel[];
  types?: QuestionType[];
  categories?: QuestionCategory[];
  experienceLevel?: string;
  industry?: string;
  includeFollowUps?: boolean;
  randomize?: boolean;
}

export interface GeneratedQuestionSet {
  questions: Question[];
  metadata: {
    totalGenerated: number;
    distribution: Record<QuestionType, number>;
    averageDifficulty: number;
    estimatedDuration: number;
  };
}

export class QuestionGenerator {
  private templates: QuestionTemplate[];
  private usedQuestionIds: Set<string> = new Set();

  constructor() {
    try {
      this.templates = [...ALL_QUESTION_TEMPLATES];
    } catch (error) {
      console.warn('Failed to load question templates, using fallback questions');
      this.templates = this.getFallbackTemplates();
    }
  }

  /**
   * Generate questions based on job description
   */
  async generateFromJobDescription(
    jobDescription: JobDescriptionData,
    options: QuestionGenerationOptions = {}
  ): Promise<GeneratedQuestionSet> {
    const {
      count = 10,
      difficulty = [DifficultyLevel.EASY, DifficultyLevel.MEDIUM, DifficultyLevel.HARD],
      types = [QuestionType.BEHAVIORAL, QuestionType.TECHNICAL, QuestionType.SITUATIONAL],
      randomize = true
    } = options;

    // Extract relevant keywords and skills from job description
    const jobKeywords = [
      ...jobDescription.skills,
      ...jobDescription.keywords,
      ...jobDescription.requirements
    ].map(k => k.toLowerCase());

    // Filter templates based on job relevance
    const relevantTemplates = this.filterTemplatesByRelevance(
      this.templates,
      jobKeywords,
      jobDescription.experienceLevel,
      jobDescription.industry,
      { difficulty, types }
    );

    // Generate questions with job-specific context
    const questions = this.generateQuestionsFromTemplates(
      relevantTemplates,
      count,
      {
        jobDescription,
        randomize,
        includeFollowUps: options.includeFollowUps
      }
    );

    return this.createQuestionSet(questions);
  }

  /**
   * Generate questions based on resume data
   */
  async generateFromResume(
    resume: ResumeData,
    options: QuestionGenerationOptions = {}
  ): Promise<Question[]> {
    const {
      count = 8,
      difficulty = [DifficultyLevel.EASY, DifficultyLevel.MEDIUM],
      types = [QuestionType.BEHAVIORAL, QuestionType.TECHNICAL],
      randomize = true
    } = options;

    console.log('🎯 Generating questions from resume with', resume.skills.length, 'skills');

    const questions: Question[] = [];
    
    // Prioritize skill-based questions if we have skills
    if (resume.skills.length > 0) {
      const skillBasedTemplates = this.templates.filter(t => t.id.startsWith('skill-based'));
      const skillQuestions = Math.min(count - 2, resume.skills.length, skillBasedTemplates.length);
      
      for (let i = 0; i < skillQuestions; i++) {
        const template = skillBasedTemplates[i % skillBasedTemplates.length];
        const question = this.instantiateTemplate(template, { resume });
        questions.push(question);
      }
      
      console.log('🎯 Generated', skillQuestions, 'skill-based questions');
    }
    
    // Fill remaining slots with general questions
    const generalTemplates = this.templates.filter(t => 
      t.id.startsWith('general') || t.id.startsWith('fallback')
    );
    
    const remainingCount = count - questions.length;
    for (let i = 0; i < remainingCount && i < generalTemplates.length; i++) {
      const template = generalTemplates[i];
      const question = this.instantiateTemplate(template, { resume });
      questions.push(question);
    }
    
    console.log('🎯 Total questions generated:', questions.length);
    
    return randomize ? this.shuffleArray(questions) : questions;
  }

  /**
   * Generate questions for specific categories
   */
  async generateByCategory(
    category: QuestionCategory,
    options: QuestionGenerationOptions = {}
  ): Promise<GeneratedQuestionSet> {
    const {
      count = 5,
      difficulty = [DifficultyLevel.EASY, DifficultyLevel.MEDIUM, DifficultyLevel.HARD],
      randomize = true
    } = options;

    const categoryTemplates = this.templates.filter(t => t.category === category);
    const filteredTemplates = this.filterTemplatesByDifficulty(categoryTemplates, difficulty);

    const questions = this.generateQuestionsFromTemplates(
      filteredTemplates,
      count,
      { randomize, includeFollowUps: options.includeFollowUps }
    );

    return this.createQuestionSet(questions);
  }

  /**
   * Generate adaptive questions based on previous responses
   */
  async generateAdaptiveQuestions(
    previousQuestions: Question[],
    performanceScores: number[],
    options: QuestionGenerationOptions = {}
  ): Promise<GeneratedQuestionSet> {
    const {
      count = 5,
      randomize = true
    } = options;

    // Analyze performance to determine next question difficulty
    const avgScore = performanceScores.reduce((sum, score) => sum + score, 0) / performanceScores.length;
    const adaptiveDifficulty = this.determineAdaptiveDifficulty(avgScore);

    // Identify weak areas from previous questions
    const weakCategories = this.identifyWeakCategories(previousQuestions, performanceScores);

    // Filter templates to focus on weak areas with appropriate difficulty
    const adaptiveTemplates = this.templates.filter(template => {
      const difficultyMatch = adaptiveDifficulty.includes(template.difficulty);
      const categoryMatch = weakCategories.length === 0 || weakCategories.includes(template.category);
      const notUsed = !this.usedQuestionIds.has(template.id);
      
      return difficultyMatch && categoryMatch && notUsed;
    });

    const questions = this.generateQuestionsFromTemplates(
      adaptiveTemplates,
      count,
      { randomize, includeFollowUps: options.includeFollowUps }
    );

    return this.createQuestionSet(questions);
  }

  /**
   * Generate follow-up questions based on a response
   */
  async generateFollowUpQuestions(
    originalQuestion: Question,
    response: string,
    options: { count?: number } = {}
  ): Promise<Question[]> {
    const { count = 2 } = options;
    const followUps: Question[] = [];

    // Analyze response for follow-up triggers
    const responseLower = response.toLowerCase();
    const triggers = originalQuestion.followUpTriggers || [];

    for (const trigger of triggers) {
      if (responseLower.includes(trigger.toLowerCase()) && followUps.length < count) {
        const followUpQuestion = this.generateFollowUpQuestion(originalQuestion, trigger, response);
        if (followUpQuestion) {
          followUps.push(followUpQuestion);
        }
      }
    }

    // Generate generic follow-ups if no specific triggers found
    if (followUps.length === 0) {
      const genericFollowUps = this.generateGenericFollowUps(originalQuestion, response, count);
      followUps.push(...genericFollowUps);
    }

    return followUps.slice(0, count);
  }

  /**
   * Get question recommendations based on job and resume match
   */
  async getRecommendedQuestions(
    jobDescription: JobDescriptionData,
    resume: ResumeData,
    options: QuestionGenerationOptions = {}
  ): Promise<GeneratedQuestionSet> {
    const {
      count = 12,
      randomize = true
    } = options;

    // Generate questions from both job and resume
    const jobQuestions = await this.generateFromJobDescription(jobDescription, { 
      count: Math.ceil(count * 0.6),
      randomize: false 
    });
    
    const resumeQuestions = await this.generateFromResume(resume, { 
      count: Math.ceil(count * 0.4),
      randomize: false 
    });

    // Combine and deduplicate
    const allQuestions = [...jobQuestions.questions, ...resumeQuestions];
    const uniqueQuestions = this.deduplicateQuestions(allQuestions);

    // Randomize if requested
    const finalQuestions = randomize 
      ? this.shuffleArray(uniqueQuestions).slice(0, count)
      : uniqueQuestions.slice(0, count);

    return this.createQuestionSet(finalQuestions);
  }

  private filterTemplatesByRelevance(
    templates: QuestionTemplate[],
    keywords: string[],
    experienceLevel?: string,
    industry?: string,
    filters?: { difficulty?: DifficultyLevel[]; types?: QuestionType[] }
  ): QuestionTemplate[] {
    return templates.filter(template => {
      // Experience level filter
      if (experienceLevel && template.experienceLevel && 
          !template.experienceLevel.includes(experienceLevel)) {
        return false;
      }

      // Industry filter
      if (industry && template.industry && 
          !template.industry.includes(industry)) {
        return false;
      }

      // Difficulty filter
      if (filters?.difficulty && !filters.difficulty.includes(template.difficulty)) {
        return false;
      }

      // Type filter
      if (filters?.types && !filters.types.includes(template.type)) {
        return false;
      }

      // Keyword relevance
      const templateKeywords = template.keywords.map(k => k.toLowerCase());
      const relevanceScore = keywords.filter(keyword => 
        templateKeywords.some(tk => tk.includes(keyword) || keyword.includes(tk))
      ).length;

      return relevanceScore > 0 || template.type === QuestionType.BEHAVIORAL;
    });
  }

  private filterTemplatesByDifficulty(
    templates: QuestionTemplate[],
    difficulties: DifficultyLevel[]
  ): QuestionTemplate[] {
    return templates.filter(template => difficulties.includes(template.difficulty));
  }

  private generateQuestionsFromTemplates(
    templates: QuestionTemplate[],
    count: number,
    context: {
      jobDescription?: JobDescriptionData;
      resume?: ResumeData;
      randomize?: boolean;
      includeFollowUps?: boolean;
    }
  ): Question[] {
    const { randomize = true, includeFollowUps = false } = context;
    
    // Shuffle templates if randomization is enabled
    const selectedTemplates = randomize 
      ? this.shuffleArray(templates).slice(0, count)
      : templates.slice(0, count);

    return selectedTemplates.map(template => {
      const question = this.instantiateTemplate(template, context);
      
      // Mark as used
      this.usedQuestionIds.add(template.id);
      
      return question;
    });
  }

  private instantiateTemplate(
    template: QuestionTemplate,
    context: {
      jobDescription?: JobDescriptionData;
      resume?: ResumeData;
    }
  ): Question {
    let questionText = template.template;

    // Replace placeholders with context-specific values
    if (context.resume) {
      // Replace university placeholder
      if (questionText.includes('{university}') && context.resume.education.length > 0) {
        const university = this.getRandomElement(context.resume.education.map(edu => edu.institution));
        questionText = questionText.replace(/{university}/g, university);
      }
      
      // Replace company placeholder
      if (questionText.includes('{company}') && context.resume.workExperience.length > 0) {
        const company = this.getRandomElement(context.resume.workExperience.map(exp => exp.company));
        questionText = questionText.replace(/{company}/g, company);
      }
      
      // Replace skill placeholder
      if (questionText.includes('{skill}') && context.resume.skills.length > 0) {
        const skill = this.getRandomElement(context.resume.skills.map(s => s.name));
        questionText = questionText.replace(/{skill}/g, skill);
      }
      
      // Replace degree placeholder
      if (questionText.includes('{degree}') && context.resume.education.length > 0) {
        const degree = this.getRandomElement(context.resume.education.map(edu => edu.degree));
        questionText = questionText.replace(/{degree}/g, degree);
      }
      
      // Replace position placeholder
      if (questionText.includes('{position}') && context.resume.workExperience.length > 0) {
        const position = this.getRandomElement(context.resume.workExperience.map(exp => exp.position));
        questionText = questionText.replace(/{position}/g, position);
      }
    }

    // Replace any remaining placeholders with generic values
    questionText = questionText.replace(/{university}/g, 'your university');
    questionText = questionText.replace(/{company}/g, 'your previous company');
    questionText = questionText.replace(/{skill}/g, 'your technical skills');
    questionText = questionText.replace(/{degree}/g, 'your degree');
    questionText = questionText.replace(/{position}/g, 'your previous role');

    return {
      id: this.generateQuestionId(),
      text: questionText,
      type: template.type,
      category: template.category,
      difficulty: template.difficulty,
      expectedElements: template.expectedElements,
      followUpTriggers: template.followUpTriggers,
      timeLimit: template.timeLimit,
      metadata: {
        templateId: template.id,
        generatedAt: new Date(),
        context: context.jobDescription ? 'job-based' : context.resume ? 'resume-based' : 'generic'
      }
    };
  }

  private replacePlaceholders(
    template: string,
    context: {
      jobDescription?: JobDescriptionData;
      resume?: ResumeData;
    }
  ): string {
    let result = template;

    // Replace job-specific placeholders
    if (context.jobDescription) {
      result = result.replace(/{company}/g, context.jobDescription.company);
      result = result.replace(/{position}/g, context.jobDescription.title);
      
      // Replace skill placeholders
      if (result.includes('{skill}') && context.jobDescription.skills.length > 0) {
        const randomSkill = this.getRandomElement(context.jobDescription.skills);
        result = result.replace(/{skill}/g, randomSkill);
      }
      
      // Replace technology placeholders
      if (result.includes('{technology}') && context.jobDescription.skills.length > 0) {
        const techSkills = context.jobDescription.skills.filter(skill => 
          ['javascript', 'python', 'java', 'react', 'node', 'sql'].some(tech => 
            skill.toLowerCase().includes(tech)
          )
        );
        const technology = techSkills.length > 0 
          ? this.getRandomElement(techSkills)
          : this.getRandomElement(context.jobDescription.skills);
        result = result.replace(/{technology}/g, technology);
      }
    }

    // Replace resume-specific placeholders
    if (context.resume) {
      if (result.includes('{skill}') && context.resume.skills.length > 0) {
        const randomSkill = this.getRandomElement(context.resume.skills.map(s => s.name));
        result = result.replace(/{skill}/g, randomSkill);
      }
      
      if (result.includes('{company}') && context.resume.workExperience.length > 0) {
        const randomCompany = this.getRandomElement(context.resume.workExperience.map(exp => exp.company));
        result = result.replace(/{company}/g, randomCompany);
      }
    }

    // Replace generic placeholders with common values
    const genericReplacements = {
      '{concept1}': ['REST', 'GraphQL', 'Microservices', 'Monolith', 'SQL', 'NoSQL'],
      '{concept2}': ['SOAP', 'REST', 'Serverless', 'Containers', 'NoSQL', 'SQL'],
      '{system_type}': ['web application', 'mobile app', 'API service', 'data pipeline'],
      '{scale}': ['1 million', '10 million', '100 million'],
      '{issue_type}': ['memory leak', 'performance issue', 'crash', 'data corruption'],
      '{feature}': ['authentication', 'search', 'notifications', 'file upload'],
      '{testing_type}': ['unit', 'integration', 'end-to-end', 'performance'],
      '{old_system}': ['legacy database', 'monolithic application', 'on-premise system'],
      '{new_system}': ['cloud platform', 'microservices architecture', 'modern database']
    };

    for (const [placeholder, options] of Object.entries(genericReplacements)) {
      if (result.includes(placeholder)) {
        const replacement = this.getRandomElement(options);
        result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), replacement);
      }
    }

    return result;
  }

  private generateFollowUpQuestion(
    originalQuestion: Question,
    trigger: string,
    response: string
  ): Question | null {
    const followUpTemplates = {
      'conflict': 'What was the outcome of that conflict? How did it affect the team dynamics?',
      'challenge': 'What was the most difficult part of that challenge? How did you overcome it?',
      'stakeholder': 'How did you manage stakeholder expectations during that process?',
      'testing': 'What testing strategies did you implement? How did you ensure quality?',
      'performance': 'What specific performance improvements did you achieve? How did you measure them?',
      'team': 'How did you ensure effective team collaboration during that project?',
      'timeline': 'How did you manage the timeline constraints? What would you do differently?'
    };

    const template = followUpTemplates[trigger as keyof typeof followUpTemplates];
    if (!template) return null;

    return {
      id: this.generateQuestionId(),
      text: template,
      type: QuestionType.FOLLOW_UP,
      category: originalQuestion.category,
      difficulty: originalQuestion.difficulty,
      expectedElements: ['Specific details', 'Lessons learned', 'Impact'],
      followUpTriggers: [],
      timeLimit: 120,
      metadata: {
        parentQuestionId: originalQuestion.id,
        trigger,
        generatedAt: new Date(),
        context: 'follow-up'
      }
    };
  }

  private generateGenericFollowUps(
    originalQuestion: Question,
    response: string,
    count: number
  ): Question[] {
    const genericFollowUps = [
      'Can you elaborate on that specific example?',
      'What would you do differently if you faced a similar situation again?',
      'How did that experience change your approach to similar challenges?',
      'What was the most important lesson you learned from that experience?'
    ];

    return genericFollowUps.slice(0, count).map(text => ({
      id: this.generateQuestionId(),
      text,
      type: QuestionType.FOLLOW_UP,
      category: originalQuestion.category,
      difficulty: DifficultyLevel.EASY,
      expectedElements: ['Reflection', 'Learning', 'Growth'],
      followUpTriggers: [],
      timeLimit: 90,
      metadata: {
        parentQuestionId: originalQuestion.id,
        generatedAt: new Date(),
        context: 'generic-follow-up'
      }
    }));
  }

  private determineExperienceLevel(resume: ResumeData): string {
    const totalYears = resume.workExperience.reduce((total, exp) => {
      const duration = exp.duration || '';
      const years = this.extractYearsFromDuration(duration);
      return total + years;
    }, 0);

    if (totalYears < 2) return 'entry';
    if (totalYears < 5) return 'mid';
    if (totalYears < 10) return 'senior';
    return 'lead';
  }

  private extractYearsFromDuration(duration: string): number {
    const yearMatch = duration.match(/(\d+)\s*year/);
    const monthMatch = duration.match(/(\d+)\s*month/);
    
    let years = yearMatch ? parseInt(yearMatch[1]) : 0;
    const months = monthMatch ? parseInt(monthMatch[1]) : 0;
    
    years += months / 12;
    return years;
  }

  private determineAdaptiveDifficulty(avgScore: number): DifficultyLevel[] {
    if (avgScore >= 0.8) {
      return [DifficultyLevel.MEDIUM, DifficultyLevel.HARD];
    } else if (avgScore >= 0.6) {
      return [DifficultyLevel.EASY, DifficultyLevel.MEDIUM];
    } else {
      return [DifficultyLevel.EASY];
    }
  }

  private identifyWeakCategories(
    questions: Question[],
    scores: number[]
  ): QuestionCategory[] {
    const categoryScores: Record<QuestionCategory, number[]> = {} as any;

    questions.forEach((question, index) => {
      if (!categoryScores[question.category]) {
        categoryScores[question.category] = [];
      }
      categoryScores[question.category].push(scores[index] || 0);
    });

    const weakCategories: QuestionCategory[] = [];
    for (const [category, categoryScoreList] of Object.entries(categoryScores)) {
      const avgScore = categoryScoreList.reduce((sum, score) => sum + score, 0) / categoryScoreList.length;
      if (avgScore < 0.6) {
        weakCategories.push(category as QuestionCategory);
      }
    }

    return weakCategories;
  }

  private createQuestionSet(questions: Question[]): GeneratedQuestionSet {
    const distribution = questions.reduce((acc, question) => {
      acc[question.type] = (acc[question.type] || 0) + 1;
      return acc;
    }, {} as Record<QuestionType, number>);

    const totalDifficulty = questions.reduce((sum, question) => {
      const difficultyValue = question.difficulty === DifficultyLevel.EASY ? 1 :
                             question.difficulty === DifficultyLevel.MEDIUM ? 2 : 3;
      return sum + difficultyValue;
    }, 0);

    const estimatedDuration = questions.reduce((sum, question) => {
      return sum + (question.timeLimit || 120);
    }, 0);

    return {
      questions,
      metadata: {
        totalGenerated: questions.length,
        distribution,
        averageDifficulty: totalDifficulty / questions.length,
        estimatedDuration
      }
    };
  }

  private deduplicateQuestions(questions: Question[]): Question[] {
    const seen = new Set<string>();
    return questions.filter(question => {
      const key = question.text.toLowerCase().replace(/\s+/g, ' ').trim();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private generateQuestionId(): string {
    return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getFallbackTemplates(): QuestionTemplate[] {
    return [
      {
        id: 'fallback-1',
        template: 'Tell me about yourself and your professional background.',
        type: QuestionType.BEHAVIORAL,
        category: QuestionCategory.COMMUNICATION,
        difficulty: DifficultyLevel.EASY,
        expectedElements: ['Background', 'Experience', 'Skills'],
        followUpTriggers: ['experience', 'background'],
        keywords: ['general', 'introduction'],
        timeLimit: 180
      },
      {
        id: 'skill-based-1',
        template: 'I see you have experience with {skill}. Can you walk me through a specific project where you applied this technology?',
        type: QuestionType.TECHNICAL,
        category: QuestionCategory.PROBLEM_SOLVING,
        difficulty: DifficultyLevel.MEDIUM,
        expectedElements: ['Technical Application', 'Project Details', 'Results'],
        followUpTriggers: ['skill', 'project', 'technical'],
        keywords: ['technical', 'skill', 'project'],
        timeLimit: 180
      },
      {
        id: 'skill-based-2',
        template: 'How would you explain {skill} to someone who has never used it before?',
        type: QuestionType.TECHNICAL,
        category: QuestionCategory.COMMUNICATION,
        difficulty: DifficultyLevel.EASY,
        expectedElements: ['Clear Explanation', 'Teaching Ability', 'Technical Knowledge'],
        followUpTriggers: ['explanation', 'teaching'],
        keywords: ['explanation', 'communication', 'technical'],
        timeLimit: 120
      },
      {
        id: 'skill-based-3',
        template: 'What challenges have you faced while working with {skill}, and how did you overcome them?',
        type: QuestionType.BEHAVIORAL,
        category: QuestionCategory.PROBLEM_SOLVING,
        difficulty: DifficultyLevel.MEDIUM,
        expectedElements: ['Challenges', 'Problem Solving', 'Learning'],
        followUpTriggers: ['challenge', 'problem', 'solution'],
        keywords: ['challenge', 'problem-solving'],
        timeLimit: 150
      },
      {
        id: 'skill-based-4',
        template: 'How do you stay updated with the latest developments in {skill}?',
        type: QuestionType.BEHAVIORAL,
        category: QuestionCategory.CAREER_GOALS,
        difficulty: DifficultyLevel.EASY,
        expectedElements: ['Learning Methods', 'Continuous Improvement', 'Industry Awareness'],
        followUpTriggers: ['learning', 'development'],
        keywords: ['learning', 'development', 'growth'],
        timeLimit: 120
      },
      {
        id: 'skill-based-5',
        template: 'Can you compare {skill} with similar technologies you\'ve worked with?',
        type: QuestionType.TECHNICAL,
        category: QuestionCategory.PROBLEM_SOLVING,
        difficulty: DifficultyLevel.HARD,
        expectedElements: ['Technical Comparison', 'Analysis', 'Experience'],
        followUpTriggers: ['comparison', 'analysis'],
        keywords: ['comparison', 'technical', 'analysis'],
        timeLimit: 180
      },
      {
        id: 'general-2',
        template: 'What interests you most about this type of role?',
        type: QuestionType.BEHAVIORAL,
        category: QuestionCategory.CAREER_GOALS,
        difficulty: DifficultyLevel.EASY,
        expectedElements: ['Motivation', 'Interest', 'Goals'],
        followUpTriggers: ['motivation', 'interest'],
        keywords: ['motivation', 'career'],
        timeLimit: 120
      },
      {
        id: 'general-3',
        template: 'Describe a challenging project you worked on and how you handled it.',
        type: QuestionType.BEHAVIORAL,
        category: QuestionCategory.PROBLEM_SOLVING,
        difficulty: DifficultyLevel.MEDIUM,
        expectedElements: ['Challenge', 'Approach', 'Outcome'],
        followUpTriggers: ['challenge', 'project'],
        keywords: ['project', 'challenge'],
        timeLimit: 180
      },
      {
        id: 'general-4',
        template: 'How do you handle working under pressure or tight deadlines?',
        type: QuestionType.BEHAVIORAL,
        category: QuestionCategory.PROBLEM_SOLVING,
        difficulty: DifficultyLevel.MEDIUM,
        expectedElements: ['Strategy', 'Example', 'Results'],
        followUpTriggers: ['pressure', 'deadline'],
        keywords: ['pressure', 'deadline'],
        timeLimit: 150
      }
    ];
  }

  // Public utility methods
  resetUsedQuestions(): void {
    this.usedQuestionIds.clear();
  }

  getUsedQuestionCount(): number {
    return this.usedQuestionIds.size;
  }

  getAvailableTemplateCount(): number {
    return this.templates.length - this.usedQuestionIds.size;
  }
}