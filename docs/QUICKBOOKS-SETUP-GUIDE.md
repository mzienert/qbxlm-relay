# QuickBooks Web Connector Setup Guide

This guide walks you through connecting your QuickBooks Desktop Enterprise to the QBXML Relay Service using the QuickBooks Web Connector (QBWC).

## Prerequisites

Before starting, ensure you have:

- ✅ QuickBooks Desktop Enterprise installed and running
- ✅ QuickBooks Web Connector installed (download from Intuit if needed)
- ✅ QBXML Relay Service deployed to AWS (development environment ready)
- ✅ Generated QWC configuration file: `assets/qwc-configs/qbxml-relay-dev.qwc`
- ✅ Network connectivity from QuickBooks machine to AWS (internet access)

## Step-by-Step Setup Process

### Step 1: Prepare the QWC Configuration File

1. **Locate the QWC file** on your development machine:
   ```bash
   ls assets/qwc-configs/qbxml-relay-dev.qwc
   ```

2. **Verify the QWC file has the correct API URL**:
   ```bash
   cat assets/qwc-configs/qbxml-relay-dev.qwc | grep AppURL
   ```
   Should show: `https://y8cis4na46.execute-api.us-west-1.amazonaws.com/dev/qbwc`

3. **Transfer the QWC file** to the QuickBooks machine:
   - Copy via USB drive, network share, or email
   - Save to a location like `C:\QBWC\qbxml-relay-dev.qwc`

### Step 2: Install and Configure QuickBooks Web Connector

1. **Download QBWC** (if not already installed):
   - Go to https://marketplace.intuit.com/
   - Search for "QuickBooks Web Connector"
   - Download and install the latest version

2. **Launch QuickBooks Web Connector**:
   - Start → All Programs → QuickBooks → Web Connector

3. **Add the Application**:
   - Click **"Add an application"** 
   - Browse to and select your `qbxml-relay-dev.qwc` file
   - Click **"Yes"** to confirm adding the application

4. **Configure Authentication**:
   - **Application**: QBXML Relay Service (Development)
   - **Username**: `qbuser`
   - **Password**: `qbpass123`
   - Click **"OK"** to save credentials

### Step 3: Connect to QuickBooks Company File

1. **Open QuickBooks Desktop Enterprise**:
   - Launch QuickBooks
   - Open your company file
   - **Important**: Keep QuickBooks open during QBWC connection

2. **Grant Application Permissions**:
   - When QBWC first connects, QuickBooks will show a dialog
   - Select **"Yes, always; allow access even if QuickBooks is not running"**
   - This allows the service to access your QuickBooks data

3. **Verify Company File Access**:
   - The application should now show as **"Enabled"** in QBWC
   - Status should show **"Ready"** or **"Waiting"**

### Step 4: Test the Connection

1. **Manual Connection Test**:
   - In QuickBooks Web Connector, select **"QBXML Relay Service (Development)"**
   - Click **"Update Selected"** to start a manual sync
   - Watch the status column for connection progress

2. **Expected Connection Flow**:
   ```
   Status: Connecting...
   Status: Connected
   Status: Requesting Data...
   Status: Processing...
   Status: Complete
   ```

3. **Verify Successful Authentication**:
   - Look for **"Last Run: [timestamp]"** in QBWC
   - Status should show **"Ready"** after successful completion

### Step 5: Monitor Logs and Troubleshooting

#### AWS CloudWatch Logs

1. **Access CloudWatch**:
   - Open AWS Console → CloudWatch → Logs
   - Navigate to log group: `/aws/lambda/qbxml-relay-dev`

2. **Monitor Real-time Logs**:
   ```bash
   # Using AWS CLI
   aws logs tail /aws/lambda/qbxml-relay-dev --follow
   ```

3. **Look for Key Log Events**:
   ```
   ✅ Health check requests: GET /qbwc
   ✅ Authentication requests: SOAP authenticate method
   ✅ Session creation: "Created session with ticket: xxx"
   ✅ QBXML requests: "Generated customer query XML"
   ✅ Data processing: "Processing QBXML response"
   ```

#### QuickBooks Web Connector Logs

1. **QBWC Log Location**:
   - Windows: `C:\ProgramData\Intuit\QuickBooks\WebConnector\log\`
   - Look for files like `QBWebConnector.log`

2. **Enable Verbose Logging**:
   - In QBWC: Properties → Enable Logging → Set to **"Verbose"**
   - Check **"Log to file"** for persistent logs

#### Common Issues and Solutions

**Issue: "Connection Failed"**
```
✅ Check internet connectivity from QuickBooks machine
✅ Verify API URL is correct in QWC file
✅ Confirm AWS service is running (test health endpoint)
✅ Check Windows firewall settings
```

**Issue: "Authentication Failed"**
```
✅ Verify credentials: username=qbuser, password=qbpass123
✅ Check CloudWatch logs for authentication errors
✅ Ensure QWC file is not corrupted
```

**Issue: "QuickBooks Access Denied"**
```
✅ Grant application permissions in QuickBooks
✅ Ensure QuickBooks is running and company file is open
✅ Check QuickBooks user has administrative privileges
```

**Issue: "Data Not Processing"**
```
✅ Verify customer data exists in QuickBooks
✅ Check CloudWatch logs for processing errors
✅ Confirm QBXML requests are being generated
```

### Step 6: Verify Data Synchronization

1. **Check QuickBooks Customer Data**:
   - Open QuickBooks → Customer Center
   - Note existing customer records for comparison

2. **Monitor QBXML Processing**:
   - CloudWatch logs will show customer data being retrieved
   - Look for: `"ZOHO Integration Stub: Would process customer data here"`

3. **Verify Session Management**:
   - Check DynamoDB table: `qbxml-relay-sessions-dev`
   - Active sessions should appear with TTL timestamps

### Step 7: Production Deployment (When Ready)

1. **Deploy to Production Environment**:
   ```bash
   ./scripts/deploy.sh -e prod -t -g
   ```

2. **Update QWC for Production**:
   - Use `qbxml-relay-prod.qwc`
   - Different scheduling (8 AM - 6 PM, weekdays only)
   - Production API endpoint

3. **Configure Production Authentication**:
   - Use secure, unique credentials for production
   - Update authentication in SOAP service

## Automation and Scheduling

### Automatic Sync Schedule

The QWC file is configured to run automatically:
- **Development**: Every 30 minutes, 6 AM - 10 PM (includes weekends)
- **Production**: Every 60 minutes, 8 AM - 6 PM (weekdays only)

### Manual Sync Options

- **On-Demand**: Click **"Update Selected"** in QBWC anytime
- **Schedule Changes**: Edit QWC file scheduling parameters as needed

## Security Considerations

1. **Network Security**:
   - HTTPS encryption for all API communication
   - AWS IAM roles with minimal permissions
   - No sensitive data stored in logs

2. **QuickBooks Security**:
   - Application permissions can be revoked anytime
   - Read-only access to QuickBooks data
   - Session-based authentication with TTL

3. **Credential Management**:
   - Change default credentials before production use
   - Consider implementing dynamic authentication
   - Rotate credentials regularly

## Next Steps

After successful connection:

1. **Phase 3 Development**: Implement ZOHO CRM integration
2. **Data Mapping**: Configure QuickBooks to ZOHO field mapping
3. **Error Handling**: Implement comprehensive error recovery
4. **Monitoring**: Set up CloudWatch alarms and notifications

## Support and Troubleshooting

### Log Analysis Commands

```bash
# View recent logs
aws logs describe-log-streams --log-group-name /aws/lambda/qbxml-relay-dev

# Search for errors
aws logs filter-log-events --log-group-name /aws/lambda/qbxml-relay-dev --filter-pattern "ERROR"

# Monitor authentication
aws logs filter-log-events --log-group-name /aws/lambda/qbxml-relay-dev --filter-pattern "authenticate"
```

### Health Check Commands

```bash
# Test API endpoint
curl https://y8cis4na46.execute-api.us-west-1.amazonaws.com/dev/qbwc

# Test SOAP authentication
curl -X POST https://y8cis4na46.execute-api.us-west-1.amazonaws.com/dev/qbwc \
  -H "Content-Type: text/xml" \
  -d @test-authenticate.xml
```

### Contact Information

For issues or questions:
- Check CloudWatch logs first
- Review QBWC logs for client-side errors
- Verify network connectivity and credentials
- Consult QuickBooks SDK documentation for QBXML specifics

---

**✅ Deployment Status**: Development environment ready for testing  
**🔗 API Endpoint**: https://y8cis4na46.execute-api.us-west-1.amazonaws.com/dev/qbwc  
**📁 QWC File**: `assets/qwc-configs/qbxml-relay-dev.qwc`  
**🔐 Credentials**: username=`qbuser`, password=`qbpass123`