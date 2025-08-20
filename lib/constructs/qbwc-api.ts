import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export interface QbwcApiConstructProps {
  environment: string;
  sessionsTable: dynamodb.Table;
  logGroup: logs.LogGroup;
}

export class QbwcApiConstruct extends Construct {
  public readonly api: apigateway.RestApi;
  public readonly lambdaFunction: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: QbwcApiConstructProps) {
    super(scope, id);

    const { environment, sessionsTable, logGroup } = props;

    // Lambda function for QBWC handling
    this.lambdaFunction = new nodejs.NodejsFunction(this, 'QbwcHandler', {
      functionName: `qbxml-relay-qbwc-handler-${environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../lambda/qbwc-handler/index.ts'),
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
    sessionsTable.grantReadWriteData(this.lambdaFunction);

    // Add additional IAM permissions for Lambda
    this.lambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: [`${logGroup.logGroupArn}:*`],
      })
    );

    // API Gateway for SOAP endpoint
    this.api = new apigateway.RestApi(this, 'QbwcRestApi', {
      restApiName: `qbxml-relay-api-${environment}`,
      description: `QBXML Relay QBWC API - ${environment}`,
      deployOptions: {
        stageName: environment,
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: environment !== 'prod',
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'SOAPAction',
        ],
      },
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL],
      },
    });

    // QBWC resource and method
    const qbwcResource = this.api.root.addResource('qbwc');
    
    // Lambda integration with proxy
    const lambdaIntegration = new apigateway.LambdaIntegration(this.lambdaFunction, {
      requestTemplates: {
        'application/json': JSON.stringify({
          body: '$input.body',
          headers: {
            '#foreach($header in $input.params().header.keySet())',
            '"$header": "$util.escapeJavaScript($input.params().header.get($header))"',
            '#if($foreach.hasNext),#end',
            '#end'
          },
          method: '$context.httpMethod',
          path: '$context.resourcePath',
          queryStringParameters: {
            '#foreach($param in $input.params().querystring.keySet())',
            '"$param": "$util.escapeJavaScript($input.params().querystring.get($param))"',
            '#if($foreach.hasNext),#end',
            '#end'
          },
        }),
        'text/xml': JSON.stringify({
          body: '$input.body',
          headers: {
            '#foreach($header in $input.params().header.keySet())',
            '"$header": "$util.escapeJavaScript($input.params().header.get($header))"',
            '#if($foreach.hasNext),#end',
            '#end'
          },
          method: '$context.httpMethod',
          path: '$context.resourcePath',
          queryStringParameters: {
            '#foreach($param in $input.params().querystring.keySet())',
            '"$param": "$util.escapeJavaScript($input.params().querystring.get($param))"',
            '#if($foreach.hasNext),#end',
            '#end'
          },
        }),
      },
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': 'integration.response.header.Content-Type',
          },
        },
        {
          statusCode: '400',
          selectionPattern: '4\\d{2}',
        },
        {
          statusCode: '500',
          selectionPattern: '5\\d{2}',
        },
      ],
    });

    // POST method for SOAP requests
    qbwcResource.addMethod('POST', lambdaIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': true,
          },
        },
        { statusCode: '400' },
        { statusCode: '500' },
      ],
    });

    // GET method for health check
    qbwcResource.addMethod('GET', lambdaIntegration, {
      methodResponses: [
        { statusCode: '200' },
        { statusCode: '500' },
      ],
    });

    // Add resource policy for API Gateway (optional security)
    this.api.addToResourcePolicy(
      new iam.PolicyStatement({
        principals: [new iam.AnyPrincipal()],
        actions: ['execute-api:Invoke'],
        resources: [`${this.api.arnForExecuteApi()}/*`],
        conditions: {
          IpAddress: {
            'aws:sourceIp': [
              '0.0.0.0/0', // Allow all IPs for now - restrict in production
            ],
          },
        },
      })
    );

    // Tags
    cdk.Tags.of(this).add('Component', 'QBWC-API');
  }
}