import { BaseStorageAdapter } from './BaseStorageAdapter';

// PostgreSQL adapter for Docker deployments
export class PostgreSQLAdapter extends BaseStorageAdapter {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config: { baseUrl: string; apiKey?: string }) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = config.apiKey;
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error making request to ${url}:`, error);
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await this.makeRequest<{ data: T | null }>(`/storage/${encodeURIComponent(key)}`);
      return result.data;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.makeRequest(`/storage/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ value })
    });
  }

  async delete(key: string): Promise<void> {
    await this.makeRequest(`/storage/${encodeURIComponent(key)}`, {
      method: 'DELETE'
    });
  }

  async clear(): Promise<void> {
    await this.makeRequest('/storage', {
      method: 'DELETE'
    });
  }

  async keys(): Promise<string[]> {
    const result = await this.makeRequest<{ keys: string[] }>('/storage/keys');
    return result.keys;
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.makeRequest(`/storage/${encodeURIComponent(key)}/exists`);
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return false;
      }
      throw error;
    }
  }

  async query<T>(storeName: string, filters?: Record<string, any>): Promise<T[]> {
    const params = new URLSearchParams();
    if (filters) {
      params.append('filters', JSON.stringify(filters));
    }
    
    const endpoint = `/storage/query/${encodeURIComponent(storeName)}${params.toString() ? '?' + params.toString() : ''}`;
    const result = await this.makeRequest<{ data: T[] }>(endpoint);
    return result.data;
  }

  async count(storeName: string, filters?: Record<string, any>): Promise<number> {
    const params = new URLSearchParams();
    if (filters) {
      params.append('filters', JSON.stringify(filters));
    }
    
    const endpoint = `/storage/count/${encodeURIComponent(storeName)}${params.toString() ? '?' + params.toString() : ''}`;
    const result = await this.makeRequest<{ count: number }>(endpoint);
    return result.count;
  }

  async batchSet<T>(items: Array<{ key: string; value: T }>): Promise<void> {
    await this.makeRequest('/storage/batch', {
      method: 'PUT',
      body: JSON.stringify({ items })
    });
  }

  async batchGet<T>(keys: string[]): Promise<Array<T | null>> {
    const result = await this.makeRequest<{ data: Array<T | null> }>('/storage/batch', {
      method: 'POST',
      body: JSON.stringify({ keys })
    });
    return result.data;
  }

  async batchDelete(keys: string[]): Promise<void> {
    await this.makeRequest('/storage/batch', {
      method: 'DELETE',
      body: JSON.stringify({ keys })
    });
  }

  async transaction<T>(operations: () => Promise<T>): Promise<T> {
    // Start transaction
    const txResult = await this.makeRequest<{ transactionId: string }>('/storage/transaction', {
      method: 'POST'
    });
    
    const transactionId = txResult.transactionId;
    
    try {
      // Execute operations within transaction context
      // Note: This is a simplified implementation. In a real scenario,
      // you'd need to modify all operations to include the transaction ID
      const result = await operations();
      
      // Commit transaction
      await this.makeRequest(`/storage/transaction/${transactionId}/commit`, {
        method: 'POST'
      });
      
      return result;
    } catch (error) {
      // Rollback transaction
      try {
        await this.makeRequest(`/storage/transaction/${transactionId}/rollback`, {
          method: 'POST'
        });
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
      throw error;
    }
  }

  // PostgreSQL-specific methods
  async healthCheck(): Promise<boolean> {
    try {
      await this.makeRequest('/health');
      return true;
    } catch (error) {
      console.error('PostgreSQL health check failed:', error);
      return false;
    }
  }

  async getConnectionInfo(): Promise<{ connected: boolean; version?: string; uptime?: number }> {
    try {
      const result = await this.makeRequest<{ 
        connected: boolean; 
        version?: string; 
        uptime?: number 
      }>('/storage/info');
      return result;
    } catch (error) {
      console.error('Error getting connection info:', error);
      return { connected: false };
    }
  }

  async backup(): Promise<{ backupId: string; size: number }> {
    const result = await this.makeRequest<{ backupId: string; size: number }>('/storage/backup', {
      method: 'POST'
    });
    return result;
  }

  async restore(backupId: string): Promise<void> {
    await this.makeRequest(`/storage/restore/${backupId}`, {
      method: 'POST'
    });
  }

  async getMetrics(): Promise<{
    totalRecords: number;
    storageSize: number;
    queryPerformance: Record<string, number>;
  }> {
    const result = await this.makeRequest<{
      totalRecords: number;
      storageSize: number;
      queryPerformance: Record<string, number>;
    }>('/storage/metrics');
    return result;
  }
}