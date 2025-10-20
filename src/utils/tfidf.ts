import { removeStopwords } from 'stopword';

export interface TFIDFResult {
  term: string;
  tf: number;
  idf: number;
  tfidf: number;
}

export class TFIDFCalculator {
  private documents: string[] = [];
  private vocabulary: Set<string> = new Set();
  private documentFrequency: Map<string, number> = new Map();

  constructor(documents: string[] = []) {
    if (documents.length > 0) {
      this.addDocuments(documents);
    }
  }

  addDocuments(documents: string[]): void {
    this.documents.push(...documents);
    this.buildVocabulary();
    this.calculateDocumentFrequencies();
  }

  private buildVocabulary(): void {
    this.vocabulary.clear();
    
    for (const doc of this.documents) {
      const terms = this.tokenize(doc);
      terms.forEach(term => this.vocabulary.add(term));
    }
  }

  private calculateDocumentFrequencies(): void {
    this.documentFrequency.clear();
    
    for (const term of this.vocabulary) {
      let count = 0;
      for (const doc of this.documents) {
        const terms = this.tokenize(doc);
        if (terms.includes(term)) {
          count++;
        }
      }
      this.documentFrequency.set(term, count);
    }
  }

  private tokenize(text: string): string[] {
    // Convert to lowercase and split into words
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    // Remove stopwords
    return removeStopwords(words);
  }

  private calculateTF(term: string, document: string): number {
    const terms = this.tokenize(document);
    const termCount = terms.filter(t => t === term).length;
    return termCount / terms.length;
  }

  private calculateIDF(term: string): number {
    const df = this.documentFrequency.get(term) || 0;
    if (df === 0) return 0;
    return Math.log(this.documents.length / df);
  }

  calculateTFIDF(document: string, topN: number = 10): TFIDFResult[] {
    const terms = this.tokenize(document);
    const uniqueTerms = [...new Set(terms)];
    
    const results: TFIDFResult[] = uniqueTerms.map(term => {
      const tf = this.calculateTF(term, document);
      const idf = this.calculateIDF(term);
      const tfidf = tf * idf;
      
      return { term, tf, idf, tfidf };
    });

    // Sort by TF-IDF score and return top N
    return results
      .sort((a, b) => b.tfidf - a.tfidf)
      .slice(0, topN);
  }

  extractKeywords(document: string, minScore: number = 0.01): string[] {
    const results = this.calculateTFIDF(document, 50);
    return results
      .filter(result => result.tfidf >= minScore)
      .map(result => result.term);
  }
}

// Utility function for quick keyword extraction
export function extractKeywords(
  text: string, 
  referenceDocuments: string[] = [], 
  topN: number = 20
): TFIDFResult[] {
  const calculator = new TFIDFCalculator(referenceDocuments);
  return calculator.calculateTFIDF(text, topN);
}