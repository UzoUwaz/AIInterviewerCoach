import { SpeechAnalysis, FillerWordCount, PauseAnalysis, CommunicationScore } from '../types';

/**
 * Web Speech API integration service for speech-to-text and speech analysis
 * Implements browser-based speech recognition with fallback mechanisms
 */
export class SpeechAnalysisService {
  private recognition: SpeechRecognition | null = null;
  private isRecording = false;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private recordingStartTime = 0;
  private transcriptionBuffer: string[] = [];
  private volumeLevels: number[] = [];
  private pauseDetector: PauseDetector;

  constructor() {
    this.pauseDetector = new PauseDetector();
    this.initializeSpeechRecognition();
  }

  /**
   * Initializes Web Speech API with browser compatibility checks
   */
  private initializeSpeechRecognition(): void {
    if (!this.isSpeechRecognitionSupported()) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    if (this.recognition) {
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;
    }
  }

  /**
   * Checks if speech recognition is supported
   */
  isSpeechRecognitionSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Starts speech recording and analysis
   */
  async startRecording(): Promise<void> {
    if (!this.recognition) {
      throw new Error('Speech recognition not available');
    }

    if (this.isRecording) {
      throw new Error('Recording already in progress');
    }

    try {
      // Initialize audio context for volume monitoring
      await this.initializeAudioContext();
      
      // Reset buffers
      this.transcriptionBuffer = [];
      this.volumeLevels = [];
      this.recordingStartTime = Date.now();
      
      // Start speech recognition
      this.recognition.start();
      this.isRecording = true;

      // Start volume monitoring
      this.startVolumeMonitoring();

    } catch (error) {
      console.error('Failed to start recording:', error);
      throw new Error('Failed to start speech recording. Please check microphone permissions.');
    }
  }

  /**
   * Stops speech recording and returns analysis
   */
  async stopRecording(): Promise<SpeechAnalysis> {
    if (!this.isRecording) {
      throw new Error('No recording in progress');
    }

    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not available'));
        return;
      }

      // Set up final result handler
      const handleFinalResult = () => {
        this.isRecording = false;
        this.stopVolumeMonitoring();
        
        const transcription = this.transcriptionBuffer.join(' ').trim();
        const analysis = this.analyzeSpeech(transcription);
        resolve(analysis);
      };

      // Stop recognition
      this.recognition.addEventListener('end', handleFinalResult, { once: true });
      this.recognition.stop();
    });
  }

  /**
   * Sets up event listeners for real-time transcription
   */
  setupRealtimeTranscription(
    onInterimResult: (text: string) => void,
    onFinalResult: (text: string) => void,
    onError: (error: string) => void
  ): void {
    if (!this.recognition) {
      onError('Speech recognition not available');
      return;
    }

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          this.transcriptionBuffer.push(transcript);
          onFinalResult(transcript);
        } else {
          interimTranscript += transcript;
          onInterimResult(transcript);
        }
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      onError(`Speech recognition error: ${event.error}`);
    };

    this.recognition.onend = () => {
      if (this.isRecording) {
        // Restart recognition if it stops unexpectedly, with retry limit
        const maxRetries = 3;
        const currentRetries = (this as any).recognitionRetries || 0;
        
        if (currentRetries < maxRetries) {
          try {
            (this as any).recognitionRetries = currentRetries + 1;
            setTimeout(() => {
              if (this.isRecording && this.recognition) {
                this.recognition.start();
              }
            }, 100); // Small delay before restart
          } catch (error) {
            console.error('Failed to restart recognition:', error);
            onError(`Speech recognition stopped unexpectedly (attempt ${currentRetries + 1}/${maxRetries})`);
          }
        } else {
          onError('Speech recognition failed after multiple attempts. Please try again.');
        }
      } else {
        // Reset retry counter when recording stops normally
        (this as any).recognitionRetries = 0;
      }
    };
  }

  /**
   * Analyzes recorded speech for various metrics
   */
  private analyzeSpeech(transcription: string): SpeechAnalysis {
    const recordingDuration = (Date.now() - this.recordingStartTime) / 1000; // seconds
    
    const pace = this.calculatePace(transcription, recordingDuration);
    const fillerWords = this.detectFillerWords(transcription);
    const clarity = this.calculateClarity(transcription, this.volumeLevels);
    const confidence = this.estimateConfidence(transcription, this.volumeLevels);
    const volume = this.calculateAverageVolume(this.volumeLevels);
    const pauses = this.pauseDetector.detectPauses(this.volumeLevels, recordingDuration);

    return {
      pace,
      fillerWords,
      clarity,
      confidence,
      volume,
      pauses,
      transcription
    };
  }

  /**
   * Calculates speaking pace in words per minute with enhanced accuracy
   */
  private calculatePace(transcription: string, durationSeconds: number): number {
    if (durationSeconds === 0 || !transcription.trim()) return 0;
    
    // Clean the transcription and count meaningful words
    const cleanedText = transcription
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    if (!cleanedText) return 0;
    
    // Count words, excluding very short words that might be artifacts
    const words = cleanedText.split(/\s+/).filter(word => word.length > 1);
    const wordCount = words.length;
    
    if (wordCount === 0) return 0;
    
    const minutes = durationSeconds / 60;
    const pace = wordCount / minutes;
    
    // Round to nearest integer, with reasonable bounds
    return Math.round(Math.max(0, Math.min(500, pace))); // Cap at 500 WPM (very fast)
  }

  /**
   * Detects and counts filler words with enhanced patterns
   */
  private detectFillerWords(transcription: string): FillerWordCount[] {
    // Comprehensive list of filler words and phrases
    const fillerPatterns = [
      // Basic fillers
      { pattern: '\\bum\\b', word: 'um' },
      { pattern: '\\buh\\b', word: 'uh' },
      { pattern: '\\ber\\b', word: 'er' },
      { pattern: '\\bah\\b', word: 'ah' },
      { pattern: '\\behm\\b', word: 'ehm' },
      
      // Common verbal fillers
      { pattern: '\\blike\\b', word: 'like' },
      { pattern: '\\bso\\b(?=\\s)', word: 'so' }, // Only count 'so' when followed by space
      { pattern: '\\bwell\\b(?=\\s|,)', word: 'well' },
      { pattern: '\\bokay\\b', word: 'okay' },
      { pattern: '\\byeah\\b', word: 'yeah' },
      { pattern: '\\bright\\b(?=\\s|,|\\?)', word: 'right' },
      
      // Intensifiers used as fillers
      { pattern: '\\bactually\\b', word: 'actually' },
      { pattern: '\\bbasically\\b', word: 'basically' },
      { pattern: '\\bliterally\\b', word: 'literally' },
      { pattern: '\\bobviously\\b', word: 'obviously' },
      { pattern: '\\bclearly\\b', word: 'clearly' },
      
      // Phrases
      { pattern: '\\byou know\\b', word: 'you know' },
      { pattern: '\\bi mean\\b', word: 'i mean' },
      { pattern: '\\bkind of\\b', word: 'kind of' },
      { pattern: '\\bsort of\\b', word: 'sort of' },
      { pattern: '\\blet me see\\b', word: 'let me see' },
      { pattern: '\\blet me think\\b', word: 'let me think' },
      
      // Hesitation patterns
      { pattern: '\\bhm+\\b', word: 'hmm' },
      { pattern: '\\bmm+\\b', word: 'mmm' },
      { pattern: '\\boh\\b(?=\\s)', word: 'oh' }
    ];

    const transcriptionLower = transcription.toLowerCase();
    const fillerCounts: FillerWordCount[] = [];

    fillerPatterns.forEach(({ pattern, word }) => {
      const regex = new RegExp(pattern, 'gi');
      const matches = transcriptionLower.match(regex);
      const count = matches ? matches.length : 0;
      
      if (count > 0) {
        fillerCounts.push({ word, count });
      }
    });

    // Sort by count (descending) and then alphabetically for consistency
    return fillerCounts.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.word.localeCompare(b.word);
    });
  }

  /**
   * Calculates speech clarity based on transcription quality and volume consistency
   */
  private calculateClarity(transcription: string, volumeLevels: number[]): number {
    let clarityScore = 80; // Base score

    // Penalize for excessive filler words
    const fillerWords = this.detectFillerWords(transcription);
    const totalFillers = fillerWords.reduce((sum, fw) => sum + fw.count, 0);
    const wordCount = transcription.split(/\s+/).length;
    const fillerRatio = wordCount > 0 ? totalFillers / wordCount : 0;
    
    clarityScore -= Math.min(30, fillerRatio * 100);

    // Consider volume consistency
    if (volumeLevels.length > 0) {
      const volumeVariance = this.calculateVariance(volumeLevels);
      const volumeConsistency = Math.max(0, 100 - volumeVariance);
      clarityScore = (clarityScore + volumeConsistency) / 2;
    }

    // Penalize for very short responses
    if (wordCount < 10) {
      clarityScore *= 0.7;
    }

    return Math.round(Math.max(0, Math.min(100, clarityScore)));
  }

  /**
   * Estimates confidence based on speech patterns, volume, and linguistic cues
   */
  private estimateConfidence(transcription: string, volumeLevels: number[]): number {
    let confidenceScore = 70; // Base score
    const transcriptionLower = transcription.toLowerCase();
    const wordCount = transcription.split(/\s+/).filter(w => w.length > 0).length;

    // Strong confidence indicators
    const strongConfidenceWords = [
      'definitely', 'certainly', 'absolutely', 'clearly', 'obviously',
      'confident', 'sure', 'positive', 'know for sure', 'without doubt'
    ];

    // Moderate confidence indicators
    const moderateConfidenceWords = [
      'believe', 'think', 'feel', 'expect', 'understand', 'realize'
    ];

    // Uncertainty indicators (weighted by severity)
    const strongUncertaintyWords = [
      'not sure', 'uncertain', 'confused', 'don\'t know', 'no idea'
    ];
    
    const moderateUncertaintyWords = [
      'maybe', 'perhaps', 'possibly', 'might', 'could be', 'probably',
      'i think', 'i guess', 'i suppose', 'seems like'
    ];

    // Count indicators with different weights
    const strongConfidenceCount = strongConfidenceWords.filter(word => 
      transcriptionLower.includes(word)
    ).length;
    
    const moderateConfidenceCount = moderateConfidenceWords.filter(word => 
      transcriptionLower.includes(word)
    ).length;
    
    const strongUncertaintyCount = strongUncertaintyWords.filter(word => 
      transcriptionLower.includes(word)
    ).length;
    
    const moderateUncertaintyCount = moderateUncertaintyWords.filter(word => 
      transcriptionLower.includes(word)
    ).length;

    // Apply weighted scoring
    confidenceScore += strongConfidenceCount * 12;
    confidenceScore += moderateConfidenceCount * 6;
    confidenceScore -= strongUncertaintyCount * 15;
    confidenceScore -= moderateUncertaintyCount * 8;

    // Analyze filler word density (high density indicates nervousness)
    const fillerWords = this.detectFillerWords(transcription);
    const totalFillers = fillerWords.reduce((sum, fw) => sum + fw.count, 0);
    const fillerDensity = wordCount > 0 ? totalFillers / wordCount : 0;
    
    if (fillerDensity > 0.15) { // More than 15% filler words
      confidenceScore -= 20;
    } else if (fillerDensity > 0.08) { // More than 8% filler words
      confidenceScore -= 10;
    }

    // Volume consistency analysis
    if (volumeLevels.length > 0) {
      const avgVolume = this.calculateAverageVolume(volumeLevels);
      const volumeVariance = this.calculateVariance(volumeLevels);
      
      // Confident speakers have moderate, consistent volume
      if (avgVolume >= 40 && avgVolume <= 80) {
        confidenceScore += 8;
      } else if (avgVolume < 25) {
        confidenceScore -= 12; // Very quiet suggests lack of confidence
      } else if (avgVolume > 90) {
        confidenceScore -= 5; // Very loud might indicate overcompensation
      }
      
      // Low variance indicates steady, confident delivery
      if (volumeVariance < 15) {
        confidenceScore += 5;
      } else if (volumeVariance > 30) {
        confidenceScore -= 8;
      }
    }

    // Pace analysis (confident speakers have moderate, steady pace)
    const estimatedDuration = (Date.now() - this.recordingStartTime) / 1000 / 60;
    const pace = estimatedDuration > 0 ? wordCount / estimatedDuration : 0;
    
    if (pace >= 120 && pace <= 180) {
      confidenceScore += 5; // Optimal pace range
    } else if (pace < 80) {
      confidenceScore -= 8; // Too slow might indicate hesitation
    } else if (pace > 220) {
      confidenceScore -= 12; // Too fast indicates nervousness
    }

    // Response length analysis
    if (wordCount < 5) {
      confidenceScore -= 15; // Very short responses suggest uncertainty
    } else if (wordCount >= 20 && wordCount <= 100) {
      confidenceScore += 5; // Good response length
    }

    // Sentence structure analysis (simple heuristic)
    const sentences = transcription.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWordsPerSentence = sentences.length > 0 ? wordCount / sentences.length : 0;
    
    if (avgWordsPerSentence >= 8 && avgWordsPerSentence <= 20) {
      confidenceScore += 3; // Well-structured sentences
    }

    return Math.round(Math.max(20, Math.min(100, confidenceScore)));
  }

  /**
   * Calculates average volume level
   */
  private calculateAverageVolume(volumeLevels: number[]): number {
    if (volumeLevels.length === 0) return 0;
    
    const sum = volumeLevels.reduce((acc, level) => acc + level, 0);
    return Math.round(sum / volumeLevels.length);
  }

  /**
   * Calculates variance for volume consistency
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Initializes audio context for volume monitoring
   */
  private async initializeAudioContext(): Promise<void> {
    try {
      // Check for getUserMedia support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported in this browser');
      }

      // Request microphone access with enhanced constraints
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        } 
      });

      // Check for AudioContext support
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('AudioContext not supported in this browser');
      }

      this.audioContext = new AudioContextClass();
      
      // Resume audio context if suspended (required by some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      
      // Optimize analyser settings for voice
      this.analyser.fftSize = 512; // Increased for better frequency resolution
      this.analyser.smoothingTimeConstant = 0.3; // Smooth out rapid changes
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;
      
      source.connect(this.analyser);
      
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      
      // Provide specific error messages based on error type
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          throw new Error('Microphone permission denied. Please allow microphone access and try again.');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          throw new Error('No microphone found. Please connect a microphone and try again.');
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          throw new Error('Microphone is already in use by another application.');
        } else if (error.message.includes('not supported')) {
          throw error; // Re-throw browser support errors as-is
        }
      }
      
      throw new Error('Failed to access microphone. Please check your browser settings and try again.');
    }
  }

  /**
   * Starts monitoring volume levels
   */
  private startVolumeMonitoring(): void {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animationId: number;

    const monitorVolume = () => {
      if (!this.isRecording || !this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);
      
      // Calculate RMS volume with improved algorithm
      let sum = 0;
      let nonZeroCount = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        if (dataArray[i] > 0) {
          sum += dataArray[i] * dataArray[i];
          nonZeroCount++;
        }
      }
      
      // Avoid division by zero and improve sensitivity
      const avgSquared = nonZeroCount > 0 ? sum / nonZeroCount : 0;
      const rms = Math.sqrt(avgSquared);
      
      // Enhanced volume calculation with better scaling
      let volume = Math.round((rms / 128) * 100); // Use 128 instead of 255 for better sensitivity
      volume = Math.min(100, Math.max(0, volume)); // Clamp between 0-100
      
      this.volumeLevels.push(volume);

      // Continue monitoring with proper cleanup
      if (this.isRecording) {
        animationId = requestAnimationFrame(monitorVolume);
      }
    };

    // Store animation ID for cleanup
    animationId = requestAnimationFrame(monitorVolume);
    
    // Store cleanup function
    (this as any).stopVolumeAnimation = () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }

  /**
   * Stops volume monitoring and cleans up resources
   */
  private stopVolumeMonitoring(): void {
    // Stop animation frame
    if ((this as any).stopVolumeAnimation) {
      (this as any).stopVolumeAnimation();
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(console.error);
      this.audioContext = null;
    }

    this.analyser = null;
  }

  /**
   * Creates a communication score from speech analysis
   */
  createCommunicationScore(analysis: SpeechAnalysis): CommunicationScore {
    return {
      score: Math.round((analysis.clarity + analysis.confidence) / 2),
      confidence: analysis.confidence,
      pace: analysis.pace,
      fillerWords: analysis.fillerWords,
      clarity: analysis.clarity
    };
  }

  /**
   * Provides graceful fallback when speech API is unavailable
   */
  createFallbackAnalysis(textContent: string, responseTime: number): SpeechAnalysis {
    const wordCount = textContent.split(/\s+/).length;
    const estimatedPace = responseTime > 0 ? Math.round((wordCount / (responseTime / 60))) : 0;
    
    return {
      pace: estimatedPace,
      fillerWords: this.detectFillerWords(textContent),
      clarity: 75, // Default clarity for text input
      confidence: 70, // Default confidence for text input
      volume: 50, // Default volume
      pauses: [], // No pause detection for text
      transcription: textContent
    };
  }

  /**
   * Gets the current volume level (0-100)
   */
  getCurrentVolume(): number {
    if (!this.analyser || !this.isRecording) return 0;
    
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);
    
    // Calculate current RMS volume
    let sum = 0;
    let nonZeroCount = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      if (dataArray[i] > 0) {
        sum += dataArray[i] * dataArray[i];
        nonZeroCount++;
      }
    }
    
    const avgSquared = nonZeroCount > 0 ? sum / nonZeroCount : 0;
    const rms = Math.sqrt(avgSquared);
    let volume = Math.round((rms / 128) * 100);
    
    return Math.min(100, Math.max(0, volume));
  }

  /**
   * Checks if currently recording
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Gets recording duration in seconds
   */
  getRecordingDuration(): number {
    if (!this.isRecording || this.recordingStartTime === 0) return 0;
    return (Date.now() - this.recordingStartTime) / 1000;
  }

  /**
   * Cleans up resources
   */
  cleanup(): void {
    if (this.isRecording) {
      this.recognition?.stop();
    }
    this.stopVolumeMonitoring();
    
    // Reset retry counter
    (this as any).recognitionRetries = 0;
  }
}

/**
 * Pause detection utility class
 */
class PauseDetector {
  private readonly SILENCE_THRESHOLD = 10; // Volume threshold for silence
  private readonly MIN_PAUSE_DURATION = 0.5; // Minimum pause duration in seconds

  /**
   * Detects pauses in speech based on volume levels
   */
  detectPauses(volumeLevels: number[], totalDuration: number): PauseAnalysis[] {
    if (volumeLevels.length === 0) return [];

    const pauses: PauseAnalysis[] = [];
    const samplesPerSecond = volumeLevels.length / totalDuration;
    
    let pauseStart = -1;
    let inPause = false;

    for (let i = 0; i < volumeLevels.length; i++) {
      const volume = volumeLevels[i];
      const timestamp = i / samplesPerSecond;

      if (volume <= this.SILENCE_THRESHOLD && !inPause) {
        // Start of pause
        pauseStart = timestamp;
        inPause = true;
      } else if (volume > this.SILENCE_THRESHOLD && inPause) {
        // End of pause
        const pauseDuration = timestamp - pauseStart;
        
        if (pauseDuration >= this.MIN_PAUSE_DURATION) {
          pauses.push({
            duration: pauseDuration,
            timestamp: pauseStart,
            type: this.classifyPause(pauseDuration)
          });
        }
        
        inPause = false;
        pauseStart = -1;
      }
    }

    // Handle pause that extends to the end
    if (inPause && pauseStart >= 0) {
      const pauseDuration = totalDuration - pauseStart;
      if (pauseDuration >= this.MIN_PAUSE_DURATION) {
        pauses.push({
          duration: pauseDuration,
          timestamp: pauseStart,
          type: this.classifyPause(pauseDuration)
        });
      }
    }

    return pauses;
  }

  /**
   * Classifies pause type based on duration
   */
  private classifyPause(duration: number): 'natural' | 'hesitation' | 'thinking' {
    if (duration < 1) return 'natural';
    if (duration < 3) return 'hesitation';
    return 'thinking';
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    AudioContext: any;
    webkitAudioContext: any;
  }
}

// Type declarations for Speech Recognition API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  addEventListener(type: string, listener: EventListener, options?: any): void;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}