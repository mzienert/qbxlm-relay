#!/usr/bin/env node

/**
 * Generate QWC (QuickBooks Web Connector) configuration files
 * This script creates environment-specific QWC files with the correct API Gateway URLs
 */

const fs = require('fs');
const path = require('path');

// Configuration for different environments
const environments = {
  dev: {
    name: 'Development',
    appUniqueName: 'qbxml-relay-dev',
    appId: '{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}',
    fileId: '{B2C3D4E5-F6A7-8901-BCDE-F23456789012}',
    runEveryNMinutes: 30, // More frequent for development
    beginTime: '06:00:00',
    endTime: '22:00:00',
  },
  staging: {
    name: 'Staging',
    appUniqueName: 'qbxml-relay-staging',
    appId: '{C2D3E4F5-G6H7-8901-CDEF-234567890123}',
    fileId: '{D3E4F5G6-H7I8-9012-DEFG-345678901234}',
    runEveryNMinutes: 60,
    beginTime: '07:00:00',
    endTime: '19:00:00',
  },
  prod: {
    name: 'Production',
    appUniqueName: 'qbxml-relay-prod',
    appId: '{E4F5G6H7-I8J9-0123-GHIJ-456789012345}',
    fileId: '{F5G6H7I8-J9K0-1234-HIJK-567890123456}',
    runEveryNMinutes: 60,
    beginTime: '08:00:00',
    endTime: '18:00:00',
  },
};

function generateQwcContent(environment, apiUrl) {
  const config = environments[environment];
  
  return `<?xml version="1.0"?>
<QBWCXML>
  <AppName>QBXML Relay Service (${config.name})</AppName>
  <AppID>${config.appId}</AppID>
  <AppURL>${apiUrl}</AppURL>
  <AppDescription>QuickBooks Desktop Enterprise to ZOHO CRM integration relay service (${config.name} Environment). Synchronizes customer data between QuickBooks and ZOHO CRM.</AppDescription>
  <AppDisplayName>QBXML Relay - ${config.name}</AppDisplayName>
  <AppUniqueName>${config.appUniqueName}</AppUniqueName>
  <AppVersion>1.0.0</AppVersion>
  <Owner>QBXML Relay Team</Owner>
  <FileID>${config.fileId}</FileID>
  <QBType>QBFS</QBType>
  <Style>Document</Style>
  <UsingEvents>0</UsingEvents>
  <PersonalDataPref>pdpOptional</PersonalDataPref>
  <UnattendedModePref>umpOptional</UnattendedModePref>
  <AuthFlags>0x0</AuthFlags>
  <Notify>0</Notify>
  <IsReadOnly>0</IsReadOnly>
  <UpdatePolicy>automatic</UpdatePolicy>
  <RunEveryNMinutes>${config.runEveryNMinutes}</RunEveryNMinutes>
  <Scheduler>
    <RunEveryNMinutes>${config.runEveryNMinutes}</RunEveryNMinutes>
    <RunEveryNSeconds>0</RunEveryNSeconds>
    <RunEveryNHours>0</RunEveryNHours>
    <RunEveryNDays>0</RunEveryNDays>
    <RunEveryNWeeks>0</RunEveryNWeeks>
    <RunEveryNMonths>0</RunEveryNMonths>
    <BeginTime>${config.beginTime}</BeginTime>
    <EndTime>${config.endTime}</EndTime>
    <MonTue>true</MonTue>
    <TueWed>true</TueWed>
    <WedThu>true</WedThu>
    <ThuFri>true</ThuFri>
    <FriSat>${environment === 'dev' ? 'true' : 'false'}</FriSat>
    <SatSun>false</SatSun>
    <SunMon>false</SunMon>
  </Scheduler>
</QBWCXML>`;
}

function generateQwcFiles() {
  console.log('Generating QWC configuration files...');
  
  const outputDir = path.join(__dirname, '../assets/qwc-configs');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate files for each environment
  Object.keys(environments).forEach(env => {
    // Default URL pattern - will be updated after deployment
    const defaultUrl = `https://your-api-gateway-url.execute-api.us-west-1.amazonaws.com/${env}/qbwc`;
    
    const qwcContent = generateQwcContent(env, defaultUrl);
    const filename = `qbxml-relay-${env}.qwc`;
    const filepath = path.join(outputDir, filename);
    
    fs.writeFileSync(filepath, qwcContent);
    console.log(`✅ Generated: ${filename}`);
  });

  // Generate a template file with instructions
  const instructions = `# QWC Configuration Files

These files are generated for different deployment environments.

## Usage:

1. Deploy your CDK stack to get the API Gateway URL
2. Update the AppURL in the appropriate .qwc file
3. Import the .qwc file into QuickBooks Web Connector

## Files:

- **qbxml-relay-dev.qwc**: Development environment (runs every 30 minutes, 6 AM - 10 PM, includes weekends)
- **qbxml-relay-staging.qwc**: Staging environment (runs every 60 minutes, 7 AM - 7 PM, weekdays only)
- **qbxml-relay-prod.qwc**: Production environment (runs every 60 minutes, 8 AM - 6 PM, weekdays only)

## After Deployment:

Run the following command to get your API Gateway URL:
\`\`\`bash
aws cloudformation describe-stacks --stack-name QbxmlRelayStack-{environment} --query 'Stacks[0].Outputs[?OutputKey==\`ApiEndpoint\`].OutputValue' --output text
\`\`\`

## Manual URL Update:

Replace "your-api-gateway-url" in the AppURL with your actual API Gateway URL:
\`\`\`
<AppURL>https://abc123def4.execute-api.us-west-1.amazonaws.com/dev/qbwc</AppURL>
\`\`\`
`;

  fs.writeFileSync(path.join(outputDir, 'README.md'), instructions);
  console.log('✅ Generated: README.md with instructions');
  
  console.log('\n🎉 QWC configuration files generated successfully!');
  console.log(`📁 Files location: ${outputDir}`);
  console.log('\n📋 Next steps:');
  console.log('1. Deploy your CDK stack: npm run deploy');
  console.log('2. Get the API Gateway URL from CloudFormation outputs');
  console.log('3. Update the AppURL in the appropriate .qwc file');
  console.log('4. Import the .qwc file into QuickBooks Web Connector');
}

// Run the script
if (require.main === module) {
  try {
    generateQwcFiles();
  } catch (error) {
    console.error('❌ Error generating QWC files:', error.message);
    process.exit(1);
  }
}

module.exports = { generateQwcFiles, generateQwcContent };