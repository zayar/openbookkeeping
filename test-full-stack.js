#!/usr/bin/env node

const { spawn } = require('child_process')
const path = require('path')

console.log('🚀 Starting Full-Stack OpenAccounting Test\n')

// Function to run a command in a specific directory
function runCommand(cmd, args, cwd, name, color) {
  const process = spawn(cmd, args, { 
    cwd, 
    stdio: 'pipe',
    shell: true 
  })
  
  process.stdout.on('data', (data) => {
    console.log(`${color}[${name}]${'\x1b[0m'} ${data.toString().trim()}`)
  })
  
  process.stderr.on('data', (data) => {
    console.error(`${color}[${name} ERROR]${'\x1b[0m'} ${data.toString().trim()}`)
  })
  
  process.on('close', (code) => {
    console.log(`${color}[${name}]${'\x1b[0m'} Process exited with code ${code}`)
  })
  
  return process
}

async function startServers() {
  console.log('Starting servers...\n')
  
  // Start BFF server
  console.log('🔗 Starting BFF Server on port 3001...')
  const bffProcess = runCommand('npm', ['run', 'dev'], '../bff', 'BFF', '\x1b[34m') // Blue
  
  // Wait a moment before starting frontend
  setTimeout(() => {
    console.log('🎨 Starting Frontend Server on port 3000...')
    const webProcess = runCommand('npm', ['run', 'dev'], '.', 'WEB', '\x1b[32m') // Green
    
    // Show instructions after both are starting
    setTimeout(() => {
      console.log('\n' + '='.repeat(80))
      console.log('🎉 SERVERS STARTING!')
      console.log('='.repeat(80))
      console.log('')
      console.log('📱 Frontend:  http://localhost:3000')
      console.log('🔗 BFF API:   http://localhost:3001')
      console.log('🩺 Health:    http://localhost:3001/health')
      console.log('')
      console.log('🧪 Test Flow:')
      console.log('1. Visit http://localhost:3000')
      console.log('2. Click "Get Started" to register')
      console.log('3. Fill in your details and organization name')
      console.log('4. You should be redirected to the dashboard')
      console.log('5. Try logging out and logging back in')
      console.log('')
      console.log('💡 Tips:')
      console.log('- Check the Network tab in DevTools for API calls')
      console.log('- BFF logs will show authentication attempts')
      console.log('- If registration fails, check BFF database connection')
      console.log('')
      console.log('Press Ctrl+C to stop all servers')
      console.log('='.repeat(80))
    }, 2000)
    
  }, 3000)

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n⛔ Shutting down servers...')
    bffProcess.kill('SIGTERM')
    webProcess.kill('SIGTERM')
    process.exit(0)
  })
}

// Check if we're in the right directory
const currentDir = process.cwd()
if (!currentDir.includes('apps/web')) {
  console.error('❌ Please run this script from the apps/web directory')
  console.error('   cd apps/web && node test-full-stack.js')
  process.exit(1)
}

startServers()
