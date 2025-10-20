import { 
  Question, 
  QuestionType, 
  QuestionCategory 
} from '../types';

export class QuestionModel implements Question {
  id: string;
  type: QuestionType;
  category: QuestionCategory;
  text: string;
  expectedElements: string[];
  difficulty: number;
  timeLimit?: number;
  followUpTriggers: string[];
  industry?: string;
  roleLevel?: 'entry' | 'mid' | 'senior' | 'executive';

  constructor(data: Partial<Question> & { text: string; type: QuestionType; category: QuestionCategory }) {
    this.id = data.id || this.generateId();
    this.type = data.type;
    this.category = data.category;
    this.text = data.text;
    this.expectedElements = data.expectedElements || [];
    this.difficulty = data.difficulty || 5;
    this.timeLimit = data.timeLimit;
    this.followUpTriggers = data.followUpTriggers || [];
    this.industry = data.industry;
    this.roleLevel = data.roleLevel;

    this.validate();
  }

  private generateId(): string {
    return `question_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  validate(): void {
    const errors: string[] = [];

    // Validate required fields
    if (!this.id || this.id.trim() === '') {
      errors.push('Question ID is required');
    }

    if (!this.text || this.text.trim() === '') {
      errors.push('Question text is required');
    } else if (this.text.length > 1000) {
      errors.push('Question text cannot exceed 1000 characters');
    }

    // Type validation
    const validTypes: QuestionType[] = [
      'behavioral', 'technical', 'situational', 'system-design', 'case-study', 'role-specific'
    ];
    if (!validTypes.includes(this.type)) {
      errors.push(`Invalid question type: ${this.type}`);
    }

    // Category validation
    const validCategories: QuestionCategory[] = [
      'leadership', 'problem-solving', 'communication', 'teamwork',
      'technical-skills', 'domain-knowledge', 'culture-fit', 'career-goals'
    ];
    if (!validCategories.includes(this.category)) {
      errors.push(`Invalid question category: ${this.category}`);
    }

    // Difficulty validation
    if (this.difficulty < 1 || this.difficulty > 10) {
      errors.push('Question difficulty must be between 1 and 10');
    }

    // Time limit validation
    if (this.timeLimit !== undefined) {
      if (this.timeLimit < 30 || this.timeLimit > 1800) {
        errors.push('Time limit must be between 30 seconds and 30 minutes');
      }
    }

    // Expected elements validation
    if (this.expectedElements.length > 20) {
      errors.push('Cannot have more than 20 expected elements');
    }

    this.expectedElements.forEach((element, index) => {
      if (!element || element.trim() === '') {
        errors.push(`Expected element at index ${index} cannot be empty`);
      }
      if (element.length > 200) {
        errors.push(`Expected element at index ${index} cannot exceed 200 characters`);
      }
    });

    // Follow-up triggers validation
    if (this.followUpTriggers.length > 10) {
      errors.push('Cannot have more than 10 follow-up triggers');
    }

    this.followUpTriggers.forEach((trigger, index) => {
      if (!trigger || trigger.trim() === '') {
        errors.push(`Follow-up trigger at index ${index} cannot be empty`);
      }
      if (trigger.length > 100) {
        errors.push(`Follow-up trigger at index ${index} cannot exceed 100 characters`);
      }
    });

    // Industry validation
    if (this.industry && this.industry.length > 50) {
      errors.push('Industry cannot exceed 50 characters');
    }

    // Role level validation
    if (this.roleLevel) {
      const validRoleLevels = ['entry', 'mid', 'senior', 'executive'];
      if (!validRoleLevels.includes(this.roleLevel)) {
        errors.push(`Invalid role level: ${this.roleLevel}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Question validation failed: ${errors.join(', ')}`);
    }
  }

  // Update methods
  updateText(text: string): void {
    this.text = text;
    this.validate();
  }

  updateDifficulty(difficulty: number): void {
    this.difficulty = difficulty;
    this.validate();
  }

  updateTimeLimit(timeLimit?: number): void {
    this.timeLimit = timeLimit;
    this.validate();
  }

  addExpectedElement(element: string): void {
    if (!this.expectedElements.includes(element)) {
      this.expectedElements.push(element);
      this.validate();
    }
  }

  removeExpectedElement(element: string): void {
    this.expectedElements = this.expectedElements.filter(e => e !== element);
  }

  addFollowUpTrigger(trigger: string): void {
    if (!this.followUpTriggers.includes(trigger)) {
      this.followUpTriggers.push(trigger);
      this.validate();
    }
  }

  removeFollowUpTrigger(trigger: string): void {
    this.followUpTriggers = this.followUpTriggers.filter(t => t !== trigger);
  }

  updateIndustry(industry?: string): void {
    this.industry = industry;
    this.validate();
  }

  updateRoleLevel(roleLevel?: 'entry' | 'mid' | 'senior' | 'executive'): void {
    this.roleLevel = roleLevel;
    this.validate();
  }

  // Utility methods
  getDifficultyLabel(): string {
    if (this.difficulty <= 3) return 'Easy';
    if (this.difficulty <= 6) return 'Medium';
    if (this.difficulty <= 8) return 'Hard';
    return 'Expert';
  }

  getEstimatedTime(): number {
    // Base time estimation based on question type and difficulty
    let baseTime = 120; // 2 minutes default

    switch (this.type) {
      case 'behavioral':
        baseTime = 180; // 3 minutes
        break;
      case 'technical':
        baseTime = 300; // 5 minutes
        break;
      case 'system-design':
        baseTime = 600; // 10 minutes
        break;
      case 'case-study':
        baseTime = 480; // 8 minutes
        break;
      case 'situational':
        baseTime = 240; // 4 minutes
        break;
      case 'role-specific':
        baseTime = 180; // 3 minutes
        break;
    }

    // Adjust for difficulty
    const difficultyMultiplier = 0.7 + (this.difficulty / 10) * 0.6; // 0.7 to 1.3
    baseTime = Math.round(baseTime * difficultyMultiplier);

    return this.timeLimit || baseTime;
  }

  isApplicableForRole(targetRole: string): boolean {
    if (!this.roleLevel) return true; // Generic question

    const roleLower = targetRole.toLowerCase();
    
    // Simple role level detection
    if (this.roleLevel === 'entry' && (roleLower.includes('junior') || roleLower.includes('entry') || roleLower.includes('intern'))) {
      return true;
    }
    
    if (this.roleLevel === 'mid' && (roleLower.includes('mid') || roleLower.includes('intermediate') || (!roleLower.includes('senior') && !roleLower.includes('lead')))) {
      return true;
    }
    
    if (this.roleLevel === 'senior' && (roleLower.includes('senior') || roleLower.includes('lead') || roleLower.includes('principal'))) {
      return true;
    }
    
    if (this.roleLevel === 'executive' && (roleLower.includes('director') || roleLower.includes('vp') || roleLower.includes('cto') || roleLower.includes('ceo'))) {
      return true;
    }

    return false;
  }

  isApplicableForIndustry(targetIndustry: string): boolean {
    if (!this.industry) return true; // Generic question

    const industryLower = this.industry.toLowerCase();
    const targetLower = targetIndustry.toLowerCase();

    return industryLower.includes(targetLower) || targetLower.includes(industryLower);
  }

  matchesSkills(skills: string[]): boolean {
    if (this.expectedElements.length === 0) return true;

    const skillsLower = skills.map(s => s.toLowerCase());
    
    return this.expectedElements.some(element => {
      const elementLower = element.toLowerCase();
      return skillsLower.some(skill => 
        skill.includes(elementLower) || elementLower.includes(skill)
      );
    });
  }

  getRelevanceScore(context: {
    targetRole?: string;
    industry?: string;
    skills?: string[];
    experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  }): number {
    let score = 0.5; // Base relevance

    // Role relevance
    if (context.targetRole && this.isApplicableForRole(context.targetRole)) {
      score += 0.2;
    }

    // Industry relevance
    if (context.industry && this.isApplicableForIndustry(context.industry)) {
      score += 0.1;
    }

    // Skills relevance
    if (context.skills && this.matchesSkills(context.skills)) {
      score += 0.15;
    }

    // Experience level match
    if (context.experienceLevel && this.roleLevel === context.experienceLevel) {
      score += 0.15;
    }

    return Math.min(1.0, score);
  }

  shouldTriggerFollowUp(response: string): string[] {
    const responseLower = response.toLowerCase();
    const triggeredFollowUps: string[] = [];

    this.followUpTriggers.forEach(trigger => {
      const triggerLower = trigger.toLowerCase();
      
      // Check if the trigger phrase appears in the response
      if (responseLower.includes(triggerLower)) {
        triggeredFollowUps.push(trigger);
      }
    });

    return triggeredFollowUps;
  }

  generateFollowUpQuestions(response: string): string[] {
    const triggers = this.shouldTriggerFollowUp(response);
    const followUps: string[] = [];

    triggers.forEach(trigger => {
      switch (trigger.toLowerCase()) {
        case 'example':
        case 'specific example':
          followUps.push('Can you provide a specific example of when you did this?');
          break;
        case 'challenge':
        case 'difficult':
          followUps.push('What was the most challenging part of this situation?');
          break;
        case 'team':
        case 'teamwork':
          followUps.push('How did you work with your team to achieve this?');
          break;
        case 'result':
        case 'outcome':
          followUps.push('What was the final outcome or result?');
          break;
        case 'learn':
        case 'learning':
          followUps.push('What did you learn from this experience?');
          break;
        case 'improve':
        case 'improvement':
          followUps.push('How would you improve your approach if you faced this situation again?');
          break;
        default:
          followUps.push(`Can you elaborate more on ${trigger}?`);
      }
    });

    // Generic follow-ups based on response length and content
    if (response.length < 100) {
      followUps.push('Could you provide more detail in your answer?');
    }

    if (!response.includes('because') && !response.includes('since') && !response.includes('due to')) {
      followUps.push('What was your reasoning behind this decision?');
    }

    return followUps.slice(0, 3); // Limit to 3 follow-ups
  }

  // Question templates and generation helpers
  static createBehavioralQuestion(data: {
    situation: string;
    category: QuestionCategory;
    difficulty?: number;
    industry?: string;
    roleLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  }): QuestionModel {
    const templates = [
      `Tell me about a time when you ${data.situation}.`,
      `Describe a situation where you had to ${data.situation}.`,
      `Can you give me an example of when you ${data.situation}?`,
      `Walk me through a time when you ${data.situation}.`
    ];

    const text = templates[Math.floor(Math.random() * templates.length)];

    return new QuestionModel({
      type: 'behavioral',
      category: data.category,
      text,
      difficulty: data.difficulty || 5,
      expectedElements: ['Situation', 'Task', 'Action', 'Result'],
      followUpTriggers: ['example', 'challenge', 'team', 'result', 'learn'],
      industry: data.industry,
      roleLevel: data.roleLevel
    });
  }

  static createTechnicalQuestion(data: {
    topic: string;
    category: QuestionCategory;
    difficulty?: number;
    industry?: string;
    roleLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  }): QuestionModel {
    const templates = [
      `Explain how ${data.topic} works.`,
      `What are the key concepts behind ${data.topic}?`,
      `How would you implement ${data.topic}?`,
      `What are the advantages and disadvantages of ${data.topic}?`
    ];

    const text = templates[Math.floor(Math.random() * templates.length)];

    return new QuestionModel({
      type: 'technical',
      category: data.category,
      text,
      difficulty: data.difficulty || 6,
      expectedElements: ['Technical accuracy', 'Clear explanation', 'Examples', 'Best practices'],
      followUpTriggers: ['example', 'implementation', 'performance', 'alternative'],
      industry: data.industry,
      roleLevel: data.roleLevel,
      timeLimit: 300 // 5 minutes for technical questions
    });
  }

  // Serialization methods
  toJSON(): Question {
    return {
      id: this.id,
      type: this.type,
      category: this.category,
      text: this.text,
      expectedElements: this.expectedElements,
      difficulty: this.difficulty,
      timeLimit: this.timeLimit,
      followUpTriggers: this.followUpTriggers,
      industry: this.industry,
      roleLevel: this.roleLevel
    };
  }

  static fromJSON(data: any): QuestionModel {
    return new QuestionModel(data);
  }
}