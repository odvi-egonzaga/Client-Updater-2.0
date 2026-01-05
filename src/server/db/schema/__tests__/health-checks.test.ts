import { describe, it, expect } from 'vitest';
import { healthCheckTests, type HealthCheckTest } from '../health-checks';

describe('healthCheckTests schema', () => {
  it('should have healthCheckTests table defined', () => {
    expect(healthCheckTests).toBeDefined();
  });

  it('should export HealthCheckTest type', () => {
    const healthCheckTest: HealthCheckTest = {
      id: 'test-uuid',
      testKey: 'test-key',
      testValue: 'test-value',
      createdAt: new Date(),
    };
    expect(healthCheckTest).toBeDefined();
    expect(healthCheckTest.testKey).toBe('test-key');
  });

  it('should allow HealthCheckTest with null testValue', () => {
    const healthCheckTest: HealthCheckTest = {
      id: 'test-uuid',
      testKey: 'test-key',
      testValue: null,
      createdAt: new Date(),
    };
    expect(healthCheckTest).toBeDefined();
    expect(healthCheckTest.testKey).toBe('test-key');
    expect(healthCheckTest.testValue).toBeNull();
  });
});
