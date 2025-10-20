import React, { useState } from 'react';
import { SessionAnalysis } from '../../types';
import './ResultsPage.css';

interface ResultsPageProps {
  analysis: SessionAnalysis;
  onStartNew: () => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({ analysis, onStartNew }) => {
  const [expandedResponses, setExpandedResponses] = useState<Set<string>>(new Set());

  const toggleResponse = (responseId: string) => {
    const newExpanded = new Set(expandedResponses);
    if (newExpanded.has(responseId)) {
      newExpanded.delete(responseId);
    } else {
      newExpanded.add(responseId);
    }
    setExpandedResponses(newExpanded);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatResponseTime = (ms: number): string => {
    return `${Math.round(ms / 1000)}s`;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return '#10b981'; // green
    if (score >= 0.6) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Fair';
    return 'Needs Improvement';
  };

  // Ensure score is between 0-100 (handle both 0-1 and 0-100 scales)
  const normalizedScore = analysis.overallScore > 1 ? analysis.overallScore : analysis.overallScore * 100;
  const overallScorePercentage = Math.min(100, Math.max(0, Math.round(normalizedScore)));

  return (
    <div className="results-page">
      <div className="results-container">
        <div className="results-header">
          <div className="completion-badge">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22,4 12,14.01 9,11.01"/>
            </svg>
          </div>
          <h1>Interview Complete!</h1>
          <p>Great job! Here's your performance analysis and feedback.</p>
        </div>

        <div className="results-grid">
          {/* Overall Score */}
          <div className="score-card">
            <h2>Overall Performance</h2>
            <div className="score-circle">
              <div 
                className="score-fill" 
                style={{ 
                  background: `conic-gradient(${getScoreColor(analysis.overallScore)} ${overallScorePercentage * 3.6}deg, #e5e7eb 0deg)`
                }}
              >
                <div className="score-inner">
                  <span className="score-number">{overallScorePercentage}%</span>
                  <span className="score-label">{getScoreLabel(analysis.overallScore)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Session Stats */}
          <div className="stats-card">
            <h2>Session Statistics</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{analysis.answeredQuestions}</div>
                <div className="stat-label">Questions Answered</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{formatTime(analysis.totalTime)}</div>
                <div className="stat-label">Total Time</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{formatResponseTime(analysis.averageResponseTime)}</div>
                <div className="stat-label">Avg Response Time</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">100%</div>
                <div className="stat-label">Completion Rate</div>
              </div>
            </div>
          </div>

          {/* Strengths */}
          <div className="feedback-card strengths-card">
            <h2>Your Strengths</h2>
            {analysis.strengths.length > 0 ? (
              <ul className="feedback-list">
                {analysis.strengths.map((strength, index) => (
                  <li key={index} className="feedback-item positive">
                    <div className="feedback-icon">✓</div>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-feedback">Keep practicing to identify your strengths!</p>
            )}
          </div>

          {/* Improvement Areas */}
          <div className="feedback-card improvements-card">
            <h2>Areas for Improvement</h2>
            {analysis.improvementAreas.length > 0 ? (
              <ul className="feedback-list">
                {analysis.improvementAreas.map((area, index) => (
                  <li key={index} className="feedback-item improvement">
                    <div className="feedback-icon">→</div>
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-feedback">Great job! No major areas for improvement identified.</p>
            )}
          </div>

          {/* Detailed Response Analysis */}
          <div className="responses-card">
            <h2>Response Analysis</h2>
            <div className="responses-list">
              {analysis.responses.map((response, index) => {
                const isExpanded = expandedResponses.has(response.id);
                const shouldShowToggle = response.textContent.length > 100;
                
                return (
                  <div key={response.id} className="response-item">
                    <div className="response-header">
                      <span className="response-number">Question {index + 1}</span>
                      <span className="response-time">{formatResponseTime(response.responseTime)}</span>
                    </div>
                    
                    <div className="response-content">
                      <div className="response-preview">
                        {isExpanded || !shouldShowToggle
                          ? response.textContent
                          : `${response.textContent.substring(0, 100)}...`
                        }
                      </div>
                      
                      {shouldShowToggle && (
                        <button 
                          className="toggle-response-btn"
                          onClick={() => toggleResponse(response.id)}
                        >
                          {isExpanded ? (
                            <>
                              <span>Show Less</span>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="18,15 12,9 6,15"/>
                              </svg>
                            </>
                          ) : (
                            <>
                              <span>Show Full Response</span>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6,9 12,15 18,9"/>
                              </svg>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    
                    {response.analysis && (
                      <div className="response-score">
                        <div className="score-bar">
                          <div 
                            className="score-bar-fill"
                            style={{ 
                              width: `${Math.min(100, Math.max(0, response.analysis.overallScore || 50))}%`,
                              backgroundColor: getScoreColor((response.analysis.overallScore || 50) / 100)
                            }}
                          ></div>
                        </div>
                        <span className="score-text">
                          {Math.min(100, Math.max(0, Math.round(response.analysis.overallScore || 50)))}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Next Steps */}
          <div className="next-steps-card">
            <h2>Next Steps</h2>
            <div className="next-steps-content">
              <div className="step-item">
                <div className="step-icon">📚</div>
                <div>
                  <h3>Practice More</h3>
                  <p>Regular practice helps improve your interview skills and confidence.</p>
                </div>
              </div>
              <div className="step-item">
                <div className="step-icon">🎯</div>
                <div>
                  <h3>Focus on Weak Areas</h3>
                  <p>Work on the improvement areas identified in this session.</p>
                </div>
              </div>
              <div className="step-item">
                <div className="step-icon">💼</div>
                <div>
                  <h3>Apply to Jobs</h3>
                  <p>Use your improved skills to apply for positions that match your profile.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="results-actions">
          <button className="primary-action" onClick={onStartNew}>
            Start New Practice Session
          </button>
          <button className="secondary-action" onClick={() => window.print()}>
            Save Results (Print)
          </button>
        </div>
      </div>
    </div>
  );
};