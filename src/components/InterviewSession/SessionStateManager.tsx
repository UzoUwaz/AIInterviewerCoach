import React, { useEffect, useCallback, useState } from 'react';
import { useInterviewSession, useSessionPersistence } from './InterviewSessionProvider';

interface SessionStateManagerProps {
  children: React.ReactNode;
  autoSaveInterval?: number; // milliseconds
  enableRecovery?: boolean;
  onSessionRecovered?: (sessionId: string) => void;
  onSessionLost?: () => void;
  onAutoSave?: (sessionId: string) => void;
}

export const SessionStateManager: React.FC<SessionStateManagerProps> = ({
  children,
  autoSaveInterval = 30000, // 30 seconds
  enableRecovery = true,
  onSessionRecovered,
  onSessionLost,
  onAutoSave
}) => {
  const { state, actions } = useInterviewSession();
  const { recoverSession } = useSessionPersistence();
  const [hasAttemptedRecovery, setHasAttemptedRecovery] = useState(false);

  // Auto-save session state
  useEffect(() => {
    if (!state.currentSession || state.currentSession.status !== 'active') {
      return;
    }

    const interval = setInterval(() => {
      // Auto-save session state to localStorage
      try {
        const sessionState = {
          sessionId: state.currentSession!.id,
          responses: state.responses,
          currentQuestionIndex: state.progress.completed,
          timeElapsed: state.timeElapsed,
          lastSaved: Date.now()
        };

        localStorage.setItem(
          `interview-coach:session-state:${state.currentSession!.id}`,
          JSON.stringify(sessionState)
        );

        onAutoSave?.(state.currentSession!.id);
      } catch (error) {
        console.error('Failed to auto-save session state:', error);
      }
    }, autoSaveInterval);

    return () => clearInterval(interval);
  }, [state.currentSession, state.responses, state.progress.completed, state.timeElapsed, autoSaveInterval, onAutoSave]);

  // Session recovery on mount
  useEffect(() => {
    if (!enableRecovery || hasAttemptedRecovery || state.currentSession) {
      return;
    }

    const attemptRecovery = async () => {
      try {
        const sessionId = recoverSession();
        if (sessionId) {
          await actions.resumeSession(sessionId);
          onSessionRecovered?.(sessionId);
        }
      } catch (error) {
        console.error('Failed to recover session:', error);
        onSessionLost?.();
      } finally {
        setHasAttemptedRecovery(true);
      }
    };

    attemptRecovery();
  }, [enableRecovery, hasAttemptedRecovery, state.currentSession, recoverSession, actions, onSessionRecovered, onSessionLost]);

  // Handle page visibility changes (pause/resume on tab switch)
  useEffect(() => {
    if (!state.currentSession || state.currentSession.status !== 'active') {
      return;
    }

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Page is hidden, pause session
        try {
          await actions.pauseSession();
        } catch (error) {
          console.error('Failed to pause session on visibility change:', error);
        }
      } else {
        // Page is visible, resume session if it was paused
        if (state.currentSession?.status === 'paused') {
          try {
            await actions.resumeSession(state.currentSession.id);
          } catch (error) {
            console.error('Failed to resume session on visibility change:', error);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.currentSession, actions]);

  // Handle beforeunload (warn user about losing progress)
  useEffect(() => {
    if (!state.currentSession || state.currentSession.status !== 'active') {
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You have an active interview session. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.currentSession]);

  return <>{children}</>;
};

// Session recovery notification component
interface SessionRecoveryNotificationProps {
  sessionId: string;
  onRecover: () => void;
  onDiscard: () => void;
  className?: string;
}

export const SessionRecoveryNotification: React.FC<SessionRecoveryNotificationProps> = ({
  sessionId,
  onRecover,
  onDiscard,
  className = ''
}) => {
  return (
    <div className={`session-recovery-notification ${className}`}>
      <div className="notification-content">
        <div className="notification-icon">🔄</div>
        <div className="notification-message">
          <h4>Session Recovery</h4>
          <p>
            We found an incomplete interview session. Would you like to continue where you left off?
          </p>
          <div className="session-info">
            <span className="session-id">Session: {sessionId.slice(-8)}</span>
          </div>
        </div>
        <div className="notification-actions">
          <button onClick={onRecover} className="recover-btn">
            Continue Session
          </button>
          <button onClick={onDiscard} className="discard-btn">
            Start Fresh
          </button>
        </div>
      </div>
    </div>
  );
};

// Auto-save indicator component
interface AutoSaveIndicatorProps {
  className?: string;
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({ className = '' }) => {
  const { state } = useInterviewSession();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!state.currentSession) return;

    // Simulate auto-save detection
    const interval = setInterval(() => {
      setIsSaving(true);
      setTimeout(() => {
        setLastSaved(new Date());
        setIsSaving(false);
      }, 500);
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [state.currentSession]);

  if (!state.currentSession) return null;

  const formatLastSaved = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);

    if (diffSeconds < 60) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else {
      return date.toLocaleTimeString();
    }
  };

  return (
    <div className={`auto-save-indicator ${className}`}>
      {isSaving ? (
        <div className="saving">
          <span className="saving-icon">💾</span>
          <span className="saving-text">Saving...</span>
        </div>
      ) : lastSaved ? (
        <div className="saved">
          <span className="saved-icon">✓</span>
          <span className="saved-text">
            Saved {formatLastSaved(lastSaved)}
          </span>
        </div>
      ) : (
        <div className="not-saved">
          <span className="not-saved-icon">○</span>
          <span className="not-saved-text">Not saved</span>
        </div>
      )}
    </div>
  );
};

// Session state utilities hook
export const useSessionState = () => {
  const { state } = useInterviewSession();

  const getSessionState = useCallback(() => {
    if (!state.currentSession) return null;

    return {
      sessionId: state.currentSession.id,
      status: state.currentSession.status,
      progress: state.progress,
      timeElapsed: state.timeElapsed,
      currentQuestion: state.currentQuestion,
      responses: state.responses,
      isComplete: state.sessionComplete
    };
  }, [state]);

  const saveSessionState = useCallback((customData?: any) => {
    const sessionState = getSessionState();
    if (!sessionState) return;

    try {
      const stateToSave = {
        ...sessionState,
        customData,
        savedAt: new Date().toISOString()
      };

      localStorage.setItem(
        `interview-coach:session-backup:${sessionState.sessionId}`,
        JSON.stringify(stateToSave)
      );

      return true;
    } catch (error) {
      console.error('Failed to save session state:', error);
      return false;
    }
  }, [getSessionState]);

  const loadSessionState = useCallback((sessionId: string) => {
    try {
      const saved = localStorage.getItem(`interview-coach:session-backup:${sessionId}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load session state:', error);
    }
    return null;
  }, []);

  const clearSessionState = useCallback((sessionId?: string) => {
    if (sessionId) {
      localStorage.removeItem(`interview-coach:session-backup:${sessionId}`);
      localStorage.removeItem(`interview-coach:session-state:${sessionId}`);
    } else {
      // Clear all session states
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith('interview-coach:session-')
      );
      keys.forEach(key => localStorage.removeItem(key));
    }
  }, []);

  return {
    getSessionState,
    saveSessionState,
    loadSessionState,
    clearSessionState
  };
};

// Network status hook for offline handling
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
};

// Offline notification component
interface OfflineNotificationProps {
  className?: string;
}

export const OfflineNotification: React.FC<OfflineNotificationProps> = ({ className = '' }) => {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className={`offline-notification ${className}`}>
      <div className="offline-content">
        <span className="offline-icon">📡</span>
        <span className="offline-message">
          You're offline. Your session will continue locally and sync when reconnected.
        </span>
      </div>
    </div>
  );
};