import { JobDescriptionData, CachedJobDescription } from '../types/parsing';

export class JobDescriptionCache {
  private readonly STORAGE_KEY = 'ai-interview-coach-job-cache';
  private readonly MAX_CACHE_SIZE = 50;
  private readonly CACHE_EXPIRY_DAYS = 7;

  async saveJobDescription(jobData: JobDescriptionData): Promise<void> {
    try {
      const cache = await this.getCache();
      const hash = this.generateHash(jobData.rawText);
      
      const cachedItem: CachedJobDescription = {
        hash,
        data: jobData,
        cachedAt: new Date(),
        accessCount: 1
      };

      cache.set(hash, cachedItem);
      
      // Cleanup old entries if cache is too large
      if (cache.size > this.MAX_CACHE_SIZE) {
        this.cleanupCache(cache);
      }

      await this.saveCache(cache);
    } catch (error) {
      console.warn('Failed to cache job description:', error);
    }
  }

  async getJobDescription(rawText: string): Promise<JobDescriptionData | null> {
    try {
      const cache = await this.getCache();
      const hash = this.generateHash(rawText);
      const cached = cache.get(hash);

      if (!cached) return null;

      // Check if cache entry is expired
      const daysSinceCached = (Date.now() - cached.cachedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCached > this.CACHE_EXPIRY_DAYS) {
        cache.delete(hash);
        await this.saveCache(cache);
        return null;
      }

      // Update access count
      cached.accessCount++;
      cache.set(hash, cached);
      await this.saveCache(cache);

      return cached.data;
    } catch (error) {
      console.warn('Failed to retrieve cached job description:', error);
      return null;
    }
  }

  async getAllCachedJobs(): Promise<JobDescriptionData[]> {
    try {
      const cache = await this.getCache();
      return Array.from(cache.values())
        .sort((a, b) => b.accessCount - a.accessCount)
        .map(item => item.data);
    } catch (error) {
      console.warn('Failed to retrieve all cached jobs:', error);
      return [];
    }
  }

  async clearCache(): Promise<void> {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear job description cache:', error);
    }
  }

  async getCacheStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    oldestEntry?: Date;
    newestEntry?: Date;
    mostAccessed?: { job: string; count: number };
  }> {
    try {
      const cache = await this.getCache();
      const entries = Array.from(cache.values());

      if (entries.length === 0) {
        return { totalEntries: 0, totalSize: 0 };
      }

      const dates = entries.map(e => e.cachedAt);
      const mostAccessed = entries.reduce((max, current) => 
        current.accessCount > max.accessCount ? current : max
      );

      return {
        totalEntries: entries.length,
        totalSize: JSON.stringify(entries).length,
        oldestEntry: new Date(Math.min(...dates.map(d => d.getTime()))),
        newestEntry: new Date(Math.max(...dates.map(d => d.getTime()))),
        mostAccessed: {
          job: mostAccessed.data.title,
          count: mostAccessed.accessCount
        }
      };
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
      return { totalEntries: 0, totalSize: 0 };
    }
  }

  private async getCache(): Promise<Map<string, CachedJobDescription>> {
    try {
      const cached = localStorage.getItem(this.STORAGE_KEY);
      if (!cached) return new Map();

      const data = JSON.parse(cached);
      const cache = new Map<string, CachedJobDescription>();

      for (const [key, value] of Object.entries(data)) {
        const item = value as any;
        cache.set(key, {
          ...item,
          cachedAt: new Date(item.cachedAt),
          data: {
            ...item.data,
            parsedAt: new Date(item.data.parsedAt)
          }
        });
      }

      return cache;
    } catch (error) {
      console.warn('Failed to load job description cache:', error);
      return new Map();
    }
  }

  private async saveCache(cache: Map<string, CachedJobDescription>): Promise<void> {
    try {
      const data = Object.fromEntries(cache);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save job description cache:', error);
    }
  }

  private cleanupCache(cache: Map<string, CachedJobDescription>): void {
    // Remove oldest and least accessed entries
    const entries = Array.from(cache.entries());
    
    // Sort by access count (ascending) and then by date (ascending)
    entries.sort((a, b) => {
      const accessDiff = a[1].accessCount - b[1].accessCount;
      if (accessDiff !== 0) return accessDiff;
      return a[1].cachedAt.getTime() - b[1].cachedAt.getTime();
    });

    // Remove the oldest/least accessed entries
    const toRemove = entries.length - this.MAX_CACHE_SIZE + 10; // Remove extra to avoid frequent cleanup
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      cache.delete(entries[i][0]);
    }
  }

  private generateHash(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}