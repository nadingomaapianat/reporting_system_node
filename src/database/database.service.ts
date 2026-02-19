import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: sql.ConnectionPool;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const dbHost =
      this.configService.get<string>('DB_HOST') ;
    const dbPort = parseInt(
      this.configService.get<string>('DB_PORT') ,
      10
    );
    const dbName =
      this.configService.get<string>('DB_NAME') ;

    // Determine authentication type based on domain configuration
    const domain =
      this.configService.get<string>('DB_DOMAIN') ?? '';
    const username =
      this.configService.get<string>('DB_USERNAME') ;
    const password = this.configService.get<string>('DB_PASSWORD');

    if (!username) {
      throw new Error('DB_USERNAME is required for database authentication');
    }
    if (!password) {
      throw new Error('DB_PASSWORD is required for database authentication');
    }

    // Use NTLM authentication only if domain is explicitly provided
    // Otherwise, use SQL Server authentication with username and password (default)
    const useNtlm = domain && domain.trim() !== '';
    
    // Build connection config
    const config: sql.config = {
      server: dbHost,
      port: dbPort,
      database: dbName,
      // SQL Server authentication: use user and password properties
      user: useNtlm ? undefined : username,
      password: useNtlm ? undefined : password,
      // NTLM authentication: use authentication object (only when domain is provided)
      authentication: useNtlm
        ? {
            type: 'ntlm',
            options: {
              domain,
              userName: username,
              password: password,
            },
          }
        : undefined,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
        // Note: TLS ServerName deprecation warning when using IP addresses is a Node.js/Tedious issue
        // This warning is harmless and doesn't affect functionality. It will be resolved in future library versions.
        requestTimeout: parseInt(
          this.configService.get<string>('DB_REQUEST_TIMEOUT') || '60000',
          10
        ),
        connectTimeout: parseInt(
          this.configService.get<string>('DB_CONNECT_TIMEOUT') || '60000',
          10
        ),
        packetSize: 32768,
      },
      pool: {
        max: parseInt(this.configService.get<string>('DB_POOL_MAX') || '100', 10),
        min: parseInt(this.configService.get<string>('DB_POOL_MIN') || '20', 10),
        idleTimeoutMillis: parseInt(
          this.configService.get<string>('DB_POOL_IDLE') || '30000',
          10
        ),
      },
    };
    
    try {
      this.pool = await sql.connect(config);
      const authType = useNtlm ? 'NTLM' : 'SQL Server';
      const authInfo = useNtlm ? `${domain}\\${username}` : username;
      console.log(
        `Database connected using ${authType} authentication: ${authInfo}`
      );
    } catch (err) {
      console.error('Database connection failed:', err);
      console.error(
        `Connection details: server=${dbHost}:${dbPort}, database=${dbName}, domain=${domain}, user=${username}, authType=${useNtlm ? 'NTLM' : 'SQL Server'}`
      );
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
          const paramPlaceholder = `@param${index}`;
          const offsetPattern = new RegExp(
            `OFFSET\\s+${paramPlaceholder.replace('@', '\\@')}\\s+ROWS`,
            'i'
          );
          const fetchPattern = new RegExp(
            `FETCH\\s+NEXT\\s+${paramPlaceholder.replace('@', '\\@')}\\s+ROWS`,
            'i'
          );

          const isOffsetOrFetch =
            offsetPattern.test(sqlQuery) ||
            fetchPattern.test(sqlQuery);

          if (
            isOffsetOrFetch &&
            (typeof param === 'number' || !isNaN(Number(param)))
          ) {
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
      const request = this.pool.request();
      await request.query('SELECT 1 as health');
      return { connected: true };
    } catch (error) {
      return {
        connected: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error during health check',
      };
    }
  }
}
