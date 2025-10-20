import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { 
  Session, 
  Question, 
  UserResponse, 
  SessionConfig,
  ResponseAnalysis,
  SpeechAnalysis 
} from '../../types';
import { InterviewService, SessionProgressInfo, SessionSummary } from '../../services/InterviewService';
import { QuestionGenerator } from '../../services/QuestionGenerator';
import { StorageManager } from '../../storage/StorageManager';

// Session State Management
interface SessionState {
  currentSession: Session | null;
  currentQuestion: Question | null;
  nextQuestion: Question | null;
  responses: UserResponse[];
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  timeElapsed: number;
  estimatedTimeRemaining: number;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  sessionComplete: boolean;
  sessionSummary: SessionSummary | null;
}

type SessionAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SESSION_STARTED'; payload: Session }
  | { type: 'SESSION_RESUMED'; payload: Session }
  | { type: 'SESSION_PAUSED'; payload: Session }
  | { type: 'QUESTION_LOADED'; payload: { current: Question | null; next: Question | null } }
  | { type: 'RESPONSE_SUBMITTED'; payload: { response: UserResponse; analysis: ResponseAnalysis } }
  | { type: 'PROGRESS_UPDATED'; payload: SessionProgressInfo }
  | { type: 'SESSION_COMPLETED'; payload: SessionSummary }
  | { type: 'SESSION_RESET' };

const initialState: SessionState = {
  currentSession: null,
  currentQuestion: null,
  nextQuestion: null,
  responses: [],
  progress: { completed: 0, total: 0, percentage: 0 },
  timeElapsed: 0,
  estimatedTimeRemaining: 0,
  isLoading: false,
  isSubmitting: false,
  error: null,
  sessionComplete: false,
  sessionSummary: null
};

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false, isSubmitting: false };
    
    case 'SESSION_STARTED':
    case 'SESSION_RESUMED':
      return {
        ...state,
        currentSession: action.payload,
        responses: action.payload.responses,
        sessionComplete: false,
        sessionSummary: null,
        error: null
      };
    
    case 'SESSION_PAUSED':
      return {
        ...state,
        currentSession: action.payload
      };
    
    case 'QUESTION_LOADED':
      return {
        ...state,
        currentQuestion: action.payload.current,
        nextQuestion: action.payload.next
      };
    
    case 'RESPONSE_SUBMITTED':
      return {
        ...state,
        responses: [...state.responses, action.payload.response],
        isSubmitting: false
      };
    
    case 'PROGRESS_UPDATED':
      return {
        ...state,
        progress: action.payload.progress,
        timeElapsed: action.payload.timeElapsed,
        estimatedTimeRemaining: action.payload.estimatedTimeRemaining,
        currentQuestion: action.payload.currentQuestion,
        nextQuestion: action.payload.nextQuestion
      };
    
    case 'SESSION_COMPLETED':
      return {
        ...state,
        sessionComplete: true,
        sessionSummary: action.payload,
        currentQuestion: null,
        nextQuestion: null
      };
    
    case 'SESSION_RESET':
      return initialState;
    
    default:
      return state;
  }
}

// Context
interface SessionContextValue {
  state: SessionState;
  actions: {
    startSession: (config: SessionConfig, userId: string) => Promise<void>;
    resumeSession: (sessionId: string) => Promise<void>;
    pauseSession: () => Promise<void>;
    submitResponse: (questionId: string, textContent: string, speechAnalysis?: SpeechAnalysis) => Promise<void>;
    completeSession: () => Promise<void>;
    resetSession: () => void;
    loadNextQuestion: () => Promise<void>;
  };
}

const SessionContext = createContext<SessionContextValue | null>(null);

// Provider Props
interface SessionProviderProps {
  children: React.ReactNode;
  interviewService: InterviewService;
}

export const InterviewSessionProvider: React.FC<SessionProviderProps> = ({
  children,
  interviewService
}) => {
  const [state, dispatch] = useReducer(sessionReducer, initialState);
  const [progressTimer, setProgressTimer] = React.useState<NodeJS.Timeout | null>(null);

  // Auto-update progress every second during active session
  useEffect(() => {
    if (state.currentSession && state.currentSession.status === 'active') {
      const timer = setInterval(() => {
        if (state.currentSession) {
          const progressInfo = interviewService.getSessionProgress(state.currentSession.id);
          dispatch({ type: 'PROGRESS_UPDATED', payload: progressInfo });
        }
      }, 1000);
      
      setProgressTimer(timer);
      
      return () => {
        clearInterval(timer);
        setProgressTimer(null);
      };
    } else if (progressTimer) {
      clearInterval(progressTimer);
      setProgressTimer(null);
    }
  }, [state.currentSession?.status, interviewService]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (progressTimer) {
        clearInterval(progressTimer);
      }
    };
  }, [progressTimer]);

  const startSession = useCallback(async (config: SessionConfig, userId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const session = await interviewService.startSession({
        userId,
        config
      });

      dispatch({ type: 'SESSION_STARTED', payload: session });

      // Load first question
      const firstQuestion = await interviewService.getNextQuestion(session.id);
      dispatch({ 
        type: 'QUESTION_LOADED', 
        payload: { current: firstQuestion, next: null } 
      });

      // Get initial progress
      const progressInfo = interviewService.getSessionProgress(session.id);
      dispatch({ type: 'PROGRESS_UPDATED', payload: progressInfo });

    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to start session' 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [interviewService]);

  const resumeSession = useCallback(async (sessionId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const session = await interviewService.resumeSession(sessionId);
      dispatch({ type: 'SESSION_RESUMED', payload: session });

      // Load current question
      const currentQuestion = await interviewService.getNextQuestion(session.id);
      dispatch({ 
        type: 'QUESTION_LOADED', 
        payload: { current: currentQuestion, next: null } 
      });

      // Get progress
      const progressInfo = interviewService.getSessionProgress(session.id);
      dispatch({ type: 'PROGRESS_UPDATED', payload: progressInfo });

    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to resume session' 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [interviewService]);

  const pauseSession = useCallback(async () => {
    if (!state.currentSession) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const session = await interviewService.pauseSession(state.currentSession.id);
      dispatch({ type: 'SESSION_PAUSED', payload: session });

    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to pause session' 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.currentSession, interviewService]);

  const submitResponse = useCallback(async (
    questionId: string, 
    textContent: string, 
    speechAnalysis?: SpeechAnalysis
  ) => {
    if (!state.currentSession) return;

    try {
      dispatch({ type: 'SET_SUBMITTING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const startTime = Date.now();
      
      const result = await interviewService.submitResponse({
        sessionId: state.currentSession.id,
        questionId,
        textContent,
        audioData: speechAnalysis ? new ArrayBuffer(0) : undefined, // Placeholder for compatibility
        speechAnalysis,
        responseTime: Math.floor((Date.now() - startTime) / 1000)
      });

      dispatch({ 
        type: 'RESPONSE_SUBMITTED', 
        payload: { 
          response: result.response, 
          analysis: result.analysis 
        } 
      });

      if (result.sessionComplete) {
        const summary = await interviewService.completeSession(state.currentSession.id);
        dispatch({ type: 'SESSION_COMPLETED', payload: summary });
      } else {
        // Load next question
        dispatch({ 
          type: 'QUESTION_LOADED', 
          payload: { current: result.nextQuestion, next: null } 
        });

        // Update progress
        const progressInfo = interviewService.getSessionProgress(state.currentSession.id);
        dispatch({ type: 'PROGRESS_UPDATED', payload: progressInfo });
      }

    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to submit response' 
      });
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false });
    }
  }, [state.currentSession, interviewService]);

  const completeSession = useCallback(async () => {
    if (!state.currentSession) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const summary = await interviewService.completeSession(state.currentSession.id);
      dispatch({ type: 'SESSION_COMPLETED', payload: summary });

    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to complete session' 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.currentSession, interviewService]);

  const resetSession = useCallback(() => {
    dispatch({ type: 'SESSION_RESET' });
  }, []);

  const loadNextQuestion = useCallback(async () => {
    if (!state.currentSession) return;

    try {
      const nextQuestion = await interviewService.getNextQuestion(state.currentSession.id);
      dispatch({ 
        type: 'QUESTION_LOADED', 
        payload: { current: nextQuestion, next: null } 
      });
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to load next question' 
      });
    }
  }, [state.currentSession, interviewService]);

  const contextValue: SessionContextValue = {
    state,
    actions: {
      startSession,
      resumeSession,
      pauseSession,
      submitResponse,
      completeSession,
      resetSession,
      loadNextQuestion
    }
  };

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
};

// Hook to use session context
export const useInterviewSession = (): SessionContextValue => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useInterviewSession must be used within an InterviewSessionProvider');
  }
  return context;
};

// Hook for session persistence
export const useSessionPersistence = () => {
  const { state } = useInterviewSession();

  useEffect(() => {
    // Save session state to localStorage for recovery
    if (state.currentSession) {
      localStorage.setItem('interview-coach:active-session', JSON.stringify({
        sessionId: state.currentSession.id,
        timestamp: Date.now()
      }));
    } else {
      localStorage.removeItem('interview-coach:active-session');
    }
  }, [state.currentSession]);

  const recoverSession = useCallback((): string | null => {
    try {
      const saved = localStorage.getItem('interview-coach:active-session');
      if (saved) {
        const { sessionId, timestamp } = JSON.parse(saved);
        
        // Only recover if session was saved within last 24 hours
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          return sessionId;
        }
      }
    } catch (error) {
      console.error('Failed to recover session:', error);
    }
    
    return null;
  }, []);

  return { recoverSession };
};