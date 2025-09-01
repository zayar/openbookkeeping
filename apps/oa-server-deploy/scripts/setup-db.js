const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function setupDatabase() {
  // First connect without specifying database to create it if needed
  const rootConnection = await mysql.createConnection({
    host: process.env.DB_HOST || '34.123.50.107',
    user: process.env.DB_USER || 'gtadmin',
    password: process.env.DB_PASSWORD || 'gtapp456$%^',
    multipleStatements: true
  });

  try {
    console.log('Connected to MySQL server');
    
    // Create database if it doesn't exist
    console.log('Creating database if it doesn\'t exist...');
    await rootConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'openaccounting'}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('Database ready');
    
    // Close root connection
    await rootConnection.end();
    
    // Connect to the specific database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '34.123.50.107',
      user: process.env.DB_USER || 'gtadmin',
      password: process.env.DB_PASSWORD || 'gtapp456$%^',
      database: process.env.DB_NAME || 'openaccounting',
      multipleStatements: true
    });
    
    console.log('Connected to database:', process.env.DB_NAME || 'openaccounting');
    
    // Read and execute schema-tables-only.sql
    const schemaPath = path.join(__dirname, '../schema-tables-only.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    console.log('Applying schema...');
    await connection.execute(schema);
    console.log('Schema applied successfully');
    
    // Read and execute indexes.sql
    const indexesPath = path.join(__dirname, '../indexes.sql');
    const indexes = await fs.readFile(indexesPath, 'utf8');
    console.log('Applying indexes...');
    await connection.execute(indexes);
    console.log('Indexes applied successfully');
    
    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  } finally {
    if (rootConnection) await rootConnection.end();
  }
}

if (require.main === module) {
  setupDatabase().catch(console.error);
}

module.exports = { setupDatabase };
