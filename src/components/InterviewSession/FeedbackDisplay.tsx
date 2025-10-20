import React, { useState } from 'react';
import { ResponseAnalysis, SessionAnalysis, Question, UserResponse } from '../../types';

interface FeedbackDisplayProps {
  analysis: ResponseAnalysis;
  question: Question;
  response: UserResponse;
  className?: string;
  onContinue?: () => void;
  showDetailedFeedback?: boolean;
}

/**
 * Component to display immediate feedback after each response
 */
export const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({
  analysis,
  response,
  className = '',
  onContinue,
  showDetailedFeedback = true
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'score-excellent';
    if (score >= 70) return 'score-good';
    if (score >= 60) return 'score-fair';
    if (score >= 50) return 'score-poor';
    return 'score-very-poor';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 50) return 'Needs Work';
    return 'Poor';
  };

  const getEncouragementMessage = (score: number): string => {
    if (score >= 80) return 'Outstanding response! You demonstrated strong understanding and communication skills.';
    if (score >= 70) return 'Great job! Your response shows good knowledge and clear thinking.';
    if (score >= 60) return 'Good effort! With some refinement, your responses will be even stronger.';
    if (score >= 50) return 'You\'re on the right track. Focus on the suggestions below to improve.';
    return 'Keep practicing! Every response helps you improve your interview skills.';
  };

  return (
    <div className={`feedback-display ${className}`}>
      {/* Overall Score Header */}
      <div className="feedback-header">
        <div className="score-section">
          <div className={`overall-score ${getScoreColor(analysis.overallScore)}`}>
            <span className="score-number">{analysis.overallScore}</span>
            <span className="score-max">/100</span>
          </div>
          <div className="score-details">
            <h3 className="score-label">{getScoreLabel(analysis.overallScore)}</h3>
            <p className="encouragement-message">
              {getEncouragementMessage(analysis.overallScore)}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="feedback-stats">
        <div className="stat-item">
          <span className="stat-label">Words</span>
          <span className="stat-value">{response.textContent.trim().split(/\s+/).length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Time</span>
          <span className="stat-value">{response.responseTime}s</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Relevance</span>
          <span className={`stat-value ${getScoreColor(analysis.relevance.score)}`}>
            {analysis.relevance.score}%
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Completeness</span>
          <span className={`stat-value ${getScoreColor(analysis.completeness.score)}`}>
            {analysis.completeness.score}%
          </span>
        </div>
      </div>

      {/* Strengths */}
      {analysis.strengths.length > 0 && (
        <div className="feedback-section strengths-section">
          <h4 className="section-title">
            <span className="section-icon">✅</span>
            What You Did Well
          </h4>
          <ul className="strengths-list">
            {analysis.strengths.map((strength, index) => (
              <li key={index} className="strength-item">
                {strength}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvement Suggestions */}
      {analysis.improvementSuggestions.length > 0 && (
        <div className="feedback-section suggestions-section">
          <h4 className="section-title">
            <span className="section-icon">💡</span>
            Areas for Improvement
          </h4>
          <ul className="suggestions-list">
            {analysis.improvementSuggestions.map((suggestion, index) => (
              <li key={index} className="suggestion-item">
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detailed Breakdown (Collapsible) */}
      {showDetailedFeedback && (
        <div className="feedback-section detailed-section">
          <button
            className="details-toggle"
            onClick={() => setShowDetails(!showDetails)}
          >
            <span className="toggle-icon">{showDetails ? '▼' : '▶'}</span>
            Detailed Breakdown
          </button>
          
          {showDetails && (
            <div className="detailed-breakdown">
              <div className="breakdown-grid">
                <div className="breakdown-item">
                  <span className="breakdown-label">Clarity</span>
                  <div className="breakdown-score">
                    <span className={`score ${getScoreColor(analysis.clarity.score)}`}>
                      {analysis.clarity.score}%
                    </span>
                    <div className="score-bar">
                      <div 
                        className={`score-fill ${getScoreColor(analysis.clarity.score)}`}
                        style={{ width: `${analysis.clarity.score}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="breakdown-item">
                  <span className="breakdown-label">Relevance</span>
                  <div className="breakdown-score">
                    <span className={`score ${getScoreColor(analysis.relevance.score)}`}>
                      {analysis.relevance.score}%
                    </span>
                    <div className="score-bar">
                      <div 
                        className={`score-fill ${getScoreColor(analysis.relevance.score)}`}
                        style={{ width: `${analysis.relevance.score}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="breakdown-item">
                  <span className="breakdown-label">Depth</span>
                  <div className="breakdown-score">
                    <span className={`score ${getScoreColor(analysis.depth.score)}`}>
                      {analysis.depth.score}%
                    </span>
                    <div className="score-bar">
                      <div 
                        className={`score-fill ${getScoreColor(analysis.depth.score)}`}
                        style={{ width: `${analysis.depth.score}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="breakdown-item">
                  <span className="breakdown-label">Communication</span>
                  <div className="breakdown-score">
                    <span className={`score ${getScoreColor(analysis.communication.score)}`}>
                      {analysis.communication.score}%
                    </span>
                    <div className="score-bar">
                      <div 
                        className={`score-fill ${getScoreColor(analysis.communication.score)}`}
                        style={{ width: `${analysis.communication.score}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Missing Elements */}
              {analysis.completeness.missingElements.length > 0 && (
                <div className="missing-elements">
                  <h5>Consider addressing these points:</h5>
                  <ul>
                    {analysis.completeness.missingElements.map((element, index) => (
                      <li key={index} className="missing-element">
                        {element}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Continue Button */}
      {onContinue && (
        <div className="feedback-actions">
          <button 
            className="continue-btn"
            onClick={onContinue}
          >
            Continue to Next Question
          </button>
        </div>
      )}
    </div>
  );
};

interface SessionSummaryProps {
  sessionAnalysis: SessionAnalysis;
  responses: UserResponse[];
  questions: Question[];
  className?: string;
  onRestart?: () => void;
  onViewDetails?: () => void;
}

/**
 * Component to display session summary at the end
 */
export const SessionSummary: React.FC<SessionSummaryProps> = ({
  sessionAnalysis,
  responses,
  className = '',
  onRestart,
  onViewDetails
}) => {
  const getOverallGrade = (score: number): string => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  const getGradeColor = (score: number): string => {
    if (score >= 80) return 'grade-a';
    if (score >= 70) return 'grade-b';
    if (score >= 60) return 'grade-c';
    if (score >= 50) return 'grade-d';
    return 'grade-f';
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getImprovementMessage = (improvement: number): string => {
    if (improvement > 10) return 'Significant improvement! 📈';
    if (improvement > 5) return 'Good progress! 📊';
    if (improvement > 0) return 'Steady improvement 📈';
    if (improvement === 0) return 'Consistent performance ➡️';
    return 'Room for growth 📉';
  };

  return (
    <div className={`session-summary ${className}`}>
      {/* Header */}
      <div className="summary-header">
        <h2>Session Complete!</h2>
        <div className={`overall-grade ${getGradeColor(sessionAnalysis.overallScore)}`}>
          <span className="grade-letter">{getOverallGrade(sessionAnalysis.overallScore)}</span>
          <span className="grade-score">{sessionAnalysis.overallScore}/100</span>
        </div>
      </div>

      {/* Session Stats */}
      <div className="session-stats">
        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <span className="stat-number">{sessionAnalysis.questionsAnswered}</span>
            <span className="stat-label">Questions Answered</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <span className="stat-number">{formatTime(sessionAnalysis.timeSpent)}</span>
            <span className="stat-label">Time Spent</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <span className="stat-number">{sessionAnalysis.improvement > 0 ? '+' : ''}{sessionAnalysis.improvement}%</span>
            <span className="stat-label">vs Previous</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💬</div>
          <div className="stat-content">
            <span className="stat-number">
              {responses.reduce((total, r) => total + r.textContent.trim().split(/\s+/).length, 0)}
            </span>
            <span className="stat-label">Total Words</span>
          </div>
        </div>
      </div>

      {/* Performance Breakdown */}
      <div className="performance-breakdown">
        <h3>Performance by Category</h3>
        <div className="dimension-scores">
          {sessionAnalysis.dimensionScores.map((dimension, index) => (
            <div key={index} className="dimension-item">
              <div className="dimension-header">
                <span className="dimension-name">
                  {dimension.dimension.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </span>
                <span className="dimension-score">{dimension.score}%</span>
                <span className={`dimension-trend trend-${dimension.trend}`}>
                  {dimension.trend === 'improving' ? '↗️' : 
                   dimension.trend === 'declining' ? '↘️' : '➡️'}
                </span>
              </div>
              <div className="dimension-bar">
                <div 
                  className="dimension-fill"
                  style={{ 
                    width: `${dimension.score}%`,
                    backgroundColor: dimension.score >= 70 ? '#10b981' : 
                                   dimension.score >= 50 ? '#f59e0b' : '#ef4444'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Insights */}
      <div className="session-insights">
        <div className="insights-grid">
          {/* Strengths */}
          {sessionAnalysis.strengths.length > 0 && (
            <div className="insight-section strengths">
              <h4>
                <span className="section-icon">🌟</span>
                Key Strengths
              </h4>
              <ul>
                {sessionAnalysis.strengths.slice(0, 3).map((strength, index) => (
                  <li key={index}>{strength}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvement Areas */}
          {sessionAnalysis.improvementAreas.length > 0 && (
            <div className="insight-section improvements">
              <h4>
                <span className="section-icon">🎯</span>
                Focus Areas
              </h4>
              <ul>
                {sessionAnalysis.improvementAreas.slice(0, 3).map((area, index) => (
                  <li key={index}>{area}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      {sessionAnalysis.recommendations.length > 0 && (
        <div className="recommendations-section">
          <h4>
            <span className="section-icon">💡</span>
            Recommendations for Next Session
          </h4>
          <ul className="recommendations-list">
            {sessionAnalysis.recommendations.slice(0, 4).map((recommendation, index) => (
              <li key={index} className="recommendation-item">
                {recommendation}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Progress Message */}
      <div className="progress-message">
        <div className="progress-icon">
          {sessionAnalysis.improvement > 0 ? '🎉' : '💪'}
        </div>
        <div className="progress-text">
          <h4>{getImprovementMessage(sessionAnalysis.improvement)}</h4>
          <p>
            {sessionAnalysis.improvement > 0 
              ? `You've improved by ${sessionAnalysis.improvement}% since your last session. Keep up the great work!`
              : 'Every practice session helps you improve. Keep practicing to see your progress!'
            }
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="summary-actions">
        {onRestart && (
          <button className="action-btn primary" onClick={onRestart}>
            Start New Session
          </button>
        )}
        {onViewDetails && (
          <button className="action-btn secondary" onClick={onViewDetails}>
            View Detailed Analysis
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Hook for managing feedback display state
 */
export const useFeedbackDisplay = () => {
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<ResponseAnalysis | null>(null);

  const displayFeedback = (analysis: ResponseAnalysis) => {
    setCurrentAnalysis(analysis);
    setShowFeedback(true);
  };

  const hideFeedback = () => {
    setShowFeedback(false);
    setCurrentAnalysis(null);
  };

  return {
    showFeedback,
    currentAnalysis,
    displayFeedback,
    hideFeedback
  };
};