import { SkillCategory, JobType, ExperienceLevel } from '../types/parsing';

export interface SkillDictionary {
  [key: string]: {
    category: SkillCategory;
    aliases: string[];
    weight: number;
  };
}

export const TECHNICAL_SKILLS: SkillDictionary = {
  // Programming Languages
  'javascript': { category: SkillCategory.LANGUAGE, aliases: ['js', 'ecmascript'], weight: 1.0 },
  'typescript': { category: SkillCategory.LANGUAGE, aliases: ['ts'], weight: 1.0 },
  'python': { category: SkillCategory.LANGUAGE, aliases: ['py'], weight: 1.0 },
  'java': { category: SkillCategory.LANGUAGE, aliases: [], weight: 1.0 },
  'c++': { category: SkillCategory.LANGUAGE, aliases: ['cpp', 'c plus plus'], weight: 1.0 },
  'c#': { category: SkillCategory.LANGUAGE, aliases: ['csharp', 'c sharp'], weight: 1.0 },
  'go': { category: SkillCategory.LANGUAGE, aliases: ['golang'], weight: 1.0 },
  'rust': { category: SkillCategory.LANGUAGE, aliases: [], weight: 1.0 },
  'php': { category: SkillCategory.LANGUAGE, aliases: [], weight: 1.0 },
  'ruby': { category: SkillCategory.LANGUAGE, aliases: [], weight: 1.0 },
  'swift': { category: SkillCategory.LANGUAGE, aliases: [], weight: 1.0 },
  'kotlin': { category: SkillCategory.LANGUAGE, aliases: [], weight: 1.0 },
  'scala': { category: SkillCategory.LANGUAGE, aliases: [], weight: 1.0 },
  'r': { category: SkillCategory.LANGUAGE, aliases: [], weight: 1.0 },
  'matlab': { category: SkillCategory.LANGUAGE, aliases: [], weight: 1.0 },
  'sql': { category: SkillCategory.LANGUAGE, aliases: [], weight: 1.0 },

  // Frameworks & Libraries
  'react': { category: SkillCategory.FRAMEWORK, aliases: ['reactjs', 'react.js'], weight: 1.0 },
  'angular': { category: SkillCategory.FRAMEWORK, aliases: ['angularjs'], weight: 1.0 },
  'vue': { category: SkillCategory.FRAMEWORK, aliases: ['vuejs', 'vue.js'], weight: 1.0 },
  'node.js': { category: SkillCategory.FRAMEWORK, aliases: ['nodejs', 'node'], weight: 1.0 },
  'express': { category: SkillCategory.FRAMEWORK, aliases: ['expressjs', 'express.js'], weight: 1.0 },
  'django': { category: SkillCategory.FRAMEWORK, aliases: [], weight: 1.0 },
  'flask': { category: SkillCategory.FRAMEWORK, aliases: [], weight: 1.0 },
  'spring': { category: SkillCategory.FRAMEWORK, aliases: ['spring boot'], weight: 1.0 },
  'laravel': { category: SkillCategory.FRAMEWORK, aliases: [], weight: 1.0 },
  'rails': { category: SkillCategory.FRAMEWORK, aliases: ['ruby on rails'], weight: 1.0 },
  '.net': { category: SkillCategory.FRAMEWORK, aliases: ['dotnet', 'asp.net'], weight: 1.0 },

  // Databases
  'postgresql': { category: SkillCategory.DATABASE, aliases: ['postgres'], weight: 1.0 },
  'mysql': { category: SkillCategory.DATABASE, aliases: [], weight: 1.0 },
  'mongodb': { category: SkillCategory.DATABASE, aliases: ['mongo'], weight: 1.0 },
  'redis': { category: SkillCategory.DATABASE, aliases: [], weight: 1.0 },
  'elasticsearch': { category: SkillCategory.DATABASE, aliases: ['elastic search'], weight: 1.0 },
  'cassandra': { category: SkillCategory.DATABASE, aliases: [], weight: 1.0 },
  'dynamodb': { category: SkillCategory.DATABASE, aliases: ['dynamo db'], weight: 1.0 },
  'sqlite': { category: SkillCategory.DATABASE, aliases: [], weight: 1.0 },

  // Cloud & DevOps
  'aws': { category: SkillCategory.CLOUD, aliases: ['amazon web services'], weight: 1.0 },
  'azure': { category: SkillCategory.CLOUD, aliases: ['microsoft azure'], weight: 1.0 },
  'gcp': { category: SkillCategory.CLOUD, aliases: ['google cloud', 'google cloud platform'], weight: 1.0 },
  'docker': { category: SkillCategory.TOOL, aliases: [], weight: 1.0 },
  'kubernetes': { category: SkillCategory.TOOL, aliases: ['k8s'], weight: 1.0 },
  'jenkins': { category: SkillCategory.TOOL, aliases: [], weight: 1.0 },
  'terraform': { category: SkillCategory.TOOL, aliases: [], weight: 1.0 },
  'ansible': { category: SkillCategory.TOOL, aliases: [], weight: 1.0 },

  // Tools & Technologies
  'git': { category: SkillCategory.TOOL, aliases: [], weight: 1.0 },
  'github': { category: SkillCategory.TOOL, aliases: [], weight: 1.0 },
  'gitlab': { category: SkillCategory.TOOL, aliases: [], weight: 1.0 },
  'jira': { category: SkillCategory.TOOL, aliases: [], weight: 1.0 },
  'confluence': { category: SkillCategory.TOOL, aliases: [], weight: 1.0 },
  'slack': { category: SkillCategory.TOOL, aliases: [], weight: 1.0 },
  'figma': { category: SkillCategory.TOOL, aliases: [], weight: 1.0 },
  'sketch': { category: SkillCategory.TOOL, aliases: [], weight: 1.0 },
  'photoshop': { category: SkillCategory.TOOL, aliases: [], weight: 1.0 },
};

export const SOFT_SKILLS: SkillDictionary = {
  'leadership': { category: SkillCategory.SOFT, aliases: ['lead', 'leading'], weight: 1.0 },
  'communication': { category: SkillCategory.SOFT, aliases: ['communicate'], weight: 1.0 },
  'teamwork': { category: SkillCategory.SOFT, aliases: ['collaboration', 'team work'], weight: 1.0 },
  'problem solving': { category: SkillCategory.SOFT, aliases: ['problem-solving'], weight: 1.0 },
  'critical thinking': { category: SkillCategory.SOFT, aliases: ['analytical thinking'], weight: 1.0 },
  'creativity': { category: SkillCategory.SOFT, aliases: ['creative'], weight: 1.0 },
  'adaptability': { category: SkillCategory.SOFT, aliases: ['flexible', 'adaptable'], weight: 1.0 },
  'time management': { category: SkillCategory.SOFT, aliases: ['time-management'], weight: 1.0 },
  'project management': { category: SkillCategory.SOFT, aliases: ['project-management'], weight: 1.0 },
  'mentoring': { category: SkillCategory.SOFT, aliases: ['coaching', 'mentorship'], weight: 1.0 },
};

export const JOB_TYPE_KEYWORDS = {
  [JobType.FULL_TIME]: ['full-time', 'full time', 'permanent', 'salaried'],
  [JobType.PART_TIME]: ['part-time', 'part time', 'hourly'],
  [JobType.CONTRACT]: ['contract', 'contractor', 'consulting', 'freelance'],
  [JobType.INTERNSHIP]: ['intern', 'internship', 'co-op', 'trainee'],
  [JobType.REMOTE]: ['remote', 'work from home', 'distributed', 'telecommute'],
  [JobType.HYBRID]: ['hybrid', 'flexible location', 'remote-friendly'],
};

export const EXPERIENCE_LEVEL_KEYWORDS = {
  [ExperienceLevel.ENTRY]: ['entry level', 'junior', 'graduate', 'new grad', '0-2 years', 'associate'],
  [ExperienceLevel.MID]: ['mid level', 'intermediate', '2-5 years', '3-7 years', 'experienced'],
  [ExperienceLevel.SENIOR]: ['senior', 'sr.', '5+ years', '7+ years', 'expert', 'lead'],
  [ExperienceLevel.LEAD]: ['lead', 'principal', 'staff', 'architect', 'manager'],
  [ExperienceLevel.EXECUTIVE]: ['director', 'vp', 'vice president', 'cto', 'ceo', 'head of'],
};

export const SECTION_KEYWORDS = {
  requirements: ['requirements', 'qualifications', 'must have', 'required', 'essential'],
  responsibilities: ['responsibilities', 'duties', 'role', 'you will', 'tasks'],
  benefits: ['benefits', 'perks', 'we offer', 'compensation', 'package'],
  skills: ['skills', 'technologies', 'experience with', 'proficiency'],
};