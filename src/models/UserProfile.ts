import { 
  UserProfile, 
  ResumeData, 
  WorkExperience, 
  Education, 
  Project 
} from '../types';

export class UserProfileModel implements UserProfile {
  name: string;
  resume?: ResumeData;
  targetRoles: string[];
  experienceLevel: 'entry' | 'mid' | 'senior' | 'executive';
  industries: string[];

  constructor(data: Partial<UserProfile> = {}) {
    this.name = data.name || '';
    this.resume = data.resume;
    this.targetRoles = data.targetRoles || [];
    this.experienceLevel = data.experienceLevel || 'entry';
    this.industries = data.industries || [];

    this.validate();
  }

  validate(): void {
    const errors: string[] = [];

    // Name validation
    if (this.name.length > 100) {
      errors.push('Name cannot exceed 100 characters');
    }

    // Experience level validation
    const validExperienceLevels = ['entry', 'mid', 'senior', 'executive'];
    if (!validExperienceLevels.includes(this.experienceLevel)) {
      errors.push(`Invalid experience level: ${this.experienceLevel}`);
    }

    // Target roles validation
    if (this.targetRoles.length > 10) {
      errors.push('Cannot have more than 10 target roles');
    }

    this.targetRoles.forEach((role, index) => {
      if (!role || role.trim() === '') {
        errors.push(`Target role at index ${index} cannot be empty`);
      }
      if (role.length > 100) {
        errors.push(`Target role at index ${index} cannot exceed 100 characters`);
      }
    });

    // Industries validation
    if (this.industries.length > 15) {
      errors.push('Cannot have more than 15 industries');
    }

    this.industries.forEach((industry, index) => {
      if (!industry || industry.trim() === '') {
        errors.push(`Industry at index ${index} cannot be empty`);
      }
      if (industry.length > 50) {
        errors.push(`Industry at index ${index} cannot exceed 50 characters`);
      }
    });

    // Resume validation
    if (this.resume) {
      this.validateResumeData(this.resume);
    }

    if (errors.length > 0) {
      throw new Error(`UserProfile validation failed: ${errors.join(', ')}`);
    }
  }

  private validateResumeData(resume: ResumeData): void {
    const errors: string[] = [];

    // Work experience validation
    if (resume.workExperience.length > 20) {
      errors.push('Cannot have more than 20 work experiences');
    }

    resume.workExperience.forEach((exp, index) => {
      try {
        this.validateWorkExperience(exp);
      } catch (error) {
        if (error instanceof Error) {
          errors.push(`Work experience ${index + 1}: ${error.message}`);
        }
      }
    });

    // Skills validation
    if (resume.skills.length > 50) {
      errors.push('Cannot have more than 50 skills');
    }

    resume.skills.forEach((skill, index) => {
      if (!skill || skill.trim() === '') {
        errors.push(`Skill at index ${index} cannot be empty`);
      }
      if (skill.length > 50) {
        errors.push(`Skill at index ${index} cannot exceed 50 characters`);
      }
    });

    // Education validation
    if (resume.education.length > 10) {
      errors.push('Cannot have more than 10 education entries');
    }

    resume.education.forEach((edu, index) => {
      try {
        this.validateEducation(edu);
      } catch (error) {
        if (error instanceof Error) {
          errors.push(`Education ${index + 1}: ${error.message}`);
        }
      }
    });

    // Projects validation
    if (resume.projects.length > 20) {
      errors.push('Cannot have more than 20 projects');
    }

    resume.projects.forEach((project, index) => {
      try {
        this.validateProject(project);
      } catch (error) {
        if (error instanceof Error) {
          errors.push(`Project ${index + 1}: ${error.message}`);
        }
      }
    });

    // Achievements validation
    if (resume.achievements.length > 20) {
      errors.push('Cannot have more than 20 achievements');
    }

    resume.achievements.forEach((achievement, index) => {
      if (!achievement || achievement.trim() === '') {
        errors.push(`Achievement at index ${index} cannot be empty`);
      }
      if (achievement.length > 200) {
        errors.push(`Achievement at index ${index} cannot exceed 200 characters`);
      }
    });

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
  }

  private validateWorkExperience(exp: WorkExperience): void {
    const errors: string[] = [];

    if (!exp.company || exp.company.trim() === '') {
      errors.push('Company name is required');
    } else if (exp.company.length > 100) {
      errors.push('Company name cannot exceed 100 characters');
    }

    if (!exp.position || exp.position.trim() === '') {
      errors.push('Position is required');
    } else if (exp.position.length > 100) {
      errors.push('Position cannot exceed 100 characters');
    }

    if (!(exp.startDate instanceof Date) || isNaN(exp.startDate.getTime())) {
      errors.push('Valid start date is required');
    }

    if (exp.endDate) {
      if (!(exp.endDate instanceof Date) || isNaN(exp.endDate.getTime())) {
        errors.push('End date must be a valid date if provided');
      } else if (exp.startDate && exp.endDate < exp.startDate) {
        errors.push('End date cannot be before start date');
      }
    }

    if (exp.description && exp.description.length > 1000) {
      errors.push('Description cannot exceed 1000 characters');
    }

    if (exp.technologies.length > 20) {
      errors.push('Cannot have more than 20 technologies');
    }

    exp.technologies.forEach((tech, index) => {
      if (!tech || tech.trim() === '') {
        errors.push(`Technology at index ${index} cannot be empty`);
      }
      if (tech.length > 50) {
        errors.push(`Technology at index ${index} cannot exceed 50 characters`);
      }
    });

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
  }

  private validateEducation(edu: Education): void {
    const errors: string[] = [];

    if (!edu.institution || edu.institution.trim() === '') {
      errors.push('Institution is required');
    } else if (edu.institution.length > 100) {
      errors.push('Institution cannot exceed 100 characters');
    }

    if (!edu.degree || edu.degree.trim() === '') {
      errors.push('Degree is required');
    } else if (edu.degree.length > 100) {
      errors.push('Degree cannot exceed 100 characters');
    }

    if (!edu.field || edu.field.trim() === '') {
      errors.push('Field of study is required');
    } else if (edu.field.length > 100) {
      errors.push('Field of study cannot exceed 100 characters');
    }

    if (!(edu.graduationDate instanceof Date) || isNaN(edu.graduationDate.getTime())) {
      errors.push('Valid graduation date is required');
    }

    if (edu.gpa !== undefined) {
      if (typeof edu.gpa !== 'number' || edu.gpa < 0 || edu.gpa > 4.0) {
        errors.push('GPA must be a number between 0 and 4.0');
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
  }

  private validateProject(project: Project): void {
    const errors: string[] = [];

    if (!project.name || project.name.trim() === '') {
      errors.push('Project name is required');
    } else if (project.name.length > 100) {
      errors.push('Project name cannot exceed 100 characters');
    }

    if (!project.description || project.description.trim() === '') {
      errors.push('Project description is required');
    } else if (project.description.length > 1000) {
      errors.push('Project description cannot exceed 1000 characters');
    }

    if (project.technologies.length === 0) {
      errors.push('At least one technology is required');
    } else if (project.technologies.length > 20) {
      errors.push('Cannot have more than 20 technologies');
    }

    project.technologies.forEach((tech, index) => {
      if (!tech || tech.trim() === '') {
        errors.push(`Technology at index ${index} cannot be empty`);
      }
      if (tech.length > 50) {
        errors.push(`Technology at index ${index} cannot exceed 50 characters`);
      }
    });

    if (project.url && project.url.length > 200) {
      errors.push('Project URL cannot exceed 200 characters');
    }

    if (!(project.startDate instanceof Date) || isNaN(project.startDate.getTime())) {
      errors.push('Valid start date is required');
    }

    if (project.endDate) {
      if (!(project.endDate instanceof Date) || isNaN(project.endDate.getTime())) {
        errors.push('End date must be a valid date if provided');
      } else if (project.endDate < project.startDate) {
        errors.push('End date cannot be before start date');
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
  }

  // Update methods
  updateName(name: string): void {
    this.name = name;
    this.validate();
  }

  updateExperienceLevel(level: 'entry' | 'mid' | 'senior' | 'executive'): void {
    this.experienceLevel = level;
    this.validate();
  }

  addTargetRole(role: string): void {
    if (!this.targetRoles.includes(role)) {
      this.targetRoles.push(role);
      this.validate();
    }
  }

  removeTargetRole(role: string): void {
    this.targetRoles = this.targetRoles.filter(r => r !== role);
  }

  addIndustry(industry: string): void {
    if (!this.industries.includes(industry)) {
      this.industries.push(industry);
      this.validate();
    }
  }

  removeIndustry(industry: string): void {
    this.industries = this.industries.filter(i => i !== industry);
  }

  updateResume(resume: ResumeData): void {
    this.resume = resume;
    this.validate();
  }

  // Utility methods
  getExperienceYears(): number {
    if (!this.resume?.workExperience.length) return 0;

    let totalMonths = 0;
    
    for (const exp of this.resume.workExperience) {
      const startDate = exp.startDate;
      const endDate = exp.endDate || new Date();
      
      const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                    (endDate.getMonth() - startDate.getMonth());
      
      totalMonths += Math.max(0, months);
    }

    return Math.round(totalMonths / 12 * 10) / 10; // Round to 1 decimal place
  }

  getAllSkills(): string[] {
    const skills = new Set<string>();
    
    // Add skills from resume
    if (this.resume?.skills) {
      this.resume.skills.forEach(skill => skills.add(skill.toLowerCase()));
    }

    // Add technologies from work experience
    if (this.resume?.workExperience) {
      this.resume.workExperience.forEach(exp => {
        exp.technologies.forEach(tech => skills.add(tech.toLowerCase()));
      });
    }

    // Add technologies from projects
    if (this.resume?.projects) {
      this.resume.projects.forEach(project => {
        project.technologies.forEach(tech => skills.add(tech.toLowerCase()));
      });
    }

    return Array.from(skills);
  }

  hasSkill(skill: string): boolean {
    const allSkills = this.getAllSkills();
    return allSkills.includes(skill.toLowerCase());
  }

  getSkillsByCategory(): { [category: string]: string[] } {
    const allSkills = this.getAllSkills();
    const categories: { [category: string]: string[] } = {
      programming: [],
      frameworks: [],
      databases: [],
      tools: [],
      soft: [],
      other: []
    };

    // Simple categorization based on common patterns
    const programmingLanguages = ['javascript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'typescript', 'php', 'ruby', 'swift', 'kotlin'];
    const frameworks = ['react', 'angular', 'vue', 'express', 'django', 'flask', 'spring', 'laravel', 'rails'];
    const databases = ['mysql', 'postgresql', 'mongodb', 'redis', 'sqlite', 'oracle', 'cassandra'];
    const tools = ['git', 'docker', 'kubernetes', 'jenkins', 'aws', 'azure', 'gcp'];
    const softSkills = ['leadership', 'communication', 'teamwork', 'problem-solving', 'project management'];

    allSkills.forEach(skill => {
      if (programmingLanguages.some(lang => skill.includes(lang))) {
        categories.programming.push(skill);
      } else if (frameworks.some(fw => skill.includes(fw))) {
        categories.frameworks.push(skill);
      } else if (databases.some(db => skill.includes(db))) {
        categories.databases.push(skill);
      } else if (tools.some(tool => skill.includes(tool))) {
        categories.tools.push(skill);
      } else if (softSkills.some(soft => skill.includes(soft))) {
        categories.soft.push(skill);
      } else {
        categories.other.push(skill);
      }
    });

    return categories;
  }

  getCurrentPosition(): string | null {
    if (!this.resume?.workExperience.length) return null;

    // Find the most recent position (no end date or latest end date)
    let currentExp = this.resume.workExperience[0];
    
    for (const exp of this.resume.workExperience) {
      if (!exp.endDate) {
        currentExp = exp;
        break;
      }
      
      if (!currentExp.endDate || (exp.endDate && exp.endDate > currentExp.endDate)) {
        currentExp = exp;
      }
    }

    return currentExp.position;
  }

  getCurrentCompany(): string | null {
    if (!this.resume?.workExperience.length) return null;

    // Find the most recent company
    let currentExp = this.resume.workExperience[0];
    
    for (const exp of this.resume.workExperience) {
      if (!exp.endDate) {
        currentExp = exp;
        break;
      }
      
      if (!currentExp.endDate || (exp.endDate && exp.endDate > currentExp.endDate)) {
        currentExp = exp;
      }
    }

    return currentExp.company;
  }

  getEducationLevel(): string {
    if (!this.resume?.education.length) return 'No formal education listed';

    const degrees = this.resume.education.map(edu => edu.degree.toLowerCase());
    
    if (degrees.some(d => d.includes('phd') || d.includes('doctorate'))) {
      return 'Doctorate';
    }
    
    if (degrees.some(d => d.includes('master') || d.includes('mba'))) {
      return 'Master\'s';
    }
    
    if (degrees.some(d => d.includes('bachelor') || d.includes('bs') || d.includes('ba'))) {
      return 'Bachelor\'s';
    }
    
    if (degrees.some(d => d.includes('associate'))) {
      return 'Associate';
    }
    
    return 'Other';
  }

  getTargetRoleMatch(jobTitle: string): number {
    if (!this.targetRoles.length) return 0;

    const jobTitleLower = jobTitle.toLowerCase();
    let bestMatch = 0;

    for (const targetRole of this.targetRoles) {
      const targetRoleLower = targetRole.toLowerCase();
      
      // Exact match
      if (jobTitleLower === targetRoleLower) {
        return 1.0;
      }

      // Partial match
      const words = targetRoleLower.split(' ');
      const jobWords = jobTitleLower.split(' ');
      
      let matchingWords = 0;
      for (const word of words) {
        if (jobWords.some(jobWord => jobWord.includes(word) || word.includes(jobWord))) {
          matchingWords++;
        }
      }

      const match = matchingWords / Math.max(words.length, jobWords.length);
      bestMatch = Math.max(bestMatch, match);
    }

    return bestMatch;
  }

  getIndustryMatch(jobIndustry: string): boolean {
    if (!this.industries.length) return false;
    
    const jobIndustryLower = jobIndustry.toLowerCase();
    return this.industries.some(industry => 
      industry.toLowerCase().includes(jobIndustryLower) || 
      jobIndustryLower.includes(industry.toLowerCase())
    );
  }

  getProfileCompleteness(): { percentage: number; missingFields: string[] } {
    const requiredFields = [
      { field: 'name', value: this.name },
      { field: 'experienceLevel', value: this.experienceLevel },
      { field: 'targetRoles', value: this.targetRoles.length > 0 },
      { field: 'industries', value: this.industries.length > 0 }
    ];

    const resumeFields = [
      { field: 'workExperience', value: this.resume?.workExperience.length || 0 > 0 },
      { field: 'skills', value: this.resume?.skills.length || 0 > 0 },
      { field: 'education', value: this.resume?.education.length || 0 > 0 }
    ];

    const allFields = [...requiredFields, ...resumeFields];
    const completedFields = allFields.filter(field => field.value).length;
    const percentage = Math.round((completedFields / allFields.length) * 100);

    const missingFields = allFields
      .filter(field => !field.value)
      .map(field => field.field);

    return { percentage, missingFields };
  }

  // Serialization methods
  toJSON(): UserProfile {
    return {
      name: this.name,
      resume: this.resume,
      targetRoles: this.targetRoles,
      experienceLevel: this.experienceLevel,
      industries: this.industries
    };
  }

  static fromJSON(data: any): UserProfileModel {
    // Convert date strings back to Date objects in resume data
    const profileData = { ...data };

    if (profileData.resume) {
      if (profileData.resume.workExperience) {
        profileData.resume.workExperience = profileData.resume.workExperience.map((exp: any) => ({
          ...exp,
          startDate: new Date(exp.startDate),
          endDate: exp.endDate ? new Date(exp.endDate) : undefined
        }));
      }

      if (profileData.resume.education) {
        profileData.resume.education = profileData.resume.education.map((edu: any) => ({
          ...edu,
          graduationDate: new Date(edu.graduationDate)
        }));
      }

      if (profileData.resume.projects) {
        profileData.resume.projects = profileData.resume.projects.map((project: any) => ({
          ...project,
          startDate: new Date(project.startDate),
          endDate: project.endDate ? new Date(project.endDate) : undefined
        }));
      }
    }

    return new UserProfileModel(profileData);
  }
}