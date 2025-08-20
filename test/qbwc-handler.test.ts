/**
 * Unit tests for QBWC handler
 */

import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../lambda/qbwc-handler/index';

// Mock the dependencies
jest.mock('../lambda/qbwc-handler/session-manager');
jest.mock('../lambda/qbwc-handler/soap-service');

describe('QBWC Handler', () => {
  const mockEvent: APIGatewayProxyEvent = {
    httpMethod: 'GET',
    path: '/qbwc',
    pathParameters: null,
    queryStringParameters: null,
    headers: {
      'Content-Type': 'application/json',
    },
    multiValueHeaders: {},
    body: null,
    isBase64Encoded: false,
    requestContext: {
      accountId: 'test-account',
      apiId: 'test-api',
      protocol: 'HTTP/1.1',
      httpMethod: 'GET',
      path: '/qbwc',
      stage: 'test',
      requestId: 'test-request-id',
      requestTime: '01/Jan/2024:00:00:00 +0000',
      requestTimeEpoch: 1704067200,
      resourceId: 'test-resource',
      resourcePath: '/qbwc',
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '127.0.0.1',
        user: null,
        userAgent: 'test-user-agent',
        userArn: null,
      },
      authorizer: null,
    },
    resource: '/qbwc',
    stageVariables: null,
    multiValueQueryStringParameters: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET requests (health check)', () => {
    it('should return health check response', async () => {
      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      expect(result.headers?.['Content-Type']).toBe('application/json');
      
      const body = JSON.parse(result.body);
      expect(body.service).toBe('QBXML Relay Service');
      expect(body.status).toBe('healthy');
      expect(body.environment).toBe('test');
    });
  });

  describe('POST requests (SOAP)', () => {
    const soapEvent: APIGatewayProxyEvent = {
      ...mockEvent,
      httpMethod: 'POST',
      headers: {
        'Content-Type': 'text/xml',
      },
      body: `<?xml version="1.0"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <authenticate>
              <strUserName>testuser</strUserName>
              <strPassword>testpass</strPassword>
            </authenticate>
          </soap:Body>
        </soap:Envelope>`,
    };

    it('should handle SOAP requests with valid content type', async () => {
      const result = await handler(soapEvent);

      expect(result.statusCode).toBe(200);
      expect(result.headers?.['Content-Type']).toBe('text/xml; charset=utf-8');
      expect(result.headers?.['SOAPAction']).toBe('');
    });

    it('should reject invalid content types', async () => {
      const invalidEvent = {
        ...soapEvent,
        headers: { 'Content-Type': 'application/json' },
      };

      const result = await handler(invalidEvent);

      expect(result.statusCode).toBe(400);
      expect(result.body).toContain('Invalid content type');
    });
  });

  describe('Error handling', () => {
    it('should return method not allowed for unsupported methods', async () => {
      const putEvent = { ...mockEvent, httpMethod: 'PUT' };
      
      const result = await handler(putEvent);

      expect(result.statusCode).toBe(405);
      expect(result.body).toBe('Method Not Allowed');
    });
  });
});