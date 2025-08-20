import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { QbwcApiConstruct } from './constructs/qbwc-api';

export interface QbxmlRelayStackProps extends cdk.StackProps {
  environment: string;
}

export class QbxmlRelayStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: QbxmlRelayStackProps) {
    super(scope, id, props);

    const { environment } = props;

    // DynamoDB table for QBWC session management
    const sessionsTable = new dynamodb.Table(this, 'QbwcSessionsTable', {
      tableName: `qbxml-relay-sessions-${environment}`,
      partitionKey: {
        name: 'ticket',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      // pointInTimeRecovery disabled - unnecessary for ephemeral session data with 24h TTL
      pointInTimeRecovery: false,
    });

    // CloudWatch Log Group for Lambda functions
    const logGroup = new logs.LogGroup(this, 'QbxmlRelayLogGroup', {
      logGroupName: `/aws/lambda/qbxml-relay-${environment}`,
      retention: environment === 'prod' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // QBWC API Gateway + Lambda construct
    const qbwcApi = new QbwcApiConstruct(this, 'QbwcApi', {
      environment,
      sessionsTable,
      logGroup,
    });

    // Stack outputs
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: qbwcApi.api.url,
      description: 'QBWC API Gateway endpoint URL',
      exportName: `qbxml-relay-api-endpoint-${environment}`,
    });

    new cdk.CfnOutput(this, 'SessionsTableName', {
      value: sessionsTable.tableName,
      description: 'DynamoDB sessions table name',
      exportName: `qbxml-relay-sessions-table-${environment}`,
    });

    new cdk.CfnOutput(this, 'LogGroupName', {
      value: logGroup.logGroupName,
      description: 'CloudWatch log group name',
      exportName: `qbxml-relay-log-group-${environment}`,
    });

    // Tags for resource management
    cdk.Tags.of(this).add('Project', 'qbxml-relay');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }
}