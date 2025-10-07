import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as sql from 'mssql';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: sql.ConnectionPool;

  async onModuleInit() {
    const config: sql.config = {
      user: 'SA',
      password: 'Nothing_159',
      server: '206.189.57.0',
      port: 1433,
      database: 'NEWDCC-V4-UAT',
      options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
        packetSize: 32768,
        connectTimeout: 60000,
        requestTimeout: 60000
      },
      pool: {
        max: 20,
        min: 5,
        idleTimeoutMillis: 30000
      }
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
