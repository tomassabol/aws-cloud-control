import {
  CloudFrontClient,
  GetCachePolicyCommand,
  GetDistributionCommand,
  GetDistributionConfigCommand,
  GetInvalidationCommand,
  GetOriginRequestPolicyCommand,
  GetResponseHeadersPolicyCommand,
  ListCachePoliciesCommand,
  ListDistributionsCommand,
  ListInvalidationsCommand,
  ListOriginAccessControlsCommand,
  ListOriginRequestPoliciesCommand,
  ListResponseHeadersPoliciesCommand,
} from "@aws-sdk/client-cloudfront"
import { z } from "zod"

import {
  AWS_REGIONS,
  type AwsRegion,
  DEFAULT_AWS_REGION,
} from "~/utils/aws-region"
import { type Tool, tool } from "~/utils/tool"
import { ToolError } from "~/utils/tool-error"

export function createCloudFrontTools(): Tool[] {
  const getCloudFrontClient = (region: AwsRegion = DEFAULT_AWS_REGION) => {
    return new CloudFrontClient({ region })
  }

  return [
    tool({
      name: "aws_cloudfront_list_distributions",
      description:
        "List CloudFront distributions (optional alias/domain filter)",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        maxItems: z
          .number()
          .min(1)
          .max(1000)
          .optional()
          .describe("Maximum number of distributions to return"),
        marker: z.string().optional().describe("Pagination token"),
        filter: z
          .string()
          .optional()
          .describe("Substring filter for alias or domain"),
      }),
      async run(args) {
        try {
          const command = new ListDistributionsCommand({
            Marker: args.marker,
            MaxItems: args.maxItems,
          })

          const response = await getCloudFrontClient(args.region).send(command)

          const items = response.DistributionList?.Items || []
          const results = items
            .map((d) => ({
              id: d.Id,
              domainName: d.DomainName,
              aliases: d.Aliases?.Items || [],
              enabled: d.Enabled,
              status: d.Status,
              lastModifiedTime: d.LastModifiedTime?.toISOString(),
              comment: d.Comment,
              isIpv6Enabled: d.IsIPV6Enabled,
              webAclId: d.WebACLId,
              priceClass: d.PriceClass,
              originsCount: d.Origins?.Items?.length || 0,
            }))
            .filter((r) => {
              if (!args.filter) return true
              const { filter } = args
              return (
                (r.domainName && r.domainName.includes(filter)) ||
                r.aliases?.some((a) => a.includes(filter))
              )
            })

          return {
            distributions: results,
            count: results.length,
            isTruncated: response.DistributionList?.IsTruncated,
            nextMarker: response.DistributionList?.NextMarker,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cloudfront_list_distributions",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_cloudfront_get_distribution",
      description: "Get details for a CloudFront distribution",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        id: z.string().describe("Distribution ID"),
      }),
      async run(args) {
        try {
          const command = new GetDistributionCommand({
            Id: args.id,
          })

          const response = await getCloudFrontClient(args.region).send(command)

          const dist = response.Distribution
          if (!dist) {
            throw new ToolError({
              message: "Distribution not found",
              toolName: "aws_cloudfront_get_distribution",
              toolArgs: args,
            })
          }

          const config = dist.DistributionConfig

          return {
            id: dist.Id,
            domainName: dist.DomainName,
            status: dist.Status,
            enabled: config?.Enabled,
            aliases: config?.Aliases?.Items || [],
            origins: config?.Origins?.Items?.map((o) => ({
              id: o.Id,
              domainName: o.DomainName,
              originPath: o.OriginPath,
              customHeaders: o.CustomHeaders?.Items?.map((h) => ({
                headerName: h.HeaderName,
                headerValue: h.HeaderValue,
              })),
            })),
            defaultCacheBehavior: config?.DefaultCacheBehavior
              ? {
                  targetOriginId: config.DefaultCacheBehavior.TargetOriginId,
                  viewerProtocolPolicy:
                    config.DefaultCacheBehavior.ViewerProtocolPolicy,
                  allowedMethods:
                    config.DefaultCacheBehavior.AllowedMethods?.Items,
                  cachedMethods:
                    config.DefaultCacheBehavior.AllowedMethods?.CachedMethods
                      ?.Items,
                  cachePolicyId: config.DefaultCacheBehavior.CachePolicyId,
                  originRequestPolicyId:
                    config.DefaultCacheBehavior.OriginRequestPolicyId,
                  responseHeadersPolicyId:
                    config.DefaultCacheBehavior.ResponseHeadersPolicyId,
                  compress: config.DefaultCacheBehavior.Compress,
                  minTtl: config.DefaultCacheBehavior.MinTTL,
                }
              : undefined,
            etag: response.ETag,
            lastModifiedTime: dist.LastModifiedTime?.toISOString(),
            comment: config?.Comment,
            isIpv6Enabled: config?.IsIPV6Enabled,
            webAclId: config?.WebACLId,
            priceClass: config?.PriceClass,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cloudfront_get_distribution",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_cloudfront_get_distribution_config",
      description: "Get configuration for a CloudFront distribution",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        id: z.string().describe("Distribution ID"),
      }),
      async run(args) {
        try {
          const command = new GetDistributionConfigCommand({
            Id: args.id,
          })

          const response = await getCloudFrontClient(args.region).send(command)

          return {
            config: response.DistributionConfig,
            etag: response.ETag,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cloudfront_get_distribution_config",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_cloudfront_list_invalidations",
      description: "List invalidations for a CloudFront distribution",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        distributionId: z.string().describe("Distribution ID"),
        maxItems: z
          .number()
          .min(1)
          .max(1000)
          .optional()
          .describe("Maximum number of invalidations to return"),
        marker: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new ListInvalidationsCommand({
            DistributionId: args.distributionId,
            MaxItems: args.maxItems,
            Marker: args.marker,
          })

          const response = await getCloudFrontClient(args.region).send(command)

          const invalidations =
            response.InvalidationList?.Items?.map((inv) => ({
              id: inv.Id,
              createTime: inv.CreateTime?.toISOString(),
              status: inv.Status,
            })) || []

          return {
            invalidations,
            count: invalidations.length,
            isTruncated: response.InvalidationList?.IsTruncated,
            nextMarker: response.InvalidationList?.NextMarker,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cloudfront_list_invalidations",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_cloudfront_get_invalidation",
      description: "Get details for a CloudFront invalidation",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        distributionId: z.string().describe("Distribution ID"),
        invalidationId: z.string().describe("Invalidation ID"),
      }),
      async run(args) {
        try {
          const command = new GetInvalidationCommand({
            DistributionId: args.distributionId,
            Id: args.invalidationId,
          })

          const response = await getCloudFrontClient(args.region).send(command)

          const inv = response.Invalidation
          if (!inv) {
            throw new ToolError({
              message: "Invalidation not found",
              toolName: "aws_cloudfront_get_invalidation",
              toolArgs: args,
            })
          }

          return {
            id: inv.Id,
            status: inv.Status,
            createTime: inv.CreateTime?.toISOString(),
            callerReference: inv.InvalidationBatch?.CallerReference,
            items: inv.InvalidationBatch?.Paths?.Items || [],
            quantity: inv.InvalidationBatch?.Paths?.Quantity,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cloudfront_get_invalidation",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_cloudfront_list_cache_policies",
      description: "List CloudFront cache policies",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        type: z
          .enum(["managed", "custom"])
          .optional()
          .describe("Policy type filter"),
        maxItems: z
          .number()
          .min(1)
          .max(1000)
          .optional()
          .describe("Maximum number of policies to return"),
        marker: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new ListCachePoliciesCommand({
            Type: args.type,
            MaxItems: args.maxItems,
            Marker: args.marker,
          })

          const response = await getCloudFrontClient(args.region).send(command)

          const policies =
            response.CachePolicyList?.Items?.map((p) => ({
              id: p.CachePolicy?.Id,
              name: p.CachePolicy?.CachePolicyConfig?.Name,
              type: p.Type,
              lastModifiedTime: p.CachePolicy?.LastModifiedTime?.toISOString(),
            })) || []

          return {
            policies,
            count: policies.length,
            isTruncated: !!response.CachePolicyList?.NextMarker,
            nextMarker: response.CachePolicyList?.NextMarker,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cloudfront_list_cache_policies",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_cloudfront_get_cache_policy",
      description: "Get details for a CloudFront cache policy",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        id: z.string().describe("Cache policy ID"),
      }),
      async run(args) {
        try {
          const command = new GetCachePolicyCommand({
            Id: args.id,
          })

          const response = await getCloudFrontClient(args.region).send(command)

          const policy = response.CachePolicy
          if (!policy) {
            throw new ToolError({
              message: "Cache policy not found",
              toolName: "aws_cloudfront_get_cache_policy",
              toolArgs: args,
            })
          }

          return {
            config: policy.CachePolicyConfig,
            etag: response.ETag,
            lastModifiedTime: policy.LastModifiedTime?.toISOString(),
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cloudfront_get_cache_policy",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_cloudfront_list_origin_request_policies",
      description: "List CloudFront origin request policies",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        type: z
          .enum(["managed", "custom"])
          .optional()
          .describe("Policy type filter"),
        maxItems: z
          .number()
          .min(1)
          .max(1000)
          .optional()
          .describe("Maximum number of policies to return"),
        marker: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new ListOriginRequestPoliciesCommand({
            Type: args.type,
            MaxItems: args.maxItems,
            Marker: args.marker,
          })

          const response = await getCloudFrontClient(args.region).send(command)

          const policies =
            response.OriginRequestPolicyList?.Items?.map((p) => ({
              id: p.OriginRequestPolicy?.Id,
              name: p.OriginRequestPolicy?.OriginRequestPolicyConfig?.Name,
              type: p.Type,
              lastModifiedTime:
                p.OriginRequestPolicy?.LastModifiedTime?.toISOString(),
            })) || []

          return {
            policies,
            count: policies.length,
            isTruncated: !!response.OriginRequestPolicyList?.NextMarker,
            nextMarker: response.OriginRequestPolicyList?.NextMarker,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cloudfront_list_origin_request_policies",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_cloudfront_get_origin_request_policy",
      description: "Get details for a CloudFront origin request policy",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        id: z.string().describe("Origin request policy ID"),
      }),
      async run(args) {
        try {
          const command = new GetOriginRequestPolicyCommand({
            Id: args.id,
          })

          const response = await getCloudFrontClient(args.region).send(command)

          const policy = response.OriginRequestPolicy
          if (!policy) {
            throw new ToolError({
              message: "Origin request policy not found",
              toolName: "aws_cloudfront_get_origin_request_policy",
              toolArgs: args,
            })
          }

          return {
            config: policy.OriginRequestPolicyConfig,
            etag: response.ETag,
            lastModifiedTime: policy.LastModifiedTime?.toISOString(),
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cloudfront_get_origin_request_policy",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_cloudfront_list_response_headers_policies",
      description: "List CloudFront response headers policies",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        type: z
          .enum(["managed", "custom"])
          .optional()
          .describe("Policy type filter"),
        maxItems: z
          .number()
          .min(1)
          .max(1000)
          .optional()
          .describe("Maximum number of policies to return"),
        marker: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new ListResponseHeadersPoliciesCommand({
            Type: args.type,
            MaxItems: args.maxItems,
            Marker: args.marker,
          })

          const response = await getCloudFrontClient(args.region).send(command)

          const policies =
            response.ResponseHeadersPolicyList?.Items?.map((p) => ({
              id: p.ResponseHeadersPolicy?.Id,
              name: p.ResponseHeadersPolicy?.ResponseHeadersPolicyConfig?.Name,
              type: p.Type,
              lastModifiedTime:
                p.ResponseHeadersPolicy?.LastModifiedTime?.toISOString(),
            })) || []

          return {
            policies,
            count: policies.length,
            isTruncated: !!response.ResponseHeadersPolicyList?.NextMarker,
            nextMarker: response.ResponseHeadersPolicyList?.NextMarker,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cloudfront_list_response_headers_policies",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_cloudfront_get_response_headers_policy",
      description: "Get details for a CloudFront response headers policy",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        id: z.string().describe("Response headers policy ID"),
      }),
      async run(args) {
        try {
          const command = new GetResponseHeadersPolicyCommand({
            Id: args.id,
          })

          const response = await getCloudFrontClient(args.region).send(command)

          const policy = response.ResponseHeadersPolicy
          if (!policy) {
            throw new ToolError({
              message: "Response headers policy not found",
              toolName: "aws_cloudfront_get_response_headers_policy",
              toolArgs: args,
            })
          }

          return {
            config: policy.ResponseHeadersPolicyConfig,
            etag: response.ETag,
            lastModifiedTime: policy.LastModifiedTime?.toISOString(),
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cloudfront_get_response_headers_policy",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_cloudfront_list_origin_access_controls",
      description: "List CloudFront origin access controls",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        maxItems: z
          .number()
          .min(1)
          .max(1000)
          .optional()
          .describe("Maximum number of OACs to return"),
        marker: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new ListOriginAccessControlsCommand({
            MaxItems: args.maxItems,
            Marker: args.marker,
          })

          const response = await getCloudFrontClient(args.region).send(command)

          const oacs =
            response.OriginAccessControlList?.Items?.map((oac) => {
              // Need to get the full OAC to access config
              return {
                id: oac.Id,
                name: oac.Name,
                signingBehavior: oac.SigningBehavior,
                signingProtocol: oac.SigningProtocol,
                description: oac.Description,
                originType: oac.OriginAccessControlOriginType,
              }
            }) || []

          return {
            originAccessControls: oacs,
            count: oacs.length,
            isTruncated: response.OriginAccessControlList?.IsTruncated,
            nextMarker: response.OriginAccessControlList?.NextMarker,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_cloudfront_list_origin_access_controls",
            toolArgs: args,
          })
        }
      },
    }),
  ]
}
