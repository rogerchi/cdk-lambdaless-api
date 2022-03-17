import { IRestApi, StepFunctionsIntegration } from 'aws-cdk-lib/aws-apigateway';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import {
  JsonPath,
  Pass,
  StateMachine,
  StateMachineType,
} from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';

export interface SyncExpressSfnApiProps {
  api: IRestApi;
}

export class SyncExpressSfnApi extends Construct {
  constructor(scope: Construct, id: string, { api }: SyncExpressSfnApiProps) {
    super(scope, id);

    const machine = new StateMachine(this, 'sfn', {
      definition: new Pass(this, 'pass', {
        parameters: {
          message: 'Hello from express API',
          echo: JsonPath.stringAt('$.body'),
        },
      }),
      stateMachineType: StateMachineType.EXPRESS,
    });

    const executionRole = new Role(this, 'ExecutionRole', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });

    machine.grantStartSyncExecution(executionRole);

    const sfnIntegration = StepFunctionsIntegration.startExecution(machine, {
      credentialsRole: executionRole,
    });

    const resource = api.root.addResource('sync-sfn');
    resource.addMethod('POST', sfnIntegration, {
      methodResponses: [{ statusCode: '200' }],
    });
  }
}
