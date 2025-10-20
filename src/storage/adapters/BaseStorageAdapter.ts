import { StorageAdapter } from '../../types';

export abstract class BaseStorageAdapter implements StorageAdapter {
  abstract get<T>(key: string): Promise<T | null>;
  abstract set<T>(key: string, value: T): Promise<void>;
  abstract delete(key: string): Promise<void>;
  abstract clear(): Promise<void>;
  abstract keys(): Promise<string[]>;

  // Extended methods for advanced querying
  abstract query<T>(storeName: string, filters?: Record<string, any>): Promise<T[]>;
  abstract count(storeName: string, filters?: Record<string, any>): Promise<number>;
  abstract exists(key: string): Promise<boolean>;
  
  // Batch operations
  abstract batchSet<T>(items: Array<{ key: string; value: T }>): Promise<void>;
  abstract batchGet<T>(keys: string[]): Promise<Array<T | null>>;
  abstract batchDelete(keys: string[]): Promise<void>;

  // Transaction support
  abstract transaction<T>(operations: () => Promise<T>): Promise<T>;
}