// Storage adapters
export { BaseStorageAdapter } from './adapters/BaseStorageAdapter';
export { IndexedDBAdapter } from './adapters/IndexedDBAdapter';
export { LocalStorageAdapter } from './adapters/LocalStorageAdapter';
export { PostgreSQLAdapter } from './adapters/PostgreSQLAdapter';

// Storage manager
export { 
  StorageManager, 
  createStorageManager, 
  defaultStorageConfig,
  type StorageMode,
  type StorageConfig 
} from './StorageManager';

// Migration system
export { 
  MigrationManager,
  type Migration,
  type MigrationRecord 
} from './migrations/MigrationManager';

// Re-export types from main types file
export type { StorageAdapter } from '../types';