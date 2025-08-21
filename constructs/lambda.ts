import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export interface LambdaConstructProps {
  environment: string;
  sessionsTable: dynamodb.Table;
  logGroup: logs.LogGroup;
}

export class LambdaConstruct extends Construct {
  public readonly qbwcHandler: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: LambdaConstructProps) {
    super(scope, id);

    const { environment, sessionsTable, logGroup } = props;

    // Lambda function for QBWC handling
    this.qbwcHandler = new nodejs.NodejsFunction(this, 'QbwcHandler', {
      functionName: `qbxml-relay-qbwc-handler-${environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(process.cwd(), 'src/lambda/qbwc-handler/index.ts'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        DYNAMODB_TABLE_NAME: sessionsTable.tableName,
        LOG_LEVEL: environment === 'prod' ? 'INFO' : 'DEBUG',
        ENVIRONMENT: environment,
      },
      logGroup,
      bundling: {
        externalModules: [
          '@aws-sdk/client-dynamodb',
          '@aws-sdk/lib-dynamodb',
        ],
        minify: environment === 'prod',
        sourceMap: environment !== 'prod',
      },
    });

    // Grant DynamoDB permissions to Lambda
    sessionsTable.grantReadWriteData(this.qbwcHandler);

    // Add additional IAM permissions for Lambda
    this.qbwcHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: [`${logGroup.logGroupArn}:*`],
      })
    );

    // Tags
    cdk.Tags.of(this).add('Component', 'Lambda');
  }
}