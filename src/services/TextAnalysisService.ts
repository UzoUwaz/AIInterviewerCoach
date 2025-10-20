import { 
  ResponseAnalysis, 
  ClarityScore, 
  RelevanceScore, 
  DepthScore, 
  CompletenessScore,
  Question,
  UserResponse
} from '../types';

/**
 * Browser-based text analysis service for interview responses
 * Implements NLP functions using sentiment analysis and readability libraries
 */
export class TextAnalysisService {
  private grammarRules: GrammarRule[];
  private readabilityMetrics: ReadabilityMetrics;
  private sentimentAnalyzer: SentimentAnalyzer;

  constructor() {
    this.grammarRules = this.initializeGrammarRules();
    this.readabilityMetrics = new ReadabilityMetrics();
    this.sentimentAnalyzer = new SentimentAnalyzer();
  }

  /**
   * Analyzes a text response against a question
   */
  async analyzeResponse(response: UserResponse, question: Question): Promise<ResponseAnalysis> {
    const text = response.textContent.trim();
    
    if (!text) {
      return this.createEmptyAnalysis();
    }

    // Parallel analysis for better performance
    const [clarity, relevance, depth, completeness] = await Promise.all([
      this.analyzeClarityScore(text),
      this.analyzeRelevanceScore(text, question),
      this.analyzeDepthScore(text, question),
      this.analyzeCompletenessScore(text, question)
    ]);

    const overallScore = this.calculateOverallScore(clarity, relevance, depth, completeness);
    const { strengths, weaknesses, improvementSuggestions } = this.generateFeedback(
      text, question, clarity, relevance, depth, completeness
    );

    return {
      clarity,
      relevance,
      depth,
      communication: {
        score: clarity.score,
        confidence: this.estimateConfidence(text),
        pace: this.calculateReadingPace(text, response.responseTime),
        fillerWords: [],
        clarity: clarity.score
      },
      completeness,
      overallScore,
      improvementSuggestions,
      strengths,
      weaknesses
    };
  }

  /**
   * Analyzes clarity using grammar checking and structure evaluation
   */
  private async analyzeClarityScore(text: string): Promise<ClarityScore> {
    const grammarIssues = this.checkGrammar(text);
    const structureRating = this.evaluateStructure(text);
    const coherenceRating = this.evaluateCoherence(text);
    
    // Calculate score based on grammar, structure, and coherence
    const grammarScore = Math.max(0, 100 - (grammarIssues.length * 10));
    const score = Math.round((grammarScore + structureRating * 10 + coherenceRating * 10) / 3);

    return {
      score: Math.min(100, Math.max(0, score)),
      grammarIssues,
      structureRating,
      coherenceRating
    };
  }

  /**
   * Analyzes relevance using keyword matching and topic alignment
   */
  private async analyzeRelevanceScore(text: string, question: Question): Promise<RelevanceScore> {
    const keywordMatch = this.calculateKeywordMatch(text, question.expectedElements);
    const topicAlignment = this.calculateTopicAlignment(text, question);
    const answerCompleteness = this.calculateAnswerCompleteness(text, question);

    const score = Math.round((keywordMatch + topicAlignment + answerCompleteness) / 3);

    return {
      score: Math.min(100, Math.max(0, score)),
      keywordMatch,
      topicAlignment,
      answerCompleteness
    };
  }

  /**
   * Analyzes depth using technical accuracy and insight evaluation
   */
  private async analyzeDepthScore(text: string, question: Question): Promise<DepthScore> {
    const technicalAccuracy = this.evaluateTechnicalAccuracy(text, question);
    const exampleQuality = this.evaluateExampleQuality(text);
    const insightLevel = this.evaluateInsightLevel(text, question);

    const score = Math.round((technicalAccuracy + exampleQuality + insightLevel) / 3);

    return {
      score: Math.min(100, Math.max(0, score)),
      technicalAccuracy,
      exampleQuality,
      insightLevel
    };
  }

  /**
   * Analyzes completeness against expected elements
   */
  private async analyzeCompletenessScore(text: string, question: Question): Promise<CompletenessScore> {
    const expectedElementsCovered = this.calculateExpectedElementsCoverage(text, question.expectedElements);
    const missingElements = this.findMissingElements(text, question.expectedElements);
    const additionalValue = this.evaluateAdditionalValue(text, question);

    const score = Math.round((expectedElementsCovered + additionalValue) / 2);

    return {
      score: Math.min(100, Math.max(0, score)),
      expectedElementsCovered,
      missingElements,
      additionalValue
    };
  }

  /**
   * Grammar checking using basic rules and patterns
   */
  private checkGrammar(text: string): string[] {
    const issues: string[] = [];
    const sentences = this.splitIntoSentences(text);

    for (const sentence of sentences) {
      // Check for common grammar issues
      for (const rule of this.grammarRules) {
        if (rule.pattern.test(sentence)) {
          issues.push(rule.message);
        }
      }
    }

    return [...new Set(issues)]; // Remove duplicates
  }

  /**
   * Evaluates text structure (introduction, body, conclusion)
   */
  private evaluateStructure(text: string): number {
    const sentences = this.splitIntoSentences(text);
    
    if (sentences.length === 0) return 0;
    if (sentences.length === 1) return 3;
    if (sentences.length === 2) return 5;
    
    // Look for structured response patterns
    const hasIntroduction = this.hasIntroductoryPhrase(sentences[0]);
    const hasConclusion = this.hasConclusivePhrase(sentences[sentences.length - 1]);
    const hasLogicalFlow = this.hasLogicalFlow(sentences);

    let score = 5; // Base score
    if (hasIntroduction) score += 2;
    if (hasConclusion) score += 2;
    if (hasLogicalFlow) score += 1;

    return Math.min(10, score);
  }

  /**
   * Evaluates coherence and logical flow
   */
  private evaluateCoherence(text: string): number {
    const sentences = this.splitIntoSentences(text);
    
    if (sentences.length <= 1) return sentences.length === 1 ? 8 : 0;

    let coherenceScore = 5; // Base score
    
    // Check for transition words and phrases
    const transitionCount = this.countTransitionWords(text);
    coherenceScore += Math.min(3, transitionCount);

    // Check for pronoun references
    const pronounReferences = this.countPronounReferences(sentences);
    coherenceScore += Math.min(2, pronounReferences);

    return Math.min(10, coherenceScore);
  }

  /**
   * Calculates keyword match percentage
   */
  private calculateKeywordMatch(text: string, expectedElements: string[]): number {
    if (expectedElements.length === 0) return 80; // Default score if no expected elements

    const textLower = text.toLowerCase();
    const matchedElements = expectedElements.filter(element => 
      textLower.includes(element.toLowerCase())
    );

    return Math.round((matchedElements.length / expectedElements.length) * 100);
  }

  /**
   * Calculates topic alignment based on question type and content
   */
  private calculateTopicAlignment(text: string, question: Question): number {
    const textLower = text.toLowerCase();
    const questionLower = question.text.toLowerCase();

    // Extract key terms from question
    const questionKeywords = this.extractKeywords(questionLower);
    const textKeywords = this.extractKeywords(textLower);

    // Calculate overlap
    const overlap = questionKeywords.filter(keyword => 
      textKeywords.includes(keyword)
    ).length;

    if (questionKeywords.length === 0) return 70; // Default score

    return Math.min(100, Math.round((overlap / questionKeywords.length) * 100) + 20);
  }

  /**
   * Calculates answer completeness
   */
  private calculateAnswerCompleteness(text: string, question: Question): number {
    const wordCount = text.split(/\s+/).length;
    
    // Scoring based on question type and expected length
    let expectedMinWords = 50;
    let expectedMaxWords = 200;

    switch (question.type) {
      case 'behavioral':
        expectedMinWords = 80;
        expectedMaxWords = 250;
        break;
      case 'technical':
        expectedMinWords = 60;
        expectedMaxWords = 200;
        break;
      case 'situational':
        expectedMinWords = 70;
        expectedMaxWords = 220;
        break;
      case 'system-design':
        expectedMinWords = 100;
        expectedMaxWords = 300;
        break;
    }

    if (wordCount < expectedMinWords * 0.5) return 20;
    if (wordCount < expectedMinWords) return 50;
    if (wordCount <= expectedMaxWords) return 90;
    if (wordCount <= expectedMaxWords * 1.5) return 75;
    return 60; // Too long
  }

  /**
   * Evaluates technical accuracy based on question type
   */
  private evaluateTechnicalAccuracy(text: string, question: Question): number {
    if (question.type !== 'technical' && question.type !== 'system-design') {
      return 80; // Default for non-technical questions
    }

    const textLower = text.toLowerCase();
    
    // Look for technical indicators
    const technicalTerms = this.countTechnicalTerms(textLower);
    const specificExamples = this.countSpecificExamples(textLower);
    const methodologyMentions = this.countMethodologyMentions(textLower);

    let score = 50; // Base score
    score += Math.min(20, technicalTerms * 5);
    score += Math.min(15, specificExamples * 7);
    score += Math.min(15, methodologyMentions * 8);

    return Math.min(100, score);
  }

  /**
   * Evaluates quality of examples provided
   */
  private evaluateExampleQuality(text: string): number {
    const textLower = text.toLowerCase();
    
    // Look for example indicators
    const examplePhrases = [
      'for example', 'for instance', 'such as', 'like when', 'in my experience',
      'at my previous job', 'when i worked', 'i once', 'i remember'
    ];

    const hasExamples = examplePhrases.some(phrase => textLower.includes(phrase));
    const hasSpecificDetails = this.hasSpecificDetails(textLower);
    const hasQuantifiableResults = this.hasQuantifiableResults(textLower);

    let score = 40; // Base score
    if (hasExamples) score += 25;
    if (hasSpecificDetails) score += 20;
    if (hasQuantifiableResults) score += 15;

    return Math.min(100, score);
  }

  /**
   * Evaluates insight level and depth of thinking
   */
  private evaluateInsightLevel(text: string, question: Question): number {
    const textLower = text.toLowerCase();
    
    // Look for insight indicators
    const insightPhrases = [
      'i learned', 'i realized', 'the key insight', 'what i discovered',
      'the important thing', 'i would do differently', 'looking back',
      'the challenge was', 'the solution was', 'i believe', 'in my opinion'
    ];

    const hasInsights = insightPhrases.some(phrase => textLower.includes(phrase));
    const hasReflection = this.hasReflectiveThinking(textLower);
    const hasLessonsLearned = this.hasLessonsLearned(textLower);

    let score = 50; // Base score
    if (hasInsights) score += 20;
    if (hasReflection) score += 15;
    if (hasLessonsLearned) score += 15;

    return Math.min(100, score);
  }

  /**
   * Calculates expected elements coverage
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
   * Finds missing elements from expected elements
   */
  private findMissingElements(text: string, expectedElements: string[]): string[] {
    const textLower = text.toLowerCase();
    return expectedElements.filter(element =>
      !textLower.includes(element.toLowerCase()) &&
      !this.findSimilarConcepts(textLower, element.toLowerCase())
    );
  }

  /**
   * Evaluates additional value beyond expected elements
   */
  private evaluateAdditionalValue(text: string, question: Question): number {
    const textLower = text.toLowerCase();
    
    // Look for value-add indicators
    const hasPersonalExperience = this.hasPersonalExperience(textLower);
    const hasInnovativeThinking = this.hasInnovativeThinking(textLower);
    const hasMultiplePerspectives = this.hasMultiplePerspectives(textLower);
    const hasActionableInsights = this.hasActionableInsights(textLower);

    let score = 60; // Base score
    if (hasPersonalExperience) score += 10;
    if (hasInnovativeThinking) score += 10;
    if (hasMultiplePerspectives) score += 10;
    if (hasActionableInsights) score += 10;

    return Math.min(100, score);
  }

  // Helper methods for text analysis

  private splitIntoSentences(text: string): string[] {
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  }

  private hasIntroductoryPhrase(sentence: string): boolean {
    const introPhrases = [
      'first', 'to start', 'initially', 'in my experience', 'let me explain',
      'i would say', 'from my perspective', 'in this situation'
    ];
    const sentenceLower = sentence.toLowerCase();
    return introPhrases.some(phrase => sentenceLower.includes(phrase));
  }

  private hasConclusivePhrase(sentence: string): boolean {
    const conclusionPhrases = [
      'in conclusion', 'to summarize', 'overall', 'in the end', 'ultimately',
      'so in summary', 'that\'s why', 'therefore', 'as a result'
    ];
    const sentenceLower = sentence.toLowerCase();
    return conclusionPhrases.some(phrase => sentenceLower.includes(phrase));
  }

  private hasLogicalFlow(sentences: string[]): boolean {
    const transitionWords = [
      'however', 'therefore', 'furthermore', 'additionally', 'moreover',
      'consequently', 'meanwhile', 'subsequently', 'nevertheless'
    ];
    
    const text = sentences.join(' ').toLowerCase();
    return transitionWords.some(word => text.includes(word));
  }

  private countTransitionWords(text: string): number {
    const transitions = [
      'however', 'therefore', 'furthermore', 'additionally', 'moreover',
      'consequently', 'meanwhile', 'subsequently', 'nevertheless', 'also',
      'then', 'next', 'finally', 'first', 'second', 'third'
    ];
    
    const textLower = text.toLowerCase();
    return transitions.filter(word => textLower.includes(word)).length;
  }

  private countPronounReferences(sentences: string[]): number {
    let count = 0;
    for (let i = 1; i < sentences.length; i++) {
      const sentence = sentences[i].toLowerCase();
      if (/\b(this|that|these|those|it|they|them)\b/.test(sentence)) {
        count++;
      }
    }
    return count;
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - remove stop words and get significant terms
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Top 10 keywords
  }

  private countTechnicalTerms(text: string): number {
    const technicalPatterns = [
      /\b(algorithm|database|api|framework|library|architecture)\b/g,
      /\b(performance|scalability|optimization|efficiency)\b/g,
      /\b(security|authentication|authorization|encryption)\b/g,
      /\b(testing|debugging|deployment|monitoring)\b/g
    ];

    return technicalPatterns.reduce((count, pattern) => {
      const matches = text.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  private countSpecificExamples(text: string): number {
    const examplePatterns = [
      /\b(for example|for instance|such as|like when)\b/g,
      /\b(in my experience|at my previous job|when i worked)\b/g,
      /\b(i once|i remember|i implemented|i developed)\b/g
    ];

    return examplePatterns.reduce((count, pattern) => {
      const matches = text.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  private countMethodologyMentions(text: string): number {
    const methodologies = [
      'agile', 'scrum', 'kanban', 'waterfall', 'devops', 'ci/cd',
      'tdd', 'bdd', 'solid', 'dry', 'mvc', 'mvp', 'rest', 'graphql'
    ];

    return methodologies.filter(method => 
      text.includes(method.toLowerCase())
    ).length;
  }

  private hasSpecificDetails(text: string): boolean {
    // Look for numbers, percentages, timeframes, specific technologies
    return /\b(\d+%|\d+\s*(days?|weeks?|months?|years?)|version\s*\d+|\d+\s*users?)\b/i.test(text);
  }

  private hasQuantifiableResults(text: string): boolean {
    const resultPatterns = [
      /\b(increased|decreased|improved|reduced)\s+by\s+\d+/i,
      /\b\d+%\s+(increase|decrease|improvement|reduction)/i,
      /\b(saved|earned|generated)\s+\$?\d+/i
    ];

    return resultPatterns.some(pattern => pattern.test(text));
  }

  private hasReflectiveThinking(text: string): boolean {
    const reflectionPhrases = [
      'i learned', 'i realized', 'looking back', 'in retrospect',
      'i would do differently', 'if i had to do it again', 'the lesson was'
    ];

    return reflectionPhrases.some(phrase => text.includes(phrase));
  }

  private hasLessonsLearned(text: string): boolean {
    const lessonPhrases = [
      'lesson learned', 'key takeaway', 'what i discovered', 'i found that',
      'it taught me', 'i now understand', 'i came to realize'
    ];

    return lessonPhrases.some(phrase => text.includes(phrase));
  }

  private hasPersonalExperience(text: string): boolean {
    const experiencePhrases = [
      'in my experience', 'i have worked', 'i have seen', 'i have found',
      'from my background', 'in my role', 'when i was'
    ];

    return experiencePhrases.some(phrase => text.includes(phrase));
  }

  private hasInnovativeThinking(text: string): boolean {
    const innovationPhrases = [
      'innovative approach', 'creative solution', 'new way', 'different approach',
      'unique perspective', 'novel idea', 'thinking outside'
    ];

    return innovationPhrases.some(phrase => text.includes(phrase));
  }

  private hasMultiplePerspectives(text: string): boolean {
    const perspectivePhrases = [
      'on the other hand', 'alternatively', 'another approach', 'different perspective',
      'from another angle', 'considering both', 'pros and cons'
    ];

    return perspectivePhrases.some(phrase => text.includes(phrase));
  }

  private hasActionableInsights(text: string): boolean {
    const actionPhrases = [
      'i would recommend', 'the solution is', 'we should', 'i suggest',
      'the best approach', 'i would implement', 'the strategy would be'
    ];

    return actionPhrases.some(phrase => text.includes(phrase));
  }

  private findSimilarConcepts(text: string, concept: string): boolean {
    // Simple similarity check - could be enhanced with more sophisticated NLP
    const conceptWords = concept.split(/\s+/);
    return conceptWords.some(word => text.includes(word));
  }

  private estimateConfidence(text: string): number {
    const confidenceIndicators = [
      'i am confident', 'i believe', 'i know', 'definitely', 'certainly',
      'absolutely', 'clearly', 'obviously', 'without doubt'
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

  private calculateReadingPace(text: string, responseTimeSeconds: number): number {
    const wordCount = text.split(/\s+/).length;
    const minutes = responseTimeSeconds / 60;
    
    if (minutes === 0) return 0;
    
    // This is thinking/typing pace, not speaking pace
    return Math.round(wordCount / minutes);
  }

  private calculateOverallScore(
    clarity: ClarityScore,
    relevance: RelevanceScore,
    depth: DepthScore,
    completeness: CompletenessScore
  ): number {
    // Weighted average - relevance and completeness are most important
    const weights = {
      clarity: 0.2,
      relevance: 0.3,
      depth: 0.25,
      completeness: 0.25
    };

    return Math.round(
      clarity.score * weights.clarity +
      relevance.score * weights.relevance +
      depth.score * weights.depth +
      completeness.score * weights.completeness
    );
  }

  private generateFeedback(
    text: string,
    question: Question,
    clarity: ClarityScore,
    relevance: RelevanceScore,
    depth: DepthScore,
    completeness: CompletenessScore
  ): { strengths: string[], weaknesses: string[], improvementSuggestions: string[] } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const improvementSuggestions: string[] = [];

    // Analyze strengths
    if (clarity.score >= 80) strengths.push('Clear and well-structured response');
    if (relevance.score >= 80) strengths.push('Highly relevant to the question asked');
    if (depth.score >= 80) strengths.push('Demonstrates deep understanding');
    if (completeness.score >= 80) strengths.push('Comprehensive coverage of key points');

    // Analyze weaknesses and suggestions
    if (clarity.score < 60) {
      weaknesses.push('Response could be clearer and better structured');
      improvementSuggestions.push('Try organizing your response with a clear beginning, middle, and end');
    }

    if (relevance.score < 60) {
      weaknesses.push('Response doesn\'t fully address the question');
      improvementSuggestions.push('Make sure to directly answer what\'s being asked before adding additional context');
    }

    if (depth.score < 60) {
      weaknesses.push('Could provide more detailed examples and insights');
      improvementSuggestions.push('Include specific examples from your experience to demonstrate your points');
    }

    if (completeness.score < 60) {
      weaknesses.push('Missing some key elements expected in the response');
      improvementSuggestions.push('Consider the STAR method (Situation, Task, Action, Result) for behavioral questions');
    }

    if (clarity.grammarIssues.length > 0) {
      improvementSuggestions.push('Review your response for grammar and clarity before submitting');
    }

    return { strengths, weaknesses, improvementSuggestions };
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

  private initializeGrammarRules(): GrammarRule[] {
    return [
      {
        pattern: /\b(there|their|they're)\b/gi,
        message: 'Check usage of there/their/they\'re'
      },
      {
        pattern: /\b(your|you're)\b/gi,
        message: 'Check usage of your/you\'re'
      },
      {
        pattern: /\b(its|it's)\b/gi,
        message: 'Check usage of its/it\'s'
      },
      {
        pattern: /\s{2,}/g,
        message: 'Multiple spaces detected'
      },
      {
        pattern: /[.!?]{2,}/g,
        message: 'Multiple punctuation marks'
      },
      {
        pattern: /\b(alot|alright)\b/gi,
        message: 'Consider using "a lot" or "all right"'
      }
    ];
  }
}

// Supporting interfaces and classes

interface GrammarRule {
  pattern: RegExp;
  message: string;
}

class ReadabilityMetrics {
  calculateFleschScore(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const words = text.split(/\s+/).length;
    const syllables = this.countSyllables(text);

    if (sentences === 0 || words === 0) return 0;

    const avgSentenceLength = words / sentences;
    const avgSyllablesPerWord = syllables / words;

    return 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
  }

  private countSyllables(text: string): number {
    return text.toLowerCase()
      .replace(/[^a-z]/g, '')
      .replace(/[aeiouy]+/g, 'a')
      .replace(/a$/, '')
      .length || 1;
  }
}

class SentimentAnalyzer {
  analyzeSentiment(text: string): { score: number; label: string } {
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
      'successful', 'effective', 'efficient', 'innovative', 'creative',
      'accomplished', 'achieved', 'improved', 'enhanced', 'optimized'
    ];

    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'failed', 'unsuccessful',
      'ineffective', 'inefficient', 'problematic', 'difficult', 'challenging',
      'struggled', 'issues', 'problems', 'mistakes', 'errors'
    ];

    const textLower = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => textLower.includes(word)).length;
    const negativeCount = negativeWords.filter(word => textLower.includes(word)).length;

    const score = (positiveCount - negativeCount) / Math.max(1, positiveCount + negativeCount);
    
    let label = 'neutral';
    if (score > 0.2) label = 'positive';
    else if (score < -0.2) label = 'negative';

    return { score: Math.round((score + 1) * 50), label };
  }
}