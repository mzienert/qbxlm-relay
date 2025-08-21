# QBXML Relay Service

A QuickBooks Desktop Enterprise to ZOHO CRM integration service built with AWS CDK, Node.js, and TypeScript.

## Overview

This project creates a relay service that connects QuickBooks Desktop Enterprise (via QuickBooks Web Connector) to ZOHO CRM. The service acts as a bridge, receiving QBXML data from QuickBooks and transforming it for synchronization with ZOHO CRM.

## Architecture

- **AWS Lambda**: SOAP endpoint for QuickBooks Web Connector communication
- **API Gateway**: REST API with SOAP support
- **DynamoDB**: Session management and data mapping storage
- **AWS CDK**: Infrastructure as code deployment
- **TypeScript**: Type-safe development

## Current Status

**Phase 1 - QBWC Infrastructure Setup** ✅ **COMPLETE & DEPLOYED**
- ✅ Project planning and architecture design
- ✅ AWS CDK infrastructure setup
- ✅ QBWC authentication implementation
- ✅ QWC connection file generation
- ✅ Mock QBXML testing data
- ✅ ZOHO integration stub
- ✅ Unit tests and deployment automation
- ✅ **Successfully deployed to AWS (Development)**
  - API Endpoint: https://y8cis4na46.execute-api.us-west-1.amazonaws.com/dev/
  - Health Check: ✅ Working
  - SOAP Authentication: ✅ Working

**Phase 2 - QBXML Processing** ✅ **COMPLETE & INTEGRATED**
- ✅ QBXML type definitions and interfaces
- ✅ QBXML schema validation utilities  
- ✅ Data transformation pipelines
- ✅ Comprehensive error handling and retry logic
- ✅ Integration with existing SOAP service
- ✅ Backward compatibility with Phase 1
- ✅ All existing tests passing
- 📝 **TODO**: Add comprehensive unit tests for QBXML validator
- 📝 **TODO**: Add comprehensive unit tests for QBXML transformer

**⏭️ Skipped for Concept Proof:**
- 🔄 Support for multiple QuickBooks entity types (Items, Invoices, Vendors, etc.)
- 🔄 Entity-specific request builders for different QB operations
- 🔄 Advanced QBXML schema validation rules
- 🔄 Comprehensive error code mappings for all QB error scenarios
- 🔄 Performance optimizations and caching strategies

**Phase 3 - ZOHO CRM Integration** (Future)
- 🔄 ZOHO CRM API client
- 🔄 Data mapping and synchronization
- 🔄 Bidirectional sync capabilities

## Quick Start

### Prerequisites
- AWS CLI configured with appropriate permissions
- Node.js 20+ (Latest LTS for Lambda)
- QuickBooks Desktop Enterprise
- QuickBooks Web Connector

### Installation & Deployment

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd qbxml-relay
   npm install
   ```

2. **Bootstrap CDK (first time only):**
   ```bash
   npm run bootstrap
   # or
   ./scripts/deploy.sh --bootstrap
   ```

3. **Deploy to development:**
   ```bash
   npm run deploy:dev
   # or with full options
   ./scripts/deploy.sh -e dev -t -g
   ```

4. **Configure QuickBooks Web Connector:**
   - Import generated QWC file from `assets/qwc-configs/qbxml-relay-dev.qwc`
   - Use credentials: username=`qbuser`, password=`qbpass123`
   - Test connection in QBWC
   - **Current Development API**: https://y8cis4na46.execute-api.us-west-1.amazonaws.com/dev/qbwc

## Testing

### Run Unit Tests
```bash
npm test
npm run test:watch  # Watch mode for development
```

### Manual Testing
1. Deploy to development environment
2. Import QWC file into QuickBooks Web Connector
3. Start QuickBooks Desktop Enterprise
4. Run Web Connector to test authentication and data exchange
5. Check CloudWatch logs for debugging

### Health Check
```bash
# Current Development Environment
curl https://y8cis4na46.execute-api.us-west-1.amazonaws.com/dev/qbwc

# Expected Response:
# {"service":"QBXML Relay Service","status":"healthy","timestamp":"2025-08-20T03:51:01.399Z","environment":"dev"}
```

## Deployment

### Environment Options
- **dev**: Development environment with verbose logging
- **staging**: Pre-production testing environment  
- **prod**: Production environment with optimized settings

### Deployment Commands
```bash
# Development (recommended for testing)
./scripts/deploy.sh -e dev -t -g

# Staging
./scripts/deploy.sh -e staging -d -g

# Production (with confirmation)
./scripts/deploy.sh -e prod -d -g

# Options:
# -t, --test         Run tests before deployment
# -g, --generate-qwc Generate QWC files after deployment
# -d, --diff         Show differences before deployment
# -b, --bootstrap    Bootstrap CDK only
```

### Post-Deployment
1. Get API Gateway URL from AWS Console or CLI:
   ```bash
   aws cloudformation describe-stacks --stack-name QbxmlRelayStack-dev \
     --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' --output text
   ```

2. Import the generated QWC file into QuickBooks Web Connector

3. Configure authentication credentials in QBWC

## Project Structure

```
qbxml-relay/
├── bin/                          # CDK entry point
│   └── qbxml-relay.ts
├── constructs/                   # CDK infrastructure constructs
│   ├── dynamodb/
│   │   └── index.ts             # DynamoDB table construct
│   ├── lambda/
│   │   └── index.ts             # Lambda function construct
│   ├── qbwc-api/
│   │   └── index.ts             # API Gateway construct
│   └── layers/                  # Lambda layer constructs and source code
│       ├── services/            # Business logic services layer
│       │   ├── index.ts         # Services layer construct
│       │   ├── session-manager/
│       │   │   └── index.ts     # DynamoDB session management
│       │   └── soap-service/
│       │       └── index.ts     # SOAP service implementation
│       └── utilities/           # Shared utilities layer
│           ├── index.ts         # Utilities layer construct
│           ├── error-handler/
│           │   └── index.ts     # Error handling and retry logic
│           ├── processor/
│           │   └── index.ts     # QBXML processing pipeline
│           ├── transformer/
│           │   └── index.ts     # Data transformation utilities
│           └── validator/
│               └── index.ts     # QBXML validation utilities
├── lambda/                       # Lambda function code
│   └── qbwc-handler/
│       ├── index.ts              # Lambda entry point
│       └── types.ts              # Type definitions
├── services/                     # Legacy service files (deprecated)
├── qbxml-relay-stack.ts         # Main CDK stack
├── assets/                       # Configuration and mock data
│   ├── mock-data/                # Sample QBXML data for testing
│   ├── qbxml-relay.qwc          # Base QWC template
│   └── qwc-configs/             # Generated environment-specific QWC files
├── scripts/                      # Deployment and utility scripts
│   ├── deploy.sh                # Main deployment script
│   └── generate-qwc.js          # QWC file generator
├── test/                        # Unit and integration tests
│   ├── setup.ts                 # Jest test setup
│   └── qbwc-handler.test.ts     # Lambda handler tests
└── docs/                        # Documentation
    ├── architecture.md
    └── implementation.md
```

## Key Features

- **Serverless Architecture**: Built on AWS Lambda for automatic scaling
- **SOAP Protocol Support**: Full QBWC SOAP method implementation
- **Session Management**: Stateful session tracking with DynamoDB
- **Environment Separation**: Dev/staging/prod deployment environments
- **Comprehensive Testing**: Unit tests with mocked AWS services
- **Automated Deployment**: One-command deployment with validation
- **QWC File Generation**: Automatic configuration file creation
- **Monitoring Ready**: CloudWatch logs and metrics integration

## Troubleshooting

### Common Issues

1. **CDK Bootstrap Required**
   ```bash
   aws sts get-caller-identity  # Verify AWS credentials
   cdk bootstrap aws://ACCOUNT-NUMBER/REGION
   ```

2. **TypeScript Compilation Errors**
   ```bash
   npm run build  # Check for build errors
   npm run lint   # Check for linting issues
   ```

3. **QBWC Connection Fails**
   - Verify API Gateway URL in QWC file
   - Check CloudWatch logs for authentication errors
   - Ensure QuickBooks Desktop is running
   - Verify QBWC service is started

4. **DynamoDB Permissions**
   - CDK automatically creates IAM roles
   - Verify stack deployment completed successfully

### Logging and Monitoring

- **CloudWatch Logs**: `/aws/lambda/qbxml-relay-{environment}`
- **API Gateway Logs**: Enabled for all environments
- **DynamoDB Metrics**: Available in CloudWatch
- **Health Check Endpoint**: `GET /qbwc` returns service status

## Documentation

- [Architecture Overview](./docs/architecture.md)
- [Implementation Guide](./docs/implementation.md)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests: `npm test`
4. Deploy to dev environment for testing
5. Submit a pull request

## License

MIT License - see LICENSE file for details