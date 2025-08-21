import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface ServicesLayerConstructProps {
  environment: string;
}

export class ServicesLayerConstruct extends Construct {
  public readonly layer: lambda.LayerVersion;

  constructor(scope: Construct, id: string, props: ServicesLayerConstructProps) {
    super(scope, id);

    const { environment } = props;

    // Create Lambda Layer for shared services
    this.layer = new lambda.LayerVersion(this, 'ServicesLayer', {
      layerVersionName: `qbxml-relay-services-${environment}`,
      code: lambda.Code.fromAsset('lib/services', {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          command: [
            'bash', '-c', [
              'cp -r /asset-input/* /asset-output/',
              'cd /asset-output',
              'mkdir -p nodejs',
              'cp -r * nodejs/',
              'rm -rf nodejs/nodejs'
            ].join(' && ')
          ]
        }
      }),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: `Shared services layer for QBXML Relay - ${environment}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Tags
    cdk.Tags.of(this.layer).add('Project', 'qbxml-relay');
    cdk.Tags.of(this.layer).add('Environment', environment);
    cdk.Tags.of(this.layer).add('Component', 'services-layer');
  }
}