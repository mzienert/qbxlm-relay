/**
 * Jest test setup file
 * Runs before each test file
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DYNAMODB_TABLE_NAME = 'qbxml-relay-sessions-test';
process.env.LOG_LEVEL = 'ERROR'; // Reduce log noise in tests
process.env.ENVIRONMENT = 'test';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

// Set longer timeout for integration tests
jest.setTimeout(30000);