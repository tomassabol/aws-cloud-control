import {
  DescribeCapacityProvidersCommand,
  DescribeClustersCommand,
  DescribeContainerInstancesCommand,
  DescribeServicesCommand,
  DescribeTaskDefinitionCommand,
  DescribeTasksCommand,
  ECSClient,
  ListClustersCommand,
  ListContainerInstancesCommand,
  ListServicesCommand,
  ListTagsForResourceCommand,
  ListTaskDefinitionFamiliesCommand,
  ListTaskDefinitionsCommand,
  ListTasksCommand,
} from "@aws-sdk/client-ecs"
import { z } from "zod"

import {
  AWS_REGIONS,
  type AwsRegion,
  DEFAULT_AWS_REGION,
} from "~/utils/aws-region"
import { type Tool, tool } from "~/utils/tool"
import { ToolError } from "~/utils/tool-error"

export function createECSTools(): Tool[] {
  const getECSClient = (region: AwsRegion = DEFAULT_AWS_REGION) => {
    return new ECSClient({ region })
  }

  return [
    tool({
      name: "aws_ecs_list_clusters",
      description: "List all ECS clusters in the account",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        maxResults: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum number of clusters to return"),
        nextToken: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new ListClustersCommand({
            maxResults: args.maxResults,
            nextToken: args.nextToken,
          })

          const response = await getECSClient(args.region).send(command)

          return {
            clusterArns: response.clusterArns || [],
            count: response.clusterArns?.length || 0,
            nextToken: response.nextToken,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ecs_list_clusters",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_ecs_describe_clusters",
      description: "Get detailed information about ECS clusters",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        clusterArns: z
          .array(z.string())
          .describe("Array of cluster ARNs or names to describe"),
        include: z
          .array(
            z.enum([
              "ATTACHMENTS",
              "CONFIGURATIONS",
              "SETTINGS",
              "STATISTICS",
              "TAGS",
            ]),
          )
          .optional()
          .describe("Additional information to include"),
      }),
      async run(args) {
        try {
          const command = new DescribeClustersCommand({
            clusters: args.clusterArns,
            include: args.include,
          })

          const response = await getECSClient(args.region).send(command)

          const clusters =
            response.clusters?.map((cluster) => ({
              clusterArn: cluster.clusterArn,
              clusterName: cluster.clusterName,
              status: cluster.status,
              runningTasksCount: cluster.runningTasksCount,
              pendingTasksCount: cluster.pendingTasksCount,
              activeServicesCount: cluster.activeServicesCount,
              registeredContainerInstancesCount:
                cluster.registeredContainerInstancesCount,
              capacityProviders: cluster.capacityProviders,
              defaultCapacityProviderStrategy:
                cluster.defaultCapacityProviderStrategy,
              attachments: cluster.attachments?.map((att) => ({
                id: att.id,
                type: att.type,
                status: att.status,
                details: att.details,
              })),
              settings: cluster.settings?.map((s) => ({
                name: s.name,
                value: s.value,
              })),
              statistics: cluster.statistics?.map((s) => ({
                name: s.name,
                value: s.value,
              })),
              tags: cluster.tags?.map((t) => ({
                key: t.key,
                value: t.value,
              })),
            })) || []

          return {
            clusters,
            count: clusters.length,
            failures: response.failures?.map((f) => ({
              arn: f.arn,
              reason: f.reason,
            })),
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ecs_describe_clusters",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_ecs_list_services",
      description: "List services in an ECS cluster",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        cluster: z.string().describe("Cluster name or ARN"),
        maxResults: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum number of services to return"),
        nextToken: z.string().optional().describe("Pagination token"),
        launchType: z
          .enum(["EC2", "FARGATE", "EXTERNAL"])
          .optional()
          .describe("Filter by launch type"),
        schedulingStrategy: z
          .enum(["REPLICA", "DAEMON"])
          .optional()
          .describe("Filter by scheduling strategy"),
      }),
      async run(args) {
        try {
          const command = new ListServicesCommand({
            cluster: args.cluster,
            maxResults: args.maxResults,
            nextToken: args.nextToken,
            launchType: args.launchType,
            schedulingStrategy: args.schedulingStrategy,
          })

          const response = await getECSClient(args.region).send(command)

          return {
            serviceArns: response.serviceArns || [],
            count: response.serviceArns?.length || 0,
            nextToken: response.nextToken,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ecs_list_services",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_ecs_describe_services",
      description: "Get detailed information about ECS services",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        cluster: z.string().describe("Cluster name or ARN"),
        services: z
          .array(z.string())
          .describe("Array of service names or ARNs to describe"),
        include: z
          .array(z.enum(["TAGS"]))
          .optional()
          .describe("Additional information to include"),
      }),
      async run(args) {
        try {
          const command = new DescribeServicesCommand({
            cluster: args.cluster,
            services: args.services,
            include: args.include,
          })

          const response = await getECSClient(args.region).send(command)

          const services =
            response.services?.map((service) => ({
              serviceArn: service.serviceArn,
              serviceName: service.serviceName,
              clusterArn: service.clusterArn,
              status: service.status,
              desiredCount: service.desiredCount,
              runningCount: service.runningCount,
              pendingCount: service.pendingCount,
              launchType: service.launchType,
              taskDefinition: service.taskDefinition,
              platformVersion: service.platformVersion,
              platformFamily: service.platformFamily,
              networkConfiguration: service.networkConfiguration
                ? {
                    awsvpcConfiguration: service.networkConfiguration
                      .awsvpcConfiguration
                      ? {
                          subnets:
                            service.networkConfiguration.awsvpcConfiguration
                              .subnets,
                          securityGroups:
                            service.networkConfiguration.awsvpcConfiguration
                              .securityGroups,
                          assignPublicIp:
                            service.networkConfiguration.awsvpcConfiguration
                              .assignPublicIp,
                        }
                      : undefined,
                  }
                : undefined,
              loadBalancers: service.loadBalancers?.map((lb) => ({
                targetGroupArn: lb.targetGroupArn,
                loadBalancerName: lb.loadBalancerName,
                containerName: lb.containerName,
                containerPort: lb.containerPort,
              })),
              serviceRegistries: service.serviceRegistries?.map((sr) => ({
                registryArn: sr.registryArn,
                port: sr.port,
                containerName: sr.containerName,
                containerPort: sr.containerPort,
              })),
              deployments: service.deployments?.map((d) => ({
                id: d.id,
                status: d.status,
                taskDefinition: d.taskDefinition,
                desiredCount: d.desiredCount,
                runningCount: d.runningCount,
                pendingCount: d.pendingCount,
                failedTasks: d.failedTasks,
                createdAt: d.createdAt?.toISOString(),
                updatedAt: d.updatedAt?.toISOString(),
                capacityProviderStrategy: d.capacityProviderStrategy,
                launchType: d.launchType,
                platformVersion: d.platformVersion,
                platformFamily: d.platformFamily,
                networkConfiguration: d.networkConfiguration
                  ? {
                      awsvpcConfiguration: d.networkConfiguration
                        .awsvpcConfiguration
                        ? {
                            subnets:
                              d.networkConfiguration.awsvpcConfiguration
                                .subnets,
                            securityGroups:
                              d.networkConfiguration.awsvpcConfiguration
                                .securityGroups,
                            assignPublicIp:
                              d.networkConfiguration.awsvpcConfiguration
                                .assignPublicIp,
                          }
                        : undefined,
                    }
                  : undefined,
                rolloutState: d.rolloutState,
                rolloutStateReason: d.rolloutStateReason,
              })),
              roleArn: service.roleArn,
              events: service.events?.slice(0, 10).map((e) => ({
                id: e.id,
                createdAt: e.createdAt?.toISOString(),
                message: e.message,
              })),
              createdAt: service.createdAt?.toISOString(),
              placementConstraints: service.placementConstraints,
              placementStrategy: service.placementStrategy,
              tags: service.tags?.map((t) => ({
                key: t.key,
                value: t.value,
              })),
            })) || []

          return {
            services,
            count: services.length,
            failures: response.failures?.map((f) => ({
              arn: f.arn,
              reason: f.reason,
            })),
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ecs_describe_services",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_ecs_list_tasks",
      description: "List tasks in an ECS cluster",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        cluster: z.string().describe("Cluster name or ARN"),
        serviceName: z.string().optional().describe("Filter by service name"),
        desiredStatus: z
          .enum(["RUNNING", "PENDING", "STOPPED"])
          .optional()
          .describe("Filter by desired status"),
        launchType: z
          .enum(["EC2", "FARGATE", "EXTERNAL"])
          .optional()
          .describe("Filter by launch type"),
        maxResults: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum number of tasks to return"),
        nextToken: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new ListTasksCommand({
            cluster: args.cluster,
            serviceName: args.serviceName,
            desiredStatus: args.desiredStatus,
            launchType: args.launchType,
            maxResults: args.maxResults,
            nextToken: args.nextToken,
          })

          const response = await getECSClient(args.region).send(command)

          return {
            taskArns: response.taskArns || [],
            count: response.taskArns?.length || 0,
            nextToken: response.nextToken,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ecs_list_tasks",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_ecs_describe_tasks",
      description: "Get detailed information about ECS tasks",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        cluster: z.string().describe("Cluster name or ARN"),
        taskArns: z
          .array(z.string())
          .describe("Array of task ARNs to describe"),
        include: z
          .array(z.enum(["TAGS"]))
          .optional()
          .describe("Additional information to include"),
      }),
      async run(args) {
        try {
          const command = new DescribeTasksCommand({
            cluster: args.cluster,
            tasks: args.taskArns,
            include: args.include,
          })

          const response = await getECSClient(args.region).send(command)

          const tasks =
            response.tasks?.map((task) => ({
              taskArn: task.taskArn,
              clusterArn: task.clusterArn,
              taskDefinitionArn: task.taskDefinitionArn,
              lastStatus: task.lastStatus,
              desiredStatus: task.desiredStatus,
              cpu: task.cpu,
              memory: task.memory,
              containers: task.containers?.map((c) => ({
                containerArn: c.containerArn,
                taskArn: c.taskArn,
                name: c.name,
                image: c.image,
                imageDigest: c.imageDigest,
                lastStatus: c.lastStatus,
                exitCode: c.exitCode,
                reason: c.reason,
                cpu: c.cpu,
                memory: c.memory,
                memoryReservation: c.memoryReservation,
                networkBindings: c.networkBindings?.map((nb) => ({
                  bindIP: nb.bindIP,
                  containerPort: nb.containerPort,
                  hostPort: nb.hostPort,
                  protocol: nb.protocol,
                })),
                networkInterfaces: c.networkInterfaces?.map((ni) => ({
                  attachmentId: ni.attachmentId,
                  privateIpv4Address: ni.privateIpv4Address,
                  ipv6Address: ni.ipv6Address,
                })),
                healthStatus: c.healthStatus,
                managedAgents: c.managedAgents?.map((ma) => ({
                  name: ma.name,
                  lastStartedAt: ma.lastStartedAt?.toISOString(),
                  lastStatus: ma.lastStatus,
                  reason: ma.reason,
                })),
              })),
              startedAt: task.startedAt?.toISOString(),
              startedBy: task.startedBy,
              stopCode: task.stopCode,
              stoppedAt: task.stoppedAt?.toISOString(),
              stoppedReason: task.stoppedReason,
              connectivity: task.connectivity,
              connectivityAt: task.connectivityAt?.toISOString(),
              pullStartedAt: task.pullStartedAt?.toISOString(),
              pullStoppedAt: task.pullStoppedAt?.toISOString(),
              executionStoppedAt: task.executionStoppedAt?.toISOString(),
              launchType: task.launchType,
              platformVersion: task.platformVersion,
              platformFamily: task.platformFamily,
              attachments: task.attachments?.map((a) => ({
                id: a.id,
                type: a.type,
                status: a.status,
                details: a.details,
              })),
              tags: task.tags?.map((t) => ({
                key: t.key,
                value: t.value,
              })),
            })) || []

          return {
            tasks,
            count: tasks.length,
            failures: response.failures?.map((f) => ({
              arn: f.arn,
              reason: f.reason,
            })),
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ecs_describe_tasks",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_ecs_list_task_definitions",
      description: "List ECS task definitions",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        familyPrefix: z.string().optional().describe("Filter by family prefix"),
        status: z
          .enum(["ACTIVE", "INACTIVE"])
          .optional()
          .describe("Filter by status"),
        sort: z.enum(["ASC", "DESC"]).optional().describe("Sort order"),
        maxResults: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum number of task definitions to return"),
        nextToken: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new ListTaskDefinitionsCommand({
            familyPrefix: args.familyPrefix,
            status: args.status,
            sort: args.sort,
            maxResults: args.maxResults,
            nextToken: args.nextToken,
          })

          const response = await getECSClient(args.region).send(command)

          return {
            taskDefinitionArns: response.taskDefinitionArns || [],
            count: response.taskDefinitionArns?.length || 0,
            nextToken: response.nextToken,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ecs_list_task_definitions",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_ecs_describe_task_definition",
      description: "Get detailed information about an ECS task definition",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        taskDefinition: z
          .string()
          .describe("Task definition ARN or family:revision"),
        include: z
          .array(z.enum(["TAGS"]))
          .optional()
          .describe("Additional information to include"),
      }),
      async run(args) {
        try {
          const command = new DescribeTaskDefinitionCommand({
            taskDefinition: args.taskDefinition,
            include: args.include,
          })

          const response = await getECSClient(args.region).send(command)

          const taskDef = response.taskDefinition

          if (!taskDef) {
            throw new ToolError({
              message: "Task definition not found",
              toolName: "aws_ecs_describe_task_definition",
              toolArgs: args,
            })
          }

          return {
            taskDefinitionArn: taskDef.taskDefinitionArn,
            family: taskDef.family,
            revision: taskDef.revision,
            status: taskDef.status,
            networkMode: taskDef.networkMode,
            requiresCompatibilities: taskDef.requiresCompatibilities,
            cpu: taskDef.cpu,
            memory: taskDef.memory,
            containerDefinitions: taskDef.containerDefinitions?.map((cd) => ({
              name: cd.name,
              image: cd.image,
              cpu: cd.cpu,
              memory: cd.memory,
              memoryReservation: cd.memoryReservation,
              essential: cd.essential,
              portMappings: cd.portMappings?.map((pm) => ({
                containerPort: pm.containerPort,
                hostPort: pm.hostPort,
                protocol: pm.protocol,
              })),
              environment: cd.environment?.map((e) => ({
                name: e.name,
                value: e.value,
              })),
              logConfiguration: cd.logConfiguration
                ? {
                    logDriver: cd.logConfiguration.logDriver,
                    options: cd.logConfiguration.options,
                  }
                : undefined,
              healthCheck: cd.healthCheck
                ? {
                    command: cd.healthCheck.command,
                    interval: cd.healthCheck.interval,
                    timeout: cd.healthCheck.timeout,
                    retries: cd.healthCheck.retries,
                    startPeriod: cd.healthCheck.startPeriod,
                  }
                : undefined,
            })),
            volumes: taskDef.volumes?.map((v) => ({
              name: v.name,
              host: v.host
                ? {
                    sourcePath: v.host.sourcePath,
                  }
                : undefined,
            })),
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ecs_describe_task_definition",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_ecs_list_task_definition_families",
      description: "List ECS task definition families",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        familyPrefix: z.string().optional().describe("Filter by family prefix"),
        status: z
          .enum(["ACTIVE", "INACTIVE"])
          .optional()
          .describe("Filter by status"),
        maxResults: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum number of families to return"),
        nextToken: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new ListTaskDefinitionFamiliesCommand({
            familyPrefix: args.familyPrefix,
            status: args.status,
            maxResults: args.maxResults,
            nextToken: args.nextToken,
          })

          const response = await getECSClient(args.region).send(command)

          return {
            families: response.families || [],
            count: response.families?.length || 0,
            nextToken: response.nextToken,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ecs_list_task_definition_families",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_ecs_list_container_instances",
      description: "List container instances in an ECS cluster",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        cluster: z.string().describe("Cluster name or ARN"),
        status: z
          .enum([
            "ACTIVE",
            "DRAINING",
            "REGISTERING",
            "DEREGISTERING",
            "REGISTRATION_FAILED",
          ])
          .optional()
          .describe("Filter by status"),
        maxResults: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum number of instances to return"),
        nextToken: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new ListContainerInstancesCommand({
            cluster: args.cluster,
            status: args.status,
            maxResults: args.maxResults,
            nextToken: args.nextToken,
          })

          const response = await getECSClient(args.region).send(command)

          return {
            containerInstanceArns: response.containerInstanceArns || [],
            count: response.containerInstanceArns?.length || 0,
            nextToken: response.nextToken,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ecs_list_container_instances",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_ecs_describe_container_instances",
      description: "Get detailed information about container instances",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        cluster: z.string().describe("Cluster name or ARN"),
        containerInstanceArns: z
          .array(z.string())
          .describe("Array of container instance ARNs to describe"),
        include: z
          .array(z.enum(["TAGS", "CONTAINER_INSTANCE_HEALTH"]))
          .optional()
          .describe("Additional information to include"),
      }),
      async run(args) {
        try {
          const command = new DescribeContainerInstancesCommand({
            cluster: args.cluster,
            containerInstances: args.containerInstanceArns,
            include: args.include,
          })

          const response = await getECSClient(args.region).send(command)

          const instances =
            response.containerInstances?.map((instance) => ({
              containerInstanceArn: instance.containerInstanceArn,
              ec2InstanceId: instance.ec2InstanceId,
              capacityProviderName: instance.capacityProviderName,
              version: instance.version,
              versionInfo: instance.versionInfo
                ? {
                    agentVersion: instance.versionInfo.agentVersion,
                    agentHash: instance.versionInfo.agentHash,
                    dockerVersion: instance.versionInfo.dockerVersion,
                  }
                : undefined,
              status: instance.status,
              statusReason: instance.statusReason,
              agentConnected: instance.agentConnected,
              runningTasksCount: instance.runningTasksCount,
              pendingTasksCount: instance.pendingTasksCount,
              registeredAt: instance.registeredAt?.toISOString(),
              registeredResources: instance.registeredResources?.map((rr) => ({
                name: rr.name,
                type: rr.type,
                doubleValue: rr.doubleValue,
                integerValue: rr.integerValue,
                longValue: rr.longValue,
                stringSetValue: rr.stringSetValue,
              })),
              remainingResources: instance.remainingResources?.map((rr) => ({
                name: rr.name,
                type: rr.type,
                doubleValue: rr.doubleValue,
                integerValue: rr.integerValue,
                longValue: rr.longValue,
                stringSetValue: rr.stringSetValue,
              })),
              tags: instance.tags?.map((t) => ({
                key: t.key,
                value: t.value,
              })),
              healthStatus: instance.healthStatus,
            })) || []

          return {
            instances,
            count: instances.length,
            failures: response.failures?.map((f) => ({
              arn: f.arn,
              reason: f.reason,
            })),
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ecs_describe_container_instances",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_ecs_describe_capacity_providers",
      description: "Get detailed information about capacity providers",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        capacityProviders: z
          .array(z.string())
          .describe("Array of capacity provider names or ARNs to describe"),
      }),
      async run(args) {
        try {
          const command = new DescribeCapacityProvidersCommand({
            capacityProviders: args.capacityProviders,
          })

          const response = await getECSClient(args.region).send(command)

          const capacityProviders =
            response.capacityProviders?.map((cp) => ({
              capacityProviderArn: cp.capacityProviderArn,
              name: cp.name,
              status: cp.status,
              autoScalingGroupProvider: cp.autoScalingGroupProvider
                ? {
                    autoScalingGroupArn:
                      cp.autoScalingGroupProvider.autoScalingGroupArn,
                    managedScaling: cp.autoScalingGroupProvider.managedScaling
                      ? {
                          status:
                            cp.autoScalingGroupProvider.managedScaling.status,
                          targetCapacity:
                            cp.autoScalingGroupProvider.managedScaling
                              .targetCapacity,
                          minimumScalingStepSize:
                            cp.autoScalingGroupProvider.managedScaling
                              .minimumScalingStepSize,
                          maximumScalingStepSize:
                            cp.autoScalingGroupProvider.managedScaling
                              .maximumScalingStepSize,
                        }
                      : undefined,
                    managedTerminationProtection:
                      cp.autoScalingGroupProvider.managedTerminationProtection,
                  }
                : undefined,
              updateStatus: cp.updateStatus,
              updateStatusReason: cp.updateStatusReason,
              tags: cp.tags?.map((t) => ({
                key: t.key,
                value: t.value,
              })),
            })) || []

          return {
            capacityProviders,
            count: capacityProviders.length,
            failures: response.failures?.map((f) => ({
              arn: f.arn,
              reason: f.reason,
            })),
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ecs_describe_capacity_providers",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_ecs_list_tags_for_resource",
      description: "List tags for an ECS resource",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        resourceArn: z.string().describe("Resource ARN"),
      }),
      async run(args) {
        try {
          const command = new ListTagsForResourceCommand({
            resourceArn: args.resourceArn,
          })

          const response = await getECSClient(args.region).send(command)

          return {
            tags:
              response.tags?.map((t) => ({
                key: t.key,
                value: t.value,
              })) || [],
            count: response.tags?.length || 0,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ecs_list_tags_for_resource",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_ecs_get_cluster_overview",
      description:
        "Get a comprehensive overview of an ECS cluster including status, task counts, services, and capacity providers",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        cluster: z.string().describe("Cluster name or ARN"),
        includeCapacityProviders: z
          .boolean()
          .optional()
          .default(true)
          .describe("Include capacity provider information"),
      }),
      async run(args) {
        try {
          const client = getECSClient(args.region)

          // Get cluster details
          const describeClustersCommand = new DescribeClustersCommand({
            clusters: [args.cluster],
            include: ["STATISTICS"],
          })
          const clusterResponse = await client.send(describeClustersCommand)

          if (
            !clusterResponse.clusters ||
            clusterResponse.clusters.length === 0
          ) {
            throw new ToolError({
              message: `Cluster ${args.cluster} not found`,
              toolName: "aws_ecs_get_cluster_overview",
              toolArgs: args,
            })
          }

          const cluster = clusterResponse.clusters[0]

          // Get service count
          const listServicesCommand = new ListServicesCommand({
            cluster: args.cluster,
          })
          const servicesResponse = await client.send(listServicesCommand)

          // Get capacity providers if requested
          let capacityProviders = undefined
          if (args.includeCapacityProviders && cluster.capacityProviders) {
            const describeCapacityProvidersCommand =
              new DescribeCapacityProvidersCommand({
                capacityProviders: cluster.capacityProviders,
              })
            const cpResponse = await client.send(
              describeCapacityProvidersCommand,
            )
            capacityProviders = cpResponse.capacityProviders?.map((cp) => ({
              name: cp.name,
              status: cp.status,
              autoScalingGroupArn:
                cp.autoScalingGroupProvider?.autoScalingGroupArn,
            }))
          }

          return {
            clusterArn: cluster.clusterArn,
            clusterName: cluster.clusterName,
            status: cluster.status,
            registeredContainerInstancesCount:
              cluster.registeredContainerInstancesCount,
            runningTasksCount: cluster.runningTasksCount,
            pendingTasksCount: cluster.pendingTasksCount,
            activeServicesCount: cluster.activeServicesCount,
            serviceCount: servicesResponse.serviceArns?.length || 0,
            capacityProviders: cluster.capacityProviders,
            capacityProviderDetails: capacityProviders,
            statistics: cluster.statistics?.map((s) => ({
              name: s.name,
              value: s.value,
            })),
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ecs_get_cluster_overview",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_ecs_get_service_overview",
      description:
        "Get a comprehensive overview of an ECS service including status, deployments, task counts, and configuration",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        cluster: z.string().describe("Cluster name or ARN"),
        service: z.string().describe("Service name or ARN"),
        includeTaskDetails: z
          .boolean()
          .optional()
          .default(false)
          .describe("Include details of running tasks"),
        maxTasks: z
          .number()
          .min(1)
          .max(10)
          .optional()
          .default(5)
          .describe(
            "Maximum number of tasks to include if includeTaskDetails is true",
          ),
      }),
      async run(args) {
        try {
          const client = getECSClient(args.region)

          // Get service details
          const describeServicesCommand = new DescribeServicesCommand({
            cluster: args.cluster,
            services: [args.service],
          })
          const servicesResponse = await client.send(describeServicesCommand)

          if (
            !servicesResponse.services ||
            servicesResponse.services.length === 0
          ) {
            throw new ToolError({
              message: `Service ${args.service} not found in cluster ${args.cluster}`,
              toolName: "aws_ecs_get_service_overview",
              toolArgs: args,
            })
          }

          const service = servicesResponse.services[0]

          // Get task definition details
          let taskDefinitionDetails = undefined
          if (service.taskDefinition) {
            const describeTaskDefinitionCommand =
              new DescribeTaskDefinitionCommand({
                taskDefinition: service.taskDefinition,
              })
            const tdResponse = await client.send(describeTaskDefinitionCommand)

            if (tdResponse.taskDefinition) {
              const td = tdResponse.taskDefinition
              taskDefinitionDetails = {
                cpu: td.cpu,
                memory: td.memory,
                networkMode: td.networkMode,
                requiresCompatibilities: td.requiresCompatibilities,
                containers: td.containerDefinitions?.map((cd) => ({
                  name: cd.name,
                  image: cd.image,
                  cpu: cd.cpu,
                  memory: cd.memory,
                  logConfiguration: cd.logConfiguration
                    ? {
                        logDriver: cd.logConfiguration.logDriver,
                        options: cd.logConfiguration.options,
                      }
                    : undefined,
                })),
              }
            }
          }

          // Get task details if requested
          let tasks = undefined
          if (args.includeTaskDetails) {
            const listTasksCommand = new ListTasksCommand({
              cluster: args.cluster,
              serviceName: service.serviceName,
              desiredStatus: "RUNNING",
              maxResults: args.maxTasks,
            })
            const tasksListResponse = await client.send(listTasksCommand)

            if (
              tasksListResponse.taskArns &&
              tasksListResponse.taskArns.length > 0
            ) {
              const describeTasksCommand = new DescribeTasksCommand({
                cluster: args.cluster,
                tasks: tasksListResponse.taskArns.slice(0, args.maxTasks),
              })
              const tasksResponse = await client.send(describeTasksCommand)

              tasks = tasksResponse.tasks?.map((t) => ({
                taskArn: t.taskArn,
                lastStatus: t.lastStatus,
                startedAt: t.startedAt?.toISOString(),
                containers: t.containers?.map((c) => ({
                  name: c.name,
                  lastStatus: c.lastStatus,
                  healthStatus: c.healthStatus,
                })),
              }))
            }
          }

          return {
            serviceArn: service.serviceArn,
            serviceName: service.serviceName,
            status: service.status,
            desiredCount: service.desiredCount,
            runningCount: service.runningCount,
            pendingCount: service.pendingCount,
            launchType: service.launchType,
            platformVersion: service.platformVersion,
            platformFamily: service.platformFamily,
            taskDefinition: service.taskDefinition,
            taskDefinitionDetails,
            deployments: service.deployments?.map((d) => ({
              id: d.id,
              status: d.status,
              desiredCount: d.desiredCount,
              runningCount: d.runningCount,
              rolloutState: d.rolloutState,
              createdAt: d.createdAt?.toISOString(),
            })),
            networkConfiguration: service.networkConfiguration
              ? {
                  subnets:
                    service.networkConfiguration.awsvpcConfiguration?.subnets,
                  securityGroups:
                    service.networkConfiguration.awsvpcConfiguration
                      ?.securityGroups,
                  assignPublicIp:
                    service.networkConfiguration.awsvpcConfiguration
                      ?.assignPublicIp,
                }
              : undefined,
            recentEvents: service.events?.slice(0, 5).map((e) => ({
              createdAt: e.createdAt?.toISOString(),
              message: e.message,
            })),
            tasks,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ecs_get_service_overview",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_ecs_get_task_logs_hints",
      description:
        "Get CloudWatch Logs configuration hints for an ECS task to help query logs",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        cluster: z.string().describe("Cluster name or ARN"),
        taskArn: z.string().describe("Task ARN"),
      }),
      async run(args) {
        try {
          const client = getECSClient(args.region)

          // Get task details
          const describeTasksCommand = new DescribeTasksCommand({
            cluster: args.cluster,
            tasks: [args.taskArn],
          })
          const tasksResponse = await client.send(describeTasksCommand)

          if (!tasksResponse.tasks || tasksResponse.tasks.length === 0) {
            throw new ToolError({
              message: `Task ${args.taskArn} not found`,
              toolName: "aws_ecs_get_task_logs_hints",
              toolArgs: args,
            })
          }

          const task = tasksResponse.tasks[0]

          // Get task definition
          if (!task.taskDefinitionArn) {
            throw new ToolError({
              message: "Task definition ARN not found for task",
              toolName: "aws_ecs_get_task_logs_hints",
              toolArgs: args,
            })
          }

          const describeTaskDefinitionCommand =
            new DescribeTaskDefinitionCommand({
              taskDefinition: task.taskDefinitionArn,
            })
          const tdResponse = await client.send(describeTaskDefinitionCommand)

          if (!tdResponse.taskDefinition) {
            throw new ToolError({
              message: "Task definition not found",
              toolName: "aws_ecs_get_task_logs_hints",
              toolArgs: args,
            })
          }

          const taskDef = tdResponse.taskDefinition

          // Extract log configuration
          const logConfigs =
            taskDef.containerDefinitions?.map((cd) => {
              const logConfig = cd.logConfiguration
              if (logConfig?.logDriver === "awslogs" && logConfig.options) {
                const logGroup = logConfig.options["awslogs-group"]
                const logStreamPrefix =
                  logConfig.options["awslogs-stream-prefix"]
                const region =
                  logConfig.options["awslogs-region"] || args.region

                // Construct log stream name pattern
                // ECS typically uses: prefix/container-name/ecs-task-id
                const containerName = cd.name || "unknown"
                const taskId = args.taskArn.split("/").pop() || "unknown"
                const logStreamPattern = logStreamPrefix
                  ? `${logStreamPrefix}/${containerName}/${taskId}`
                  : `${containerName}/${taskId}`

                return {
                  containerName: cd.name,
                  logGroup,
                  logStreamPrefix,
                  logStreamPattern,
                  region,
                  logDriver: logConfig.logDriver,
                }
              }
              return {
                containerName: cd.name,
                logDriver: logConfig?.logDriver || "none",
                logGroup: undefined,
                logStreamPattern: undefined,
              }
            }) || []

          return {
            taskArn: task.taskArn,
            taskDefinitionArn: task.taskDefinitionArn,
            lastStatus: task.lastStatus,
            startedAt: task.startedAt?.toISOString(),
            logConfigurations: logConfigs.filter((lc) => lc.logGroup),
            containers: task.containers?.map((c) => ({
              name: c.name,
              lastStatus: c.lastStatus,
            })),
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ecs_get_task_logs_hints",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_ecs_get_service_events",
      description:
        "Get recent events for an ECS service with optional time filtering",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        cluster: z.string().describe("Cluster name or ARN"),
        service: z.string().describe("Service name or ARN"),
        sinceMinutes: z
          .number()
          .min(1)
          .optional()
          .describe("Only return events from the last N minutes"),
        maxEvents: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .default(20)
          .describe("Maximum number of events to return"),
      }),
      async run(args) {
        try {
          const client = getECSClient(args.region)

          const describeServicesCommand = new DescribeServicesCommand({
            cluster: args.cluster,
            services: [args.service],
          })
          const servicesResponse = await client.send(describeServicesCommand)

          if (
            !servicesResponse.services ||
            servicesResponse.services.length === 0
          ) {
            throw new ToolError({
              message: `Service ${args.service} not found in cluster ${args.cluster}`,
              toolName: "aws_ecs_get_service_events",
              toolArgs: args,
            })
          }

          const service = servicesResponse.services[0]
          let events = service.events || []

          // Filter by time if requested
          if (args.sinceMinutes) {
            const cutoffTime = new Date()
            cutoffTime.setMinutes(cutoffTime.getMinutes() - args.sinceMinutes)

            events = events.filter((e) => {
              if (!e.createdAt) return false
              return e.createdAt >= cutoffTime
            })
          }

          // Sort by most recent first and limit
          events = events
            .sort((a, b) => {
              const timeA = a.createdAt?.getTime() || 0
              const timeB = b.createdAt?.getTime() || 0
              return timeB - timeA
            })
            .slice(0, args.maxEvents)

          return {
            serviceArn: service.serviceArn,
            serviceName: service.serviceName,
            events: events.map((e) => ({
              id: e.id,
              createdAt: e.createdAt?.toISOString(),
              message: e.message,
            })),
            count: events.length,
            totalEventsAvailable: service.events?.length || 0,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ecs_get_service_events",
            toolArgs: args,
          })
        }
      },
    }),
  ]
}
