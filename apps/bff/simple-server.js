const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'local-jwt-secret-key';

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Registration endpoint
app.post('/auth/register', async (req, res) => {
  try {
    console.log('Registration request:', req.body);
    const { email, password, name, organizationName } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
      }
    });

    // Create account for credentials
    await prisma.account.create({
      data: {
        userId: user.id,
        type: 'credentials',
        provider: 'credentials',
        providerAccountId: user.id,
        refresh_token: hashedPassword, // Store password hash here
      }
    });

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name: organizationName,
        slug: organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        oaOrganizationId: `oa-${Date.now()}`, // Temporary OA ID
      }
    });

    // Add user as owner of organization
    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: 'owner'
      }
    });

    // Generate JWT token
    const token = jwt.sign({
      userId: user.id,
      email: user.email,
      name: user.name,
      organizationId: organization.id
    }, JWT_SECRET, { expiresIn: '24h' });

    console.log('Registration successful for:', email);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug
        },
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

// Login endpoint
app.post('/auth/login', async (req, res) => {
  try {
    console.log('Login request:', req.body.email);
    const { email, password } = req.body;

    // Find user with account
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        accounts: {
          where: { provider: 'credentials' }
        },
        organizationMembers: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!user || !user.accounts[0]) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.accounts[0].refresh_token);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign({
      userId: user.id,
      email: user.email,
      name: user.name,
      organizationId: user.organizationMembers[0]?.organizationId
    }, JWT_SECRET, { expiresIn: '24h' });

    console.log('Login successful for:', email);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        organizations: user.organizationMembers.map(member => ({
          id: member.organization.id,
          name: member.organization.name,
          slug: member.organization.slug,
          role: member.role
        })),
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Simple BFF Server running on port ${PORT}`);
});
