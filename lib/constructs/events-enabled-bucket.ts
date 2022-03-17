import { Construct } from 'constructs';
import { BucketProps, Bucket, CfnBucket } from 'aws-cdk-lib/aws-s3';
import { IEventBus, Rule } from 'aws-cdk-lib/aws-events';
import { EventBus } from 'aws-cdk-lib/aws-events-targets';

export enum S3DetailType {
  OBJECT_CREATED = 'Object Created',
  OBJECT_DELETED = 'Object Deleted',
  OBJECT_RESTORE_INITIATED = 'Object Restore Initiated',
  OBJECT_RESTORE_COMPLETED = 'Object Restore Completed',
  OBJECT_RESTORE_EXPIRED = 'Object Restore Expired',
  OBJECT_TAGS_ADDED = 'Object Tags Added',
  OBJECT_TAGS_DELETED = 'Object Tags Deleted',
  OBJECT_ACL_UPDATED = 'Object ACL Updated',
  OBJECT_STORAGE_CLASS_CHANGED = 'Object Storage Class Changed',
  OBJECT_ACCESS_TIER_CHANGED = 'Object Access Tier Changed',
}

export interface EventsEnabledBucketProps extends BucketProps {
  eventBus?: IEventBus;
  ruleActions?: S3DetailType[];
}

export class EventsEnabledBucket extends Bucket {
  public readonly rule: Rule;
  constructor(
    scope: Construct,
    id: string,
    { ruleActions, eventBus, ...props }: EventsEnabledBucketProps,
  ) {
    super(scope, id, props);

    const bucketCfn = this.node.defaultChild as CfnBucket;
    bucketCfn.notificationConfiguration = {
      eventBridgeConfiguration: {
        eventBridgeEnabled: true,
      },
    };

    this.rule = new Rule(this, 'Rule', {
      eventPattern: {
        detailType: ruleActions ?? [],
        source: ['aws.s3'],
        detail: {
          bucket: {
            name: [this.bucketName],
          },
        },
      },
    });

    if (eventBus) {
      this.rule.addTarget(new EventBus(eventBus));
    }
  }
}
