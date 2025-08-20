import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { SessionManager } from './session-manager';
import { QBXMLProcessor } from './qbxml/processor';
import { QBEntityType } from './qbxml/types';

export interface SoapMethodResult {
  methodName: string;
  result: any;
}

export class SoapService {
  private xmlParser: XMLParser;
  private xmlBuilder: XMLBuilder;
  private sessionManager: SessionManager;
  private qbxmlProcessor: QBXMLProcessor;

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
    
    // Configure XML parser
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
    });

    // Configure XML builder
    this.xmlBuilder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      format: true,
      suppressEmptyNode: true,
    });

    // Initialize QBXML processor for Phase 2
    this.qbxmlProcessor = new QBXMLProcessor({
      validationEnabled: true,
      transformationEnabled: true,
      errorHandlingEnabled: true
    });
  }

  async handleSoapRequest(soapXml: string): Promise<string> {
    console.log('Processing SOAP request:', soapXml);

    try {
      // Parse SOAP envelope
      const parsed = this.xmlParser.parse(soapXml);
      const envelope = parsed['soap:Envelope'] || parsed['SOAP-ENV:Envelope'];
      
      if (!envelope) {
        throw new Error('Invalid SOAP envelope');
      }

      const body = envelope['soap:Body'] || envelope['SOAP-ENV:Body'];
      if (!body) {
        throw new Error('Missing SOAP body');
      }

      // Extract method name and parameters
      const methodResult = await this.extractAndExecuteMethod(body);
      
      // Build SOAP response
      return this.buildSoapResponse(methodResult);

    } catch (error) {
      console.error('Error processing SOAP request:', error);
      throw error;
    }
  }

  private async extractAndExecuteMethod(body: any): Promise<SoapMethodResult> {
    // Check for each possible QBWC method
    if (body.authenticate) {
      const params = body.authenticate;
      const result = await this.authenticate(
        params.strUserName || '',
        params.strPassword || ''
      );
      return { methodName: 'authenticate', result };
    }

    if (body.sendRequestXML) {
      const params = body.sendRequestXML;
      const result = await this.sendRequestXML(params.ticket || '');
      return { methodName: 'sendRequestXML', result };
    }

    if (body.receiveResponseXML) {
      const params = body.receiveResponseXML;
      const result = await this.receiveResponseXML(
        params.ticket || '',
        params.response || '',
        params.hresult || '',
        params.message || ''
      );
      return { methodName: 'receiveResponseXML', result };
    }

    if (body.connectionError) {
      const params = body.connectionError;
      const result = await this.connectionError(
        params.ticket || '',
        params.hresult || '',
        params.message || ''
      );
      return { methodName: 'connectionError', result };
    }

    if (body.getLastError) {
      const params = body.getLastError;
      const result = await this.getLastError(params.ticket || '');
      return { methodName: 'getLastError', result };
    }

    if (body.closeConnection) {
      const params = body.closeConnection;
      const result = await this.closeConnection(params.ticket || '');
      return { methodName: 'closeConnection', result };
    }

    throw new Error('Unknown SOAP method');
  }

  private async authenticate(username: string, password: string): Promise<string> {
    console.log(`Authentication request for user: ${username}`);

    // Basic validation - in production, implement proper authentication
    if (!username || !password) {
      console.log('Authentication failed: Missing credentials');
      return 'nvu'; // Invalid user
    }

    // For Phase 1, accept any non-empty credentials
    // TODO: Implement proper authentication against your user store
    if (username.length === 0 || password.length === 0) {
      console.log('Authentication failed: Empty credentials');
      return 'nvu'; // Invalid user
    }

    try {
      // Create new session
      const session = await this.sessionManager.createSession(username);
      console.log(`Authentication successful for ${username}, ticket: ${session.ticket}`);
      
      return session.ticket;
    } catch (error) {
      console.error('Authentication error:', error);
      return 'nvu'; // Invalid user
    }
  }

  private async sendRequestXML(ticket: string): Promise<string> {
    console.log(`sendRequestXML called with ticket: ${ticket}`);

    try {
      // Validate session
      const session = await this.sessionManager.getSession(ticket);
      if (!session) {
        console.log('Invalid session ticket');
        return ''; // Empty string means done
      }

      // Update session activity
      await this.sessionManager.updateSessionActivity(ticket);

      // For Phase 1, return a simple customer query
      // This is the QBXML request that will be sent to QuickBooks
      const qbxmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<QBXML>
  <QBXMLMsgsRq onError="stopOnError">
    <CustomerQueryRq requestID="1">
      <MaxReturned>100</MaxReturned>
    </CustomerQueryRq>
  </QBXMLMsgsRq>
</QBXML>`;

      console.log('Sending QBXML request:', qbxmlRequest);
      return qbxmlRequest;

    } catch (error) {
      console.error('Error in sendRequestXML:', error);
      return ''; // Empty string means done
    }
  }

  private async receiveResponseXML(
    ticket: string,
    response: string,
    hresult: string,
    message: string
  ): Promise<number> {
    console.log(`receiveResponseXML called with ticket: ${ticket}`);
    console.log('QBXML Response received:', response);
    console.log('HResult:', hresult);
    console.log('Message:', message);

    try {
      // Validate session
      const session = await this.sessionManager.getSession(ticket);
      if (!session) {
        console.log('Invalid session ticket');
        return -1; // Error
      }

      // Update session activity
      await this.sessionManager.updateSessionActivity(ticket);

      // Parse the response if successful
      if (hresult === '0' || hresult === '') {
        // Success - process the QBXML response using Phase 2 processor
        console.log('Processing successful QBXML response with Phase 2 processor');
        
        try {
          // Use the new QBXML processor to validate and transform the response
          const processingResult = await this.qbxmlProcessor.processQBXMLResponse(
            response,
            QBEntityType.CUSTOMER, // Assuming customer data for this example
            {
              validateSchema: true,
              transformData: true,
              handleErrors: true
            }
          );

          if (processingResult.success) {
            console.log(`Successfully processed ${processingResult.metadata.recordCount} records`);
            console.log('Processing time:', processingResult.metadata.processingTimeMs, 'ms');
            
            // Log the structured data
            if (processingResult.data && processingResult.data.length > 0) {
              console.log('Transformed customer data:', JSON.stringify(processingResult.data[0], null, 2));
            }

            // Log any warnings
            if (processingResult.warnings.length > 0) {
              console.log('Processing warnings:', processingResult.warnings);
            }

            // Phase 3 preparation: This is where ZOHO integration will happen
            console.log('ZOHO Integration Stub: Ready to send', processingResult.data.length, 'customer records to ZOHO CRM');

          } else {
            console.error('QBXML processing failed:', processingResult.errors);
          }

        } catch (processingError) {
          console.error('Error in Phase 2 QBXML processing:', processingError);
          
          // Fallback to original parsing for backwards compatibility
          try {
            const parsedResponse = this.xmlParser.parse(response);
            console.log('Fallback: Basic QBXML parsing completed');
            console.log('ZOHO Integration Stub: Would process customer data here (fallback mode)');
          } catch (parseError) {
            console.error('Error in fallback parsing:', parseError);
          }
        }
      } else {
        // Error occurred in QuickBooks
        console.error(`QuickBooks error - HResult: ${hresult}, Message: ${message}`);
      }

      // Return percentage complete (100% means done)
      return 100;

    } catch (error) {
      console.error('Error in receiveResponseXML:', error);
      return -1; // Error
    }
  }

  private async connectionError(
    ticket: string,
    hresult: string,
    message: string
  ): Promise<string> {
    console.log(`connectionError called with ticket: ${ticket}`);
    console.log(`Error - HResult: ${hresult}, Message: ${message}`);

    try {
      // Log the error and clean up session
      if (ticket) {
        await this.sessionManager.closeSession(ticket);
      }

      // Return done status
      return 'done';

    } catch (error) {
      console.error('Error in connectionError:', error);
      return 'done';
    }
  }

  private async getLastError(ticket: string): Promise<string> {
    console.log(`getLastError called with ticket: ${ticket}`);

    try {
      // For Phase 1, return empty string (no errors)
      // TODO: Implement proper error tracking in session
      return '';

    } catch (error) {
      console.error('Error in getLastError:', error);
      return 'Internal server error';
    }
  }

  private async closeConnection(ticket: string): Promise<string> {
    console.log(`closeConnection called with ticket: ${ticket}`);

    try {
      if (ticket) {
        await this.sessionManager.closeSession(ticket);
        console.log(`Session ${ticket} closed successfully`);
      }

      return 'OK';

    } catch (error) {
      console.error('Error in closeConnection:', error);
      return 'OK'; // Always return OK to close cleanly
    }
  }

  private buildSoapResponse(methodResult: SoapMethodResult): string {
    const { methodName, result } = methodResult;

    // Build SOAP response based on method
    let responseBody: any = {};

    switch (methodName) {
      case 'authenticate':
        responseBody = {
          authenticateResponse: {
            authenticateResult: result
          }
        };
        break;

      case 'sendRequestXML':
        responseBody = {
          sendRequestXMLResponse: {
            sendRequestXMLResult: result
          }
        };
        break;

      case 'receiveResponseXML':
        responseBody = {
          receiveResponseXMLResponse: {
            receiveResponseXMLResult: result
          }
        };
        break;

      case 'connectionError':
        responseBody = {
          connectionErrorResponse: {
            connectionErrorResult: result
          }
        };
        break;

      case 'getLastError':
        responseBody = {
          getLastErrorResponse: {
            getLastErrorResult: result
          }
        };
        break;

      case 'closeConnection':
        responseBody = {
          closeConnectionResponse: {
            closeConnectionResult: result
          }
        };
        break;

      default:
        throw new Error(`Unknown method: ${methodName}`);
    }

    // Build complete SOAP envelope
    const soapEnvelope = {
      'soap:Envelope': {
        '@_xmlns:soap': 'http://schemas.xmlsoap.org/soap/envelope/',
        'soap:Body': responseBody
      }
    };

    const responseXml = this.xmlBuilder.build(soapEnvelope);
    console.log('SOAP Response:', responseXml);

    return responseXml;
  }

  public createSoapFault(faultCode: string, faultString: string, detail?: string): string {
    const soapFault = {
      'soap:Envelope': {
        '@_xmlns:soap': 'http://schemas.xmlsoap.org/soap/envelope/',
        'soap:Body': {
          'soap:Fault': {
            faultcode: faultCode,
            faultstring: faultString,
            ...(detail && { detail })
          }
        }
      }
    };

    return this.xmlBuilder.build(soapFault);
  }
}