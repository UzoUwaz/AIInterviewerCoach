import React, { useState, useEffect, useCallback } from 'react';
import { useInterviewSession } from './InterviewSessionProvider';

interface SessionTimerProps {
  showControls?: boolean;
  showMilliseconds?: boolean;
  className?: string;
  onTimeUpdate?: (timeElapsed: number) => void;
  onTimeLimit?: () => void;
}

export const SessionTimer: React.FC<SessionTimerProps> = ({
  showControls = false,
  showMilliseconds = false,
  className = '',
  onTimeUpdate,
  onTimeLimit
}) => {
  const { state, actions } = useInterviewSession();
  const { currentSession, timeElapsed } = state;
  
  const [localTime, setLocalTime] = useState(timeElapsed);
  const [isOvertime, setIsOvertime] = useState(false);

  // Update local time every second when session is active
  useEffect(() => {
    if (currentSession?.status === 'active') {
      const interval = setInterval(() => {
        const now = Date.now();
        const sessionStart = new Date(currentSession.startTime).getTime();
        const elapsed = Math.floor((now - sessionStart) / 1000 / 60); // minutes
        
        setLocalTime(elapsed);
        
        // Check if over time limit
        if (currentSession.config.duration > 0 && elapsed > currentSession.config.duration) {
          if (!isOvertime) {
            setIsOvertime(true);
            onTimeLimit?.();
          }
        }
        
        onTimeUpdate?.(elapsed);
      }, showMilliseconds ? 100 : 1000);

      return () => clearInterval(interval);
    }
  }, [currentSession, showMilliseconds, isOvertime, onTimeUpdate, onTimeLimit]);

  // Sync with context state
  useEffect(() => {
    setLocalTime(timeElapsed);
  }, [timeElapsed]);

  const formatTime = useCallback((minutes: number, includeMs = false): string => {
    const totalSeconds = minutes * 60;
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);
    const ms = Math.floor((totalSeconds % 1) * 100);

    let timeString = '';
    
    if (hours > 0) {
      timeString = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      timeString = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    if (includeMs && showMilliseconds) {
      timeString += `.${ms.toString().padStart(2, '0')}`;
    }
    
    return timeString;
  }, [showMilliseconds]);

  const getTimerStatus = useCallback(() => {
    if (!currentSession) return 'inactive';
    
    if (isOvertime) return 'overtime';
    
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
  }, [currentSession, isOvertime]);

  const getTimeRemaining = useCallback((): number => {
    if (!currentSession?.config.duration) return 0;
    return Math.max(0, currentSession.config.duration - localTime);
  }, [currentSession, localTime]);

  const getProgressPercentage = useCallback((): number => {
    if (!currentSession?.config.duration) return 0;
    return Math.min(100, (localTime / currentSession.config.duration) * 100);
  }, [currentSession, localTime]);

  const handlePauseResume = useCallback(async () => {
    if (!currentSession) return;
    
    if (currentSession.status === 'active') {
      await actions.pauseSession();
    } else if (currentSession.status === 'paused') {
      await actions.resumeSession(currentSession.id);
    }
  }, [currentSession, actions]);

  const timerStatus = getTimerStatus();
  const timeRemaining = getTimeRemaining();
  const progressPercentage = getProgressPercentage();

  return (
    <div className={`session-timer ${className} timer-${timerStatus}`}>
      {/* Main Timer Display */}
      <div className="timer-main">
        <div className="timer-display">
          <span className="timer-time">
            {formatTime(localTime, true)}
          </span>
          
          <div className="timer-status-indicator">
            {timerStatus === 'running' && (
              <span className="status-icon running" title="Session Active">●</span>
            )}
            {timerStatus === 'paused' && (
              <span className="status-icon paused" title="Session Paused">⏸</span>
            )}
            {timerStatus === 'completed' && (
              <span className="status-icon completed" title="Session Completed">✓</span>
            )}
            {timerStatus === 'overtime' && (
              <span className="status-icon overtime" title="Over Time Limit">⚠</span>
            )}
          </div>
        </div>

        {/* Time Limit and Remaining */}
        {currentSession?.config.duration && (
          <div className="timer-limits">
            <div className="time-limit">
              <span className="limit-label">Limit:</span>
              <span className="limit-value">
                {formatTime(currentSession.config.duration)}
              </span>
            </div>
            
            {timeRemaining > 0 && (
              <div className="time-remaining">
                <span className="remaining-label">Remaining:</span>
                <span className={`remaining-value ${timeRemaining < 5 ? 'warning' : ''}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )}
            
            {isOvertime && (
              <div className="overtime-warning">
                <span className="overtime-label">Overtime:</span>
                <span className="overtime-value">
                  +{formatTime(localTime - currentSession.config.duration)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {currentSession?.config.duration && (
        <div className="timer-progress">
          <div className="progress-bar-background">
            <div 
              className={`progress-bar-fill ${isOvertime ? 'overtime' : ''}`}
              style={{ width: `${Math.min(100, progressPercentage)}%` }}
            />
            {isOvertime && (
              <div 
                className="progress-bar-overtime"
                style={{ 
                  width: `${Math.min(100, ((localTime - currentSession.config.duration) / currentSession.config.duration) * 100)}%` 
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      {showControls && currentSession && (
        <div className="timer-controls">
          <button
            onClick={handlePauseResume}
            className={`timer-control-btn ${currentSession.status === 'active' ? 'pause' : 'resume'}`}
            disabled={state.isLoading}
          >
            {currentSession.status === 'active' ? '⏸ Pause' : '▶ Resume'}
          </button>
          
          <button
            onClick={actions.completeSession}
            className="timer-control-btn complete"
            disabled={state.isLoading}
          >
            ✓ Complete
          </button>
        </div>
      )}

      {/* Status Messages */}
      {timerStatus === 'overtime' && (
        <div className="timer-message overtime-message">
          <span className="message-icon">⚠</span>
          <span className="message-text">
            Session has exceeded the time limit. Consider wrapping up.
          </span>
        </div>
      )}
      
      {timerStatus === 'paused' && (
        <div className="timer-message paused-message">
          <span className="message-icon">⏸</span>
          <span className="message-text">
            Session is paused. Click resume to continue.
          </span>
        </div>
      )}
    </div>
  );
};

// Compact timer for header/navbar use
interface CompactTimerProps {
  className?: string;
  onClick?: () => void;
}

export const CompactTimer: React.FC<CompactTimerProps> = ({ 
  className = '', 
  onClick 
}) => {
  const { state } = useInterviewSession();
  const { currentSession, timeElapsed } = state;

  const formatCompactTime = (minutes: number): string => {
    const totalSeconds = minutes * 60;
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    if (!currentSession) return 'inactive';
    
    switch (currentSession.status) {
      case 'active':
        return 'active';
      case 'paused':
        return 'paused';
      default:
        return 'inactive';
    }
  };

  if (!currentSession) return null;

  return (
    <div 
      className={`compact-timer ${className} status-${getStatusColor()}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="compact-timer-content">
        <span className="compact-time">
          {formatCompactTime(timeElapsed)}
        </span>
        
        {currentSession.config.duration > 0 && (
          <span className="compact-limit">
            / {formatCompactTime(currentSession.config.duration)}
          </span>
        )}
        
        <div className={`compact-status-dot status-${getStatusColor()}`} />
      </div>
    </div>
  );
};

// Hook for timer utilities
export const useSessionTimer = () => {
  const { state } = useInterviewSession();
  const { currentSession, timeElapsed } = state;

  const isActive = currentSession?.status === 'active';
  const isPaused = currentSession?.status === 'paused';
  const isCompleted = currentSession?.status === 'completed';
  
  const timeLimit = currentSession?.config.duration || 0;
  const timeRemaining = Math.max(0, timeLimit - timeElapsed);
  const isOvertime = timeLimit > 0 && timeElapsed > timeLimit;
  const progressPercentage = timeLimit > 0 ? (timeElapsed / timeLimit) * 100 : 0;

  const formatTime = (minutes: number): string => {
    const totalSeconds = minutes * 60;
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);

    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  return {
    timeElapsed,
    timeRemaining,
    timeLimit,
    isActive,
    isPaused,
    isCompleted,
    isOvertime,
    progressPercentage,
    formatTime
  };
};