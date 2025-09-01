#!/usr/bin/env node

const { spawn } = require('child_process')

console.log('🚀 Starting Full-Stack OpenAccounting Test\n')

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
  
  return process
}

console.log('🔗 Starting BFF Server on port 3001...')
const bffProcess = runCommand('npm', ['run', 'dev'], '../bff', 'BFF', '\x1b[34m')

setTimeout(() => {
  console.log('🎨 Starting Frontend Server on port 3000...')
  const webProcess = runCommand('npm', ['run', 'dev'], '.', 'WEB', '\x1b[32m')
  
  setTimeout(() => {
    console.log('\n' + '='.repeat(60))
    console.log('🎉 SERVERS READY!')
    console.log('='.repeat(60))
    console.log('📱 Frontend:  http://localhost:3000')
    console.log('🔗 BFF API:   http://localhost:3001')
    console.log('🩺 Health:    http://localhost:3001/health')
    console.log('\nPress Ctrl+C to stop servers')
    console.log('='.repeat(60))
  }, 3000)
}, 2000)

process.on('SIGINT', () => {
  console.log('\n⛔ Shutting down...')
  bffProcess.kill()
  webProcess.kill()
  process.exit(0)
})
