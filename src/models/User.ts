import { 
  User, 
  UserProfile, 
  UserPreferences, 
  ResumeData, 
  WorkExperience, 
  Education, 
  Project 
} from '../types';

export class UserModel implements User {
  id: string;
  email: string;
  profile: UserProfile;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<User> & { email: string }) {
    this.id = data.id || this.generateId();
    this.email = data.email;
    this.profile = data.profile || this.createDefaultProfile();
    this.preferences = data.preferences || this.createDefaultPreferences();
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();

    this.validate();
  }

  private generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createDefaultProfile(): UserProfile {
    return {
      name: '',
      targetRoles: [],
      experienceLevel: 'entry',
      industries: []
    };
  }

  private createDefaultPreferences(): UserPreferences {
    return {
      feedbackStyle: 'gentle',
      questionCategories: ['technical-skills', 'problem-solving', 'communication'],
      sessionDuration: 30,
      reminderFrequency: 'weekly',
      voiceEnabled: true
    };
  }

  validate(): void {
    const errors: string[] = [];

    // Validate required fields
    if (!this.id || this.id.trim() === '') {
      errors.push('User ID is required');
    }

    if (!this.email || this.email.trim() === '') {
      errors.push('Email is required');
    } else if (!this.isValidEmail(this.email)) {
      errors.push('Invalid email format');
    }

    // Validate profile
    try {
      this.validateProfile(this.profile);
    } catch (error) {
      if (error instanceof Error) {
        errors.push(`Profile validation failed: ${error.message}`);
      }
    }

    // Validate preferences
    try {
      this.validatePreferences(this.preferences);
    } catch (error) {
      if (error instanceof Error) {
        errors.push(`Preferences validation failed: ${error.message}`);
      }
    }

    // Validate dates
    if (!(this.createdAt instanceof Date) || isNaN(this.createdAt.getTime())) {
      errors.push('Invalid createdAt date');
    }

    if (!(this.updatedAt instanceof Date) || isNaN(this.updatedAt.getTime())) {
      errors.push('Invalid updatedAt date');
    }

    if (this.createdAt > this.updatedAt) {
      errors.push('createdAt cannot be after updatedAt');
    }

    if (errors.length > 0) {
      throw new Error(`User validation failed: ${errors.join(', ')}`);
    }
  }

  private validateProfile(profile: UserProfile): void {
    const errors: string[] = [];

    // Name validation
    if (profile.name && profile.name.length > 100) {
      errors.push('Name cannot exceed 100 characters');
    }

    // Experience level validation
    const validExperienceLevels = ['entry', 'mid', 'senior', 'executive'];
    if (!validExperienceLevels.includes(profile.experienceLevel)) {
      errors.push(`Invalid experience level: ${profile.experienceLevel}`);
    }

    // Target roles validation
    if (profile.targetRoles.length > 10) {
      errors.push('Cannot have more than 10 target roles');
    }

    profile.targetRoles.forEach((role, index) => {
      if (!role || role.trim() === '') {
        errors.push(`Target role at index ${index} cannot be empty`);
      }
      if (role.length > 100) {
        errors.push(`Target role at index ${index} cannot exceed 100 characters`);
      }
    });

    // Industries validation
    if (profile.industries.length > 15) {
      errors.push('Cannot have more than 15 industries');
    }

    profile.industries.forEach((industry, index) => {
      if (!industry || industry.trim() === '') {
        errors.push(`Industry at index ${index} cannot be empty`);
      }
      if (industry.length > 50) {
        errors.push(`Industry at index ${index} cannot exceed 50 characters`);
      }
    });

    // Resume validation
    if (profile.resume) {
      this.validateResumeData(profile.resume);
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
  }

  private validatePreferences(preferences: UserPreferences): void {
    const errors: string[] = [];

    // Feedback style validation
    const validFeedbackStyles = ['gentle', 'direct', 'technical-focused', 'behavioral-focused'];
    if (!validFeedbackStyles.includes(preferences.feedbackStyle)) {
      errors.push(`Invalid feedback style: ${preferences.feedbackStyle}`);
    }

    // Question categories validation
    const validCategories = [
      'leadership', 'problem-solving', 'communication', 'teamwork',
      'technical-skills', 'domain-knowledge', 'culture-fit', 'career-goals'
    ];

    if (preferences.questionCategories.length === 0) {
      errors.push('At least one question category must be selected');
    }

    preferences.questionCategories.forEach(category => {
      if (!validCategories.includes(category)) {
        errors.push(`Invalid question category: ${category}`);
      }
    });

    // Session duration validation
    if (preferences.sessionDuration < 5 || preferences.sessionDuration > 120) {
      errors.push('Session duration must be between 5 and 120 minutes');
    }

    // Reminder frequency validation
    const validFrequencies = ['daily', 'weekly', 'custom'];
    if (!validFrequencies.includes(preferences.reminderFrequency)) {
      errors.push(`Invalid reminder frequency: ${preferences.reminderFrequency}`);
    }

    // Voice enabled validation
    if (typeof preferences.voiceEnabled !== 'boolean') {
      errors.push('voiceEnabled must be a boolean value');
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
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

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Update methods
  updateProfile(profileUpdates: Partial<UserProfile>): void {
    this.profile = { ...this.profile, ...profileUpdates };
    this.updatedAt = new Date();
    this.validate();
  }

  updatePreferences(preferencesUpdates: Partial<UserPreferences>): void {
    this.preferences = { ...this.preferences, ...preferencesUpdates };
    this.updatedAt = new Date();
    this.validate();
  }

  updateEmail(newEmail: string): void {
    this.email = newEmail;
    this.updatedAt = new Date();
    this.validate();
  }

  // Utility methods
  getFullName(): string {
    return this.profile.name || 'Anonymous User';
  }

  getExperienceYears(): number {
    if (!this.profile.resume?.workExperience.length) return 0;

    let totalMonths = 0;
    
    for (const exp of this.profile.resume.workExperience) {
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
    if (this.profile.resume?.skills) {
      this.profile.resume.skills.forEach(skill => skills.add(skill.toLowerCase()));
    }

    // Add technologies from work experience
    if (this.profile.resume?.workExperience) {
      this.profile.resume.workExperience.forEach(exp => {
        exp.technologies.forEach(tech => skills.add(tech.toLowerCase()));
      });
    }

    // Add technologies from projects
    if (this.profile.resume?.projects) {
      this.profile.resume.projects.forEach(project => {
        project.technologies.forEach(tech => skills.add(tech.toLowerCase()));
      });
    }

    return Array.from(skills);
  }

  hasSkill(skill: string): boolean {
    const allSkills = this.getAllSkills();
    return allSkills.includes(skill.toLowerCase());
  }

  getTargetRoleMatch(jobTitle: string): number {
    if (!this.profile.targetRoles.length) return 0;

    const jobTitleLower = jobTitle.toLowerCase();
    let bestMatch = 0;

    for (const targetRole of this.profile.targetRoles) {
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

  // Serialization methods
  toJSON(): User {
    return {
      id: this.id,
      email: this.email,
      profile: this.profile,
      preferences: this.preferences,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromJSON(data: any): UserModel {
    // Convert date strings back to Date objects
    const userData = {
      ...data,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
    };

    // Convert resume dates
    if (userData.profile?.resume) {
      if (userData.profile.resume.workExperience) {
        userData.profile.resume.workExperience = userData.profile.resume.workExperience.map((exp: any) => ({
          ...exp,
          startDate: new Date(exp.startDate),
          endDate: exp.endDate ? new Date(exp.endDate) : undefined
        }));
      }

      if (userData.profile.resume.education) {
        userData.profile.resume.education = userData.profile.resume.education.map((edu: any) => ({
          ...edu,
          graduationDate: new Date(edu.graduationDate)
        }));
      }

      if (userData.profile.resume.projects) {
        userData.profile.resume.projects = userData.profile.resume.projects.map((project: any) => ({
          ...project,
          startDate: new Date(project.startDate),
          endDate: project.endDate ? new Date(project.endDate) : undefined
        }));
      }
    }

    return new UserModel(userData);
  }
}