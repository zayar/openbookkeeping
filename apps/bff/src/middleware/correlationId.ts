import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'

export function correlationId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.get('X-Request-ID') || req.get('x-request-id')
  const id = incoming || uuidv4()
  ;(req as any).requestId = id
  res.setHeader('X-Request-ID', id)
  next()
}

