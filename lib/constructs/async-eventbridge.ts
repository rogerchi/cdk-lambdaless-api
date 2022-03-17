import { Construct } from 'constructs';
import { AwsIntegration, IRestApi } from 'aws-cdk-lib/aws-apigateway';
import { IEventBus } from 'aws-cdk-lib/aws-events';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';

export interface AsyncEventBridgeApiProps {
  eventBus: IEventBus;
  api: IRestApi;
}

export class AsyncEventBridgeApi extends Construct {
  constructor(
    scope: Construct,
    id: string,
    { eventBus, api }: AsyncEventBridgeApiProps,
  ) {
    super(scope, id);

    const role = new Role(this, 'role', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });

    eventBus.grantPutEventsTo(role);

    const eventbridgeIntegration = new AwsIntegration({
      service: 'events',
      action: 'PutEvents',
      integrationHttpMethod: 'POST',
      options: {
        credentialsRole: role,
        requestTemplates: {
          'application/json': `
            #set($context.requestOverride.header.X-Amz-Target ="AWSEvents.PutEvents")
            #set($context.requestOverride.header.Content-Type ="application/x-amz-json-1.1")
            ${JSON.stringify({
              Entries: [
                {
                  DetailType: 'putEvent',
                  Detail: "$util.escapeJavaScript($input.json('$'))",
                  Source: 'async-eventbridge-api',
                  EventBusName: eventBus.eventBusArn,
                },
              ],
            })}
          `,
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': JSON.stringify({
                id: "$input.path('$.Entries[0].EventId')",
              }),
            },
          },
        ],
      },
    });

    const resource = api.root.addResource('async-eventbridge');
    resource.addMethod('POST', eventbridgeIntegration, {
      methodResponses: [{ statusCode: '200' }],
    });
  }
}
