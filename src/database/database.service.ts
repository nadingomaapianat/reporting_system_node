import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: sql.ConnectionPool;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    // Standard SQL Server Authentication
    const dbHost = this.configService.get<string>('DB_HOST') || '206.189.57.0';
    const dbPort = parseInt(this.configService.get<string>('DB_PORT') || '1433', 10);
    const dbName = this.configService.get<string>('DB_NAME') || 'NEWDCC-V4-UAT';
    const dbUsername = this.configService.get<string>('DB_USERNAME') || 'SA';
    const dbPassword = this.configService.get<string>('DB_PASSWORD') || 'Nothing_159';

    // Standard SQL Server Authentication Configuration
    const config: sql.config = {
      server: dbHost,
      port: dbPort,
      database: dbName,
      user: dbUsername,
      password: dbPassword,
      options: {
        requestTimeout: parseInt(
          this.configService.get<string>('DB_REQUEST_TIMEOUT') || '60000',
          10
        ),
        connectTimeout: parseInt(
          this.configService.get<string>('DB_CONNECT_TIMEOUT') || '60000',
          10
        ),
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
        packetSize: 32768,
      },
      // Connection pool settings
      pool: {
        max: parseInt(
          this.configService.get<string>('DB_POOL_MAX') || '20',
          10
        ),
        min: parseInt(
          this.configService.get<string>('DB_POOL_MIN') || '5',
          10
        ),
        idleTimeoutMillis: parseInt(
          this.configService.get<string>('DB_POOL_IDLE') || '30000',
          10
        ),
      },
    };

    try {
      this.pool = await sql.connect(config);
      console.log(`Database connected successfully to ${dbHost}:${dbPort}/${dbName} using SQL Server Authentication (user: ${dbUsername})!`);
    } catch (err) {
      console.error('Database connection failed:', err);
      console.error(`Connection details: server=${dbHost}:${dbPort}, database=${dbName}, user=${dbUsername}`);
      if (err instanceof Error) {
        console.error(`Error message: ${err.message}`);
        console.error(`Error code: ${(err as any).code || 'N/A'}`);
      }
      throw err;
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.close();
      console.log('Database connection closed.');
    }
  }

  async query(sqlQuery: string, params: any[] = []) {
    if (!this.pool) {
      throw new Error('Database not connected');
    }
    
    try {
      const request = this.pool.request();
      if (params && params.length > 0) {
        params.forEach((param, index) => {
          // Check if parameter is used in OFFSET or FETCH clauses (which require integers)
          const paramPlaceholder = `@param${index}`;
          // Use regex to match OFFSET/FETCH with the parameter (case-insensitive)
          const offsetPattern = new RegExp(`OFFSET\\s+${paramPlaceholder.replace('@', '\\@')}\\s+ROWS`, 'i');
          const fetchPattern = new RegExp(`FETCH\\s+NEXT\\s+${paramPlaceholder.replace('@', '\\@')}\\s+ROWS`, 'i');
          const isOffsetOrFetch = offsetPattern.test(sqlQuery) || fetchPattern.test(sqlQuery);
          
          // If it's a number and used in OFFSET/FETCH, explicitly type it as integer
          if (isOffsetOrFetch && (typeof param === 'number' || !isNaN(Number(param)))) {
            request.input(`param${index}`, sql.Int, Math.floor(Number(param)));
          } else {
            request.input(`param${index}`, param);
          }
        });
      }
      const result = await request.query(sqlQuery);
      return result.recordset;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async getConnection() {
    return this.pool;
  }

  async closeConnection() {
    if (this.pool) {
      await this.pool.close();
    }
  }

  isConnected(): boolean {
    return !!this.pool && this.pool.connected;
  }

  async healthCheck(): Promise<{ connected: boolean; error?: string }> {
    if (!this.pool) {
      return { connected: false, error: 'Connection pool not initialized' };
    }

    if (!this.pool.connected) {
      return { connected: false, error: 'Connection pool not connected' };
    }

    try {
      // Simple query to verify connection is alive
      const request = this.pool.request();
      await request.query('SELECT 1 as health');
      return { connected: true };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error during health check',
      };
    }
  }
}
