import { z } from 'zod';

const envSchema = z.object({
  PORT: z
    .string()
    .default('3001')
    .transform((v) => parseInt(v, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().optional(),
  YOUTUBE_API_KEY: z.string().min(1, 'YOUTUBE_API_KEY is required'),
  SYNC_INTERVAL_MS: z
    .string()
    .default('2000')
    .transform((v) => parseInt(v, 10)),
  DRIFT_TOLERANCE_MS: z
    .string()
    .default('80')
    .transform((v) => parseInt(v, 10)),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;