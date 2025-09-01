const mysql = require('mysql2/promise');

async function createCloudSQLUser() {
  try {
    // Connect to MySQL
    const connection = await mysql.createConnection({
      host: '34.173.128.29',
      user: 'cashflowadmin',
      password: 'C@shflow132',
      database: 'cashflowdb',
      multipleStatements: true
    });

    console.log('Connected to MySQL as', 'cashflowadmin');

    // Create user for Cloud SQL Proxy
    await connection.query(`
      CREATE USER IF NOT EXISTS 'cashflowadmin'@'cloudsqlproxy~%' IDENTIFIED BY 'C@shflow132';
      GRANT ALL PRIVILEGES ON cashflowdb.* TO 'cashflowadmin'@'cloudsqlproxy~%';
      FLUSH PRIVILEGES;
    `);

    console.log('Successfully created user for Cloud SQL Proxy access');

    // Verify the user was created
    const [rows] = await connection.query(`
      SELECT User, Host FROM mysql.user WHERE User = 'cashflowadmin' AND Host LIKE 'cloudsqlproxy~%'
    `);
    
    console.log('Cloud SQL Proxy users found:', rows);

    await connection.end();
    console.log('Connection closed');
  } catch (error) {
    console.error('Error:', error.message);
    process.exitCode = 1;
  }
}

createCloudSQLUser();
