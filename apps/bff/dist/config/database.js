"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = exports.testConnection = exports.pool = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const logger_1 = require("@/utils/logger");
const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'openaccounting_bff',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
};
exports.pool = promise_1.default.createPool(DB_CONFIG);
const testConnection = async () => {
    try {
        const connection = await exports.pool.getConnection();
        logger_1.logger.info('Database connection established successfully');
        connection.release();
    }
    catch (error) {
        logger_1.logger.error('Failed to connect to database:', error);
        throw error;
    }
};
exports.testConnection = testConnection;
const initializeDatabase = async () => {
    try {
        const connection = await exports.pool.getConnection();
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(36) PRIMARY KEY,
        org_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address_street VARCHAR(255),
        address_city VARCHAR(100),
        address_state VARCHAR(100),
        address_zip VARCHAR(20),
        address_country VARCHAR(100),
        payment_terms VARCHAR(50) DEFAULT 'Net 30',
        credit_limit DECIMAL(15,2) DEFAULT 0,
        ar_account_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_customers_org_id (org_id),
        INDEX idx_customers_email (email)
      )
    `);
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS vendors (
        id VARCHAR(36) PRIMARY KEY,
        org_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address_street VARCHAR(255),
        address_city VARCHAR(100),
        address_state VARCHAR(100),
        address_zip VARCHAR(20),
        address_country VARCHAR(100),
        payment_terms VARCHAR(50) DEFAULT 'Net 30',
        ap_account_id VARCHAR(36),
        tax_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_vendors_org_id (org_id),
        INDEX idx_vendors_email (email)
      )
    `);
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS items (
        id VARCHAR(36) PRIMARY KEY,
        org_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(100),
        description TEXT,
        unit_price DECIMAL(15,2) NOT NULL,
        cost_price DECIMAL(15,2) DEFAULT 0,
        taxable BOOLEAN DEFAULT true,
        revenue_account_id VARCHAR(36),
        cogs_account_id VARCHAR(36),
        category VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_items_org_id (org_id),
        INDEX idx_items_sku (org_id, sku),
        UNIQUE KEY unique_sku_per_org (org_id, sku)
      )
    `);
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS invoices (
        id VARCHAR(36) PRIMARY KEY,
        org_id VARCHAR(36) NOT NULL,
        customer_id VARCHAR(36) NOT NULL,
        invoice_number VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        due_date DATE NOT NULL,
        status ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
        subtotal DECIMAL(15,2) NOT NULL,
        tax_amount DECIMAL(15,2) DEFAULT 0,
        total DECIMAL(15,2) NOT NULL,
        transaction_id VARCHAR(36),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_invoices_org_id (org_id),
        INDEX idx_invoices_customer_id (customer_id),
        INDEX idx_invoices_status (status),
        UNIQUE KEY unique_invoice_number_per_org (org_id, invoice_number),
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      )
    `);
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id VARCHAR(36) PRIMARY KEY,
        invoice_id VARCHAR(36) NOT NULL,
        item_id VARCHAR(36),
        description VARCHAR(255) NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        unit_price DECIMAL(15,2) NOT NULL,
        total DECIMAL(15,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_invoice_items_invoice_id (invoice_id),
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      )
    `);
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS bills (
        id VARCHAR(36) PRIMARY KEY,
        org_id VARCHAR(36) NOT NULL,
        vendor_id VARCHAR(36) NOT NULL,
        bill_number VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        due_date DATE NOT NULL,
        status ENUM('draft', 'pending', 'approved', 'paid', 'cancelled') DEFAULT 'draft',
        subtotal DECIMAL(15,2) NOT NULL,
        tax_amount DECIMAL(15,2) DEFAULT 0,
        total DECIMAL(15,2) NOT NULL,
        transaction_id VARCHAR(36),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_bills_org_id (org_id),
        INDEX idx_bills_vendor_id (vendor_id),
        INDEX idx_bills_status (status),
        UNIQUE KEY unique_bill_number_per_org (org_id, bill_number),
        FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
      )
    `);
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS bill_items (
        id VARCHAR(36) PRIMARY KEY,
        bill_id VARCHAR(36) NOT NULL,
        description VARCHAR(255) NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        unit_price DECIMAL(15,2) NOT NULL,
        total DECIMAL(15,2) NOT NULL,
        expense_account_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_bill_items_bill_id (bill_id),
        FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
      )
    `);
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS expenses (
        id VARCHAR(36) PRIMARY KEY,
        org_id VARCHAR(36) NOT NULL,
        date DATE NOT NULL,
        vendor_id VARCHAR(36),
        description VARCHAR(255) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        category VARCHAR(100),
        payment_method ENUM('cash', 'card', 'bank', 'check') NOT NULL,
        expense_account_id VARCHAR(36),
        bank_account_id VARCHAR(36),
        transaction_id VARCHAR(36),
        receipt VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_expenses_org_id (org_id),
        INDEX idx_expenses_date (date),
        FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
      )
    `);
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id VARCHAR(36) PRIMARY KEY,
        org_id VARCHAR(36) NOT NULL,
        account_id VARCHAR(36) NOT NULL,
        bank_name VARCHAR(255) NOT NULL,
        account_number VARCHAR(50) NOT NULL,
        account_type ENUM('checking', 'savings', 'credit') NOT NULL,
        balance DECIMAL(15,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_bank_accounts_org_id (org_id),
        INDEX idx_bank_accounts_account_id (account_id)
      )
    `);
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(36) PRIMARY KEY,
        org_id VARCHAR(36) NOT NULL,
        type ENUM('receive', 'pay') NOT NULL,
        customer_id VARCHAR(36),
        vendor_id VARCHAR(36),
        amount DECIMAL(15,2) NOT NULL,
        date DATE NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        reference VARCHAR(100),
        bank_account_id VARCHAR(36),
        transaction_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_payments_org_id (org_id),
        INDEX idx_payments_type (type),
        INDEX idx_payments_date (date),
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
        FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
      )
    `);
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS payment_allocations (
        id VARCHAR(36) PRIMARY KEY,
        payment_id VARCHAR(36) NOT NULL,
        document_id VARCHAR(36) NOT NULL,
        document_type ENUM('invoice', 'bill') NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_payment_allocations_payment_id (payment_id),
        INDEX idx_payment_allocations_document_id (document_id),
        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
      )
    `);
        connection.release();
        logger_1.logger.info('Database schema initialized successfully');
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize database schema:', error);
        throw error;
    }
};
exports.initializeDatabase = initializeDatabase;
//# sourceMappingURL=database.js.map