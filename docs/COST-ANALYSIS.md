# Cost Analysis

This document provides an analysis of AWS costs for the QBXML Relay Service across different environments and usage patterns.

## Current Infrastructure Costs

### Development Environment (Current Deployment)

#### AWS Lambda
- **Function**: `qbxml-relay-qbwc-handler-dev`
- **Memory**: 256 MB
- **Timeout**: 30 seconds
- **Estimated Monthly Cost**: $0.20 - $5.00
  - **Requests**: 1M requests = $0.20
  - **Compute Time**: 100,000 GB-seconds = $1.67
  - **Note**: QBWC typically polls every 30 minutes during business hours

#### API Gateway
- **Type**: REST API (Regional)
- **Estimated Monthly Cost**: $0.35 - $10.00
  - **Requests**: 1M requests = $3.50
  - **Data Transfer**: Minimal for SOAP requests
  - **Expected Usage**: ~2,000-5,000 requests/month for typical QBWC usage

#### DynamoDB
- **Table**: `qbxml-relay-sessions-dev`
- **Billing Mode**: On-Demand
- **Features**: 
  - TTL enabled (no additional cost)
  - Point-in-Time Recovery: ✅ **DISABLED** (unnecessary for ephemeral data)
- **Estimated Monthly Cost**: $0.75 - $5.00
  - **Read/Write Requests**: ~10,000 requests = $2.50
  - **Storage**: Session data ~10MB = $0.003
  - **Note**: Significant cost reduction by removing PITR for temporary session data

#### CloudWatch Logs
- **Log Group**: `/aws/lambda/qbxml-relay-dev`
- **Retention**: 14 days (dev), 1 year (prod)
- **Estimated Monthly Cost**: $0.50 - $5.00
  - **Ingestion**: $0.50/GB
  - **Storage**: $0.03/GB/month
  - **Expected Usage**: ~1-5GB/month depending on log level

#### Data Transfer
- **Regional**: Free within same region
- **Internet**: $0.09/GB for outbound traffic
- **Estimated Monthly Cost**: $0.10 - $2.00
  - **SOAP responses**: Typically small XML payloads

### **Total Development Environment Cost: $1.70 - $22.00/month**

## Production Environment Projections

### Staging Environment
- **Lambda**: $1.00 - $10.00/month
- **API Gateway**: $1.75 - $15.00/month  
- **DynamoDB**: $1.50 - $10.00/month (PITR disabled)
- **CloudWatch**: $1.00 - $8.00/month
- **Data Transfer**: $0.25 - $5.00/month
- **Total Staging**: $5.50 - $48.00/month

### Production Environment
- **Lambda**: $5.00 - $50.00/month
- **API Gateway**: $7.00 - $100.00/month
- **DynamoDB**: $5.00 - $75.00/month (PITR disabled)
- **CloudWatch**: $3.00 - $25.00/month
- **Data Transfer**: $1.00 - $20.00/month
- **Total Production**: $21.00 - $270.00/month

## Cost Optimization Opportunities

### 🔴 High Impact

#### 1. Environment Consolidation
- **Current**: Dev + Staging + Production
- **Proposed**: Staging + Production only
- **Savings**: ~$2.40 - $37.00/month (remove dev environment)
- **Rationale**: Development can use local testing with unit tests

#### 2. ✅ DynamoDB PITR Removed (COMPLETED)
- **Previous**: Point-in-Time Recovery was enabled for production
- **Action**: Disabled PITR for all environments
- **Savings Realized**: ~$0.70 - $15.00/month per environment
- **Rationale**: Session data is ephemeral with 24-hour TTL - PITR was unnecessary cost

### 🟡 Medium Impact

#### 3. Lambda Right-Sizing
- **Current**: 256 MB memory allocation
- **Optimization**: Monitor CloudWatch metrics and right-size
- **Potential Savings**: 10-30% of Lambda compute costs
- **Action**: Review after 1 month of production usage

#### 4. CloudWatch Log Retention
- **Current**: 14 days (dev), 1 year (prod)
- **Optimization**: Adjust retention based on operational needs
- **Potential Savings**: 20-50% of CloudWatch storage costs

#### 5. API Gateway Caching
- **Current**: No caching enabled
- **Opportunity**: Cache health check responses
- **Potential Savings**: Minimal for QBWC use case (limited cacheable requests)

### 🟢 Low Impact

#### 6. Reserved Capacity (Future)
- **When**: After establishing baseline usage patterns
- **DynamoDB**: Switch to provisioned capacity if usage is predictable
- **Lambda**: Consider reserved concurrency if needed

## Usage Pattern Analysis

### QuickBooks Web Connector Typical Usage
- **Frequency**: Every 30-60 minutes during business hours
- **Business Hours**: 8 AM - 6 PM, weekdays (10 hours × 5 days = 50 hours/week)
- **Requests per sync**: 3-5 SOAP calls (authenticate, sendRequest, receiveResponse, closeConnection)
- **Weekly Requests**: ~200-400 requests
- **Monthly Requests**: ~800-1,600 requests

### Scalability Projections
| Customers | Monthly Requests | Monthly Cost (Est.) |
|-----------|------------------|-------------------|
| 1         | 1,600           | $26 - $50         |
| 10        | 16,000          | $35 - $75         |
| 50        | 80,000          | $65 - $150        |
| 100       | 160,000         | $95 - $250        |

## Cost Monitoring Recommendations

### 1. AWS Cost Explorer Setup
- **Billing Alerts**: Set up at $50, $100, $200 thresholds
- **Cost Categories**: Tag resources by environment and component
- **Monthly Reviews**: Track costs against projections

### 2. CloudWatch Dashboards
- **Lambda**: Duration, memory utilization, error rates
- **API Gateway**: Request count, latency, error rates  
- **DynamoDB**: Read/write capacity utilization, throttling

### 3. Cost Allocation Tags
```yaml
Environment: dev | staging | prod
Component: lambda | api-gateway | dynamodb | logs
Project: qbxml-relay
Owner: qbxml-relay-team
```

## Cost Summary by Phase

### Phase 1 (Current)
- **Development**: $2.40 - $37.00/month
- **Focus**: Infrastructure validation and testing
- **Optimization**: Remove dev environment after Phase 2

### Phase 2 (QBXML Processing)
- **Staging + Production**: $32.50 - $458.00/month
- **Focus**: QBXML parsing and transformation
- **Optimization**: Right-size Lambda memory after usage patterns established

### Phase 3 (ZOHO Integration)
- **Production Scale**: $50.00 - $800.00/month
- **Focus**: Full customer data synchronization
- **Optimization**: Consider reserved capacity based on established patterns

## Budget Recommendations

### Initial Budget (Phase 1-2)
- **Monthly Budget**: $100.00
- **Annual Budget**: $1,200.00
- **Buffer**: 50% for unexpected usage spikes

### Production Budget (Phase 3+)
- **Monthly Budget**: $300.00 - $1,000.00 (depending on customer count)
- **Annual Budget**: $3,600.00 - $12,000.00
- **Review Frequency**: Monthly cost reviews and quarterly optimization

## Action Items

1. **Immediate** (Phase 2 Start):
   - ✅ Document current dev environment costs (baseline)
   - 🔄 Plan dev environment removal
   - 🔄 Disable DynamoDB PITR for session tables

2. **Short Term** (1-3 months):
   - Monitor Lambda memory utilization
   - Set up cost alerts and dashboards
   - Implement cost allocation tagging

3. **Long Term** (6+ months):
   - Evaluate reserved capacity options
   - Consider architecture optimizations based on usage patterns
   - Plan for multi-customer scaling costs

## Notes

- Costs are estimated based on AWS pricing as of August 2025 (us-west-1 region)
- Actual costs will vary based on usage patterns and data volume
- ZOHO CRM API costs not included (external service)
- Prices exclude AWS support plan costs
- Free tier benefits not calculated (may reduce initial costs)