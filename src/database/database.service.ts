import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: sql.ConnectionPool;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    //for bank
    const dbHost = this.configService.get<string>('DB_HOST');
    const dbPort = parseInt(this.configService.get<string>('DB_PORT'), 10);
    const dbName = this.configService.get<string>('DB_NAME');
    
    // إعدادات Windows Authentication
    const dbDomain = this.configService.get<string>('DB_Domain');
    const dbUsername = this.configService.get<string>('DB_USERNAME');
    const dbPassword = this.configService.get<string>('DB_PASSWORD');

    // NTLM Authentication - equivalent to authentication.type: 'ntlm'
    const user = dbDomain && dbUsername 
      ? `${dbDomain}\\${dbUsername}` 
      : dbUsername;

    const config: sql.config = {
      user: user,
      password: dbPassword,
      server: dbHost,
      port: dbPort,
      database: dbName,
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
        // إعدادات Windows Authentication
        // NTLM: domain\username format in user field = authentication.type: 'ntlm'
      },
      // إعدادات تجمع الاتصالات
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
      console.log('Database connected successfully!');
    } catch (err) {
      console.error('Database connection failed:', err);
      console.log('Continuing with mock data...');
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
          request.input(`param${index}`, param);
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
    return !!this.pool;
  }
}
