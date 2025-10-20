import { BaseStorageAdapter } from './BaseStorageAdapter';

export class LocalStorageAdapter extends BaseStorageAdapter {
  private prefix = 'interview-coach:';

  async get<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;
      
      const parsed = JSON.parse(item);
      
      // Handle Date objects
      return this.deserializeDates(parsed);
    } catch (error) {
      console.error('Error getting data from localStorage:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      const serialized = JSON.stringify(value, this.dateReplacer);
      localStorage.setItem(this.prefix + key, serialized);
    } catch (error) {
      console.error('Error setting data in localStorage:', error);
      if (error instanceof DOMException && error.code === 22) {
        throw new Error('LocalStorage quota exceeded. Please clear some data or use IndexedDB.');
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.error('Error deleting data from localStorage:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.keys();
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      throw error;
    }
  }

  async keys(): Promise<string[]> {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keys.push(key);
        }
      }
      return keys;
    } catch (error) {
      console.error('Error getting keys from localStorage:', error);
      return [];
    }
  }

  async exists(key: string): Promise<boolean> {
    return localStorage.getItem(this.prefix + key) !== null;
  }

  async query<T>(storeName: string, filters?: Record<string, any>): Promise<T[]> {
    const keys = await this.keys();
    const storeKeys = keys.filter(key => key.startsWith(this.prefix + storeName + ':'));
    
    const results: T[] = [];
    
    for (const key of storeKeys) {
      const item = await this.get<T>(key.replace(this.prefix, ''));
      if (item) {
        if (!filters || this.matchesFilters(item, filters)) {
          results.push(item);
        }
      }
    }
    
    return results;
  }

  async count(storeName: string, filters?: Record<string, any>): Promise<number> {
    const results = await this.query(storeName, filters);
    return results.length;
  }

  async batchSet<T>(items: Array<{ key: string; value: T }>): Promise<void> {
    try {
      for (const item of items) {
        await this.set(item.key, item.value);
      }
    } catch (error) {
      console.error('Error in batch set operation:', error);
      throw error;
    }
  }

  async batchGet<T>(keys: string[]): Promise<Array<T | null>> {
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
    try {
      for (const key of keys) {
        await this.delete(key);
      }
    } catch (error) {
      console.error('Error in batch delete operation:', error);
      throw error;
    }
  }

  async transaction<T>(operations: () => Promise<T>): Promise<T> {
    // localStorage doesn't support transactions, so we just execute the operations
    // In a real implementation, you might want to implement a rollback mechanism
    try {
      return await operations();
    } catch (error) {
      console.error('Error in localStorage transaction:', error);
      throw error;
    }
  }

  // Utility methods for date handling
  private dateReplacer(_key: string, value: any): any {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    return value;
  }

  private deserializeDates(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj.__type === 'Date') {
      return new Date(obj.value);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deserializeDates(item));
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = this.deserializeDates(value);
    }
    return result;
  }

  private matchesFilters(item: any, filters: Record<string, any>): boolean {
    return Object.entries(filters).every(([key, value]) => {
      const itemValue = item[key];
      if (Array.isArray(value)) {
        return value.includes(itemValue);
      }
      return itemValue === value;
    });
  }

  // Utility methods for storage management
  async getStorageInfo(): Promise<{ used: number; available: number; percentage: number }> {
    try {
      let used = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            used += key.length + value.length;
          }
        }
      }

      // Estimate available space (localStorage typically has 5-10MB limit)
      const estimated = 5 * 1024 * 1024; // 5MB estimate
      const percentage = (used / estimated) * 100;

      return {
        used,
        available: estimated - used,
        percentage: Math.min(percentage, 100)
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }

  async cleanup(): Promise<void> {
    const storageInfo = await this.getStorageInfo();
    
    // If storage is more than 80% full, clean up old data
    if (storageInfo.percentage > 80) {
      console.warn('LocalStorage is getting full, cleaning up old data...');
      
      const keys = await this.keys();
      const itemsWithDates: Array<{ key: string; date: Date }> = [];
      
      for (const key of keys) {
        try {
          const item = await this.get<any>(key.replace(this.prefix, ''));
          if (item && (item.createdAt || item.updatedAt || item.timestamp)) {
            const date = new Date(item.createdAt || item.updatedAt || item.timestamp);
            itemsWithDates.push({ key: key.replace(this.prefix, ''), date });
          }
        } catch (error) {
          // Skip items that can't be parsed
        }
      }
      
      // Sort by date (oldest first) and remove oldest 20%
      itemsWithDates.sort((a, b) => a.date.getTime() - b.date.getTime());
      const toRemove = Math.floor(itemsWithDates.length * 0.2);
      
      for (let i = 0; i < toRemove; i++) {
        await this.delete(itemsWithDates[i].key);
      }
      
      console.log(`Cleaned up ${toRemove} old items from localStorage`);
    }
  }
}