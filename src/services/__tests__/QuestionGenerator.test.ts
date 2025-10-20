import { describe, it, expect, beforeEach } from 'vitest';
import { QuestionGenerator } from '../QuestionGenerator';
import { QuestionType, QuestionCategory, DifficultyLevel } from '../../types/index';
import { JobDescriptionData } from '../../types/parsing';
import { ResumeData } from '../../types/resume';

describe('QuestionGenerator', () => {
  let generator: QuestionGenerator;

  beforeEach(() => {
    generator = new QuestionGenerator();
  });

  describe('generateFromJobDescription', () => {
    it('should generate questions based on job description', async () => {
      const jobDescription: JobDescriptionData = {
        id: 'job1',
        rawText: 'Software Engineer position',
        title: 'Software Engineer',
        company: 'TechCorp',
        skills: ['javascript', 'react', 'node.js'],
        requirements: ['3+ years experience', 'Bachelor degree'],
        responsibilities: ['Develop applications', 'Code review'],
        jobType: 'full-time' as any,
        experienceLevel: 'mid' as any,
        industry: 'Technology',
        keywords: ['development', 'programming', 'software'],
        parsedAt: new Date()
      };

      const result = await generator.generateFromJobDescription(jobDescription, {
        count: 5,
        types: [QuestionType.TECHNICAL, QuestionType.BEHAVIORAL]
      });

      expect(result.questions.length).toBe(5);
      expect(result.metadata.totalGenerated).toBe(5);
      expect(result.metadata.distribution).toBeDefined();
      
      // Should contain relevant questions
      const questionTexts = result.questions.map(q => q.text.toLowerCase());
      const hasRelevantContent = questionTexts.some(text => 
        text.includes('javascript') || 
        text.includes('react') || 
        text.includes('development') ||
        text.includes('software')
      );
      expect(hasRelevantContent).toBe(true);
    });

    it('should respect difficulty level filters', async () => {
      const jobDescription: JobDescriptionData = {
        id: 'job1',
        rawText: 'Entry level position',
        title: 'Junior Developer',
        company: 'StartupCorp',
        skills: ['html', 'css', 'javascript'],
        requirements: [],
        responsibilities: [],
        jobType: 'full-time' as any,
        experienceLevel: 'entry' as any,
        industry: 'Technology',
        keywords: [],
        parsedAt: new Date()
      };

      const result = await generator.generateFromJobDescription(jobDescription, {
        count: 3,
        difficulty: [DifficultyLevel.EASY]
      });

      expect(result.questions.length).toBe(3);
      result.questions.forEach(question => {
        expect(question.difficulty).toBe(DifficultyLevel.EASY);
      });
    });
  });

  describe('generateFromResume', () => {
    it('should generate questions based on resume data', async () => {
      const resume: ResumeData = {
        id: 'resume1',
        rawText: 'Resume content',
        personalInfo: {
          name: 'John Doe',
          email: 'john@email.com'
        },
        workExperience: [{
          id: 'exp1',
          company: 'TechCorp',
          position: 'Software Engineer',
          current: true,
          description: 'Developed React applications',
          achievements: ['Improved performance by 40%'],
          skills: ['react', 'javascript']
        }],
        education: [],
        skills: [
          { name: 'javascript', category: 'technical' as any, source: 'work_experience' as any },
          { name: 'react', category: 'technical' as any, source: 'work_experience' as any }
        ],
        projects: [],
        certifications: [],
        languages: [],
        parsedAt: new Date()
      };

      const result = await generator.generateFromResume(resume, {
        count: 4
      });

      expect(result.questions.length).toBe(4);
      
      // Should generate questions relevant to resume content
      const questionTexts = result.questions.map(q => q.text.toLowerCase());
      const hasResumeRelevantContent = questionTexts.some(text => 
        text.includes('techcorp') || 
        text.includes('react') || 
        text.includes('javascript') ||
        text.includes('software engineer')
      );
      expect(hasResumeRelevantContent).toBe(true);
    });
  });

  describe('generateByCategory', () => {
    it('should generate questions for specific category', async () => {
      const result = await generator.generateByCategory(QuestionCategory.TEAMWORK, {
        count: 3
      });

      expect(result.questions.length).toBe(3);
      result.questions.forEach(question => {
        expect(question.category).toBe(QuestionCategory.TEAMWORK);
      });
    });
  });

  describe('generateAdaptiveQuestions', () => {
    it('should adapt difficulty based on performance', async () => {
      const previousQuestions = [
        {
          id: 'q1',
          text: 'Easy question',
          type: QuestionType.BEHAVIORAL,
          category: QuestionCategory.TEAMWORK,
          difficulty: DifficultyLevel.EASY,
          expectedElements: [],
          followUpTriggers: []
        }
      ];
      const performanceScores = [0.9]; // High performance

      const result = await generator.generateAdaptiveQuestions(
        previousQuestions,
        performanceScores,
        { count: 2 }
      );

      expect(result.questions.length).toBe(2);
      
      // Should generate harder questions for high performers
      const hasHarderQuestions = result.questions.some(q => 
        q.difficulty === DifficultyLevel.MEDIUM || q.difficulty === DifficultyLevel.HARD
      );
      expect(hasHarderQuestions).toBe(true);
    });

    it('should focus on weak areas', async () => {
      const previousQuestions = [
        {
          id: 'q1',
          text: 'Technical question',
          type: QuestionType.TECHNICAL,
          category: QuestionCategory.TECHNICAL,
          difficulty: DifficultyLevel.MEDIUM,
          expectedElements: [],
          followUpTriggers: []
        }
      ];
      const performanceScores = [0.3]; // Poor performance in technical

      const result = await generator.generateAdaptiveQuestions(
        previousQuestions,
        performanceScores,
        { count: 2 }
      );

      expect(result.questions.length).toBe(2);
      
      // Should generate easier questions to help improve
      const hasEasierQuestions = result.questions.some(q => 
        q.difficulty === DifficultyLevel.EASY
      );
      expect(hasEasierQuestions).toBe(true);
    });
  });

  describe('generateFollowUpQuestions', () => {
    it('should generate relevant follow-up questions', async () => {
      const originalQuestion = {
        id: 'q1',
        text: 'Tell me about a challenging project',
        type: QuestionType.BEHAVIORAL,
        category: QuestionCategory.PROBLEM_SOLVING,
        difficulty: DifficultyLevel.MEDIUM,
        expectedElements: ['Situation', 'Task', 'Action', 'Result'],
        followUpTriggers: ['challenge', 'team', 'deadline']
      };

      const response = 'I worked on a challenging project with tight deadlines and team conflicts';

      const followUps = await generator.generateFollowUpQuestions(
        originalQuestion,
        response,
        { count: 2 }
      );

      expect(followUps.length).toBe(2);
      followUps.forEach(followUp => {
        expect(followUp.type).toBe(QuestionType.FOLLOW_UP);
        expect(followUp.metadata?.parentQuestionId).toBe(originalQuestion.id);
      });
    });
  });

  describe('getRecommendedQuestions', () => {
    it('should combine job and resume data for recommendations', async () => {
      const jobDescription: JobDescriptionData = {
        id: 'job1',
        rawText: 'Full Stack Developer',
        title: 'Full Stack Developer',
        company: 'WebCorp',
        skills: ['javascript', 'react', 'node.js', 'sql'],
        requirements: [],
        responsibilities: [],
        jobType: 'full-time' as any,
        experienceLevel: 'mid' as any,
        industry: 'Technology',
        keywords: ['web', 'development'],
        parsedAt: new Date()
      };

      const resume: ResumeData = {
        id: 'resume1',
        rawText: 'Resume',
        personalInfo: { name: 'Jane Doe' },
        workExperience: [],
        education: [],
        skills: [
          { name: 'javascript', category: 'technical' as any, source: 'explicit' as any },
          { name: 'html', category: 'technical' as any, source: 'explicit' as any }
        ],
        projects: [],
        certifications: [],
        languages: [],
        parsedAt: new Date()
      };

      const result = await generator.getRecommendedQuestions(jobDescription, resume, {
        count: 6
      });

      expect(result.questions.length).toBe(6);
      expect(result.metadata.totalGenerated).toBe(6);
      
      // Should include questions relevant to both job and resume
      const questionTexts = result.questions.map(q => q.text.toLowerCase());
      const hasJobRelevantContent = questionTexts.some(text => 
        text.includes('javascript') || text.includes('web') || text.includes('development')
      );
      expect(hasJobRelevantContent).toBe(true);
    });
  });

  describe('utility methods', () => {
    it('should track used questions', async () => {
      const initialCount = generator.getUsedQuestionCount();
      expect(initialCount).toBe(0);

      const jobDescription: JobDescriptionData = {
        id: 'job1',
        rawText: 'Test job',
        title: 'Developer',
        company: 'TestCorp',
        skills: ['javascript'],
        requirements: [],
        responsibilities: [],
        jobType: 'full-time' as any,
        experienceLevel: 'mid' as any,
        industry: 'Technology',
        keywords: [],
        parsedAt: new Date()
      };

      await generator.generateFromJobDescription(jobDescription, { count: 3 });
      
      const usedCount = generator.getUsedQuestionCount();
      expect(usedCount).toBe(3);
      
      const availableCount = generator.getAvailableTemplateCount();
      expect(availableCount).toBeGreaterThan(0);
    });

    it('should reset used questions', async () => {
      const jobDescription: JobDescriptionData = {
        id: 'job1',
        rawText: 'Test job',
        title: 'Developer',
        company: 'TestCorp',
        skills: ['python'],
        requirements: [],
        responsibilities: [],
        jobType: 'full-time' as any,
        experienceLevel: 'entry' as any,
        industry: 'Technology',
        keywords: [],
        parsedAt: new Date()
      };

      await generator.generateFromJobDescription(jobDescription, { count: 2 });
      expect(generator.getUsedQuestionCount()).toBe(2);

      generator.resetUsedQuestions();
      expect(generator.getUsedQuestionCount()).toBe(0);
    });
  });
});