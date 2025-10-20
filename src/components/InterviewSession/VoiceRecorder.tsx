import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SpeechAnalysisService } from '../../services/SpeechAnalysisService';
import { SpeechAnalysis } from '../../types';

interface VoiceRecorderProps {
  onTranscription?: (text: string, isFinal: boolean) => void;
  onAnalysisComplete?: (analysis: SpeechAnalysis) => void;
  onError?: (error: string) => void;
  onVolumeChange?: (volume: number) => void;
  disabled?: boolean;
  className?: string;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onTranscription,
  onAnalysisComplete,
  onError,
  onVolumeChange,
  disabled = false,
  className = ''
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [interimTranscription, setInterimTranscription] = useState('');
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const speechServiceRef = useRef<SpeechAnalysisService | null>(null);
  const volumeMonitorRef = useRef<number | null>(null);

  // Initialize speech service
  useEffect(() => {
    speechServiceRef.current = new SpeechAnalysisService();
    setIsSupported(speechServiceRef.current.isSpeechRecognitionSupported());

    return () => {
      speechServiceRef.current?.cleanup();
    };
  }, []);

  // Set up real-time transcription handlers
  useEffect(() => {
    if (!speechServiceRef.current || !isSupported) return;

    speechServiceRef.current.setupRealtimeTranscription(
      (interimText: string) => {
        setInterimTranscription(interimText);
        onTranscription?.(interimText, false);
      },
      (finalText: string) => {
        setCurrentTranscription(prev => prev + ' ' + finalText);
        setInterimTranscription('');
        onTranscription?.(finalText, true);
      },
      (errorMessage: string) => {
        setError(errorMessage);
        onError?.(errorMessage);
        setIsRecording(false);
      }
    );
  }, [isSupported, onTranscription, onError]);

  // Volume monitoring
  const startVolumeMonitoring = useCallback(() => {
    const updateVolume = () => {
      if (isRecording && speechServiceRef.current) {
        // Get real-time volume from the speech service
        const currentVolume = speechServiceRef.current.getCurrentVolume();
        setVolume(currentVolume);
        onVolumeChange?.(currentVolume);
        volumeMonitorRef.current = requestAnimationFrame(updateVolume);
      }
    };
    updateVolume();
  }, [isRecording, onVolumeChange]);

  const stopVolumeMonitoring = useCallback(() => {
    if (volumeMonitorRef.current) {
      cancelAnimationFrame(volumeMonitorRef.current);
      volumeMonitorRef.current = null;
    }
    setVolume(0);
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!speechServiceRef.current || !isSupported || disabled) return;

    try {
      setError(null);
      setCurrentTranscription('');
      setInterimTranscription('');
      
      await speechServiceRef.current.startRecording();
      setIsRecording(true);
      startVolumeMonitoring();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [isSupported, disabled, onError, startVolumeMonitoring]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (!speechServiceRef.current || !isRecording) return;

    try {
      const analysis = await speechServiceRef.current.stopRecording();
      setIsRecording(false);
      stopVolumeMonitoring();
      
      onAnalysisComplete?.(analysis);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop recording';
      setError(errorMessage);
      onError?.(errorMessage);
      setIsRecording(false);
      stopVolumeMonitoring();
    }
  }, [isRecording, onAnalysisComplete, onError, stopVolumeMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVolumeMonitoring();
    };
  }, [stopVolumeMonitoring]);

  // Fallback for unsupported browsers
  if (!isSupported) {
    return (
      <div className={`voice-recorder unsupported ${className}`}>
        <div className="unsupported-message">
          <span className="icon">🎤</span>
          <p>Speech recognition is not supported in this browser.</p>
          <p>Please use text input instead.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`voice-recorder ${isRecording ? 'recording' : ''} ${className}`}>
      {/* Recording Controls */}
      <div className="recording-controls">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={disabled}
            className="record-btn"
            title="Start voice recording"
          >
            <span className="icon">🎤</span>
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="stop-btn"
            title="Stop recording and analyze"
          >
            <span className="icon">⏹</span>
            Stop Recording
          </button>
        )}
      </div>

      {/* Recording Status */}
      {isRecording && (
        <div className="recording-status">
          <div className="recording-indicator">
            <div className="pulse-animation"></div>
            <span>Recording...</span>
          </div>
          
          {/* Volume Meter */}
          <div className="volume-meter">
            <div className="volume-label">Volume:</div>
            <div className="volume-bar">
              <div 
                className="volume-fill"
                style={{ width: `${Math.min(100, volume)}%` }}
              ></div>
            </div>
            <div className="volume-value">{Math.round(volume)}%</div>
          </div>
        </div>
      )}

      {/* Live Transcription */}
      {(currentTranscription || interimTranscription) && (
        <div className="live-transcription">
          <div className="transcription-header">
            <span className="icon">📝</span>
            Live Transcription
          </div>
          <div className="transcription-content">
            <span className="final-text">{currentTranscription}</span>
            {interimTranscription && (
              <span className="interim-text"> {interimTranscription}</span>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <span className="icon">⚠️</span>
          <span>{error}</span>
          <button 
            onClick={() => setError(null)}
            className="dismiss-error"
            title="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Instructions */}
      {!isRecording && !error && (
        <div className="instructions">
          <p>Click "Start Recording" to begin voice input.</p>
          <p>Speak clearly and at a normal pace for best results.</p>
        </div>
      )}
    </div>
  );
};

// Hook for voice recorder functionality
export const useVoiceRecorder = () => {
  const [transcription, setTranscription] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [analysis, setAnalysis] = useState<SpeechAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);

  const handleTranscription = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      setTranscription(prev => prev + ' ' + text);
    }
  }, []);

  const handleAnalysisComplete = useCallback((speechAnalysis: SpeechAnalysis) => {
    setAnalysis(speechAnalysis);
    setTranscription(speechAnalysis.transcription);
    setIsRecording(false);
  }, []);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsRecording(false);
  }, []);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
  }, []);

  const clearTranscription = useCallback(() => {
    setTranscription('');
    setAnalysis(null);
    setError(null);
  }, []);

  const resetRecorder = useCallback(() => {
    setTranscription('');
    setAnalysis(null);
    setError(null);
    setVolume(0);
    setIsRecording(false);
  }, []);

  return {
    transcription,
    isRecording,
    analysis,
    error,
    volume,
    handleTranscription,
    handleAnalysisComplete,
    handleError,
    handleVolumeChange,
    clearTranscription,
    resetRecorder
  };
};

// Voice Recorder with Text Fallback Component
interface VoiceRecorderWithFallbackProps {
  onResponseChange: (response: string) => void;
  onAnalysisComplete?: (analysis: SpeechAnalysis) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const VoiceRecorderWithFallback: React.FC<VoiceRecorderWithFallbackProps> = ({
  onResponseChange,
  onAnalysisComplete,
  placeholder = "Type your response or use voice recording...",
  disabled = false,
  className = ''
}) => {
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [textResponse, setTextResponse] = useState('');
  const speechServiceRef = useRef<SpeechAnalysisService | null>(null);

  const {
    transcription,
    analysis,
    handleTranscription,
    handleAnalysisComplete,
    handleError,
    handleVolumeChange,
    resetRecorder
  } = useVoiceRecorder();

  // Initialize speech service
  useEffect(() => {
    speechServiceRef.current = new SpeechAnalysisService();
    
    return () => {
      speechServiceRef.current?.cleanup();
    };
  }, []);

  // Update response when transcription changes
  useEffect(() => {
    if (inputMode === 'voice' && transcription) {
      onResponseChange(transcription);
    }
  }, [transcription, inputMode, onResponseChange]);

  // Update response when text changes
  useEffect(() => {
    if (inputMode === 'text') {
      onResponseChange(textResponse);
    }
  }, [textResponse, inputMode, onResponseChange]);

  // Handle analysis completion
  const handleVoiceAnalysisComplete = useCallback((speechAnalysis: SpeechAnalysis) => {
    handleAnalysisComplete(speechAnalysis);
    onAnalysisComplete?.(speechAnalysis);
  }, [handleAnalysisComplete, onAnalysisComplete]);

  // Handle text input fallback analysis
  const handleTextAnalysis = useCallback(() => {
    if (!speechServiceRef.current || !textResponse.trim()) return;

    const responseTime = 30; // Estimated response time for text input
    const fallbackAnalysis = speechServiceRef.current.createFallbackAnalysis(textResponse, responseTime);
    onAnalysisComplete?.(fallbackAnalysis);
  }, [textResponse, onAnalysisComplete]);

  // Switch input modes
  const switchToVoice = useCallback(() => {
    setInputMode('voice');
    setTextResponse('');
    resetRecorder();
  }, [resetRecorder]);

  const switchToText = useCallback(() => {
    setInputMode('text');
    resetRecorder();
  }, [resetRecorder]);

  const isVoiceSupported = speechServiceRef.current?.isSpeechRecognitionSupported() ?? false;

  return (
    <div className={`voice-recorder-with-fallback ${className}`}>
      {/* Input Mode Selector */}
      <div className="input-mode-selector">
        <button
          onClick={switchToText}
          className={`mode-btn ${inputMode === 'text' ? 'active' : ''}`}
          disabled={disabled}
        >
          <span className="icon">⌨️</span>
          Text Input
        </button>
        
        {isVoiceSupported && (
          <button
            onClick={switchToVoice}
            className={`mode-btn ${inputMode === 'voice' ? 'active' : ''}`}
            disabled={disabled}
          >
            <span className="icon">🎤</span>
            Voice Input
          </button>
        )}
      </div>

      {/* Input Interface */}
      {inputMode === 'text' ? (
        <div className="text-input-section">
          <textarea
            value={textResponse}
            onChange={(e) => setTextResponse(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="response-textarea"
            rows={4}
          />
          
          {textResponse.trim() && (
            <button
              onClick={handleTextAnalysis}
              className="analyze-btn"
              disabled={disabled}
            >
              Analyze Response
            </button>
          )}
        </div>
      ) : (
        <VoiceRecorder
          onTranscription={handleTranscription}
          onAnalysisComplete={handleVoiceAnalysisComplete}
          onError={handleError}
          onVolumeChange={handleVolumeChange}
          disabled={disabled}
          className="voice-input-section"
        />
      )}

      {/* Response Preview */}
      {(transcription || textResponse) && (
        <div className="response-preview">
          <div className="preview-header">
            <span className="icon">👁️</span>
            Response Preview
          </div>
          <div className="preview-content">
            {inputMode === 'voice' ? transcription : textResponse}
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="analysis-results">
          <div className="analysis-header">
            <span className="icon">📊</span>
            Speech Analysis Results
          </div>
          <div className="analysis-metrics">
            <div className="metric">
              <span className="label">Pace:</span>
              <span className="value">{analysis.pace} WPM</span>
            </div>
            <div className="metric">
              <span className="label">Clarity:</span>
              <span className="value">{analysis.clarity}%</span>
            </div>
            <div className="metric">
              <span className="label">Confidence:</span>
              <span className="value">{analysis.confidence}%</span>
            </div>
            {analysis.fillerWords.length > 0 && (
              <div className="metric">
                <span className="label">Filler Words:</span>
                <span className="value">
                  {analysis.fillerWords.map(fw => `${fw.word} (${fw.count})`).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};