import { QuestionType, QuestionCategory, DifficultyLevel } from '../types/index';

export interface QuestionTemplate {
  id: string;
  template: string;
  type: QuestionType;
  category: QuestionCategory;
  difficulty: DifficultyLevel;
  keywords: string[];
  expectedElements: string[];
  followUpTriggers: string[];
  timeLimit?: number;
  industry?: string[];
  experienceLevel?: string[];
}

export const BEHAVIORAL_QUESTIONS: QuestionTemplate[] = [
  {
    id: 'beh_001',
    template: 'Tell me about a time when you had to work with a difficult team member. How did you handle the situation?',
    type: QuestionType.BEHAVIORAL,
    category: QuestionCategory.TEAMWORK,
    difficulty: DifficultyLevel.MEDIUM,
    keywords: ['teamwork', 'conflict resolution', 'communication'],
    expectedElements: ['Situation', 'Task', 'Action', 'Result'],
    followUpTriggers: ['conflict', 'disagreement', 'challenge'],
    timeLimit: 180
  },
  {
    id: 'beh_002',
    template: 'Describe a situation where you had to meet a tight deadline. What steps did you take?',
    type: QuestionType.BEHAVIORAL,
    category: QuestionCategory.TIME_MANAGEMENT,
    difficulty: DifficultyLevel.MEDIUM,
    keywords: ['deadline', 'time management', 'pressure', 'prioritization'],
    expectedElements: ['Situation', 'Task', 'Action', 'Result'],
    followUpTriggers: ['stress', 'pressure', 'overtime'],
    timeLimit: 180
  },
  {
    id: 'beh_003',
    template: 'Tell me about a time when you had to learn a new {skill} quickly. How did you approach it?',
    type: QuestionType.BEHAVIORAL,
    category: QuestionCategory.LEARNING,
    difficulty: DifficultyLevel.MEDIUM,
    keywords: ['learning', 'adaptation', 'skill development'],
    expectedElements: ['Situation', 'Task', 'Action', 'Result'],
    followUpTriggers: ['challenge', 'new technology', 'training'],
    timeLimit: 180
  },
  {
    id: 'beh_004',
    template: 'Describe a project where you had to take leadership. What was your approach?',
    type: QuestionType.BEHAVIORAL,
    category: QuestionCategory.LEADERSHIP,
    difficulty: DifficultyLevel.HARD,
    keywords: ['leadership', 'project management', 'team coordination'],
    expectedElements: ['Situation', 'Task', 'Action', 'Result'],
    followUpTriggers: ['team', 'responsibility', 'decision'],
    timeLimit: 240,
    experienceLevel: ['mid', 'senior', 'lead']
  },
  {
    id: 'beh_005',
    template: 'Tell me about a time when you made a mistake. How did you handle it?',
    type: QuestionType.BEHAVIORAL,
    category: QuestionCategory.PROBLEM_SOLVING,
    difficulty: DifficultyLevel.MEDIUM,
    keywords: ['mistake', 'accountability', 'problem solving'],
    expectedElements: ['Situation', 'Task', 'Action', 'Result'],
    followUpTriggers: ['error', 'failure', 'lesson learned'],
    timeLimit: 180
  },
  {
    id: 'beh_006',
    template: 'Describe a situation where you had to convince someone to see your point of view.',
    type: QuestionType.BEHAVIORAL,
    category: QuestionCategory.COMMUNICATION,
    difficulty: DifficultyLevel.MEDIUM,
    keywords: ['persuasion', 'communication', 'influence'],
    expectedElements: ['Situation', 'Task', 'Action', 'Result'],
    followUpTriggers: ['disagreement', 'stakeholder', 'negotiation'],
    timeLimit: 180
  },
  {
    id: 'beh_007',
    template: 'Tell me about a time when you had to work with limited resources. How did you manage?',
    type: QuestionType.BEHAVIORAL,
    category: QuestionCategory.RESOURCEFULNESS,
    difficulty: DifficultyLevel.MEDIUM,
    keywords: ['resourcefulness', 'creativity', 'constraints'],
    expectedElements: ['Situation', 'Task', 'Action', 'Result'],
    followUpTriggers: ['budget', 'time', 'tools'],
    timeLimit: 180
  },
  {
    id: 'beh_008',
    template: 'Describe a time when you received constructive criticism. How did you respond?',
    type: QuestionType.BEHAVIORAL,
    category: QuestionCategory.GROWTH_MINDSET,
    difficulty: DifficultyLevel.MEDIUM,
    keywords: ['feedback', 'growth', 'improvement'],
    expectedElements: ['Situation', 'Task', 'Action', 'Result'],
    followUpTriggers: ['feedback', 'improvement', 'change'],
    timeLimit: 180
  },
  {
    id: 'beh_009',
    template: 'Tell me about a time when you had to adapt to a significant change at work.',
    type: QuestionType.BEHAVIORAL,
    category: QuestionCategory.ADAPTABILITY,
    difficulty: DifficultyLevel.MEDIUM,
    keywords: ['adaptability', 'change management', 'flexibility'],
    expectedElements: ['Situation', 'Task', 'Action', 'Result'],
    followUpTriggers: ['change', 'transition', 'adjustment'],
    timeLimit: 180
  },
  {
    id: 'beh_010',
    template: 'Describe a situation where you went above and beyond what was expected.',
    type: QuestionType.BEHAVIORAL,
    category: QuestionCategory.INITIATIVE,
    difficulty: DifficultyLevel.MEDIUM,
    keywords: ['initiative', 'extra effort', 'dedication'],
    expectedElements: ['Situation', 'Task', 'Action', 'Result'],
    followUpTriggers: ['extra', 'volunteer', 'improvement'],
    timeLimit: 180
  }
];

export const TECHNICAL_QUESTIONS: QuestionTemplate[] = [
  {
    id: 'tech_001',
    template: 'Explain the difference between {concept1} and {concept2} in {technology}.',
    type: QuestionType.TECHNICAL,
    category: QuestionCategory.KNOWLEDGE,
    difficulty: DifficultyLevel.MEDIUM,
    keywords: ['concepts', 'comparison', 'fundamentals'],
    expectedElements: ['Definition', 'Key differences', 'Use cases', 'Examples'],
    followUpTriggers: ['when would you use', 'advantages', 'disadvantages'],
    timeLimit: 120
  },
  {
    id: 'tech_002',
    template: 'How would you optimize the performance of a {technology} application?',
    type: QuestionType.TECHNICAL,
    category: QuestionCategory.OPTIMIZATION,
    difficulty: DifficultyLevel.HARD,
    keywords: ['performance', 'optimization', 'scalability'],
    expectedElements: ['Profiling', 'Bottlenecks', 'Solutions', 'Metrics'],
    followUpTriggers: ['bottleneck', 'memory', 'database'],
    timeLimit: 300,
    experienceLevel: ['mid', 'senior']
  },
  {
    id: 'tech_003',
    template: 'Walk me through how you would debug a {issue_type} in {technology}.',
    type: QuestionType.TECHNICAL,
    category: QuestionCategory.DEBUGGING,
    difficulty: DifficultyLevel.MEDIUM,
    keywords: ['debugging', 'troubleshooting', 'problem solving'],
    expectedElements: ['Reproduction', 'Investigation', 'Tools', 'Solution'],
    followUpTriggers: ['tools', 'logs', 'testing'],
    timeLimit: 240
  },
  {
    id: 'tech_004',
    template: 'Describe the architecture of a {system_type} you have worked on.',
    type: QuestionType.TECHNICAL,
    category: QuestionCategory.ARCHITECTURE,
    difficulty: DifficultyLevel.HARD,
    keywords: ['architecture', 'system design', 'components'],
    expectedElements: ['Components', 'Data flow', 'Technologies', 'Decisions'],
    followUpTriggers: ['scalability', 'trade-offs', 'alternatives'],
    timeLimit: 360,
    experienceLevel: ['mid', 'senior', 'lead']
  },
  {
    id: 'tech_005',
    template: 'How do you ensure code quality in your {technology} projects?',
    type: QuestionType.TECHNICAL,
    category: QuestionCategory.BEST_PRACTICES,
    difficulty: DifficultyLevel.MEDIUM,
    keywords: ['code quality', 'best practices', 'testing'],
    expectedElements: ['Code review', 'Testing', 'Standards', 'Tools'],
    followUpTriggers: ['testing', 'review process', 'standards'],
    timeLimit: 180
  },
  {
    id: 'tech_006',
    template: 'Explain how you would implement {feature} using {technology}.',
    type: QuestionType.TECHNICAL,
    category: QuestionCategory.IMPLEMENTATION,
    difficulty: DifficultyLevel.MEDIUM,
    keywords: ['implementation', 'feature development', 'coding'],
    expectedElements: ['Approach', 'Code structure', 'Considerations', 'Testing'],
    followUpTriggers: ['edge cases', 'error handling', 'performance'],
    timeLimit: 300
  },
  {
    id: 'tech_007',
    template: 'What are the security considerations when working with {technology}?',
    type: QuestionType.TECHNICAL,
    category: QuestionCategory.SECURITY,
    difficulty: DifficultyLevel.HARD,
    keywords: ['security', 'vulnerabilities', 'best practices'],
    expectedElements: ['Vulnerabilities', 'Mitigation', 'Best practices', 'Tools'],
    followUpTriggers: ['authentication', 'authorization', 'encryption'],
    timeLimit: 240,
    experienceLevel: ['mid', 'senior']
  },
  {
    id: 'tech_008',
    template: 'How would you handle data migration from {old_system} to {new_system}?',
    type: QuestionType.TECHNICAL,
    category: QuestionCategory.DATA_MANAGEMENT,
    difficulty: DifficultyLevel.HARD,
    keywords: ['data migration', 'database', 'transformation'],
    expectedElements: ['Planning', 'Strategy', 'Validation', 'Rollback'],
    followUpTriggers: ['data integrity', 'downtime', 'testing'],
    timeLimit: 300,
    experienceLevel: ['mid', 'senior']
  },
  {
    id: 'tech_009',
    template: 'Describe your experience with {testing_type} testing in {technology}.',
    type: QuestionType.TECHNICAL,
    category: QuestionCategory.TESTING,
    difficulty: DifficultyLevel.MEDIUM,
    keywords: ['testing', 'quality assurance', 'automation'],
    expectedElements: ['Approach', 'Tools', 'Coverage', 'Challenges'],
    followUpTriggers: ['automation', 'coverage', 'CI/CD'],
    timeLimit: 180
  },
  {
    id: 'tech_010',
    template: 'How do you stay updated with the latest developments in {technology}?',
    type: QuestionType.TECHNICAL,
    category: QuestionCategory.CONTINUOUS_LEARNING,
    difficulty: DifficultyLevel.EASY,
    keywords: ['learning', 'staying current', 'professional development'],
    expectedElements: ['Resources', 'Practices', 'Community', 'Application'],
    followUpTriggers: ['resources', 'community', 'projects'],
    timeLimit: 120
  }
];

export const SITUATIONAL_QUESTIONS: QuestionTemplate[] = [
  {
    id: 'sit_001',
    template: 'If you were assigned to a project with unclear requirements, how would you proceed?',
    type: QuestionType.SITUATIONAL,
    category: QuestionCategory.PROBLEM_SOLVING,
    difficulty: DifficultyLevel.MEDIUM,
    keywords: ['unclear requirements', 'clarification', 'project management'],
    expectedElements: ['Clarification process', 'Stakeholder engagement', 'Documentation', 'Iteration'],
    followUpTriggers: ['stakeholders', 'assumptions', 'documentation'],
    timeLimit: 180
  },
  {
    id: 'sit_002',
    template: 'How would you handle a situation where a team member is not contributing effectively?',
    type: QuestionType.SITUATIONAL,
    category: QuestionCategory.TEAM_MANAGEMENT,
    difficulty: DifficultyLevel.MEDIUM,
    keywords: ['team management', 'performance issues', 'communication'],
    expectedElements: ['Assessment', 'Communication', 'Support', 'Escalation'],
    followUpTriggers: ['one-on-one', 'support', 'manager'],
    timeLimit: 180,
    experienceLevel: ['mid', 'senior', 'lead']
  },
  {
    id: 'sit_003',
    template: 'What would you do if you discovered a critical bug in production just before a major release?',
    type: QuestionType.SITUATIONAL,
    category: QuestionCategory.CRISIS_MANAGEMENT,
    difficulty: DifficultyLevel.HARD,
    keywords: ['critical bug', 'production', 'release management'],
    expectedElements: ['Assessment', 'Communication', 'Decision making', 'Risk management'],
    followUpTriggers: ['rollback', 'hotfix', 'stakeholders'],
    timeLimit: 240
  },
  {
    id: 'sit_004',
    template: 'How would you approach learning a new {technology} that your team needs to adopt?',
    type: QuestionType.SITUATIONAL,
    category: QuestionCategory.LEARNING,
    difficulty: DifficultyLevel.MEDIUM,
    keywords: ['learning', 'technology adoption', 'skill development'],
    expectedElements: ['Learning plan', 'Resources', 'Practice', 'Knowledge sharing'],
    followUpTriggers: ['timeline', 'resources', 'team training'],
    timeLimit: 180
  },
  {
    id: 'sit_005',
    template: 'If you had to choose between meeting a deadline and ensuring perfect code quality, how would you decide?',
    type: QuestionType.SITUATIONAL,
    category: QuestionCategory.DECISION_MAKING,
    difficulty: DifficultyLevel.HARD,
    keywords: ['trade-offs', 'deadline', 'code quality'],
    expectedElements: ['Risk assessment', 'Stakeholder communication', 'Compromise solutions', 'Long-term impact'],
    followUpTriggers: ['technical debt', 'stakeholders', 'risk'],
    timeLimit: 240
  },
  {
    id: 'sit_006',
    template: 'How would you handle a disagreement with your manager about a technical decision?',
    type: QuestionType.SITUATIONAL,
    category: QuestionCategory.COMMUNICATION,
    difficulty: DifficultyLevel.MEDIUM,
    keywords: ['disagreement', 'manager', 'technical decision'],
    expectedElements: ['Respectful communication', 'Evidence presentation', 'Compromise', 'Professional relationship'],
    followUpTriggers: ['evidence', 'compromise', 'relationship'],
    timeLimit: 180
  },
  {
    id: 'sit_007',
    template: 'What would you do if you realized you made a promise to a client that the team cannot deliver?',
    type: QuestionType.SITUATIONAL,
    category: QuestionCategory.CLIENT_MANAGEMENT,
    difficulty: DifficultyLevel.HARD,
    keywords: ['client management', 'promises', 'delivery'],
    expectedElements: ['Immediate assessment', 'Honest communication', 'Alternative solutions', 'Relationship management'],
    followUpTriggers: ['alternatives', 'timeline', 'expectations'],
    timeLimit: 240
  },
  {
    id: 'sit_008',
    template: 'How would you prioritize multiple urgent tasks with competing deadlines?',
    type: QuestionType.SITUATIONAL,
    category: QuestionCategory.PRIORITIZATION,
    difficulty: DifficultyLevel.MEDIUM,
    keywords: ['prioritization', 'urgent tasks', 'deadlines'],
    expectedElements: ['Assessment criteria', 'Stakeholder communication', 'Resource allocation', 'Risk management'],
    followUpTriggers: ['criteria', 'stakeholders', 'resources'],
    timeLimit: 180
  },
  {
    id: 'sit_009',
    template: 'What would you do if you inherited a codebase with poor documentation and no tests?',
    type: QuestionType.SITUATIONAL,
    category: QuestionCategory.LEGACY_CODE,
    difficulty: DifficultyLevel.HARD,
    keywords: ['legacy code', 'documentation', 'testing'],
    expectedElements: ['Code analysis', 'Incremental improvement', 'Risk management', 'Team coordination'],
    followUpTriggers: ['refactoring', 'testing strategy', 'timeline'],
    timeLimit: 300,
    experienceLevel: ['mid', 'senior']
  },
  {
    id: 'sit_010',
    template: 'How would you handle a situation where stakeholders keep changing requirements mid-project?',
    type: QuestionType.SITUATIONAL,
    category: QuestionCategory.CHANGE_MANAGEMENT,
    difficulty: DifficultyLevel.MEDIUM,
    keywords: ['changing requirements', 'stakeholders', 'project management'],
    expectedElements: ['Change process', 'Impact assessment', 'Communication', 'Scope management'],
    followUpTriggers: ['change control', 'impact', 'timeline'],
    timeLimit: 240
  }
];

export const SYSTEM_DESIGN_QUESTIONS: QuestionTemplate[] = [
  {
    id: 'sys_001',
    template: 'Design a {system_type} that can handle {scale} users.',
    type: QuestionType.SYSTEM_DESIGN,
    category: QuestionCategory.ARCHITECTURE,
    difficulty: DifficultyLevel.HARD,
    keywords: ['system design', 'scalability', 'architecture'],
    expectedElements: ['Requirements', 'Architecture', 'Components', 'Scalability', 'Trade-offs'],
    followUpTriggers: ['bottlenecks', 'database', 'caching'],
    timeLimit: 2700, // 45 minutes
    experienceLevel: ['senior', 'lead']
  },
  {
    id: 'sys_002',
    template: 'How would you design a distributed caching system?',
    type: QuestionType.SYSTEM_DESIGN,
    category: QuestionCategory.DISTRIBUTED_SYSTEMS,
    difficulty: DifficultyLevel.HARD,
    keywords: ['distributed systems', 'caching', 'performance'],
    expectedElements: ['Cache strategy', 'Consistency', 'Partitioning', 'Fault tolerance'],
    followUpTriggers: ['consistency', 'partitioning', 'eviction'],
    timeLimit: 2700,
    experienceLevel: ['senior', 'lead']
  },
  {
    id: 'sys_003',
    template: 'Design a real-time {feature} system (like chat or notifications).',
    type: QuestionType.SYSTEM_DESIGN,
    category: QuestionCategory.REAL_TIME_SYSTEMS,
    difficulty: DifficultyLevel.HARD,
    keywords: ['real-time', 'websockets', 'messaging'],
    expectedElements: ['Real-time protocol', 'Message delivery', 'Scalability', 'Reliability'],
    followUpTriggers: ['websockets', 'message queues', 'delivery guarantees'],
    timeLimit: 2700,
    experienceLevel: ['senior', 'lead']
  }
];

export const COMPANY_CULTURE_QUESTIONS: QuestionTemplate[] = [
  {
    id: 'cult_001',
    template: 'Why are you interested in working at {company}?',
    type: QuestionType.COMPANY_CULTURE,
    category: QuestionCategory.MOTIVATION,
    difficulty: DifficultyLevel.EASY,
    keywords: ['company interest', 'motivation', 'research'],
    expectedElements: ['Company research', 'Alignment with values', 'Career goals', 'Specific reasons'],
    followUpTriggers: ['values', 'mission', 'growth'],
    timeLimit: 120
  },
  {
    id: 'cult_002',
    template: 'How do you handle work-life balance?',
    type: QuestionType.COMPANY_CULTURE,
    category: QuestionCategory.WORK_LIFE_BALANCE,
    difficulty: DifficultyLevel.EASY,
    keywords: ['work-life balance', 'personal management', 'priorities'],
    expectedElements: ['Personal strategies', 'Boundaries', 'Priorities', 'Flexibility'],
    followUpTriggers: ['boundaries', 'stress', 'priorities'],
    timeLimit: 120
  },
  {
    id: 'cult_003',
    template: 'Describe your ideal work environment.',
    type: QuestionType.COMPANY_CULTURE,
    category: QuestionCategory.WORK_ENVIRONMENT,
    difficulty: DifficultyLevel.EASY,
    keywords: ['work environment', 'preferences', 'culture fit'],
    expectedElements: ['Environment preferences', 'Team dynamics', 'Communication style', 'Growth opportunities'],
    followUpTriggers: ['collaboration', 'independence', 'feedback'],
    timeLimit: 120
  },
  {
    id: 'cult_004',
    template: 'How do you contribute to a positive team culture?',
    type: QuestionType.COMPANY_CULTURE,
    category: QuestionCategory.TEAM_CULTURE,
    difficulty: DifficultyLevel.MEDIUM,
    keywords: ['team culture', 'contribution', 'collaboration'],
    expectedElements: ['Specific contributions', 'Examples', 'Values', 'Behaviors'],
    followUpTriggers: ['examples', 'challenges', 'improvement'],
    timeLimit: 180
  },
  {
    id: 'cult_005',
    template: 'Where do you see yourself in 5 years?',
    type: QuestionType.COMPANY_CULTURE,
    category: QuestionCategory.CAREER_GOALS,
    difficulty: DifficultyLevel.EASY,
    keywords: ['career goals', 'future plans', 'growth'],
    expectedElements: ['Career vision', 'Skill development', 'Leadership goals', 'Industry impact'],
    followUpTriggers: ['skills', 'leadership', 'impact'],
    timeLimit: 120
  }
];

export const ALL_QUESTION_TEMPLATES = [
  ...BEHAVIORAL_QUESTIONS,
  ...TECHNICAL_QUESTIONS,
  ...SITUATIONAL_QUESTIONS,
  ...SYSTEM_DESIGN_QUESTIONS,
  ...COMPANY_CULTURE_QUESTIONS
];