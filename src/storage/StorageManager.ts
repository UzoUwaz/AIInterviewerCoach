import { BaseStorageAdapter } from './adapters/BaseStorageAdapter';
import { IndexedDBAdapter } from './adapters/IndexedDBAdapter';
import { LocalStorageAdapter } from './adapters/LocalStorageAdapter';
import { PostgreSQLAdapter } from './adapters/PostgreSQLAdapter';
import { 
  User, Session, Question, UserResponse, JobApplication, PerformanceScore,
  UserPreferences
} from '../types';

export type StorageMode = 'local' | 'hybrid' | 'database';

export interface StorageConfig {
  mode: StorageMode;
  postgresql?: {
    baseUrl: string;
    apiKey?: string;
  };
  preferences?: {
    useIndexedDB: boolean;
    fallbackToLocalStorage: boolean;
    autoCleanup: boolean;
    maxLocalStorageSize: number; // in MB
  };
}

export class StorageManager {
  private primaryAdapter!: BaseStorageAdapter;
  private fallbackAdapter?: BaseStorageAdapter;
  private preferencesAdapter: LocalStorageAdapter;
  private config: StorageConfig;
  private isInitialized = false;

  constructor(config: StorageConfig) {
    this.config = config;
    this.preferencesAdapter = new LocalStorageAdapter();
    
    this.initializeAdapters();
  }

  private initializeAdapters(): void {
    switch (this.config.mode) {
      case 'local':
        this.primaryAdapter = this.config.preferences?.useIndexedDB 
          ? new IndexedDBAdapter() 
          : new LocalStorageAdapter();
        
        if (this.config.preferences?.fallbackToLocalStorage && this.primaryAdapter instanceof IndexedDBAdapter) {
          this.fallbackAdapter = new LocalStorageAdapter();
        }
        break;

      case 'hybrid':
        this.primaryAdapter = new IndexedDBAdapter();
        this.fallbackAdapter = new LocalStorageAdapter();
        break;

      case 'database':
        if (!this.config.postgresql) {
          throw new Error('PostgreSQL configuration required for database mode');
        }
        this.primaryAdapter = new PostgreSQLAdapter(this.config.postgresql);
        this.fallbackAdapter = new IndexedDBAdapter();
        break;

      default:
        throw new Error(`Unsupported storage mode: ${this.config.mode}`);
    }
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize primary adapter
      if (this.primaryAdapter instanceof IndexedDBAdapter) {
        await this.primaryAdapter.init();
      }

      // Test primary adapter
      await this.testAdapter(this.primaryAdapter);
      
      console.log(`Primary storage adapter (${this.config.mode}) initialized successfully`);
    } catch (error) {
      console.error('Primary adapter initialization failed:', error);
      
      if (this.fallbackAdapter) {
        console.log('Attempting to use fallback adapter...');
        try {
          if (this.fallbackAdapter instanceof IndexedDBAdapter) {
            await this.fallbackAdapter.init();
          }
          await this.testAdapter(this.fallbackAdapter);
          
          // Swap adapters
          this.primaryAdapter = this.fallbackAdapter;
          this.fallbackAdapter = undefined;
          
          console.log('Fallback adapter initialized successfully');
        } catch (fallbackError) {
          console.error('Fallback adapter also failed:', fallbackError);
          throw new Error('All storage adapters failed to initialize');
        }
      } else {
        throw error;
      }
    }

    this.isInitialized = true;

    // Set up periodic cleanup if enabled
    if (this.config.preferences?.autoCleanup) {
      this.setupAutoCleanup();
    }
  }

  private async testAdapter(adapter: BaseStorageAdapter): Promise<void> {
    const testKey = 'storage-test';
    const testValue = { test: true, timestamp: Date.now() };
    
    await adapter.set(testKey, testValue);
    const retrieved = await adapter.get(testKey);
    await adapter.delete(testKey);
    
    if (!retrieved || (retrieved as any).test !== true) {
      throw new Error('Storage adapter test failed');
    }
  }

  private setupAutoCleanup(): void {
    // Run cleanup every 24 hours
    setInterval(async () => {
      try {
        await this.performCleanup();
      } catch (error) {
        console.error('Auto cleanup failed:', error);
      }
    }, 24 * 60 * 60 * 1000);
  }

  private async performCleanup(): Promise<void> {
    if (this.primaryAdapter instanceof LocalStorageAdapter) {
      await this.primaryAdapter.cleanup();
    }
    
    // Clean up old sessions (older than 90 days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    
    try {
      const oldSessions = await this.query<Session>('sessions', {
        startTime: { $lt: cutoffDate }
      });
      
      for (const session of oldSessions) {
        await this.deleteSession(session.id);
      }
      
      console.log(`Cleaned up ${oldSessions.length} old sessions`);
    } catch (error) {
      console.error('Error during session cleanup:', error);
    }
  }

  // Generic storage operations with fallback
  private async executeWithFallback<T>(
    operation: (adapter: BaseStorageAdapter) => Promise<T>
  ): Promise<T> {
    try {
      return await operation(this.primaryAdapter);
    } catch (error) {
      console.error('Primary adapter operation failed:', error);
      
      if (this.fallbackAdapter) {
        console.log('Attempting operation with fallback adapter...');
        try {
          return await operation(this.fallbackAdapter);
        } catch (fallbackError) {
          console.error('Fallback adapter operation also failed:', fallbackError);
          throw fallbackError;
        }
      }
      throw error;
    }
  }

  // User management
  async saveUser(user: User): Promise<void> {
    if (!this.isInitialized) await this.init();
    
    await this.executeWithFallback(async (adapter) => {
      await adapter.set(`users:${user.id}`, user);
    });
  }

  async getUser(userId: string): Promise<User | null> {
    if (!this.isInitialized) await this.init();
    
    return await this.executeWithFallback(async (adapter) => {
      return await adapter.get<User>(`users:${userId}`);
    });
  }

  async deleteUser(userId: string): Promise<void> {
    if (!this.isInitialized) await this.init();
    
    await this.executeWithFallback(async (adapter) => {
      // Delete user and all related data
      await adapter.delete(`users:${userId}`);
      
      // Delete user's sessions
      const sessions = await this.getUserSessions(userId);
      for (const session of sessions) {
        await this.deleteSession(session.id);
      }
      
      // Delete user's job applications
      const applications = await this.getUserJobApplications(userId);
      for (const app of applications) {
        await adapter.delete(`jobApplications:${app.id}`);
      }
      
      // Delete user's performance scores
      const scores = await this.getUserPerformanceScores(userId);
      for (const score of scores) {
        await adapter.delete(`performanceScores:${score.sessionId}`);
      }
    });
  }

  // Session management
  async saveSession(session: Session): Promise<void> {
    if (!this.isInitialized) await this.init();
    
    await this.executeWithFallback(async (adapter) => {
      await adapter.set(`sessions:${session.id}`, session);
    });
  }

  async getSession(sessionId: string): Promise<Session | null> {
    if (!this.isInitialized) await this.init();
    
    return await this.executeWithFallback(async (adapter) => {
      return await adapter.get<Session>(`sessions:${sessionId}`);
    });
  }

  async getUserSessions(userId: string): Promise<Session[]> {
    if (!this.isInitialized) await this.init();
    
    return await this.executeWithFallback(async (adapter) => {
      return await adapter.query<Session>('sessions', { userId });
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (!this.isInitialized) await this.init();
    
    await this.executeWithFallback(async (adapter) => {
      // Delete session and related responses
      await adapter.delete(`sessions:${sessionId}`);
      
      const responses = await adapter.query<UserResponse>('responses', { sessionId });
      for (const response of responses) {
        await adapter.delete(`responses:${response.id}`);
      }
      
      await adapter.delete(`performanceScores:${sessionId}`);
    });
  }

  // Question management
  async saveQuestion(question: Question): Promise<void> {
    if (!this.isInitialized) await this.init();
    
    await this.executeWithFallback(async (adapter) => {
      await adapter.set(`questions:${question.id}`, question);
    });
  }

  async getQuestion(questionId: string): Promise<Question | null> {
    if (!this.isInitialized) await this.init();
    
    return await this.executeWithFallback(async (adapter) => {
      return await adapter.get<Question>(`questions:${questionId}`);
    });
  }

  async getQuestionsByCategory(category: string): Promise<Question[]> {
    if (!this.isInitialized) await this.init();
    
    return await this.executeWithFallback(async (adapter) => {
      return await adapter.query<Question>('questions', { category });
    });
  }

  async getQuestionsByType(type: string): Promise<Question[]> {
    if (!this.isInitialized) await this.init();
    
    return await this.executeWithFallback(async (adapter) => {
      return await adapter.query<Question>('questions', { type });
    });
  }

  // Response management
  async saveResponse(response: UserResponse): Promise<void> {
    if (!this.isInitialized) await this.init();
    
    await this.executeWithFallback(async (adapter) => {
      await adapter.set(`responses:${response.id}`, response);
    });
  }

  async getResponse(responseId: string): Promise<UserResponse | null> {
    if (!this.isInitialized) await this.init();
    
    return await this.executeWithFallback(async (adapter) => {
      return await adapter.get<UserResponse>(`responses:${responseId}`);
    });
  }

  async getSessionResponses(sessionId: string): Promise<UserResponse[]> {
    if (!this.isInitialized) await this.init();
    
    return await this.executeWithFallback(async (adapter) => {
      return await adapter.query<UserResponse>('responses', { sessionId });
    });
  }

  // Job application management
  async saveJobApplication(application: JobApplication): Promise<void> {
    if (!this.isInitialized) await this.init();
    
    await this.executeWithFallback(async (adapter) => {
      await adapter.set(`jobApplications:${application.id}`, application);
    });
  }

  async getJobApplication(applicationId: string): Promise<JobApplication | null> {
    if (!this.isInitialized) await this.init();
    
    return await this.executeWithFallback(async (adapter) => {
      return await adapter.get<JobApplication>(`jobApplications:${applicationId}`);
    });
  }

  async getUserJobApplications(userId: string): Promise<JobApplication[]> {
    if (!this.isInitialized) await this.init();
    
    return await this.executeWithFallback(async (adapter) => {
      return await adapter.query<JobApplication>('jobApplications', { userId });
    });
  }

  // Performance score management
  async savePerformanceScore(score: PerformanceScore): Promise<void> {
    if (!this.isInitialized) await this.init();
    
    await this.executeWithFallback(async (adapter) => {
      await adapter.set(`performanceScores:${score.sessionId}`, score);
    });
  }

  async getPerformanceScore(sessionId: string): Promise<PerformanceScore | null> {
    if (!this.isInitialized) await this.init();
    
    return await this.executeWithFallback(async (adapter) => {
      return await adapter.get<PerformanceScore>(`performanceScores:${sessionId}`);
    });
  }

  async getUserPerformanceScores(userId: string): Promise<PerformanceScore[]> {
    if (!this.isInitialized) await this.init();
    
    return await this.executeWithFallback(async (adapter) => {
      return await adapter.query<PerformanceScore>('performanceScores', { userId });
    });
  }

  // Preferences management (always uses localStorage)
  async saveUserPreferences(userId: string, preferences: UserPreferences): Promise<void> {
    await this.preferencesAdapter.set(`preferences:${userId}`, preferences);
  }

  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    return await this.preferencesAdapter.get<UserPreferences>(`preferences:${userId}`);
  }

  async saveAppSettings(settings: any): Promise<void> {
    await this.preferencesAdapter.set('app-settings', settings);
  }

  async getAppSettings(): Promise<any> {
    return await this.preferencesAdapter.get('app-settings');
  }

  // Generic query method
  async query<T>(storeName: string, filters?: Record<string, any>): Promise<T[]> {
    if (!this.isInitialized) await this.init();
    
    return await this.executeWithFallback(async (adapter) => {
      return await adapter.query<T>(storeName, filters);
    });
  }

  // Data export/import
  async exportData(): Promise<any> {
    if (!this.isInitialized) await this.init();
    
    return await this.executeWithFallback(async (adapter) => {
      const data: any = {};
      
      const storeNames = ['users', 'sessions', 'questions', 'responses', 'jobApplications', 'performanceScores'];
      
      for (const storeName of storeNames) {
        data[storeName] = await adapter.query(storeName);
      }
      
      return {
        ...data,
        exportDate: new Date().toISOString(),
        version: '1.0',
        storageMode: this.config.mode
      };
    });
  }

  async importData(data: any): Promise<void> {
    if (!this.isInitialized) await this.init();
    
    await this.executeWithFallback(async (adapter) => {
      // Clear existing data
      await adapter.clear();
      
      // Import new data
      const storeNames = ['users', 'sessions', 'questions', 'responses', 'jobApplications', 'performanceScores'];
      
      for (const storeName of storeNames) {
        if (data[storeName] && Array.isArray(data[storeName])) {
          const items = data[storeName].map((item: any) => ({
            key: `${storeName}:${item.id}`,
            value: item
          }));
          
          await adapter.batchSet(items);
        }
      }
    });
  }

  // Utility methods
  async getStorageInfo(): Promise<{
    mode: StorageMode;
    primaryAdapter: string;
    fallbackAdapter?: string;
    isHealthy: boolean;
    metrics?: any;
  }> {
    const info = {
      mode: this.config.mode,
      primaryAdapter: this.primaryAdapter.constructor.name,
      fallbackAdapter: this.fallbackAdapter?.constructor.name,
      isHealthy: false,
      metrics: undefined as any
    };

    try {
      // Test primary adapter health
      await this.testAdapter(this.primaryAdapter);
      info.isHealthy = true;

      // Get metrics if available
      if (this.primaryAdapter instanceof PostgreSQLAdapter) {
        info.metrics = await this.primaryAdapter.getMetrics();
      } else if (this.primaryAdapter instanceof LocalStorageAdapter) {
        info.metrics = await this.primaryAdapter.getStorageInfo();
      }
    } catch (error) {
      console.error('Storage health check failed:', error);
    }

    return info;
  }

  async clearAllData(): Promise<void> {
    if (!this.isInitialized) await this.init();
    
    await this.executeWithFallback(async (adapter) => {
      await adapter.clear();
    });
    
    await this.preferencesAdapter.clear();
  }

  // Migration support
  async migrateData(fromVersion: string, toVersion: string): Promise<void> {
    console.log(`Migrating data from version ${fromVersion} to ${toVersion}`);
    
    // Implement version-specific migration logic here
    // This is a placeholder for future migration needs
    
    switch (toVersion) {
      case '2.0':
        // Example migration logic
        break;
      default:
        console.log('No migration needed');
    }
  }
}

// Export singleton instance with default configuration
export const createStorageManager = (config: StorageConfig): StorageManager => {
  return new StorageManager(config);
};

// Default configuration for local development
export const defaultStorageConfig: StorageConfig = {
  mode: 'hybrid',
  preferences: {
    useIndexedDB: true,
    fallbackToLocalStorage: true,
    autoCleanup: true,
    maxLocalStorageSize: 5 // 5MB
  }
};