import { NextFunction, Request, Response } from 'express'
import crypto from 'crypto'
import { prisma } from '../services/database.cloud-sql-only'

function hashRequest(req: Request): string {
  const payload = JSON.stringify({ path: req.originalUrl, method: req.method, body: req.body })
  return crypto.createHash('sha256').update(payload).digest('hex')
}

export async function requireIdempotency(req: Request, res: Response, next: NextFunction) {
  const key = req.header('Idempotency-Key') || req.header('idempotency-key')
  const organizationId = (req as any).auth?.organizationId || (req as any).user?.organizationId

  if (!key) {
    return res.status(400).json({ success: false, error: 'Idempotency-Key header required' })
  }
  if (!organizationId) {
    return res.status(400).json({ success: false, error: 'Organization context required' })
  }

  const endpoint = req.path
  const requestHash = hashRequest(req)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  try {
    // Try to create a new idempotency record. If it exists, unique constraint will fire.
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
    // If unique constraint violation, fetch existing record
    try {
      const existing = await prisma.idempotency_keys.findUnique({
        where: {
          idempotency_keys_org_endpoint_key_unique: {
            organization_id: organizationId,
            endpoint,
            idempotency_key: key
          }
        }
      })
      if (!existing) {
        return res.status(409).json({ success: false, error: 'Duplicate request' })
      }
      if (existing.status === 'completed' && existing.response_data) {
        return res.json(existing.response_data as any)
      }
      return res.status(409).json({ success: false, error: 'Request already in progress' })
    } catch {
      return res.status(409).json({ success: false, error: 'Duplicate request' })
    }
  }
}


