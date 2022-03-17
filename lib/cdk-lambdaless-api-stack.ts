import { Stack, StackProps } from 'aws-cdk-lib';
import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { CloudWatchLogGroup } from 'aws-cdk-lib/aws-events-targets';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { AsyncEventBridgeApi } from './constructs/async-eventbridge';
import { AsyncS3Api } from './constructs/async-s3';
import { SyncExpressSfnApi } from './constructs/sync-express-sfn';

export class CdkLambdalessApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const logGroup = new LogGroup(this, 'eventsLog', {
      logGroupName: '/aws/events/apiEvents',
    });

    const eventBus = new EventBus(this, 'eventBus');
    const rule = new Rule(this, 'catchAll', {
      eventBus,
      eventPattern: {
        version: ['0'],
      },
    });
    rule.addTarget(new CloudWatchLogGroup(logGroup));

    const api = new RestApi(this, 'api');

    new AsyncEventBridgeApi(this, 'async-eventbridge-api', { eventBus, api });
    new AsyncS3Api(this, 'async-s3-api', { eventBus, api });
    new SyncExpressSfnApi(this, 'sync-sfn', { api });
  }
}
