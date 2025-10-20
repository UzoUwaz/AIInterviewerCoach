import { 
  JobApplication, 
  ApplicationStatus, 
  InterviewStage, 
  SalaryRange
} from '../types';

export class JobApplicationModel implements JobApplication {
  id: string;
  userId: string;
  company: string;
  position: string;
  jobDescription: string;
  salaryRange?: SalaryRange;
  applicationDate: Date;
  status: ApplicationStatus;
  interviewStages: InterviewStage[];
  notes?: string;
  source: string;

  constructor(data: Partial<JobApplication> & { 
    userId: string; 
    company: string; 
    position: string; 
    jobDescription: string;
    source: string;
  }) {
    this.id = data.id || this.generateId();
    this.userId = data.userId;
    this.company = data.company;
    this.position = data.position;
    this.jobDescription = data.jobDescription;
    this.salaryRange = data.salaryRange;
    this.applicationDate = data.applicationDate || new Date();
    this.status = data.status || 'applied';
    this.interviewStages = data.interviewStages || [];
    this.notes = data.notes;
    this.source = data.source;

    this.validate();
  }

  private generateId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  validate(): void {
    const errors: string[] = [];

    // Validate required fields
    if (!this.id || this.id.trim() === '') {
      errors.push('Job application ID is required');
    }

    if (!this.userId || this.userId.trim() === '') {
      errors.push('User ID is required');
    }

    if (!this.company || this.company.trim() === '') {
      errors.push('Company name is required');
    } else if (this.company.length > 100) {
      errors.push('Company name cannot exceed 100 characters');
    }

    if (!this.position || this.position.trim() === '') {
      errors.push('Position is required');
    } else if (this.position.length > 100) {
      errors.push('Position cannot exceed 100 characters');
    }

    if (!this.jobDescription || this.jobDescription.trim() === '') {
      errors.push('Job description is required');
    } else if (this.jobDescription.length > 10000) {
      errors.push('Job description cannot exceed 10000 characters');
    }

    if (!this.source || this.source.trim() === '') {
      errors.push('Application source is required');
    } else if (this.source.length > 100) {
      errors.push('Application source cannot exceed 100 characters');
    }

    // Validate status
    const validStatuses: ApplicationStatus[] = [
      'applied', 'screening', 'interviewing', 'offer', 'rejected', 'withdrawn'
    ];
    if (!validStatuses.includes(this.status)) {
      errors.push(`Invalid application status: ${this.status}`);
    }

    // Validate application date
    if (!(this.applicationDate instanceof Date) || isNaN(this.applicationDate.getTime())) {
      errors.push('Invalid application date');
    }

    // Validate salary range
    if (this.salaryRange) {
      this.validateSalaryRange(this.salaryRange);
    }

    // Validate interview stages
    this.interviewStages.forEach((stage, index) => {
      try {
        this.validateInterviewStage(stage);
      } catch (error) {
        if (error instanceof Error) {
          errors.push(`Interview stage ${index + 1}: ${error.message}`);
        }
      }
    });

    // Validate notes
    if (this.notes && this.notes.length > 2000) {
      errors.push('Notes cannot exceed 2000 characters');
    }

    if (errors.length > 0) {
      throw new Error(`JobApplication validation failed: ${errors.join(', ')}`);
    }
  }

  private validateSalaryRange(salaryRange: SalaryRange): void {
    const errors: string[] = [];

    if (salaryRange.min < 0) {
      errors.push('Minimum salary cannot be negative');
    }

    if (salaryRange.max < 0) {
      errors.push('Maximum salary cannot be negative');
    }

    if (salaryRange.min > salaryRange.max) {
      errors.push('Minimum salary cannot be greater than maximum salary');
    }

    if (!salaryRange.currency || salaryRange.currency.trim() === '') {
      errors.push('Currency is required');
    } else if (salaryRange.currency.length > 10) {
      errors.push('Currency cannot exceed 10 characters');
    }

    const validPeriods = ['hourly', 'monthly', 'yearly'];
    if (!validPeriods.includes(salaryRange.period)) {
      errors.push(`Invalid salary period: ${salaryRange.period}`);
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
  }

  private validateInterviewStage(stage: InterviewStage): void {
    const errors: string[] = [];

    if (!stage.id || stage.id.trim() === '') {
      errors.push('Interview stage ID is required');
    }

    const validTypes = ['phone', 'video', 'onsite', 'technical', 'final'];
    if (!validTypes.includes(stage.type)) {
      errors.push(`Invalid interview stage type: ${stage.type}`);
    }

    if (stage.scheduledDate && (!(stage.scheduledDate instanceof Date) || isNaN(stage.scheduledDate.getTime()))) {
      errors.push('Invalid scheduled date');
    }

    if (stage.completedDate && (!(stage.completedDate instanceof Date) || isNaN(stage.completedDate.getTime()))) {
      errors.push('Invalid completed date');
    }

    if (stage.scheduledDate && stage.completedDate && stage.completedDate < stage.scheduledDate) {
      errors.push('Completed date cannot be before scheduled date');
    }

    if (stage.outcome) {
      const validOutcomes = ['passed', 'failed', 'pending'];
      if (!validOutcomes.includes(stage.outcome)) {
        errors.push(`Invalid interview outcome: ${stage.outcome}`);
      }
    }

    if (stage.feedback && stage.feedback.length > 1000) {
      errors.push('Interview feedback cannot exceed 1000 characters');
    }

    if (stage.interviewers && stage.interviewers.length > 10) {
      errors.push('Cannot have more than 10 interviewers');
    }

    if (stage.interviewers) {
      stage.interviewers.forEach((interviewer, index) => {
        if (!interviewer || interviewer.trim() === '') {
          errors.push(`Interviewer at index ${index} cannot be empty`);
        }
        if (interviewer.length > 100) {
          errors.push(`Interviewer name at index ${index} cannot exceed 100 characters`);
        }
      });
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
  }

  // Status management methods
  updateStatus(status: ApplicationStatus): void {
    this.status = status;
    this.validate();
  }

  moveToScreening(): void {
    if (this.status === 'applied') {
      this.status = 'screening';
    }
  }

  moveToInterviewing(): void {
    if (this.status === 'applied' || this.status === 'screening') {
      this.status = 'interviewing';
    }
  }

  receiveOffer(): void {
    if (this.status === 'interviewing') {
      this.status = 'offer';
    }
  }

  reject(): void {
    this.status = 'rejected';
  }

  withdraw(): void {
    this.status = 'withdrawn';
  }

  // Interview stage management
  addInterviewStage(stage: Omit<InterviewStage, 'id'>): InterviewStage {
    const newStage: InterviewStage = {
      ...stage,
      id: this.generateStageId()
    };

    this.validateInterviewStage(newStage);
    this.interviewStages.push(newStage);
    
    // Auto-update status if needed
    if (this.status === 'applied' || this.status === 'screening') {
      this.status = 'interviewing';
    }

    return newStage;
  }

  updateInterviewStage(stageId: string, updates: Partial<InterviewStage>): void {
    const stageIndex = this.interviewStages.findIndex(s => s.id === stageId);
    if (stageIndex === -1) {
      throw new Error(`Interview stage not found: ${stageId}`);
    }

    this.interviewStages[stageIndex] = { ...this.interviewStages[stageIndex], ...updates };
    this.validateInterviewStage(this.interviewStages[stageIndex]);
  }

  completeInterviewStage(stageId: string, outcome: 'passed' | 'failed', feedback?: string): void {
    this.updateInterviewStage(stageId, {
      completedDate: new Date(),
      outcome,
      feedback
    });

    // Check if all stages are completed
    const allCompleted = this.interviewStages.every(s => s.completedDate);
    const allPassed = this.interviewStages.every(s => s.outcome === 'passed');

    if (allCompleted) {
      if (allPassed) {
        // All stages passed, likely to receive offer
        this.status = 'offer';
      } else if (this.interviewStages.some(s => s.outcome === 'failed')) {
        // At least one stage failed
        this.status = 'rejected';
      }
    }
  }

  private generateStageId(): string {
    return `stage_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  // Utility methods
  getDaysInProcess(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.applicationDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getNextInterviewStage(): InterviewStage | null {
    return this.interviewStages.find(s => !s.completedDate) || null;
  }

  getCompletedStages(): InterviewStage[] {
    return this.interviewStages.filter(s => s.completedDate);
  }

  getPendingStages(): InterviewStage[] {
    return this.interviewStages.filter(s => !s.completedDate);
  }

  getInterviewProgress(): { completed: number; total: number; percentage: number } {
    const completed = this.getCompletedStages().length;
    const total = this.interviewStages.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
  }

  isActive(): boolean {
    return ['applied', 'screening', 'interviewing'].includes(this.status);
  }

  isCompleted(): boolean {
    return ['offer', 'rejected', 'withdrawn'].includes(this.status);
  }

  wasSuccessful(): boolean {
    return this.status === 'offer';
  }

  getStatusColor(): string {
    switch (this.status) {
      case 'applied': return '#3B82F6'; // blue
      case 'screening': return '#F59E0B'; // amber
      case 'interviewing': return '#8B5CF6'; // purple
      case 'offer': return '#10B981'; // green
      case 'rejected': return '#EF4444'; // red
      case 'withdrawn': return '#6B7280'; // gray
      default: return '#6B7280';
    }
  }

  // Analysis methods
  extractKeywords(): string[] {
    const text = `${this.position} ${this.jobDescription}`.toLowerCase();
    const commonWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an']);
    
    const words = text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.has(word));

    // Count word frequency
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });

    // Return top keywords
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }

  getRequiredSkills(): string[] {
    const keywords = this.extractKeywords();
    const skillKeywords = [
      'javascript', 'python', 'java', 'react', 'angular', 'vue', 'node',
      'sql', 'mongodb', 'postgresql', 'aws', 'azure', 'docker', 'kubernetes',
      'git', 'agile', 'scrum', 'leadership', 'management', 'communication'
    ];

    return keywords.filter(keyword => 
      skillKeywords.some(skill => keyword.includes(skill) || skill.includes(keyword))
    );
  }

  getIndustry(): string {
    const description = this.jobDescription.toLowerCase();
    const industries = [
      { name: 'Technology', keywords: ['software', 'tech', 'development', 'programming', 'engineering'] },
      { name: 'Finance', keywords: ['finance', 'banking', 'investment', 'trading', 'fintech'] },
      { name: 'Healthcare', keywords: ['healthcare', 'medical', 'hospital', 'pharmaceutical', 'biotech'] },
      { name: 'E-commerce', keywords: ['ecommerce', 'retail', 'marketplace', 'shopping', 'commerce'] },
      { name: 'Education', keywords: ['education', 'learning', 'teaching', 'university', 'school'] },
      { name: 'Marketing', keywords: ['marketing', 'advertising', 'digital marketing', 'seo', 'social media'] }
    ];

    for (const industry of industries) {
      if (industry.keywords.some(keyword => description.includes(keyword))) {
        return industry.name;
      }
    }

    return 'Other';
  }

  getExperienceLevel(): 'entry' | 'mid' | 'senior' | 'executive' {
    const position = this.position.toLowerCase();
    const description = this.jobDescription.toLowerCase();

    if (position.includes('senior') || position.includes('lead') || position.includes('principal') || 
        description.includes('5+ years') || description.includes('senior level')) {
      return 'senior';
    }

    if (position.includes('director') || position.includes('vp') || position.includes('head of') ||
        position.includes('chief') || description.includes('executive')) {
      return 'executive';
    }

    if (position.includes('junior') || position.includes('entry') || position.includes('intern') ||
        description.includes('entry level') || description.includes('0-2 years')) {
      return 'entry';
    }

    return 'mid';
  }

  getSalaryEstimate(): SalaryRange | null {
    if (this.salaryRange) return this.salaryRange;

    // Simple salary estimation based on role and experience level
    const experienceLevel = this.getExperienceLevel();
    const industry = this.getIndustry();

    let baseMin = 50000;
    let baseMax = 70000;

    // Adjust for experience level
    switch (experienceLevel) {
      case 'entry':
        baseMin = 45000;
        baseMax = 65000;
        break;
      case 'mid':
        baseMin = 65000;
        baseMax = 95000;
        break;
      case 'senior':
        baseMin = 95000;
        baseMax = 140000;
        break;
      case 'executive':
        baseMin = 140000;
        baseMax = 250000;
        break;
    }

    // Adjust for industry
    if (industry === 'Technology') {
      baseMin *= 1.2;
      baseMax *= 1.3;
    } else if (industry === 'Finance') {
      baseMin *= 1.1;
      baseMax *= 1.2;
    }

    return {
      min: Math.round(baseMin),
      max: Math.round(baseMax),
      currency: 'USD',
      period: 'yearly'
    };
  }

  // Notes management
  addNote(note: string): void {
    const timestamp = new Date().toISOString().split('T')[0];
    const newNote = `[${timestamp}] ${note}`;
    
    if (this.notes) {
      this.notes += '\n\n' + newNote;
    } else {
      this.notes = newNote;
    }

    this.validate();
  }

  updateNotes(notes: string): void {
    this.notes = notes;
    this.validate();
  }

  // Serialization methods
  toJSON(): JobApplication {
    return {
      id: this.id,
      userId: this.userId,
      company: this.company,
      position: this.position,
      jobDescription: this.jobDescription,
      salaryRange: this.salaryRange,
      applicationDate: this.applicationDate,
      status: this.status,
      interviewStages: this.interviewStages,
      notes: this.notes,
      source: this.source
    };
  }

  static fromJSON(data: any): JobApplicationModel {
    // Convert date strings back to Date objects
    const applicationData = {
      ...data,
      applicationDate: new Date(data.applicationDate)
    };

    // Convert interview stage dates
    if (applicationData.interviewStages) {
      applicationData.interviewStages = applicationData.interviewStages.map((stage: any) => ({
        ...stage,
        scheduledDate: stage.scheduledDate ? new Date(stage.scheduledDate) : undefined,
        completedDate: stage.completedDate ? new Date(stage.completedDate) : undefined
      }));
    }

    return new JobApplicationModel(applicationData);
  }
}