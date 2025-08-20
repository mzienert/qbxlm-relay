# Architecture Overview

## System Architecture

The QBXML Relay Service is designed as a serverless AWS solution that bridges QuickBooks Desktop Enterprise and ZOHO CRM through the QuickBooks Web Connector (QBWC).

## High-Level Architecture

```
QuickBooks Desktop ←→ QBWC ←→ API Gateway ←→ Lambda ←→ ZOHO CRM
                                    ↓
                               DynamoDB
```

## Components

### AWS Infrastructure

**API Gateway**
- SOAP endpoint for QBWC communication
- Handles HTTP/HTTPS requests from QuickBooks Web Connector
- Routes requests to appropriate Lambda functions

**Lambda Functions**
- **QBWC Handler**: Implements SOAP methods required by QBWC
- **QBXML Processor**: Parses and transforms QBXML data
- **ZOHO Client**: Handles ZOHO CRM API interactions (stubbed in Phase 1)

**DynamoDB Tables**
- **Sessions**: QBWC session management and state tracking
- **Mappings**: QuickBooks ID to ZOHO CRM ID relationships
- **Sync Status**: Track synchronization status and errors

### QBWC Integration

**Required SOAP Methods**
- `authenticate(username, password)`: Validates connection credentials
- `sendRequestXML(ticket)`: Returns QBXML request to QuickBooks
- `receiveResponseXML(ticket, response)`: Processes QBXML response
- `connectionError(ticket, hresult)`: Handles connection errors
- `getLastError(ticket)`: Returns error information
- `closeConnection(ticket)`: Closes QBWC session

**QWC Configuration File**
- XML file that configures QuickBooks Web Connector
- Contains service URL, application name, and connection settings
- Must be imported into QBWC to establish connection

## Data Flow

### Phase 1 (Current Implementation)
1. QBWC calls `authenticate()` → Lambda validates and returns session ticket
2. QBWC calls `sendRequestXML()` → Lambda returns QBXML customer query
3. QuickBooks processes request and returns data via `receiveResponseXML()`
4. Lambda logs received data (ZOHO integration stubbed)
5. QBWC calls `closeConnection()` → Lambda cleans up session

### Future Phases
1. QBXML data parsing and validation
2. Transformation to ZOHO CRM format
3. ZOHO CRM API integration
4. Bidirectional synchronization
5. Error handling and retry logic

## Security Considerations

- API Gateway with authentication
- AWS Secrets Manager for credentials
- VPC endpoints for internal communication
- IAM roles with least privilege access
- Encryption at rest and in transit

## Scalability

- Serverless architecture scales automatically
- DynamoDB provides consistent performance
- CloudWatch monitoring and alerting
- Multiple deployment environments (dev/staging/prod)