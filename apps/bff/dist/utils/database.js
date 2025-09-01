"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const logger_1 = require("./logger");
let connectionPool = null;
exports.db = {
    getConnection: async () => {
        if (!connectionPool) {
            connectionPool = promise_1.default.createPool({
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'openaccounting',
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0,
                acquireTimeout: 60000,
                timeout: 60000,
                reconnect: true
            });
        }
        return connectionPool;
    },
    query: async (sql, params) => {
        try {
            const pool = await exports.db.getConnection();
            const [rows] = await pool.execute(sql, params);
            return rows;
        }
        catch (error) {
            logger_1.logger.error('Database query error', { sql, params, error });
            throw error;
        }
    },
    queryOne: async (sql, params) => {
        try {
            const pool = await exports.db.getConnection();
            const [rows] = await pool.execute(sql, params);
            const results = rows;
            return results.length > 0 ? results[0] : null;
        }
        catch (error) {
            logger_1.logger.error('Database query error', { sql, params, error });
            throw error;
        }
    },
    execute: async (sql, params) => {
        try {
            const pool = await exports.db.getConnection();
            const [result] = await pool.execute(sql, params);
            return result;
        }
        catch (error) {
            logger_1.logger.error('Database execute error', { sql, params, error });
            throw error;
        }
    },
    transaction: async (callback) => {
        const pool = await exports.db.getConnection();
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const result = await callback(connection);
            await connection.commit();
            return result;
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
    },
    close: async () => {
        if (connectionPool) {
            await connectionPool.end();
            connectionPool = null;
        }
    }
};
//# sourceMappingURL=database.js.map