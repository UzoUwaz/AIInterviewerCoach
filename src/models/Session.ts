import { 
  Session, 
  SessionConfig, 
  Question, 
  UserResponse, 
  SessionAnalysis,
  QuestionCategory,
  QuestionType
} from '../types';

export class SessionModel implements Session {
  id: string;
  userId: string;
  jobDescriptionId?: string;
  config: SessionConfig;
  questions: Question[];
  responses: UserResponse[];
  analysis: SessionAnalysis;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'paused';

  constructor(data: Partial<Session> & { userId: string }) {
    this.id = data.id || this.generateId();
    this.userId = data.userId;
    this.jobDescriptionId = data.jobDescriptionId;
    this.config = data.config || this.createDefaultConfig();
    this.questions = data.questions || [];
    this.responses = data.responses || [];
    this.analysis = data.analysis || this.createDefaultAnalysis();
    this.startTime = data.startTime || new Date();
    this.endTime = data.endTime;
    this.status = data.status || 'active';

    this.validate();
  }

  private generateId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createDefaultConfig(): SessionConfig {
    return {
      questionCategories: ['technical-skills', 'problem-solving', 'communication'],
      difficulty: 'adaptive',
      duration: 30,
      focusAreas: [],
      voiceEnabled: true,
      feedbackStyle: 'gentle'
    };
  }

  private createDefaultAnalysis(): SessionAnalysis {
    return {
      overallScore: 0,
      dimensionScores: [],
      improvement: 0,
      timeSpent: 0,
      questionsAnswered: 0,
      strengths: [],
      improvementAreas: [],
      recommendations: []
    };
  }

  validate(): void {
    const errors: string[] = [];

    // Validate required fields
    if (!this.id || this.id.trim() === '') {
      errors.push('Session ID is required');
    }

    if (!this.userId || this.userId.trim() === '') {
      errors.push('User ID is required');
    }

    // Validate status
    const validStatuses = ['active', 'completed', 'paused'];
    if (!validStatuses.includes(this.status)) {
      errors.push(`Invalid status: ${this.status}`);
    }

    // Validate dates
    if (!(this.startTime instanceof Date) || isNaN(this.startTime.getTime())) {
      errors.push('Invalid start time');
    }

    if (this.endTime) {
      if (!(this.endTime instanceof Date) || isNaN(this.endTime.getTime())) {
        errors.push('Invalid end time');
      } else if (this.endTime < this.startTime) {
        errors.push('End time cannot be before start time');
      }
    }

    // Validate config
    try {
      this.validateConfig(this.config);
    } catch (error) {
      if (error instanceof Error) {
        errors.push(`Config validation failed: ${error.message}`);
      }
    }

    // Validate questions
    this.questions.forEach((question, index) => {
      try {
        this.validateQuestion(question);
      } catch (error) {
        if (error instanceof Error) {
          errors.push(`Question ${index + 1}: ${error.message}`);
        }
      }
    });

    // Validate responses
    this.responses.forEach((response, index) => {
      try {
        this.validateResponse(response);
      } catch (error) {
        if (error instanceof Error) {
          errors.push(`Response ${index + 1}: ${error.message}`);
        }
      }
    });

    // Validate analysis
    try {
      this.validateAnalysis(this.analysis);
    } catch (error) {
      if (error instanceof Error) {
        errors.push(`Analysis validation failed: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Session validation failed: ${errors.join(', ')}`);
    }
  }

  private validateConfig(config: SessionConfig): void {
    const errors: string[] = [];

    // Question categories validation
    const validCategories: QuestionCategory[] = [
      'leadership', 'problem-solving', 'communication', 'teamwork',
      'technical-skills', 'domain-knowledge', 'culture-fit', 'career-goals'
    ];

    if (config.questionCategories.length === 0) {
      errors.push('At least one question category must be selected');
    }

    config.questionCategories.forEach(category => {
      if (!validCategories.includes(category)) {
        errors.push(`Invalid question category: ${category}`);
      }
    });

    // Difficulty validation
    const validDifficulties = ['easy', 'medium', 'hard', 'adaptive'];
    if (!validDifficulties.includes(config.difficulty)) {
      errors.push(`Invalid difficulty: ${config.difficulty}`);
    }

    // Duration validation
    if (config.duration < 5 || config.duration > 120) {
      errors.push('Duration must be between 5 and 120 minutes');
    }

    // Focus areas validation
    if (config.focusAreas.length > 10) {
      errors.push('Cannot have more than 10 focus areas');
    }

    config.focusAreas.forEach((area, index) => {
      if (!area || area.trim() === '') {
        errors.push(`Focus area at index ${index} cannot be empty`);
      }
      if (area.length > 100) {
        errors.push(`Focus area at index ${index} cannot exceed 100 characters`);
      }
    });

    // Feedback style validation
    const validFeedbackStyles = ['gentle', 'direct', 'technical-focused', 'behavioral-focused'];
    if (!validFeedbackStyles.includes(config.feedbackStyle)) {
      errors.push(`Invalid feedback style: ${config.feedbackStyle}`);
    }

    // Voice enabled validation
    if (typeof config.voiceEnabled !== 'boolean') {
      errors.push('voiceEnabled must be a boolean value');
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
  }

  private validateQuestion(question: Question): void {
    const errors: string[] = [];

    if (!question.id || question.id.trim() === '') {
      errors.push('Question ID is required');
    }

    if (!question.text || question.text.trim() === '') {
      errors.push('Question text is required');
    } else if (question.text.length > 1000) {
      errors.push('Question text cannot exceed 1000 characters');
    }

    // Type validation
    const validTypes: QuestionType[] = [
      'behavioral', 'technical', 'situational', 'system-design', 'case-study', 'role-specific'
    ];
    if (!validTypes.includes(question.type)) {
      errors.push(`Invalid question type: ${question.type}`);
    }

    // Category validation
    const validCategories: QuestionCategory[] = [
      'leadership', 'problem-solving', 'communication', 'teamwork',
      'technical-skills', 'domain-knowledge', 'culture-fit', 'career-goals'
    ];
    if (!validCategories.includes(question.category)) {
      errors.push(`Invalid question category: ${question.category}`);
    }

    // Difficulty validation
    if (question.difficulty < 1 || question.difficulty > 10) {
      errors.push('Question difficulty must be between 1 and 10');
    }

    // Time limit validation
    if (question.timeLimit !== undefined) {
      if (question.timeLimit < 30 || question.timeLimit > 1800) {
        errors.push('Time limit must be between 30 seconds and 30 minutes');
      }
    }

    // Expected elements validation
    if (question.expectedElements.length > 20) {
      errors.push('Cannot have more than 20 expected elements');
    }

    question.expectedElements.forEach((element, index) => {
      if (!element || element.trim() === '') {
        errors.push(`Expected element at index ${index} cannot be empty`);
      }
      if (element.length > 200) {
        errors.push(`Expected element at index ${index} cannot exceed 200 characters`);
      }
    });

    // Follow-up triggers validation
    if (question.followUpTriggers.length > 10) {
      errors.push('Cannot have more than 10 follow-up triggers');
    }

    question.followUpTriggers.forEach((trigger, index) => {
      if (!trigger || trigger.trim() === '') {
        errors.push(`Follow-up trigger at index ${index} cannot be empty`);
      }
      if (trigger.length > 100) {
        errors.push(`Follow-up trigger at index ${index} cannot exceed 100 characters`);
      }
    });

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
  }

  private validateResponse(response: UserResponse): void {
    const errors: string[] = [];

    if (!response.id || response.id.trim() === '') {
      errors.push('Response ID is required');
    }

    if (!response.questionId || response.questionId.trim() === '') {
      errors.push('Question ID is required');
    }

    if (!response.sessionId || response.sessionId.trim() === '') {
      errors.push('Session ID is required');
    }

    if (response.sessionId !== this.id) {
      errors.push('Response session ID must match current session ID');
    }

    if (!response.textContent || response.textContent.trim() === '') {
      errors.push('Response text content is required');
    } else if (response.textContent.length > 5000) {
      errors.push('Response text content cannot exceed 5000 characters');
    }

    if (!(response.timestamp instanceof Date) || isNaN(response.timestamp.getTime())) {
      errors.push('Invalid response timestamp');
    }

    if (response.responseTime < 0 || response.responseTime > 3600) {
      errors.push('Response time must be between 0 and 3600 seconds');
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
  }

  private validateAnalysis(analysis: SessionAnalysis): void {
    const errors: string[] = [];

    if (analysis.overallScore < 0 || analysis.overallScore > 100) {
      errors.push('Overall score must be between 0 and 100');
    }

    if (analysis.timeSpent < 0) {
      errors.push('Time spent cannot be negative');
    }

    if (analysis.questionsAnswered < 0) {
      errors.push('Questions answered cannot be negative');
    }

    if (analysis.questionsAnswered > this.questions.length) {
      errors.push('Questions answered cannot exceed total questions');
    }

    // Validate dimension scores
    analysis.dimensionScores.forEach((score, index) => {
      if (!score.dimension || score.dimension.trim() === '') {
        errors.push(`Dimension name at index ${index} cannot be empty`);
      }
      if (score.score < 0 || score.score > 100) {
        errors.push(`Dimension score at index ${index} must be between 0 and 100`);
      }
      const validTrends = ['improving', 'declining', 'stable'];
      if (!validTrends.includes(score.trend)) {
        errors.push(`Invalid trend at index ${index}: ${score.trend}`);
      }
    });

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
  }

  // Session management methods
  start(): void {
    if (this.status !== 'active') {
      this.status = 'active';
      this.startTime = new Date();
    }
  }

  pause(): void {
    if (this.status === 'active') {
      this.status = 'paused';
    }
  }

  resume(): void {
    if (this.status === 'paused') {
      this.status = 'active';
    }
  }

  complete(): void {
    this.status = 'completed';
    this.endTime = new Date();
    this.updateAnalysis();
  }

  addQuestion(question: Question): void {
    this.validateQuestion(question);
    this.questions.push(question);
  }

  addResponse(response: UserResponse): void {
    // Ensure response belongs to this session
    response.sessionId = this.id;
    this.validateResponse(response);
    this.responses.push(response);
    this.updateAnalysis();
  }

  getCurrentQuestion(): Question | null {
    if (this.responses.length >= this.questions.length) {
      return null; // All questions answered
    }
    return this.questions[this.responses.length];
  }

  getNextQuestion(): Question | null {
    const currentIndex = this.responses.length;
    if (currentIndex + 1 >= this.questions.length) {
      return null;
    }
    return this.questions[currentIndex + 1];
  }

  getProgress(): { completed: number; total: number; percentage: number } {
    const completed = this.responses.length;
    const total = this.questions.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
  }

  getDuration(): number {
    if (!this.endTime) {
      return Math.floor((new Date().getTime() - this.startTime.getTime()) / 1000 / 60);
    }
    return Math.floor((this.endTime.getTime() - this.startTime.getTime()) / 1000 / 60);
  }

  private updateAnalysis(): void {
    const timeSpent = this.getDuration();
    const questionsAnswered = this.responses.length;
    
    // Calculate basic metrics
    let totalScore = 0;
    let scoredResponses = 0;

    this.responses.forEach(response => {
      if (response.analysis) {
        totalScore += response.analysis.overallScore;
        scoredResponses++;
      }
    });

    const overallScore = scoredResponses > 0 ? Math.round(totalScore / scoredResponses) : 0;

    // Update analysis
    this.analysis = {
      ...this.analysis,
      overallScore,
      timeSpent,
      questionsAnswered,
      improvement: this.calculateImprovement(),
      dimensionScores: this.calculateDimensionScores(),
      strengths: this.identifyStrengths(),
      improvementAreas: this.identifyImprovementAreas(),
      recommendations: this.generateRecommendations()
    };
  }

  private calculateImprovement(): number {
    // This would typically compare with previous sessions
    // For now, return 0 as placeholder
    return 0;
  }

  private calculateDimensionScores() {
    const dimensions = ['clarity', 'relevance', 'depth', 'communication', 'completeness'];
    
    return dimensions.map(dimension => {
      let totalScore = 0;
      let count = 0;

      this.responses.forEach(response => {
        if (response.analysis) {
          const analysis = response.analysis;
          let dimensionScore = 0;

          switch (dimension) {
            case 'clarity':
              dimensionScore = analysis.clarity.score;
              break;
            case 'relevance':
              dimensionScore = analysis.relevance.score;
              break;
            case 'depth':
              dimensionScore = analysis.depth.score;
              break;
            case 'communication':
              dimensionScore = analysis.communication.score;
              break;
            case 'completeness':
              dimensionScore = analysis.completeness.score;
              break;
          }

          totalScore += dimensionScore;
          count++;
        }
      });

      const score = count > 0 ? Math.round(totalScore / count) : 0;
      
      return {
        dimension,
        score,
        trend: 'stable' as const // Would be calculated based on historical data
      };
    });
  }

  private identifyStrengths(): string[] {
    const strengths: string[] = [];
    const dimensionScores = this.calculateDimensionScores();

    dimensionScores.forEach(dimension => {
      if (dimension.score >= 80) {
        strengths.push(`Strong ${dimension.dimension} skills`);
      }
    });

    return strengths;
  }

  private identifyImprovementAreas(): string[] {
    const areas: string[] = [];
    const dimensionScores = this.calculateDimensionScores();

    dimensionScores.forEach(dimension => {
      if (dimension.score < 60) {
        areas.push(`Improve ${dimension.dimension} skills`);
      }
    });

    return areas;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const progress = this.getProgress();

    if (progress.percentage < 50) {
      recommendations.push('Complete more questions to get better insights');
    }

    if (this.analysis.overallScore < 70) {
      recommendations.push('Focus on providing more detailed and structured answers');
    }

    if (this.getDuration() > this.config.duration) {
      recommendations.push('Try to be more concise in your responses');
    }

    return recommendations;
  }

  // Utility methods
  getQuestionsByCategory(category: QuestionCategory): Question[] {
    return this.questions.filter(q => q.category === category);
  }

  getQuestionsByType(type: QuestionType): Question[] {
    return this.questions.filter(q => q.type === type);
  }

  getResponsesForQuestion(questionId: string): UserResponse[] {
    return this.responses.filter(r => r.questionId === questionId);
  }

  getAverageResponseTime(): number {
    if (this.responses.length === 0) return 0;
    
    const totalTime = this.responses.reduce((sum, response) => sum + response.responseTime, 0);
    return Math.round(totalTime / this.responses.length);
  }

  getCompletionRate(): number {
    if (this.questions.length === 0) return 0;
    return Math.round((this.responses.length / this.questions.length) * 100);
  }

  isComplete(): boolean {
    return this.status === 'completed' || this.responses.length >= this.questions.length;
  }

  canAddMoreQuestions(): boolean {
    return this.status === 'active' && this.responses.length < this.questions.length;
  }

  // Serialization methods
  toJSON(): Session {
    return {
      id: this.id,
      userId: this.userId,
      jobDescriptionId: this.jobDescriptionId,
      config: this.config,
      questions: this.questions,
      responses: this.responses,
      analysis: this.analysis,
      startTime: this.startTime,
      endTime: this.endTime,
      status: this.status
    };
  }

  static fromJSON(data: any): SessionModel {
    // Convert date strings back to Date objects
    const sessionData = {
      ...data,
      startTime: new Date(data.startTime),
      endTime: data.endTime ? new Date(data.endTime) : undefined
    };

    // Convert response timestamps
    if (sessionData.responses) {
      sessionData.responses = sessionData.responses.map((response: any) => ({
        ...response,
        timestamp: new Date(response.timestamp)
      }));
    }

    return new SessionModel(sessionData);
  }
}