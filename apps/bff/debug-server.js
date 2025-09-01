// Minimal server to debug the hanging issue
const express = require('express');
const { config } = require('dotenv');

// Load environment variables
config();

console.log('🔍 Starting debug server...');

async function testCloudSQL() {
  console.log('1️⃣ Testing Cloud SQL connection...');
  
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  try {
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Cloud SQL connection working');
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.log('❌ Cloud SQL connection failed:', error.message);
    await prisma.$disconnect();
    return false;
  }
}

async function startMinimalServer() {
  try {
    console.log('2️⃣ Testing Cloud SQL...');
    const sqlWorking = await testCloudSQL();
    
    if (!sqlWorking) {
      throw new Error('Cloud SQL not working');
    }
    
    console.log('3️⃣ Creating Express app...');
    const app = express();
    
    app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });
    
    app.get('/', (req, res) => {
      res.json({ message: 'Debug server running', database: 'Cloud SQL connected' });
    });
    
    console.log('4️⃣ Starting server...');
    const server = app.listen(3001, () => {
      console.log('🎉 Debug server running on port 3001');
      console.log('🔍 Test: http://localhost:3001/health');
      console.log('✅ No hanging detected!');
    });
    
    // Auto-shutdown after 30 seconds
    setTimeout(() => {
      console.log('⏰ Auto-shutting down debug server...');
      server.close();
      process.exit(0);
    }, 30000);
    
  } catch (error) {
    console.log('❌ Debug server failed:', error.message);
    process.exit(1);
  }
}

startMinimalServer();
