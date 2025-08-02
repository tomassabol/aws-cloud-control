import {
  CloudWatchClient,
  ListMetricsCommand,
  GetMetricStatisticsCommand,
  GetMetricDataCommand,
  DescribeAlarmsCommand,
  ListDashboardsCommand,
  GetDashboardCommand,
  PutMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import { z } from "zod";
import { tool } from "../../tool";
import type { AWSConfig } from "../auth";
import { createAWSCredentials, getAWSRegion } from "../auth";

export function createCloudWatchTools(config?: AWSConfig) {
  const credentials = createAWSCredentials(config);
  const region = getAWSRegion(config);

  const cloudWatchClient = new CloudWatchClient({
    region,
    credentials,
  });

  return [
    tool({
      name: "aws:cloudwatch:list-metrics",
      description: "List CloudWatch metrics with optional filtering",
      args: z.object({
        namespace: z
          .string()
          .optional()
          .describe("AWS namespace to filter by (e.g., AWS/EC2, AWS/Lambda)"),
        metricName: z
          .string()
          .optional()
          .describe("Specific metric name to filter by"),
        dimensions: z
          .array(
            z.object({
              name: z.string(),
              value: z.string().optional(),
            })
          )
          .optional()
          .describe("Dimensions to filter by"),
        recentlyActive: z
          .enum(["PT3H"])
          .optional()
          .describe("Only return metrics with data points in the last 3 hours"),
        nextToken: z.string().optional().describe("Pagination token"),
      }),
      async run(args = {}) {
        try {
          const command = new ListMetricsCommand({
            Namespace: args.namespace,
            MetricName: args.metricName,
            Dimensions: args.dimensions?.map((d) => ({
              Name: d.name,
              Value: d.value,
            })),
            RecentlyActive: args.recentlyActive,
            NextToken: args.nextToken,
          });

          const response = await cloudWatchClient.send(command);

          const metrics =
            response.Metrics?.map((metric) => ({
              metricName: metric.MetricName,
              namespace: metric.Namespace,
              dimensions: metric.Dimensions?.map((d) => ({
                name: d.Name,
                value: d.Value,
              })),
            })) || [];

          return {
            metrics,
            count: metrics.length,
            nextToken: response.NextToken,
          };
        } catch (error) {
          throw new Error(
            `CloudWatch list metrics failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:cloudwatch:get-metric-statistics",
      description: "Get statistics for a CloudWatch metric",
      args: z.object({
        namespace: z
          .string()
          .describe("AWS namespace (e.g., AWS/EC2, AWS/Lambda)"),
        metricName: z.string().describe("Metric name"),
        dimensions: z
          .array(
            z.object({
              name: z.string(),
              value: z.string(),
            })
          )
          .optional()
          .describe("Metric dimensions"),
        startTime: z.string().describe("Start time (ISO string)"),
        endTime: z.string().describe("End time (ISO string)"),
        period: z
          .number()
          .describe("Period in seconds (must be multiple of 60)"),
        statistics: z
          .array(
            z.enum(["Sum", "Average", "Maximum", "Minimum", "SampleCount"])
          )
          .describe("Statistics to retrieve"),
        unit: z
          .enum([
            "Seconds",
            "Microseconds",
            "Milliseconds",
            "Bytes",
            "Kilobytes",
            "Megabytes",
            "Gigabytes",
            "Terabytes",
            "Bits",
            "Kilobits",
            "Megabits",
            "Gigabits",
            "Terabits",
            "Percent",
            "Count",
            "Bytes/Second",
            "Kilobytes/Second",
            "Megabytes/Second",
            "Gigabytes/Second",
            "Terabytes/Second",
            "Bits/Second",
            "Kilobits/Second",
            "Megabits/Second",
            "Gigabits/Second",
            "Terabits/Second",
            "Count/Second",
            "None",
          ])
          .optional()
          .describe("Unit of measurement"),
      }),
      async run(args = {}) {
        try {
          const command = new GetMetricStatisticsCommand({
            Namespace: args.namespace,
            MetricName: args.metricName,
            Dimensions: args.dimensions?.map((d) => ({
              Name: d.name,
              Value: d.value,
            })),
            StartTime: new Date(args.startTime),
            EndTime: new Date(args.endTime),
            Period: args.period,
            Statistics: args.statistics,
            Unit: args.unit,
          });

          const response = await cloudWatchClient.send(command);

          const datapoints =
            response.Datapoints?.map((dp) => ({
              timestamp: dp.Timestamp?.toISOString(),
              sum: dp.Sum,
              average: dp.Average,
              maximum: dp.Maximum,
              minimum: dp.Minimum,
              sampleCount: dp.SampleCount,
              unit: dp.Unit,
            })).sort(
              (a, b) =>
                new Date(a.timestamp || 0).getTime() -
                new Date(b.timestamp || 0).getTime()
            ) || [];

          return {
            label: response.Label,
            datapoints,
            count: datapoints.length,
          };
        } catch (error) {
          throw new Error(
            `CloudWatch get metric statistics failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:cloudwatch:describe-alarms",
      description: "List and describe CloudWatch alarms",
      args: z.object({
        alarmNames: z
          .array(z.string())
          .optional()
          .describe("Specific alarm names to describe"),
        alarmNamePrefix: z
          .string()
          .optional()
          .describe("Prefix to filter alarm names"),
        alarmTypes: z
          .array(z.enum(["CompositeAlarm", "MetricAlarm"]))
          .optional()
          .describe("Types of alarms to return"),
        childrenOfAlarmName: z
          .string()
          .optional()
          .describe("Name of composite alarm to get children for"),
        parentsOfAlarmName: z
          .string()
          .optional()
          .describe("Name of alarm to get parents for"),
        stateValue: z
          .enum(["OK", "ALARM", "INSUFFICIENT_DATA"])
          .optional()
          .describe("Filter by alarm state"),
        actionPrefix: z
          .string()
          .optional()
          .describe("Prefix for alarm actions"),
        maxRecords: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum alarms to return"),
        nextToken: z.string().optional().describe("Pagination token"),
      }),
      async run(args = {}) {
        try {
          const command = new DescribeAlarmsCommand({
            AlarmNames: args.alarmNames,
            AlarmNamePrefix: args.alarmNamePrefix,
            AlarmTypes: args.alarmTypes,
            ChildrenOfAlarmName: args.childrenOfAlarmName,
            ParentsOfAlarmName: args.parentsOfAlarmName,
            StateValue: args.stateValue,
            ActionPrefix: args.actionPrefix,
            MaxRecords: args.maxRecords,
            NextToken: args.nextToken,
          });

          const response = await cloudWatchClient.send(command);

          const metricAlarms =
            response.MetricAlarms?.map((alarm) => ({
              alarmName: alarm.AlarmName,
              alarmArn: alarm.AlarmArn,
              alarmDescription: alarm.AlarmDescription,
              alarmConfigurationUpdatedTimestamp:
                alarm.AlarmConfigurationUpdatedTimestamp?.toISOString(),
              actionsEnabled: alarm.ActionsEnabled,
              okActions: alarm.OKActions,
              alarmActions: alarm.AlarmActions,
              insufficientDataActions: alarm.InsufficientDataActions,
              stateValue: alarm.StateValue,
              stateReason: alarm.StateReason,
              stateReasonData: alarm.StateReasonData,
              stateUpdatedTimestamp: alarm.StateUpdatedTimestamp?.toISOString(),
              metricName: alarm.MetricName,
              namespace: alarm.Namespace,
              statistic: alarm.Statistic,
              extendedStatistic: alarm.ExtendedStatistic,
              dimensions: alarm.Dimensions?.map((d) => ({
                name: d.Name,
                value: d.Value,
              })),
              period: alarm.Period,
              unit: alarm.Unit,
              evaluationPeriods: alarm.EvaluationPeriods,
              datapointsToAlarm: alarm.DatapointsToAlarm,
              threshold: alarm.Threshold,
              comparisonOperator: alarm.ComparisonOperator,
              treatMissingData: alarm.TreatMissingData,
              evaluateLowSampleCountPercentile:
                alarm.EvaluateLowSampleCountPercentile,
            })) || [];

          const compositeAlarms =
            response.CompositeAlarms?.map((alarm) => ({
              alarmName: alarm.AlarmName,
              alarmArn: alarm.AlarmArn,
              alarmDescription: alarm.AlarmDescription,
              alarmConfigurationUpdatedTimestamp:
                alarm.AlarmConfigurationUpdatedTimestamp?.toISOString(),
              actionsEnabled: alarm.ActionsEnabled,
              okActions: alarm.OKActions,
              alarmActions: alarm.AlarmActions,
              insufficientDataActions: alarm.InsufficientDataActions,
              stateValue: alarm.StateValue,
              stateReason: alarm.StateReason,
              stateReasonData: alarm.StateReasonData,
              stateUpdatedTimestamp: alarm.StateUpdatedTimestamp?.toISOString(),
              alarmRule: alarm.AlarmRule,
            })) || [];

          return {
            metricAlarms,
            compositeAlarms,
            metricAlarmsCount: metricAlarms.length,
            compositeAlarmsCount: compositeAlarms.length,
            nextToken: response.NextToken,
          };
        } catch (error) {
          throw new Error(
            `CloudWatch describe alarms failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:cloudwatch:list-dashboards",
      description: "List CloudWatch dashboards",
      args: z.object({
        dashboardNamePrefix: z
          .string()
          .optional()
          .describe("Prefix to filter dashboard names"),
        nextToken: z.string().optional().describe("Pagination token"),
      }),
      async run(args = {}) {
        try {
          const command = new ListDashboardsCommand({
            DashboardNamePrefix: args.dashboardNamePrefix,
            NextToken: args.nextToken,
          });

          const response = await cloudWatchClient.send(command);

          const dashboards =
            response.DashboardEntries?.map((dashboard) => ({
              dashboardName: dashboard.DashboardName,
              dashboardArn: dashboard.DashboardArn,
              lastModified: dashboard.LastModified?.toISOString(),
              size: dashboard.Size,
            })) || [];

          return {
            dashboards,
            count: dashboards.length,
            nextToken: response.NextToken,
          };
        } catch (error) {
          throw new Error(
            `CloudWatch list dashboards failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:cloudwatch:get-dashboard",
      description: "Get CloudWatch dashboard definition",
      args: z.object({
        dashboardName: z.string().describe("Dashboard name"),
      }),
      async run(args = {}) {
        try {
          const command = new GetDashboardCommand({
            DashboardName: args.dashboardName,
          });

          const response = await cloudWatchClient.send(command);

          let dashboardBody: any = undefined;
          if (response.DashboardBody) {
            try {
              dashboardBody = JSON.parse(response.DashboardBody);
            } catch {
              dashboardBody = response.DashboardBody;
            }
          }

          return {
            dashboardArn: response.DashboardArn,
            dashboardName: response.DashboardName,
            dashboardBody,
          };
        } catch (error) {
          throw new Error(
            `CloudWatch get dashboard failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:cloudwatch:put-metric-data",
      description: "Publish custom metric data to CloudWatch",
      args: z.object({
        namespace: z.string().describe("Custom namespace for the metric"),
        metricData: z
          .array(
            z.object({
              metricName: z.string().describe("Name of the metric"),
              dimensions: z
                .array(
                  z.object({
                    name: z.string(),
                    value: z.string(),
                  })
                )
                .optional()
                .describe("Metric dimensions"),
              timestamp: z
                .string()
                .optional()
                .describe("Timestamp (ISO string, defaults to current time)"),
              value: z.number().optional().describe("Metric value"),
              values: z
                .array(z.number())
                .optional()
                .describe("Array of values for statistics"),
              counts: z
                .array(z.number())
                .optional()
                .describe("Array of counts corresponding to values"),
              unit: z
                .enum([
                  "Seconds",
                  "Microseconds",
                  "Milliseconds",
                  "Bytes",
                  "Kilobytes",
                  "Megabytes",
                  "Gigabytes",
                  "Terabytes",
                  "Bits",
                  "Kilobits",
                  "Megabits",
                  "Gigabits",
                  "Terabits",
                  "Percent",
                  "Count",
                  "Bytes/Second",
                  "Kilobytes/Second",
                  "Megabytes/Second",
                  "Gigabytes/Second",
                  "Terabytes/Second",
                  "Bits/Second",
                  "Kilobits/Second",
                  "Megabits/Second",
                  "Gigabits/Second",
                  "Terabits/Second",
                  "Count/Second",
                  "None",
                ])
                .optional()
                .describe("Unit of measurement"),
            })
          )
          .describe("Array of metric data points"),
      }),
      async run(args = {}) {
        try {
          const command = new PutMetricDataCommand({
            Namespace: args.namespace,
            MetricData: args.metricData.map((md) => ({
              MetricName: md.metricName,
              Dimensions: md.dimensions?.map((d) => ({
                Name: d.name,
                Value: d.value,
              })),
              Timestamp: md.timestamp ? new Date(md.timestamp) : new Date(),
              Value: md.value,
              Values: md.values,
              Counts: md.counts,
              Unit: md.unit,
            })),
          });

          await cloudWatchClient.send(command);

          return {
            success: true,
            message: `Successfully published ${args.metricData.length} metric data points to namespace ${args.namespace}`,
          };
        } catch (error) {
          throw new Error(
            `CloudWatch put metric data failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),
  ];
}
