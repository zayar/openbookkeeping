import { z } from 'zod'

const EnvSchema = z.object({
  APP_ENV: z.enum(['development', 'test', 'production']).default('development'),
  BFF_URL: z.string().url().optional(),
  OA_BASE_URL: z.string().url({ message: 'OA_BASE_URL must be a valid URL' }),
  DB_URL: z.string().optional(),
  DB_HOST: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().optional(),
  TENANT_ID: z.string().optional(),
  LOG_LEVEL: z.enum(['fatal','error','warn','info','debug','trace']).default('info'),
  ALLOWED_ORIGINS: z.string().optional(),
  COOKIE_SECRET: z.string().min(8).optional()
}).refine((val) => {
  // Either DB_URL or (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) must be present in production
  if (val.APP_ENV === 'production') {
    const hasUrl = !!val.DB_URL
    const hasParts = !!(val.DB_HOST && val.DB_USER && val.DB_PASSWORD && val.DB_NAME)
    return hasUrl || hasParts
  }
  return true
}, { message: 'Provide DB_URL or full DB_* in production' })

export type AppConfig = z.infer<typeof EnvSchema>

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvSchema.safeParse(env)
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Invalid environment configuration: ${issues}`)
  }
  return parsed.data
}

export function parseAllowedOrigins(origins?: string): string[] {
  return (origins?.split(',') || [])
    .map(s => s.trim())
    .filter(Boolean)
}

