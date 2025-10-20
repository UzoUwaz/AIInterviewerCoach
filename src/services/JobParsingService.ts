import { JobDescriptionParser } from './JobDescriptionParser';
import { JobDescriptionCache } from './JobDescriptionCache';
import { JobDescriptionData, JobParsingOptions } from '../types/parsing';

export class JobParsingService {
  private parser: JobDescriptionParser;
  private cache: JobDescriptionCache;

  constructor() {
    this.parser = new JobDescriptionParser();
    this.cache = new JobDescriptionCache();
  }

  /**
   * Parse a job description with caching support
   */
  async parseJobDescription(
    rawText: string, 
    options: JobParsingOptions = {}
  ): Promise<JobDescriptionData> {
    // Check cache first
    const cached = await this.cache.getJobDescription(rawText);
    if (cached) {
      return cached;
    }

    // Parse the job description
    const parsed = await this.parser.parseJobDescription(rawText, options);
    
    // Cache the result
    await this.cache.saveJobDescription(parsed);
    
    return parsed;
  }

  /**
   * Get all cached job descriptions
   */
  async getCachedJobs(): Promise<JobDescriptionData[]> {
    return this.cache.getAllCachedJobs();
  }

  /**
   * Clear all cached job descriptions
   */
  async clearCache(): Promise<void> {
    await this.cache.clearCache();
    this.parser.clearCache();
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    localStorage: any;
    memoryCache: any;
  }> {
    const localStorageStats = await this.cache.getCacheStats();
    const memoryCacheStats = this.parser.getCacheStats();
    
    return {
      localStorage: localStorageStats,
      memoryCache: memoryCacheStats
    };
  }

  /**
   * Batch parse multiple job descriptions
   */
  async parseMultipleJobs(
    jobTexts: string[], 
    options: JobParsingOptions = {}
  ): Promise<JobDescriptionData[]> {
    const results: JobDescriptionData[] = [];
    
    for (const text of jobTexts) {
      try {
        const parsed = await this.parseJobDescription(text, options);
        results.push(parsed);
      } catch (error) {
        console.warn('Failed to parse job description:', error);
        // Continue with other jobs even if one fails
      }
    }
    
    return results;
  }

  /**
   * Extract skills from job description text
   */
  async extractSkills(rawText: string): Promise<string[]> {
    const parsed = await this.parseJobDescription(rawText, { 
      skillConfidenceThreshold: 0.6 
    });
    return parsed.skills;
  }

  /**
   * Extract keywords from job description text
   */
  async extractKeywords(rawText: string, topN: number = 20): Promise<string[]> {
    const parsed = await this.parseJobDescription(rawText, { 
      minKeywordFrequency: 1 
    });
    return parsed.keywords.slice(0, topN);
  }

  /**
   * Compare two job descriptions and find similarities
   */
  async compareJobs(jobText1: string, jobText2: string): Promise<{
    commonSkills: string[];
    commonKeywords: string[];
    similarityScore: number;
  }> {
    const [job1, job2] = await Promise.all([
      this.parseJobDescription(jobText1),
      this.parseJobDescription(jobText2)
    ]);

    const commonSkills = job1.skills.filter(skill => 
      job2.skills.includes(skill)
    );

    const commonKeywords = job1.keywords.filter(keyword => 
      job2.keywords.includes(keyword)
    );

    // Calculate similarity score based on common elements
    const totalUniqueSkills = new Set([...job1.skills, ...job2.skills]).size;
    const totalUniqueKeywords = new Set([...job1.keywords, ...job2.keywords]).size;
    
    const skillSimilarity = totalUniqueSkills > 0 ? commonSkills.length / totalUniqueSkills : 0;
    const keywordSimilarity = totalUniqueKeywords > 0 ? commonKeywords.length / totalUniqueKeywords : 0;
    
    const similarityScore = (skillSimilarity + keywordSimilarity) / 2;

    return {
      commonSkills,
      commonKeywords,
      similarityScore
    };
  }

  /**
   * Suggest improvements for a job description
   */
  async suggestImprovements(rawText: string): Promise<{
    missingSkills: string[];
    vagueSections: string[];
    suggestions: string[];
  }> {
    const parsed = await this.parseJobDescription(rawText);
    const suggestions: string[] = [];
    const missingSkills: string[] = [];
    const vagueSections: string[] = [];

    // Check for common missing elements
    if (!parsed.salaryRange) {
      suggestions.push('Consider adding salary range information to attract more candidates');
    }

    if (parsed.requirements.length < 3) {
      suggestions.push('Add more specific requirements to help candidates understand expectations');
      vagueSections.push('requirements');
    }

    if (parsed.responsibilities.length < 3) {
      suggestions.push('Provide more detailed job responsibilities');
      vagueSections.push('responsibilities');
    }

    if (parsed.skills.length < 5) {
      suggestions.push('List more specific technical and soft skills required');
      missingSkills.push('Consider adding: communication, problem-solving, teamwork');
    }

    // Check for industry-specific skills that might be missing
    if (parsed.industry === 'Technology' && !parsed.skills.some(s => s.includes('git'))) {
      missingSkills.push('git', 'version control');
    }

    return {
      missingSkills,
      vagueSections,
      suggestions
    };
  }
}