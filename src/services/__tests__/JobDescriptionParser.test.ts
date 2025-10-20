import { describe, it, expect, beforeEach } from 'vitest';
import { JobDescriptionParser } from '../JobDescriptionParser';
import { JobType, ExperienceLevel } from '../../types/parsing';

describe('JobDescriptionParser', () => {
  let parser: JobDescriptionParser;

  beforeEach(() => {
    parser = new JobDescriptionParser();
  });

  describe('parseJobDescription', () => {
    it('should parse a basic job description', async () => {
      const jobText = `
        Software Engineer at TechCorp
        Location: San Francisco, CA
        
        We are looking for a skilled Software Engineer with experience in JavaScript, React, and Node.js.
        
        Requirements:
        - 3+ years of experience with JavaScript
        - Experience with React and modern web development
        - Strong problem-solving skills
        
        Responsibilities:
        - Develop web applications using React
        - Collaborate with cross-functional teams
        - Write clean, maintainable code
      `;

      const result = await parser.parseJobDescription(jobText);

      expect(result.title).toContain('Software Engineer');
      expect(result.company).toContain('TechCorp');
      expect(result.location).toContain('San Francisco');
      expect(result.skills).toContain('javascript');
      expect(result.skills).toContain('react');
      expect(result.requirements.length).toBeGreaterThan(0);
      expect(result.responsibilities.length).toBeGreaterThan(0);
    });

    it('should classify job type correctly', async () => {
      const remoteJobText = `
        Remote Software Developer
        Work from home opportunity
        Full-time position
      `;

      const result = await parser.parseJobDescription(remoteJobText);
      expect([JobType.REMOTE, JobType.FULL_TIME]).toContain(result.jobType);
    });

    it('should classify experience level correctly', async () => {
      const seniorJobText = `
        Senior Software Engineer
        5+ years of experience required
        Lead development teams
      `;

      const result = await parser.parseJobDescription(seniorJobText);
      expect(result.experienceLevel).toBe(ExperienceLevel.SENIOR);
    });

    it('should extract skills from job description', async () => {
      const techJobText = `
        Full Stack Developer position requiring:
        - JavaScript, TypeScript, Python
        - React, Angular, Vue.js
        - Node.js, Express
        - PostgreSQL, MongoDB
        - AWS, Docker, Kubernetes
      `;

      const result = await parser.parseJobDescription(techJobText);
      
      expect(result.skills).toContain('javascript');
      expect(result.skills).toContain('typescript');
      expect(result.skills).toContain('python');
      expect(result.skills).toContain('react');
      expect(result.skills).toContain('postgresql');
      expect(result.skills).toContain('aws');
    });

    it('should handle empty or invalid input', async () => {
      const result = await parser.parseJobDescription('');
      
      expect(result.title).toBeDefined();
      expect(result.company).toBeDefined();
      expect(result.skills).toEqual([]);
      expect(result.requirements).toEqual([]);
    });

    it('should cache parsed results', async () => {
      const jobText = 'Software Engineer at TestCorp';
      
      const result1 = await parser.parseJobDescription(jobText);
      const result2 = await parser.parseJobDescription(jobText);
      
      expect(result1.id).toBe(result2.id);
      expect(result1.parsedAt).toEqual(result2.parsedAt);
    });
  });

  describe('cache management', () => {
    it('should clear cache successfully', () => {
      parser.clearCache();
      const stats = parser.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should provide cache statistics', async () => {
      await parser.parseJobDescription('Test job description');
      const stats = parser.getCacheStats();
      
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.entries.length).toBeGreaterThan(0);
    });
  });
});