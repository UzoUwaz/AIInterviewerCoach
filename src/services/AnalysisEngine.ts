import { 
  ResponseAnalysis, 
  SessionAnalysis, 
  Question, 
  UserResponse, 
  Session,
  PerformanceScore
} from '../types';
import { TextAnalysisService } from './TextAnalysisService';
import { SpeechAnalysisService } from './SpeechAnalysisService';
import { PerformanceScoringService } from './PerformanceScoringService';
import { InstantAnalysisService } from './InstantAnalysisService';

/**
 * Main analysis engine that coordinates all analysis services
 * Provides unified interface for text, speech, and performance analysis
 */
export class AnalysisEngine {
  private textAnalyzer: TextAnalysisService;
  private speechAnalyzer: SpeechAnalysisService;
  private performanceScorer: PerformanceScoringService;
  private instantAnalyzer: InstantAnalysisService;

  constructor() {
    this.textAnalyzer = new TextAnalysisService();
    this.speechAnalyzer = new SpeechAnalysisService();
    this.performanceScorer = new PerformanceScoringService();
    this.instantAnalyzer = new InstantAnalysisService();
  }

  /**
   * Analyzes a user response with both text and speech analysis
   */
  async analyzeResponse(response: UserResponse, question: Question): Promise<ResponseAnalysis> {
    try {
      // Start with text analysis
      const textAnalysis = await this.textAnalyzer.analyzeResponse(response, question);

      // Add speech analysis if audio data is available
      if (response.audioData && this.speechAnalyzer.isSpeechRecognitionSupported()) {
        try {
          // Note: In a real implementation, you'd need to process the audio data
          // For now, we'll use the fallback analysis
          const speechAnalysis = this.speechAnalyzer.createFallbackAnalysis(
            response.textContent, 
            response.responseTime
          );
          
          // Merge speech analysis into text analysis
          textAnalysis.communication = this.speechAnalyzer.createCommunicationScore(speechAnalysis);
        } catch (speechError) {
          console.warn('Speech analysis failed, using text-only analysis:', speechError);
        }
      }

      return textAnalysis;
    } catch (error) {
      console.error('Response analysis failed:', error);
      throw new Error('Failed to analyze response');
    }
  }

  /**
   * Triggers instant analysis for immediate feedback
   */
  async triggerInstantAnalysis(
    response: UserResponse, 
    question: Question,
    priority: 'high' | 'normal' = 'normal'
  ): Promise<ResponseAnalysis> {
    return this.instantAnalyzer.triggerInstantAnalysis(response, question, priority);
  }

  /**
   * Analyzes complete session performance
   */
  async analyzeSession(session: Session): Promise<SessionAnalysis> {
    try {
      return await this.instantAnalyzer.analyzeSession(session);
    } catch (error) {
      console.error('Session analysis failed:', error);
      throw new Error('Failed to analyze session');
    }
  }

  /**
   * Calculates performance score for a session
   */
  async calculatePerformanceScore(session: Session): Promise<PerformanceScore> {
    try {
      return await this.performanceScorer.calculateSessionScore(session);
    } catch (error) {
      console.error('Performance scoring failed:', error);
      throw new Error('Failed to calculate performance score');
    }
  }

  /**
   * Gets progress analytics for a user
   */
  async getProgressAnalytics(
    userId: string, 
    timeframe: 'week' | 'month' | 'all' = 'all'
  ): Promise<any> {
    try {
      return await this.performanceScorer.getProgressAnalytics(userId, timeframe);
    } catch (error) {
      console.error('Progress analytics failed:', error);
      throw new Error('Failed to get progress analytics');
    }
  }

  /**
   * Sets up event listeners for real-time analysis feedback
   */
  setupAnalysisEventListeners(listeners: any): void {
    this.instantAnalyzer.setupEventListeners(listeners);
  }

  /**
   * Sets up speech recognition for real-time transcription
   */
  setupSpeechRecognition(
    onInterimResult: (text: string) => void,
    onFinalResult: (text: string) => void,
    onError: (error: string) => void
  ): void {
    this.speechAnalyzer.setupRealtimeTranscription(onInterimResult, onFinalResult, onError);
  }

  /**
   * Starts speech recording
   */
  async startSpeechRecording(): Promise<void> {
    if (!this.speechAnalyzer.isSpeechRecognitionSupported()) {
      throw new Error('Speech recognition not supported in this browser');
    }
    return this.speechAnalyzer.startRecording();
  }

  /**
   * Stops speech recording and returns analysis
   */
  async stopSpeechRecording(): Promise<any> {
    return this.speechAnalyzer.stopRecording();
  }

  /**
   * Checks if speech recognition is supported
   */
  isSpeechRecognitionSupported(): boolean {
    return this.speechAnalyzer.isSpeechRecognitionSupported();
  }

  /**
   * Provides progressive feedback during analysis
   */
  setupProgressiveFeedback(responseId: string): void {
    this.instantAnalyzer.setupProgressiveFeedback(responseId);
  }

  /**
   * Cleanup all analysis services
   */
  cleanup(): void {
    this.speechAnalyzer.cleanup();
    this.instantAnalyzer.cleanup();
  }
}

// Export singleton instance
export const analysisEngine = new AnalysisEngine();