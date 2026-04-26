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
    const username =
      this.configService.get<string>('DB_USERNAME') ;
    const password = this.configService.get<string>('DB_PASSWORD');
    const domain =
      this.configService.get<string>('DB_DOMAIN') ?? '';
    const configuredAuthType = this.configService.get<string>('DB_AUTH_TYPE');
    const authType = (configuredAuthType || (domain.trim() ? 'ntlm' : 'sql'))
      .trim()
      .toLowerCase();

    if (!username) {
      throw new Error('DB_USERNAME is required');
    }
    if (!password) {
      throw new Error('DB_PASSWORD is required');
    }
    if (authType === 'ntlm' && !domain.trim()) {
      throw new Error('DB_DOMAIN is required when DB_AUTH_TYPE is ntlm');
    }

    const config: sql.config = {
      server: dbHost,
      port: dbPort,
      database: dbName,
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

    if (authType === 'ntlm') {
      config.authentication = {
        type: 'ntlm',
        options: {
          domain,
          userName: username,
          password,
        },
      };
    } else {
      config.user = username;
      config.password = password;
    }

    try {
      this.pool = await sql.connect(config);
      console.log(
        authType === 'ntlm'
          ? `Database connected using NTLM: ${domain}\\${username}`
          : `Database connected using SQL authentication: ${username}`
      );
    } catch (err) {
      console.error('Database connection failed:', err);
      console.error(
        `Connection details: server=${dbHost}:${dbPort}, database=${dbName}, authType=${authType}, domain=${domain}, user=${username}`
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

  async query(sqlQuery: string, params: any[] = [], context?: string) {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    try {
      const result = await this.executeQuery(sqlQuery, params);
      return result.recordset;
    } catch (error) {
      const fallback = this.extractOffsetFetchFallback(sqlQuery, params);
      if (fallback && this.isOffsetFetchCompatibilityError(error)) {
        console.warn(
          `[DatabaseService] Retrying query without OFFSET/FETCH${context ? ` [${context}]` : ''}`
        );
        const fallbackResult = await this.executeQuery(fallback.sqlQuery, params);
        return fallbackResult.recordset.slice(
          fallback.offset,
          fallback.offset + fallback.limit,
        );
      }
      console.error('Database query error:', error);
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
    const offsetFetchRegex =
      /\s+OFFSET\s+(@param\d+|\d+)\s+ROWS\s+FETCH\s+NEXT\s+(@param\d+|\d+)\s+ROWS\s+ONLY\s*;?\s*$/i;
    const match = sqlQuery.match(offsetFetchRegex);
    if (!match) {
      return null;
    }

    const offset = this.resolvePaginationToken(match[1], params);
    const limit = this.resolvePaginationToken(match[2], params);
    if (offset == null || limit == null) {
      return null;
    }

    return {
      sqlQuery: sqlQuery.replace(offsetFetchRegex, '').trim(),
      offset,
      limit,
    };
  }

  private resolvePaginationToken(token: string, params: any[]) {
    const trimmed = String(token).trim();
    if (/^@param\d+$/i.test(trimmed)) {
      const index = Number(trimmed.replace(/[^0-9]/g, ''));
      const value = params[index];
      if (value == null || Number.isNaN(Number(value))) {
        return null;
      }
      return Math.max(0, Math.floor(Number(value)));
    }

    if (Number.isNaN(Number(trimmed))) {
      return null;
    }
    return Math.max(0, Math.floor(Number(trimmed)));
  }

  private isOffsetFetchCompatibilityError(error: any): boolean {
    const messages = [
      error?.message,
      error?.originalError?.message,
      ...(Array.isArray(error?.precedingErrors)
        ? error.precedingErrors.map((item: any) => item?.message)
        : []),
    ]
      .filter(Boolean)
      .map((message: string) => message.toLowerCase());

    return messages.some(
      (message) =>
        message.includes("invalid usage of the option next in the fetch statement") ||
        message.includes("incorrect syntax near 'offset'") ||
        message.includes("incorrect syntax near the keyword 'order'"),
    );
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
