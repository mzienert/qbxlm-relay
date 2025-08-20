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

**Phase 1 - QBWC Infrastructure Setup** (In Progress)
- ✅ Project planning and architecture design
- 🔄 AWS CDK infrastructure setup
- 🔄 QBWC authentication implementation
- 🔄 QWC connection file generation
- 🔄 Mock QBXML testing data
- 🔄 ZOHO integration stub

## Quick Start

1. Clone the repository
2. Install dependencies: `npm install`
3. Deploy infrastructure: `npm run deploy`
4. Configure QuickBooks Web Connector with generated `.qwc` file

## Documentation

- [Architecture Overview](./docs/architecture.md)
- [Implementation Guide](./docs/implementation.md)

## Requirements

- AWS CLI configured
- Node.js 20+ (Latest LTS for Lambda)
- QuickBooks Desktop Enterprise
- QuickBooks Web Connector