import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useInterviewSession } from './InterviewSessionProvider';
import { VoiceRecorderWithFallback } from './VoiceRecorder';
import { SpeechAnalysis } from '../../types';
import './VoiceRecorder.css';

interface ResponseInputProps {
  questionId: string;
  placeholder?: string;
  maxLength?: number;
  showWordCount?: boolean;
  showCharacterCount?: boolean;
  autoFocus?: boolean;
  className?: string;
  onResponseChange?: (response: string) => void;
  onSubmit?: () => void;
}

export const ResponseInput: React.FC<ResponseInputProps> = ({
  questionId,
  placeholder = "Type your response here...",
  maxLength = 5000,
  showWordCount = true,
  showCharacterCount = false,
  autoFocus = true,
  className = '',
  onResponseChange,
  onSubmit
}) => {
  const { state, actions } = useInterviewSession();
  const { isSubmitting, currentQuestion } = state;
  
  const [response, setResponse] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [speechAnalysis, setSpeechAnalysis] = useState<SpeechAnalysis | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [response]);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus, questionId]);

  // Start timing when user begins typing
  useEffect(() => {
    if (response.length > 0 && startTime === null) {
      setStartTime(Date.now());
    }
  }, [response, startTime]);

  // Notify parent of response changes
  useEffect(() => {
    onResponseChange?.(response);
  }, [response, onResponseChange]);

  const handleResponseChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newResponse = e.target.value;
    if (newResponse.length <= maxLength) {
      setResponse(newResponse);
    }
  }, [maxLength]);

  const handleSubmit = useCallback(async () => {
    if (!response.trim() || isSubmitting || !currentQuestion) return;

    const responseTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    
    try {
      // Include speech analysis data if available
      const submissionData = {
        text: response.trim(),
        speechAnalysis: speechAnalysis || undefined,
        responseTime
      };
      
      await actions.submitResponse(questionId, submissionData.text, submissionData.speechAnalysis);
      
      // Reset form
      setResponse('');
      setStartTime(null);
      setSpeechAnalysis(null);
      
      onSubmit?.();
    } catch (error) {
      console.error('Failed to submit response:', error);
    }
  }, [response, isSubmitting, currentQuestion, questionId, startTime, speechAnalysis, actions, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // Handle voice recorder response changes
  const handleVoiceResponseChange = useCallback((voiceResponse: string) => {
    setResponse(voiceResponse);
    if (voiceResponse.length > 0 && startTime === null) {
      setStartTime(Date.now());
    }
  }, [startTime]);

  // Handle speech analysis completion
  const handleSpeechAnalysisComplete = useCallback((analysis: SpeechAnalysis) => {
    setSpeechAnalysis(analysis);
  }, []);

  // Calculate stats
  const wordCount = response.trim().split(/\s+/).filter(word => word.length > 0).length;
  const characterCount = response.length;
  const isResponseValid = response.trim().length > 0;
  const isNearLimit = characterCount > maxLength * 0.9;

  return (
    <div className={`response-input ${className}`}>
      {/* Text Input */}
      <div className="text-input-container">
        <textarea
          ref={textareaRef}
          value={response}
          onChange={handleResponseChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`response-textarea ${isNearLimit ? 'near-limit' : ''}`}
          disabled={isSubmitting}
          rows={4}
        />
        
        {/* Input Stats */}
        <div className="input-stats">
          {showWordCount && (
            <span className="word-count">
              {wordCount} word{wordCount !== 1 ? 's' : ''}
            </span>
          )}
          
          {showCharacterCount && (
            <span className={`character-count ${isNearLimit ? 'warning' : ''}`}>
              {characterCount} / {maxLength}
            </span>
          )}
          
          {startTime && (
            <span className="response-time">
              {Math.floor((Date.now() - startTime) / 1000)}s
            </span>
          )}
        </div>
      </div>

      {/* Voice Recording with Web Speech API */}
      {currentQuestion?.type !== 'technical' && (
        <VoiceRecorderWithFallback
          onResponseChange={handleVoiceResponseChange}
          onAnalysisComplete={handleSpeechAnalysisComplete}
          placeholder={placeholder}
          disabled={isSubmitting}
          className="voice-input-container"
        />
      )}

      {/* Submit Controls */}
      <div className="submit-controls">
        <div className="submit-info">
          {!isResponseValid && (
            <span className="validation-message">
              Please provide a response before submitting
            </span>
          )}
          
          {isResponseValid && (
            <span className="submit-hint">
              Press Ctrl+Enter or click Submit
            </span>
          )}
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={!isResponseValid || isSubmitting}
          className={`submit-btn ${isResponseValid ? 'ready' : 'disabled'}`}
        >
          {isSubmitting ? (
            <>
              <span className="loading-spinner"></span>
              Submitting...
            </>
          ) : (
            'Submit Response'
          )}
        </button>
      </div>
    </div>
  );
};

// Real-time response analysis preview
interface ResponseAnalysisPreviewProps {
  response: string;
  questionId: string;
  className?: string;
}

export const ResponseAnalysisPreview: React.FC<ResponseAnalysisPreviewProps> = ({
  response,
  questionId,
  className = ''
}) => {
  const { state } = useInterviewSession();
  const { currentQuestion } = state;
  
  const [analysis, setAnalysis] = useState<{
    wordCount: number;
    estimatedScore: number;
    suggestions: string[];
    strengths: string[];
  } | null>(null);

  // Real-time analysis (debounced)
  useEffect(() => {
    if (!response.trim() || !currentQuestion) {
      setAnalysis(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      // Simple real-time analysis
      const words = response.trim().split(/\s+/).filter(w => w.length > 0);
      const wordCount = words.length;
      
      // Basic scoring
      let score = 50; // Base score
      
      // Length scoring
      if (wordCount >= 50) score += 20;
      if (wordCount >= 100) score += 10;
      if (wordCount < 20) score -= 20;
      
      // Keyword matching
      const questionWords = currentQuestion.text.toLowerCase().split(/\s+/);
      const responseWords = response.toLowerCase().split(/\s+/);
      const matches = questionWords.filter(qw => 
        qw.length > 3 && responseWords.some(rw => rw.includes(qw) || qw.includes(rw))
      );
      score += Math.min(20, matches.length * 3);
      
      // Expected elements
      const expectedFound = currentQuestion.expectedElements.filter(element =>
        response.toLowerCase().includes(element.toLowerCase())
      );
      score += expectedFound.length * 5;
      
      const suggestions: string[] = [];
      const strengths: string[] = [];
      
      if (wordCount < 30) {
        suggestions.push('Consider providing more detail in your response');
      }
      if (matches.length === 0) {
        suggestions.push('Try to address the specific question being asked');
      }
      if (expectedFound.length === 0) {
        suggestions.push('Include key concepts mentioned in the question');
      }
      
      if (wordCount >= 50) {
        strengths.push('Good response length');
      }
      if (matches.length > 2) {
        strengths.push('Addresses the question well');
      }
      if (expectedFound.length > 0) {
        strengths.push('Covers expected topics');
      }
      
      setAnalysis({
        wordCount,
        estimatedScore: Math.min(100, Math.max(0, score)),
        suggestions,
        strengths
      });
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [response, currentQuestion]);

  if (!analysis || !response.trim()) return null;

  return (
    <div className={`response-analysis-preview ${className}`}>
      <div className="analysis-header">
        <h4>Live Analysis</h4>
        <div className="estimated-score">
          <span className="score-label">Est. Score:</span>
          <span className={`score-value ${analysis.estimatedScore >= 70 ? 'good' : analysis.estimatedScore >= 50 ? 'fair' : 'poor'}`}>
            {analysis.estimatedScore}/100
          </span>
        </div>
      </div>
      
      <div className="analysis-content">
        <div className="analysis-stats">
          <span className="stat">
            <strong>{analysis.wordCount}</strong> words
          </span>
        </div>
        
        {analysis.strengths.length > 0 && (
          <div className="analysis-strengths">
            <h5>Strengths:</h5>
            <ul>
              {analysis.strengths.map((strength, index) => (
                <li key={index} className="strength-item">
                  ✓ {strength}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {analysis.suggestions.length > 0 && (
          <div className="analysis-suggestions">
            <h5>Suggestions:</h5>
            <ul>
              {analysis.suggestions.map((suggestion, index) => (
                <li key={index} className="suggestion-item">
                  💡 {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

// Hook for response input utilities
export const useResponseInput = () => {
  const [response, setResponse] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  
  const resetResponse = useCallback(() => {
    setResponse('');
    setStartTime(null);
  }, []);
  
  const getResponseTime = useCallback(() => {
    return startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
  }, [startTime]);
  
  const getWordCount = useCallback(() => {
    return response.trim().split(/\s+/).filter(word => word.length > 0).length;
  }, [response]);
  
  const getCharacterCount = useCallback(() => {
    return response.length;
  }, [response]);
  
  return {
    response,
    setResponse,
    startTime,
    setStartTime,
    resetResponse,
    getResponseTime,
    getWordCount,
    getCharacterCount
  };
};