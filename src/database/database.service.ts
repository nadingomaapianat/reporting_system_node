import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';

type QueryLogContext = {
  label?: string;
};

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: sql.ConnectionPool;
  private readonly slowQueryThresholdMs: number;

  constructor(private configService: ConfigService) {
    this.slowQueryThresholdMs = parseInt(
      this.configService.get<string>('DB_SLOW_QUERY_THRESHOLD') || '5000',
      10
    );
  }

  async onModuleInit() {
    const dbHost =
      this.configService.get<string>('DB_HOST') ;
    const dbPort = parseInt(
      this.configService.get<string>('DB_PORT') ,
      10
    );
    const dbName =
      this.configService.get<string>('DB_NAME') ;

    // Tedious requires domain to be a string for NTLM; use empty string if not set
    const domain =
      this.configService.get<string>('DB_DOMAIN') ?? '';
    const username =
      this.configService.get<string>('DB_USERNAME') ;
    const password = this.configService.get<string>('DB_PASSWORD');

    if (!password) {
      throw new Error('DB_PASSWORD is required for NTLM authentication');
    }

    const config: sql.config = {
      server: dbHost,
      port: dbPort,
      database: dbName,
    
      authentication: {
        type: 'ntlm',
        options: {
          domain,
          userName: username,
          password: password,
        },
      },
    
      options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
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
      console.log(
        `Database connected using NTLM: ${domain}\\${username}`
      );
    } catch (err) {
      console.error('Database connection failed:', err);
      console.error(
        `Connection details: server=${dbHost}:${dbPort}, database=${dbName}, domain=${domain}, user=${username}`
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

  async query(sqlQuery: string, params: any[] = [], context?: QueryLogContext | string) {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const startedAt = Date.now();
    const source = this.resolveQuerySource(context);

    try {
      const result = await this.executeQuery(sqlQuery, params);
      const elapsedMs = Date.now() - startedAt;

      if (elapsedMs >= this.slowQueryThresholdMs) {
        console.warn(
          `[DatabaseService] Slow query detected (${elapsedMs}ms) [${source}]: ${this.summarizeQuery(sqlQuery)}`,
          {
            paramsCount: params?.length || 0,
            rowCount: result.recordset?.length || 0,
          }
        );
      }

      return result.recordset;
    } catch (error) {
      const offsetFetchFallback = this.extractOffsetFetchFallback(sqlQuery, params);
      if (offsetFetchFallback && this.isOffsetFetchCompatibilityError(error)) {
        console.warn(
          `[DatabaseService] Retrying query without OFFSET/FETCH [${source}]: ${this.summarizeQuery(sqlQuery)}`
        );
        const fallbackResult = await this.executeQuery(offsetFetchFallback.sqlQuery, params);
        return fallbackResult.recordset.slice(
          offsetFetchFallback.offset,
          offsetFetchFallback.offset + offsetFetchFallback.limit,
        );
      }

      const elapsedMs = Date.now() - startedAt;
      console.error(
        `[DatabaseService] Database query error after ${elapsedMs}ms [${source}]: ${this.summarizeQuery(sqlQuery)}`,
        {
          paramsCount: params?.length || 0,
          error,
        }
      );
      throw error;
    }
  }

  private async executeQuery(sqlQuery: string, params: any[] = []) {
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
        } else if (typeof param === 'string') {
          request.input(`param${index}`, sql.NVarChar(4000), param);
        } else {
          request.input(`param${index}`, param);
        }
      });
    }

    return request.query(sqlQuery);
  }

  private extractOffsetFetchFallback(sqlQuery: string, params: any[]) {
    const normalized = String(sqlQuery || '').trim().replace(/;+\s*$/, '');
    const match = normalized.match(
      /\sOFFSET\s+([^\s]+)\s+ROWS\s+FETCH\s+NEXT\s+([^\s]+)\s+ROWS\s+ONLY\s*$/i
    );
    if (!match) return null;

    const offset = this.resolvePaginationToken(match[1], params);
    const limit = this.resolvePaginationToken(match[2], params);
    if (offset == null || limit == null) return null;

    return {
      sqlQuery: normalized.slice(0, match.index).trim(),
      offset,
      limit,
    };
  }

  private resolvePaginationToken(token: string, params: any[]): number | null {
    const trimmed = String(token || '').trim();
    const paramMatch = trimmed.match(/^@param(\d+)$/i);
    if (paramMatch) {
      const raw = params?.[Number(paramMatch[1])];
      const parsed = Math.floor(Number(raw));
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    }

    const parsed = Math.floor(Number(trimmed));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  private isOffsetFetchCompatibilityError(error: unknown): boolean {
    const message = [
      (error as any)?.message,
      (error as any)?.originalError?.info?.message,
      (error as any)?.precedingErrors?.map((item: any) => item?.message).join(' '),
    ]
      .filter(Boolean)
      .join(' ');

    return /incorrect syntax near ['"]?offset['"]?|invalid usage of the option next|invalid usage of the option first|fetch statement/i.test(message);
  }

  private summarizeQuery(sqlQuery: string): string {
    const normalized = String(sqlQuery || '')
      .replace(/\s+/g, ' ')
      .trim();

    if (normalized.length <= 300) return normalized;
    return `${normalized.slice(0, 300)}...`;
  }

  private resolveQuerySource(context?: QueryLogContext | string): string {
    if (typeof context === 'string' && context.trim()) {
      return context.trim();
    }

    if (
      context &&
      typeof context === 'object' &&
      typeof context.label === 'string' &&
      context.label.trim()
    ) {
      return context.label.trim();
    }

    const stack = new Error().stack || '';
    const frames = stack
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const appFrame = frames.find(
      (line) =>
        line.includes('/src/') &&
        !line.includes('/src/database/database.service.ts')
    );

    if (!appFrame) return 'unknown-source';

    const normalized = appFrame
      .replace(/^at\s+/, '')
      .replace(process.cwd(), '')
      .replace(/\\/g, '/');

    return normalized;
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
