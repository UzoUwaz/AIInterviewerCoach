import { 
  PerformanceScore, 
  DimensionScore, 
  Session, 
  SessionAnalysis,
  ResponseAnalysis,
  UserResponse,
  Question
} from '../types';

/**
 * Local performance scoring system using weighted algorithms
 * Implements multi-dimensional scoring with progress tracking and benchmarking
 */
export class PerformanceScoringService {
  private readonly STORAGE_KEY = 'interview_performance_history';
  private readonly BENCHMARK_STORAGE_KEY = 'performance_benchmarks';
  private performanceHistory: PerformanceScore[] = [];
  private benchmarks: PerformanceBenchmarks;

  constructor() {
    this.benchmarks = new PerformanceBenchmarks();
    this.loadPerformanceHistory();
  }

  /**
   * Calculates comprehensive performance score for a session
   */
  async calculateSessionScore(session: Session): Promise<PerformanceScore> {
    const dimensionScores = await this.calculateDimensionScores(session);
    const overallScore = this.calculateOverallScore(dimensionScores);
    const improvement = await this.calculateImprovement(session.userId, overallScore);
    const ranking = this.calculateRanking(overallScore, session.config.difficulty);
    const recommendations = this.generateRecommendations(dimensionScores, session);

    const performanceScore: PerformanceScore = {
      sessionId: session.id,
      userId: session.userId,
      overallScore,
      dimensionScores,
      improvement,
      ranking,
      recommendations,
      createdAt: new Date()
    };

    // Store in performance history
    await this.storePerformanceScore(performanceScore);

    return performanceScore;
  }

  /**
   * Calculates scores across multiple performance dimensions
   */
  private async calculateDimensionScores(session: Session): Promise<DimensionScore[]> {
    const responses = session.responses.filter(r => r.analysis);
    
    if (responses.length === 0) {
      return this.getDefaultDimensionScores();
    }

    const dimensions = [
      'clarity',
      'relevance', 
      'depth',
      'communication',
      'completeness',
      'technical_accuracy',
      'behavioral_competency',
      'problem_solving'
    ];

    const dimensionScores: DimensionScore[] = [];

    for (const dimension of dimensions) {
      const score = await this.calculateDimensionScore(dimension, responses, session.questions);
      const trend = await this.calculateDimensionTrend(dimension, session.userId, score);
      
      dimensionScores.push({
        dimension,
        score,
        trend
      });
    }

    return dimensionScores;
  }

  /**
   * Calculates score for a specific performance dimension
   */
  private async calculateDimensionScore(
    dimension: string, 
    responses: UserResponse[], 
    questions: Question[]
  ): Promise<number> {
    const scores: number[] = [];

    for (const response of responses) {
      if (!response.analysis) continue;

      const question = questions.find(q => q.id === response.questionId);
      if (!question) continue;

      let dimensionScore = 0;

      switch (dimension) {
        case 'clarity':
          dimensionScore = response.analysis.clarity.score;
          break;
        case 'relevance':
          dimensionScore = response.analysis.relevance.score;
          break;
        case 'depth':
          dimensionScore = response.analysis.depth.score;
          break;
        case 'communication':
          dimensionScore = response.analysis.communication.score;
          break;
        case 'completeness':
          dimensionScore = response.analysis.completeness.score;
          break;
        case 'technical_accuracy':
          dimensionScore = this.calculateTechnicalAccuracy(response.analysis, question);
          break;
        case 'behavioral_competency':
          dimensionScore = this.calculateBehavioralCompetency(response.analysis, question);
          break;
        case 'problem_solving':
          dimensionScore = this.calculateProblemSolving(response.analysis, question);
          break;
      }

      scores.push(dimensionScore);
    }

    if (scores.length === 0) return 0;

    // Weighted average with more recent responses having higher weight
    return this.calculateWeightedAverage(scores);
  }

  /**
   * Calculates technical accuracy score based on question type
   */
  private calculateTechnicalAccuracy(analysis: ResponseAnalysis, question: Question): number {
    if (question.type === 'technical' || question.type === 'system-design') {
      return analysis.depth.technicalAccuracy;
    }
    
    // For non-technical questions, use depth score as proxy
    return analysis.depth.score * 0.8; // Slightly lower weight
  }

  /**
   * Calculates behavioral competency score
   */
  private calculateBehavioralCompetency(analysis: ResponseAnalysis, question: Question): number {
    if (question.type === 'behavioral' || question.type === 'situational') {
      // Combine multiple factors for behavioral questions
      const structureScore = analysis.clarity.structureRating * 10;
      const exampleScore = analysis.depth.exampleQuality;
      const completenessScore = analysis.completeness.score;
      
      return Math.round((structureScore + exampleScore + completenessScore) / 3);
    }
    
    return analysis.relevance.score * 0.7; // Lower weight for non-behavioral
  }

  /**
   * Calculates problem-solving score
   */
  private calculateProblemSolving(analysis: ResponseAnalysis, question: Question): number {
    if (question.type === 'case-study' || question.type === 'system-design') {
      // Emphasize insight and depth for problem-solving questions
      const insightScore = analysis.depth.insightLevel;
      const depthScore = analysis.depth.score;
      const clarityScore = analysis.clarity.score;
      
      return Math.round((insightScore * 0.4 + depthScore * 0.4 + clarityScore * 0.2));
    }
    
    return analysis.depth.insightLevel;
  }

  /**
   * Calculates weighted average with recency bias
   */
  private calculateWeightedAverage(scores: number[]): number {
    if (scores.length === 0) return 0;
    if (scores.length === 1) return scores[0];

    let weightedSum = 0;
    let totalWeight = 0;

    scores.forEach((score, index) => {
      // More recent responses get higher weight
      const weight = Math.pow(1.1, index);
      weightedSum += score * weight;
      totalWeight += weight;
    });

    return Math.round(weightedSum / totalWeight);
  }

  /**
   * Calculates overall score from dimension scores
   */
  private calculateOverallScore(dimensionScores: DimensionScore[]): number {
    const weights: Record<string, number> = {
      'clarity': 0.15,
      'relevance': 0.20,
      'depth': 0.15,
      'communication': 0.15,
      'completeness': 0.15,
      'technical_accuracy': 0.10,
      'behavioral_competency': 0.05,
      'problem_solving': 0.05
    };

    let weightedSum = 0;
    let totalWeight = 0;

    dimensionScores.forEach(ds => {
      const weight = weights[ds.dimension] || 0.05;
      weightedSum += ds.score * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  /**
   * Calculates improvement compared to previous sessions
   */
  private async calculateImprovement(userId: string, currentScore: number): Promise<number> {
    const userHistory = this.performanceHistory
      .filter(p => p.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (userHistory.length === 0) return 0;

    // Compare with average of last 3 sessions
    const recentSessions = userHistory.slice(0, 3);
    const averagePreviousScore = recentSessions.reduce((sum, p) => sum + p.overallScore, 0) / recentSessions.length;

    return Math.round(currentScore - averagePreviousScore);
  }

  /**
   * Calculates performance ranking (percentile)
   */
  private calculateRanking(score: number, difficulty: string): string {
    const benchmarkScore = this.benchmarks.getBenchmarkScore(difficulty);
    
    if (score >= benchmarkScore.excellent) return '90th percentile';
    if (score >= benchmarkScore.good) return '75th percentile';
    if (score >= benchmarkScore.average) return '50th percentile';
    if (score >= benchmarkScore.belowAverage) return '25th percentile';
    return '10th percentile';
  }

  /**
   * Generates personalized recommendations based on performance
   */
  private generateRecommendations(dimensionScores: DimensionScore[], session: Session): string[] {
    const recommendations: string[] = [];
    const weakDimensions = dimensionScores
      .filter(ds => ds.score < 60)
      .sort((a, b) => a.score - b.score);

    // Address weakest areas first
    weakDimensions.slice(0, 3).forEach(dimension => {
      const recommendation = this.getRecommendationForDimension(dimension.dimension, dimension.score);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    });

    // Add session-specific recommendations
    const sessionRecommendations = this.getSessionSpecificRecommendations(session);
    recommendations.push(...sessionRecommendations);

    // Add improvement trend recommendations
    const trendRecommendations = this.getTrendRecommendations(dimensionScores);
    recommendations.push(...trendRecommendations);

    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  }

  /**
   * Gets recommendation for specific dimension
   */
  private getRecommendationForDimension(dimension: string, score: number): string | null {
    const recommendations: Record<string, Record<string, string>> = {
      'clarity': {
        low: 'Practice structuring your responses with clear beginning, middle, and end',
        medium: 'Work on using transition words to improve flow between ideas',
        high: 'Focus on eliminating filler words and speaking more concisely'
      },
      'relevance': {
        low: 'Make sure to directly answer the question before adding additional context',
        medium: 'Include more specific examples that directly relate to the question',
        high: 'Practice staying focused on the core question throughout your response'
      },
      'depth': {
        low: 'Provide more detailed examples and explanations in your responses',
        medium: 'Include specific metrics and outcomes when describing your experiences',
        high: 'Share deeper insights and lessons learned from your experiences'
      },
      'communication': {
        low: 'Practice speaking at a steady pace and projecting confidence',
        medium: 'Work on reducing filler words and improving vocal clarity',
        high: 'Focus on varying your tone and emphasis to maintain engagement'
      },
      'completeness': {
        low: 'Use the STAR method (Situation, Task, Action, Result) for behavioral questions',
        medium: 'Ensure you address all parts of multi-part questions',
        high: 'Add more context about the impact and significance of your actions'
      },
      'technical_accuracy': {
        low: 'Review fundamental concepts in your target technology stack',
        medium: 'Practice explaining technical concepts in simple terms',
        high: 'Stay updated with latest best practices and industry standards'
      },
      'behavioral_competency': {
        low: 'Prepare more diverse examples that showcase different competencies',
        medium: 'Practice the STAR method to structure behavioral responses',
        high: 'Focus on demonstrating leadership and initiative in your examples'
      },
      'problem_solving': {
        low: 'Practice breaking down complex problems into smaller components',
        medium: 'Explain your thought process step-by-step when solving problems',
        high: 'Consider multiple solution approaches and trade-offs'
      }
    };

    const dimensionRecs = recommendations[dimension];
    if (!dimensionRecs) return null;

    if (score < 40) return dimensionRecs.low;
    if (score < 70) return dimensionRecs.medium;
    return dimensionRecs.high;
  }

  /**
   * Gets session-specific recommendations
   */
  private getSessionSpecificRecommendations(session: Session): string[] {
    const recommendations: string[] = [];
    
    // Based on question types in session
    const questionTypes = session.questions.map(q => q.type);
    const uniqueTypes = [...new Set(questionTypes)];

    if (uniqueTypes.includes('behavioral') && session.responses.length > 0) {
      const behavioralResponses = session.responses.filter(r => {
        const question = session.questions.find(q => q.id === r.questionId);
        return question?.type === 'behavioral';
      });

      if (behavioralResponses.some(r => r.analysis && r.analysis.completeness.score < 60)) {
        recommendations.push('For behavioral questions, ensure you include the outcome and impact of your actions');
      }
    }

    if (uniqueTypes.includes('technical')) {
      recommendations.push('Consider practicing more technical questions in your focus area');
    }

    return recommendations;
  }

  /**
   * Gets recommendations based on performance trends
   */
  private getTrendRecommendations(dimensionScores: DimensionScore[]): string[] {
    const recommendations: string[] = [];
    
    const decliningDimensions = dimensionScores.filter(ds => ds.trend === 'declining');
    const improvingDimensions = dimensionScores.filter(ds => ds.trend === 'improving');

    if (decliningDimensions.length > 0) {
      recommendations.push(`Focus on ${decliningDimensions[0].dimension} - your performance in this area has been declining`);
    }

    if (improvingDimensions.length > 2) {
      recommendations.push('Great progress! Continue practicing to maintain your improvement momentum');
    }

    return recommendations;
  }

  /**
   * Calculates trend for a specific dimension
   */
  private async calculateDimensionTrend(dimension: string, userId: string, currentScore: number): Promise<'improving' | 'declining' | 'stable'> {
    const userHistory = this.performanceHistory
      .filter(p => p.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5); // Last 5 sessions

    if (userHistory.length < 2) return 'stable';

    const dimensionScores = userHistory
      .map(p => p.dimensionScores.find(ds => ds.dimension === dimension)?.score || 0)
      .filter(score => score > 0);

    if (dimensionScores.length < 2) return 'stable';

    // Add current score
    dimensionScores.unshift(currentScore);

    // Calculate trend using linear regression
    const trend = this.calculateLinearTrend(dimensionScores);
    
    if (trend > 2) return 'improving';
    if (trend < -2) return 'declining';
    return 'stable';
  }

  /**
   * Calculates linear trend from score array
   */
  private calculateLinearTrend(scores: number[]): number {
    if (scores.length < 2) return 0;

    const n = scores.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = scores;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  /**
   * Tracks progress over time with statistical analysis
   */
  async getProgressAnalytics(userId: string, timeframe: 'week' | 'month' | 'all' = 'all'): Promise<ProgressAnalytics> {
    const userHistory = this.performanceHistory
      .filter(p => p.userId === userId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    if (userHistory.length === 0) {
      return this.getEmptyProgressAnalytics();
    }

    // Filter by timeframe
    const filteredHistory = this.filterByTimeframe(userHistory, timeframe);

    const overallScores = filteredHistory.map(p => p.overallScore);
    const dimensionTrends = this.calculateDimensionTrends(filteredHistory);
    const improvementRate = this.calculateImprovementRate(overallScores);
    const consistencyScore = this.calculateConsistencyScore(overallScores);
    const strengthsAndWeaknesses = this.identifyStrengthsAndWeaknesses(filteredHistory);

    return {
      totalSessions: filteredHistory.length,
      averageScore: Math.round(overallScores.reduce((a, b) => a + b, 0) / overallScores.length),
      highestScore: Math.max(...overallScores),
      lowestScore: Math.min(...overallScores),
      improvementRate,
      consistencyScore,
      dimensionTrends,
      strengths: strengthsAndWeaknesses.strengths,
      weaknesses: strengthsAndWeaknesses.weaknesses,
      timeframe
    };
  }

  /**
   * Filters performance history by timeframe
   */
  private filterByTimeframe(history: PerformanceScore[], timeframe: 'week' | 'month' | 'all'): PerformanceScore[] {
    if (timeframe === 'all') return history;

    const now = new Date();
    const cutoffDate = new Date();

    if (timeframe === 'week') {
      cutoffDate.setDate(now.getDate() - 7);
    } else if (timeframe === 'month') {
      cutoffDate.setMonth(now.getMonth() - 1);
    }

    return history.filter(p => p.createdAt >= cutoffDate);
  }

  /**
   * Calculates improvement rate as percentage per session
   */
  private calculateImprovementRate(scores: number[]): number {
    if (scores.length < 2) return 0;

    const firstScore = scores[0];
    const lastScore = scores[scores.length - 1];
    const sessions = scores.length - 1;

    return Math.round(((lastScore - firstScore) / firstScore) * 100 / sessions);
  }

  /**
   * Calculates consistency score (lower variance = higher consistency)
   */
  private calculateConsistencyScore(scores: number[]): number {
    if (scores.length < 2) return 100;

    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);

    // Convert to consistency score (0-100, higher is more consistent)
    const consistencyScore = Math.max(0, 100 - (standardDeviation * 2));
    return Math.round(consistencyScore);
  }

  /**
   * Calculates trends for all dimensions
   */
  private calculateDimensionTrends(history: PerformanceScore[]): Record<string, number> {
    const dimensions = ['clarity', 'relevance', 'depth', 'communication', 'completeness'];
    const trends: Record<string, number> = {};

    dimensions.forEach(dimension => {
      const dimensionScores = history
        .map(p => p.dimensionScores.find(ds => ds.dimension === dimension)?.score || 0)
        .filter(score => score > 0);

      trends[dimension] = this.calculateLinearTrend(dimensionScores);
    });

    return trends;
  }

  /**
   * Identifies top strengths and weaknesses
   */
  private identifyStrengthsAndWeaknesses(history: PerformanceScore[]): { strengths: string[], weaknesses: string[] } {
    if (history.length === 0) return { strengths: [], weaknesses: [] };

    const dimensionAverages: Record<string, number> = {};
    const dimensions = ['clarity', 'relevance', 'depth', 'communication', 'completeness'];

    dimensions.forEach(dimension => {
      const scores = history
        .flatMap(p => p.dimensionScores.filter(ds => ds.dimension === dimension))
        .map(ds => ds.score);

      if (scores.length > 0) {
        dimensionAverages[dimension] = scores.reduce((a, b) => a + b, 0) / scores.length;
      }
    });

    const sortedDimensions = Object.entries(dimensionAverages)
      .sort(([, a], [, b]) => b - a);

    const strengths = sortedDimensions
      .filter(([, score]) => score >= 70)
      .slice(0, 3)
      .map(([dimension]) => dimension);

    const weaknesses = sortedDimensions
      .filter(([, score]) => score < 60)
      .slice(-3)
      .map(([dimension]) => dimension);

    return { strengths, weaknesses };
  }

  /**
   * Stores performance score in local storage
   */
  private async storePerformanceScore(score: PerformanceScore): Promise<void> {
    this.performanceHistory.push(score);
    
    // Keep only last 100 scores per user to manage storage
    const userScores = this.performanceHistory.filter(p => p.userId === score.userId);
    if (userScores.length > 100) {
      const excessCount = userScores.length - 100;
      const oldestScores = userScores
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .slice(0, excessCount);
      
      this.performanceHistory = this.performanceHistory.filter(p => 
        !oldestScores.some(old => old.sessionId === p.sessionId)
      );
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.performanceHistory));
    } catch (error) {
      console.error('Failed to store performance history:', error);
    }
  }

  /**
   * Loads performance history from local storage
   */
  private loadPerformanceHistory(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.performanceHistory = parsed.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt)
        }));
      }
    } catch (error) {
      console.error('Failed to load performance history:', error);
      this.performanceHistory = [];
    }
  }

  /**
   * Gets default dimension scores for empty sessions
   */
  private getDefaultDimensionScores(): DimensionScore[] {
    return [
      { dimension: 'clarity', score: 0, trend: 'stable' },
      { dimension: 'relevance', score: 0, trend: 'stable' },
      { dimension: 'depth', score: 0, trend: 'stable' },
      { dimension: 'communication', score: 0, trend: 'stable' },
      { dimension: 'completeness', score: 0, trend: 'stable' },
      { dimension: 'technical_accuracy', score: 0, trend: 'stable' },
      { dimension: 'behavioral_competency', score: 0, trend: 'stable' },
      { dimension: 'problem_solving', score: 0, trend: 'stable' }
    ];
  }

  /**
   * Gets empty progress analytics
   */
  private getEmptyProgressAnalytics(): ProgressAnalytics {
    return {
      totalSessions: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      improvementRate: 0,
      consistencyScore: 100,
      dimensionTrends: {},
      strengths: [],
      weaknesses: [],
      timeframe: 'all'
    };
  }
}

/**
 * Performance benchmarks for different difficulty levels
 */
class PerformanceBenchmarks {
  private benchmarks: Record<string, BenchmarkScores> = {
    'easy': {
      excellent: 85,
      good: 75,
      average: 65,
      belowAverage: 50
    },
    'medium': {
      excellent: 80,
      good: 70,
      average: 60,
      belowAverage: 45
    },
    'hard': {
      excellent: 75,
      good: 65,
      average: 55,
      belowAverage: 40
    },
    'adaptive': {
      excellent: 80,
      good: 70,
      average: 60,
      belowAverage: 45
    }
  };

  getBenchmarkScore(difficulty: string): BenchmarkScores {
    return this.benchmarks[difficulty] || this.benchmarks['medium'];
  }
}

// Supporting interfaces

interface BenchmarkScores {
  excellent: number;
  good: number;
  average: number;
  belowAverage: number;
}

interface ProgressAnalytics {
  totalSessions: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  improvementRate: number; // percentage per session
  consistencyScore: number; // 0-100, higher is more consistent
  dimensionTrends: Record<string, number>; // trend slope for each dimension
  strengths: string[]; // top performing dimensions
  weaknesses: string[]; // lowest performing dimensions
  timeframe: 'week' | 'month' | 'all';
}