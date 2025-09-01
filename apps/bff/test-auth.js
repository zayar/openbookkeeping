// Simple test script for authentication
const fetch = require('node-fetch')

const BFF_URL = 'http://localhost:3001'

async function testHealthCheck() {
  try {
    console.log('🔍 Testing health check...')
    const response = await fetch(`${BFF_URL}/health`)
    const data = await response.json()
    console.log('✅ Health check:', data.status)
    return response.ok
  } catch (error) {
    console.error('❌ Health check failed:', error.message)
    return false
  }
}

async function testRegister() {
  try {
    console.log('\n👤 Testing user registration...')
    const response = await fetch(`${BFF_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123',
        name: 'Test User',
        organizationName: 'Test Organization',
        organizationDescription: 'A test organization for development'
      })
    })

    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Registration successful!')
      console.log('📄 User:', data.data.user.email)
      console.log('🏢 Organization:', data.data.organization.name)
      console.log('🔑 Token:', data.data.token.substring(0, 20) + '...')
      return data.data.token
    } else {
      console.log('❌ Registration failed:', data.error)
      return null
    }
  } catch (error) {
    console.error('❌ Registration error:', error.message)
    return null
  }
}

async function testMe(token) {
  try {
    console.log('\n👤 Testing /auth/me...')
    const response = await fetch(`${BFF_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ User info retrieved!')
      console.log('📧 Email:', data.data.user.email)
      console.log('👤 Name:', data.data.user.name)
      console.log('🏢 Organizations:', data.data.organizations.length)
      return true
    } else {
      console.log('❌ Failed to get user info:', data.error)
      return false
    }
  } catch (error) {
    console.error('❌ /auth/me error:', error.message)
    return false
  }
}

async function testLogin() {
  try {
    console.log('\n🔑 Testing login...')
    const response = await fetch(`${BFF_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123'
      })
    })

    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Login successful!')
      console.log('🔑 Token:', data.data.token.substring(0, 20) + '...')
      return data.data.token
    } else {
      console.log('❌ Login failed:', data.error)
      return null
    }
  } catch (error) {
    console.error('❌ Login error:', error.message)
    return null
  }
}

async function runTests() {
  console.log('🚀 Starting BFF Authentication Tests\n')
  
  // Test 1: Health check
  const healthOk = await testHealthCheck()
  if (!healthOk) {
    console.log('\n❌ Server not healthy, stopping tests')
    return
  }

  // Test 2: Registration
  const registerToken = await testRegister()
  if (!registerToken) {
    console.log('\n❌ Registration failed, stopping tests')
    return
  }

  // Test 3: Get user info with token
  const meOk = await testMe(registerToken)
  if (!meOk) {
    console.log('\n❌ /auth/me failed')
  }

  // Test 4: Login
  const loginToken = await testLogin()
  if (!loginToken) {
    console.log('\n❌ Login failed')
  }

  console.log('\n🎉 Tests completed!')
  console.log('\n📝 Next steps:')
  console.log('1. Test Google OAuth: visit http://localhost:3001/auth/google')
  console.log('2. Create API proxy routes for accounts, customers, etc.')
  console.log('3. Set up the frontend with authentication')
}

// Handle graceful exit
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled rejection:', reason)
  process.exit(1)
})

// Run tests
runTests().catch(console.error)
