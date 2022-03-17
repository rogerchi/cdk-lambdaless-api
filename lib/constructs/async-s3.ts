import { AwsIntegration, IRestApi } from 'aws-cdk-lib/aws-apigateway';
import { IEventBus } from 'aws-cdk-lib/aws-events';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { EventsEnabledBucket, S3DetailType } from './events-enabled-bucket';

export interface AsyncS3ApiProps {
  eventBus: IEventBus;
  api: IRestApi;
}

export class AsyncS3Api extends Construct {
  constructor(
    scope: Construct,
    id: string,
    { eventBus, api }: AsyncS3ApiProps,
  ) {
    super(scope, id);

    const bucket = new EventsEnabledBucket(this, 'bucket', {
      ruleActions: [S3DetailType.OBJECT_CREATED],
      eventBus,
    });

    const executionRole = new Role(this, 'ExecutionRole', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });

    bucket.grantWrite(executionRole);

    function requestTemplate() {
      const statements = [
        '#set($context.requestOverride.path.objectKey = $context.requestId)',
        '$input.body',
      ];
      return statements.join('\n');
    }

    const s3Integration = new AwsIntegration({
      service: 's3',
      path: `${bucket.bucketName}/{objectKey}`,
      integrationHttpMethod: 'PUT',
      options: {
        requestTemplates: {
          'application/json': requestTemplate(),
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': JSON.stringify({
                id: '$context.requestId',
              }),
            },
          },
        ],
        credentialsRole: executionRole,
      },
    });

    const resource = api.root.addResource('async-s3');
    resource.addMethod('POST', s3Integration, {
      methodResponses: [{ statusCode: '200' }],
    });
  }
}
