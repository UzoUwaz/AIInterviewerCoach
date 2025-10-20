import nlp from 'compromise';
import { 
  JobDescriptionData, 
  ParsedSkill, 
  KeywordExtraction, 
  JobType, 
  ExperienceLevel, 
  SkillCategory,
  KeywordCategory,
  JobParsingOptions,
  CachedJobDescription
} from '../types/parsing';
import { 
  TECHNICAL_SKILLS, 
  SOFT_SKILLS, 
  JOB_TYPE_KEYWORDS, 
  EXPERIENCE_LEVEL_KEYWORDS,
  SECTION_KEYWORDS 
} from '../data/skillDictionaries';
import { TFIDFCalculator, extractKeywords } from '../utils/tfidf';

export class JobDescriptionParser {
  private tfidfCalculator: TFIDFCalculator;
  private cache: Map<string, CachedJobDescription> = new Map();
  private readonly CACHE_EXPIRY_HOURS = 24;

  constructor() {
    // Initialize with some sample job descriptions for better TF-IDF calculation
    const sampleDocs = [
      "Software engineer position requiring JavaScript React Node.js experience",
      "Data scientist role with Python machine learning SQL analytics",
      "Product manager position requiring leadership communication strategy",
      "DevOps engineer with AWS Docker Kubernetes cloud experience"
    ];
    this.tfidfCalculator = new TFIDFCalculator(sampleDocs);
  }

  async parseJobDescription(
    rawText: string, 
    options: JobParsingOptions = {}
  ): Promise<JobDescriptionData> {
    const hash = this.generateHash(rawText);
    
    // Check cache first
    const cached = this.getCachedResult(hash);
    if (cached) {
      cached.accessCount++;
      return cached.data;
    }

    const doc = nlp(rawText);
    
    const result: JobDescriptionData = {
      id: hash,
      rawText,
      title: this.extractTitle(doc, rawText),
      company: this.extractCompany(doc, rawText),
      location: this.extractLocation(doc, rawText),
      salaryRange: options.extractSalary ? this.extractSalaryRange(rawText) : undefined,
      requirements: this.extractRequirements(rawText),
      skills: this.extractSkills(rawText, options.skillConfidenceThreshold || 0.7),
      responsibilities: this.extractResponsibilities(rawText),
      benefits: options.extractBenefits ? this.extractBenefits(rawText) : undefined,
      jobType: this.classifyJobType(rawText),
      experienceLevel: this.classifyExperienceLevel(rawText),
      industry: this.classifyIndustry(rawText),
      keywords: this.extractKeywordsWithTFIDF(rawText, options.minKeywordFrequency || 2),
      parsedAt: new Date()
    };

    // Cache the result
    this.cacheResult(hash, result);
    
    return result;
  }

  private generateHash(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private getCachedResult(hash: string): CachedJobDescription | null {
    const cached = this.cache.get(hash);
    if (!cached) return null;

    const hoursSinceCached = (Date.now() - cached.cachedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCached > this.CACHE_EXPIRY_HOURS) {
      this.cache.delete(hash);
      return null;
    }

    return cached;
  }

  private cacheResult(hash: string, data: JobDescriptionData): void {
    this.cache.set(hash, {
      hash,
      data,
      cachedAt: new Date(),
      accessCount: 1
    });

    // Limit cache size
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  private extractTitle(doc: any, rawText: string): string {
    // Look for common title patterns
    const titlePatterns = [
      /(?:position|role|job)\s*:?\s*([^\n\r]+)/i,
      /^([^\n\r]+?)(?:\s*-\s*|\s*at\s*)/i,
      /job\s*title\s*:?\s*([^\n\r]+)/i
    ];

    for (const pattern of titlePatterns) {
      const match = rawText.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Fallback: use NLP to find job-related nouns
    const jobTitles = doc.match('#JobTitle').text();
    if (jobTitles) return jobTitles;

    // Extract first meaningful line
    const lines = rawText.split('\n').filter(line => line.trim().length > 5);
    return lines[0]?.trim() || 'Unknown Position';
  }

  private extractCompany(doc: any, rawText: string): string {
    const companyPatterns = [
      /(?:company|organization|employer)\s*:?\s*([^\n\r]+)/i,
      /at\s+([A-Z][a-zA-Z\s&.,]+?)(?:\s*-|\s*\n)/,
      /([A-Z][a-zA-Z\s&.,]+?)\s+is\s+(?:looking|seeking|hiring)/i
    ];

    for (const pattern of companyPatterns) {
      const match = rawText.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    const organizations = doc.organizations().text();
    if (organizations) return organizations;

    return 'Unknown Company';
  }

  private extractLocation(doc: any, rawText: string): string | undefined {
    const locationPatterns = [
      /(?:location|based in|office in)\s*:?\s*([^\n\r]+)/i,
      /([A-Z][a-z]+,\s*[A-Z]{2})/,
      /([A-Z][a-z]+\s*,\s*[A-Z][a-z]+)/
    ];

    for (const pattern of locationPatterns) {
      const match = rawText.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    const places = doc.places().text();
    return places || undefined;
  }

  private extractSalaryRange(rawText: string): { min?: number; max?: number; currency?: string } | undefined {
    const salaryPatterns = [
      /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*-\s*\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,
      /(\d{1,3}(?:,\d{3})*)\s*-\s*(\d{1,3}(?:,\d{3})*)\s*(?:USD|dollars?)/i,
      /salary\s*:?\s*\$?(\d{1,3}(?:,\d{3})*)/i
    ];

    for (const pattern of salaryPatterns) {
      const match = rawText.match(pattern);
      if (match) {
        const min = parseInt(match[1].replace(/,/g, ''));
        const max = match[2] ? parseInt(match[2].replace(/,/g, '')) : undefined;
        return { min, max, currency: 'USD' };
      }
    }

    return undefined;
  }

  private extractRequirements(rawText: string): string[] {
    const sections = this.extractSections(rawText);
    const requirementSection = sections.requirements || '';
    
    return this.extractBulletPoints(requirementSection)
      .filter(req => req.length > 10)
      .slice(0, 10);
  }

  private extractResponsibilities(rawText: string): string[] {
    const sections = this.extractSections(rawText);
    const responsibilitySection = sections.responsibilities || '';
    
    return this.extractBulletPoints(responsibilitySection)
      .filter(resp => resp.length > 10)
      .slice(0, 10);
  }

  private extractBenefits(rawText: string): string[] {
    const sections = this.extractSections(rawText);
    const benefitSection = sections.benefits || '';
    
    return this.extractBulletPoints(benefitSection)
      .filter(benefit => benefit.length > 5)
      .slice(0, 8);
  }

  private extractSections(rawText: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const lines = rawText.split('\n');
    let currentSection = 'general';
    let currentContent: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim().toLowerCase();
      
      // Check if this line is a section header
      let foundSection = false;
      for (const [sectionName, keywords] of Object.entries(SECTION_KEYWORDS)) {
        if (keywords.some(keyword => trimmedLine.includes(keyword))) {
          // Save previous section
          if (currentContent.length > 0) {
            sections[currentSection] = currentContent.join('\n');
          }
          
          currentSection = sectionName;
          currentContent = [];
          foundSection = true;
          break;
        }
      }

      if (!foundSection) {
        currentContent.push(line);
      }
    }

    // Save the last section
    if (currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n');
    }

    return sections;
  }

  private extractBulletPoints(text: string): string[] {
    const bulletPatterns = [
      /^[\s]*[•\-\*]\s*(.+)$/gm,
      /^[\s]*\d+[\.\)]\s*(.+)$/gm,
      /^[\s]*[a-zA-Z][\.\)]\s*(.+)$/gm
    ];

    const points: string[] = [];
    
    for (const pattern of bulletPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].trim().length > 5) {
          points.push(match[1].trim());
        }
      }
    }

    return [...new Set(points)]; // Remove duplicates
  }

  private extractSkills(rawText: string, confidenceThreshold: number): string[] {
    const allSkills = { ...TECHNICAL_SKILLS, ...SOFT_SKILLS };
    const foundSkills: ParsedSkill[] = [];
    const lowerText = rawText.toLowerCase();

    for (const [skillName, skillData] of Object.entries(allSkills)) {
      let mentions = 0;
      
      // Check main skill name
      if (lowerText.includes(skillName.toLowerCase())) {
        mentions++;
      }

      // Check aliases
      for (const alias of skillData.aliases) {
        if (lowerText.includes(alias.toLowerCase())) {
          mentions++;
        }
      }

      if (mentions > 0) {
        const confidence = Math.min(mentions * skillData.weight * 0.3, 1.0);
        if (confidence >= confidenceThreshold) {
          foundSkills.push({
            name: skillName,
            category: skillData.category,
            confidence,
            mentions
          });
        }
      }
    }

    return foundSkills
      .sort((a, b) => b.confidence - a.confidence)
      .map(skill => skill.name)
      .slice(0, 20);
  }

  private classifyJobType(rawText: string): JobType {
    const lowerText = rawText.toLowerCase();
    
    for (const [jobType, keywords] of Object.entries(JOB_TYPE_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          return jobType as JobType;
        }
      }
    }

    return JobType.UNKNOWN;
  }

  private classifyExperienceLevel(rawText: string): ExperienceLevel {
    const lowerText = rawText.toLowerCase();
    
    for (const [level, keywords] of Object.entries(EXPERIENCE_LEVEL_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          return level as ExperienceLevel;
        }
      }
    }

    return ExperienceLevel.UNKNOWN;
  }

  private classifyIndustry(rawText: string): string {
    const industryKeywords = {
      'Technology': ['software', 'tech', 'engineering', 'developer', 'programmer', 'IT'],
      'Finance': ['finance', 'banking', 'investment', 'trading', 'fintech', 'accounting'],
      'Healthcare': ['healthcare', 'medical', 'hospital', 'pharmaceutical', 'biotech'],
      'Education': ['education', 'teaching', 'university', 'school', 'academic'],
      'Retail': ['retail', 'e-commerce', 'sales', 'customer service', 'merchandising'],
      'Manufacturing': ['manufacturing', 'production', 'factory', 'industrial', 'supply chain'],
      'Marketing': ['marketing', 'advertising', 'brand', 'digital marketing', 'content'],
      'Consulting': ['consulting', 'advisory', 'strategy', 'management consulting']
    };

    const lowerText = rawText.toLowerCase();
    
    for (const [industry, keywords] of Object.entries(industryKeywords)) {
      const matches = keywords.filter(keyword => lowerText.includes(keyword)).length;
      if (matches >= 2) {
        return industry;
      }
    }

    return 'Other';
  }

  private extractKeywordsWithTFIDF(rawText: string, minFrequency: number): string[] {
    const tfidfResults = extractKeywords(rawText, [], 30);
    
    return tfidfResults
      .filter(result => result.tfidf >= minFrequency * 0.01)
      .map(result => result.term)
      .slice(0, 25);
  }

  // Public method to clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Public method to get cache statistics
  getCacheStats(): { size: number; entries: Array<{ hash: string; accessCount: number; cachedAt: Date }> } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.values()).map(entry => ({
        hash: entry.hash,
        accessCount: entry.accessCount,
        cachedAt: entry.cachedAt
      }))
    };
  }
}