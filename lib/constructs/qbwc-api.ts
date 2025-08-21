import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export interface QbwcApiConstructProps {
  environment: string;
  lambdaFunction: nodejs.NodejsFunction;
}

export class QbwcApiConstruct extends Construct {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: QbwcApiConstructProps) {
    super(scope, id);

    const { environment, lambdaFunction } = props;

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
    const lambdaIntegration = new apigateway.LambdaIntegration(lambdaFunction, {
      requestTemplates: {
        'application/json': `{
          "body": $input.json('$'),
          "headers": {
            #foreach($header in $input.params().header.keySet())
            "$header": "$util.escapeJavaScript($input.params().header.get($header))"#if($foreach.hasNext),#end
            #end
          },
          "method": "$context.httpMethod",
          "path": "$context.resourcePath",
          "queryStringParameters": {
            #foreach($param in $input.params().querystring.keySet())
            "$param": "$util.escapeJavaScript($input.params().querystring.get($param))"#if($foreach.hasNext),#end
            #end
          }
        }`,
        'text/xml': `{
          "body": "$input.body",
          "headers": {
            #foreach($header in $input.params().header.keySet())
            "$header": "$util.escapeJavaScript($input.params().header.get($header))"#if($foreach.hasNext),#end
            #end
          },
          "method": "$context.httpMethod",
          "path": "$context.resourcePath",
          "queryStringParameters": {
            #foreach($param in $input.params().querystring.keySet())
            "$param": "$util.escapeJavaScript($input.params().querystring.get($param))"#if($foreach.hasNext),#end
            #end
          }
        }`,
      },
      integrationResponses: [
        {
          statusCode: '200',
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
        { statusCode: '200' },
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

    // Resource policy removed to avoid circular dependency
    // Can be added later if IP restrictions are needed

    // Tags
    cdk.Tags.of(this).add('Component', 'API-Gateway');
  }
}