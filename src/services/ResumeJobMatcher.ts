import { ResumeData, GapAnalysis, ResumeJobMatch, MatchLevel } from '../types/resume';
import { JobDescriptionData } from '../types/parsing';
import { ResumeParser } from './ResumeParser';

export class ResumeJobMatcher {
  private resumeParser: ResumeParser;

  constructor() {
    this.resumeParser = new ResumeParser();
  }

  async analyzeMatch(resume: ResumeData, jobDescription: JobDescriptionData): Promise<ResumeJobMatch> {
    const gapAnalysis = await this.resumeParser.analyzeGaps(resume, jobDescription);
    
    const skillMatch = this.calculateSkillMatch(resume, jobDescription);
    const experienceMatch = this.calculateExperienceMatch(resume, jobDescription);
    const educationMatch = this.calculateEducationMatch(resume, jobDescription);
    
    const overallScore = (skillMatch * 0.5) + (experienceMatch * 0.3) + (educationMatch * 0.2);
    const matchLevel = this.determineMatchLevel(overallScore);
    
    const recommendations = this.generateMatchRecommendations(gapAnalysis, skillMatch, experienceMatch);

    return {
      jobId: jobDescription.id,
      matchScore: overallScore,
      matchedSkills: gapAnalysis.strengths,
      missingSkills: gapAnalysis.missingSkills,
      experienceMatch,
      educationMatch,
      overallFit: matchLevel,
      recommendations
    };
  }

  private calculateSkillMatch(resume: ResumeData, job: JobDescriptionData): number {
    const resumeSkills = resume.skills.map(s => s.name.toLowerCase());
    const jobSkills = job.skills.map(s => s.toLowerCase());
    
    if (jobSkills.length === 0) return 1.0;
    
    const matchedSkills = jobSkills.filter(skill => resumeSkills.includes(skill));
    return matchedSkills.length / jobSkills.length;
  }

  private calculateExperienceMatch(resume: ResumeData, job: JobDescriptionData): number {
    // Simple experience matching based on job title and industry keywords
    const jobTitle = job.title.toLowerCase();
    const jobKeywords = job.keywords.map(k => k.toLowerCase());
    
    let experienceScore = 0;
    let totalExperience = 0;

    for (const exp of resume.workExperience) {
      const expTitle = exp.position.toLowerCase();
      const expDescription = exp.description.toLowerCase();
      
      // Check title similarity
      if (this.calculateSimilarity(expTitle, jobTitle) > 0.3) {
        experienceScore += 0.4;
      }
      
      // Check keyword matches in experience
      const keywordMatches = jobKeywords.filter(keyword => 
        expDescription.includes(keyword) || expTitle.includes(keyword)
      );
      
      if (keywordMatches.length > 0) {
        experienceScore += (keywordMatches.length / jobKeywords.length) * 0.3;
      }
      
      // Add experience duration bonus
      if (exp.duration) {
        const years = this.extractYearsFromDuration(exp.duration);
        totalExperience += years;
      }
    }

    // Experience level matching
    const requiredLevel = this.getRequiredExperienceLevel(job);
    const experienceBonus = Math.min(totalExperience / requiredLevel, 1.0) * 0.3;
    
    return Math.min(experienceScore + experienceBonus, 1.0);
  }

  private calculateEducationMatch(resume: ResumeData, job: JobDescriptionData): number {
    if (resume.education.length === 0) return 0.5; // Neutral if no education info
    
    const jobRequirements = job.requirements.join(' ').toLowerCase();
    const jobKeywords = job.keywords.map(k => k.toLowerCase());
    
    let educationScore = 0;
    
    for (const edu of resume.education) {
      const degree = edu.degree.toLowerCase();
      const field = edu.field?.toLowerCase() || '';
      
      // Check if degree level matches requirements
      if (jobRequirements.includes('bachelor') && degree.includes('bachelor')) {
        educationScore += 0.4;
      } else if (jobRequirements.includes('master') && degree.includes('master')) {
        educationScore += 0.5;
      } else if (jobRequirements.includes('phd') && degree.includes('phd')) {
        educationScore += 0.6;
      } else if (degree.includes('bachelor') || degree.includes('master') || degree.includes('phd')) {
        educationScore += 0.3; // Any degree is better than none
      }
      
      // Check field relevance
      const fieldMatches = jobKeywords.filter(keyword => 
        field.includes(keyword) || degree.includes(keyword)
      );
      
      if (fieldMatches.length > 0) {
        educationScore += (fieldMatches.length / jobKeywords.length) * 0.3;
      }
    }
    
    return Math.min(educationScore, 1.0);
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return totalWords > 0 ? commonWords.length / totalWords : 0;
  }

  private extractYearsFromDuration(duration: string): number {
    const yearMatch = duration.match(/(\d+)\s*year/);
    const monthMatch = duration.match(/(\d+)\s*month/);
    
    let years = yearMatch ? parseInt(yearMatch[1]) : 0;
    const months = monthMatch ? parseInt(monthMatch[1]) : 0;
    
    years += months / 12;
    return years;
  }

  private getRequiredExperienceLevel(job: JobDescriptionData): number {
    const requirements = job.requirements.join(' ').toLowerCase();
    const title = job.title.toLowerCase();
    
    if (requirements.includes('senior') || title.includes('senior')) return 5;
    if (requirements.includes('lead') || title.includes('lead')) return 7;
    if (requirements.includes('principal') || title.includes('principal')) return 10;
    if (requirements.includes('entry') || title.includes('junior')) return 1;
    
    // Look for year requirements
    const yearMatch = requirements.match(/(\d+)\+?\s*years?/);
    if (yearMatch) return parseInt(yearMatch[1]);
    
    return 3; // Default mid-level requirement
  }

  private determineMatchLevel(score: number): MatchLevel {
    if (score >= 0.8) return MatchLevel.EXCELLENT;
    if (score >= 0.6) return MatchLevel.GOOD;
    if (score >= 0.4) return MatchLevel.FAIR;
    return MatchLevel.POOR;
  }

  private generateMatchRecommendations(
    gapAnalysis: GapAnalysis, 
    skillMatch: number, 
    experienceMatch: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (skillMatch < 0.5) {
      recommendations.push('Focus on developing the missing technical skills mentioned in the job requirements');
      if (gapAnalysis.missingSkills.length > 0) {
        recommendations.push(`Priority skills to learn: ${gapAnalysis.missingSkills.slice(0, 3).join(', ')}`);
      }
    }
    
    if (experienceMatch < 0.4) {
      recommendations.push('Consider highlighting relevant projects or experiences that demonstrate similar skills');
      recommendations.push('Look for opportunities to gain more relevant experience in this field');
    }
    
    if (gapAnalysis.overallMatch > 0.7) {
      recommendations.push('Strong match! Emphasize your relevant skills and experience in your application');
    } else if (gapAnalysis.overallMatch > 0.5) {
      recommendations.push('Good potential match. Focus on addressing the skill gaps identified');
    } else {
      recommendations.push('Consider developing more relevant skills before applying to similar positions');
    }
    
    return recommendations;
  }

  async batchAnalyzeJobs(resume: ResumeData, jobs: JobDescriptionData[]): Promise<ResumeJobMatch[]> {
    const matches: ResumeJobMatch[] = [];
    
    for (const job of jobs) {
      try {
        const match = await this.analyzeMatch(resume, job);
        matches.push(match);
      } catch (error) {
        console.warn(`Failed to analyze match for job ${job.id}:`, error);
      }
    }
    
    // Sort by match score (highest first)
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  async findBestMatches(resume: ResumeData, jobs: JobDescriptionData[], topN: number = 5): Promise<ResumeJobMatch[]> {
    const allMatches = await this.batchAnalyzeJobs(resume, jobs);
    return allMatches.slice(0, topN);
  }

  async generateCareerAdvice(resume: ResumeData, targetJobs: JobDescriptionData[]): Promise<{
    skillsToImprove: string[];
    careerPath: string[];
    nextSteps: string[];
  }> {
    const matches = await this.batchAnalyzeJobs(resume, targetJobs);
    
    // Aggregate missing skills across all jobs
    const allMissingSkills = matches.flatMap(match => match.missingSkills);
    const skillFrequency = allMissingSkills.reduce((acc, skill) => {
      acc[skill] = (acc[skill] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const skillsToImprove = Object.entries(skillFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([skill]) => skill);
    
    // Generate career path suggestions
    const careerPath = this.generateCareerPath(resume, matches);
    const nextSteps = this.generateNextSteps(resume, skillsToImprove, matches);
    
    return {
      skillsToImprove,
      careerPath,
      nextSteps
    };
  }

  private generateCareerPath(resume: ResumeData, matches: ResumeJobMatch[]): string[] {
    const currentLevel = this.estimateCurrentLevel(resume);
    const path: string[] = [];
    
    if (currentLevel === 'entry') {
      path.push('Focus on junior/entry-level positions to gain experience');
      path.push('Build a portfolio of projects demonstrating key skills');
      path.push('Consider internships or contract work to build experience');
    } else if (currentLevel === 'mid') {
      path.push('Target mid-level positions that match your skill set');
      path.push('Develop leadership and mentoring skills');
      path.push('Specialize in high-demand technical areas');
    } else {
      path.push('Consider senior or lead positions');
      path.push('Focus on strategic and architectural responsibilities');
      path.push('Develop team leadership and project management skills');
    }
    
    return path;
  }

  private generateNextSteps(resume: ResumeData, skillsToImprove: string[], matches: ResumeJobMatch[]): string[] {
    const steps: string[] = [];
    
    if (skillsToImprove.length > 0) {
      steps.push(`Learn ${skillsToImprove.slice(0, 2).join(' and ')} to improve job match scores`);
    }
    
    if (resume.projects.length < 3) {
      steps.push('Build more projects to demonstrate your skills');
    }
    
    if (!resume.summary) {
      steps.push('Add a professional summary highlighting your key strengths');
    }
    
    const avgMatch = matches.reduce((sum, match) => sum + match.matchScore, 0) / matches.length;
    if (avgMatch < 0.5) {
      steps.push('Consider targeting roles that better match your current skill set');
    }
    
    return steps;
  }

  private estimateCurrentLevel(resume: ResumeData): 'entry' | 'mid' | 'senior' {
    const totalYears = resume.workExperience.reduce((total, exp) => {
      const years = exp.duration ? this.extractYearsFromDuration(exp.duration) : 0;
      return total + years;
    }, 0);
    
    if (totalYears < 2) return 'entry';
    if (totalYears < 5) return 'mid';
    return 'senior';
  }
}