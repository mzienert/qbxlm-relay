import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface UtilitiesLayerConstructProps {
  environment: string;
}

export class UtilitiesLayerConstruct extends Construct {
  public readonly layer: lambda.LayerVersion;

  constructor(scope: Construct, id: string, props: UtilitiesLayerConstructProps) {
    super(scope, id);

    const { environment } = props;

    // Create Lambda Layer for shared utilities
    this.layer = new lambda.LayerVersion(this, 'UtilitiesLayer', {
      layerVersionName: `qbxml-relay-utilities-${environment}`,
      code: lambda.Code.fromAsset('lib/utilities', {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          command: [
            'bash', '-c',
            'mkdir -p /asset-output/nodejs && cp -r /asset-input/* /asset-output/nodejs/'
          ]
        }
      }),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: `Shared utilities layer for QBXML Relay - ${environment}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Tags
    cdk.Tags.of(this.layer).add('Project', 'qbxml-relay');
    cdk.Tags.of(this.layer).add('Environment', environment);
    cdk.Tags.of(this.layer).add('Component', 'utilities');
  }
}