import { describe, it, expect, beforeEach } from 'vitest';
import { ResumeParser } from '../ResumeParser';
import { SkillCategory, SkillSource } from '../../types/resume';

describe('ResumeParser', () => {
  let parser: ResumeParser;

  beforeEach(() => {
    parser = new ResumeParser();
  });

  describe('parseResumeFromText', () => {
    it('should parse basic resume information', async () => {
      const resumeText = `
        John Doe
        john.doe@email.com
        (555) 123-4567
        San Francisco, CA
        linkedin.com/in/johndoe
        github.com/johndoe
        
        EXPERIENCE
        Software Engineer at TechCorp
        January 2020 - Present
        - Developed web applications using React and Node.js
        - Led a team of 3 developers
        - Improved application performance by 40%
        
        EDUCATION
        Bachelor of Science in Computer Science
        University of California, Berkeley
        2016 - 2020
        
        SKILLS
        JavaScript, React, Node.js, Python, SQL
      `;

      const result = await parser.parseResumeFromText(resumeText);

      expect(result.personalInfo.name).toContain('John Doe');
      expect(result.personalInfo.email).toBe('john.doe@email.com');
      expect(result.personalInfo.phone).toContain('555');
      expect(result.personalInfo.location).toContain('San Francisco');
      expect(result.personalInfo.linkedIn).toContain('linkedin.com');
      expect(result.personalInfo.github).toContain('github.com');
      
      expect(result.workExperience.length).toBeGreaterThan(0);
      expect(result.workExperience[0].company).toContain('TechCorp');
      expect(result.workExperience[0].position).toContain('Software Engineer');
      expect(result.workExperience[0].current).toBe(true);
      
      expect(result.education.length).toBeGreaterThan(0);
      expect(result.education[0].degree).toContain('Bachelor');
      expect(result.education[0].institution).toContain('Berkeley');
      
      expect(result.skills.length).toBeGreaterThan(0);
      expect(result.skills.some(s => s.name === 'javascript')).toBe(true);
    });

    it('should extract work experience correctly', async () => {
      const resumeText = `
        WORK EXPERIENCE
        
        Senior Developer at ABC Company
        March 2021 - Present
        - Built scalable web applications
        - Mentored junior developers
        
        Junior Developer at XYZ Corp
        June 2019 - February 2021
        - Developed REST APIs
        - Fixed bugs and improved code quality
      `;

      const result = await parser.parseResumeFromText(resumeText);

      expect(result.workExperience.length).toBe(2);
      
      const seniorRole = result.workExperience[0];
      expect(seniorRole.position).toContain('Senior Developer');
      expect(seniorRole.company).toContain('ABC Company');
      expect(seniorRole.current).toBe(true);
      
      const juniorRole = result.workExperience[1];
      expect(juniorRole.position).toContain('Junior Developer');
      expect(juniorRole.company).toContain('XYZ Corp');
      expect(juniorRole.current).toBe(false);
    });

    it('should extract education information', async () => {
      const resumeText = `
        EDUCATION
        
        Master of Science in Computer Science
        Stanford University
        2018 - 2020
        GPA: 3.8
        
        Bachelor of Engineering
        MIT
        2014 - 2018
      `;

      const result = await parser.parseResumeFromText(resumeText);

      expect(result.education.length).toBe(2);
      
      const masters = result.education[0];
      expect(masters.degree).toContain('Master');
      expect(masters.institution).toContain('Stanford');
      
      const bachelors = result.education[1];
      expect(bachelors.degree).toContain('Bachelor');
      expect(bachelors.institution).toContain('MIT');
    });

    it('should extract skills with categories', async () => {
      const resumeText = `
        TECHNICAL SKILLS
        Programming Languages: JavaScript, Python, Java
        Frameworks: React, Angular, Django
        Databases: PostgreSQL, MongoDB
        Cloud: AWS, Azure
        
        SOFT SKILLS
        Leadership, Communication, Problem Solving
      `;

      const result = await parser.parseResumeFromText(resumeText);

      expect(result.skills.length).toBeGreaterThan(0);
      
      const jsSkill = result.skills.find(s => s.name === 'javascript');
      expect(jsSkill).toBeDefined();
      expect(jsSkill?.category).toBe(SkillCategory.LANGUAGE);
      
      const reactSkill = result.skills.find(s => s.name === 'react');
      expect(reactSkill).toBeDefined();
      expect(reactSkill?.category).toBe(SkillCategory.FRAMEWORK);
      
      const leadershipSkill = result.skills.find(s => s.name === 'leadership');
      expect(leadershipSkill).toBeDefined();
      expect(leadershipSkill?.category).toBe(SkillCategory.SOFT);
    });

    it('should handle missing sections gracefully', async () => {
      const minimalResume = `
        Jane Smith
        jane@email.com
      `;

      const result = await parser.parseResumeFromText(minimalResume);

      expect(result.personalInfo.name).toContain('Jane Smith');
      expect(result.personalInfo.email).toBe('jane@email.com');
      expect(result.workExperience).toEqual([]);
      expect(result.education).toEqual([]);
      expect(result.skills).toEqual([]);
    });
  });

  describe('analyzeGaps', () => {
    it('should identify skill gaps between resume and job', async () => {
      const resume = await parser.parseResumeFromText(`
        SKILLS
        JavaScript, React, HTML, CSS
      `);

      const jobDescription = {
        id: 'job1',
        rawText: 'Job description',
        title: 'Full Stack Developer',
        company: 'TechCorp',
        skills: ['javascript', 'react', 'node.js', 'python', 'sql'],
        requirements: [],
        responsibilities: [],
        jobType: 'full-time' as any,
        experienceLevel: 'mid' as any,
        industry: 'Technology',
        keywords: [],
        parsedAt: new Date()
      };

      const gapAnalysis = await parser.analyzeGaps(resume, jobDescription);

      expect(gapAnalysis.missingSkills).toContain('node.js');
      expect(gapAnalysis.missingSkills).toContain('python');
      expect(gapAnalysis.missingSkills).toContain('sql');
      expect(gapAnalysis.strengths).toContain('javascript');
      expect(gapAnalysis.strengths).toContain('react');
      expect(gapAnalysis.overallMatch).toBeGreaterThan(0);
      expect(gapAnalysis.overallMatch).toBeLessThan(1);
    });

    it('should provide recommendations for improvement', async () => {
      const resume = await parser.parseResumeFromText(`
        John Doe
        john@email.com
        
        SKILLS
        HTML, CSS
      `);

      const jobDescription = {
        id: 'job1',
        rawText: 'Job description',
        title: 'Senior Developer',
        company: 'TechCorp',
        skills: ['javascript', 'react', 'node.js'],
        requirements: [],
        responsibilities: [],
        jobType: 'full-time' as any,
        experienceLevel: 'senior' as any,
        industry: 'Technology',
        keywords: [],
        parsedAt: new Date()
      };

      const gapAnalysis = await parser.analyzeGaps(resume, jobDescription);

      expect(gapAnalysis.recommendations.length).toBeGreaterThan(0);
      expect(gapAnalysis.recommendations.some(r => 
        r.toLowerCase().includes('javascript') || 
        r.toLowerCase().includes('skill')
      )).toBe(true);
    });
  });
});