import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface DynamoDbConstructProps {
  environment: string;
}

export class DynamoDbConstruct extends Construct {
  public readonly sessionsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DynamoDbConstructProps) {
    super(scope, id);

    const { environment } = props;

    // DynamoDB table for QBWC session management
    this.sessionsTable = new dynamodb.Table(this, 'QbwcSessionsTable', {
      tableName: `qbxml-relay-sessions-${environment}`,
      partitionKey: {
        name: 'ticket',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: false,
    });

    // Tags
    cdk.Tags.of(this).add('Component', 'DynamoDB');
  }
}