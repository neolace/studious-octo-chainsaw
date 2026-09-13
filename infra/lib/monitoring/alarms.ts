import * as cdk from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cloudwatchActions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as sns from "aws-cdk-lib/aws-sns";
import { type Construct } from "constructs";

import type { ApiResources } from "../api/http-api";
import type { AppConfig } from "../config/types";

export interface MonitoringResources {
  /** Subscribe an on-call endpoint to this topic per environment; nothing is subscribed by default. */
  alarmTopic: sns.Topic;
  alarms: cloudwatch.Alarm[];
}

export function createMonitoring(
  scope: Construct,
  config: AppConfig,
  api: ApiResources,
): MonitoringResources {
  const alarmTopic = new sns.Topic(scope, "AlarmTopic", {
    topicName: `runbook-api-${config.environmentName}-alarms`,
  });
  const notify = new cloudwatchActions.SnsAction(alarmTopic);

  const period = cdk.Duration.minutes(5);

  const lambdaErrors = new cloudwatch.Alarm(scope, "ApiFunctionErrors", {
    alarmDescription: "The .NET API Lambda is returning invocation errors.",
    metric: api.apiFunction.metricErrors({ period, statistic: "sum" }),
    threshold: 1,
    evaluationPeriods: 1,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  });

  const lambdaThrottles = new cloudwatch.Alarm(scope, "ApiFunctionThrottles", {
    alarmDescription: "The .NET API Lambda is being throttled.",
    metric: api.apiFunction.metricThrottles({ period, statistic: "sum" }),
    threshold: 1,
    evaluationPeriods: 1,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  });

  const apiServerErrors = new cloudwatch.Alarm(scope, "HttpApiServerErrors", {
    alarmDescription: "API Gateway is returning 5xx responses.",
    metric: api.httpApi.metricServerError({ period, statistic: "sum" }),
    threshold: 1,
    evaluationPeriods: 1,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  });

  const alarms = [lambdaErrors, lambdaThrottles, apiServerErrors];
  for (const alarm of alarms) {
    alarm.addAlarmAction(notify);
    alarm.addOkAction(notify);
  }

  return { alarmTopic, alarms };
}
