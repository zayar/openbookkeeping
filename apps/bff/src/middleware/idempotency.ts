import { NextFunction, Request, Response } from 'express'
import crypto from 'crypto'
import { prisma } from '../services/database.cloud-sql-only'

function hashRequest(req: Request): string {
  const payload = JSON.stringify({ path: req.originalUrl, method: req.method, body: req.body })
  return crypto.createHash('sha256').update(payload).digest('hex')
}

export async function requireIdempotency(req: Request, res: Response, next: NextFunction) {
  let key = req.header('Idempotency-Key') || req.header('idempotency-key')
  const organizationId = (req as any).auth?.organizationId || (req as any).user?.organizationId

  // If missing, auto-generate for developer convenience (still cached per request body)
  if (!key) {
    key = crypto.randomUUID()
    res.setHeader('Idempotency-Key', key)
  }
  if (!organizationId) {
    return res.status(400).json({ success: false, error: 'Organization context required' })
  }

  const endpoint = req.path
  const requestHash = hashRequest(req)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  try {
    // Check if idempotency key already exists
    const existing = await prisma.idempotency_keys.findUnique({
      where: {
        idempotency_keys_org_endpoint_key_unique: {
          organization_id: organizationId,
          endpoint,
          idempotency_key: key
        }
      }
    })

    if (existing) {
      // Check if request body matches
      if (existing.request_hash !== requestHash) {
        return res.status(400).json({ 
          success: false, 
          error: 'Idempotency key used with different request body' 
        })
      }
      
      // Return cached response if completed
      if (existing.status === 'completed' && existing.response_data) {
        return res.json(existing.response_data as any)
      }
      
      // Request is still processing
      if (existing.status === 'processing') {
        return res.status(409).json({ 
          success: false, 
          error: 'Request already in progress' 
        })
      }
    }

    // Create new idempotency record
    await prisma.idempotency_keys.create({
      data: {
        id: crypto.randomUUID(),
        organization_id: organizationId,
        endpoint,
        idempotency_key: key,
        request_hash: requestHash,
        expires_at: expiresAt,
        status: 'processing'
      }
    })

    // Hook res.json to capture response
    const originalJson = res.json.bind(res)
    res.json = (body: any) => {
      prisma.idempotency_keys.update({
        where: {
          idempotency_keys_org_endpoint_key_unique: {
            organization_id: organizationId,
            endpoint,
            idempotency_key: key
          }
        },
        data: {
          response_data: body,
          status: 'completed'
        }
      }).catch(() => void 0)
      return originalJson(body)
    }

    return next()
  } catch (err: any) {
    console.error('Idempotency middleware error:', err)
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error during idempotency check' 
    })
  }
}


