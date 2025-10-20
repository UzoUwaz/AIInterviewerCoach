import React, { useState, useEffect } from 'react';
import { useInterviewSession } from './InterviewSessionProvider';
import { ResponseInput } from './ResponseInput';
import { FeedbackDisplay, SessionSummary } from './FeedbackDisplay';
import { ProgressIndicator } from './ProgressIndicator';
import { SessionTimer } from './SessionTimer';
import { ResponseAnalysis } from '../../types';
import './FeedbackDisplay.css';

interface InterviewSessionWithFeedbackProps {
  className?: string;
  onSessionComplete?: () => void;
  onSessionPause?: () => void;
  showProgressIndicator?: boolean;
  showTimer?: boolean;
  autoAdvanceAfterFeedback?: boolean;
  feedbackDisplayDuration?: number; // seconds
}

/**
 * Enhanced interview session component with integrated feedback display
 */
export const InterviewSessionWithFeedback: React.FC<InterviewSessionWithFeedbackProps> = ({
  className = '',
  onSessionComplete,
  onSessionPause,
  showProgressIndicator = true,
  showTimer = true,
  autoAdvanceAfterFeedback = false,
  feedbackDisplayDuration = 10
}) => {
  const { state, actions } = useInterviewSession();
  const {
    currentSession,
    currentQuestion,
    responses,
    progress,
    isLoading,
    isSubmitting,
    error,
    sessionComplete,
    sessionSummary
  } = state;

  const [showFeedback, setShowFeedback] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<{
    analysis: ResponseAnalysis;
    questionId: string;
    responseId: string;
  } | null>(null);
  const [feedbackTimer, setFeedbackTimer] = useState<NodeJS.Timeout | null>(null);

  // Monitor responses for new submissions and show feedback
  useEffect(() => {
    if (responses.length > 0) {
      const latestResponse = responses[responses.length - 1];
      if (latestResponse?.analysis && !showFeedback) {
        setCurrentFeedback({
          analysis: latestResponse.analysis,
          questionId: latestResponse.questionId,
          responseId: latestResponse.id
        });
        setShowFeedback(true);

        // Auto-advance after feedback duration if enabled
        if (autoAdvanceAfterFeedback && !sessionComplete) {
          const timer = setTimeout(() => {
            handleContinueToNext();
          }, feedbackDisplayDuration * 1000);
          setFeedbackTimer(timer);
        }
      }
    }
  }, [responses, showFeedback, autoAdvanceAfterFeedback, sessionComplete, feedbackDisplayDuration]);

  // Handle continuing to next question
  const handleContinueToNext = () => {
    setShowFeedback(false);
    setCurrentFeedback(null);
    
    if (feedbackTimer) {
      clearTimeout(feedbackTimer);
      setFeedbackTimer(null);
    }

    // Load next question if session is not complete
    if (!sessionComplete) {
      actions.loadNextQuestion();
    }
  };

  // Handle session pause
  const handlePause = async () => {
    try {
      await actions.pauseSession();
      onSessionPause?.();
    } catch (error) {
      console.error('Failed to pause session:', error);
    }
  };

  // Handle session completion
  const handleComplete = async () => {
    try {
      await actions.completeSession();
      onSessionComplete?.();
    } catch (error) {
      console.error('Failed to complete session:', error);
    }
  };

  // Handle session restart
  const handleRestart = () => {
    actions.resetSession();
    // Navigate back to session setup or start new session
    window.location.reload(); // Simple approach for demo
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimer) {
        clearTimeout(feedbackTimer);
      }
    };
  }, [feedbackTimer]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`interview-session-loading ${className}`}>
        <div className="loading-spinner"></div>
        <p>Loading interview session...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`interview-session-error ${className}`}>
        <div className="error-message">
          <h3>Session Error</h3>
          <p>{error}</p>
          <button onClick={() => actions.resetSession()} className="retry-btn">
            Start Over
          </button>
        </div>
      </div>
    );
  }

  // Session complete state
  if (sessionComplete && sessionSummary) {
    return (
      <div className={`interview-session-complete ${className}`}>
        <SessionSummary
          sessionAnalysis={sessionSummary.analysis}
          responses={responses}
          questions={currentSession?.questions || []}
          onRestart={handleRestart}
          onViewDetails={() => {
            // Could navigate to detailed analysis page
            console.log('View detailed analysis');
          }}
        />
      </div>
    );
  }

  // No active session
  if (!currentSession) {
    return (
      <div className={`interview-session-empty ${className}`}>
        <div className="empty-state">
          <h3>No Active Session</h3>
          <p>Please start a new interview session to begin practicing.</p>
        </div>
      </div>
    );
  }

  // Show feedback after response submission
  if (showFeedback && currentFeedback && currentQuestion) {
    return (
      <div className={`interview-session-feedback ${className}`}>
        {/* Progress and Timer */}
        <div className="session-header">
          {showProgressIndicator && (
            <ProgressIndicator />
          )}
          {showTimer && (
            <SessionTimer />
          )}
        </div>

        {/* Question Context */}
        <div className="question-context">
          <h3>Question {progress.completed}</h3>
          <div className="question-text">
            {currentQuestion.text}
          </div>
        </div>

        {/* Response Display */}
        <div className="response-display">
          <h4>Your Response:</h4>
          <div className="response-text">
            {responses[responses.length - 1]?.textContent}
          </div>
        </div>

        {/* Feedback Display */}
        <FeedbackDisplay
          analysis={currentFeedback.analysis}
          question={currentQuestion}
          response={responses[responses.length - 1]}
          onContinue={handleContinueToNext}
          showDetailedFeedback={true}
        />

        {/* Auto-advance indicator */}
        {autoAdvanceAfterFeedback && !sessionComplete && (
          <div className="auto-advance-indicator">
            <p>Automatically continuing in {feedbackDisplayDuration} seconds...</p>
            <button onClick={handleContinueToNext} className="continue-now-btn">
              Continue Now
            </button>
          </div>
        )}
      </div>
    );
  }

  // Active session with current question
  return (
    <div className={`interview-session-active ${className}`}>
      {/* Session Header */}
      <div className="session-header">
        {showProgressIndicator && (
          <ProgressIndicator />
        )}
        {showTimer && (
          <SessionTimer />
        )}
      </div>

      {/* Session Controls */}
      <div className="session-controls">
        <button 
          onClick={handlePause}
          className="control-btn pause-btn"
          disabled={isSubmitting}
        >
          Pause Session
        </button>
        <button 
          onClick={handleComplete}
          className="control-btn complete-btn"
          disabled={isSubmitting}
        >
          End Session
        </button>
      </div>

      {/* Current Question */}
      {currentQuestion && (
        <div className="current-question">
          <div className="question-header">
            <h2>Question {progress.completed + 1} of {progress.total}</h2>
            <div className="question-meta">
              <span className="question-type">{currentQuestion.type}</span>
              <span className="question-category">{currentQuestion.category}</span>
              {currentQuestion.timeLimit && (
                <span className="time-limit">{currentQuestion.timeLimit}s</span>
              )}
            </div>
          </div>
          
          <div className="question-content">
            <p className="question-text">{currentQuestion.text}</p>
            
            {currentQuestion.expectedElements.length > 0 && (
              <div className="question-hints">
                <h4>Consider addressing:</h4>
                <ul>
                  {currentQuestion.expectedElements.map((element, index) => (
                    <li key={index}>{element}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Response Input */}
      {currentQuestion && (
        <ResponseInput
          questionId={currentQuestion.id}
          placeholder="Type your response here..."
          maxLength={5000}
          showWordCount={true}
          autoFocus={true}
          onResponseChange={() => {
            // Could add real-time analysis preview here
          }}
          onSubmit={() => {
            // Response submission is handled by the ResponseInput component
            // through the InterviewSessionProvider
          }}
        />
      )}

      {/* Submission Status */}
      {isSubmitting && (
        <div className="submission-status">
          <div className="loading-spinner"></div>
          <p>Analyzing your response...</p>
        </div>
      )}
    </div>
  );
};

/**
 * Hook for managing interview session with feedback
 */
export const useInterviewSessionWithFeedback = () => {
  const { state, actions } = useInterviewSession();
  const [feedbackHistory, setFeedbackHistory] = useState<Array<{
    questionId: string;
    responseId: string;
    analysis: ResponseAnalysis;
    timestamp: Date;
  }>>([]);

  const addFeedbackToHistory = (
    questionId: string,
    responseId: string,
    analysis: ResponseAnalysis
  ) => {
    setFeedbackHistory(prev => [...prev, {
      questionId,
      responseId,
      analysis,
      timestamp: new Date()
    }]);
  };

  const getFeedbackForResponse = (responseId: string) => {
    return feedbackHistory.find(feedback => feedback.responseId === responseId);
  };

  const getAverageScore = () => {
    if (feedbackHistory.length === 0) return 0;
    const totalScore = feedbackHistory.reduce((sum, feedback) => sum + feedback.analysis.overallScore, 0);
    return Math.round(totalScore / feedbackHistory.length);
  };

  const getImprovementTrend = () => {
    if (feedbackHistory.length < 2) return 0;
    const recent = feedbackHistory.slice(-3);
    const earlier = feedbackHistory.slice(0, -3);
    
    if (earlier.length === 0) return 0;
    
    const recentAvg = recent.reduce((sum, f) => sum + f.analysis.overallScore, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, f) => sum + f.analysis.overallScore, 0) / earlier.length;
    
    return Math.round(recentAvg - earlierAvg);
  };

  return {
    ...state,
    actions,
    feedbackHistory,
    addFeedbackToHistory,
    getFeedbackForResponse,
    getAverageScore,
    getImprovementTrend
  };
};