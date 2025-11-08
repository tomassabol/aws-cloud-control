import {
  CloudWatchClient,
  DescribeAlarmsCommand,
  GetMetricStatisticsCommand,
  ListMetricsCommand,
} from "@aws-sdk/client-cloudwatch"
import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  DescribeLogStreamsCommand,
  FilterLogEventsCommand,
  GetLogEventsCommand,
  GetQueryResultsCommand,
  StartQueryCommand,
} from "@aws-sdk/client-cloudwatch-logs"
import { z } from "zod"

import {
  AWS_REGIONS,
  type AwsRegion,
  DEFAULT_AWS_REGION,
} from "~/utils/aws-region"
import { type Tool, tool } from "~/utils/tool"
import { ToolError } from "~/utils/tool-error"

export function createCloudWatchTools(): Tool[] {
  const getCloudWatchClient = (region: AwsRegion = DEFAULT_AWS_REGION) => {
    return new CloudWatchClient({ region })
  }

  const getCloudWatchLogsClient = (region: AwsRegion = DEFAULT_AWS_REGION) => {
    return new CloudWatchLogsClient({ region })
  }

  return [
    tool({
      name: "aws_cloudwatch_list_metrics",
      description: "List CloudWatch metrics with optional filtering",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
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
            }),
          )
          .optional()
          .describe("Dimensions to filter by"),
        recentlyActive: z
          .enum(["PT3H"])
          .optional()
          .describe("Only return metrics with data points in the last 3 hours"),
        nextToken: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
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
          })

          const response = await getCloudWatchClient(args.region).send(command)

          const metrics =
            response.Metrics?.map((metric) => ({
              metricName: metric.MetricName,
              namespace: metric.Namespace,
              dimensions: metric.Dimensions?.map((d) => ({
                name: d.Name,
                value: d.Value,
              })),
            })) || []

          return {
            metrics,
            count: metrics.length,
            nextToken: response.NextToken,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cloudwatch_list_metrics",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_cloudwatch_get_metric_statistics",
      description: "Get statistics for a CloudWatch metric",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        namespace: z
          .string()
          .describe("AWS namespace (e.g., AWS/EC2, AWS/Lambda)"),
        metricName: z.string().describe("Metric name"),
        dimensions: z
          .array(
            z.object({
              name: z.string(),
              value: z.string(),
            }),
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
            z.enum(["Sum", "Average", "Maximum", "Minimum", "SampleCount"]),
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
      async run(args) {
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
          })

          const response = await getCloudWatchClient(args.region).send(command)

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
                new Date(b.timestamp || 0).getTime(),
            ) || []

          return {
            label: response.Label,
            datapoints,
            count: datapoints.length,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cloudwatch_get_metric_statistics",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_cloudwatch_describe_alarms",
      description: "List and describe CloudWatch alarms",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
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
      async run(args) {
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
          })

          const response = await getCloudWatchClient(args.region).send(command)

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
            })) || []

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
            })) || []

          return {
            metricAlarms,
            compositeAlarms,
            metricAlarmsCount: metricAlarms.length,
            compositeAlarmsCount: compositeAlarms.length,
            nextToken: response.NextToken,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cloudwatch_describe_alarms",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_cloudwatchlogs_start_query",
      description: "Start a CloudWatch Logs Insights query",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        logGroupNames: z
          .array(z.string())
          .optional()
          .describe("Array of log group names to query"),
        logGroupName: z
          .string()
          .optional()
          .describe(
            "Single log group name to query (alternative to logGroupNames)",
          ),
        queryString: z.string().describe("The query string to execute"),
        startTime: z.string().describe("Start time (ISO string)"),
        endTime: z.string().describe("End time (ISO string)"),
        limit: z
          .number()
          .min(1)
          .max(10000)
          .optional()
          .describe("Maximum number of log events to return"),
      }),
      async run(args) {
        try {
          const logGroupNames =
            args.logGroupNames ||
            (args.logGroupName ? [args.logGroupName] : undefined)

          if (!logGroupNames || logGroupNames.length === 0) {
            throw new Error(
              "Either logGroupNames or logGroupName must be provided",
            )
          }

          const startTimeEpoch = Math.floor(
            new Date(args.startTime).getTime() / 1000,
          )
          const endTimeEpoch = Math.floor(
            new Date(args.endTime).getTime() / 1000,
          )

          const command = new StartQueryCommand({
            logGroupNames,
            queryString: args.queryString,
            startTime: startTimeEpoch,
            endTime: endTimeEpoch,
            limit: args.limit,
          })

          const response = await getCloudWatchLogsClient(args.region).send(
            command,
          )

          return {
            queryId: response.queryId,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cloudwatchlogs_start_query",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_cloudwatchlogs_get_query_results",
      description: "Get results from a CloudWatch Logs Insights query",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        queryId: z.string().describe("The query ID from start_query"),
      }),
      async run(args) {
        try {
          const command = new GetQueryResultsCommand({
            queryId: args.queryId,
          })

          const response = await getCloudWatchLogsClient(args.region).send(
            command,
          )

          const records =
            response.results?.map((result) => {
              const record: Record<string, string | null> = {}
              result.forEach((field) => {
                record[field.field || ""] = field.value || null
              })
              return record
            }) || []

          return {
            queryId: args.queryId,
            status: response.status,
            statistics: response.statistics
              ? {
                  recordsMatched: response.statistics.recordsMatched,
                  recordsScanned: response.statistics.recordsScanned,
                  bytesScanned: response.statistics.bytesScanned,
                }
              : undefined,
            records,
            count: records.length,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cloudwatchlogs_get_query_results",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_cloudwatchlogs_query",
      description:
        "Execute a CloudWatch Logs Insights query and wait for results (one-shot convenience)",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        logGroupNames: z
          .array(z.string())
          .optional()
          .describe("Array of log group names to query"),
        logGroupName: z
          .string()
          .optional()
          .describe(
            "Single log group name to query (alternative to logGroupNames)",
          ),
        queryString: z.string().describe("The query string to execute"),
        startTime: z.string().describe("Start time (ISO string)"),
        endTime: z.string().describe("End time (ISO string)"),
        limit: z
          .number()
          .min(1)
          .max(10000)
          .optional()
          .describe("Maximum number of log events to return"),
        pollIntervalMs: z
          .number()
          .min(100)
          .max(5000)
          .optional()
          .default(1000)
          .describe("Polling interval in milliseconds"),
        maxWaitSeconds: z
          .number()
          .min(1)
          .max(300)
          .optional()
          .default(60)
          .describe("Maximum time to wait for query completion in seconds"),
      }),
      async run(args) {
        try {
          const logGroupNames =
            args.logGroupNames ||
            (args.logGroupName ? [args.logGroupName] : undefined)

          if (!logGroupNames || logGroupNames.length === 0) {
            throw new Error(
              "Either logGroupNames or logGroupName must be provided",
            )
          }

          const startTimeEpoch = Math.floor(
            new Date(args.startTime).getTime() / 1000,
          )
          const endTimeEpoch = Math.floor(
            new Date(args.endTime).getTime() / 1000,
          )

          const startCommand = new StartQueryCommand({
            logGroupNames,
            queryString: args.queryString,
            startTime: startTimeEpoch,
            endTime: endTimeEpoch,
            limit: args.limit,
          })

          const startResponse = await getCloudWatchLogsClient(args.region).send(
            startCommand,
          )
          const { queryId } = startResponse

          if (!queryId) {
            throw new Error("Failed to start query: no queryId returned")
          }

          const maxWaitMs = (args.maxWaitSeconds || 60) * 1000
          const pollInterval = args.pollIntervalMs || 1000
          const startTime = Date.now()

          while (Date.now() - startTime < maxWaitMs) {
            const getResultsCommand = new GetQueryResultsCommand({
              queryId,
            })

            const resultsResponse = await getCloudWatchLogsClient(
              args.region,
            ).send(getResultsCommand)

            const { status } = resultsResponse
            if (
              status === "Complete" ||
              status === "Failed" ||
              status === "Cancelled"
            ) {
              const records =
                resultsResponse.results?.map((result) => {
                  const record: Record<string, string | null> = {}
                  result.forEach((field) => {
                    record[field.field || ""] = field.value || null
                  })
                  return record
                }) || []

              return {
                queryId,
                status,
                statistics: resultsResponse.statistics
                  ? {
                      recordsMatched: resultsResponse.statistics.recordsMatched,
                      recordsScanned: resultsResponse.statistics.recordsScanned,
                      bytesScanned: resultsResponse.statistics.bytesScanned,
                    }
                  : undefined,
                records,
                count: records.length,
              }
            }

            await new Promise((resolve) => setTimeout(resolve, pollInterval))
          }

          throw new Error(
            `Query did not complete within ${args.maxWaitSeconds || 60} seconds`,
          )
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cloudwatchlogs_query",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_cloudwatchlogs_describe_log_groups",
      description: "List CloudWatch log groups",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        logGroupNamePrefix: z
          .string()
          .optional()
          .describe("Prefix to filter log group names"),
        limit: z
          .number()
          .min(1)
          .max(50)
          .optional()
          .describe("Maximum number of log groups to return"),
        nextToken: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new DescribeLogGroupsCommand({
            logGroupNamePrefix: args.logGroupNamePrefix,
            limit: args.limit,
            nextToken: args.nextToken,
          })

          const response = await getCloudWatchLogsClient(args.region).send(
            command,
          )

          const logGroups =
            response.logGroups?.map((group) => ({
              logGroupName: group.logGroupName,
              creationTime: group.creationTime,
              retentionInDays: group.retentionInDays,
              metricFilterCount: group.metricFilterCount,
              storedBytes: group.storedBytes,
              kmsKeyId: group.kmsKeyId,
              dataProtectionStatus: group.dataProtectionStatus,
            })) || []

          return {
            logGroups,
            count: logGroups.length,
            nextToken: response.nextToken,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cloudwatchlogs_describe_log_groups",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_cloudwatchlogs_describe_log_streams",
      description: "List log streams in a CloudWatch log group",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        logGroupName: z.string().describe("Name of the log group"),
        orderBy: z
          .enum(["LogStreamName", "LastEventTime"])
          .optional()
          .describe("Order streams by name or last event time"),
        descending: z.boolean().optional().describe("Sort in descending order"),
        logStreamNamePrefix: z
          .string()
          .optional()
          .describe("Prefix to filter log stream names"),
        limit: z
          .number()
          .min(1)
          .max(50)
          .optional()
          .describe("Maximum number of log streams to return"),
        nextToken: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new DescribeLogStreamsCommand({
            logGroupName: args.logGroupName,
            orderBy: args.orderBy,
            descending: args.descending,
            logStreamNamePrefix: args.logStreamNamePrefix,
            limit: args.limit,
            nextToken: args.nextToken,
          })

          const response = await getCloudWatchLogsClient(args.region).send(
            command,
          )

          const logStreams =
            response.logStreams?.map((stream) => ({
              logStreamName: stream.logStreamName,
              creationTime: stream.creationTime,
              firstEventTimestamp: stream.firstEventTimestamp,
              lastEventTimestamp: stream.lastEventTimestamp,
              lastIngestionTime: stream.lastIngestionTime,
              uploadSequenceToken: stream.uploadSequenceToken,
              arn: stream.arn,
              storedBytes: stream.storedBytes,
            })) || []

          return {
            logStreams,
            count: logStreams.length,
            nextToken: response.nextToken,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cloudwatchlogs_describe_log_streams",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_cloudwatchlogs_filter_log_events",
      description:
        "Filter and search log events across log streams in a log group",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        logGroupName: z.string().describe("Name of the log group"),
        logStreamNames: z
          .array(z.string())
          .optional()
          .describe("Specific log streams to search"),
        logStreamNamePrefix: z
          .string()
          .optional()
          .describe("Prefix to filter log streams"),
        filterPattern: z
          .string()
          .optional()
          .describe(
            "Filter pattern (e.g., 'ERROR', '{ $.eventType = \"ERROR\" }')",
          ),
        startTime: z
          .string()
          .optional()
          .describe("Start time (ISO string, converted to epoch milliseconds)"),
        endTime: z
          .string()
          .optional()
          .describe("End time (ISO string, converted to epoch milliseconds)"),
        limit: z
          .number()
          .min(1)
          .max(10000)
          .optional()
          .describe("Maximum number of events to return"),
        nextToken: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const startTime = args.startTime
            ? new Date(args.startTime).getTime()
            : undefined
          const endTime = args.endTime
            ? new Date(args.endTime).getTime()
            : undefined

          const command = new FilterLogEventsCommand({
            logGroupName: args.logGroupName,
            logStreamNames: args.logStreamNames,
            logStreamNamePrefix: args.logStreamNamePrefix,
            filterPattern: args.filterPattern,
            startTime,
            endTime,
            limit: args.limit,
            nextToken: args.nextToken,
          })

          const response = await getCloudWatchLogsClient(args.region).send(
            command,
          )

          const events =
            response.events?.map((event) => ({
              eventId: event.eventId,
              timestamp: event.timestamp,
              message: event.message,
              ingestionTime: event.ingestionTime,
              logStreamName: event.logStreamName,
            })) || []

          const searchedLogStreams =
            response.searchedLogStreams?.map((stream) => ({
              logStreamName: stream.logStreamName,
              searchedCompletely: stream.searchedCompletely,
            })) || []

          return {
            events,
            count: events.length,
            nextToken: response.nextToken,
            searchedLogStreams,
            searchedLogStreamsCount: searchedLogStreams.length,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cloudwatchlogs_filter_log_events",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_cloudwatchlogs_get_log_events",
      description: "Get log events from a specific log stream",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        logGroupName: z.string().describe("Name of the log group"),
        logStreamName: z.string().describe("Name of the log stream"),
        startTime: z
          .string()
          .optional()
          .describe("Start time (ISO string, converted to epoch milliseconds)"),
        endTime: z
          .string()
          .optional()
          .describe("End time (ISO string, converted to epoch milliseconds)"),
        startFromHead: z
          .boolean()
          .optional()
          .describe("Start from the beginning of the log stream"),
        limit: z
          .number()
          .min(1)
          .max(10000)
          .optional()
          .describe("Maximum number of events to return"),
        nextToken: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const startTime = args.startTime
            ? new Date(args.startTime).getTime()
            : undefined
          const endTime = args.endTime
            ? new Date(args.endTime).getTime()
            : undefined

          const command = new GetLogEventsCommand({
            logGroupName: args.logGroupName,
            logStreamName: args.logStreamName,
            startTime,
            endTime,
            startFromHead: args.startFromHead,
            limit: args.limit,
            nextToken: args.nextToken,
          })

          const response = await getCloudWatchLogsClient(args.region).send(
            command,
          )

          const events =
            response.events?.map((event) => ({
              timestamp: event.timestamp,
              message: event.message,
              ingestionTime: event.ingestionTime,
            })) || []

          return {
            events,
            count: events.length,
            nextForwardToken: response.nextForwardToken,
            nextBackwardToken: response.nextBackwardToken,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cloudwatchlogs_get_log_events",
            toolArgs: args,
          })
        }
      },
    }),
  ]
}
