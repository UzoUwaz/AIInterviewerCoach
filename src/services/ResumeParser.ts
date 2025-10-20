import nlp from 'compromise';
import { 
  ResumeData, 
  PersonalInfo, 
  WorkExperience, 
  Education, 
  ResumeSkill, 
  Project, 
  Certification, 
  Language,
  SkillCategory,
  SkillProficiency,
  SkillSource,
  LanguageProficiency,
  ResumeParsingOptions,
  GapAnalysis,
  SkillGap,
  ResumeJobMatch,
  MatchLevel
} from '../types/resume';
import { JobDescriptionData } from '../types/parsing';
import { TECHNICAL_SKILLS, SOFT_SKILLS } from '../data/skillDictionaries';
import { PDFExtractor } from '../utils/pdfExtractor';
import { HTMLExtractor } from '../utils/htmlExtractor';

export class ResumeParser {
  private readonly emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  private readonly phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/;
  private readonly linkedInRegex = /(?:linkedin\.com\/in\/|linkedin\.com\/profile\/view\?id=)([a-zA-Z0-9-]+)/i;
  private readonly githubRegex = /(?:github\.com\/)([a-zA-Z0-9-]+)/i;
  private readonly urlRegex = /https?:\/\/[^\s]+/g;

  async parseResumeFromFile(file: File, options: ResumeParsingOptions = {}): Promise<ResumeData> {
    let extractionResult: { text: string; error?: string };

    // Determine file type and use appropriate extractor
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      console.log('📄 Parsing PDF file...');
      extractionResult = await PDFExtractor.extractTextFromFile(file);
    } else if (file.type.includes('html') || file.name.endsWith('.html') || file.name.endsWith('.htm')) {
      console.log('🌐 Parsing HTML file...');
      extractionResult = await HTMLExtractor.extractTextFromFile(file);
    } else {
      throw new Error(`Unsupported file type: ${file.type}. Please upload PDF or HTML files.`);
    }
    
    if (extractionResult.error) {
      throw new Error(`File extraction failed: ${extractionResult.error}`);
    }

    if (!extractionResult.text || extractionResult.text.trim().length < 10) {
      throw new Error('No text content found in file. Please ensure the file contains readable text.');
    }

    return this.parseResumeFromText(extractionResult.text, {
      ...options,
      fileName: file.name
    });
  }

  async parseResumeFromText(rawText: string, options: ResumeParsingOptions & { fileName?: string } = {}): Promise<ResumeData> {
    console.log('🔍 Starting resume parsing...');
    console.log('📄 Raw text preview:', rawText.substring(0, 300));
    
    const doc = nlp(rawText);
    
    // Extract skills from the text using NLP for question generation
    const extractedSkills = this.extractSkillsFromText(rawText);
    
    const resumeData: ResumeData = {
      id: this.generateId(),
      fileName: options.fileName,
      rawText,
      personalInfo: this.extractPersonalInfo(rawText, doc),
      workExperience: [], // Simplified - no work experience parsing
      education: [], // Simplified - no education parsing  
      skills: extractedSkills, // Keep skills for question generation
      projects: [],
      certifications: [],
      languages: [],
      summary: undefined,
      parsedAt: new Date()
    };

    console.log('✅ Resume parsing complete:', {
      name: resumeData.personalInfo.name,
      skillsFound: resumeData.skills.length
    });

    return resumeData;
  }

  private extractPersonalInfo(rawText: string, doc: any): PersonalInfo {
    const lines = rawText.split('\n').slice(0, 10); // Check first 10 lines
    const firstSection = lines.join('\n');

    return {
      name: this.extractName(firstSection, doc),
      email: this.extractEmail(firstSection),
      phone: this.extractPhone(firstSection),
      location: this.extractLocation(firstSection, doc),
      linkedIn: this.extractLinkedIn(firstSection),
      github: this.extractGitHub(firstSection),
      website: this.extractWebsite(firstSection)
    };
  }

  private extractName(text: string, doc: any): string | undefined {
    console.log('📝 Starting name extraction...');
    console.log('📝 Text preview:', text.substring(0, 500));
    
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    // Strategy 1: Look for all-caps names (most common in resumes)
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i].trim();
      
      // Skip lines with obvious non-name indicators
      if (line.includes('@') || 
          line.includes('http') || 
          line.includes('www') ||
          /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(line) || // phone numbers
          line.toLowerCase().includes('resume') ||
          line.toLowerCase().includes('curriculum') ||
          line.toLowerCase().includes('cv')) {
        console.log('📝 Skipping line (contains non-name content):', line);
        continue;
      }
      
      // Look for all-caps names like "UZOMA D. UWAZURIKE"
      if (/^[A-Z\s\.]{4,50}$/.test(line)) {
        const words = line.split(/\s+/).filter(w => w.length > 0);
        if (words.length >= 2 && words.length <= 5) {
          // Check if all words look like name parts
          const isValidName = words.every(word => 
            /^[A-Z]+\.?$/.test(word) && word.length >= 1
          );
          
          if (isValidName) {
            console.log('📝 ✅ Found all-caps name:', line);
            return line;
          }
        }
      }
    }
    
    // Strategy 2: Look for proper case names
    for (let i = 0; i < Math.min(lines.length, 8); i++) {
      const line = lines[i].trim();
      
      if (line.includes('@') || line.includes('http') || /\d/.test(line)) {
        continue;
      }
      
      const words = line.split(/\s+/).filter(w => w.length > 0);
      if (words.length >= 2 && words.length <= 4) {
        const isProperName = words.every(word => 
          /^[A-Z][a-z]+$/.test(word) ||     // "John", "Smith"
          /^[A-Z]\.?$/.test(word)           // "D.", "J"
        );
        
        if (isProperName && line.length >= 5 && line.length <= 50) {
          console.log('📝 ✅ Found proper case name:', line);
          return line;
        }
      }
    }
    
    // Strategy 3: Use NLP to find person names
    try {
      const people = doc.people().out('array');
      if (people && people.length > 0) {
        const name = people[0];
        if (name && name.length >= 4 && name.length <= 50) {
          console.log('📝 ✅ Found name via NLP:', name);
          return name;
        }
      }
    } catch (error) {
      console.warn('📝 NLP extraction failed:', error);
    }
    
    // Strategy 4: Look for any capitalized words that could be names
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const line = lines[i].trim();
      
      if (line.includes('@') || line.includes('http')) continue;
      
      // Look for patterns like "First Last" or "First Middle Last"
      const nameMatch = line.match(/\b([A-Z][a-z]+(?:\s+[A-Z]\.?\s*)?[A-Z][a-z]+)\b/);
      if (nameMatch && nameMatch[1].length >= 5) {
        console.log('📝 ✅ Found name via pattern matching:', nameMatch[1]);
        return nameMatch[1];
      }
    }

    console.log('📝 ❌ No name found in resume');
    return undefined;
  }

  private extractEmail(text: string): string | undefined {
    const match = text.match(this.emailRegex);
    return match ? match[0] : undefined;
  }

  private extractPhone(text: string): string | undefined {
    const match = text.match(this.phoneRegex);
    return match ? match[0] : undefined;
  }

  private extractLocation(text: string, doc: any): string | undefined {
    const places = doc.places().text();
    if (places) return places;

    // Look for location patterns
    const locationPatterns = [
      /([A-Z][a-z]+,\s*[A-Z]{2})/,
      /([A-Z][a-z]+\s*,\s*[A-Z][a-z]+)/
    ];

    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }

    return undefined;
  }

  private extractLinkedIn(text: string): string | undefined {
    const match = text.match(this.linkedInRegex);
    return match ? `https://linkedin.com/in/${match[1]}` : undefined;
  }

  private extractGitHub(text: string): string | undefined {
    const match = text.match(this.githubRegex);
    return match ? `https://github.com/${match[1]}` : undefined;
  }

  private extractWebsite(text: string): string | undefined {
    const urls = text.match(this.urlRegex);
    if (!urls) return undefined;

    // Filter out LinkedIn and GitHub URLs
    const websites = urls.filter(url => 
      !url.includes('linkedin.com') && 
      !url.includes('github.com') &&
      !url.includes('mailto:')
    );

    return websites[0];
  }

  private extractWorkExperience(rawText: string, doc: any): WorkExperience[] {
    console.log('💼 Starting work experience extraction...');
    
    const lines = rawText.split('\n');
    const experiences: WorkExperience[] = [];
    
    // Common company/position patterns
    const companyPatterns = [
      /([A-Z][a-zA-Z\s&]+(?:Inc|LLC|Corp|Company|Corporation|Ltd|Limited))/gi,
      /([A-Z][a-zA-Z\s&]+(?:Technologies|Tech|Systems|Solutions|Services))/gi,
      /(Google|Microsoft|Apple|Amazon|Facebook|Meta|Netflix|Tesla|Uber|Airbnb)/gi,
      /(IBM|Oracle|Salesforce|Adobe|Intel|NVIDIA|AMD)/gi
    ];
    
    const positionPatterns = [
      /(Software Engineer|Developer|Programmer)/gi,
      /(Product Manager|Project Manager|Program Manager)/gi,
      /(Data Scientist|Data Analyst|Business Analyst)/gi,
      /(Designer|UX Designer|UI Designer)/gi,
      /(Consultant|Advisor|Specialist)/gi,
      /(Intern|Internship)/gi,
      /(Senior|Lead|Principal|Staff|Director|VP|CTO|CEO)/gi
    ];
    
    const foundCompanies = new Set<string>();
    const foundPositions = new Set<string>();
    
    // Extract companies
    for (const line of lines) {
      for (const pattern of companyPatterns) {
        const matches = line.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const cleaned = match.trim();
            if (cleaned.length > 3 && !cleaned.toLowerCase().includes('university')) {
              foundCompanies.add(cleaned);
              console.log('💼 Found company:', cleaned);
            }
          });
        }
      }
      
      // Extract positions
      for (const pattern of positionPatterns) {
        const matches = line.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const cleaned = match.trim();
            if (cleaned.length > 3) {
              foundPositions.add(cleaned);
              console.log('💼 Found position:', cleaned);
            }
          });
        }
      }
    }
    
    // Look for date patterns to identify work periods
    const datePatterns = [
      /(\d{4})\s*[-–]\s*(\d{4}|present|current)/gi,
      /(\w+\s+\d{4})\s*[-–]\s*(\w+\s+\d{4}|present|current)/gi
    ];
    
    const workPeriods: string[] = [];
    for (const line of lines) {
      for (const pattern of datePatterns) {
        const matches = line.match(pattern);
        if (matches) {
          matches.forEach(match => {
            workPeriods.push(match.trim());
            console.log('💼 Found work period:', match.trim());
          });
        }
      }
    }
    
    // Create work experience entries
    const companies = Array.from(foundCompanies);
    const positions = Array.from(foundPositions);
    
    if (companies.length > 0 || positions.length > 0) {
      const maxEntries = Math.max(companies.length, positions.length, 1);
      
      for (let i = 0; i < Math.min(maxEntries, 5); i++) { // Limit to 5 entries
        const company = companies[i] || companies[0] || 'Company';
        const position = positions[i] || positions[0] || 'Position';
        
        experiences.push({
          id: this.generateId(),
          company,
          position,
          current: i === 0, // Assume first entry is current
          description: `${position} at ${company}`,
          achievements: [],
          skills: [],
          duration: workPeriods[i] || 'Duration not specified'
        });
      }
    }
    
    console.log('💼 Final experience entries:', experiences.length);
    return experiences;
  }

  private parseExperienceBlock(block: string): WorkExperience | null {
    const lines = block.split('\n').filter(line => line.trim().length > 0);
    if (lines.length < 2) return null;

    // First line usually contains position and company
    const firstLine = lines[0].trim();
    const { position, company } = this.parsePositionCompany(firstLine);

    if (!position || !company) return null;

    // Second line often contains dates
    const dates = this.extractDates(lines[1]);
    
    // Rest is description
    const description = lines.slice(2).join('\n').trim();
    const achievements = this.extractAchievements(description);
    const skills = this.extractSkillsFromText(description);

    return {
      id: this.generateId(),
      company,
      position,
      startDate: dates.start,
      endDate: dates.end,
      current: dates.current,
      description,
      achievements,
      skills: skills.map(s => s.name),
      duration: this.calculateDuration(dates.start, dates.end, dates.current)
    };
  }

  private parsePositionCompany(line: string): { position?: string; company?: string } {
    // Common patterns: "Position at Company", "Position | Company", "Position - Company"
    const patterns = [
      /^(.+?)\s+at\s+(.+)$/i,
      /^(.+?)\s*\|\s*(.+)$/,
      /^(.+?)\s*-\s*(.+)$/,
      /^(.+?)\s*,\s*(.+)$/
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        return {
          position: match[1].trim(),
          company: match[2].trim()
        };
      }
    }

    // If no pattern matches, assume the whole line is the position
    return { position: line.trim() };
  }

  private extractDates(text: string): { start?: Date; end?: Date; current: boolean } {
    const currentKeywords = ['present', 'current', 'now', 'ongoing'];
    const isCurrent = currentKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );

    // Date patterns
    const datePatterns = [
      /(\w+\s+\d{4})\s*[-–]\s*(\w+\s+\d{4})/,
      /(\d{1,2}\/\d{4})\s*[-–]\s*(\d{1,2}\/\d{4})/,
      /(\d{4})\s*[-–]\s*(\d{4})/
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          start: this.parseDate(match[1]),
          end: isCurrent ? undefined : this.parseDate(match[2]),
          current: isCurrent
        };
      }
    }

    return { current: isCurrent };
  }

  private parseDate(dateStr: string): Date | undefined {
    try {
      // Handle various date formats
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? undefined : date;
    } catch {
      return undefined;
    }
  }

  private calculateDuration(start?: Date, end?: Date, current: boolean = false): string | undefined {
    if (!start) return undefined;

    const endDate = current ? new Date() : end;
    if (!endDate) return undefined;

    const months = (endDate.getFullYear() - start.getFullYear()) * 12 + 
                   (endDate.getMonth() - start.getMonth());

    if (months < 12) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      
      let duration = `${years} year${years !== 1 ? 's' : ''}`;
      if (remainingMonths > 0) {
        duration += ` ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
      }
      
      return duration;
    }
  }

  private extractEducation(rawText: string, doc: any): Education[] {
    console.log('🎓 Starting education extraction...');
    
    // Look for education patterns throughout the text
    const lines = rawText.split('\n');
    const educations: Education[] = [];
    
    // Common university/college patterns
    const universityPatterns = [
      /([A-Z][a-zA-Z\s]+University)/gi,
      /([A-Z][a-zA-Z\s]+College)/gi,
      /([A-Z][a-zA-Z\s]+Institute)/gi,
      /(Howard University)/gi,
      /(Duke University)/gi,
      /(Harvard University)/gi,
      /(Stanford University)/gi,
      /(MIT)/gi
    ];
    
    // Degree patterns
    const degreePatterns = [
      /(Bachelor[^,\n]*)/gi,
      /(Master[^,\n]*)/gi,
      /(PhD[^,\n]*)/gi,
      /(Doctorate[^,\n]*)/gi,
      /(B\.?S\.?[^,\n]*)/gi,
      /(B\.?A\.?[^,\n]*)/gi,
      /(M\.?S\.?[^,\n]*)/gi,
      /(M\.?A\.?[^,\n]*)/gi,
      /(MBA[^,\n]*)/gi
    ];
    
    const foundInstitutions = new Set<string>();
    const foundDegrees = new Set<string>();
    
    // Extract universities/colleges
    for (const line of lines) {
      for (const pattern of universityPatterns) {
        const matches = line.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const cleaned = match.trim();
            if (cleaned.length > 3) {
              foundInstitutions.add(cleaned);
              console.log('🎓 Found institution:', cleaned);
            }
          });
        }
      }
      
      // Extract degrees
      for (const pattern of degreePatterns) {
        const matches = line.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const cleaned = match.trim();
            if (cleaned.length > 2) {
              foundDegrees.add(cleaned);
              console.log('🎓 Found degree:', cleaned);
            }
          });
        }
      }
    }
    
    // Create education entries
    const institutions = Array.from(foundInstitutions);
    const degrees = Array.from(foundDegrees);
    
    if (institutions.length > 0 || degrees.length > 0) {
      // If we have both institutions and degrees, try to pair them
      if (institutions.length > 0 && degrees.length > 0) {
        const maxEntries = Math.max(institutions.length, degrees.length);
        for (let i = 0; i < maxEntries; i++) {
          educations.push({
            id: this.generateId(),
            institution: institutions[i] || institutions[0] || 'University',
            degree: degrees[i] || degrees[0] || 'Degree',
            achievements: []
          });
        }
      } else if (institutions.length > 0) {
        // Only institutions found
        institutions.forEach(institution => {
          educations.push({
            id: this.generateId(),
            institution,
            degree: 'Degree',
            achievements: []
          });
        });
      } else if (degrees.length > 0) {
        // Only degrees found
        degrees.forEach(degree => {
          educations.push({
            id: this.generateId(),
            institution: 'University',
            degree,
            achievements: []
          });
        });
      }
    }
    
    console.log('🎓 Final education entries:', educations.length);
    return educations;
  }

  private parseEducationBlock(block: string): Education | null {
    const lines = block.split('\n').filter(line => line.trim().length > 0);
    if (lines.length < 1) return null;

    const firstLine = lines[0].trim();
    const { degree, institution } = this.parseDegreeInstitution(firstLine);

    if (!degree && !institution) return null;

    const dates = lines.length > 1 ? this.extractDates(lines[1]) : { current: false };
    const achievements = this.extractAchievements(block);

    return {
      id: this.generateId(),
      institution: institution || 'Unknown Institution',
      degree: degree || 'Unknown Degree',
      startDate: dates.start,
      endDate: dates.end,
      achievements
    };
  }

  private parseDegreeInstitution(line: string): { degree?: string; institution?: string } {
    // Common patterns for education
    const patterns = [
      /^(.+?)\s+at\s+(.+)$/i,
      /^(.+?)\s*,\s*(.+)$/,
      /^(.+?)\s*-\s*(.+)$/
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        return {
          degree: match[1].trim(),
          institution: match[2].trim()
        };
      }
    }

    // Check if it looks more like an institution or degree
    const degreeKeywords = ['bachelor', 'master', 'phd', 'doctorate', 'certificate', 'diploma'];
    const hasDegreKeyword = degreeKeywords.some(keyword => 
      line.toLowerCase().includes(keyword)
    );

    if (hasDegreKeyword) {
      return { degree: line.trim() };
    } else {
      return { institution: line.trim() };
    }
  }

  private extractSkills(rawText: string, confidenceThreshold: number): ResumeSkill[] {
    const allSkills = { ...TECHNICAL_SKILLS, ...SOFT_SKILLS };
    const foundSkills: ResumeSkill[] = [];
    const lowerText = rawText.toLowerCase();

    // Extract skills from different sections
    const sections = this.extractSections(rawText);
    const skillsSection = sections.skills || '';
    const experienceSection = sections.experience || sections.work || '';
    const projectsSection = sections.projects || '';

    for (const [skillName, skillData] of Object.entries(allSkills)) {
      let mentions = 0;
      let source = SkillSource.EXPLICIT;
      
      // Check main skill name and aliases
      const skillVariants = [skillName, ...skillData.aliases];
      
      for (const variant of skillVariants) {
        // Escape special regex characters to handle skills like C++, C#, etc.
        const escapedVariant = variant.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        try {
          const regex = new RegExp(`\\b${escapedVariant}\\b`, 'g');
          const matches = lowerText.match(regex);
          if (matches) {
            mentions += matches.length;
          }
        } catch (error) {
          // If regex still fails, fall back to simple string matching
          console.warn(`Regex failed for skill: ${variant}, using simple match`);
          const simpleMatches = lowerText.split(variant.toLowerCase()).length - 1;
          if (simpleMatches > 0) {
            mentions += simpleMatches;
          }
        }
      }

      if (mentions > 0) {
        // Determine source
        if (skillsSection && skillVariants.some(v => skillsSection.toLowerCase().includes(v.toLowerCase()))) {
          source = SkillSource.EXPLICIT;
        } else if (experienceSection && skillVariants.some(v => experienceSection.toLowerCase().includes(v.toLowerCase()))) {
          source = SkillSource.WORK_EXPERIENCE;
        } else if (projectsSection && skillVariants.some(v => projectsSection.toLowerCase().includes(v.toLowerCase()))) {
          source = SkillSource.PROJECTS;
        }

        const confidence = Math.min(mentions * skillData.weight * 0.3, 1.0);
        
        if (confidence >= confidenceThreshold) {
          foundSkills.push({
            name: skillName,
            category: skillData.category,
            proficiency: this.estimateProficiency(mentions, source),
            source,
            yearsOfExperience: this.estimateExperience(rawText, skillName)
          });
        }
      }
    }

    return foundSkills.sort((a, b) => (b.yearsOfExperience || 0) - (a.yearsOfExperience || 0));
  }

  private estimateProficiency(mentions: number, source: SkillSource): SkillProficiency {
    if (source === SkillSource.WORK_EXPERIENCE && mentions >= 3) {
      return SkillProficiency.ADVANCED;
    } else if (mentions >= 2) {
      return SkillProficiency.INTERMEDIATE;
    } else {
      return SkillProficiency.BEGINNER;
    }
  }

  private estimateExperience(text: string, skill: string): number | undefined {
    // Look for patterns like "5 years of JavaScript experience"
    const experiencePatterns = [
      new RegExp(`(\\d+)\\s+years?\\s+(?:of\\s+)?${skill}`, 'i'),
      new RegExp(`${skill}\\s+(?:for\\s+)?(\\d+)\\s+years?`, 'i'),
      new RegExp(`(\\d+)\\+?\\s+years?\\s+(?:experience\\s+)?(?:with\\s+)?${skill}`, 'i')
    ];

    for (const pattern of experiencePatterns) {
      const match = text.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }

    return undefined;
  }

  private extractProjects(rawText: string, doc: any): Project[] {
    const sections = this.extractSections(rawText);
    const projectsSection = sections.projects || '';
    
    if (!projectsSection) return [];

    const projects: Project[] = [];
    const projectBlocks = this.splitIntoBlocks(projectsSection);

    for (const block of projectBlocks) {
      const project = this.parseProjectBlock(block);
      if (project) {
        projects.push(project);
      }
    }

    return projects;
  }

  private parseProjectBlock(block: string): Project | null {
    const lines = block.split('\n').filter(line => line.trim().length > 0);
    if (lines.length < 1) return null;

    const name = lines[0].trim();
    const description = lines.slice(1).join('\n').trim();
    const technologies = this.extractSkillsFromText(description).map(s => s.name);
    const achievements = this.extractAchievements(description);
    const url = this.extractWebsite(description);

    return {
      id: this.generateId(),
      name,
      description,
      technologies,
      achievements,
      url
    };
  }

  private extractCertifications(rawText: string, doc: any): Certification[] {
    const sections = this.extractSections(rawText);
    const certSection = sections.certifications || sections.certificates || '';
    
    if (!certSection) return [];

    const certifications: Certification[] = [];
    const certBlocks = this.splitIntoBlocks(certSection);

    for (const block of certBlocks) {
      const cert = this.parseCertificationBlock(block);
      if (cert) {
        certifications.push(cert);
      }
    }

    return certifications;
  }

  private parseCertificationBlock(block: string): Certification | null {
    const lines = block.split('\n').filter(line => line.trim().length > 0);
    if (lines.length < 1) return null;

    const firstLine = lines[0].trim();
    const { name, issuer } = this.parseCertificationName(firstLine);

    if (!name) return null;

    return {
      id: this.generateId(),
      name,
      issuer: issuer || 'Unknown Issuer'
    };
  }

  private parseCertificationName(line: string): { name?: string; issuer?: string } {
    const patterns = [
      /^(.+?)\s+by\s+(.+)$/i,
      /^(.+?)\s+-\s+(.+)$/,
      /^(.+?)\s+\((.+?)\)$/
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        return {
          name: match[1].trim(),
          issuer: match[2].trim()
        };
      }
    }

    return { name: line.trim() };
  }

  private extractLanguages(rawText: string, doc: any): Language[] {
    const sections = this.extractSections(rawText);
    const languageSection = sections.languages || '';
    
    if (!languageSection) return [];

    const languages: Language[] = [];
    const lines = languageSection.split('\n').filter(line => line.trim().length > 0);

    for (const line of lines) {
      const language = this.parseLanguageLine(line);
      if (language) {
        languages.push(language);
      }
    }

    return languages;
  }

  private parseLanguageLine(line: string): Language | null {
    const proficiencyKeywords = {
      [LanguageProficiency.NATIVE]: ['native', 'mother tongue', 'first language'],
      [LanguageProficiency.FLUENT]: ['fluent', 'proficient', 'advanced'],
      [LanguageProficiency.CONVERSATIONAL]: ['conversational', 'intermediate'],
      [LanguageProficiency.BASIC]: ['basic', 'beginner', 'elementary']
    };

    const lowerLine = line.toLowerCase();
    let proficiency = LanguageProficiency.CONVERSATIONAL; // default

    for (const [level, keywords] of Object.entries(proficiencyKeywords)) {
      if (keywords.some(keyword => lowerLine.includes(keyword))) {
        proficiency = level as LanguageProficiency;
        break;
      }
    }

    // Extract language name (remove proficiency indicators)
    let name = line.trim();
    for (const keywords of Object.values(proficiencyKeywords)) {
      for (const keyword of keywords) {
        name = name.replace(new RegExp(keyword, 'gi'), '').trim();
      }
    }

    // Clean up common separators
    name = name.replace(/[:\-\(\)]/g, '').trim();

    if (name.length < 2) return null;

    return { name, proficiency };
  }

  private extractSummary(rawText: string, doc: any): string | undefined {
    const sections = this.extractSections(rawText);
    const summarySection = sections.summary || sections.objective || sections.profile || '';
    
    if (summarySection && summarySection.length > 50) {
      return summarySection.trim();
    }

    return undefined;
  }

  private extractSections(rawText: string): Record<string, string> {
    const sectionKeywords = {
      experience: ['experience', 'work experience', 'employment', 'professional experience', 'work history', 'career history'],
      work: ['work', 'employment history', 'career'],
      education: ['education', 'academic background', 'qualifications', 'academic', 'university', 'college'],
      skills: ['skills', 'technical skills', 'core competencies', 'expertise', 'competencies', 'technologies'],
      projects: ['projects', 'personal projects', 'side projects'],
      certifications: ['certifications', 'certificates', 'credentials'],
      certificates: ['certificates', 'certifications'],
      languages: ['languages', 'language skills'],
      summary: ['summary', 'profile', 'about', 'overview', 'objective'],
      objective: ['objective', 'career objective'],
      profile: ['profile', 'professional profile']
    };

    const sections: Record<string, string> = {};
    const lines = rawText.split('\n');
    let currentSection = 'general';
    let currentContent: string[] = [];

    console.log('📋 Extracting sections from resume...');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim().toLowerCase();
      
      // Check if this line is a section header
      let foundSection = false;
      for (const [sectionName, keywords] of Object.entries(sectionKeywords)) {
        if (keywords.some(keyword => {
          // More flexible matching - check if keyword is in the line and line is relatively short
          return trimmedLine.includes(keyword) && 
                 trimmedLine.length < 100 && 
                 trimmedLine.length > 0;
        })) {
          // Save previous section
          if (currentContent.length > 0) {
            sections[currentSection] = currentContent.join('\n');
            console.log(`📋 Found section '${currentSection}' with ${currentContent.length} lines`);
          }
          
          currentSection = sectionName;
          currentContent = [];
          foundSection = true;
          console.log(`📋 Starting new section: '${sectionName}' at line ${i + 1}`);
          break;
        }
      }

      if (!foundSection) {
        currentContent.push(line);
      }
    }

    // Save the last section
    if (currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n');
      console.log(`📋 Final section '${currentSection}' with ${currentContent.length} lines`);
    }

    console.log('📋 Sections found:', Object.keys(sections));
    return sections;
  }

  private splitIntoBlocks(text: string): string[] {
    // Split by double newlines or clear separators
    const blocks = text.split(/\n\s*\n/).filter(block => block.trim().length > 0);
    
    if (blocks.length === 0) {
      // Fallback: split by single newlines and group
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      const groupedBlocks: string[] = [];
      let currentBlock: string[] = [];

      for (const line of lines) {
        if (line.trim().length === 0) {
          if (currentBlock.length > 0) {
            groupedBlocks.push(currentBlock.join('\n'));
            currentBlock = [];
          }
        } else {
          currentBlock.push(line);
        }
      }

      if (currentBlock.length > 0) {
        groupedBlocks.push(currentBlock.join('\n'));
      }

      return groupedBlocks;
    }

    return blocks;
  }

  private extractAchievements(text: string): string[] {
    const achievementPatterns = [
      /^[\s]*[•\-\*]\s*(.+)$/gm,
      /^[\s]*\d+[\.\)]\s*(.+)$/gm,
      /achieved\s+(.+)/gi,
      /improved\s+(.+)/gi,
      /increased\s+(.+)/gi,
      /reduced\s+(.+)/gi,
      /led\s+(.+)/gi
    ];

    const achievements: string[] = [];
    
    for (const pattern of achievementPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].trim().length > 10) {
          achievements.push(match[1].trim());
        }
      }
    }

    return [...new Set(achievements)].slice(0, 5); // Remove duplicates and limit
  }

  private extractSkillsFromText(text: string): ResumeSkill[] {
    console.log('🔧 Extracting skills using NLP...');
    
    const doc = nlp(text);
    const skills: ResumeSkill[] = [];
    
    // Common technical skills to look for
    const commonSkills = [
      'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'HTML', 'CSS', 
      'SQL', 'MongoDB', 'PostgreSQL', 'Git', 'Docker', 'AWS', 'Azure',
      'TypeScript', 'Angular', 'Vue', 'Express', 'Django', 'Flask',
      'Machine Learning', 'Data Science', 'Analytics', 'Leadership',
      'Project Management', 'Communication', 'Problem Solving',
      'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin'
    ];
    
    const lowerText = text.toLowerCase();
    
    // Find skills mentioned in the text
    for (const skill of commonSkills) {
      const skillLower = skill.toLowerCase();
      if (lowerText.includes(skillLower)) {
        skills.push({
          name: skill,
          category: this.categorizeSkill(skill),
          proficiency: SkillProficiency.INTERMEDIATE,
          source: SkillSource.EXPLICIT
        });
        console.log('🔧 Found skill:', skill);
      }
    }
    
    // Use NLP to find additional technical terms
    try {
      const nouns = doc.nouns().out('array');
      const techTerms = nouns.filter((noun: string) => 
        noun.length > 2 && 
        /^[A-Z]/.test(noun) && // Starts with capital
        !['The', 'This', 'That', 'University', 'College', 'Company'].includes(noun)
      );
      
      for (const term of techTerms.slice(0, 10)) { // Limit to 10 additional terms
        if (!skills.find(s => s.name.toLowerCase() === term.toLowerCase())) {
          skills.push({
            name: term,
            category: SkillCategory.TECHNICAL,
            proficiency: SkillProficiency.BEGINNER,
            source: SkillSource.WORK_EXPERIENCE
          });
          console.log('🔧 Found additional term:', term);
        }
      }
    } catch (error) {
      console.warn('NLP skill extraction failed:', error);
    }
    
    console.log('🔧 Total skills found:', skills.length);
    return skills.slice(0, 15); // Limit to 15 skills
  }
  
  private categorizeSkill(skill: string): SkillCategory {
    const technicalKeywords = ['JavaScript', 'Python', 'Java', 'React', 'Node', 'HTML', 'CSS', 'SQL', 'MongoDB', 'Git', 'Docker', 'AWS', 'Azure'];
    const softKeywords = ['Leadership', 'Communication', 'Problem Solving', 'Project Management'];
    
    if (technicalKeywords.some(keyword => skill.toLowerCase().includes(keyword.toLowerCase()))) {
      return SkillCategory.TECHNICAL;
    } else if (softKeywords.some(keyword => skill.toLowerCase().includes(keyword.toLowerCase()))) {
      return SkillCategory.SOFT;
    } else {
      return SkillCategory.TECHNICAL; // Default to technical
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Gap analysis methods
  async analyzeGaps(resume: ResumeData, jobDescription: JobDescriptionData): Promise<GapAnalysis> {
    const resumeSkills = resume.skills.map(s => s.name.toLowerCase());
    const jobSkills = jobDescription.skills.map(s => s.toLowerCase());
    
    const missingSkills = jobSkills.filter(skill => !resumeSkills.includes(skill));
    const matchedSkills = jobSkills.filter(skill => resumeSkills.includes(skill));
    
    const overallMatch = jobSkills.length > 0 ? matchedSkills.length / jobSkills.length : 0;
    
    const skillGaps: SkillGap[] = jobSkills.map(skill => {
      const hasSkill = resumeSkills.includes(skill);
      return {
        requiredSkill: skill,
        hasSkill,
        importance: 1.0, // Could be enhanced with skill importance scoring
        suggestions: hasSkill ? [] : [`Consider gaining experience with ${skill}`]
      };
    });

    const recommendations = this.generateRecommendations(resume, jobDescription, missingSkills);

    return {
      missingSkills,
      weakAreas: missingSkills.slice(0, 5),
      strengths: matchedSkills,
      recommendations,
      overallMatch,
      skillGaps
    };
  }

  private generateRecommendations(resume: ResumeData, job: JobDescriptionData, missingSkills: string[]): string[] {
    const recommendations: string[] = [];

    if (missingSkills.length > 0) {
      recommendations.push(`Focus on developing skills in: ${missingSkills.slice(0, 3).join(', ')}`);
    }

    if (resume.workExperience.length === 0) {
      recommendations.push('Consider adding relevant work experience or internships');
    }

    if (resume.projects.length === 0) {
      recommendations.push('Add personal or professional projects to demonstrate your skills');
    }

    if (!resume.summary) {
      recommendations.push('Add a professional summary to highlight your key qualifications');
    }

    return recommendations;
  }
}