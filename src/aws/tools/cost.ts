import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  GetUsageStatisticsCommand,
  GetDimensionValuesCommand,
  GetRightsizingRecommendationCommand,
  GetSavingsUtilizationCommand,
  GetReservationCoverageCommand,
  GetReservationPurchaseRecommendationCommand,
  ListCostCategoryDefinitionsCommand,
} from "@aws-sdk/client-cost-explorer";
import { z } from "zod";
import { tool } from "../../tool";
import type { AWSConfig } from "../auth";
import { createAWSCredentials, getAWSRegion } from "../auth";

export function createCostTools(config?: AWSConfig) {
  const credentials = createAWSCredentials(config);
  const region = getAWSRegion(config);

  const costExplorerClient = new CostExplorerClient({
    region,
    credentials,
  });

  return [
    tool({
      name: "aws:cost:get-cost-and-usage",
      description: "Get cost and usage data for your AWS account",
      args: z.object({
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
            ])
          )
          .describe("Cost metrics to retrieve"),
        groupBy: z
          .array(
            z.object({
              type: z.enum(["DIMENSION", "TAG", "COST_CATEGORY"]),
              key: z
                .string()
                .describe("Group by key (e.g., SERVICE, AZ, INSTANCE_TYPE)"),
            })
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
                    ])
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
                    ])
                  )
                  .optional(),
              })
              .optional(),
          })
          .optional()
          .describe("Filter to apply to the cost data"),
      }),
      async run(args = {}) {
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
          });

          const response = await costExplorerClient.send(command);

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
                    ])
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
                      ])
                    )
                  : undefined,
              })),
              estimated: result.Estimated,
            })) || [];

          return {
            resultsByTime,
            count: resultsByTime.length,
            groupDefinitions: response.GroupDefinitions?.map((gd) => ({
              type: gd.Type,
              key: gd.Key,
            })),
            nextPageToken: response.NextPageToken,
          };
        } catch (error) {
          throw new Error(
            `Cost Explorer get cost and usage failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:cost:get-dimension-values",
      description: "Get available values for a cost dimension",
      args: z.object({
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
            })
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
      async run(args = {}) {
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
          });

          const response = await costExplorerClient.send(command);

          const dimensionValues =
            response.DimensionValues?.map((dv) => ({
              value: dv.Value,
              attributes: dv.Attributes,
              matchOptions: dv.MatchOptions,
            })) || [];

          return {
            dimension: args.dimension,
            dimensionValues,
            count: dimensionValues.length,
            returnSize: response.ReturnSize,
            totalSize: response.TotalSize,
            nextPageToken: response.NextPageToken,
          };
        } catch (error) {
          throw new Error(
            `Cost Explorer get dimension values failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:cost:get-rightsizing-recommendation",
      description: "Get rightsizing recommendations for EC2 instances",
      args: z.object({
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
                    ])
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
      async run(args = {}) {
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
          });

          const response = await costExplorerClient.send(command);

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
                    savingsPlanseCoveredHoursInLookbackPeriod:
                      rec.CurrentInstance
                        .SavingsPlanseCoveredHoursInLookbackPeriod,
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
                        })
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
            })) || [];

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
          };
        } catch (error) {
          throw new Error(
            `Cost Explorer get rightsizing recommendation failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:cost:get-monthly-spend-summary",
      description:
        "Get a simplified monthly spend summary for the last N months",
      args: z.object({
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
      async run(args = {}) {
        try {
          const endDate = new Date();
          const startDate = new Date();
          startDate.setMonth(endDate.getMonth() - (args.months || 6));

          const command = new GetCostAndUsageCommand({
            TimePeriod: {
              Start: startDate.toISOString().split("T")[0],
              End: endDate.toISOString().split("T")[0],
            },
            Granularity: "MONTHLY",
            Metrics: ["BlendedCost"],
            GroupBy:
              args.groupByService ?? true
                ? [
                    {
                      Type: "DIMENSION",
                      Key: "SERVICE",
                    },
                  ]
                : undefined,
          });

          const response = await costExplorerClient.send(command);

          const monthlyData =
            response.ResultsByTime?.map((result) => {
              const totalCost = result.Total?.BlendedCost?.Amount || "0";
              const month = result.TimePeriod?.Start || "";

              const serviceBreakdown =
                result.Groups?.map((group) => ({
                  service: group.Keys?.[0] || "Unknown",
                  cost: parseFloat(group.Metrics?.BlendedCost?.Amount || "0"),
                  unit: group.Metrics?.BlendedCost?.Unit || "USD",
                })).sort((a, b) => b.cost - a.cost) || [];

              return {
                month,
                totalCost: parseFloat(totalCost),
                unit: result.Total?.BlendedCost?.Unit || "USD",
                serviceBreakdown:
                  args.groupByService ?? true ? serviceBreakdown : undefined,
                topServices:
                  args.groupByService ?? true
                    ? serviceBreakdown.slice(0, 5)
                    : undefined,
              };
            }) || [];

          const totalSpend = monthlyData.reduce(
            (sum, month) => sum + month.totalCost,
            0
          );
          const averageMonthlySpend =
            totalSpend / Math.max(monthlyData.length, 1);

          return {
            summary: {
              totalSpend,
              averageMonthlySpend,
              currency: monthlyData[0]?.unit || "USD",
              period: `${args.months || 6} months`,
            },
            monthlyData,
            count: monthlyData.length,
          };
        } catch (error) {
          throw new Error(
            `Cost Explorer monthly spend summary failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:cost:get-service-costs",
      description: "Get cost breakdown for specific AWS services you use",
      args: z.object({
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
            ])
          )
          .optional()
          .describe(
            "Specific services to analyze (if not provided, analyzes all your services)"
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
      async run(
        args = {
          months: 3,
          granularity: "MONTHLY" as const,
          includeUsage: false,
        }
      ) {
        try {
          const endDate = new Date();
          endDate.setUTCHours(0, 0, 0, 0);
          const startDate = new Date(endDate);
          startDate.setMonth(startDate.getMonth() - args.months);

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
          ];

          const servicesToAnalyze = args.services || allYourServices;

          const metrics = args.includeUsage
            ? ["BlendedCost", "UsageQuantity"]
            : ["BlendedCost"];

          const command = new GetCostAndUsageCommand({
            TimePeriod: {
              Start: startDate.toISOString().split("T")[0],
              End: endDate.toISOString().split("T")[0],
            },
            Granularity: args.granularity,
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
          });

          const response = await costExplorerClient.send(command);

          const serviceAnalysis = new Map();

          // Process results by time period
          response.ResultsByTime?.forEach((result) => {
            const timePeriod = {
              start: result.TimePeriod?.Start,
              end: result.TimePeriod?.End,
            };

            result.Groups?.forEach((group) => {
              const serviceName = group.Keys?.[0];
              if (!serviceName) return;

              if (!serviceAnalysis.has(serviceName)) {
                serviceAnalysis.set(serviceName, {
                  serviceName,
                  totalCost: 0,
                  totalUsage: 0,
                  timePeriods: [],
                  averageMonthlyCost: 0,
                  currency: "USD",
                });
              }

              const service = serviceAnalysis.get(serviceName);
              const cost = parseFloat(
                group.Metrics?.BlendedCost?.Amount || "0"
              );
              const usage = parseFloat(
                group.Metrics?.UsageQuantity?.Amount || "0"
              );

              service.totalCost += cost;
              service.totalUsage += usage;
              service.currency = group.Metrics?.BlendedCost?.Unit || "USD";

              service.timePeriods.push({
                ...timePeriod,
                cost,
                usage: args.includeUsage ? usage : undefined,
                usageUnit: args.includeUsage
                  ? group.Metrics?.UsageQuantity?.Unit
                  : undefined,
              });
            });
          });

          // Calculate averages and sort
          const serviceResults = Array.from(serviceAnalysis.values())
            .map((service) => ({
              ...service,
              averageMonthlyCost:
                service.totalCost / Math.max(service.timePeriods.length, 1),
              hasData: service.totalCost > 0 || service.totalUsage > 0,
            }))
            .sort((a, b) => b.totalCost - a.totalCost);

          // Summary statistics
          const totalCost = serviceResults.reduce(
            (sum, service) => sum + service.totalCost,
            0
          );
          const servicesWithCosts = serviceResults.filter((s) => s.hasData);
          const topServices = servicesWithCosts.slice(0, 10);

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
          };
        } catch (error) {
          throw new Error(
            `Cost Explorer service costs analysis failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),
  ];
}
