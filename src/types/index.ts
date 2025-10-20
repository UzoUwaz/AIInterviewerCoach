// Core Data Models for AI Interview Coach

export interface User {
  id: string;
  email: string;
  profile: UserProfile;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  name: string;
  resume?: ResumeData;
  targetRoles: string[];
  experienceLevel: 'entry' | 'mid' | 'senior' | 'executive';
  industries: string[];
}

export interface UserPreferences {
  feedbackStyle: 'gentle' | 'direct' | 'technical-focused' | 'behavioral-focused';
  questionCategories: QuestionCategory[];
  sessionDuration: number; // minutes
  reminderFrequency: 'daily' | 'weekly' | 'custom';
  voiceEnabled: boolean;
}

export interface ResumeData {
  workExperience: WorkExperience[];
  skills: string[];
  education: Education[];
  projects: Project[];
  achievements: string[];
}

export interface WorkExperience {
  company: string;
  position: string;
  startDate: Date;
  endDate?: Date;
  description: string;
  technologies: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  graduationDate: Date;
  gpa?: number;
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  url?: string;
  startDate: Date;
  endDate?: Date;
}

export interface Session {
  id: string;
  userId: string;
  jobDescriptionId?: string;
  config: SessionConfig;
  questions: Question[];
  responses: UserResponse[];
  analysis: SessionAnalysis;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'paused';
}

export interface SessionConfig {
  questionCategories: QuestionCategory[];
  difficulty: 'easy' | 'medium' | 'hard' | 'adaptive';
  duration: number; // minutes
  focusAreas: string[];
  voiceEnabled: boolean;
  feedbackStyle: 'gentle' | 'direct' | 'technical-focused' | 'behavioral-focused';
}

export interface Question {
  id: string;
  type: QuestionType | string; // Allow both enum and string for backward compatibility
  category: QuestionCategory | string; // Allow both enum and string for backward compatibility
  text: string;
  expectedElements: string[];
  difficulty: DifficultyLevel | number; // DifficultyLevel enum or 1-10 scale for backward compatibility
  timeLimit?: number; // seconds
  followUpTriggers: string[];
  industry?: string;
  roleLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  metadata?: {
    templateId?: string;
    parentQuestionId?: string;
    trigger?: string;
    generatedAt?: Date;
    context?: string;
  };
}

export enum QuestionType {
  BEHAVIORAL = 'behavioral',
  TECHNICAL = 'technical',
  SITUATIONAL = 'situational',
  SYSTEM_DESIGN = 'system-design',
  CASE_STUDY = 'case-study',
  ROLE_SPECIFIC = 'role-specific',
  FOLLOW_UP = 'follow-up'
}

export enum DifficultyLevel {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

export enum QuestionCategory {
  LEADERSHIP = 'leadership',
  PROBLEM_SOLVING = 'problem-solving',
  COMMUNICATION = 'communication',
  TEAMWORK = 'teamwork',
  TECHNICAL_SKILLS = 'technical-skills',
  DOMAIN_KNOWLEDGE = 'domain-knowledge',
  CULTURE_FIT = 'culture-fit',
  CAREER_GOALS = 'career-goals'
}

export interface UserResponse {
  id: string;
  questionId: string;
  sessionId: string;
  textContent: string;
  audioData?: ArrayBuffer;
  speechAnalysis?: SpeechAnalysis;
  timestamp: Date;
  responseTime: number; // seconds
  analysis?: ResponseAnalysis;
}

export interface ResponseAnalysis {
  clarity: ClarityScore;
  relevance: RelevanceScore;
  depth: DepthScore;
  communication: CommunicationScore;
  completeness: CompletenessScore;
  overallScore: number; // 0-100
  improvementSuggestions: string[];
  strengths: string[];
  weaknesses: string[];
}

export interface ClarityScore {
  score: number; // 0-100
  grammarIssues: string[];
  structureRating: number; // 0-10
  coherenceRating: number; // 0-10
}

export interface RelevanceScore {
  score: number; // 0-100
  keywordMatch: number; // 0-100
  topicAlignment: number; // 0-100
  answerCompleteness: number; // 0-100
}

export interface DepthScore {
  score: number; // 0-100
  technicalAccuracy: number; // 0-100
  exampleQuality: number; // 0-100
  insightLevel: number; // 0-100
}

export interface CommunicationScore {
  score: number; // 0-100
  confidence: number; // 0-100
  pace: number; // words per minute
  fillerWords: FillerWordCount[];
  clarity: number; // 0-100
}

export interface CompletenessScore {
  score: number; // 0-100
  expectedElementsCovered: number; // percentage
  missingElements: string[];
  additionalValue: number; // 0-100
}

export interface FillerWordCount {
  word: string;
  count: number;
}

export interface SpeechAnalysis {
  pace: number; // words per minute
  fillerWords: FillerWordCount[];
  clarity: number; // 0-100
  confidence: number; // 0-100
  volume: number; // 0-100
  pauses: PauseAnalysis[];
  transcription: string;
}

export interface PauseAnalysis {
  duration: number; // seconds
  timestamp: number; // seconds from start
  type: 'natural' | 'hesitation' | 'thinking';
}

export interface SessionAnalysis {
  sessionId: string;
  totalQuestions: number;
  answeredQuestions: number;
  totalTime: number; // seconds
  averageResponseTime: number; // milliseconds
  overallScore: number; // 0-1 scale
  responses: UserResponse[];
  strengths: string[];
  improvementAreas: string[];
  recommendations?: string[];
  completedAt: Date;
}

export interface DimensionScore {
  dimension: string;
  score: number; // 0-100
  trend: 'improving' | 'declining' | 'stable';
}

export interface PerformanceScore {
  sessionId: string;
  userId: string;
  overallScore: number; // 0-100
  dimensionScores: DimensionScore[];
  improvement: number; // vs previous sessions
  ranking: string; // percentile among similar users
  recommendations: string[];
  createdAt: Date;
}

export interface JobApplication {
  id: string;
  userId: string;
  company: string;
  position: string;
  jobDescription: string;
  salaryRange?: SalaryRange;
  applicationDate: Date;
  status: ApplicationStatus;
  interviewStages: InterviewStage[];
  notes?: string;
  source: string; // where the job was found
}

export interface SalaryRange {
  min: number;
  max: number;
  currency: string;
  period: 'hourly' | 'monthly' | 'yearly';
}

export type ApplicationStatus = 
  | 'applied'
  | 'screening'
  | 'interviewing'
  | 'offer'
  | 'rejected'
  | 'withdrawn';

export interface InterviewStage {
  id: string;
  type: 'phone' | 'video' | 'onsite' | 'technical' | 'final';
  scheduledDate?: Date;
  completedDate?: Date;
  feedback?: string;
  outcome?: 'passed' | 'failed' | 'pending';
  interviewers?: string[];
}

export interface ApplicationAnalytics {
  totalApplications: number;
  responseRate: number; // percentage
  interviewRate: number; // percentage
  offerRate: number; // percentage
  averageResponseTime: number; // days
  topIndustries: IndustryStats[];
  salaryTrends: SalaryTrend[];
  applicationsByMonth: MonthlyStats[];
}

export interface IndustryStats {
  industry: string;
  count: number;
  successRate: number; // percentage
}

export interface SalaryTrend {
  range: SalaryRange;
  count: number;
  successRate: number; // percentage
}

export interface MonthlyStats {
  month: string;
  applications: number;
  interviews: number;
  offers: number;
}

export interface CoachingInsight {
  type: 'pattern' | 'recommendation' | 'warning' | 'achievement';
  title: string;
  description: string;
  actionItems: string[];
  priority: 'low' | 'medium' | 'high';
  category: 'applications' | 'interviews' | 'skills' | 'market';
}

export interface ImprovementArea {
  area: string;
  currentScore: number;
  targetScore: number;
  suggestions: string[];
  practiceExercises: PracticeExercise[];
}

export interface PracticeExercise {
  id: string;
  title: string;
  description: string;
  type: 'mock-question' | 'skill-drill' | 'scenario-practice';
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number; // minutes
  focusAreas: string[];
}

// Storage and API related interfaces
export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

export interface DatabaseConfig {
  name: string;
  version: number;
  stores: StoreConfig[];
}

export interface StoreConfig {
  name: string;
  keyPath: string;
  indexes?: IndexConfig[];
}

export interface IndexConfig {
  name: string;
  keyPath: string;
  unique?: boolean;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Event types for real-time updates
export interface SessionEvent {
  type: 'question-generated' | 'response-analyzed' | 'feedback-ready' | 'session-completed';
  sessionId: string;
  data: any;
  timestamp: Date;
}

export interface NotificationEvent {
  type: 'reminder' | 'achievement' | 'insight' | 'system';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
  actionUrl?: string;
}