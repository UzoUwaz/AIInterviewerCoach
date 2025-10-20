import { UserResponse, Question, ResponseAnalysis } from '../types';

/**
 * Enhanced response analyzer with role-specific keyword analysis
 * and constructive feedback generation
 */
export class EnhancedResponseAnalyzer {
  
  // Role-specific keywords that indicate strong candidates
  private roleKeywords = {
    technical: [
      'implemented', 'developed', 'built', 'designed', 'architected',
      'optimized', 'scaled', 'deployed', 'maintained', 'debugged',
      'tested', 'automated', 'integrated', 'refactored', 'migrated'
    ],
    leadership: [
      'led', 'managed', 'coordinated', 'mentored', 'guided',
      'facilitated', 'organized', 'delegated', 'motivated', 'coached'
    ],
    problemSolving: [
      'solved', 'resolved', 'identified', 'analyzed', 'investigated',
      'troubleshot', 'diagnosed', 'improved', 'enhanced', 'streamlined'
    ],
    communication: [
      'collaborated', 'communicated', 'presented', 'documented', 'explained',
      'discussed', 'negotiated', 'aligned', 'coordinated', 'shared'
    ],
    impact: [
      'increased', 'decreased', 'reduced', 'improved', 'achieved',
      'delivered', 'saved', 'generated', 'accelerated', 'enhanced'
    ],
    metrics: [
      '%', 'percent', 'million', 'thousand', 'users', 'customers',
      'revenue', 'cost', 'time', 'performance', 'efficiency'
    ]
  };

  // STAR method components
  private starComponents = {
    situation: ['faced', 'encountered', 'situation', 'challenge', 'problem', 'context'],
    task: ['responsible', 'tasked', 'needed', 'required', 'goal', 'objective'],
    action: ['did', 'implemented', 'created', 'developed', 'took', 'action', 'approach'],
    result: ['result', 'outcome', 'achieved', 'accomplished', 'impact', 'success']
  };

  /**
   * Analyzes a user response with enhanced keyword and role-specific feedback
   */
  async analyzeResponse(response: UserResponse, question: Question): Promise<ResponseAnalysis> {
    const text = response.textContent.trim();
    
    if (!text) {
      return this.createEmptyAnalysis();
    }

    // Basic metrics
    const wordCount = this.getWordCount(text);
    const sentenceCount = this.getSentenceCount(text);
    
    // Enhanced analysis
    const keywordAnalysis = this.analyzeKeywords(text, question);
    const starAnalysis = this.analyzeSTARMethod(text);
    const lengthScore = this.calculateLengthScore(wordCount, question.type);
    const structureScore = this.calculateStructureScore(text, sentenceCount, starAnalysis);
    const completenessScore = this.calculateCompletenessScore(text, question);
    
    // Calculate overall score (0-100 scale)
    const overallScore = Math.min(100, Math.max(0, Math.round(
      (lengthScore * 0.15) + 
      (keywordAnalysis.score * 0.35) + 
      (structureScore * 0.25) + 
      (completenessScore * 0.25)
    )));

    // Generate enhanced feedback
    const feedback = this.generateEnhancedFeedback(
      text, 
      question, 
      wordCount, 
      keywordAnalysis, 
      starAnalysis,
      structureScore,
      completenessScore
    );

    return {
      clarity: {
        score: structureScore,
        grammarIssues: [],
        structureRating: Math.round(structureScore / 10),
        coherenceRating: Math.round(structureScore / 10)
      },
      relevance: {
        score: keywordAnalysis.score,
        keywordMatch: keywordAnalysis.score,
        topicAlignment: keywordAnalysis.score,
        answerCompleteness: completenessScore
      },
      depth: {
        score: completenessScore,
        technicalAccuracy: keywordAnalysis.technicalScore,
        exampleQuality: starAnalysis.hasExample ? 85 : 40,
        insightLevel: starAnalysis.hasResult ? 80 : 50
      },
      communication: {
        score: structureScore,
        confidence: this.estimateConfidence(text),
        pace: this.calculateReadingPace(text, response.responseTime),
        fillerWords: [],
        clarity: structureScore
      },
      completeness: {
        score: completenessScore,
        expectedElementsCovered: this.calculateExpectedElementsCoverage(text, question.expectedElements),
        missingElements: this.findMissingElements(text, question.expectedElements),
        additionalValue: keywordAnalysis.impactScore
      },
      overallScore,
      improvementSuggestions: feedback.improvements,
      strengths: feedback.strengths,
      weaknesses: feedback.improvements.length > 0 ? ['See improvement suggestions below'] : []
    };
  }

  /**
   * Analyze keywords and suggest missing ones
   */
  private analyzeKeywords(text: string, question: Question): {
    score: number;
    technicalScore: number;
    impactScore: number;
    foundKeywords: string[];
    missingKeywords: string[];
  } {
    const textLower = text.toLowerCase();
    const questionType = question.type.toString().toLowerCase();
    
    let foundKeywords: string[] = [];
    let missingKeywords: string[] = [];
    let totalScore = 0;
    let technicalScore = 0;
    let impactScore = 0;

    // Check for action verbs
    const actionVerbs = [...this.roleKeywords.technical, ...this.roleKeywords.problemSolving];
    const foundActions = actionVerbs.filter(keyword => textLower.includes(keyword));
    foundKeywords.push(...foundActions);
    totalScore += foundActions.length * 5;
    technicalScore += foundActions.length * 8;

    // Check for impact/results
    const impactWords = [...this.roleKeywords.impact, ...this.roleKeywords.metrics];
    const foundImpact = impactWords.filter(keyword => textLower.includes(keyword));
    foundKeywords.push(...foundImpact);
    totalScore += foundImpact.length * 8;
    impactScore += foundImpact.length * 10;

    // Check for collaboration
    const collabWords = this.roleKeywords.communication;
    const foundCollab = collabWords.filter(keyword => textLower.includes(keyword));
    foundKeywords.push(...foundCollab);
    totalScore += foundCollab.length * 5;

    // Suggest missing keywords based on question type
    if (questionType.includes('behavioral') || questionType.includes('problem')) {
      if (foundActions.length === 0) {
        missingKeywords.push('action verbs (e.g., implemented, developed, solved)');
      }
      if (foundImpact.length === 0) {
        missingKeywords.push('quantifiable results (e.g., increased by 20%, reduced time by 50%)');
      }
    }

    if (questionType.includes('technical')) {
      if (technicalScore < 20) {
        missingKeywords.push('specific technical details (e.g., technologies used, implementation approach)');
      }
    }

    // Cap the score at 100
    const finalScore = Math.min(100, Math.max(20, totalScore + 30));

    return {
      score: finalScore,
      technicalScore: Math.min(100, technicalScore + 40),
      impactScore: Math.min(100, impactScore + 40),
      foundKeywords: [...new Set(foundKeywords)],
      missingKeywords
    };
  }

  /**
   * Analyze if response follows STAR method
   */
  private analyzeSTARMethod(text: string): {
    hasSituation: boolean;
    hasTask: boolean;
    hasAction: boolean;
    hasResult: boolean;
    hasExample: boolean;
    score: number;
  } {
    const textLower = text.toLowerCase();
    
    const hasSituation = this.starComponents.situation.some(word => textLower.includes(word));
    const hasTask = this.starComponents.task.some(word => textLower.includes(word));
    const hasAction = this.starComponents.action.some(word => textLower.includes(word));
    const hasResult = this.starComponents.result.some(word => textLower.includes(word));
    
    const hasExample = hasSituation || hasAction;
    
    let score = 0;
    if (hasSituation) score += 25;
    if (hasTask) score += 20;
    if (hasAction) score += 30;
    if (hasResult) score += 25;

    return {
      hasSituation,
      hasTask,
      hasAction,
      hasResult,
      hasExample,
      score
    };
  }

  /**
   * Generate enhanced, constructive feedback
   */
  private generateEnhancedFeedback(
    text: string,
    question: Question,
    wordCount: number,
    keywordAnalysis: any,
    starAnalysis: any,
    structureScore: number,
    completenessScore: number
  ): { strengths: string[], improvements: string[] } {
    const strengths: string[] = [];
    const improvements: string[] = [];

    // Analyze strengths
    if (wordCount >= 50) {
      strengths.push('Provided detailed response with good length');
    }
    
    if (keywordAnalysis.foundKeywords.length >= 3) {
      strengths.push(`Used strong action words: ${keywordAnalysis.foundKeywords.slice(0, 3).join(', ')}`);
    }
    
    if (starAnalysis.hasResult) {
      strengths.push('Included results and outcomes - excellent!');
    }
    
    if (keywordAnalysis.impactScore > 60) {
      strengths.push('Demonstrated measurable impact');
    }

    if (structureScore >= 70) {
      strengths.push('Well-organized and easy to follow');
    }

    // Generate specific improvements with keyword suggestions
    if (wordCount < 40) {
      improvements.push('Expand your response with more specific details and examples (aim for 50-150 words)');
    }

    if (!starAnalysis.hasSituation && question.type.toString().includes('behavioral')) {
      improvements.push('Start by setting the context: describe the situation or challenge you faced');
    }

    if (!starAnalysis.hasAction) {
      improvements.push('Describe the specific actions YOU took (use action verbs like: implemented, developed, led, created)');
    }

    if (!starAnalysis.hasResult) {
      improvements.push('Add the outcome: What was the result? Include metrics if possible (e.g., "increased efficiency by 30%", "reduced costs by $50K")');
    }

    if (keywordAnalysis.missingKeywords.length > 0) {
      improvements.push(`Consider adding: ${keywordAnalysis.missingKeywords.join('; ')}`);
    }

    if (keywordAnalysis.foundKeywords.length < 2) {
      improvements.push('Use more action-oriented language (e.g., "I developed...", "I implemented...", "I solved...")');
    }

    if (completenessScore < 60) {
      improvements.push('Address all parts of the question more thoroughly');
    }

    if (wordCount > 200) {
      improvements.push('Try to be more concise while keeping the key points');
    }

    // Ensure we have at least some feedback
    if (strengths.length === 0) {
      strengths.push('You provided a response - that\'s a good start!');
    }

    return { strengths, improvements };
  }

  // Helper methods (simplified versions)
  private getWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private getSentenceCount(text: string): number {
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  }

  private calculateLengthScore(wordCount: number, questionType: string): number {
    const idealMin = 50;
    const idealMax = 150;

    if (wordCount < idealMin * 0.5) return 30;
    if (wordCount < idealMin) return 60;
    if (wordCount <= idealMax) return 95;
    if (wordCount <= idealMax * 1.5) return 80;
    return 65;
  }

  private calculateStructureScore(text: string, sentenceCount: number, starAnalysis: any): number {
    let score = 50;

    if (sentenceCount >= 3) score += 15;
    if (sentenceCount >= 5) score += 10;
    if (sentenceCount === 1) score -= 20;

    score += starAnalysis.score * 0.25;

    return Math.min(100, Math.max(20, score));
  }

  private calculateCompletenessScore(text: string, question: Question): number {
    if (question.expectedElements.length === 0) return 75;

    const textLower = text.toLowerCase();
    const coveredElements = question.expectedElements.filter(element =>
      textLower.includes(element.toLowerCase())
    );

    const coveragePercentage = (coveredElements.length / question.expectedElements.length) * 100;
    return Math.min(100, Math.max(30, coveragePercentage));
  }

  private calculateExpectedElementsCoverage(text: string, expectedElements: string[]): number {
    if (expectedElements.length === 0) return 85;

    const textLower = text.toLowerCase();
    const coveredElements = expectedElements.filter(element =>
      textLower.includes(element.toLowerCase())
    );

    return Math.round((coveredElements.length / expectedElements.length) * 100);
  }

  private findMissingElements(text: string, expectedElements: string[]): string[] {
    const textLower = text.toLowerCase();
    return expectedElements.filter(element =>
      !textLower.includes(element.toLowerCase())
    );
  }

  private estimateConfidence(text: string): number {
    const confidenceIndicators = ['confident', 'believe', 'know', 'definitely', 'certainly'];
    const uncertaintyIndicators = ['think', 'maybe', 'perhaps', 'possibly', 'guess'];

    const textLower = text.toLowerCase();
    const confidenceCount = confidenceIndicators.filter(phrase => textLower.includes(phrase)).length;
    const uncertaintyCount = uncertaintyIndicators.filter(phrase => textLower.includes(phrase)).length;

    let score = 70;
    score += confidenceCount * 10;
    score -= uncertaintyCount * 8;

    return Math.min(100, Math.max(20, score));
  }

  private calculateReadingPace(text: string, responseTimeSeconds: number): number {
    const wordCount = this.getWordCount(text);
    const minutes = responseTimeSeconds / 60;
    
    if (minutes === 0) return 0;
    
    return Math.round(wordCount / minutes);
  }

  private createEmptyAnalysis(): ResponseAnalysis {
    return {
      clarity: { score: 0, grammarIssues: ['No response provided'], structureRating: 0, coherenceRating: 0 },
      relevance: { score: 0, keywordMatch: 0, topicAlignment: 0, answerCompleteness: 0 },
      depth: { score: 0, technicalAccuracy: 0, exampleQuality: 0, insightLevel: 0 },
      communication: { score: 0, confidence: 0, pace: 0, fillerWords: [], clarity: 0 },
      completeness: { score: 0, expectedElementsCovered: 0, missingElements: [], additionalValue: 0 },
      overallScore: 0,
      improvementSuggestions: ['Please provide a response to receive analysis'],
      strengths: [],
      weaknesses: ['No response provided']
    };
  }
}

// Export singleton instance
export const enhancedResponseAnalyzer = new EnhancedResponseAnalyzer();
