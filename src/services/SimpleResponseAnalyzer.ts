import { UserResponse, Question, ResponseAnalysis } from '../types';

/**
 * Simple response analyzer for basic text analysis and scoring
 * Implements lightweight analysis for MVP demo
 */
export class SimpleResponseAnalyzer {
  
  /**
   * Analyzes a user response with basic text metrics and simple scoring
   */
  async analyzeResponse(response: UserResponse, question: Question): Promise<ResponseAnalysis> {
    const text = response.textContent.trim();
    
    if (!text) {
      return this.createEmptyAnalysis();
    }

    // Basic text metrics
    const wordCount = this.getWordCount(text);
    const sentenceCount = this.getSentenceCount(text);
    
    // Simple scoring components
    const lengthScore = this.calculateLengthScore(wordCount, question.type);
    const keywordScore = this.calculateKeywordScore(text, question);
    const structureScore = this.calculateStructureScore(text, sentenceCount);
    const completenessScore = this.calculateCompletenessScore(text, question);
    
    // Overall score (weighted average) - ensure it's between 0-100
    const rawScore = (lengthScore * 0.2) + 
                     (keywordScore * 0.3) + 
                     (structureScore * 0.2) + 
                     (completenessScore * 0.3);
    const overallScore = Math.min(100, Math.max(0, Math.round(rawScore)));

    // Generate feedback
    const { strengths, improvementSuggestions } = this.generateSimpleFeedback(
      text, question, wordCount, keywordScore, structureScore, completenessScore
    );

    return {
      clarity: {
        score: structureScore,
        grammarIssues: [],
        structureRating: Math.round(structureScore / 10),
        coherenceRating: Math.round(structureScore / 10)
      },
      relevance: {
        score: keywordScore,
        keywordMatch: keywordScore,
        topicAlignment: keywordScore,
        answerCompleteness: completenessScore
      },
      depth: {
        score: completenessScore,
        technicalAccuracy: completenessScore,
        exampleQuality: this.hasExamples(text) ? 80 : 40,
        insightLevel: this.hasInsights(text) ? 75 : 50
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
        additionalValue: this.hasAdditionalValue(text) ? 70 : 50
      },
      overallScore,
      improvementSuggestions,
      strengths,
      weaknesses: improvementSuggestions.length > 0 ? ['Areas for improvement identified'] : []
    };
  }

  /**
   * Get word count from text
   */
  private getWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Get sentence count from text
   */
  private getSentenceCount(text: string): number {
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  }

  /**
   * Calculate score based on response length
   */
  private calculateLengthScore(wordCount: number, questionType: string): number {
    let idealMin = 30;
    let idealMax = 150;

    // Adjust ideal length based on question type
    switch (questionType) {
      case 'behavioral':
        idealMin = 50;
        idealMax = 200;
        break;
      case 'technical':
        idealMin = 40;
        idealMax = 180;
        break;
      case 'situational':
        idealMin = 45;
        idealMax = 170;
        break;
      case 'system-design':
        idealMin = 80;
        idealMax = 250;
        break;
    }

    if (wordCount < idealMin * 0.5) return 20;
    if (wordCount < idealMin) return 50;
    if (wordCount <= idealMax) return 90;
    if (wordCount <= idealMax * 1.5) return 75;
    return 60; // Too long
  }

  /**
   * Calculate keyword relevance score with role-specific analysis
   */
  private calculateKeywordScore(text: string, question: Question): number {
    const textLower = text.toLowerCase();
    const questionLower = question.text.toLowerCase();
    
    // Extract key terms from question
    const questionWords = questionLower
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));

    if (questionWords.length === 0) return 70;

    // Count direct matches
    const matches = questionWords.filter(word => 
      textLower.includes(word) || 
      textLower.includes(word.substring(0, word.length - 1))
    ).length;

    // Check for role-specific keywords based on response content
    const roleKeywords = this.identifyRoleKeywords(textLower);
    const roleBonus = roleKeywords.length * 5; // Bonus for using relevant keywords

    const baseScore = (matches / questionWords.length) * 60;
    const finalScore = Math.min(100, Math.max(20, baseScore + 20 + roleBonus));
    
    return Math.round(finalScore);
  }

  /**
   * Calculate structure score based on sentence variety and organization
   */
  private calculateStructureScore(text: string, sentenceCount: number): number {
    let score = 50; // Base score

    // Sentence count scoring
    if (sentenceCount >= 3) score += 20;
    if (sentenceCount >= 5) score += 10;
    if (sentenceCount === 1) score -= 20;

    // Look for transition words
    const transitionWords = ['however', 'therefore', 'furthermore', 'additionally', 'first', 'second', 'finally', 'also', 'then', 'next'];
    const hasTransitions = transitionWords.some(word => text.toLowerCase().includes(word));
    if (hasTransitions) score += 15;

    // Look for examples or explanations
    const examplePhrases = ['for example', 'for instance', 'such as', 'like when', 'in my experience'];
    const hasExamples = examplePhrases.some(phrase => text.toLowerCase().includes(phrase));
    if (hasExamples) score += 15;

    return Math.min(100, Math.max(20, score));
  }

  /**
   * Calculate completeness score based on expected elements
   */
  private calculateCompletenessScore(text: string, question: Question): number {
    if (question.expectedElements.length === 0) return 75;

    const textLower = text.toLowerCase();
    const coveredElements = question.expectedElements.filter(element =>
      textLower.includes(element.toLowerCase()) ||
      this.findSimilarConcepts(textLower, element.toLowerCase())
    );

    const coveragePercentage = (coveredElements.length / question.expectedElements.length) * 100;
    return Math.min(100, Math.max(30, coveragePercentage));
  }

  /**
   * Calculate expected elements coverage percentage
   */
  private calculateExpectedElementsCoverage(text: string, expectedElements: string[]): number {
    if (expectedElements.length === 0) return 85;

    const textLower = text.toLowerCase();
    const coveredElements = expectedElements.filter(element =>
      textLower.includes(element.toLowerCase()) ||
      this.findSimilarConcepts(textLower, element.toLowerCase())
    );

    return Math.round((coveredElements.length / expectedElements.length) * 100);
  }

  /**
   * Find missing elements from expected elements
   */
  private findMissingElements(text: string, expectedElements: string[]): string[] {
    const textLower = text.toLowerCase();
    return expectedElements.filter(element =>
      !textLower.includes(element.toLowerCase()) &&
      !this.findSimilarConcepts(textLower, element.toLowerCase())
    );
  }

  /**
   * Check if text has examples
   */
  private hasExamples(text: string): boolean {
    const examplePhrases = [
      'for example', 'for instance', 'such as', 'like when', 'in my experience',
      'at my previous job', 'when i worked', 'i once', 'i remember'
    ];
    const textLower = text.toLowerCase();
    return examplePhrases.some(phrase => textLower.includes(phrase));
  }

  /**
   * Check if text has insights or reflective thinking
   */
  private hasInsights(text: string): boolean {
    const insightPhrases = [
      'i learned', 'i realized', 'the key insight', 'what i discovered',
      'the important thing', 'i would do differently', 'looking back',
      'the challenge was', 'the solution was', 'i believe'
    ];
    const textLower = text.toLowerCase();
    return insightPhrases.some(phrase => textLower.includes(phrase));
  }

  /**
   * Check if text has additional value beyond basic requirements
   */
  private hasAdditionalValue(text: string): boolean {
    const valuePhrases = [
      'innovative', 'creative', 'unique approach', 'different perspective',
      'lessons learned', 'best practices', 'optimization', 'improvement'
    ];
    const textLower = text.toLowerCase();
    return valuePhrases.some(phrase => textLower.includes(phrase));
  }

  /**
   * Estimate confidence level from text
   */
  private estimateConfidence(text: string): number {
    const confidenceIndicators = [
      'i am confident', 'i believe', 'i know', 'definitely', 'certainly',
      'absolutely', 'clearly', 'obviously'
    ];

    const uncertaintyIndicators = [
      'i think', 'maybe', 'perhaps', 'possibly', 'i guess', 'i suppose',
      'not sure', 'uncertain', 'might be', 'could be'
    ];

    const textLower = text.toLowerCase();
    const confidenceCount = confidenceIndicators.filter(phrase => textLower.includes(phrase)).length;
    const uncertaintyCount = uncertaintyIndicators.filter(phrase => textLower.includes(phrase)).length;

    let score = 70; // Base confidence
    score += confidenceCount * 10;
    score -= uncertaintyCount * 8;

    return Math.min(100, Math.max(20, score));
  }

  /**
   * Calculate reading pace (words per minute equivalent)
   */
  private calculateReadingPace(text: string, responseTimeSeconds: number): number {
    const wordCount = this.getWordCount(text);
    const minutes = responseTimeSeconds / 60;
    
    if (minutes === 0) return 0;
    
    // This represents thinking/typing pace
    return Math.round(wordCount / minutes);
  }

  /**
   * Generate simple feedback based on analysis
   */
  private generateSimpleFeedback(
    text: string,
    question: Question,
    wordCount: number,
    keywordScore: number,
    structureScore: number,
    completenessScore: number
  ): { strengths: string[], improvementSuggestions: string[] } {
    const strengths: string[] = [];
    const improvementSuggestions: string[] = [];

    // Analyze strengths
    if (wordCount >= 50) strengths.push('Good response length');
    if (keywordScore >= 70) strengths.push('Addresses the question well');
    if (structureScore >= 70) strengths.push('Well-structured response');
    if (completenessScore >= 70) strengths.push('Covers key points effectively');
    if (this.hasExamples(text)) strengths.push('Includes relevant examples');
    if (this.hasInsights(text)) strengths.push('Shows reflective thinking');

    // Generate improvement suggestions
    if (wordCount < 30) {
      improvementSuggestions.push('Try to provide more detail in your response');
    }
    if (keywordScore < 60) {
      improvementSuggestions.push('Make sure to directly address the question being asked');
    }
    if (structureScore < 60) {
      improvementSuggestions.push('Organize your response with clear structure (beginning, middle, end)');
    }
    if (completenessScore < 60) {
      improvementSuggestions.push('Consider covering more of the key elements mentioned in the question');
    }
    if (!this.hasExamples(text) && question.type === 'behavioral') {
      improvementSuggestions.push('Include specific examples from your experience');
    }
    if (wordCount > 200) {
      improvementSuggestions.push('Try to be more concise while maintaining key points');
    }

    return { strengths, improvementSuggestions };
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'this', 'that', 'these', 'those', 'what', 'when', 'where', 'why', 'how'
    ]);
    return stopWords.has(word.toLowerCase());
  }

  /**
   * Simple similarity check for concepts
   */
  private findSimilarConcepts(text: string, concept: string): boolean {
    const conceptWords = concept.split(/\s+/);
    return conceptWords.some(word => 
      word.length > 3 && text.includes(word)
    );
  }

  /**
   * Create empty analysis for no response
   */
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
export const simpleResponseAnalyzer = new SimpleResponseAnalyzer();