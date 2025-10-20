export interface JobDescriptionData {
  id: string;
  rawText: string;
  title: string;
  company: string;
  location?: string;
  salaryRange?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  requirements: string[];
  skills: string[];
  responsibilities: string[];
  benefits?: string[];
  jobType: JobType;
  experienceLevel: ExperienceLevel;
  industry: string;
  keywords: string[];
  parsedAt: Date;
}

export interface ParsedSkill {
  name: string;
  category: SkillCategory;
  confidence: number;
  mentions: number;
}

export interface KeywordExtraction {
  keyword: string;
  frequency: number;
  tfidf: number;
  category: KeywordCategory;
}

export enum JobType {
  FULL_TIME = 'full-time',
  PART_TIME = 'part-time',
  CONTRACT = 'contract',
  FREELANCE = 'freelance',
  INTERNSHIP = 'internship',
  REMOTE = 'remote',
  HYBRID = 'hybrid',
  UNKNOWN = 'unknown'
}

export enum ExperienceLevel {
  ENTRY = 'entry',
  MID = 'mid',
  SENIOR = 'senior',
  LEAD = 'lead',
  EXECUTIVE = 'executive',
  UNKNOWN = 'unknown'
}

export enum SkillCategory {
  TECHNICAL = 'technical',
  SOFT = 'soft',
  DOMAIN = 'domain',
  TOOL = 'tool',
  LANGUAGE = 'language',
  FRAMEWORK = 'framework',
  DATABASE = 'database',
  CLOUD = 'cloud',
  OTHER = 'other'
}

export enum KeywordCategory {
  SKILL = 'skill',
  RESPONSIBILITY = 'responsibility',
  REQUIREMENT = 'requirement',
  BENEFIT = 'benefit',
  QUALIFICATION = 'qualification',
  COMPANY_INFO = 'company_info',
  OTHER = 'other'
}

export interface JobParsingOptions {
  extractSalary?: boolean;
  extractBenefits?: boolean;
  minKeywordFrequency?: number;
  skillConfidenceThreshold?: number;
}

export interface CachedJobDescription {
  hash: string;
  data: JobDescriptionData;
  cachedAt: Date;
  accessCount: number;
}