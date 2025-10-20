import React, { useState, useEffect } from 'react';
import { ResumeData } from '../../types/resume';
import { Question, UserResponse, SessionAnalysis } from '../../types';
import { EnhancedResponseAnalyzer } from '../../services/EnhancedResponseAnalyzer';
import './InterviewSessionPage.css';

interface InterviewSessionPageProps {
  resume: ResumeData;
  onSessionComplete: (analysis: SessionAnalysis) => void;
  onBack: () => void;
}

export const InterviewSessionPage: React.FC<InterviewSessionPageProps> = ({ 
  resume, 
  onSessionComplete, 
  onBack 
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<UserResponse[]>([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [loading, setLoading] = useState(true);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<Date | null>(null);

  const responseAnalyzer = new EnhancedResponseAnalyzer();

  useEffect(() => {
    generateQuestions();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sessionStarted) {
      interval = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionStarted]);

  const generateQuestions = async () => {
    try {
      setLoading(true);
      
      // Generate personalized questions based on resume
      const personalizedQuestions = generatePersonalizedQuestions(resume);
      setQuestions(personalizedQuestions);
    } catch (error) {
      console.error('Failed to generate questions:', error);
      // Fallback questions
      setQuestions(getFallbackQuestions());
    } finally {
      setLoading(false);
    }
  };

  const generatePersonalizedQuestions = (resume: ResumeData): Question[] => {
    const questions: Question[] = [];
    
    // Always start with introduction
    questions.push({
      id: '1',
      text: 'Tell me about yourself and your professional background.',
      type: 'behavioral',
      category: 'communication',
      difficulty: 1,
      expectedElements: ['background', 'experience', 'skills'],
      followUpTriggers: []
    });

    // Add experience-based question if they have work experience
    if (resume.workExperience && resume.workExperience.length > 0) {
      const latestJob = resume.workExperience[0];
      questions.push({
        id: '2',
        text: `Tell me about your experience at ${latestJob.company}. What were your main responsibilities?`,
        type: 'behavioral',
        category: 'technical-skills',
        difficulty: 2,
        expectedElements: ['responsibilities', 'achievements', 'impact'],
        followUpTriggers: []
      });
    }

    // Add skills-based question if they have skills
    if (resume.skills && resume.skills.length > 0) {
      const topSkill = resume.skills[0]?.name || 'your technical skills';
      questions.push({
        id: '3',
        text: `How would you describe your experience with ${topSkill}? Can you give me an example of how you've used it?`,
        type: 'technical',
        category: 'technical-skills',
        difficulty: 2,
        expectedElements: ['experience level', 'specific example', 'outcome'],
        followUpTriggers: []
      });
    }

    // Add challenge question
    questions.push({
      id: '4',
      text: 'Describe a challenging project or situation you faced and how you handled it.',
      type: 'behavioral',
      category: 'problem-solving',
      difficulty: 2,
      expectedElements: ['challenge', 'approach', 'outcome', 'lessons learned'],
      followUpTriggers: []
    });

    // Add motivation question
    questions.push({
      id: '5',
      text: 'What interests you most about this type of role and why do you think you\'d be a good fit?',
      type: 'behavioral',
      category: 'career-goals',
      difficulty: 1,
      expectedElements: ['motivation', 'fit', 'goals'],
      followUpTriggers: []
    });

    return questions;
  };

  const getFallbackQuestions = (): Question[] => {
    return [
      {
        id: '1',
        text: 'Tell me about yourself and your professional background.',
        type: 'behavioral',
        category: 'communication',
        difficulty: 1,
        expectedElements: ['background', 'experience', 'skills'],
        followUpTriggers: []
      },
      {
        id: '2',
        text: 'What interests you most about this type of role?',
        type: 'behavioral',
        category: 'career-goals',
        difficulty: 1,
        expectedElements: ['motivation', 'interest', 'goals'],
        followUpTriggers: []
      },
      {
        id: '3',
        text: 'Describe a challenging project you worked on and how you handled it.',
        type: 'behavioral',
        category: 'problem-solving',
        difficulty: 2,
        expectedElements: ['challenge', 'approach', 'outcome'],
        followUpTriggers: []
      }
    ];
  };

  const startSession = () => {
    setSessionStarted(true);
    setQuestionStartTime(new Date());
  };

  const submitResponse = async () => {
    if (!currentResponse.trim() || !questionStartTime) return;

    const responseTime = Date.now() - questionStartTime.getTime();
    const currentQuestion = questions[currentQuestionIndex];

    const userResponse: UserResponse = {
      id: crypto.randomUUID(),
      sessionId: crypto.randomUUID(), // Add session ID
      questionId: currentQuestion.id,
      textContent: currentResponse.trim(),
      timestamp: new Date(),
      responseTime
    };

    // Analyze response
    try {
      const analysis = await responseAnalyzer.analyzeResponse(
        userResponse,
        currentQuestion
      );
      userResponse.analysis = analysis;
    } catch (error) {
      console.error('Failed to analyze response:', error);
    }

    const updatedResponses = [...responses, userResponse];
    setResponses(updatedResponses);
    setCurrentResponse('');

    // Move to next question or complete session
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setQuestionStartTime(new Date());
    } else {
      completeSession(updatedResponses);
    }
  };

  const completeSession = (finalResponses: UserResponse[]) => {
    const sessionAnalysis: SessionAnalysis = {
      sessionId: crypto.randomUUID(),
      totalQuestions: questions.length,
      answeredQuestions: finalResponses.length,
      totalTime: sessionTime,
      averageResponseTime: finalResponses.reduce((acc, r) => acc + r.responseTime, 0) / finalResponses.length,
      overallScore: calculateOverallScore(finalResponses),
      responses: finalResponses,
      strengths: extractStrengths(finalResponses),
      improvementAreas: extractImprovementAreas(finalResponses),
      completedAt: new Date()
    };

    // Store in localStorage for demo
    localStorage.setItem('interview-coach:session-analysis', JSON.stringify(sessionAnalysis));
    
    onSessionComplete(sessionAnalysis);
  };

  const calculateOverallScore = (responses: UserResponse[]): number => {
    const scores = responses
      .map(r => r.analysis?.overallScore || 0.5)
      .filter(score => score > 0);
    
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0.5;
  };

  const extractStrengths = (responses: UserResponse[]): string[] => {
    const strengths: string[] = [];
    responses.forEach(response => {
      if (response.analysis?.strengths) {
        strengths.push(...response.analysis.strengths);
      }
    });
    return [...new Set(strengths)].slice(0, 3);
  };

  const extractImprovementAreas = (responses: UserResponse[]): string[] => {
    const improvements: string[] = [];
    responses.forEach(response => {
      if (response.analysis?.improvementSuggestions) {
        improvements.push(...response.analysis.improvementSuggestions);
      }
    });
    return [...new Set(improvements)].slice(0, 3);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  if (loading) {
    return (
      <div className="interview-session-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <h2>Preparing Your Interview</h2>
          <p>Generating personalized questions based on your resume...</p>
        </div>
      </div>
    );
  }

  if (!sessionStarted) {
    return (
      <div className="interview-session-page">
        <div className="session-intro">
          <button className="back-button" onClick={onBack}>
            ← Back to Upload
          </button>
          <div className="intro-content">
            <h1>Ready to Practice?</h1>
            <p>We've prepared {questions.length} personalized questions based on your resume.</p>
            
            <div className="session-info">
              <div className="info-item">
                <strong>Questions:</strong> {questions.length}
              </div>
              <div className="info-item">
                <strong>Estimated Time:</strong> 10-15 minutes
              </div>
              <div className="info-item">
                <strong>Format:</strong> Text responses
              </div>
            </div>

            <div className="tips">
              <h3>Tips for Success:</h3>
              <ul>
                <li>Take your time to think before responding</li>
                <li>Use specific examples from your experience</li>
                <li>Be honest and authentic in your answers</li>
                <li>Don't worry about perfect grammar - focus on content</li>
              </ul>
            </div>

            <button className="start-button" onClick={startSession}>
              Start Interview Practice
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="interview-session-page">
      <div className="session-header">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="session-stats">
          <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
          <span>Time: {formatTime(sessionTime)}</span>
        </div>
      </div>

      <div className="session-content">
        <div className="question-card">
          <div className="question-number">Question {currentQuestionIndex + 1}</div>
          <h2 className="question-text">{currentQuestion?.text}</h2>
          <div className="question-meta">
            <span className="question-type">{currentQuestion?.type}</span>
            <span className="question-category">{currentQuestion?.category}</span>
          </div>
        </div>

        <div className="response-section">
          <label htmlFor="response-input">Your Response:</label>
          <textarea
            id="response-input"
            value={currentResponse}
            onChange={(e) => setCurrentResponse(e.target.value)}
            placeholder="Type your response here... Take your time and provide specific examples."
            rows={8}
            className="response-input"
          />
          
          <div className="response-actions">
            <div className="response-stats">
              <span>{currentResponse.length} characters</span>
              <span>{currentResponse.trim().split(/\s+/).filter(w => w.length > 0).length} words</span>
            </div>
            <button 
              className="submit-button"
              onClick={submitResponse}
              disabled={!currentResponse.trim()}
            >
              {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Complete Interview'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};