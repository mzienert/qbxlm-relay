import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SoapService } from '/opt/nodejs/soap-service';
import { SessionManager } from '/opt/nodejs/session-manager';

const sessionManager = new SessionManager();
const soapService = new SoapService(sessionManager);

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  try {
    // Handle GET requests (health check)
    if (event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service: 'QBXML Relay Service',
          status: 'healthy',
          timestamp: new Date().toISOString(),
          environment: process.env.ENVIRONMENT || 'unknown',
        }),
      };
    }

    // Handle POST requests (SOAP)
    if (event.httpMethod === 'POST') {
      const contentType = event.headers['Content-Type'] || event.headers['content-type'] || '';
      
      // Validate content type for SOAP
      if (!contentType.includes('text/xml') && !contentType.includes('application/soap+xml')) {
        console.warn('Invalid content type for SOAP request:', contentType);
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'text/plain',
          },
          body: 'Invalid content type. Expected text/xml or application/soap+xml',
        };
      }

      // Parse and handle SOAP request
      const soapResponse = await soapService.handleSoapRequest(event.body || '');
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': '',
        },
        body: soapResponse,
      };
    }

    // Method not allowed
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'text/plain',
      },
      body: 'Method Not Allowed',
    };

  } catch (error) {
    console.error('Error processing request:', error);
    
    // Return SOAP fault for POST requests, JSON error for others
    if (event.httpMethod === 'POST') {
      const soapFault = soapService.createSoapFault(
        'Server',
        'Internal server error occurred',
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
        },
        body: soapFault,
      };
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
    };
  }
};