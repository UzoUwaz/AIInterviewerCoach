import { 
  ResponseAnalysis, 
  Question, 
  UserResponse, 
  SessionAnalysis,
  Session
} from '../types';
import { TextAnalysisService } from './TextAnalysisService';
import { SpeechAnalysisService } from './SpeechAnalysisService';
import { PerformanceScoringService } from './PerformanceScoringService';

/**
 * Instant analysis feedback service with React event handlers
 * Implements fast analysis pipeline optimized for browser performance
 */
export class InstantAnalysisService {
  private textAnalyzer: TextAnalysisService;
  private speechAnalyzer: SpeechAnalysisService;
  private performanceScorer: PerformanceScoringService;
  private analysisCache: Map<string, ResponseAnalysis> = new Map();
  private analysisQueue: AnalysisTask[] = [];
  private isProcessing = false;
  private eventListeners: AnalysisEventListeners = {};

  constructor() {
    this.textAnalyzer = new TextAnalysisService();
    this.speechAnalyzer = new SpeechAnalysisService();
    this.performanceScorer = new PerformanceScoringService();
  }

  /**
   * Sets up event listeners for analysis feedback
   */
  setupEventListeners(listeners: AnalysisEventListeners): void {
    this.eventListeners = listeners;
  }

  /**
   * Triggers immediate analysis on response submission
   */
  async triggerInstantAnalysis(
    response: UserResponse, 
    question: Question,
    priority: 'high' | 'normal' = 'normal'
  ): Promise<ResponseAnalysis> {
    // Check cache first
    const cacheKey = this.generateCacheKey(response, question);
    const cachedAnalysis = this.analysisCache.get(cacheKey);
    
    if (cachedAnalysis) {
      this.eventListeners.onAnalysisComplete?.(cachedAnalysis, response.id);
      return cachedAnalysis;
    }

    // Show loading state
    this.eventListeners.onAnalysisStart?.(response.id);

    try {
      // Fast preliminary analysis for immediate feedback
      const preliminaryAnalysis = await this.performPreliminaryAnalysis(response, question);
      this.eventListeners.onPreliminaryAnalysis?.(preliminaryAnalysis, response.id);

      // Queue comprehensive analysis
      const analysisTask: AnalysisTask = {
        id: `${response.id}_${Date.now()}`,
        response,
        question,
        priority,
        timestamp: Date.now()
      };

      this.queueAnalysis(analysisTask);

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processAnalysisQueue();
      }

      return preliminaryAnalysis;

    } catch (error) {
      console.error('Analysis failed:', error);
      const fallbackAnalysis = this.createFallbackAnalysis(response, question);
      this.eventListeners.onAnalysisError?.(error as Error, response.id);
      return fallbackAnalysis;
    }
  }

  /**
   * Performs fast preliminary analysis for immediate feedback
   */
  private async performPreliminaryAnalysis(
    response: UserResponse, 
    question: Question
  ): Promise<ResponseAnalysis> {
    const startTime = performance.now();

    // Quick text analysis
    const quickAnalysis = await this.performQuickTextAnalysis(response.textContent, question);
    
    // Add speech analysis if audio data exists
    if (response.audioData) {
      const speechAnalysis = this.speechAnalyzer.createFallbackAnalysis(
        response.textContent, 
        response.responseTime
      );
      quickAnalysis.communication = this.speechAnalyzer.createCommunicationScore(speechAnalysis);
    }

    const analysisTime = performance.now() - startTime;
    console.log(`Preliminary analysis completed in ${analysisTime.toFixed(2)}ms`);

    return quickAnalysis;
  }

  /**
   * Performs quick text analysis optimized for speed
   */
  private async performQuickTextAnalysis(text: string, question: Question): Promise<ResponseAnalysis> {
    if (!text.trim()) {
      return this.createEmptyAnalysis();
    }

    // Simplified analysis for speed
    const wordCount = text.split(/\s+/).length;
    const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    
    // Quick scoring based on basic metrics
    const clarityScore = this.calculateQuickClarity(text, wordCount, sentenceCount);
    const relevanceScore = this.calculateQuickRelevance(text, question);
    const completenessScore = this.calculateQuickCompleteness(wordCount, question.type);
    const depthScore = this.calculateQuickDepth(text, question);

    const overallScore = Math.round((clarityScore + relevanceScore + completenessScore + depthScore) / 4);

    return {
      clarity: {
        score: clarityScore,
        grammarIssues: [],
        structureRating: Math.min(10, Math.max(1, sentenceCount)),
        coherenceRating: wordCount > 20 ? 7 : 5
      },
      relevance: {
        score: relevanceScore,
        keywordMatch: this.calculateQuickKeywordMatch(text, question.expectedElements),
        topicAlignment: relevanceScore,
        answerCompleteness: completenessScore
      },
      depth: {
        score: depthScore,
        technicalAccuracy: depthScore,
        exampleQuality: this.hasExamples(text) ? 80 : 50,
        insightLevel: this.hasInsights(text) ? 75 : 45
      },
      communication: {
        score: clarityScore,
        confidence: 70, // Default for text
        pace: 0, // Will be updated with speech analysis
        fillerWords: [],
        clarity: clarityScore
      },
      completeness: {
        score: completenessScore,
        expectedElementsCovered: this.calculateQuickKeywordMatch(text, question.expectedElements),
        missingElements: [],
        additionalValue: wordCount > 100 ? 70 : 50
      },
      overallScore,
      improvementSuggestions: this.generateQuickSuggestions(clarityScore, relevanceScore, completenessScore),
      strengths: this.identifyQuickStrengths(clarityScore, relevanceScore, depthScore, completenessScore),
      weaknesses: this.identifyQuickWeaknesses(clarityScore, relevanceScore, depthScore, completenessScore)
    };
  }

  /**
   * Calculates quick clarity score
   */
  private calculateQuickClarity(text: string, wordCount: number, sentenceCount: number): number {
    let score = 70; // Base score

    // Penalize very short responses
    if (wordCount < 10) score -= 30;
    else if (wordCount < 20) score -= 15;

    // Reward good sentence structure
    if (sentenceCount > 1 && wordCount / sentenceCount > 5 && wordCount / sentenceCount < 25) {
      score += 15;
    }

    // Check for basic structure indicators
    if (text.includes('.') || text.includes('!') || text.includes('?')) score += 5;
    if (/\b(first|second|then|finally|however|therefore)\b/i.test(text)) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculates quick relevance score
   */
  private calculateQuickRelevance(text: string, question: Question): number {
    const textLower = text.toLowerCase();
    const questionLower = question.text.toLowerCase();

    // Extract key words from question (simple approach)
    const questionWords = questionLower
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.isStopWord(word));

    // Count matches
    const matches = questionWords.filter(word => textLower.includes(word)).length;
    const matchRatio = questionWords.length > 0 ? matches / questionWords.length : 0;

    return Math.min(100, Math.round(matchRatio * 80 + 20)); // Base score of 20
  }

  /**
   * Calculates quick completeness score based on word count and question type
   */
  private calculateQuickCompleteness(wordCount: number, questionType: string): number {
    const expectedRanges: Record<string, { min: number; ideal: number }> = {
      'behavioral': { min: 50, ideal: 150 },
      'technical': { min: 40, ideal: 120 },
      'situational': { min: 45, ideal: 130 },
      'system-design': { min: 80, ideal: 200 },
      'case-study': { min: 60, ideal: 180 }
    };

    const range = expectedRanges[questionType] || { min: 40, ideal: 120 };

    if (wordCount < range.min * 0.5) return 20;
    if (wordCount < range.min) return 50;
    if (wordCount <= range.ideal) return 90;
    if (wordCount <= range.ideal * 1.5) return 75;
    return 60; // Too long
  }

  /**
   * Calculates quick depth score
   */
  private calculateQuickDepth(text: string, question: Question): number {
    let score = 50; // Base score

    // Look for depth indicators
    if (this.hasExamples(text)) score += 20;
    if (this.hasInsights(text)) score += 15;
    if (this.hasSpecificDetails(text)) score += 10;
    if (question.type === 'technical' && this.hasTechnicalTerms(text)) score += 15;

    return Math.min(100, score);
  }

  /**
   * Calculates quick keyword match percentage
   */
  private calculateQuickKeywordMatch(text: string, expectedElements: string[]): number {
    if (expectedElements.length === 0) return 80;

    const textLower = text.toLowerCase();
    const matches = expectedElements.filter(element => 
      textLower.includes(element.toLowerCase())
    ).length;

    return Math.round((matches / expectedElements.length) * 100);
  }

  /**
   * Queues analysis task with priority handling
   */
  private queueAnalysis(task: AnalysisTask): void {
    // Remove any existing task for the same response
    this.analysisQueue = this.analysisQueue.filter(t => t.response.id !== task.response.id);
    
    // Insert based on priority
    if (task.priority === 'high') {
      this.analysisQueue.unshift(task);
    } else {
      this.analysisQueue.push(task);
    }

    // Limit queue size
    if (this.analysisQueue.length > 10) {
      this.analysisQueue = this.analysisQueue.slice(0, 10);
    }
  }

  /**
   * Processes analysis queue with batching
   */
  private async processAnalysisQueue(): Promise<void> {
    if (this.isProcessing || this.analysisQueue.length === 0) return;

    this.isProcessing = true;

    try {
      while (this.analysisQueue.length > 0) {
        const task = this.analysisQueue.shift()!;
        
        try {
          // Perform comprehensive analysis
          const analysis = await this.textAnalyzer.analyzeResponse(task.response, task.question);
          
          // Cache result
          const cacheKey = this.generateCacheKey(task.response, task.question);
          this.analysisCache.set(cacheKey, analysis);
          
          // Notify completion
          this.eventListeners.onAnalysisComplete?.(analysis, task.response.id);
          
          // Small delay to prevent blocking
          await this.delay(10);
          
        } catch (error) {
          console.error('Comprehensive analysis failed:', error);
          this.eventListeners.onAnalysisError?.(error as Error, task.response.id);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Analyzes complete session for session-level insights
   */
  async analyzeSession(session: Session): Promise<SessionAnalysis> {
    try {
      this.eventListeners.onSessionAnalysisStart?.(session.id);

      // Calculate performance score
      const performanceScore = await this.performanceScorer.calculateSessionScore(session);
      
      // Create session analysis
      const sessionAnalysis: SessionAnalysis = {
        overallScore: performanceScore.overallScore,
        dimensionScores: performanceScore.dimensionScores,
        improvement: performanceScore.improvement,
        timeSpent: this.calculateSessionDuration(session),
        questionsAnswered: session.responses.length,
        strengths: this.extractSessionStrengths(performanceScore.dimensionScores),
        improvementAreas: this.extractImprovementAreas(performanceScore.dimensionScores),
        recommendations: performanceScore.recommendations
      };

      this.eventListeners.onSessionAnalysisComplete?.(sessionAnalysis, session.id);
      return sessionAnalysis;

    } catch (error) {
      console.error('Session analysis failed:', error);
      this.eventListeners.onSessionAnalysisError?.(error as Error, session.id);
      return this.createEmptySessionAnalysis();
    }
  }

  /**
   * Provides progressive feedback during analysis
   */
  setupProgressiveFeedback(responseId: string): void {
    const steps = [
      { message: 'Analyzing response structure...', delay: 100 },
      { message: 'Checking relevance and completeness...', delay: 200 },
      { message: 'Evaluating depth and insights...', delay: 300 },
      { message: 'Generating personalized feedback...', delay: 400 }
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        this.eventListeners.onProgressUpdate?.(step.message, responseId, (index + 1) / steps.length);
      }, step.delay);
    });
  }

  /**
   * Manages analysis cache with LRU eviction
   */
  private manageCacheSize(): void {
    const MAX_CACHE_SIZE = 100;
    
    if (this.analysisCache.size > MAX_CACHE_SIZE) {
      // Simple LRU: remove oldest entries
      const entries = Array.from(this.analysisCache.entries());
      const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE);
      
      toRemove.forEach(([key]) => {
        this.analysisCache.delete(key);
      });
    }
  }

  /**
   * Generates cache key for response analysis
   */
  private generateCacheKey(response: UserResponse, question: Question): string {
    // Create hash of response content and question
    const content = `${response.textContent}_${question.id}_${question.text}`;
    return btoa(content).substring(0, 32); // Simple hash
  }

  /**
   * Creates fallback analysis when main analysis fails
   */
  private createFallbackAnalysis(response: UserResponse, question: Question): ResponseAnalysis {
    const wordCount = response.textContent.split(/\s+/).length;
    const baseScore = Math.min(70, Math.max(30, wordCount * 2)); // Simple scoring

    return {
      clarity: { score: baseScore, grammarIssues: [], structureRating: 5, coherenceRating: 5 },
      relevance: { score: baseScore, keywordMatch: 50, topicAlignment: 50, answerCompleteness: 50 },
      depth: { score: baseScore, technicalAccuracy: 50, exampleQuality: 50, insightLevel: 50 },
      communication: { score: baseScore, confidence: 60, pace: 0, fillerWords: [], clarity: baseScore },
      completeness: { score: baseScore, expectedElementsCovered: 50, missingElements: [], additionalValue: 50 },
      overallScore: baseScore,
      improvementSuggestions: ['Analysis temporarily unavailable. Please try again.'],
      strengths: wordCount > 20 ? ['Provided a substantial response'] : [],
      weaknesses: wordCount < 10 ? ['Response could be more detailed'] : []
    };
  }

  // Helper methods

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
    ]);
    return stopWords.has(word.toLowerCase());
  }

  private hasExamples(text: string): boolean {
    return /\b(for example|for instance|such as|like when|in my experience)\b/i.test(text);
  }

  private hasInsights(text: string): boolean {
    return /\b(i learned|i realized|the key insight|what i discovered|i believe)\b/i.test(text);
  }

  private hasSpecificDetails(text: string): boolean {
    return /\b(\d+%|\d+\s*(days?|weeks?|months?|years?)|version\s*\d+|\d+\s*users?)\b/i.test(text);
  }

  private hasTechnicalTerms(text: string): boolean {
    return /\b(algorithm|database|api|framework|library|architecture|performance|scalability)\b/i.test(text);
  }

  private generateQuickSuggestions(clarity: number, relevance: number, completeness: number): string[] {
    const suggestions: string[] = [];
    
    if (clarity < 60) suggestions.push('Try to structure your response more clearly');
    if (relevance < 60) suggestions.push('Make sure to directly address the question');
    if (completeness < 60) suggestions.push('Consider providing more detail and examples');
    
    return suggestions.slice(0, 2); // Limit for quick feedback
  }

  private identifyQuickStrengths(clarity: number, relevance: number, depth: number, completeness: number): string[] {
    const strengths: string[] = [];
    
    if (clarity >= 75) strengths.push('Clear communication');
    if (relevance >= 75) strengths.push('Relevant response');
    if (depth >= 75) strengths.push('Good depth of detail');
    if (completeness >= 75) strengths.push('Comprehensive answer');
    
    return strengths;
  }

  private identifyQuickWeaknesses(clarity: number, relevance: number, depth: number, completeness: number): string[] {
    const weaknesses: string[] = [];
    
    if (clarity < 50) weaknesses.push('Could be clearer');
    if (relevance < 50) weaknesses.push('Not fully relevant');
    if (depth < 50) weaknesses.push('Needs more detail');
    if (completeness < 50) weaknesses.push('Incomplete response');
    
    return weaknesses.slice(0, 2); // Limit for quick feedback
  }

  private calculateSessionDuration(session: Session): number {
    if (!session.endTime) return 0;
    return Math.round((session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60)); // minutes
  }

  private extractSessionStrengths(dimensionScores: any[]): string[] {
    return dimensionScores
      .filter(ds => ds.score >= 70)
      .map(ds => ds.dimension)
      .slice(0, 3);
  }

  private extractImprovementAreas(dimensionScores: any[]): string[] {
    return dimensionScores
      .filter(ds => ds.score < 60)
      .map(ds => ds.dimension)
      .slice(0, 3);
  }

  private createEmptyAnalysis(): ResponseAnalysis {
    return {
      clarity: { score: 0, grammarIssues: [], structureRating: 0, coherenceRating: 0 },
      relevance: { score: 0, keywordMatch: 0, topicAlignment: 0, answerCompleteness: 0 },
      depth: { score: 0, technicalAccuracy: 0, exampleQuality: 0, insightLevel: 0 },
      communication: { score: 0, confidence: 0, pace: 0, fillerWords: [], clarity: 0 },
      completeness: { score: 0, expectedElementsCovered: 0, missingElements: [], additionalValue: 0 },
      overallScore: 0,
      improvementSuggestions: [],
      strengths: [],
      weaknesses: []
    };
  }

  private createEmptySessionAnalysis(): SessionAnalysis {
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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.analysisCache.clear();
    this.analysisQueue = [];
    this.isProcessing = false;
    this.speechAnalyzer.cleanup();
  }
}

// Supporting interfaces

interface AnalysisTask {
  id: string;
  response: UserResponse;
  question: Question;
  priority: 'high' | 'normal';
  timestamp: number;
}

interface AnalysisEventListeners {
  onAnalysisStart?: (responseId: string) => void;
  onPreliminaryAnalysis?: (analysis: ResponseAnalysis, responseId: string) => void;
  onAnalysisComplete?: (analysis: ResponseAnalysis, responseId: string) => void;
  onAnalysisError?: (error: Error, responseId: string) => void;
  onProgressUpdate?: (message: string, responseId: string, progress: number) => void;
  onSessionAnalysisStart?: (sessionId: string) => void;
  onSessionAnalysisComplete?: (analysis: SessionAnalysis, sessionId: string) => void;
  onSessionAnalysisError?: (error: Error, sessionId: string) => void;
}