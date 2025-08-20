#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { QbxmlRelayStack } from '../lib/qbxml-relay-stack';

const app = new cdk.App();

const environment = app.node.tryGetContext('environment') || 'dev';

new QbxmlRelayStack(app, `QbxmlRelayStack-${environment}`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-west-1',
  },
  environment,
});