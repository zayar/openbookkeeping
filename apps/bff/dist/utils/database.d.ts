import mysql from 'mysql2/promise';
export declare const db: {
    getConnection: () => Promise<mysql.Pool>;
    query: <T = any>(sql: string, params?: any[]) => Promise<T[]>;
    queryOne: <T = any>(sql: string, params?: any[]) => Promise<T | null>;
    execute: (sql: string, params?: any[]) => Promise<mysql.ResultSetHeader>;
    transaction: <T>(callback: (connection: mysql.Connection) => Promise<T>) => Promise<T>;
    close: () => Promise<void>;
};
//# sourceMappingURL=database.d.ts.map