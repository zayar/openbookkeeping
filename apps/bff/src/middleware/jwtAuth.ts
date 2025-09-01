import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthContext {
  userId: string
  organizationId: string
  email?: string
  name?: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext
    }
  }
}

export function requireJwtAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.get('Authorization') || ''
    const tokenFromHeader = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : undefined
    const tokenFromCookie = (req as any).cookies?.auth_token as string | undefined
    const token = tokenFromHeader || tokenFromCookie

    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized: missing token' })
    }

    const secret = process.env.JWT_SECRET || 'local-jwt-secret-key-change-in-production'
    const payload = jwt.verify(token, secret) as any
    if (!payload || !payload.userId || !payload.organizationId) {
      return res.status(401).json({ success: false, error: 'Unauthorized: invalid token' })
    }

    req.auth = {
      userId: String(payload.userId),
      organizationId: String(payload.organizationId),
      email: payload.email,
      name: payload.name,
    }
    next()
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }
}


