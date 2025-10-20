import { Session, UserResponse, PerformanceScore } from '../types';
import { StorageManager } from '../storage/StorageManager';

export interface SessionSnapshot {
  sessionId: string;
  userId: string;
  timestamp: Date;
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  currentQuestionIndex: number;
  responses: UserResponse[];
  timeElapsed: number;
  status: 'active' | 'paused' | 'completed';
  metadata: {
    lastActivity: Date;
    deviceInfo: string;
    browserInfo: string;
  };
}

export interface SessionRecoveryInfo {
  sessionId: string;
  userId: string;
  lastActivity: Date;
  progress: number;
  canRecover: boolean;
  timeElapsed: number;
}

export interface SessionHistoryEntry {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  questionsAnswered: number;
  overallScore: number;
  status: 'completed' | 'abandoned';
  config: {
    categories: string[];
    difficulty: string;
    duration: number;
  };
}

export class SessionPersistenceService {
  private storageManager: StorageManager;
  private snapshotInterval: number = 30000; // 30 seconds
  private maxRecoveryAge: number = 24 * 60 * 60 * 1000; // 24 hours
  private activeSnapshots: Map<string, NodeJS.Timeout> = new Map();

  constructor(storageManager: StorageManager) {
    this.storageManager = storageManager;
  }

  /**
   * Start automatic session persistence for an active session
   */
  startSessionPersistence(sessionId: string): void {
    // Clear any existing snapshot timer
    this.stopSessionPersistence(sessionId);

    const timer = setInterval(async () => {
      try {
        await this.createSessionSnapshot(sessionId);
      } catch (error) {
        console.error(`Failed to create snapshot for session ${sessionId}:`, error);
      }
    }, this.snapshotInterval);

    this.activeSnapshots.set(sessionId, timer);
  }

  /**
   * Stop automatic session persistence
   */
  stopSessionPersistence(sessionId: string): void {
    const timer = this.activeSnapshots.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.activeSnapshots.delete(sessionId);
    }
  }

  /**
   * Create a snapshot of the current session state
   */
  async createSessionSnapshot(sessionId: string): Promise<SessionSnapshot | null> {
    try {
      const session = await this.storageManager.getSession(sessionId);
      if (!session) {
        return null;
      }

      const responses = await this.storageManager.getSessionResponses(sessionId);
      
      const snapshot: SessionSnapshot = {
        sessionId,
        userId: session.userId,
        timestamp: new Date(),
        progress: {
          completed: responses.length,
          total: session.questions.length,
          percentage: session.questions.length > 0 
            ? Math.round((responses.length / session.questions.length) * 100) 
            : 0
        },
        currentQuestionIndex: responses.length,
        responses,
        timeElapsed: this.calculateTimeElapsed(session),
        status: session.status,
        metadata: {
          lastActivity: new Date(),
          deviceInfo: this.getDeviceInfo(),
          browserInfo: this.getBrowserInfo()
        }
      };

      // Save snapshot
      await this.saveSnapshot(snapshot);
      
      return snapshot;
    } catch (error) {
      console.error('Failed to create session snapshot:', error);
      return null;
    }
  }

  /**
   * Save session snapshot to storage
   */
  private async saveSnapshot(snapshot: SessionSnapshot): Promise<void> {
    await this.storageManager.query('snapshots', { sessionId: snapshot.sessionId })
      .then(existing => {
        if (existing.length > 0) {
          // Update existing snapshot
          const updated = Object.assign({}, existing[0], snapshot);
          return this.storageManager.saveSession(updated as any);
        } else {
          // Create new snapshot
          return this.storageManager.saveSession(snapshot as any);
        }
      });

    // Also save to localStorage for quick recovery
    localStorage.setItem(
      `interview-coach:snapshot:${snapshot.sessionId}`,
      JSON.stringify(snapshot)
    );
  }

  /**
   * Get recoverable sessions for a user
   */
  async getRecoverableSessions(userId: string): Promise<SessionRecoveryInfo[]> {
    try {
      const snapshots = await this.storageManager.query<SessionSnapshot>('snapshots', { userId });
      const now = Date.now();

      return snapshots
        .filter(snapshot => {
          const age = now - new Date(snapshot.timestamp).getTime();
          return age < this.maxRecoveryAge && 
                 snapshot.status !== 'completed' &&
                 snapshot.progress.percentage < 100;
        })
        .map(snapshot => ({
          sessionId: snapshot.sessionId,
          userId: snapshot.userId,
          lastActivity: snapshot.metadata.lastActivity,
          progress: snapshot.progress.percentage,
          canRecover: true,
          timeElapsed: snapshot.timeElapsed
        }))
        .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
    } catch (error) {
      console.error('Failed to get recoverable sessions:', error);
      return [];
    }
  }

  /**
   * Recover a session from snapshot
   */
  async recoverSession(sessionId: string): Promise<Session | null> {
    try {
      // Try to get from storage first
      let session = await this.storageManager.getSession(sessionId);
      
      if (!session) {
        // Try to recover from localStorage snapshot
        const snapshotData = localStorage.getItem(`interview-coach:snapshot:${sessionId}`);
        if (snapshotData) {
          const snapshot: SessionSnapshot = JSON.parse(snapshotData);
          
          // Reconstruct session from snapshot
          session = await this.reconstructSessionFromSnapshot(snapshot);
        }
      }

      if (session && session.status !== 'completed') {
        // Update session status to active for recovery
        session.status = 'active';
        await this.storageManager.saveSession(session);
        
        // Start persistence for recovered session
        this.startSessionPersistence(sessionId);
      }

      return session;
    } catch (error) {
      console.error('Failed to recover session:', error);
      return null;
    }
  }

  /**
   * Get session history for a user
   */
  async getSessionHistory(userId: string, limit: number = 50): Promise<SessionHistoryEntry[]> {
    try {
      const sessions = await this.storageManager.getUserSessions(userId);
      
      return sessions
        .map(session => ({
          sessionId: session.id,
          startTime: session.startTime,
          endTime: session.endTime,
          duration: this.calculateTimeElapsed(session),
          questionsAnswered: session.responses.length,
          overallScore: session.analysis.overallScore,
          status: (session.status === 'completed' ? 'completed' : 'abandoned') as 'completed' | 'abandoned',
          config: {
            categories: session.config.questionCategories,
            difficulty: session.config.difficulty,
            duration: session.config.duration
          }
        }))
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get session history:', error);
      return [];
    }
  }

  /**
   * Get session analytics for a user
   */
  async getSessionAnalytics(userId: string): Promise<{
    totalSessions: number;
    completedSessions: number;
    totalTimeSpent: number;
    averageScore: number;
    improvementTrend: number;
    categoryPerformance: Array<{ category: string; averageScore: number; sessionCount: number }>;
    recentActivity: Array<{ date: string; sessionsCount: number; averageScore: number }>;
  }> {
    try {
      const sessions = await this.storageManager.getUserSessions(userId);
      const performanceScores = await this.storageManager.getUserPerformanceScores(userId);

      const completedSessions = sessions.filter(s => s.status === 'completed');
      const totalTimeSpent = sessions.reduce((total, session) => 
        total + this.calculateTimeElapsed(session), 0
      );

      const scores = performanceScores.map(p => p.overallScore).filter(s => s > 0);
      const averageScore = scores.length > 0 
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
        : 0;

      // Calculate improvement trend (last 5 vs previous 5 sessions)
      const recentScores = scores.slice(0, 5);
      const previousScores = scores.slice(5, 10);
      const recentAvg = recentScores.length > 0 
        ? recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length 
        : 0;
      const previousAvg = previousScores.length > 0 
        ? previousScores.reduce((sum, score) => sum + score, 0) / previousScores.length 
        : 0;
      const improvementTrend = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

      // Category performance
      const categoryStats = new Map<string, { scores: number[]; count: number }>();
      completedSessions.forEach(session => {
        session.config.questionCategories.forEach(category => {
          if (!categoryStats.has(category)) {
            categoryStats.set(category, { scores: [], count: 0 });
          }
          const stats = categoryStats.get(category)!;
          stats.scores.push(session.analysis.overallScore);
          stats.count++;
        });
      });

      const categoryPerformance = Array.from(categoryStats.entries()).map(([category, stats]) => ({
        category,
        averageScore: stats.scores.reduce((sum, score) => sum + score, 0) / stats.scores.length,
        sessionCount: stats.count
      }));

      // Recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentSessions = completedSessions.filter(session => 
        new Date(session.startTime) >= thirtyDaysAgo
      );

      const activityByDate = new Map<string, { count: number; scores: number[] }>();
      recentSessions.forEach(session => {
        const dateKey = new Date(session.startTime).toISOString().split('T')[0];
        if (!activityByDate.has(dateKey)) {
          activityByDate.set(dateKey, { count: 0, scores: [] });
        }
        const activity = activityByDate.get(dateKey)!;
        activity.count++;
        activity.scores.push(session.analysis.overallScore);
      });

      const recentActivity = Array.from(activityByDate.entries()).map(([date, activity]) => ({
        date,
        sessionsCount: activity.count,
        averageScore: activity.scores.reduce((sum, score) => sum + score, 0) / activity.scores.length
      })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
        totalSessions: sessions.length,
        completedSessions: completedSessions.length,
        totalTimeSpent,
        averageScore,
        improvementTrend,
        categoryPerformance,
        recentActivity
      };
    } catch (error) {
      console.error('Failed to get session analytics:', error);
      return {
        totalSessions: 0,
        completedSessions: 0,
        totalTimeSpent: 0,
        averageScore: 0,
        improvementTrend: 0,
        categoryPerformance: [],
        recentActivity: []
      };
    }
  }

  /**
   * Clean up old snapshots and abandoned sessions
   */
  async cleanupOldData(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - maxAge);
      
      // Clean up old snapshots
      const oldSnapshots = await this.storageManager.query<SessionSnapshot>('snapshots', {
        timestamp: { $lt: cutoffDate }
      });

      for (const snapshot of oldSnapshots) {
        await this.storageManager.deleteSession(snapshot.sessionId);
        localStorage.removeItem(`interview-coach:snapshot:${snapshot.sessionId}`);
      }

      // Clean up abandoned sessions
      const abandonedSessions = await this.storageManager.query<Session>('sessions', {
        status: { $in: ['active', 'paused'] },
        startTime: { $lt: cutoffDate }
      });

      for (const session of abandonedSessions) {
        // Mark as abandoned instead of deleting
        session.status = 'completed';
        await this.storageManager.saveSession(session);
      }

      console.log(`Cleaned up ${oldSnapshots.length} old snapshots and ${abandonedSessions.length} abandoned sessions`);
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
    }
  }

  /**
   * Export session data for backup
   */
  async exportSessionData(userId: string): Promise<{
    sessions: Session[];
    snapshots: SessionSnapshot[];
    performanceScores: PerformanceScore[];
    exportDate: string;
  }> {
    try {
      const sessions = await this.storageManager.getUserSessions(userId);
      const snapshots = await this.storageManager.query<SessionSnapshot>('snapshots', { userId });
      const performanceScores = await this.storageManager.getUserPerformanceScores(userId);

      return {
        sessions,
        snapshots,
        performanceScores,
        exportDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to export session data:', error);
      throw error;
    }
  }

  /**
   * Import session data from backup
   */
  async importSessionData(data: {
    sessions: Session[];
    snapshots: SessionSnapshot[];
    performanceScores: PerformanceScore[];
  }): Promise<void> {
    try {
      // Import sessions
      for (const session of data.sessions) {
        await this.storageManager.saveSession(session);
      }

      // Import performance scores
      for (const score of data.performanceScores) {
        await this.storageManager.savePerformanceScore(score);
      }

      // Import snapshots
      for (const snapshot of data.snapshots) {
        await this.saveSnapshot(snapshot);
      }

      console.log(`Imported ${data.sessions.length} sessions, ${data.snapshots.length} snapshots, and ${data.performanceScores.length} performance scores`);
    } catch (error) {
      console.error('Failed to import session data:', error);
      throw error;
    }
  }

  // Private helper methods

  private calculateTimeElapsed(session: Session): number {
    const start = new Date(session.startTime).getTime();
    const end = session.endTime ? new Date(session.endTime).getTime() : Date.now();
    return Math.floor((end - start) / 1000 / 60); // minutes
  }

  private async reconstructSessionFromSnapshot(snapshot: SessionSnapshot): Promise<Session> {
    // This is a simplified reconstruction - in a real implementation,
    // you might need to fetch additional data or validate the snapshot
    return {
      id: snapshot.sessionId,
      userId: snapshot.userId,
      config: {
        questionCategories: ['technical-skills'], // Default, should be stored in snapshot
        difficulty: 'medium',
        duration: 30,
        focusAreas: [],
        voiceEnabled: true,
        feedbackStyle: 'direct'
      },
      questions: [], // Would need to be reconstructed or fetched
      responses: snapshot.responses,
      analysis: {
        overallScore: 0,
        dimensionScores: [],
        improvement: 0,
        timeSpent: snapshot.timeElapsed,
        questionsAnswered: snapshot.responses.length,
        strengths: [],
        improvementAreas: [],
        recommendations: []
      },
      startTime: new Date(Date.now() - (snapshot.timeElapsed * 60 * 1000)),
      status: snapshot.status
    };
  }

  private getDeviceInfo(): string {
    return `${navigator.platform} - ${navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}`;
  }

  private getBrowserInfo(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  // Cleanup on service destruction
  destroy(): void {
    // Clear all active timers
    for (const [_sessionId, timer] of this.activeSnapshots) {
      clearInterval(timer);
    }
    this.activeSnapshots.clear();
  }
}