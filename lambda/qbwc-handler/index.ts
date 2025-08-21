import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SoapService } from '../../constructs/layers/services/soap-service';
import { SessionManager } from '../../constructs/layers/services/session-manager';

const sessionManager = new SessionManager();
const soapService = new SoapService(sessionManager);

function generateWSDL(event: APIGatewayProxyEvent): string {
  const baseUrl = `https://${event.headers.Host}${event.requestContext.path}`;
  
  return `<?xml version="1.0" encoding="utf-8"?>
<definitions xmlns="http://schemas.xmlsoap.org/wsdl/" 
             xmlns:tns="http://developer.intuit.com/" 
             xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/" 
             xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
             targetNamespace="http://developer.intuit.com/" 
             name="QBWebConnectorService">

  <types>
    <xsd:schema targetNamespace="http://developer.intuit.com/">
      <xsd:element name="authenticate">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="strUserName" type="xsd:string"/>
            <xsd:element name="strPassword" type="xsd:string"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="authenticateResponse">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="authenticateResult" type="xsd:string"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="sendRequestXML">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="ticket" type="xsd:string"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="sendRequestXMLResponse">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="sendRequestXMLResult" type="xsd:string"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="receiveResponseXML">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="ticket" type="xsd:string"/>
            <xsd:element name="response" type="xsd:string"/>
            <xsd:element name="hresult" type="xsd:string"/>
            <xsd:element name="message" type="xsd:string"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="receiveResponseXMLResponse">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="receiveResponseXMLResult" type="xsd:int"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="connectionError">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="ticket" type="xsd:string"/>
            <xsd:element name="hresult" type="xsd:string"/>
            <xsd:element name="message" type="xsd:string"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="connectionErrorResponse">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="connectionErrorResult" type="xsd:string"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="getLastError">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="ticket" type="xsd:string"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="getLastErrorResponse">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="getLastErrorResult" type="xsd:string"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="closeConnection">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="ticket" type="xsd:string"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="closeConnectionResponse">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="closeConnectionResult" type="xsd:string"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
    </xsd:schema>
  </types>

  <message name="authenticateRequest">
    <part name="parameters" element="tns:authenticate"/>
  </message>
  <message name="authenticateResponse">
    <part name="parameters" element="tns:authenticateResponse"/>
  </message>
  <message name="sendRequestXMLRequest">
    <part name="parameters" element="tns:sendRequestXML"/>
  </message>
  <message name="sendRequestXMLResponse">
    <part name="parameters" element="tns:sendRequestXMLResponse"/>
  </message>
  <message name="receiveResponseXMLRequest">
    <part name="parameters" element="tns:receiveResponseXML"/>
  </message>
  <message name="receiveResponseXMLResponse">
    <part name="parameters" element="tns:receiveResponseXMLResponse"/>
  </message>
  <message name="connectionErrorRequest">
    <part name="parameters" element="tns:connectionError"/>
  </message>
  <message name="connectionErrorResponse">
    <part name="parameters" element="tns:connectionErrorResponse"/>
  </message>
  <message name="getLastErrorRequest">
    <part name="parameters" element="tns:getLastError"/>
  </message>
  <message name="getLastErrorResponse">
    <part name="parameters" element="tns:getLastErrorResponse"/>
  </message>
  <message name="closeConnectionRequest">
    <part name="parameters" element="tns:closeConnection"/>
  </message>
  <message name="closeConnectionResponse">
    <part name="parameters" element="tns:closeConnectionResponse"/>
  </message>

  <portType name="QBWebConnectorSvcSoap">
    <operation name="authenticate">
      <input message="tns:authenticateRequest"/>
      <output message="tns:authenticateResponse"/>
    </operation>
    <operation name="sendRequestXML">
      <input message="tns:sendRequestXMLRequest"/>
      <output message="tns:sendRequestXMLResponse"/>
    </operation>
    <operation name="receiveResponseXML">
      <input message="tns:receiveResponseXMLRequest"/>
      <output message="tns:receiveResponseXMLResponse"/>
    </operation>
    <operation name="connectionError">
      <input message="tns:connectionErrorRequest"/>
      <output message="tns:connectionErrorResponse"/>
    </operation>
    <operation name="getLastError">
      <input message="tns:getLastErrorRequest"/>
      <output message="tns:getLastErrorResponse"/>
    </operation>
    <operation name="closeConnection">
      <input message="tns:closeConnectionRequest"/>
      <output message="tns:closeConnectionResponse"/>
    </operation>
  </portType>

  <binding name="QBWebConnectorSvcSoap" type="tns:QBWebConnectorSvcSoap">
    <soap:binding transport="http://schemas.xmlsoap.org/soap/http"/>
    <operation name="authenticate">
      <soap:operation soapAction="http://developer.intuit.com/authenticate" style="document"/>
      <input>
        <soap:body use="literal"/>
      </input>
      <output>
        <soap:body use="literal"/>
      </output>
    </operation>
    <operation name="sendRequestXML">
      <soap:operation soapAction="http://developer.intuit.com/sendRequestXML" style="document"/>
      <input>
        <soap:body use="literal"/>
      </input>
      <output>
        <soap:body use="literal"/>
      </output>
    </operation>
    <operation name="receiveResponseXML">
      <soap:operation soapAction="http://developer.intuit.com/receiveResponseXML" style="document"/>
      <input>
        <soap:body use="literal"/>
      </input>
      <output>
        <soap:body use="literal"/>
      </output>
    </operation>
    <operation name="connectionError">
      <soap:operation soapAction="http://developer.intuit.com/connectionError" style="document"/>
      <input>
        <soap:body use="literal"/>
      </input>
      <output>
        <soap:body use="literal"/>
      </output>
    </operation>
    <operation name="getLastError">
      <soap:operation soapAction="http://developer.intuit.com/getLastError" style="document"/>
      <input>
        <soap:body use="literal"/>
      </input>
      <output>
        <soap:body use="literal"/>
      </output>
    </operation>
    <operation name="closeConnection">
      <soap:operation soapAction="http://developer.intuit.com/closeConnection" style="document"/>
      <input>
        <soap:body use="literal"/>
      </input>
      <output>
        <soap:body use="literal"/>
      </output>
    </operation>
  </binding>

  <service name="QBWebConnectorSvc">
    <documentation>QuickBooks Web Connector Service</documentation>
    <port name="QBWebConnectorSvcSoap" binding="tns:QBWebConnectorSvcSoap">
      <soap:address location="${baseUrl}"/>
    </port>
    <AppSupport>
      <AppDisplayName>QBXML Relay Service (Development)</AppDisplayName>
      <AppDescription>QuickBooks Desktop Enterprise to ZOHO CRM integration relay service (Development Environment). Synchronizes customer data between QuickBooks and ZOHO CRM.</AppDescription>
      <AppUniqueName>qbxml-relay-dev</AppUniqueName>
      <AppVersion>1.0.0</AppVersion>
      <Owner>QBXML Relay Team</Owner>
      <qbType>QBFS</qbType>
      <AuthFlags>0x0</AuthFlags>
      <Notify>0</Notify>
      <PersonalDataPref>pdpOptional</PersonalDataPref>
      <UnattendedModePref>umpOptional</UnattendedModePref>
      <IsReadOnly>0</IsReadOnly>
    </AppSupport>
  </service>
</definitions>`;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  try {
    // Handle GET requests
    if (event.httpMethod === 'GET') {
      // Return WSDL if requested
      if (event.queryStringParameters?.wsdl !== undefined) {
        const wsdl = generateWSDL(event);
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
          },
          body: wsdl,
        };
      }
      
      // Default health check
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