import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as sql from 'mssql';
export declare class DatabaseService implements OnModuleInit, OnModuleDestroy {
    private pool;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    query(sqlQuery: string, params?: any[]): Promise<sql.IRecordSet<any>>;
    getConnection(): Promise<sql.ConnectionPool>;
    closeConnection(): Promise<void>;
    isConnected(): boolean;
}
