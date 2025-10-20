import React from 'react';
import { useInterviewSession } from './InterviewSessionProvider';

interface ProgressIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  showDetails = true,
  className = ''
}) => {
  const { state } = useInterviewSession();
  const { progress, timeElapsed, estimatedTimeRemaining } = state;

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className={`progress-indicator ${className}`}>
      {/* Progress Bar */}
      <div className="progress-bar-container">
        <div className="progress-bar-background">
          <div 
            className="progress-bar-fill"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
        <span className="progress-percentage">
          {progress.percentage}%
        </span>
      </div>

      {/* Progress Details */}
      {showDetails && (
        <div className="progress-details">
          <div className="progress-stats">
            <div className="stat">
              <span className="stat-label">Questions:</span>
              <span className="stat-value">
                {progress.completed} / {progress.total}
              </span>
            </div>
            
            <div className="stat">
              <span className="stat-label">Time Elapsed:</span>
              <span className="stat-value">
                {formatTime(timeElapsed)}
              </span>
            </div>
            
            {estimatedTimeRemaining > 0 && (
              <div className="stat">
                <span className="stat-label">Est. Remaining:</span>
                <span className="stat-value">
                  {formatTime(estimatedTimeRemaining)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface CircularProgressProps {
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  className?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  size = 120,
  strokeWidth = 8,
  showPercentage = true,
  className = ''
}) => {
  const { state } = useInterviewSession();
  const { progress } = state;

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress.percentage / 100) * circumference;

  return (
    <div className={`circular-progress ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="circular-progress-svg">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="progress-circle"
        />
      </svg>
      
      {showPercentage && (
        <div className="circular-progress-text">
          <span className="percentage">{progress.percentage}%</span>
          <span className="label">Complete</span>
        </div>
      )}
    </div>
  );
};

interface SessionTimerProps {
  className?: string;
}

export const SessionTimer: React.FC<SessionTimerProps> = ({ className = '' }) => {
  const { state } = useInterviewSession();
  const { timeElapsed, currentSession } = state;

  const formatTime = (minutes: number): string => {
    const totalSeconds = minutes * 60;
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerStatus = () => {
    if (!currentSession) return 'inactive';
    
    switch (currentSession.status) {
      case 'active':
        return 'running';
      case 'paused':
        return 'paused';
      case 'completed':
        return 'completed';
      default:
        return 'inactive';
    }
  };

  const timerStatus = getTimerStatus();

  return (
    <div className={`session-timer ${className} timer-${timerStatus}`}>
      <div className="timer-display">
        <span className="timer-time">{formatTime(timeElapsed)}</span>
        <span className="timer-status">
          {timerStatus === 'running' && '●'}
          {timerStatus === 'paused' && '⏸'}
          {timerStatus === 'completed' && '✓'}
        </span>
      </div>
      
      {currentSession?.config.duration && (
        <div className="timer-limit">
          <span className="timer-limit-text">
            / {formatTime(currentSession.config.duration)}
          </span>
        </div>
      )}
    </div>
  );
};

interface QuestionProgressProps {
  className?: string;
}

export const QuestionProgress: React.FC<QuestionProgressProps> = ({ className = '' }) => {
  const { state } = useInterviewSession();
  const { progress, currentQuestion } = state;

  return (
    <div className={`question-progress ${className}`}>
      <div className="question-counter">
        <span className="current-question">
          Question {progress.completed + 1}
        </span>
        <span className="total-questions">
          of {progress.total}
        </span>
      </div>
      
      {currentQuestion && (
        <div className="question-type">
          <span className="question-category">
            {currentQuestion.category.replace('-', ' ')}
          </span>
          <span className="question-difficulty">
            Level {currentQuestion.difficulty}/10
          </span>
        </div>
      )}
      
      <div className="question-progress-bar">
        {Array.from({ length: progress.total }, (_, index) => (
          <div
            key={index}
            className={`progress-dot ${
              index < progress.completed 
                ? 'completed' 
                : index === progress.completed 
                ? 'current' 
                : 'pending'
            }`}
          />
        ))}
      </div>
    </div>
  );
};