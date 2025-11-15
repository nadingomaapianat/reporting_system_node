import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';
export declare class DatabaseService implements OnModuleInit, OnModuleDestroy {
    private configService;
    private pool;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    query(sqlQuery: string, params?: any[]): Promise<sql.IRecordSet<any>>;
    getConnection(): Promise<sql.ConnectionPool>;
    closeConnection(): Promise<void>;
    isConnected(): boolean;
    healthCheck(): Promise<{
        connected: boolean;
        error?: string;
    }>;
}
