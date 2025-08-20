# Implementation Guide

## Phase 1: QBWC Infrastructure Setup

This phase focuses on establishing the basic infrastructure to connect with QuickBooks Web Connector.

## Project Structure

```
qbxlm-relay/
├── lib/
│   ├── qbxml-relay-stack.ts          # Main CDK stack
│   └── constructs/
│       └── qbwc-api.ts               # API Gateway + Lambda construct
├── lambda/
│   └── qbwc-handler/
│       ├── index.ts                  # Lambda entry point
│       ├── soap-service.ts           # SOAP service implementation
│       └── session-manager.ts       # Session management
├── assets/
│   ├── qbxml-relay.qwc              # QuickBooks Web Connector config
│   └── mock-data/
│       └── customer-response.xml     # Mock QBXML customer data
├── test/
│   ├── qbwc-handler.test.ts         # Unit tests
│   └── integration/
│       └── qbwc-integration.test.ts  # Integration tests
└── docs/
    ├── architecture.md
    └── implementation.md
```

## Implementation Steps

### 1. CDK Infrastructure Setup

**CDK Stack (`lib/qbxml-relay-stack.ts`)**
- API Gateway with SOAP support
- Lambda function for QBWC handling
- DynamoDB table for session management
- IAM roles and permissions

**API Gateway Configuration**
- REST API with proxy integration
- CORS configuration for SOAP requests
- Custom domain (optional)

### 2. Lambda Function Implementation

**QBWC Handler (`lambda/qbwc-handler/index.ts`)**
```typescript
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // Parse SOAP request
  // Route to appropriate SOAP method
  // Return SOAP response
}
```

**SOAP Service Methods**
- `authenticate()`: Basic username/password validation
- `sendRequestXML()`: Return customer query QBXML
- `receiveResponseXML()`: Log received data, stub ZOHO integration
- `connectionError()`, `getLastError()`, `closeConnection()`: Error handling

### 3. Session Management

**DynamoDB Schema**
```typescript
interface QBWCSession {
  ticket: string;           // Primary key
  username: string;
  status: 'active' | 'closed';
  createdAt: string;
  lastActivity: string;
  requestsSent: number;
  ttl: number;             // Auto-cleanup
}
```

### 4. QBXML Mock Data

**Customer Query Request**
```xml
<?xml version="1.0" encoding="utf-8"?>
<QBXML>
  <QBXMLMsgsRq onError="stopOnError">
    <CustomerQueryRq requestID="1">
      <MaxReturned>100</MaxReturned>
    </CustomerQueryRq>
  </QBXMLMsgsRq>
</QBXML>
```

**Customer Response (Mock)**
```xml
<?xml version="1.0" encoding="utf-8"?>
<QBXML>
  <QBXMLMsgsRs>
    <CustomerQueryRs requestID="1" statusCode="0" statusSeverity="Info">
      <CustomerRet>
        <ListID>80000001-1234567890</ListID>
        <Name>Sample Customer</Name>
        <FullName>Sample Customer</FullName>
        <CompanyName>Sample Company</CompanyName>
        <Email>customer@example.com</Email>
        <Phone>555-123-4567</Phone>
      </CustomerRet>
    </CustomerQueryRs>
  </QBXMLMsgsRs>
</QBXML>
```

### 5. QWC Configuration File

**qbxml-relay.qwc**
```xml
<?xml version="1.0"?>
<QBWCXML>
  <AppName>QBXML Relay Service</AppName>
  <AppID>{GENERATED-GUID}</AppID>
  <AppURL>https://your-api-gateway-url.amazonaws.com/prod/qbwc</AppURL>
  <AppDescription>QuickBooks to ZOHO CRM integration relay service</AppDescription>
  <AppUniqueName>qbxml-relay-{environment}</AppUniqueName>
  <QBType>QBFS</QBType>
  <Style>Document</Style>
  <Scheduler>
    <RunEveryNMinutes>60</RunEveryNMinutes>
  </Scheduler>
</QBWCXML>
```

### 6. Testing Strategy

**Unit Tests**
- SOAP method implementations
- Session management logic
- QBXML parsing utilities

**Integration Tests**
- End-to-end QBWC communication
- DynamoDB operations
- Mock QBXML processing

**Manual Testing**
- Deploy to AWS
- Import QWC file into QuickBooks Web Connector
- Test authentication and data exchange

## ZOHO Integration Stub

For Phase 1, ZOHO integration is stubbed with console logging:

```typescript
export class ZohoClientStub {
  async processCustomerData(qbxmlData: string): Promise<void> {
    console.log('ZOHO Stub: Received customer data:', qbxmlData);
    // TODO: Implement actual ZOHO CRM integration
  }
}
```

## Deployment

```bash
# Install dependencies
npm install

# Build and deploy
npm run build
npm run deploy

# Generate QWC file with deployed endpoint
npm run generate-qwc
```

## Environment Variables

- `DYNAMODB_TABLE_NAME`: Session management table
- `LOG_LEVEL`: Logging verbosity
- `ENVIRONMENT`: Deployment environment (dev/staging/prod)

## Next Phases

1. **Phase 2**: QBXML parsing and validation
2. **Phase 3**: ZOHO CRM API integration
3. **Phase 4**: Bidirectional synchronization
4. **Phase 5**: Production hardening and monitoring