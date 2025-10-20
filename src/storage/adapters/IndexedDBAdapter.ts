import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { BaseStorageAdapter } from './BaseStorageAdapter';
import { 
  User, Session, Question, UserResponse, JobApplication, PerformanceScore 
} from '../../types';

// IndexedDB Schema
interface InterviewCoachDB extends DBSchema {
  users: {
    key: string;
    value: User;
  };
  sessions: {
    key: string;
    value: Session;
    indexes: { 'by-user': string; 'by-date': Date; 'by-status': string };
  };
  questions: {
    key: string;
    value: Question;
    indexes: { 'by-category': string; 'by-type': string; 'by-difficulty': number };
  };
  responses: {
    key: string;
    value: UserResponse;
    indexes: { 'by-session': string; 'by-question': string; 'by-user': string };
  };
  jobApplications: {
    key: string;
    value: JobApplication;
    indexes: { 'by-user': string; 'by-status': string; 'by-date': Date };
  };
  performanceScores: {
    key: string;
    value: PerformanceScore;
    indexes: { 'by-user': string; 'by-session': string; 'by-date': Date };
  };
  metadata: {
    key: string;
    value: { version: number; lastMigration: Date; schemaVersion: number };
  };
}

export class IndexedDBAdapter extends BaseStorageAdapter {
  private db: IDBPDatabase<InterviewCoachDB> | null = null;
  private readonly dbName = 'InterviewCoachDB';
  private readonly version = 2; // Incremented for new schema
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    this.db = await openDB<InterviewCoachDB>(this.dbName, this.version, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log(`Upgrading IndexedDB from version ${oldVersion} to ${newVersion}`);
        
        // Users store
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
        }

        // Sessions store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionStore.createIndex('by-user', 'userId');
          sessionStore.createIndex('by-date', 'startTime');
          sessionStore.createIndex('by-status', 'status');
        }

        // Questions store
        if (!db.objectStoreNames.contains('questions')) {
          const questionStore = db.createObjectStore('questions', { keyPath: 'id' });
          questionStore.createIndex('by-category', 'category');
          questionStore.createIndex('by-type', 'type');
          questionStore.createIndex('by-difficulty', 'difficulty');
        }

        // Responses store
        if (!db.objectStoreNames.contains('responses')) {
          const responseStore = db.createObjectStore('responses', { keyPath: 'id' });
          responseStore.createIndex('by-session', 'sessionId');
          responseStore.createIndex('by-question', 'questionId');
          responseStore.createIndex('by-user', 'userId');
        }

        // Job Applications store
        if (!db.objectStoreNames.contains('jobApplications')) {
          const jobStore = db.createObjectStore('jobApplications', { keyPath: 'id' });
          jobStore.createIndex('by-user', 'userId');
          jobStore.createIndex('by-status', 'status');
          jobStore.createIndex('by-date', 'applicationDate');
        }

        // Performance Scores store
        if (!db.objectStoreNames.contains('performanceScores')) {
          const scoreStore = db.createObjectStore('performanceScores', { keyPath: 'sessionId' });
          scoreStore.createIndex('by-user', 'userId');
          scoreStore.createIndex('by-session', 'sessionId');
          scoreStore.createIndex('by-date', 'createdAt');
        }

        // Metadata store for versioning and migrations
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }

        // Add migration logic for existing data
        if (oldVersion < 2) {
          // Add userId index to responses if upgrading from version 1
          const responseStore = transaction.objectStore('responses');
          if (!responseStore.indexNames.contains('by-user')) {
            responseStore.createIndex('by-user', 'userId');
          }
        }
      },
    });

    // Set metadata after successful initialization
    await this.setMetadata();
    this.isInitialized = true;
  }

  private async setMetadata(): Promise<void> {
    if (!this.db) return;
    
    const metadata = {
      key: 'schema',
      version: this.version,
      lastMigration: new Date(),
      schemaVersion: this.version
    };
    
    await this.db.put('metadata', metadata);
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.db) await this.init();
    
    const [storeName, actualKey] = this.parseKey(key);
    
    try {
      const result = await this.db!.get(storeName as any, actualKey);
      return result as T || null;
    } catch (error) {
      console.error('Error getting data from IndexedDB:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (!this.db) await this.init();
    
    const [storeName] = this.parseKey(key);
    
    try {
      await this.db!.put(storeName as any, value as any);
    } catch (error) {
      console.error('Error setting data in IndexedDB:', error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.db) await this.init();
    
    const [storeName, actualKey] = this.parseKey(key);
    
    try {
      await this.db!.delete(storeName as any, actualKey);
    } catch (error) {
      console.error('Error deleting data from IndexedDB:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init();
    
    const storeNames: (keyof InterviewCoachDB)[] = [
      'users', 'sessions', 'questions', 'responses', 'jobApplications', 'performanceScores'
    ];
    
    try {
      const tx = this.db!.transaction(storeNames as any, 'readwrite');
      await Promise.all(storeNames.map(name => tx.objectStore(name as any).clear()));
      await tx.done;
    } catch (error) {
      console.error('Error clearing IndexedDB:', error);
      throw error;
    }
  }

  async keys(): Promise<string[]> {
    if (!this.db) await this.init();
    
    const allKeys: string[] = [];
    const storeNames: (keyof InterviewCoachDB)[] = [
      'users', 'sessions', 'questions', 'responses', 'jobApplications', 'performanceScores'
    ];
    
    try {
      for (const storeName of storeNames) {
        const keys = await this.db!.getAllKeys(storeName as any);
        allKeys.push(...keys.map(key => `${storeName}:${key}`));
      }
      return allKeys;
    } catch (error) {
      console.error('Error getting keys from IndexedDB:', error);
      return [];
    }
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.get(key);
    return result !== null;
  }

  async query<T>(storeName: string, filters?: Record<string, any>): Promise<T[]> {
    if (!this.db) await this.init();
    
    try {
      let results = await this.db!.getAll(storeName as any);
      
      if (filters) {
        results = results.filter(item => {
          return Object.entries(filters).every(([key, value]) => {
            const itemValue = (item as any)[key];
            if (Array.isArray(value)) {
              return value.includes(itemValue);
            }
            return itemValue === value;
          });
        });
      }
      
      return results as T[];
    } catch (error) {
      console.error('Error querying IndexedDB:', error);
      return [];
    }
  }

  async count(storeName: string, filters?: Record<string, any>): Promise<number> {
    if (!filters) {
      if (!this.db) await this.init();
      return await this.db!.count(storeName as any);
    }
    
    const results = await this.query(storeName, filters);
    return results.length;
  }

  async batchSet<T>(items: Array<{ key: string; value: T }>): Promise<void> {
    if (!this.db) await this.init();
    
    const storeGroups = new Map<string, Array<{ key: string; value: T }>>();
    
    // Group items by store
    items.forEach(item => {
      const [storeName] = this.parseKey(item.key);
      if (!storeGroups.has(storeName)) {
        storeGroups.set(storeName, []);
      }
      storeGroups.get(storeName)!.push(item);
    });

    try {
      for (const [storeName, storeItems] of storeGroups) {
        const tx = this.db!.transaction(storeName as any, 'readwrite');
        await Promise.all(
          storeItems.map(item => tx.objectStore(storeName as any).put(item.value as any))
        );
        await tx.done;
      }
    } catch (error) {
      console.error('Error in batch set operation:', error);
      throw error;
    }
  }

  async batchGet<T>(keys: string[]): Promise<Array<T | null>> {
    if (!this.db) await this.init();
    
    const results: Array<T | null> = [];
    
    try {
      for (const key of keys) {
        const result = await this.get<T>(key);
        results.push(result);
      }
      return results;
    } catch (error) {
      console.error('Error in batch get operation:', error);
      return keys.map(() => null);
    }
  }

  async batchDelete(keys: string[]): Promise<void> {
    if (!this.db) await this.init();
    
    const storeGroups = new Map<string, string[]>();
    
    // Group keys by store
    keys.forEach(key => {
      const [storeName, actualKey] = this.parseKey(key);
      if (!storeGroups.has(storeName)) {
        storeGroups.set(storeName, []);
      }
      storeGroups.get(storeName)!.push(actualKey);
    });

    try {
      for (const [storeName, storeKeys] of storeGroups) {
        const tx = this.db!.transaction(storeName as any, 'readwrite');
        await Promise.all(
          storeKeys.map(key => tx.objectStore(storeName as any).delete(key))
        );
        await tx.done;
      }
    } catch (error) {
      console.error('Error in batch delete operation:', error);
      throw error;
    }
  }

  async transaction<T>(operations: () => Promise<T>): Promise<T> {
    if (!this.db) await this.init();
    
    try {
      return await operations();
    } catch (error) {
      console.error('Error in transaction:', error);
      throw error;
    }
  }

  // Specialized IndexedDB methods
  async getByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
    if (!this.db) await this.init();
    
    try {
      const results = await this.db!.getAllFromIndex(storeName as any, indexName, value);
      return results as T[];
    } catch (error) {
      console.error('Error querying by index:', error);
      return [];
    }
  }

  async getAllFromStore<T>(storeName: string): Promise<T[]> {
    if (!this.db) await this.init();
    
    try {
      const results = await this.db!.getAll(storeName as any);
      return results as T[];
    } catch (error) {
      console.error('Error getting all from store:', error);
      return [];
    }
  }

  private parseKey(key: string): [string, string] {
    const parts = key.split(':');
    if (parts.length < 2) {
      throw new Error(`Invalid key format: ${key}. Expected format: "storeName:actualKey"`);
    }
    return [parts[0], parts.slice(1).join(':')] as [string, string];
  }

  // Migration and versioning methods
  async getSchemaVersion(): Promise<number> {
    if (!this.db) await this.init();
    
    try {
      const metadata = await this.db!.get('metadata', 'schema');
      return metadata?.schemaVersion || 1;
    } catch (error) {
      console.error('Error getting schema version:', error);
      return 1;
    }
  }

  async needsMigration(): Promise<boolean> {
    const currentVersion = await this.getSchemaVersion();
    return currentVersion < this.version;
  }
}