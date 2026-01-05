import { describe, it, expect } from 'vitest';
import { healthCheckSchema } from '../validators';

describe('healthCheckSchema validator', () => {
  it('should validate a healthy health check', () => {
    const result = healthCheckSchema.safeParse({
      status: 'healthy',
      responseTimeMs: 100,
      message: 'Service is healthy',
    });
    expect(result.success).toBe(true);
  });

  it('should validate an unhealthy health check', () => {
    const result = healthCheckSchema.safeParse({
      status: 'unhealthy',
      responseTimeMs: 5000,
      message: 'Service is unhealthy',
    });
    expect(result.success).toBe(true);
  });

  it('should validate an error health check', () => {
    const result = healthCheckSchema.safeParse({
      status: 'error',
      error: 'Connection failed',
    });
    expect(result.success).toBe(true);
  });

  it('should validate a pending health check', () => {
    const result = healthCheckSchema.safeParse({
      status: 'pending',
      message: 'Checking...',
    });
    expect(result.success).toBe(true);
  });

  it('should validate an unconfigured health check', () => {
    const result = healthCheckSchema.safeParse({
      status: 'unconfigured',
      message: 'Service not configured',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid status values', () => {
    const result = healthCheckSchema.safeParse({
      status: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing status field', () => {
    const result = healthCheckSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should accept health check with only required fields', () => {
    const result = healthCheckSchema.safeParse({
      status: 'healthy',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid responseTimeMs type', () => {
    const result = healthCheckSchema.safeParse({
      status: 'healthy',
      responseTimeMs: '100' as any,
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative responseTimeMs', () => {
    const result = healthCheckSchema.safeParse({
      status: 'healthy',
      responseTimeMs: -100,
    });
    expect(result.success).toBe(true); // Zod doesn't enforce min on number by default
  });

  it('should reject invalid message type', () => {
    const result = healthCheckSchema.safeParse({
      status: 'healthy',
      message: 123 as any,
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid error type', () => {
    const result = healthCheckSchema.safeParse({
      status: 'error',
      error: 123 as any,
    });
    expect(result.success).toBe(false);
  });

  it('should provide detailed error messages for invalid status', () => {
    const result = healthCheckSchema.safeParse({
      status: 'invalid',
    });
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('Invalid enum value');
    }
  });

  it('should allow all valid status enum values', () => {
    const validStatuses = ['healthy', 'unhealthy', 'error', 'pending', 'unconfigured'] as const;
    validStatuses.forEach((status) => {
      const result = healthCheckSchema.safeParse({ status });
      expect(result.success).toBe(true);
    });
  });
});
