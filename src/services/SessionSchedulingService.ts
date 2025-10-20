import { SessionConfig } from '../types';
import { StorageManager } from '../storage/StorageManager';

export interface ScheduledSession {
  id: string;
  userId: string;
  scheduledTime: Date;
  config: SessionConfig;
  reminderSettings: {
    enabled: boolean;
    advanceNotice: number; // minutes before session
    repeatReminders: boolean;
    reminderIntervals: number[]; // minutes before session
  };
  status: 'scheduled' | 'reminded' | 'started' | 'missed' | 'cancelled';
  createdAt: Date;
  metadata?: {
    jobApplicationId?: string;
    interviewDate?: Date;
    notes?: string;
  };
}

export interface ReminderNotification {
  id: string;
  sessionId: string;
  userId: string;
  type: 'upcoming' | 'overdue' | 'streak' | 'achievement';
  title: string;
  message: string;
  scheduledTime: Date;
  sent: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface PracticeStreak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: Date;
  streakStartDate: Date;
  totalSessions: number;
}

export interface SessionRecommendation {
  type: 'frequency' | 'timing' | 'focus' | 'difficulty';
  title: string;
  description: string;
  suggestedConfig?: Partial<SessionConfig>;
  priority: number;
  reasoning: string[];
}

export class SessionSchedulingService {
  private storageManager: StorageManager;
  private notificationPermission: NotificationPermission = 'default';
  private reminderTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(storageManager: StorageManager) {
    this.storageManager = storageManager;
    this.initializeNotifications();
    this.startReminderEngine();
  }

  /**
   * Initialize browser notifications
   */
  private async initializeNotifications(): Promise<void> {
    if ('Notification' in window) {
      this.notificationPermission = Notification.permission;
      
      if (this.notificationPermission === 'default') {
        this.notificationPermission = await Notification.requestPermission();
      }
    }
  }

  /**
   * Schedule a new practice session
   */
  async scheduleSession(
    userId: string,
    scheduledTime: Date,
    config: SessionConfig,
    reminderSettings?: Partial<ScheduledSession['reminderSettings']>,
    metadata?: ScheduledSession['metadata']
  ): Promise<ScheduledSession> {
    const scheduledSession: ScheduledSession = {
      id: this.generateScheduleId(),
      userId,
      scheduledTime,
      config,
      reminderSettings: {
        enabled: true,
        advanceNotice: 15, // 15 minutes default
        repeatReminders: false,
        reminderIntervals: [15, 5], // 15 min and 5 min before
        ...reminderSettings
      },
      status: 'scheduled',
      createdAt: new Date(),
      metadata
    };

    // Save to storage
    await this.saveScheduledSession(scheduledSession);

    // Set up reminders
    if (scheduledSession.reminderSettings.enabled) {
      this.setupReminders(scheduledSession);
    }

    return scheduledSession;
  }

  /**
   * Get scheduled sessions for a user
   */
  async getScheduledSessions(
    userId: string,
    options: {
      includeCompleted?: boolean;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
    } = {}
  ): Promise<ScheduledSession[]> {
    try {
      const allScheduled = await this.storageManager.query<ScheduledSession>('scheduledSessions', { userId });
      
      let filtered = allScheduled;

      // Filter by status
      if (!options.includeCompleted) {
        filtered = filtered.filter(session => 
          !['started', 'missed', 'cancelled'].includes(session.status)
        );
      }

      // Filter by date range
      if (options.fromDate) {
        filtered = filtered.filter(session => 
          new Date(session.scheduledTime) >= options.fromDate!
        );
      }

      if (options.toDate) {
        filtered = filtered.filter(session => 
          new Date(session.scheduledTime) <= options.toDate!
        );
      }

      // Sort by scheduled time
      filtered.sort((a, b) => 
        new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
      );

      // Apply limit
      if (options.limit) {
        filtered = filtered.slice(0, options.limit);
      }

      return filtered;
    } catch (error) {
      console.error('Failed to get scheduled sessions:', error);
      return [];
    }
  }

  /**
   * Update scheduled session
   */
  async updateScheduledSession(
    sessionId: string,
    updates: Partial<ScheduledSession>
  ): Promise<ScheduledSession | null> {
    try {
      const existing = await this.getScheduledSession(sessionId);
      if (!existing) {
        throw new Error(`Scheduled session ${sessionId} not found`);
      }

      const updated = { ...existing, ...updates };
      await this.saveScheduledSession(updated);

      // Update reminders if schedule changed
      if (updates.scheduledTime || updates.reminderSettings) {
        this.clearReminders(sessionId);
        if (updated.reminderSettings.enabled) {
          this.setupReminders(updated);
        }
      }

      return updated;
    } catch (error) {
      console.error('Failed to update scheduled session:', error);
      return null;
    }
  }

  /**
   * Cancel scheduled session
   */
  async cancelScheduledSession(sessionId: string): Promise<boolean> {
    try {
      const updated = await this.updateScheduledSession(sessionId, { 
        status: 'cancelled' 
      });
      
      if (updated) {
        this.clearReminders(sessionId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to cancel scheduled session:', error);
      return false;
    }
  }

  /**
   * Mark session as started
   */
  async markSessionStarted(sessionId: string): Promise<boolean> {
    try {
      const updated = await this.updateScheduledSession(sessionId, { 
        status: 'started' 
      });
      
      if (updated) {
        this.clearReminders(sessionId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to mark session as started:', error);
      return false;
    }
  }

  /**
   * Get practice streak for user
   */
  async getPracticeStreak(userId: string): Promise<PracticeStreak> {
    try {
      const existing = await this.storageManager.query<PracticeStreak>('practiceStreaks', { userId });
      
      if (existing.length > 0) {
        const streak = existing[0];
        
        // Check if streak is still valid (practiced within last 2 days)
        const daysSinceLastPractice = Math.floor(
          (Date.now() - new Date(streak.lastPracticeDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceLastPractice > 1) {
          // Streak broken, reset
          streak.currentStreak = 0;
          streak.streakStartDate = new Date();
          await this.savePracticeStreak(streak);
        }
        
        return streak;
      }

      // Create new streak record
      const newStreak: PracticeStreak = {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastPracticeDate: new Date(),
        streakStartDate: new Date(),
        totalSessions: 0
      };

      await this.savePracticeStreak(newStreak);
      return newStreak;
    } catch (error) {
      console.error('Failed to get practice streak:', error);
      return {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastPracticeDate: new Date(),
        streakStartDate: new Date(),
        totalSessions: 0
      };
    }
  }

  /**
   * Update practice streak after session completion
   */
  async updatePracticeStreak(userId: string): Promise<PracticeStreak> {
    const streak = await this.getPracticeStreak(userId);
    const today = new Date();
    const lastPracticeDate = new Date(streak.lastPracticeDate);
    
    // Check if this is a new day
    const isSameDay = today.toDateString() === lastPracticeDate.toDateString();
    
    if (!isSameDay) {
      const daysSince = Math.floor(
        (today.getTime() - lastPracticeDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSince === 1) {
        // Consecutive day, increment streak
        streak.currentStreak++;
      } else if (daysSince > 1) {
        // Streak broken, start new
        streak.currentStreak = 1;
        streak.streakStartDate = today;
      }
      
      // Update longest streak
      if (streak.currentStreak > streak.longestStreak) {
        streak.longestStreak = streak.currentStreak;
      }
      
      streak.lastPracticeDate = today;
    }
    
    streak.totalSessions++;
    await this.savePracticeStreak(streak);
    
    // Check for streak achievements
    await this.checkStreakAchievements(streak);
    
    return streak;
  }

  /**
   * Get session recommendations based on user history and preferences
   */
  async getSessionRecommendations(userId: string): Promise<SessionRecommendation[]> {
    try {
      const userSessions = await this.storageManager.getUserSessions(userId);
      const streak = await this.getPracticeStreak(userId);
      
      const recommendations: SessionRecommendation[] = [];
      
      // Frequency recommendations
      const recentSessions = userSessions.filter(session => {
        const sessionDate = new Date(session.startTime);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return sessionDate >= weekAgo;
      });
      
      if (recentSessions.length < 3) {
        recommendations.push({
          type: 'frequency',
          title: 'Increase Practice Frequency',
          description: 'Regular practice leads to better results. Try to practice at least 3 times per week.',
          priority: 8,
          reasoning: ['Only practiced ' + recentSessions.length + ' times this week', 'Consistent practice improves retention']
        });
      }
      
      // Timing recommendations
      const practiceHours = userSessions.map(session => 
        new Date(session.startTime).getHours()
      );
      
      if (practiceHours.length > 0) {
        const avgHour = practiceHours.reduce((sum, hour) => sum + hour, 0) / practiceHours.length;
        const optimalHour = Math.round(avgHour);
        
        recommendations.push({
          type: 'timing',
          title: 'Optimal Practice Time',
          description: `Based on your history, you practice best around ${optimalHour}:00. Consider scheduling sessions at this time.`,
          priority: 5,
          reasoning: ['Historical performance data shows better results at this time']
        });
      }
      
      // Focus area recommendations
      if (userSessions.length >= 3) {
        const categoryScores = new Map<string, number[]>();
        
        userSessions.forEach(session => {
          session.config.questionCategories.forEach(category => {
            if (!categoryScores.has(category)) {
              categoryScores.set(category, []);
            }
            categoryScores.get(category)!.push(session.analysis.overallScore);
          });
        });
        
        // Find weakest category
        let weakestCategory = '';
        let lowestAvg = 100;
        
        for (const [category, scores] of categoryScores) {
          const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
          if (avg < lowestAvg) {
            lowestAvg = avg;
            weakestCategory = category;
          }
        }
        
        if (weakestCategory && lowestAvg < 70) {
          recommendations.push({
            type: 'focus',
            title: 'Focus on Weak Areas',
            description: `Your ${weakestCategory.replace('-', ' ')} skills could use improvement. Consider dedicated practice in this area.`,
            suggestedConfig: {
              questionCategories: [weakestCategory as any],
              duration: 20
            },
            priority: 9,
            reasoning: [`Average score in ${weakestCategory}: ${Math.round(lowestAvg)}%`, 'Targeted practice improves specific skills faster']
          });
        }
      }
      
      // Difficulty recommendations
      const recentScores = userSessions
        .slice(-5)
        .map(session => session.analysis.overallScore)
        .filter(score => score > 0);
      
      if (recentScores.length >= 3) {
        const avgScore = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
        
        if (avgScore >= 80) {
          recommendations.push({
            type: 'difficulty',
            title: 'Increase Difficulty',
            description: 'You\'re performing well! Try more challenging questions to continue improving.',
            suggestedConfig: {
              difficulty: 'hard'
            },
            priority: 6,
            reasoning: [`Recent average score: ${Math.round(avgScore)}%`, 'Ready for more challenging content']
          });
        } else if (avgScore < 60) {
          recommendations.push({
            type: 'difficulty',
            title: 'Focus on Fundamentals',
            description: 'Consider practicing with easier questions to build confidence and foundational skills.',
            suggestedConfig: {
              difficulty: 'easy'
            },
            priority: 7,
            reasoning: [`Recent average score: ${Math.round(avgScore)}%`, 'Building strong fundamentals is important']
          });
        }
      }
      
      // Streak motivation
      if (streak.currentStreak === 0 && streak.longestStreak > 0) {
        recommendations.push({
          type: 'frequency',
          title: 'Rebuild Your Streak',
          description: `You had a ${streak.longestStreak}-day streak before. Start a new one today!`,
          priority: 8,
          reasoning: ['Previous streak shows capability', 'Streaks improve consistency']
        });
      }
      
      return recommendations.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      console.error('Failed to get session recommendations:', error);
      return [];
    }
  }

  /**
   * Create automatic reminders based on user preferences
   */
  async createAutomaticReminders(userId: string): Promise<void> {
    try {
      const preferences = await this.storageManager.getUserPreferences(userId);
      if (!preferences || preferences.reminderFrequency === 'custom') {
        return;
      }

      const now = new Date();
      const scheduledSessions = await this.getScheduledSessions(userId, {
        fromDate: now,
        includeCompleted: false
      });

      // If no sessions scheduled, create reminder based on frequency
      if (scheduledSessions.length === 0) {
        let nextReminderDate = new Date();
        
        switch (preferences.reminderFrequency) {
          case 'daily':
            nextReminderDate.setDate(nextReminderDate.getDate() + 1);
            break;
          case 'weekly':
            nextReminderDate.setDate(nextReminderDate.getDate() + 7);
            break;
        }

        // Set to a reasonable time (e.g., 10 AM)
        nextReminderDate.setHours(10, 0, 0, 0);

        await this.createReminderNotification({
          id: this.generateReminderId(),
          sessionId: '',
          userId,
          type: 'streak',
          title: 'Time to Practice!',
          message: 'Keep your interview skills sharp with a practice session.',
          scheduledTime: nextReminderDate,
          sent: false,
          priority: 'medium'
        });
      }
    } catch (error) {
      console.error('Failed to create automatic reminders:', error);
    }
  }

  // Private helper methods

  private async getScheduledSession(sessionId: string): Promise<ScheduledSession | null> {
    try {
      const sessions = await this.storageManager.query<ScheduledSession>('scheduledSessions', { id: sessionId });
      return sessions.length > 0 ? sessions[0] : null;
    } catch (error) {
      console.error('Failed to get scheduled session:', error);
      return null;
    }
  }

  private async saveScheduledSession(session: ScheduledSession): Promise<void> {
    // In a real implementation, this would use a proper storage method
    // For now, we'll use a generic approach
    await this.storageManager.saveSession(session as any);
  }

  private async savePracticeStreak(streak: PracticeStreak): Promise<void> {
    // In a real implementation, this would use a proper storage method
    await this.storageManager.saveSession(streak as any);
  }

  private setupReminders(scheduledSession: ScheduledSession): void {
    const { id, scheduledTime, reminderSettings } = scheduledSession;
    
    reminderSettings.reminderIntervals.forEach(minutesBefore => {
      const reminderTime = new Date(scheduledTime);
      reminderTime.setMinutes(reminderTime.getMinutes() - minutesBefore);
      
      const now = new Date();
      if (reminderTime > now) {
        const timeoutMs = reminderTime.getTime() - now.getTime();
        
        const timer = setTimeout(() => {
          this.sendReminder(scheduledSession, minutesBefore);
        }, timeoutMs);
        
        this.reminderTimers.set(`${id}-${minutesBefore}`, timer);
      }
    });
  }

  private clearReminders(sessionId: string): void {
    for (const [key, timer] of this.reminderTimers) {
      if (key.startsWith(sessionId)) {
        clearTimeout(timer);
        this.reminderTimers.delete(key);
      }
    }
  }

  private async sendReminder(scheduledSession: ScheduledSession, minutesBefore: number): Promise<void> {
    const title = `Interview Practice Reminder`;
    const message = `Your practice session starts in ${minutesBefore} minutes`;
    
    // Browser notification
    if (this.notificationPermission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        tag: `session-${scheduledSession.id}`
      });
    }
    
    // Create notification record
    await this.createReminderNotification({
      id: this.generateReminderId(),
      sessionId: scheduledSession.id,
      userId: scheduledSession.userId,
      type: 'upcoming',
      title,
      message,
      scheduledTime: new Date(),
      sent: true,
      priority: 'high'
    });
  }

  private async createReminderNotification(notification: ReminderNotification): Promise<void> {
    // Save notification to storage
    await this.storageManager.saveSession(notification as any);
  }

  private async checkStreakAchievements(streak: PracticeStreak): Promise<void> {
    const milestones = [3, 7, 14, 30, 60, 100];
    
    for (const milestone of milestones) {
      if (streak.currentStreak === milestone) {
        await this.createReminderNotification({
          id: this.generateReminderId(),
          sessionId: '',
          userId: streak.userId,
          type: 'achievement',
          title: 'Streak Achievement! 🎉',
          message: `Congratulations! You've maintained a ${milestone}-day practice streak!`,
          scheduledTime: new Date(),
          sent: false,
          priority: 'high'
        });
        break;
      }
    }
  }

  private startReminderEngine(): void {
    // Check for pending reminders every minute
    setInterval(async () => {
      try {
        const now = new Date();
        const pendingReminders = await this.storageManager.query<ReminderNotification>('reminderNotifications', {
          sent: false,
          scheduledTime: { $lte: now }
        });

        for (const reminder of pendingReminders) {
          if (this.notificationPermission === 'granted') {
            new Notification(reminder.title, {
              body: reminder.message,
              icon: '/favicon.ico',
              tag: `reminder-${reminder.id}`
            });
          }

          // Mark as sent
          reminder.sent = true;
          await this.storageManager.saveSession(reminder as any);
        }
      } catch (error) {
        console.error('Error in reminder engine:', error);
      }
    }, 60000); // Check every minute
  }

  private generateScheduleId(): string {
    return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReminderId(): string {
    return `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup on service destruction
  destroy(): void {
    for (const timer of this.reminderTimers.values()) {
      clearTimeout(timer);
    }
    this.reminderTimers.clear();
  }
}