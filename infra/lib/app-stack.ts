import * as cdk from "aws-cdk-lib";
import { type Construct } from "constructs";

import { createApi } from "./api/http-api";
import { createAuth } from "./auth/cognito";
import type { AppConfig } from "./config/types";
import { createMonitoring } from "./monitoring/alarms";

export class AppStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props: cdk.StackProps & { config: AppConfig }) {
    super(scope, id, props);

    const auth = createAuth(this, props.config);
    const api = createApi(this, props.config, auth);
    const monitoring = createMonitoring(this, props.config, api);

    new cdk.CfnOutput(this, "ApiUrl", { value: api.httpApi.apiEndpoint });
    new cdk.CfnOutput(this, "UserPoolId", { value: auth.userPool.userPoolId });
    new cdk.CfnOutput(this, "UserPoolClientId", { value: auth.userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, "CognitoDomain", { value: auth.hostedUiDomain });
    new cdk.CfnOutput(this, "AwsRegion", { value: this.region });
    new cdk.CfnOutput(this, "EntraCallbackUrl", { value: auth.entraCallbackUrl });
    new cdk.CfnOutput(this, "AlarmTopicArn", { value: monitoring.alarmTopic.topicArn });
  }
}
