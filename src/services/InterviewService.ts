import { 
  Session, 
  SessionConfig, 
  Question, 
  UserResponse, 
  SessionAnalysis,
  QuestionCategory,
  QuestionType,
  ResponseAnalysis
} from '../types';
import { SessionModel } from '../models/Session';
import { QuestionGenerator } from './QuestionGenerator';
import { StorageManager } from '../storage/StorageManager';
import { JobDescriptionData } from '../types/parsing';
import { ResumeData } from '../types/resume';
import { simpleResponseAnalyzer } from './SimpleResponseAnalyzer';

export interface SessionStartOptions {
  userId: string;
  config: SessionConfig;
  jobDescription?: JobDescriptionData;
  resume?: ResumeData;
  existingQuestions?: Question[];
}

export interface ResponseSubmissionOptions {
  sessionId: string;
  questionId: string;
  textContent: string;
  audioData?: ArrayBuffer;
  speechAnalysis?: import('../types').SpeechAnalysis;
  responseTime: number;
}

export interface SessionProgressInfo {
  sessionId: string;
  currentQuestion: Question | null;
  nextQuestion: Question | null;
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  timeElapsed: number;
  estimatedTimeRemaining: number;
}

export interface SessionSummary {
  session: Session;
  analysis: SessionAnalysis;
  recommendations: string[];
  nextSteps: string[];
  performanceHighlights: {
    strengths: string[];
    improvementAreas: string[];
    topScores: Array<{ dimension: string; score: number }>;
  };
}

export class InterviewService {
  private questionGenerator: QuestionGenerator;
  private storageManager: StorageManager;
  private activeSessions: Map<string, SessionModel> = new Map();
  private sessionTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    questionGenerator: QuestionGenerator,
    storageManager: StorageManager
  ) {
    this.questionGenerator = questionGenerator;
    this.storageManager = storageManager;
  }

  /**
   * Start a new interview session
   */
  async startSession(options: SessionStartOptions): Promise<Session> {
    const { userId, config, jobDescription, resume, existingQuestions } = options;

    // Create new session
    const sessionData: Partial<Session> & { userId: string } = {
      userId,
      config,
      jobDescriptionId: jobDescription?.id,
      status: 'active',
      startTime: new Date(),
      questions: existingQuestions || [],
      responses: [],
      analysis: {
        overallScore: 0,
        dimensionScores: [],
        improvement: 0,
        timeSpent: 0,
        questionsAnswered: 0,
        strengths: [],
        improvementAreas: [],
        recommendations: []
      }
    };

    const session = new SessionModel(sessionData);

    // Generate questions if not provided
    if (!existingQuestions || existingQuestions.length === 0) {
      const questions = await this.generateSessionQuestions(config, jobDescription, resume);
      questions.forEach(question => session.addQuestion(question));
    }

    // Store session
    await this.storageManager.saveSession(session.toJSON());
    
    // Add to active sessions
    this.activeSessions.set(session.id, session);

    // Set up session timer if duration is specified
    if (config.duration > 0) {
      this.setupSessionTimer(session.id, config.duration);
    }

    return session.toJSON();
  }

  /**
   * Resume an existing session
   */
  async resumeSession(sessionId: string): Promise<Session> {
    // Check if session is already active
    let session = this.activeSessions.get(sessionId);
    
    if (!session) {
      // Load from storage
      const sessionData = await this.storageManager.getSession(sessionId);
      if (!sessionData) {
        throw new Error(`Session ${sessionId} not found`);
      }

      session = SessionModel.fromJSON(sessionData);
      this.activeSessions.set(sessionId, session);
    }

    // Resume if paused
    if (session.status === 'paused') {
      session.resume();
      await this.storageManager.saveSession(session.toJSON());
    }

    return session.toJSON();
  }

  /**
   * Pause an active session
   */
  async pauseSession(sessionId: string): Promise<Session> {
    const session = this.getActiveSession(sessionId);
    
    session.pause();
    await this.storageManager.saveSession(session.toJSON());

    // Clear timer
    this.clearSessionTimer(sessionId);

    return session.toJSON();
  }

  /**
   * Get the next question for a session
   */
  async getNextQuestion(sessionId: string): Promise<Question | null> {
    const session = this.getActiveSession(sessionId);
    
    const currentQuestion = session.getCurrentQuestion();
    if (!currentQuestion) {
      // Session is complete
      return null;
    }

    return currentQuestion;
  }

  /**
   * Submit a response to a question
   */
  async submitResponse(options: ResponseSubmissionOptions): Promise<{
    response: UserResponse;
    analysis: ResponseAnalysis;
    nextQuestion: Question | null;
    sessionComplete: boolean;
  }> {
    const { sessionId, questionId, textContent, audioData, speechAnalysis, responseTime } = options;
    const session = this.getActiveSession(sessionId);

    // Create response
    const response: UserResponse = {
      id: this.generateResponseId(),
      questionId,
      sessionId,
      textContent,
      audioData,
      speechAnalysis,
      timestamp: new Date(),
      responseTime
    };

    // Analyze response
    const question = session.questions.find(q => q.id === questionId);
    if (!question) {
      throw new Error(`Question ${questionId} not found in session`);
    }

    const analysis = await this.analyzeResponse(response, question);
    response.analysis = analysis;

    // Add response to session
    session.addResponse(response);

    // Save response and updated session
    await this.storageManager.saveResponse(response);
    await this.storageManager.saveSession(session.toJSON());

    // Check if session is complete
    const nextQuestion = session.getCurrentQuestion();
    const sessionComplete = nextQuestion === null;

    if (sessionComplete) {
      await this.completeSession(sessionId);
    }

    return {
      response,
      analysis,
      nextQuestion,
      sessionComplete
    };
  }

  /**
   * Complete a session
   */
  async completeSession(sessionId: string): Promise<SessionSummary> {
    const session = this.getActiveSession(sessionId);
    
    session.complete();
    await this.storageManager.saveSession(session.toJSON());

    // Clear timer
    this.clearSessionTimer(sessionId);

    // Remove from active sessions
    this.activeSessions.delete(sessionId);

    // Generate session summary
    const summary = await this.generateSessionSummary(session);

    return summary;
  }

  /**
   * Get session progress information
   */
  getSessionProgress(sessionId: string): SessionProgressInfo {
    const session = this.getActiveSession(sessionId);
    
    const currentQuestion = session.getCurrentQuestion();
    const nextQuestion = session.getNextQuestion();
    const progress = session.getProgress();
    const timeElapsed = session.getDuration();
    
    // Estimate remaining time based on average response time and remaining questions
    const avgResponseTime = session.getAverageResponseTime() || 120; // Default 2 minutes
    const remainingQuestions = progress.total - progress.completed;
    const estimatedTimeRemaining = remainingQuestions * (avgResponseTime / 60); // Convert to minutes

    return {
      sessionId,
      currentQuestion,
      nextQuestion,
      progress,
      timeElapsed,
      estimatedTimeRemaining
    };
  }

  /**
   * Add additional questions to an active session
   */
  async addQuestionsToSession(
    sessionId: string, 
    questions: Question[]
  ): Promise<Session> {
    const session = this.getActiveSession(sessionId);
    
    questions.forEach(question => session.addQuestion(question));
    await this.storageManager.saveSession(session.toJSON());

    return session.toJSON();
  }

  /**
   * Generate adaptive follow-up questions based on response
   */
  async generateFollowUpQuestions(
    sessionId: string,
    responseId: string
  ): Promise<Question[]> {
    const session = this.getActiveSession(sessionId);
    const response = session.responses.find(r => r.id === responseId);
    
    if (!response) {
      throw new Error(`Response ${responseId} not found`);
    }

    const originalQuestion = session.questions.find(q => q.id === response.questionId);
    if (!originalQuestion) {
      throw new Error(`Original question not found for response ${responseId}`);
    }

    const followUpQuestions = await this.questionGenerator.generateFollowUpQuestions(
      originalQuestion,
      response.textContent,
      { count: 2 }
    );

    return followUpQuestions;
  }

  /**
   * Get all active sessions for a user
   */
  async getUserActiveSessions(userId: string): Promise<Session[]> {
    const allSessions = await this.storageManager.getUserSessions(userId);
    return allSessions.filter(session => session.status === 'active' || session.status === 'paused');
  }

  /**
   * Get session history for a user
   */
  async getUserSessionHistory(userId: string): Promise<Session[]> {
    return await this.storageManager.getUserSessions(userId);
  }

  /**
   * Delete a session and all related data
   */
  async deleteSession(sessionId: string): Promise<void> {
    // Remove from active sessions
    this.activeSessions.delete(sessionId);
    
    // Clear timer
    this.clearSessionTimer(sessionId);
    
    // Delete from storage
    await this.storageManager.deleteSession(sessionId);
  }

  // Private helper methods

  private getActiveSession(sessionId: string): SessionModel {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} is not active or not found`);
    }
    return session;
  }

  private async generateSessionQuestions(
    config: SessionConfig,
    jobDescription?: JobDescriptionData,
    resume?: ResumeData
  ): Promise<Question[]> {
    const questionCount = Math.ceil(config.duration / 3); // Roughly 3 minutes per question
    
    let questions: Question[] = [];

    if (jobDescription && resume) {
      // Generate questions based on both job and resume
      const questionSet = await this.questionGenerator.getRecommendedQuestions(
        jobDescription,
        resume,
        {
          count: questionCount,
          types: this.getQuestionTypesFromCategories(config.questionCategories),
          categories: config.questionCategories,
          randomize: true
        }
      );
      questions = questionSet.questions;
    } else if (jobDescription) {
      // Generate questions based on job description only
      const questionSet = await this.questionGenerator.generateFromJobDescription(
        jobDescription,
        {
          count: questionCount,
          types: this.getQuestionTypesFromCategories(config.questionCategories),
          categories: config.questionCategories,
          randomize: true
        }
      );
      questions = questionSet.questions;
    } else if (resume) {
      // Generate questions based on resume only
      const questionSet = await this.questionGenerator.generateFromResume(
        resume,
        {
          count: questionCount,
          types: this.getQuestionTypesFromCategories(config.questionCategories),
          categories: config.questionCategories,
          randomize: true
        }
      );
      questions = questionSet.questions;
    } else {
      // Generate generic questions by category
      for (const category of config.questionCategories) {
        const categoryQuestions = await this.questionGenerator.generateByCategory(
          category,
          {
            count: Math.ceil(questionCount / config.questionCategories.length),
            randomize: true
          }
        );
        questions.push(...categoryQuestions.questions);
      }
    }

    // Limit to requested count and shuffle
    return this.shuffleArray(questions).slice(0, questionCount);
  }

  private getQuestionTypesFromCategories(categories: QuestionCategory[]): QuestionType[] {
    const typeMapping: Record<QuestionCategory, QuestionType[]> = {
      'technical-skills': ['technical', 'system-design'],
      'problem-solving': ['situational', 'case-study'],
      'communication': ['behavioral'],
      'teamwork': ['behavioral'],
      'leadership': ['behavioral', 'situational'],
      'domain-knowledge': ['technical', 'role-specific'],
      'culture-fit': ['behavioral'],
      'career-goals': ['behavioral']
    };

    const types = new Set<QuestionType>();
    categories.forEach(category => {
      const categoryTypes = typeMapping[category] || ['behavioral'];
      categoryTypes.forEach(type => types.add(type));
    });

    return Array.from(types);
  }

  private async analyzeResponse(
    response: UserResponse,
    question: Question
  ): Promise<ResponseAnalysis> {
    // Use the SimpleResponseAnalyzer for basic analysis and scoring
    return await simpleResponseAnalyzer.analyzeResponse(response, question);
  }



  private async generateSessionSummary(session: SessionModel): Promise<SessionSummary> {
    const analysis = session.analysis;
    
    // Generate recommendations based on performance
    const recommendations = this.generateSessionRecommendations(session);
    const nextSteps = this.generateNextSteps(session);
    
    // Identify performance highlights
    const performanceHighlights = {
      strengths: analysis.strengths,
      improvementAreas: analysis.improvementAreas,
      topScores: analysis.dimensionScores
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(score => ({ dimension: score.dimension, score: score.score }))
    };

    return {
      session: session.toJSON(),
      analysis,
      recommendations,
      nextSteps,
      performanceHighlights
    };
  }

  private generateSessionRecommendations(session: SessionModel): string[] {
    const recommendations: string[] = [];
    const analysis = session.analysis;
    
    if (analysis.overallScore >= 80) {
      recommendations.push('Excellent performance! Consider practicing more challenging questions');
    } else if (analysis.overallScore >= 60) {
      recommendations.push('Good progress! Focus on the improvement areas identified');
    } else {
      recommendations.push('Keep practicing! Focus on fundamental communication skills');
    }
    
    if (session.getDuration() > session.config.duration * 1.2) {
      recommendations.push('Work on being more concise in your responses');
    }
    
    return recommendations;
  }

  private generateNextSteps(session: SessionModel): string[] {
    const nextSteps: string[] = [];
    const analysis = session.analysis;
    
    nextSteps.push('Review the detailed feedback for each response');
    
    if (analysis.improvementAreas.length > 0) {
      nextSteps.push(`Focus on improving: ${analysis.improvementAreas.join(', ')}`);
    }
    
    nextSteps.push('Schedule your next practice session');
    
    return nextSteps;
  }

  private setupSessionTimer(sessionId: string, durationMinutes: number): void {
    const timeoutMs = durationMinutes * 60 * 1000;
    
    const timer = setTimeout(async () => {
      try {
        const session = this.activeSessions.get(sessionId);
        if (session && session.status === 'active') {
          await this.completeSession(sessionId);
        }
      } catch (error) {
        console.error(`Error auto-completing session ${sessionId}:`, error);
      }
    }, timeoutMs);
    
    this.sessionTimers.set(sessionId, timer);
  }

  private clearSessionTimer(sessionId: string): void {
    const timer = this.sessionTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.sessionTimers.delete(sessionId);
    }
  }

  private generateResponseId(): string {
    return `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}