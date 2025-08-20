# Cost Analysis

This document provides an analysis of AWS costs for the QBXML Relay Service across different environments and usage patterns.

## Important Context
- **New AWS Account**: Full free tier benefits available for first 12 months
- **Staging Usage**: Minimal usage after initial setup (testing only)
- **Production Usage**: Expected maximum 5,000 requests/month
- **Environment Strategy**: Considering removal of dev environment

## AWS Free Tier Benefits (First 12 Months)

### Lambda Free Tier
- **Requests**: 1 million requests/month
- **Compute Time**: 400,000 GB-seconds/month
- **Coverage**: Covers ALL expected usage for staging + production

### API Gateway Free Tier
- **Requests**: 1 million requests/month for first 12 months
- **Coverage**: 200x more than expected production usage (5,000 requests/month)

### DynamoDB Free Tier
- **Read Requests**: 25 WCU (Write Capacity Units)
- **Write Requests**: 25 RCU (Read Capacity Units)
- **Storage**: 25 GB/month
- **Coverage**: Far exceeds session data requirements

### CloudWatch Free Tier
- **Log Ingestion**: 5 GB/month
- **Log Storage**: 5 GB/month
- **Metrics**: 10 custom metrics
- **Coverage**: Sufficient for expected log volume

## Realistic Cost Analysis with Free Tier

### Year 1 (With Free Tier) - Expected Costs: **~$0-5/month**

#### Production Environment (5,000 requests/month max)
- **Lambda**: $0.00 (within free tier - only ~5,000 requests vs 1M limit)
- **API Gateway**: $0.00 (within free tier - 5,000 requests vs 1M limit)
- **DynamoDB**: $0.00 (within free tier - minimal session storage)
- **CloudWatch**: $0.00 (within free tier - expected <1GB logs/month)
- **Data Transfer**: $0.01 - $0.50 (small XML responses, mostly within free tier)

#### Staging Environment (minimal usage)
- **All Services**: $0.00 (within free tier - used only for testing)

#### Development Environment (if kept)
- **All Services**: $0.00 (within free tier)

### **Total Year 1 Cost: $0.01 - $5.00/month maximum**

## Year 2+ (After Free Tier Expires) - Realistic Usage

### Production Environment (5,000 requests/month)
- **Lambda**: $0.50 - $2.00/month
  - 5,000 requests = $0.01
  - Compute time ~500 GB-seconds = $0.83
- **API Gateway**: $0.02/month
  - 5,000 requests = $0.0175
- **DynamoDB**: $0.13 - $0.50/month
  - ~100 MB session storage = $0.025
  - ~15,000 read/write requests = $0.375
- **CloudWatch**: $0.25 - $1.00/month
  - ~500MB logs/month = $0.75
- **Data Transfer**: $0.05 - $0.20/month
  - Minimal outbound traffic for SOAP responses

### **Total Production (Year 2+): $0.95 - $3.70/month**

### Staging Environment (testing only)
- **All Services**: $0.10 - $1.00/month
  - Minimal usage for periodic testing

### **Total Staging + Production (Year 2+): $1.05 - $4.70/month**

## Cost Optimization Opportunities

### 🔴 High Impact (Free Tier Context)

#### 1. Environment Consolidation (RECOMMENDED)
- **Current**: Dev + Staging + Production
- **Proposed**: Staging + Production only
- **Savings Year 1**: $0.00/month (all within free tier anyway)
- **Savings Year 2+**: ~$0.10 - $1.00/month (minimal but reduces complexity)
- **Rationale**: Development can use local testing with unit tests, free tier covers both environments

#### 2. ✅ DynamoDB PITR Removed (COMPLETED)
- **Previous**: Point-in-Time Recovery was enabled for production
- **Action**: Disabled PITR for all environments
- **Savings Year 1**: $0.00/month (within free tier anyway)
- **Savings Year 2+**: ~$0.20 - $2.00/month (small but meaningful)
- **Rationale**: Session data is ephemeral with 24-hour TTL - PITR was unnecessary cost

### 🟡 Medium Impact (Low Priority Given Free Tier)

#### 3. Lambda Right-Sizing
- **Current**: 256 MB memory allocation
- **Impact Year 1**: $0.00 (within free tier)
- **Impact Year 2+**: Potential 10-30% savings (~$0.15-$0.60/month)
- **Action**: Low priority given minimal costs

#### 4. CloudWatch Log Retention
- **Current**: 14 days (dev), 1 month (prod)
- **Impact Year 1**: $0.00 (within free tier)
- **Impact Year 2+**: Minimal savings (~$0.10-$0.30/month)
- **Action**: Current settings appropriate

### 🟢 Low Priority (Not Worth Optimizing)

#### 5. API Gateway Caching
- **Impact**: Negligible for 5,000 requests/month
- **Recommendation**: Skip - adds complexity for minimal benefit

#### 6. Reserved Capacity
- **DynamoDB**: Not beneficial for low usage patterns
- **Lambda**: Not applicable for this usage level
- **Recommendation**: Stay with on-demand/pay-per-use

## Realistic Usage Pattern Analysis

### Expected Production Usage (5,000 requests/month max)
- **QBWC Polling**: Every 60 minutes during business hours
- **Business Hours**: 8 AM - 6 PM, weekdays (10 hours × 5 days = 50 hours/week)
- **Requests per sync**: 3-5 SOAP calls (authenticate, sendRequest, receiveResponse, closeConnection)
- **Weekly Requests**: ~120-200 requests
- **Monthly Requests**: ~500-800 requests
- **Peak Capacity**: System designed for up to 5,000 requests/month

### Free Tier Coverage Analysis
| Usage Level | Monthly Requests | Year 1 Cost | Year 2+ Cost |
|-------------|------------------|-------------|--------------|
| Light       | 500             | $0.00       | $0.50        |
| Normal      | 800             | $0.00       | $0.75        |
| Heavy       | 2,000           | $0.00       | $1.50        |
| **Max**     | **5,000**       | **$0.00**   | **$3.70**    |

### Free Tier vs Actual Usage
- **Lambda**: 5,000 requests vs 1M free tier = **0.5% of limit**
- **API Gateway**: 5,000 requests vs 1M free tier = **0.5% of limit** 
- **DynamoDB**: ~100MB storage vs 25GB free tier = **0.4% of limit**
- **CloudWatch**: ~500MB logs vs 5GB free tier = **10% of limit**

## Cost Monitoring Recommendations (Free Tier Context)

### 1. AWS Billing Alerts (Conservative)
- **First Alert**: $5.00 (free tier overrun detection)
- **Second Alert**: $15.00 (unexpected usage spike)
- **Monthly Reviews**: Quarterly should be sufficient given low costs

### 2. Free Tier Usage Monitoring
- **AWS Free Tier Dashboard**: Monitor monthly free tier usage
- **Key Metrics to Watch**:
  - Lambda invocations (stay well under 1M/month)
  - API Gateway requests (stay well under 1M/month)
  - DynamoDB storage (should remain under 1GB)
  - CloudWatch logs (keep under 2GB/month)

### 3. Simple Resource Tagging
```yaml
Environment: staging | prod  # (removing dev)
Project: qbxml-relay
CostCenter: operations
```

### 4. Quarterly Cost Reviews (Low Frequency)
- **Year 1**: Monitor free tier usage quarterly
- **Year 2+**: Monthly cost reviews (but costs will be <$5/month)

## Cost Summary by Phase (Revised with Free Tier)

### Phase 1 (Current - Development Complete)
- **Year 1**: $0.00/month (all within free tier)
- **Year 2+**: $1.05 - $4.70/month (staging + production)
- **Focus**: Infrastructure validation and testing ✅ Complete

### Phase 2 (QBXML Processing)
- **Year 1**: $0.00/month (all within free tier)
- **Year 2+**: $1.05 - $4.70/month (no increase expected)
- **Focus**: QBXML parsing and transformation
- **Note**: Processing logic doesn't significantly impact AWS costs

### Phase 3 (ZOHO Integration)
- **Year 1**: $0.00/month (all within free tier)
- **Year 2+**: $1.05 - $4.70/month (no increase expected)
- **Focus**: Full customer data synchronization
- **Note**: ZOHO API calls are external costs (not AWS)

## Revised Budget Recommendations

### Extremely Conservative Budget
- **Year 1 Monthly**: $5.00 (safety buffer for free tier overrun)
- **Year 1 Annual**: $60.00
- **Year 2+ Monthly**: $10.00 (2x actual expected costs)
- **Year 2+ Annual**: $120.00

### Realistic Budget (Recommended)
- **Year 1**: $0.00 - assume free tier covers everything
- **Year 2+**: $5.00/month maximum
- **Annual Year 2+**: $60.00
- **Monitor**: Set $5 billing alert as early warning

## Action Items (Revised for Free Tier Context)

### 1. **Immediate** (Phase 2 Start):
   - ✅ **COMPLETED**: DynamoDB PITR disabled
   - ✅ **COMPLETED**: Cost analysis updated for free tier
   - 🔄 **RECOMMENDED**: Remove dev environment (complexity reduction)
   - 🔄 **RECOMMENDED**: Set up $5 billing alert

### 2. **Short Term** (3-6 months):
   - Monitor free tier usage quarterly
   - Set up AWS Free Tier Dashboard monitoring
   - Plan for Year 2 transition (minimal impact)

### 3. **Long Term** (12+ months):
   - Review costs after free tier expires (expect <$5/month)
   - Consider if any optimizations are worth the effort (probably not)
   - Monitor for any unexpected usage spikes

## Key Insights

### 💡 Major Cost Realization
- **Previous Estimate**: $21-$270/month production costs
- **Actual with Free Tier**: $0-$4/month production costs
- **Difference**: 95%+ cost reduction due to low usage + free tier

### 💡 Optimization Priority
- **Year 1**: Focus on functionality over cost optimization (free tier covers everything)
- **Year 2+**: Costs so low that optimization time isn't worth the effort
- **Exception**: Remove dev environment for simplicity, not cost savings

## Notes

- Costs based on AWS pricing as of August 2025 (us-west-1 region)
- New AWS account with full 12-month free tier benefits
- Usage capped at 5,000 requests/month maximum
- ZOHO CRM API costs not included (external service)
- Free tier provides 200x capacity vs expected usage