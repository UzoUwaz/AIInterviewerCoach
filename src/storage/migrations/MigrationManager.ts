import { BaseStorageAdapter } from '../adapters/BaseStorageAdapter';

export interface Migration {
  version: string;
  description: string;
  up: (adapter: BaseStorageAdapter) => Promise<void>;
  down: (adapter: BaseStorageAdapter) => Promise<void>;
}

export interface MigrationRecord {
  version: string;
  appliedAt: Date;
  description: string;
}

export class MigrationManager {
  private adapter: BaseStorageAdapter;
  private migrations: Migration[] = [];

  constructor(adapter: BaseStorageAdapter) {
    this.adapter = adapter;
    this.registerMigrations();
  }

  private registerMigrations(): void {
    // Register all migrations in order
    this.migrations = [
      {
        version: '1.0.0',
        description: 'Initial schema setup',
        up: async (_adapter) => {
          // Initial setup - no migration needed
          console.log('Initial schema setup completed');
        },
        down: async (adapter) => {
          await adapter.clear();
        }
      },
      {
        version: '1.1.0',
        description: 'Add userId index to responses',
        up: async (_adapter) => {
          // This migration is handled by IndexedDB schema upgrade
          console.log('Added userId index to responses');
        },
        down: async (_adapter) => {
          // Cannot easily remove index in IndexedDB without recreating store
          console.log('Downgrade not supported for index changes');
        }
      },
      {
        version: '1.2.0',
        description: 'Add metadata store for versioning',
        up: async (adapter) => {
          const metadata = {
            key: 'schema',
            version: '1.2.0',
            lastMigration: new Date(),
            schemaVersion: 2
          };
          await adapter.set('metadata:schema', metadata);
        },
        down: async (adapter) => {
          await adapter.delete('metadata:schema');
        }
      }
    ];
  }

  async getCurrentVersion(): Promise<string> {
    try {
      const record = await this.adapter.get<MigrationRecord>('migrations:current');
      return record?.version || '0.0.0';
    } catch (error) {
      console.error('Error getting current migration version:', error);
      return '0.0.0';
    }
  }

  async getAppliedMigrations(): Promise<MigrationRecord[]> {
    try {
      return await this.adapter.query<MigrationRecord>('migrations');
    } catch (error) {
      console.error('Error getting applied migrations:', error);
      return [];
    }
  }

  async needsMigration(): Promise<boolean> {
    const currentVersion = await this.getCurrentVersion();
    const latestVersion = this.getLatestVersion();
    
    return this.compareVersions(currentVersion, latestVersion) < 0;
  }

  async migrate(targetVersion?: string): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    const target = targetVersion || this.getLatestVersion();
    
    console.log(`Starting migration from ${currentVersion} to ${target}`);
    
    const migrationsToApply = this.getMigrationsToApply(currentVersion, target);
    
    if (migrationsToApply.length === 0) {
      console.log('No migrations to apply');
      return;
    }

    try {
      await this.adapter.transaction(async () => {
        for (const migration of migrationsToApply) {
          console.log(`Applying migration ${migration.version}: ${migration.description}`);
          
          await migration.up(this.adapter);
          
          // Record the migration
          const record: MigrationRecord = {
            version: migration.version,
            appliedAt: new Date(),
            description: migration.description
          };
          
          await this.adapter.set(`migrations:${migration.version}`, record);
          await this.adapter.set('migrations:current', record);
          
          console.log(`Migration ${migration.version} completed successfully`);
        }
      });
      
      console.log(`Migration to ${target} completed successfully`);
    } catch (error) {
      console.error('Migration failed:', error);
      throw new Error(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async rollback(targetVersion: string): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    
    if (this.compareVersions(targetVersion, currentVersion) >= 0) {
      throw new Error('Target version must be lower than current version for rollback');
    }
    
    console.log(`Starting rollback from ${currentVersion} to ${targetVersion}`);
    
    const migrationsToRollback = this.getMigrationsToRollback(currentVersion, targetVersion);
    
    try {
      await this.adapter.transaction(async () => {
        for (const migration of migrationsToRollback) {
          console.log(`Rolling back migration ${migration.version}: ${migration.description}`);
          
          await migration.down(this.adapter);
          
          // Remove the migration record
          await this.adapter.delete(`migrations:${migration.version}`);
          
          console.log(`Rollback of ${migration.version} completed successfully`);
        }
        
        // Update current version
        const targetRecord: MigrationRecord = {
          version: targetVersion,
          appliedAt: new Date(),
          description: `Rolled back to ${targetVersion}`
        };
        
        await this.adapter.set('migrations:current', targetRecord);
      });
      
      console.log(`Rollback to ${targetVersion} completed successfully`);
    } catch (error) {
      console.error('Rollback failed:', error);
      throw new Error(`Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getMigrationsToApply(currentVersion: string, targetVersion: string): Migration[] {
    return this.migrations.filter(migration => {
      return this.compareVersions(migration.version, currentVersion) > 0 &&
             this.compareVersions(migration.version, targetVersion) <= 0;
    }).sort((a, b) => this.compareVersions(a.version, b.version));
  }

  private getMigrationsToRollback(currentVersion: string, targetVersion: string): Migration[] {
    return this.migrations.filter(migration => {
      return this.compareVersions(migration.version, targetVersion) > 0 &&
             this.compareVersions(migration.version, currentVersion) <= 0;
    }).sort((a, b) => this.compareVersions(b.version, a.version)); // Reverse order for rollback
  }

  private getLatestVersion(): string {
    if (this.migrations.length === 0) return '0.0.0';
    
    return this.migrations
      .sort((a, b) => this.compareVersions(b.version, a.version))[0]
      .version;
  }

  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    const maxLength = Math.max(v1Parts.length, v2Parts.length);
    
    for (let i = 0; i < maxLength; i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part < v2Part) return -1;
      if (v1Part > v2Part) return 1;
    }
    
    return 0;
  }

  async validateMigrations(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // Check for duplicate versions
    const versions = this.migrations.map(m => m.version);
    const duplicates = versions.filter((v, i) => versions.indexOf(v) !== i);
    if (duplicates.length > 0) {
      errors.push(`Duplicate migration versions found: ${duplicates.join(', ')}`);
    }
    
    // Check for invalid version formats
    for (const migration of this.migrations) {
      if (!/^\d+\.\d+\.\d+$/.test(migration.version)) {
        errors.push(`Invalid version format: ${migration.version}`);
      }
    }
    
    // Check for missing up/down methods
    for (const migration of this.migrations) {
      if (typeof migration.up !== 'function') {
        errors.push(`Migration ${migration.version} missing up method`);
      }
      if (typeof migration.down !== 'function') {
        errors.push(`Migration ${migration.version} missing down method`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  async getMigrationStatus(): Promise<{
    currentVersion: string;
    latestVersion: string;
    needsMigration: boolean;
    appliedMigrations: MigrationRecord[];
    pendingMigrations: Migration[];
  }> {
    const currentVersion = await this.getCurrentVersion();
    const latestVersion = this.getLatestVersion();
    const needsMigration = await this.needsMigration();
    const appliedMigrations = await this.getAppliedMigrations();
    const pendingMigrations = this.getMigrationsToApply(currentVersion, latestVersion);
    
    return {
      currentVersion,
      latestVersion,
      needsMigration,
      appliedMigrations,
      pendingMigrations
    };
  }

  // Utility method to create a backup before migration
  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupKey = `backup:${timestamp}`;
    
    try {
      // Export all data
      const allData: any = {};
      const storeNames = ['users', 'sessions', 'questions', 'responses', 'jobApplications', 'performanceScores'];
      
      for (const storeName of storeNames) {
        allData[storeName] = await this.adapter.query(storeName);
      }
      
      // Save backup
      await this.adapter.set(backupKey, {
        data: allData,
        createdAt: new Date(),
        version: await this.getCurrentVersion()
      });
      
      console.log(`Backup created: ${backupKey}`);
      return backupKey;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw new Error('Backup creation failed');
    }
  }

  async restoreBackup(backupKey: string): Promise<void> {
    try {
      const backup = await this.adapter.get<{
        data: any;
        createdAt: Date;
        version: string;
      }>(backupKey);
      
      if (!backup) {
        throw new Error(`Backup not found: ${backupKey}`);
      }
      
      console.log(`Restoring backup from ${backup.createdAt} (version ${backup.version})`);
      
      await this.adapter.transaction(async () => {
        // Clear current data
        await this.adapter.clear();
        
        // Restore backup data
        for (const [storeName, items] of Object.entries(backup.data)) {
          if (Array.isArray(items)) {
            const batchItems = items.map((item: any) => ({
              key: `${storeName}:${item.id}`,
              value: item
            }));
            
            await this.adapter.batchSet(batchItems);
          }
        }
        
        // Restore migration version
        const migrationRecord: MigrationRecord = {
          version: backup.version,
          appliedAt: new Date(),
          description: `Restored from backup ${backupKey}`
        };
        
        await this.adapter.set('migrations:current', migrationRecord);
      });
      
      console.log('Backup restored successfully');
    } catch (error) {
      console.error('Failed to restore backup:', error);
      throw new Error(`Backup restoration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}