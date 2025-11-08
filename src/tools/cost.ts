import {
  CostExplorerClient,
  GetAnomaliesCommand,
  GetCostAndUsageCommand,
  GetCostForecastCommand,
  GetDimensionValuesCommand,
  GetRightsizingRecommendationCommand,
  GetSavingsPlansUtilizationCommand,
  GetTagsCommand,
} from "@aws-sdk/client-cost-explorer"
import { z } from "zod"

import { ToolError } from "~/utils/tool-error"

import {
  AWS_REGIONS,
  type AwsRegion,
  DEFAULT_AWS_REGION,
} from "../utils/aws-region"
import { type Tool, tool } from "../utils/tool"

export function createCostTools(): Tool[] {
  const getCostExplorerClient = (region: AwsRegion = DEFAULT_AWS_REGION) => {
    return new CostExplorerClient({ region })
  }

  return [
    tool({
      name: "aws_cost_get-cost-and-usage",
      description: "Get cost and usage data for your AWS account",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        timePeriod: z
          .object({
            start: z.string().describe("Start date in YYYY-MM-DD format"),
            end: z.string().describe("End date in YYYY-MM-DD format"),
          })
          .describe("Time period for the cost data"),
        granularity: z
          .enum(["DAILY", "MONTHLY", "HOURLY"])
          .describe("Data granularity"),
        metrics: z
          .array(
            z.enum([
              "BlendedCost",
              "UnblendedCost",
              "AmortizedCost",
              "NetUnblendedCost",
              "NetAmortizedCost",
              "UsageQuantity",
              "NormalizedUsageAmount",
            ]),
          )
          .describe("Cost metrics to retrieve"),
        groupBy: z
          .array(
            z.object({
              type: z.enum(["DIMENSION", "TAG", "COST_CATEGORY"]),
              key: z
                .string()
                .describe("Group by key (e.g., SERVICE, AZ, INSTANCE_TYPE)"),
            }),
          )
          .optional()
          .describe("Group results by dimensions"),
        filter: z
          .object({
            dimensions: z
              .object({
                key: z.enum([
                  "AZ",
                  "INSTANCE_TYPE",
                  "LINKED_ACCOUNT",
                  "LINKED_ACCOUNT_NAME",
                  "OPERATION",
                  "PURCHASE_TYPE",
                  "REGION",
                  "SERVICE",
                  "SERVICE_CODE",
                  "USAGE_TYPE",
                  "USAGE_TYPE_GROUP",
                  "RECORD_TYPE",
                  "OPERATING_SYSTEM",
                  "TENANCY",
                  "SCOPE",
                  "PLATFORM",
                  "SUBSCRIPTION_ID",
                  "LEGAL_ENTITY_NAME",
                  "DEPLOYMENT_OPTION",
                  "DATABASE_ENGINE",
                  "CACHE_ENGINE",
                  "INSTANCE_TYPE_FAMILY",
                  "BILLING_ENTITY",
                  "RESERVATION_ID",
                  "RESOURCE_ID",
                  "RIGHTSIZING_TYPE",
                  "SAVINGS_PLANS_TYPE",
                  "SAVINGS_PLAN_ARN",
                  "PAYMENT_OPTION",
                  "AGREEMENT_END_DATE_TIME_AFTER",
                  "AGREEMENT_END_DATE_TIME_BEFORE",
                ]),
                values: z.array(z.string()),
                matchOptions: z
                  .array(
                    z.enum([
                      "EQUALS",
                      "ABSENT",
                      "STARTS_WITH",
                      "ENDS_WITH",
                      "CONTAINS",
                      "CASE_SENSITIVE",
                      "CASE_INSENSITIVE",
                    ]),
                  )
                  .optional(),
              })
              .optional(),
            tags: z
              .object({
                key: z.string(),
                values: z.array(z.string()),
                matchOptions: z
                  .array(
                    z.enum([
                      "EQUALS",
                      "ABSENT",
                      "STARTS_WITH",
                      "ENDS_WITH",
                      "CONTAINS",
                      "CASE_SENSITIVE",
                      "CASE_INSENSITIVE",
                    ]),
                  )
                  .optional(),
              })
              .optional(),
          })
          .optional()
          .describe("Filter to apply to the cost data"),
      }),
      async run(args) {
        try {
          const command = new GetCostAndUsageCommand({
            TimePeriod: {
              Start: args.timePeriod.start,
              End: args.timePeriod.end,
            },
            Granularity: args.granularity,
            Metrics: args.metrics,
            GroupBy: args.groupBy?.map((gb) => ({
              Type: gb.type,
              Key: gb.key,
            })),
            Filter: args.filter
              ? {
                  Dimensions: args.filter.dimensions
                    ? {
                        Key: args.filter.dimensions.key,
                        Values: args.filter.dimensions.values,
                        MatchOptions: args.filter.dimensions.matchOptions,
                      }
                    : undefined,
                  Tags: args.filter.tags
                    ? {
                        Key: args.filter.tags.key,
                        Values: args.filter.tags.values,
                        MatchOptions: args.filter.tags.matchOptions,
                      }
                    : undefined,
                }
              : undefined,
          })

          const response = await getCostExplorerClient(args.region).send(
            command,
          )

          const resultsByTime =
            response.ResultsByTime?.map((result) => ({
              timePeriod: {
                start: result.TimePeriod?.Start,
                end: result.TimePeriod?.End,
              },
              total: result.Total
                ? Object.fromEntries(
                    Object.entries(result.Total).map(([key, value]) => [
                      key,
                      {
                        amount: value.Amount,
                        unit: value.Unit,
                      },
                    ]),
                  )
                : undefined,
              groups: result.Groups?.map((group) => ({
                keys: group.Keys,
                metrics: group.Metrics
                  ? Object.fromEntries(
                      Object.entries(group.Metrics).map(([key, value]) => [
                        key,
                        {
                          amount: value.Amount,
                          unit: value.Unit,
                        },
                      ]),
                    )
                  : undefined,
              })),
              estimated: result.Estimated,
            })) || []

          return {
            resultsByTime,
            count: resultsByTime.length,
            groupDefinitions: response.GroupDefinitions?.map((gd) => ({
              type: gd.Type,
              key: gd.Key,
            })),
            nextPageToken: response.NextPageToken,
          }
        } catch (error) {
          throw new Error(
            `Cost Explorer get cost and usage failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          )
        }
      },
    }),

    tool({
      name: "aws_cost_get-dimension-values",
      description: "Get available values for a cost dimension",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        timePeriod: z
          .object({
            start: z.string().describe("Start date in YYYY-MM-DD format"),
            end: z.string().describe("End date in YYYY-MM-DD format"),
          })
          .describe("Time period for the dimension values"),
        dimension: z
          .enum([
            "AZ",
            "INSTANCE_TYPE",
            "LINKED_ACCOUNT",
            "LINKED_ACCOUNT_NAME",
            "OPERATION",
            "PURCHASE_TYPE",
            "REGION",
            "SERVICE",
            "SERVICE_CODE",
            "USAGE_TYPE",
            "USAGE_TYPE_GROUP",
            "RECORD_TYPE",
            "OPERATING_SYSTEM",
            "TENANCY",
            "SCOPE",
            "PLATFORM",
            "SUBSCRIPTION_ID",
            "LEGAL_ENTITY_NAME",
            "DEPLOYMENT_OPTION",
            "DATABASE_ENGINE",
            "CACHE_ENGINE",
            "INSTANCE_TYPE_FAMILY",
            "BILLING_ENTITY",
            "RESERVATION_ID",
            "RESOURCE_ID",
            "RIGHTSIZING_TYPE",
            "SAVINGS_PLANS_TYPE",
            "SAVINGS_PLAN_ARN",
            "PAYMENT_OPTION",
          ])
          .describe("Dimension to get values for"),
        context: z
          .enum(["COST_AND_USAGE", "RESERVATIONS", "SAVINGS_PLANS"])
          .optional()
          .describe("Context for the dimension values"),
        searchString: z
          .string()
          .optional()
          .describe("Search string to filter dimension values"),
        sortBy: z
          .array(
            z.object({
              key: z.string(),
              sortOrder: z.enum(["ASCENDING", "DESCENDING"]).optional(),
            }),
          )
          .optional()
          .describe("Sort order for results"),
        maxResults: z
          .number()
          .min(1)
          .max(1000)
          .optional()
          .describe("Maximum results to return"),
        nextPageToken: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new GetDimensionValuesCommand({
            TimePeriod: {
              Start: args.timePeriod.start,
              End: args.timePeriod.end,
            },
            Dimension: args.dimension,
            Context: args.context,
            SearchString: args.searchString,
            SortBy: args.sortBy?.map((sb) => ({
              Key: sb.key,
              SortOrder: sb.sortOrder,
            })),
            MaxResults: args.maxResults,
            NextPageToken: args.nextPageToken,
          })

          const response = await getCostExplorerClient(args.region).send(
            command,
          )

          const dimensionValues =
            response.DimensionValues?.map((dv) => ({
              value: dv.Value,
              attributes: dv.Attributes,
            })) || []

          return {
            dimension: args.dimension,
            dimensionValues,
            count: dimensionValues.length,
            returnSize: response.ReturnSize,
            totalSize: response.TotalSize,
            nextPageToken: response.NextPageToken,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cost_get-dimension-values",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_cost_get-rightsizing-recommendation",
      description: "Get rightsizing recommendations for EC2 instances",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        filter: z
          .object({
            dimensions: z
              .object({
                key: z.enum([
                  "AZ",
                  "INSTANCE_TYPE",
                  "LINKED_ACCOUNT",
                  "LINKED_ACCOUNT_NAME",
                  "OPERATION",
                  "PURCHASE_TYPE",
                  "REGION",
                  "SERVICE",
                  "SERVICE_CODE",
                  "USAGE_TYPE",
                  "USAGE_TYPE_GROUP",
                  "RECORD_TYPE",
                  "OPERATING_SYSTEM",
                  "TENANCY",
                  "SCOPE",
                  "PLATFORM",
                  "SUBSCRIPTION_ID",
                  "LEGAL_ENTITY_NAME",
                  "DEPLOYMENT_OPTION",
                  "DATABASE_ENGINE",
                  "CACHE_ENGINE",
                  "INSTANCE_TYPE_FAMILY",
                  "BILLING_ENTITY",
                  "RESERVATION_ID",
                  "RESOURCE_ID",
                  "RIGHTSIZING_TYPE",
                  "SAVINGS_PLANS_TYPE",
                  "SAVINGS_PLAN_ARN",
                  "PAYMENT_OPTION",
                ]),
                values: z.array(z.string()),
                matchOptions: z
                  .array(
                    z.enum([
                      "EQUALS",
                      "ABSENT",
                      "STARTS_WITH",
                      "ENDS_WITH",
                      "CONTAINS",
                      "CASE_SENSITIVE",
                      "CASE_INSENSITIVE",
                    ]),
                  )
                  .optional(),
              })
              .optional(),
          })
          .optional()
          .describe("Filter for recommendations"),
        configuration: z
          .object({
            benefitsConsidered: z
              .boolean()
              .optional()
              .describe("Whether to consider Reserved Instance benefits"),
            recommendationTarget: z
              .enum(["SAME_INSTANCE_FAMILY", "CROSS_INSTANCE_FAMILY"])
              .optional()
              .describe("Recommendation target"),
          })
          .optional()
          .describe("Configuration for recommendations"),
        service: z.string().describe("AWS service (typically 'AmazonEC2')"),
        pageSize: z
          .number()
          .min(1)
          .max(1000)
          .optional()
          .describe("Number of recommendations per page"),
        nextPageToken: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new GetRightsizingRecommendationCommand({
            Filter: args.filter
              ? {
                  Dimensions: args.filter.dimensions
                    ? {
                        Key: args.filter.dimensions.key,
                        Values: args.filter.dimensions.values,
                        MatchOptions: args.filter.dimensions.matchOptions,
                      }
                    : undefined,
                }
              : undefined,
            Configuration: args.configuration
              ? {
                  BenefitsConsidered: args.configuration.benefitsConsidered,
                  RecommendationTarget: args.configuration.recommendationTarget,
                }
              : undefined,
            Service: args.service,
            PageSize: args.pageSize,
            NextPageToken: args.nextPageToken,
          })

          const response = await getCostExplorerClient(args.region).send(
            command,
          )

          const recommendations =
            response.RightsizingRecommendations?.map((rec) => ({
              accountId: rec.AccountId,
              currentInstance: rec.CurrentInstance
                ? {
                    resourceId: rec.CurrentInstance.ResourceId,
                    instanceName: rec.CurrentInstance.InstanceName,
                    tags: rec.CurrentInstance.Tags,
                    resourceDetails: rec.CurrentInstance.ResourceDetails,
                    resourceUtilization:
                      rec.CurrentInstance.ResourceUtilization,
                    reservationCoveredHoursInLookbackPeriod:
                      rec.CurrentInstance
                        .ReservationCoveredHoursInLookbackPeriod,
                    onDemandHoursInLookbackPeriod:
                      rec.CurrentInstance.OnDemandHoursInLookbackPeriod,
                    totalRunningHoursInLookbackPeriod:
                      rec.CurrentInstance.TotalRunningHoursInLookbackPeriod,
                    monthlyCost: rec.CurrentInstance.MonthlyCost,
                    currencyCode: rec.CurrentInstance.CurrencyCode,
                  }
                : undefined,
              rightsizingType: rec.RightsizingType,
              modifyRecommendationDetail: rec.ModifyRecommendationDetail
                ? {
                    targetInstances:
                      rec.ModifyRecommendationDetail.TargetInstances?.map(
                        (ti) => ({
                          estimatedMonthlyCost: ti.EstimatedMonthlyCost,
                          estimatedMonthlySavings: ti.EstimatedMonthlySavings,
                          currencyCode: ti.CurrencyCode,
                          defaultTargetInstance: ti.DefaultTargetInstance,
                          resourceDetails: ti.ResourceDetails,
                          expectedResourceUtilization:
                            ti.ExpectedResourceUtilization,
                          platformDifferences: ti.PlatformDifferences,
                        }),
                      ),
                  }
                : undefined,
              terminateRecommendationDetail: rec.TerminateRecommendationDetail
                ? {
                    estimatedMonthlySavings:
                      rec.TerminateRecommendationDetail.EstimatedMonthlySavings,
                    currencyCode:
                      rec.TerminateRecommendationDetail.CurrencyCode,
                  }
                : undefined,
              findingReasonCodes: rec.FindingReasonCodes,
            })) || []

          return {
            recommendations,
            count: recommendations.length,
            summary: response.Summary
              ? {
                  totalRecommendationCount:
                    response.Summary.TotalRecommendationCount,
                  estimatedTotalMonthlySavingsAmount:
                    response.Summary.EstimatedTotalMonthlySavingsAmount,
                  savingsCurrencyCode: response.Summary.SavingsCurrencyCode,
                  savingsPercentage: response.Summary.SavingsPercentage,
                }
              : undefined,
            nextPageToken: response.NextPageToken,
            configuration: response.Configuration
              ? {
                  benefitsConsidered: response.Configuration.BenefitsConsidered,
                  recommendationTarget:
                    response.Configuration.RecommendationTarget,
                }
              : undefined,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cost_get-rightsizing-recommendation",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_cost_get-monthly-spend-summary",
      description:
        "Get a simplified monthly spend summary for the last N months",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        months: z
          .number()
          .min(1)
          .max(12)
          .optional()
          .default(6)
          .describe("Number of months to look back"),
        groupByService: z
          .boolean()
          .optional()
          .default(true)
          .describe("Group costs by AWS service"),
      }),
      async run(args) {
        try {
          const endDate = new Date()
          const startDate = new Date()
          startDate.setMonth(endDate.getMonth() - (args.months || 6))

          const command = new GetCostAndUsageCommand({
            TimePeriod: {
              Start: startDate.toISOString().split("T")[0],
              End: endDate.toISOString().split("T")[0],
            },
            Granularity: "MONTHLY",
            Metrics: ["BlendedCost"],
            GroupBy:
              (args.groupByService ?? true)
                ? [
                    {
                      Type: "DIMENSION",
                      Key: "SERVICE",
                    },
                  ]
                : undefined,
          })

          const response = await getCostExplorerClient(args.region).send(
            command,
          )

          const monthlyData =
            response.ResultsByTime?.map((result) => {
              const totalCost = result.Total?.BlendedCost?.Amount || "0"
              const month = result.TimePeriod?.Start || ""

              const serviceBreakdown =
                result.Groups?.map((group) => ({
                  service: group.Keys?.[0] || "Unknown",
                  cost: parseFloat(group.Metrics?.BlendedCost?.Amount || "0"),
                  unit: group.Metrics?.BlendedCost?.Unit || "USD",
                })).sort((a, b) => b.cost - a.cost) || []

              return {
                month,
                totalCost: parseFloat(totalCost),
                unit: result.Total?.BlendedCost?.Unit || "USD",
                serviceBreakdown:
                  (args.groupByService ?? true) ? serviceBreakdown : undefined,
                topServices:
                  (args.groupByService ?? true)
                    ? serviceBreakdown.slice(0, 5)
                    : undefined,
              }
            }) || []

          const totalSpend = monthlyData.reduce(
            (sum, month) => sum + month.totalCost,
            0,
          )
          const averageMonthlySpend =
            totalSpend / Math.max(monthlyData.length, 1)

          return {
            summary: {
              totalSpend,
              averageMonthlySpend,
              currency: monthlyData[0]?.unit || "USD",
              period: `${args.months || 6} months`,
            },
            monthlyData,
            count: monthlyData.length,
          }
        } catch (error) {
          throw new Error(
            `Cost Explorer monthly spend summary failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          )
        }
      },
    }),

    tool({
      name: "aws_cost_get-service-costs",
      description: "Get cost breakdown for specific AWS services you use",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        services: z
          .array(
            z.enum([
              "Amazon Elastic Compute Cloud - Compute",
              "Amazon Relational Database Service",
              "AmazonCloudWatch",
              "Amazon API Gateway",
              "Amazon DynamoDB",
              "AWS X-Ray",
              "EC2 - Other",
              "Amazon Virtual Private Cloud",
              "AWS Systems Manager",
              "AWS Lambda",
              "AWS Backup",
              "Amazon Simple Storage Service",
              "AWS Step Functions",
              "AWS Secrets Manager",
              "CloudWatch Events",
              "AWS IoT Greengrass",
              "Amazon Cognito",
              "Amazon Simple Queue Service",
              "AWS CodePipeline",
              "AWS WAF",
              "Amazon Route 53",
              "AWS Key Management Service",
              "CodeBuild",
              "Amazon Simple Notification Service",
              "AWS IoT",
              "Amazon EC2 Container Registry (ECR)",
              "AWS Cost Explorer",
              "AWS Identity and Access Management Access Analyzer",
              "AWS CloudFormation",
              "Tax",
              "AWS Glue",
              "AWS Certificate Manager",
            ]),
          )
          .optional()
          .describe(
            "Specific services to analyze (if not provided, analyzes all your services)",
          ),
        months: z
          .number()
          .min(1)
          .max(12)
          .optional()
          .default(3)
          .describe("Number of months to analyze"),
        granularity: z
          .enum(["DAILY", "MONTHLY"])
          .optional()
          .default("MONTHLY")
          .describe("Data granularity"),
        includeUsage: z
          .boolean()
          .optional()
          .default(false)
          .describe("Include usage metrics alongside cost"),
      }),
      async run(args) {
        const {
          region = DEFAULT_AWS_REGION,
          months = 3,
          granularity = "MONTHLY",
          includeUsage = false,
        } = args

        try {
          const endDate = new Date()
          endDate.setUTCHours(0, 0, 0, 0)
          const startDate = new Date(endDate)
          startDate.setMonth(startDate.getMonth() - months)

          // Define all your services if none specified
          const allYourServices = [
            "Amazon Elastic Compute Cloud - Compute",
            "Amazon Relational Database Service",
            "AmazonCloudWatch",
            "Amazon API Gateway",
            "Amazon DynamoDB",
            "AWS X-Ray",
            "EC2 - Other",
            "Amazon Virtual Private Cloud",
            "AWS Systems Manager",
            "AWS Lambda",
            "AWS Backup",
            "Amazon Simple Storage Service",
            "AWS Step Functions",
            "AWS Secrets Manager",
            "CloudWatch Events",
            "AWS IoT Greengrass",
            "Amazon Cognito",
            "Amazon Simple Queue Service",
            "AWS CodePipeline",
            "AWS WAF",
            "Amazon Route 53",
            "AWS Key Management Service",
            "CodeBuild",
            "Amazon Simple Notification Service",
            "AWS IoT",
            "Amazon EC2 Container Registry (ECR)",
            "AWS Cost Explorer",
            "AWS Identity and Access Management Access Analyzer",
            "AWS CloudFormation",
            "Tax",
            "AWS Glue",
            "AWS Certificate Manager",
          ]

          const servicesToAnalyze = args.services || allYourServices

          const metrics = includeUsage
            ? ["BlendedCost", "UsageQuantity"]
            : ["BlendedCost"]

          const command = new GetCostAndUsageCommand({
            TimePeriod: {
              Start: startDate.toISOString().split("T")[0],
              End: endDate.toISOString().split("T")[0],
            },
            Granularity: granularity,
            Metrics: metrics,
            GroupBy: [
              {
                Type: "DIMENSION",
                Key: "SERVICE",
              },
            ],
            Filter: {
              Dimensions: {
                Key: "SERVICE",
                Values: servicesToAnalyze,
                MatchOptions: ["EQUALS"],
              },
            },
          })

          const response = await getCostExplorerClient(region).send(command)

          const serviceAnalysis = new Map()

          // Process results by time period
          response.ResultsByTime?.forEach((result) => {
            const timePeriod = {
              start: result.TimePeriod?.Start,
              end: result.TimePeriod?.End,
            }

            result.Groups?.forEach((group) => {
              const serviceName = group.Keys?.[0]
              if (!serviceName) return

              if (!serviceAnalysis.has(serviceName)) {
                serviceAnalysis.set(serviceName, {
                  serviceName,
                  totalCost: 0,
                  totalUsage: 0,
                  timePeriods: [],
                  averageMonthlyCost: 0,
                  currency: "USD",
                })
              }

              const service = serviceAnalysis.get(serviceName)
              const cost = parseFloat(group.Metrics?.BlendedCost?.Amount || "0")
              const usage = parseFloat(
                group.Metrics?.UsageQuantity?.Amount || "0",
              )

              service.totalCost += cost
              service.totalUsage += usage
              service.currency = group.Metrics?.BlendedCost?.Unit || "USD"

              service.timePeriods.push({
                ...timePeriod,
                cost,
                usage: includeUsage ? usage : undefined,
                usageUnit: includeUsage
                  ? group.Metrics?.UsageQuantity?.Unit
                  : undefined,
              })
            })
          })

          // Calculate averages and sort
          const serviceResults = Array.from(serviceAnalysis.values())
            .map((service) => ({
              ...service,
              averageMonthlyCost:
                service.totalCost / Math.max(service.timePeriods.length, 1),
              hasData: service.totalCost > 0 || service.totalUsage > 0,
            }))
            .sort((a, b) => b.totalCost - a.totalCost)

          // Summary statistics
          const totalCost = serviceResults.reduce(
            (sum, service) => sum + service.totalCost,
            0,
          )
          const servicesWithCosts = serviceResults.filter((s) => s.hasData)
          const topServices = servicesWithCosts.slice(0, 10)

          return {
            summary: {
              totalCost,
              currency: serviceResults[0]?.currency || "USD",
              period: `${args.months} months`,
              granularity: args.granularity,
              servicesAnalyzed: servicesToAnalyze.length,
              servicesWithCosts: servicesWithCosts.length,
              includeUsage: args.includeUsage,
            },
            topServices: topServices.map((service) => ({
              serviceName: service.serviceName,
              totalCost: service.totalCost,
              averageMonthlyCost: service.averageMonthlyCost,
              currency: service.currency,
              totalUsage: args.includeUsage ? service.totalUsage : undefined,
            })),
            allServices: serviceResults,
            costDistribution: {
              top5Services: topServices.slice(0, 5).map((s) => ({
                service: s.serviceName,
                cost: s.totalCost,
                percentage: ((s.totalCost / totalCost) * 100).toFixed(2),
              })),
              remainingServices: {
                count: Math.max(0, servicesWithCosts.length - 5),
                totalCost: servicesWithCosts
                  .slice(5)
                  .reduce((sum, s) => sum + s.totalCost, 0),
                percentage: (
                  (servicesWithCosts
                    .slice(5)
                    .reduce((sum, s) => sum + s.totalCost, 0) /
                    totalCost) *
                  100
                ).toFixed(2),
              },
            },
            trends:
              serviceResults.length > 0
                ? {
                    mostExpensive: serviceResults[0]?.serviceName,
                    leastExpensive:
                      servicesWithCosts[servicesWithCosts.length - 1]
                        ?.serviceName,
                    servicesTotalCosts: topServices.map((s) => ({
                      service: s.serviceName,
                      cost: s.totalCost,
                    })),
                  }
                : undefined,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cost_get-service-costs",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_cost_get-anomalies",
      description: "Get cost anomalies detected by Cost Explorer",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        dateInterval: z
          .object({
            startDate: z.string().describe("Start date in YYYY-MM-DD format"),
            endDate: z
              .string()
              .describe("End date in YYYY-MM-DD format")
              .optional(),
          })
          .describe("Date interval for retrieving anomalies"),
        monitorArn: z
          .string()
          .optional()
          .describe(
            "ARN of a specific cost anomaly monitor to retrieve anomalies for",
          ),
        feedback: z
          .enum(["NO", "PLANNED_ACTIVITY", "YES"])
          .optional()
          .describe("Filter anomalies by feedback type"),
        totalImpact: z
          .object({
            numericOperator: z.enum([
              "BETWEEN",
              "EQUAL",
              "GREATER_THAN",
              "GREATER_THAN_OR_EQUAL",
              "LESS_THAN",
              "LESS_THAN_OR_EQUAL",
            ]),
            startValue: z.number().describe("Lower bound dollar value"),
            endValue: z
              .number()
              .optional()
              .describe("Upper bound dollar value (required for BETWEEN)"),
          })
          .optional()
          .describe("Filter anomalies by total impact"),
        maxResults: z
          .number()
          .min(1)
          .max(1000)
          .optional()
          .describe("Maximum number of results to return"),
        nextPageToken: z
          .string()
          .optional()
          .describe("Pagination token for next page of results"),
      }),
      async run(args) {
        try {
          const command = new GetAnomaliesCommand({
            DateInterval: {
              StartDate: args.dateInterval.startDate,
              EndDate: args.dateInterval.endDate,
            },
            MonitorArn: args.monitorArn,
            Feedback: args.feedback,
            TotalImpact: args.totalImpact
              ? {
                  NumericOperator: args.totalImpact.numericOperator,
                  StartValue: args.totalImpact.startValue,
                  EndValue: args.totalImpact.endValue,
                }
              : undefined,
            MaxResults: args.maxResults,
            NextPageToken: args.nextPageToken,
          })

          const response = await getCostExplorerClient(args.region).send(
            command,
          )

          const anomalies =
            response.Anomalies?.map((anomaly) => ({
              anomalyId: anomaly.AnomalyId,
              anomalyStartDate: anomaly.AnomalyStartDate,
              anomalyEndDate: anomaly.AnomalyEndDate,
              dimensionValue: anomaly.DimensionValue,
              rootCauses: anomaly.RootCauses?.map((rc) => ({
                service: rc.Service,
                region: rc.Region,
                linkedAccount: rc.LinkedAccount,
                linkedAccountName: rc.LinkedAccountName,
                usageType: rc.UsageType,
                impact: rc.Impact
                  ? {
                      contribution: rc.Impact.Contribution,
                    }
                  : undefined,
              })),
              anomalyScore: anomaly.AnomalyScore
                ? {
                    maxScore: anomaly.AnomalyScore.MaxScore,
                    currentScore: anomaly.AnomalyScore.CurrentScore,
                  }
                : undefined,
              impact: anomaly.Impact
                ? {
                    maxImpact: anomaly.Impact.MaxImpact,
                    totalImpact: anomaly.Impact.TotalImpact,
                    totalActualSpend: anomaly.Impact.TotalActualSpend,
                    totalExpectedSpend: anomaly.Impact.TotalExpectedSpend,
                  }
                : undefined,
              monitorArn: anomaly.MonitorArn,
              feedback: anomaly.Feedback,
            })) || []

          return {
            anomalies,
            count: anomalies.length,
            nextPageToken: response.NextPageToken,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cost_get-anomalies",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_cost_get-cost-forecast",
      description: "Get cost forecast for your AWS account",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        timePeriod: z
          .object({
            start: z.string().describe("Start date in YYYY-MM-DD format"),
            end: z.string().describe("End date in YYYY-MM-DD format"),
          })
          .describe("Time period for the forecast"),
        metric: z
          .enum([
            "AMORTIZED_COST",
            "BLENDED_COST",
            "NET_AMORTIZED_COST",
            "NET_UNBLENDED_COST",
            "UNBLENDED_COST",
          ])
          .describe("Cost metric to forecast"),
        granularity: z
          .enum(["DAILY", "MONTHLY"])
          .describe(
            "Forecast granularity (DAILY for 3 months, MONTHLY for 12 months)",
          ),
        filter: z
          .object({
            dimensions: z
              .object({
                key: z.enum([
                  "AZ",
                  "INSTANCE_TYPE",
                  "LINKED_ACCOUNT",
                  "OPERATION",
                  "PURCHASE_TYPE",
                  "REGION",
                  "SERVICE",
                  "USAGE_TYPE",
                  "USAGE_TYPE_GROUP",
                  "RECORD_TYPE",
                  "OPERATING_SYSTEM",
                ]),
                values: z.array(z.string()),
                matchOptions: z
                  .array(
                    z.enum([
                      "EQUALS",
                      "ABSENT",
                      "STARTS_WITH",
                      "ENDS_WITH",
                      "CONTAINS",
                      "CASE_SENSITIVE",
                      "CASE_INSENSITIVE",
                    ]),
                  )
                  .optional(),
              })
              .optional(),
            tags: z
              .object({
                key: z.string(),
                values: z.array(z.string()),
                matchOptions: z
                  .array(
                    z.enum([
                      "EQUALS",
                      "ABSENT",
                      "STARTS_WITH",
                      "ENDS_WITH",
                      "CONTAINS",
                      "CASE_SENSITIVE",
                      "CASE_INSENSITIVE",
                    ]),
                  )
                  .optional(),
              })
              .optional(),
          })
          .optional()
          .describe("Filter to apply to the forecast"),
        predictionIntervalLevel: z
          .number()
          .min(50)
          .max(99)
          .optional()
          .describe("Prediction interval level (50-99)"),
      }),
      async run(args) {
        try {
          const command = new GetCostForecastCommand({
            TimePeriod: {
              Start: args.timePeriod.start,
              End: args.timePeriod.end,
            },
            Metric: args.metric,
            Granularity: args.granularity,
            Filter: args.filter
              ? {
                  Dimensions: args.filter.dimensions
                    ? {
                        Key: args.filter.dimensions.key,
                        Values: args.filter.dimensions.values,
                        MatchOptions: args.filter.dimensions.matchOptions,
                      }
                    : undefined,
                  Tags: args.filter.tags
                    ? {
                        Key: args.filter.tags.key,
                        Values: args.filter.tags.values,
                        MatchOptions: args.filter.tags.matchOptions,
                      }
                    : undefined,
                }
              : undefined,
            PredictionIntervalLevel: args.predictionIntervalLevel,
          })

          const response = await getCostExplorerClient(args.region).send(
            command,
          )

          const forecastResultsByTime =
            response.ForecastResultsByTime?.map((result) => ({
              timePeriod: {
                start: result.TimePeriod?.Start,
                end: result.TimePeriod?.End,
              },
              meanValue: result.MeanValue,
              predictionIntervalLowerBound: result.PredictionIntervalLowerBound,
              predictionIntervalUpperBound: result.PredictionIntervalUpperBound,
            })) || []

          return {
            total: response.Total
              ? {
                  amount: response.Total.Amount,
                  unit: response.Total.Unit,
                }
              : undefined,
            forecastResultsByTime,
            count: forecastResultsByTime.length,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cost_get-cost-forecast",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_cost_get-tags",
      description:
        "Get available tag keys and tag values for a specified period",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        timePeriod: z
          .object({
            start: z.string().describe("Start date in YYYY-MM-DD format"),
            end: z.string().describe("End date in YYYY-MM-DD format"),
          })
          .describe("Time period for retrieving tags"),
        tagKey: z
          .string()
          .optional()
          .describe("The key of the tag to return values for"),
        searchString: z
          .string()
          .optional()
          .describe("Search string to filter tag values"),
        filter: z
          .object({
            dimensions: z
              .object({
                key: z.enum([
                  "AZ",
                  "INSTANCE_TYPE",
                  "LINKED_ACCOUNT",
                  "LINKED_ACCOUNT_NAME",
                  "OPERATION",
                  "PURCHASE_TYPE",
                  "REGION",
                  "SERVICE",
                  "SERVICE_CODE",
                  "USAGE_TYPE",
                  "USAGE_TYPE_GROUP",
                  "RECORD_TYPE",
                  "OPERATING_SYSTEM",
                  "TENANCY",
                  "SCOPE",
                  "PLATFORM",
                  "SUBSCRIPTION_ID",
                  "LEGAL_ENTITY_NAME",
                  "DEPLOYMENT_OPTION",
                  "DATABASE_ENGINE",
                  "CACHE_ENGINE",
                  "INSTANCE_TYPE_FAMILY",
                  "BILLING_ENTITY",
                  "RESERVATION_ID",
                  "RESOURCE_ID",
                  "RIGHTSIZING_TYPE",
                  "SAVINGS_PLANS_TYPE",
                  "SAVINGS_PLAN_ARN",
                  "PAYMENT_OPTION",
                ]),
                values: z.array(z.string()),
                matchOptions: z
                  .array(
                    z.enum([
                      "EQUALS",
                      "ABSENT",
                      "STARTS_WITH",
                      "ENDS_WITH",
                      "CONTAINS",
                      "CASE_SENSITIVE",
                      "CASE_INSENSITIVE",
                    ]),
                  )
                  .optional(),
              })
              .optional(),
            tags: z
              .object({
                key: z.string(),
                values: z.array(z.string()),
                matchOptions: z
                  .array(
                    z.enum([
                      "EQUALS",
                      "ABSENT",
                      "STARTS_WITH",
                      "ENDS_WITH",
                      "CONTAINS",
                      "CASE_SENSITIVE",
                      "CASE_INSENSITIVE",
                    ]),
                  )
                  .optional(),
              })
              .optional(),
          })
          .optional()
          .describe("Filter to apply to the tag query"),
        sortBy: z
          .array(
            z.object({
              key: z.string(),
              sortOrder: z.enum(["ASCENDING", "DESCENDING"]).optional(),
            }),
          )
          .optional()
          .describe("Sort order for results"),
        maxResults: z
          .number()
          .min(1)
          .max(1000)
          .optional()
          .describe("Maximum number of results to return"),
        nextPageToken: z
          .string()
          .optional()
          .describe("Pagination token for next page of results"),
      }),
      async run(args) {
        try {
          const command = new GetTagsCommand({
            TimePeriod: {
              Start: args.timePeriod.start,
              End: args.timePeriod.end,
            },
            TagKey: args.tagKey,
            SearchString: args.searchString,
            Filter: args.filter
              ? {
                  Dimensions: args.filter.dimensions
                    ? {
                        Key: args.filter.dimensions.key,
                        Values: args.filter.dimensions.values,
                        MatchOptions: args.filter.dimensions.matchOptions,
                      }
                    : undefined,
                  Tags: args.filter.tags
                    ? {
                        Key: args.filter.tags.key,
                        Values: args.filter.tags.values,
                        MatchOptions: args.filter.tags.matchOptions,
                      }
                    : undefined,
                }
              : undefined,
            SortBy: args.sortBy?.map((sb) => ({
              Key: sb.key,
              SortOrder: sb.sortOrder,
            })),
            MaxResults: args.maxResults,
            NextPageToken: args.nextPageToken,
          })

          const response = await getCostExplorerClient(args.region).send(
            command,
          )

          return {
            tags: response.Tags || [],
            count: response.Tags?.length || 0,
            returnSize: response.ReturnSize,
            totalSize: response.TotalSize,
            nextPageToken: response.NextPageToken,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cost_get-tags",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_cost_get-savings-plans-utilization",
      description:
        "Get Savings Plans utilization for your account across date ranges",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        timePeriod: z
          .object({
            start: z.string().describe("Start date in YYYY-MM-DD format"),
            end: z.string().describe("End date in YYYY-MM-DD format"),
          })
          .describe("Time period for the utilization data"),
        granularity: z
          .enum(["DAILY", "MONTHLY"])
          .optional()
          .describe("Granularity of the utilization data"),
        filter: z
          .object({
            dimensions: z
              .object({
                key: z.enum([
                  "LINKED_ACCOUNT",
                  "SAVINGS_PLAN_ARN",
                  "SAVINGS_PLANS_TYPE",
                  "REGION",
                  "PAYMENT_OPTION",
                ]),
                values: z.array(z.string()),
                matchOptions: z
                  .array(
                    z.enum([
                      "EQUALS",
                      "ABSENT",
                      "STARTS_WITH",
                      "ENDS_WITH",
                      "CONTAINS",
                      "CASE_SENSITIVE",
                      "CASE_INSENSITIVE",
                    ]),
                  )
                  .optional(),
              })
              .optional(),
            tags: z
              .object({
                key: z.string(),
                values: z.array(z.string()),
                matchOptions: z
                  .array(
                    z.enum([
                      "EQUALS",
                      "ABSENT",
                      "STARTS_WITH",
                      "ENDS_WITH",
                      "CONTAINS",
                      "CASE_SENSITIVE",
                      "CASE_INSENSITIVE",
                    ]),
                  )
                  .optional(),
              })
              .optional(),
          })
          .optional()
          .describe("Filter to apply to the utilization data"),
        sortBy: z
          .object({
            key: z.string(),
            sortOrder: z.enum(["ASCENDING", "DESCENDING"]).optional(),
          })
          .optional()
          .describe("Sort order for results"),
      }),
      async run(args) {
        try {
          const command = new GetSavingsPlansUtilizationCommand({
            TimePeriod: {
              Start: args.timePeriod.start,
              End: args.timePeriod.end,
            },
            Granularity: args.granularity,
            Filter: args.filter
              ? {
                  Dimensions: args.filter.dimensions
                    ? {
                        Key: args.filter.dimensions.key,
                        Values: args.filter.dimensions.values,
                        MatchOptions: args.filter.dimensions.matchOptions,
                      }
                    : undefined,
                  Tags: args.filter.tags
                    ? {
                        Key: args.filter.tags.key,
                        Values: args.filter.tags.values,
                        MatchOptions: args.filter.tags.matchOptions,
                      }
                    : undefined,
                }
              : undefined,
            SortBy: args.sortBy
              ? {
                  Key: args.sortBy.key,
                  SortOrder: args.sortBy.sortOrder,
                }
              : undefined,
          })

          const response = await getCostExplorerClient(args.region).send(
            command,
          )

          const savingsPlansUtilizationsByTime =
            response.SavingsPlansUtilizationsByTime?.map((util) => ({
              timePeriod: {
                start: util.TimePeriod?.Start,
                end: util.TimePeriod?.End,
              },
              utilization: util.Utilization
                ? {
                    totalCommitment: util.Utilization.TotalCommitment,
                    usedCommitment: util.Utilization.UsedCommitment,
                    unusedCommitment: util.Utilization.UnusedCommitment,
                    utilizationPercentage:
                      util.Utilization.UtilizationPercentage,
                  }
                : undefined,
              savings: util.Savings
                ? {
                    netSavings: util.Savings.NetSavings,
                    onDemandCostEquivalent: util.Savings.OnDemandCostEquivalent,
                  }
                : undefined,
              amortizedCommitment: util.AmortizedCommitment
                ? {
                    amortizedRecurringCommitment:
                      util.AmortizedCommitment.AmortizedRecurringCommitment,
                    amortizedUpfrontCommitment:
                      util.AmortizedCommitment.AmortizedUpfrontCommitment,
                    totalAmortizedCommitment:
                      util.AmortizedCommitment.TotalAmortizedCommitment,
                  }
                : undefined,
            })) || []

          return {
            savingsPlansUtilizationsByTime,
            count: savingsPlansUtilizationsByTime.length,
            total: response.Total
              ? {
                  utilization: response.Total.Utilization
                    ? {
                        totalCommitment:
                          response.Total.Utilization.TotalCommitment,
                        usedCommitment:
                          response.Total.Utilization.UsedCommitment,
                        unusedCommitment:
                          response.Total.Utilization.UnusedCommitment,
                        utilizationPercentage:
                          response.Total.Utilization.UtilizationPercentage,
                      }
                    : undefined,
                  savings: response.Total.Savings
                    ? {
                        netSavings: response.Total.Savings.NetSavings,
                        onDemandCostEquivalent:
                          response.Total.Savings.OnDemandCostEquivalent,
                      }
                    : undefined,
                  amortizedCommitment: response.Total.AmortizedCommitment
                    ? {
                        amortizedRecurringCommitment:
                          response.Total.AmortizedCommitment
                            .AmortizedRecurringCommitment,
                        amortizedUpfrontCommitment:
                          response.Total.AmortizedCommitment
                            .AmortizedUpfrontCommitment,
                        totalAmortizedCommitment:
                          response.Total.AmortizedCommitment
                            .TotalAmortizedCommitment,
                      }
                    : undefined,
                }
              : undefined,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cost_get-savings-plans-utilization",
            toolArgs: args,
          })
        }
      },
    }),
  ]
}
