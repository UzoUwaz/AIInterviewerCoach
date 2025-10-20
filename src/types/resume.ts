export interface ResumeData {
  id: string;
  fileName?: string;
  rawText: string;
  personalInfo: PersonalInfo;
  workExperience: WorkExperience[];
  education: Education[];
  skills: ResumeSkill[];
  projects: Project[];
  certifications: Certification[];
  languages: Language[];
  summary?: string;
  parsedAt: Date;
}

export interface PersonalInfo {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedIn?: string;
  github?: string;
  website?: string;
}

export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  startDate?: Date;
  endDate?: Date;
  current: boolean;
  location?: string;
  description: string;
  achievements: string[];
  skills: string[];
  duration?: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field?: string;
  startDate?: Date;
  endDate?: Date;
  gpa?: number;
  location?: string;
  achievements: string[];
}

export interface ResumeSkill {
  name: string;
  category: SkillCategory;
  proficiency?: SkillProficiency;
  yearsOfExperience?: number;
  lastUsed?: Date;
  source: SkillSource;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  startDate?: Date;
  endDate?: Date;
  url?: string;
  achievements: string[];
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate?: Date;
  expiryDate?: Date;
  credentialId?: string;
  url?: string;
}

export interface Language {
  name: string;
  proficiency: LanguageProficiency;
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

export enum SkillProficiency {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

export enum SkillSource {
  WORK_EXPERIENCE = 'work_experience',
  EDUCATION = 'education',
  PROJECTS = 'projects',
  CERTIFICATIONS = 'certifications',
  EXPLICIT = 'explicit'
}

export enum LanguageProficiency {
  BASIC = 'basic',
  CONVERSATIONAL = 'conversational',
  FLUENT = 'fluent',
  NATIVE = 'native'
}

export interface ResumeParsingOptions {
  extractPersonalInfo?: boolean;
  extractSkills?: boolean;
  extractProjects?: boolean;
  extractCertifications?: boolean;
  skillConfidenceThreshold?: number;
  dateParsingEnabled?: boolean;
}

export interface GapAnalysis {
  missingSkills: string[];
  weakAreas: string[];
  strengths: string[];
  recommendations: string[];
  overallMatch: number;
  skillGaps: SkillGap[];
}

export interface SkillGap {
  requiredSkill: string;
  hasSkill: boolean;
  proficiencyGap?: number;
  importance: number;
  suggestions: string[];
}

export interface ResumeJobMatch {
  jobId: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  experienceMatch: number;
  educationMatch: number;
  overallFit: MatchLevel;
  recommendations: string[];
}

export enum MatchLevel {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor'
}