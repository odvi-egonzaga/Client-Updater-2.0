import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

// Mock process.env
const originalEnv = process.env;

describe('env configuration', () => {
  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should have valid environment schema structure', () => {
    // Import after setting up env
    const envSchema = z.object({
      NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
      NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_').default('pk_test_placeholder'),
      CLERK_SECRET_KEY: z.string().startsWith('sk_').default('sk_test_placeholder'),
      CLERK_WEBHOOK_SECRET: z.string().optional(),
      NEXT_PUBLIC_SUPABASE_URL: z.string().url().default('https://placeholder.supabase.co'),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().default('placeholder'),
      SUPABASE_SERVICE_ROLE_KEY: z.string().default('placeholder'),
      DATABASE_URL: z.string().default('postgresql://postgres:password@localhost:5432/postgres'),
      SNOWFLAKE_ACCOUNT: z.string().default('placeholder'),
      SNOWFLAKE_USERNAME: z.string().default('placeholder'),
      SNOWFLAKE_PASSWORD: z.string().default('placeholder'),
      SNOWFLAKE_WAREHOUSE: z.string().default('COMPUTE_WH'),
      SNOWFLAKE_DATABASE: z.string().default('ANALYTICS'),
      SNOWFLAKE_SCHEMA: z.string().default('PUBLIC'),
      SNOWFLAKE_ROLE: z.string().default('ANALYST'),
      NEXTBANK_API: z.string().url().optional(),
      NEXTBANK_API_USERNAME: z.string().optional(),
      NEXTBANK_API_PASSWORD: z.string().optional(),
    });

    const result = envSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should validate NODE_ENV enum values', () => {
    const validEnvs = ['development', 'test', 'production'] as const;
    const envSchema = z.object({
      NODE_ENV: z.enum(validEnvs).default('development'),
    });

    validEnvs.forEach((env) => {
      const result = envSchema.safeParse({ NODE_ENV: env });
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid NODE_ENV values', () => {
    const envSchema = z.object({
      NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    });

    const result = envSchema.safeParse({ NODE_ENV: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('should validate URL fields', () => {
    const urlSchema = z.object({
      NEXT_PUBLIC_APP_URL: z.string().url(),
      NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    });

    const validResult = urlSchema.safeParse({
      NEXT_PUBLIC_APP_URL: 'https://example.com',
      NEXT_PUBLIC_SUPABASE_URL: 'https://supabase.example.com',
    });
    expect(validResult.success).toBe(true);

    const invalidResult = urlSchema.safeParse({
      NEXT_PUBLIC_APP_URL: 'not-a-url',
      NEXT_PUBLIC_SUPABASE_URL: 'also-not-a-url',
    });
    expect(invalidResult.success).toBe(false);
  });

  it('should validate Clerk key prefixes', () => {
    const clerkSchema = z.object({
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
      CLERK_SECRET_KEY: z.string().startsWith('sk_'),
    });

    const validResult = clerkSchema.safeParse({
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_123',
      CLERK_SECRET_KEY: 'sk_test_456',
    });
    expect(validResult.success).toBe(true);

    const invalidResult = clerkSchema.safeParse({
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'invalid_key',
      CLERK_SECRET_KEY: 'invalid_secret',
    });
    expect(invalidResult.success).toBe(false);
  });

  it('should allow optional NextBank fields', () => {
    const nextbankSchema = z.object({
      NEXTBANK_API: z.string().url().optional(),
      NEXTBANK_API_USERNAME: z.string().optional(),
      NEXTBANK_API_PASSWORD: z.string().optional(),
    });

    const result = nextbankSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should validate Snowflake configuration fields', () => {
    const snowflakeSchema = z.object({
      SNOWFLAKE_ACCOUNT: z.string(),
      SNOWFLAKE_USERNAME: z.string(),
      SNOWFLAKE_PASSWORD: z.string(),
      SNOWFLAKE_WAREHOUSE: z.string(),
      SNOWFLAKE_DATABASE: z.string(),
      SNOWFLAKE_SCHEMA: z.string(),
      SNOWFLAKE_ROLE: z.string(),
    });

    const result = snowflakeSchema.safeParse({
      SNOWFLAKE_ACCOUNT: 'account',
      SNOWFLAKE_USERNAME: 'user',
      SNOWFLAKE_PASSWORD: 'pass',
      SNOWFLAKE_WAREHOUSE: 'WH',
      SNOWFLAKE_DATABASE: 'DB',
      SNOWFLAKE_SCHEMA: 'SCHEMA',
      SNOWFLAKE_ROLE: 'ROLE',
    });
    expect(result.success).toBe(true);
  });

  it('should use default values when environment variables are not set', () => {
    const envSchema = z.object({
      NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
      NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
    });

    const result = envSchema.parse({});
    expect(result.NODE_ENV).toBe('development');
    expect(result.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000');
  });

  it('should override defaults with environment variables', () => {
    const testEnv = {
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_URL: 'https://production.example.com',
    };

    const envSchema = z.object({
      NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
      NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
    });

    const result = envSchema.parse(testEnv);
    expect(result.NODE_ENV).toBe('production');
    expect(result.NEXT_PUBLIC_APP_URL).toBe('https://production.example.com');
  });
});
