import { vi } from 'vitest';

// Mock Snowflake connection
export const mockSnowflakeConnection = {
  connect: vi.fn((callback) => {
    callback(null, mockSnowflakeConnection);
  }),
  execute: vi.fn((options: any) => {
    if (options.complete) {
      options.complete(null, null, []);
    }
  }),
  destroy: vi.fn((callback) => {
    callback(null);
  }),
  isUp: vi.fn(() => true),
  getId: vi.fn(() => 'test-connection-id'),
};

// Mock Snowflake SDK
export const mockSnowflakeSDK = {
  createConnection: vi.fn(() => mockSnowflakeConnection),
  createConnector: vi.fn(),
};

vi.mock('snowflake-sdk', () => mockSnowflakeSDK);

export default mockSnowflakeConnection;
