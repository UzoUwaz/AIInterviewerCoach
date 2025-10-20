// Legacy storage utilities - kept for backward compatibility
// New applications should use the storage system from '../storage'

import { 
  StorageManager, 
  createStorageManager, 
  defaultStorageConfig 
} from '../storage';

// Export the new storage manager as the default
export const storageManager = createStorageManager(defaultStorageConfig);

// Re-export the StorageManager class for direct instantiation
export { StorageManager, createStorageManager, defaultStorageConfig } from '../storage';