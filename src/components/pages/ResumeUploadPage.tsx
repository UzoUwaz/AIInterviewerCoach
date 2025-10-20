import React, { useState, useCallback } from 'react';
import { ResumeData, SkillCategory, SkillSource } from '../../types/resume';
import { ResumeParser } from '../../services/ResumeParser';
import './ResumeUploadPage.css';

// Generate key highlights from resume data
const generateHighlights = (resume: ResumeData): string[] => {
  const highlights: string[] = [];
  
  // Highlight technical skills
  const technicalSkills = resume.skills.filter(skill => skill.category === SkillCategory.TECHNICAL);
  if (technicalSkills.length > 0) {
    const topSkills = technicalSkills.slice(0, 3).map(skill => skill.name).join(', ');
    highlights.push(`Technical expertise in ${topSkills}`);
  }
  
  // Highlight education if name suggests it
  const name = resume.personalInfo.name || '';
  if (name.toLowerCase().includes('university') || name.toLowerCase().includes('college')) {
    highlights.push('Educational background detected in profile');
  } else if (resume.rawText.toLowerCase().includes('university') || resume.rawText.toLowerCase().includes('college')) {
    highlights.push('Strong educational foundation');
  }
  
  // Highlight soft skills or leadership
  const softSkills = resume.skills.filter(skill => skill.category === SkillCategory.SOFT);
  if (softSkills.length > 0) {
    highlights.push(`Strong ${softSkills[0].name.toLowerCase()} abilities`);
  } else if (resume.rawText.toLowerCase().includes('leadership') || 
             resume.rawText.toLowerCase().includes('management') ||
             resume.rawText.toLowerCase().includes('team')) {
    highlights.push('Leadership and teamwork experience');
  }
  
  // Fallback highlights if we don't have enough
  if (highlights.length === 0) {
    highlights.push('Professional background identified');
  }
  
  if (highlights.length === 1) {
    highlights.push('Ready for personalized interview questions');
  }
  
  if (highlights.length === 2) {
    highlights.push('Comprehensive skill set for technical roles');
  }
  
  // Limit to 3 highlights
  return highlights.slice(0, 3);
};



interface ResumeUploadPageProps {
  onResumeUploaded: (resume: ResumeData) => void;
  onNext: () => void;
}

export const ResumeUploadPage: React.FC<ResumeUploadPageProps> = ({ onResumeUploaded, onNext }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedResume, setUploadedResume] = useState<ResumeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);

    try {
      // Validate file type
      const isPDF = file.type === 'application/pdf' || file.name.endsWith('.pdf');
      const isHTML = file.type.includes('html') || file.name.endsWith('.html') || file.name.endsWith('.htm');
      
      if (!isPDF && !isHTML) {
        throw new Error('Please upload a PDF or HTML file');
      }

      // Validate file size (10MB for PDF, 5MB for HTML)
      const maxSize = isPDF ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error(`File size exceeds ${isPDF ? '10MB' : '5MB'} limit`);
      }

      // Parse resume
      const parser = new ResumeParser();
      const resumeData = await parser.parseResumeFromFile(file);
      
      // Check if we got any meaningful data
      if (!resumeData.rawText || resumeData.rawText.trim().length < 10) {
        // Create a basic resume structure for demo purposes
        const fallbackResume = createFallbackResume(file.name);
        setUploadedResume(fallbackResume);
        onResumeUploaded(fallbackResume);
        localStorage.setItem('interview-coach:resume', JSON.stringify(fallbackResume));
        setError('PDF text extraction had issues, but you can still continue with the demo.');
      } else {
        setUploadedResume(resumeData);
        onResumeUploaded(resumeData);
        localStorage.setItem('interview-coach:resume', JSON.stringify(resumeData));
      }
      
    } catch (err) {
      console.error('Resume processing error:', err);
      // Create fallback resume to allow demo to continue
      const fallbackResume = createFallbackResume(file.name);
      setUploadedResume(fallbackResume);
      onResumeUploaded(fallbackResume);
      localStorage.setItem('interview-coach:resume', JSON.stringify(fallbackResume));
      setError(`PDF processing failed: ${err instanceof Error ? err.message : 'Unknown error'}. Using demo data to continue.`);
    } finally {
      setUploading(false);
    }
  };

  const createFallbackResume = (fileName: string) => {
    return {
      id: crypto.randomUUID(),
      fileName,
      rawText: 'Demo resume content - PDF extraction failed',
      personalInfo: {
        name: 'Demo User',
        email: 'demo@example.com'
      },
      workExperience: [
        {
          id: '1',
          company: 'Tech Company',
          position: 'Software Developer',
          startDate: new Date('2022-01-01'),
          current: true,
          description: 'Developed web applications using modern technologies',
          achievements: ['Built responsive web applications', 'Improved system performance'],
          skills: ['JavaScript', 'React', 'Node.js'],
          duration: '2 years'
        }
      ],
      education: [
        {
          id: '1',
          institution: 'University',
          degree: 'Bachelor of Science',
          achievements: []
        }
      ],
      skills: [
        { name: 'JavaScript', category: SkillCategory.TECHNICAL, source: SkillSource.WORK_EXPERIENCE },
        { name: 'React', category: SkillCategory.TECHNICAL, source: SkillSource.WORK_EXPERIENCE },
        { name: 'Problem Solving', category: SkillCategory.SOFT, source: SkillSource.WORK_EXPERIENCE }
      ],
      projects: [],
      certifications: [],
      languages: [],
      parsedAt: new Date()
    };
  };

  const handleContinue = () => {
    if (uploadedResume) {
      onNext();
    }
  };

  const handleDemoMode = () => {
    const demoResume = createFallbackResume('demo-resume.pdf');
    setUploadedResume(demoResume);
    onResumeUploaded(demoResume);
    localStorage.setItem('interview-coach:resume', JSON.stringify(demoResume));
  };

  return (
    <div className="resume-upload-page">
      <div className="upload-container">
        <div className="upload-header">
          <h1>Upload Your Resume</h1>
          <p>Upload your PDF resume to get personalized interview questions based on your experience and skills.</p>
        </div>

        {!uploadedResume ? (
          <div 
            className={`upload-zone ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {uploading ? (
              <div className="upload-progress">
                <div className="spinner"></div>
                <p>Processing your resume...</p>
                <small>Extracting text and analyzing your experience</small>
              </div>
            ) : (
              <>
                <div className="upload-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10,9 9,9 8,9"/>
                  </svg>
                </div>
                <h3>Drop your resume here</h3>
                <p>PDF or HTML format • Click to browse files</p>
                <input
                  type="file"
                  accept=".pdf,.html,.htm"
                  onChange={handleFileInput}
                  className="file-input"
                />
                <div className="upload-requirements">
                  <small>• PDF or HTML format</small>
                  <small>• Maximum 10MB (PDF) or 5MB (HTML)</small>
                  <small>• Text-based files work best</small>
                </div>
                <div className="demo-option">
                  <button 
                    type="button" 
                    className="demo-button"
                    onClick={handleDemoMode}
                  >
                    Try Demo Without Upload
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="upload-success">
            <div className="success-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
            </div>
            <h3>Resume Processed Successfully!</h3>
            <div className="resume-summary">
              <div className="summary-item">
                <strong>Key Highlights:</strong>
                <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                  {generateHighlights(uploadedResume).map((highlight, index) => (
                    <li key={index} style={{ marginBottom: '4px' }}>{highlight}</li>
                  ))}
                </ul>
              </div>
            </div>
            <button className="continue-button" onClick={handleContinue}>
              Start Interview Practice
            </button>
          </div>
        )}

        {error && (
          <div className={`error-message ${uploadedResume ? 'warning' : 'error'}`}>
            <div className="error-icon">{uploadedResume ? '⚠️' : '❌'}</div>
            <div>
              <strong>{uploadedResume ? 'Notice' : 'Upload Failed'}</strong>
              <p>{error}</p>
              {uploadedResume && (
                <small>The demo will continue with sample data.</small>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};