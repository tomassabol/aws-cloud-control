import {
  DescribeImagesCommand,
  DescribeInstancesCommand,
  DescribeInstanceStatusCommand,
  DescribeKeyPairsCommand,
  DescribeNetworkInterfacesCommand,
  DescribeSecurityGroupsCommand,
  DescribeSnapshotsCommand,
  DescribeSubnetsCommand,
  DescribeVolumesCommand,
  DescribeVpcsCommand,
  EC2Client,
} from "@aws-sdk/client-ec2"
import { z } from "zod"

import {
  AWS_REGIONS,
  type AwsRegion,
  DEFAULT_AWS_REGION,
} from "~/utils/aws-region"
import { type Tool, tool } from "~/utils/tool"
import { ToolError } from "~/utils/tool-error"

export function createEC2Tools(): Tool[] {
  const getEC2Client = (region: AwsRegion = DEFAULT_AWS_REGION) => {
    return new EC2Client({ region })
  }

  return [
    // ===== EC2 INSTANCES =====
    tool({
      name: "aws_ec2_list_instances",
      description: "List EC2 instances with optional filtering and pagination",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        filters: z
          .array(
            z.object({
              name: z
                .string()
                .describe("Filter name (e.g., instance-state-name)"),
              values: z.array(z.string()).describe("Filter values"),
            }),
          )
          .optional()
          .describe(
            "Filters to apply (e.g., [{name: 'instance-state-name', values: ['running']}])",
          ),
        instanceIds: z
          .array(z.string())
          .optional()
          .describe("Specific instance IDs to describe"),
        maxResults: z
          .number()
          .min(5)
          .max(1000)
          .optional()
          .describe("Maximum number of results to return"),
        nextToken: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new DescribeInstancesCommand({
            Filters: args.filters?.map((f) => ({
              Name: f.name,
              Values: f.values,
            })),
            InstanceIds: args.instanceIds,
            MaxResults: args.maxResults,
            NextToken: args.nextToken,
          })

          const response = await getEC2Client(args.region).send(command)

          const instances =
            response.Reservations?.flatMap(
              (reservation) =>
                reservation.Instances?.map((instance) => ({
                  instanceId: instance.InstanceId,
                  instanceType: instance.InstanceType,
                  state: instance.State
                    ? {
                        code: instance.State.Code,
                        name: instance.State.Name,
                      }
                    : undefined,
                  availabilityZone: instance.Placement?.AvailabilityZone,
                  launchTime: instance.LaunchTime?.toISOString(),
                  platform: instance.Platform,
                  platformDetails: instance.PlatformDetails,
                  privateIpAddress: instance.PrivateIpAddress,
                  publicIpAddress: instance.PublicIpAddress,
                  privateDnsName: instance.PrivateDnsName,
                  publicDnsName: instance.PublicDnsName,
                  vpcId: instance.VpcId,
                  subnetId: instance.SubnetId,
                  architecture: instance.Architecture,
                  imageId: instance.ImageId,
                  keyName: instance.KeyName,
                  tags: instance.Tags?.map((tag) => ({
                    key: tag.Key,
                    value: tag.Value,
                  })),
                })) || [],
            ) || []

          return {
            instances,
            count: instances.length,
            nextToken: response.NextToken,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ec2_list_instances",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_ec2_describe_instances",
      description: "Get detailed information about specific EC2 instances",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        instanceIds: z
          .array(z.string())
          .min(1)
          .describe("Instance IDs to describe"),
      }),
      async run(args) {
        try {
          const command = new DescribeInstancesCommand({
            InstanceIds: args.instanceIds,
          })

          const response = await getEC2Client(args.region).send(command)

          const instances =
            response.Reservations?.flatMap(
              (reservation) =>
                reservation.Instances?.map((instance) => ({
                  instanceId: instance.InstanceId,
                  instanceType: instance.InstanceType,
                  state: instance.State
                    ? {
                        code: instance.State.Code,
                        name: instance.State.Name,
                      }
                    : undefined,
                  placement: instance.Placement
                    ? {
                        availabilityZone: instance.Placement.AvailabilityZone,
                        groupName: instance.Placement.GroupName,
                        tenancy: instance.Placement.Tenancy,
                        hostId: instance.Placement.HostId,
                        affinity: instance.Placement.Affinity,
                        partitionNumber: instance.Placement.PartitionNumber,
                      }
                    : undefined,
                  launchTime: instance.LaunchTime?.toISOString(),
                  platform: instance.Platform,
                  platformDetails: instance.PlatformDetails,
                  monitoring: instance.Monitoring?.State,
                  privateIpAddress: instance.PrivateIpAddress,
                  publicIpAddress: instance.PublicIpAddress,
                  privateDnsName: instance.PrivateDnsName,
                  publicDnsName: instance.PublicDnsName,
                  stateTransitionReason: instance.StateTransitionReason,
                  architecture: instance.Architecture,
                  blockDeviceMappings: instance.BlockDeviceMappings?.map(
                    (mapping) => ({
                      deviceName: mapping.DeviceName,
                      ebs: mapping.Ebs
                        ? {
                            attachTime: mapping.Ebs.AttachTime?.toISOString(),
                            deleteOnTermination:
                              mapping.Ebs.DeleteOnTermination,
                            status: mapping.Ebs.Status,
                            volumeId: mapping.Ebs.VolumeId,
                          }
                        : undefined,
                    }),
                  ),
                  clientToken: instance.ClientToken,
                  ebsOptimized: instance.EbsOptimized,
                  enaSupport: instance.EnaSupport,
                  hypervisor: instance.Hypervisor,
                  iamInstanceProfile: instance.IamInstanceProfile
                    ? {
                        arn: instance.IamInstanceProfile.Arn,
                        id: instance.IamInstanceProfile.Id,
                      }
                    : undefined,
                  imageId: instance.ImageId,
                  keyName: instance.KeyName,
                  networkInterfaces: instance.NetworkInterfaces?.map((ni) => ({
                    association: ni.Association
                      ? {
                          carrierIp: ni.Association.CarrierIp,
                          ipOwnerId: ni.Association.IpOwnerId,
                          publicDnsName: ni.Association.PublicDnsName,
                          publicIp: ni.Association.PublicIp,
                        }
                      : undefined,
                    attachment: ni.Attachment
                      ? {
                          attachTime: ni.Attachment.AttachTime?.toISOString(),
                          attachmentId: ni.Attachment.AttachmentId,
                          deleteOnTermination:
                            ni.Attachment.DeleteOnTermination,
                          deviceIndex: ni.Attachment.DeviceIndex,
                          status: ni.Attachment.Status,
                          networkCardIndex: ni.Attachment.NetworkCardIndex,
                        }
                      : undefined,
                    description: ni.Description,
                    groups: ni.Groups?.map((g) => ({
                      groupName: g.GroupName,
                      groupId: g.GroupId,
                    })),
                    macAddress: ni.MacAddress,
                    networkInterfaceId: ni.NetworkInterfaceId,
                    ownerId: ni.OwnerId,
                    privateDnsName: ni.PrivateDnsName,
                    privateIpAddress: ni.PrivateIpAddress,
                    sourceDestCheck: ni.SourceDestCheck,
                    status: ni.Status,
                    subnetId: ni.SubnetId,
                    vpcId: ni.VpcId,
                  })),
                  rootDeviceName: instance.RootDeviceName,
                  rootDeviceType: instance.RootDeviceType,
                  securityGroups: instance.SecurityGroups?.map((sg) => ({
                    groupName: sg.GroupName,
                    groupId: sg.GroupId,
                  })),
                  sourceDestCheck: instance.SourceDestCheck,
                  stateReason: instance.StateReason
                    ? {
                        code: instance.StateReason.Code,
                        message: instance.StateReason.Message,
                      }
                    : undefined,
                  subnetId: instance.SubnetId,
                  tags: instance.Tags?.map((tag) => ({
                    key: tag.Key,
                    value: tag.Value,
                  })),
                  virtualizationType: instance.VirtualizationType,
                  vpcId: instance.VpcId,
                  cpuOptions: instance.CpuOptions
                    ? {
                        coreCount: instance.CpuOptions.CoreCount,
                        threadsPerCore: instance.CpuOptions.ThreadsPerCore,
                      }
                    : undefined,
                  capacityReservationId: instance.CapacityReservationId,
                  hibernationOptions: instance.HibernationOptions?.Configured,
                  metadataOptions: instance.MetadataOptions
                    ? {
                        state: instance.MetadataOptions.State,
                        httpTokens: instance.MetadataOptions.HttpTokens,
                        httpPutResponseHopLimit:
                          instance.MetadataOptions.HttpPutResponseHopLimit,
                        httpEndpoint: instance.MetadataOptions.HttpEndpoint,
                      }
                    : undefined,
                  enclaveOptions: instance.EnclaveOptions?.Enabled,
                  bootMode: instance.BootMode,
                })) || [],
            ) || []

          return {
            instances,
            count: instances.length,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ec2_describe_instances",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_ec2_get_instance_status",
      description:
        "Get status checks and system health information for EC2 instances",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        instanceIds: z
          .array(z.string())
          .optional()
          .describe("Instance IDs to check status for"),
        filters: z
          .array(
            z.object({
              name: z.string(),
              values: z.array(z.string()),
            }),
          )
          .optional()
          .describe("Filters to apply"),
        maxResults: z
          .number()
          .min(5)
          .max(1000)
          .optional()
          .describe("Maximum number of results"),
        nextToken: z.string().optional().describe("Pagination token"),
        includeAllInstances: z
          .boolean()
          .optional()
          .describe("Include all instances regardless of state"),
      }),
      async run(args) {
        try {
          const command = new DescribeInstanceStatusCommand({
            InstanceIds: args.instanceIds,
            Filters: args.filters?.map((f) => ({
              Name: f.name,
              Values: f.values,
            })),
            MaxResults: args.maxResults,
            NextToken: args.nextToken,
            IncludeAllInstances: args.includeAllInstances,
          })

          const response = await getEC2Client(args.region).send(command)

          const instanceStatuses =
            response.InstanceStatuses?.map((status) => ({
              instanceId: status.InstanceId,
              availabilityZone: status.AvailabilityZone,
              instanceState: status.InstanceState
                ? {
                    code: status.InstanceState.Code,
                    name: status.InstanceState.Name,
                  }
                : undefined,
              systemStatus: status.SystemStatus
                ? {
                    status: status.SystemStatus.Status,
                    details: status.SystemStatus.Details?.map((detail) => ({
                      name: detail.Name,
                      status: detail.Status,
                      impairedSince: detail.ImpairedSince?.toISOString(),
                    })),
                  }
                : undefined,
              instanceStatus: status.InstanceStatus
                ? {
                    status: status.InstanceStatus.Status,
                    details: status.InstanceStatus.Details?.map((detail) => ({
                      name: detail.Name,
                      status: detail.Status,
                      impairedSince: detail.ImpairedSince?.toISOString(),
                    })),
                  }
                : undefined,
              events: status.Events?.map((event) => ({
                instanceEventId: event.InstanceEventId,
                code: event.Code,
                description: event.Description,
                notBefore: event.NotBefore?.toISOString(),
                notAfter: event.NotAfter?.toISOString(),
                notBeforeDeadline: event.NotBeforeDeadline?.toISOString(),
              })),
              outpostArn: status.OutpostArn,
            })) || []

          return {
            instanceStatuses,
            count: instanceStatuses.length,
            nextToken: response.NextToken,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ec2_get_instance_status",
            toolArgs: args,
          })
        }
      },
    }),

    // ===== EBS VOLUMES (PRIORITY) =====
    tool({
      name: "aws_ec2_list_volumes",
      description: "List EBS volumes with filtering and pagination",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        volumeIds: z
          .array(z.string())
          .optional()
          .describe("Specific volume IDs to list"),
        filters: z
          .array(
            z.object({
              name: z
                .string()
                .describe(
                  "Filter name (e.g., volume-type, status, attachment.status)",
                ),
              values: z.array(z.string()).describe("Filter values"),
            }),
          )
          .optional()
          .describe("Filters to apply"),
        maxResults: z
          .number()
          .min(5)
          .max(500)
          .optional()
          .describe("Maximum number of results"),
        nextToken: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new DescribeVolumesCommand({
            VolumeIds: args.volumeIds,
            Filters: args.filters?.map((f) => ({
              Name: f.name,
              Values: f.values,
            })),
            MaxResults: args.maxResults,
            NextToken: args.nextToken,
          })

          const response = await getEC2Client(args.region).send(command)

          const volumes =
            response.Volumes?.map((volume) => ({
              volumeId: volume.VolumeId,
              size: volume.Size,
              volumeType: volume.VolumeType,
              state: volume.State,
              availabilityZone: volume.AvailabilityZone,
              createTime: volume.CreateTime?.toISOString(),
              attachments: volume.Attachments?.map((attachment) => ({
                attachTime: attachment.AttachTime?.toISOString(),
                device: attachment.Device,
                instanceId: attachment.InstanceId,
                state: attachment.State,
                volumeId: attachment.VolumeId,
                deleteOnTermination: attachment.DeleteOnTermination,
              })),
              iops: volume.Iops,
              throughput: volume.Throughput,
              encrypted: volume.Encrypted,
              kmsKeyId: volume.KmsKeyId,
              snapshotId: volume.SnapshotId,
              multiAttachEnabled: volume.MultiAttachEnabled,
              tags: volume.Tags?.map((tag) => ({
                key: tag.Key,
                value: tag.Value,
              })),
            })) || []

          return {
            volumes,
            count: volumes.length,
            nextToken: response.NextToken,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ec2_list_volumes",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_ec2_describe_volumes",
      description: "Get detailed information about specific EBS volumes",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        volumeIds: z
          .array(z.string())
          .min(1)
          .describe("Volume IDs to describe"),
      }),
      async run(args) {
        try {
          const command = new DescribeVolumesCommand({
            VolumeIds: args.volumeIds,
          })

          const response = await getEC2Client(args.region).send(command)

          const volumes =
            response.Volumes?.map((volume) => ({
              volumeId: volume.VolumeId,
              size: volume.Size,
              volumeType: volume.VolumeType,
              state: volume.State,
              availabilityZone: volume.AvailabilityZone,
              createTime: volume.CreateTime?.toISOString(),
              attachments: volume.Attachments?.map((attachment) => ({
                attachTime: attachment.AttachTime?.toISOString(),
                device: attachment.Device,
                instanceId: attachment.InstanceId,
                state: attachment.State,
                volumeId: attachment.VolumeId,
                deleteOnTermination: attachment.DeleteOnTermination,
              })),
              iops: volume.Iops,
              throughput: volume.Throughput,
              encrypted: volume.Encrypted,
              kmsKeyId: volume.KmsKeyId,
              snapshotId: volume.SnapshotId,
              outpostArn: volume.OutpostArn,
              multiAttachEnabled: volume.MultiAttachEnabled,
              fastRestored: volume.FastRestored,
              tags: volume.Tags?.map((tag) => ({
                key: tag.Key,
                value: tag.Value,
              })),
            })) || []

          return {
            volumes,
            count: volumes.length,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ec2_describe_volumes",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_ec2_list_snapshots",
      description: "List EBS snapshots with filtering",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        snapshotIds: z
          .array(z.string())
          .optional()
          .describe("Specific snapshot IDs to list"),
        ownerIds: z
          .array(z.string())
          .optional()
          .describe("Owner IDs to filter by (use 'self' for your snapshots)"),
        restorableByUserIds: z
          .array(z.string())
          .optional()
          .describe("User IDs that can restore the snapshots"),
        filters: z
          .array(
            z.object({
              name: z
                .string()
                .describe("Filter name (e.g., volume-id, status, tag-key)"),
              values: z.array(z.string()).describe("Filter values"),
            }),
          )
          .optional()
          .describe("Filters to apply"),
        maxResults: z
          .number()
          .min(5)
          .max(1000)
          .optional()
          .describe("Maximum number of results"),
        nextToken: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new DescribeSnapshotsCommand({
            SnapshotIds: args.snapshotIds,
            OwnerIds: args.ownerIds,
            RestorableByUserIds: args.restorableByUserIds,
            Filters: args.filters?.map((f) => ({
              Name: f.name,
              Values: f.values,
            })),
            MaxResults: args.maxResults,
            NextToken: args.nextToken,
          })

          const response = await getEC2Client(args.region).send(command)

          const snapshots =
            response.Snapshots?.map((snapshot) => ({
              snapshotId: snapshot.SnapshotId,
              volumeId: snapshot.VolumeId,
              state: snapshot.State,
              stateMessage: snapshot.StateMessage,
              startTime: snapshot.StartTime?.toISOString(),
              progress: snapshot.Progress,
              ownerId: snapshot.OwnerId,
              description: snapshot.Description,
              volumeSize: snapshot.VolumeSize,
              encrypted: snapshot.Encrypted,
              kmsKeyId: snapshot.KmsKeyId,
              dataEncryptionKeyId: snapshot.DataEncryptionKeyId,
              ownerAlias: snapshot.OwnerAlias,
              outpostArn: snapshot.OutpostArn,
              tags: snapshot.Tags?.map((tag) => ({
                key: tag.Key,
                value: tag.Value,
              })),
              storageTier: snapshot.StorageTier,
            })) || []

          return {
            snapshots,
            count: snapshots.length,
            nextToken: response.NextToken,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ec2_list_snapshots",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_ec2_describe_snapshots",
      description: "Get detailed information about specific EBS snapshots",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        snapshotIds: z
          .array(z.string())
          .min(1)
          .describe("Snapshot IDs to describe"),
      }),
      async run(args) {
        try {
          const command = new DescribeSnapshotsCommand({
            SnapshotIds: args.snapshotIds,
          })

          const response = await getEC2Client(args.region).send(command)

          const snapshots =
            response.Snapshots?.map((snapshot) => ({
              snapshotId: snapshot.SnapshotId,
              volumeId: snapshot.VolumeId,
              state: snapshot.State,
              stateMessage: snapshot.StateMessage,
              startTime: snapshot.StartTime?.toISOString(),
              progress: snapshot.Progress,
              ownerId: snapshot.OwnerId,
              description: snapshot.Description,
              volumeSize: snapshot.VolumeSize,
              encrypted: snapshot.Encrypted,
              kmsKeyId: snapshot.KmsKeyId,
              dataEncryptionKeyId: snapshot.DataEncryptionKeyId,
              ownerAlias: snapshot.OwnerAlias,
              outpostArn: snapshot.OutpostArn,
              tags: snapshot.Tags?.map((tag) => ({
                key: tag.Key,
                value: tag.Value,
              })),
              storageTier: snapshot.StorageTier,
              restoreExpiryTime: snapshot.RestoreExpiryTime?.toISOString(),
            })) || []

          return {
            snapshots,
            count: snapshots.length,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ec2_describe_snapshots",
            toolArgs: args,
          })
        }
      },
    }),

    // ===== SECURITY GROUPS =====
    tool({
      name: "aws_ec2_list_security_groups",
      description: "List EC2 security groups with filtering",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        groupIds: z
          .array(z.string())
          .optional()
          .describe("Specific security group IDs to list"),
        groupNames: z
          .array(z.string())
          .optional()
          .describe("Specific security group names to list"),
        filters: z
          .array(
            z.object({
              name: z
                .string()
                .describe("Filter name (e.g., vpc-id, group-name, tag-key)"),
              values: z.array(z.string()).describe("Filter values"),
            }),
          )
          .optional()
          .describe("Filters to apply"),
        maxResults: z
          .number()
          .min(5)
          .max(1000)
          .optional()
          .describe("Maximum number of results"),
        nextToken: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new DescribeSecurityGroupsCommand({
            GroupIds: args.groupIds,
            GroupNames: args.groupNames,
            Filters: args.filters?.map((f) => ({
              Name: f.name,
              Values: f.values,
            })),
            MaxResults: args.maxResults,
            NextToken: args.nextToken,
          })

          const response = await getEC2Client(args.region).send(command)

          const securityGroups =
            response.SecurityGroups?.map((sg) => ({
              groupId: sg.GroupId,
              groupName: sg.GroupName,
              description: sg.Description,
              vpcId: sg.VpcId,
              ownerId: sg.OwnerId,
              tags: sg.Tags?.map((tag) => ({
                key: tag.Key,
                value: tag.Value,
              })),
            })) || []

          return {
            securityGroups,
            count: securityGroups.length,
            nextToken: response.NextToken,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ec2_list_security_groups",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_ec2_describe_security_groups",
      description:
        "Get detailed information about security groups including ingress and egress rules",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        groupIds: z
          .array(z.string())
          .min(1)
          .describe("Security group IDs to describe"),
      }),
      async run(args) {
        try {
          const command = new DescribeSecurityGroupsCommand({
            GroupIds: args.groupIds,
          })

          const response = await getEC2Client(args.region).send(command)

          const securityGroups =
            response.SecurityGroups?.map((sg) => ({
              groupId: sg.GroupId,
              groupName: sg.GroupName,
              description: sg.Description,
              vpcId: sg.VpcId,
              ownerId: sg.OwnerId,
              ingressRules: sg.IpPermissions?.map((permission) => ({
                ipProtocol: permission.IpProtocol,
                fromPort: permission.FromPort,
                toPort: permission.ToPort,
                ipRanges: permission.IpRanges?.map((range) => ({
                  cidrIp: range.CidrIp,
                  description: range.Description,
                })),
                ipv6Ranges: permission.Ipv6Ranges?.map((range) => ({
                  cidrIpv6: range.CidrIpv6,
                  description: range.Description,
                })),
                prefixListIds: permission.PrefixListIds?.map((prefix) => ({
                  prefixListId: prefix.PrefixListId,
                  description: prefix.Description,
                })),
                userIdGroupPairs: permission.UserIdGroupPairs?.map((pair) => ({
                  groupId: pair.GroupId,
                  groupName: pair.GroupName,
                  userId: pair.UserId,
                  vpcId: pair.VpcId,
                  description: pair.Description,
                })),
              })),
              egressRules: sg.IpPermissionsEgress?.map((permission) => ({
                ipProtocol: permission.IpProtocol,
                fromPort: permission.FromPort,
                toPort: permission.ToPort,
                ipRanges: permission.IpRanges?.map((range) => ({
                  cidrIp: range.CidrIp,
                  description: range.Description,
                })),
                ipv6Ranges: permission.Ipv6Ranges?.map((range) => ({
                  cidrIpv6: range.CidrIpv6,
                  description: range.Description,
                })),
                prefixListIds: permission.PrefixListIds?.map((prefix) => ({
                  prefixListId: prefix.PrefixListId,
                  description: prefix.Description,
                })),
                userIdGroupPairs: permission.UserIdGroupPairs?.map((pair) => ({
                  groupId: pair.GroupId,
                  groupName: pair.GroupName,
                  userId: pair.UserId,
                  vpcId: pair.VpcId,
                  description: pair.Description,
                })),
              })),
              tags: sg.Tags?.map((tag) => ({
                key: tag.Key,
                value: tag.Value,
              })),
            })) || []

          return {
            securityGroups,
            count: securityGroups.length,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ec2_describe_security_groups",
            toolArgs: args,
          })
        }
      },
    }),

    // ===== KEY PAIRS =====
    tool({
      name: "aws_ec2_list_key_pairs",
      description: "List EC2 key pairs",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        keyNames: z
          .array(z.string())
          .optional()
          .describe("Specific key pair names to list"),
        keyPairIds: z
          .array(z.string())
          .optional()
          .describe("Specific key pair IDs to list"),
        filters: z
          .array(
            z.object({
              name: z
                .string()
                .describe("Filter name (e.g., key-name, fingerprint)"),
              values: z.array(z.string()).describe("Filter values"),
            }),
          )
          .optional()
          .describe("Filters to apply"),
        includePublicKey: z
          .boolean()
          .optional()
          .describe("Include the public key material in the response"),
      }),
      async run(args) {
        try {
          const command = new DescribeKeyPairsCommand({
            KeyNames: args.keyNames,
            KeyPairIds: args.keyPairIds,
            Filters: args.filters?.map((f) => ({
              Name: f.name,
              Values: f.values,
            })),
            IncludePublicKey: args.includePublicKey,
          })

          const response = await getEC2Client(args.region).send(command)

          const keyPairs =
            response.KeyPairs?.map((kp) => ({
              keyPairId: kp.KeyPairId,
              keyName: kp.KeyName,
              keyFingerprint: kp.KeyFingerprint,
              keyType: kp.KeyType,
              publicKey: kp.PublicKey,
              createTime: kp.CreateTime?.toISOString(),
              tags: kp.Tags?.map((tag) => ({
                key: tag.Key,
                value: tag.Value,
              })),
            })) || []

          return {
            keyPairs,
            count: keyPairs.length,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ec2_list_key_pairs",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_ec2_describe_key_pair",
      description: "Get detailed information about a specific key pair",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        keyName: z.string().optional().describe("Key pair name"),
        keyPairId: z.string().optional().describe("Key pair ID"),
        includePublicKey: z
          .boolean()
          .optional()
          .describe("Include the public key material in the response"),
      }),
      async run(args) {
        try {
          if (!args.keyName && !args.keyPairId) {
            throw new Error("Either keyName or keyPairId must be provided")
          }

          const command = new DescribeKeyPairsCommand({
            KeyNames: args.keyName ? [args.keyName] : undefined,
            KeyPairIds: args.keyPairId ? [args.keyPairId] : undefined,
            IncludePublicKey: args.includePublicKey,
          })

          const response = await getEC2Client(args.region).send(command)

          const keyPair = response.KeyPairs?.[0]

          if (!keyPair) {
            throw new Error("Key pair not found")
          }

          return {
            keyPairId: keyPair.KeyPairId,
            keyName: keyPair.KeyName,
            keyFingerprint: keyPair.KeyFingerprint,
            keyType: keyPair.KeyType,
            publicKey: keyPair.PublicKey,
            createTime: keyPair.CreateTime?.toISOString(),
            tags: keyPair.Tags?.map((tag) => ({
              key: tag.Key,
              value: tag.Value,
            })),
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ec2_describe_key_pair",
            toolArgs: args,
          })
        }
      },
    }),

    // ===== AMIs/IMAGES =====
    tool({
      name: "aws_ec2_list_images",
      description:
        "List AMIs (Amazon Machine Images) with comprehensive filtering",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        imageIds: z
          .array(z.string())
          .optional()
          .describe("Specific image IDs to list"),
        owners: z
          .array(z.string())
          .optional()
          .describe(
            "Image owners (use 'self', 'amazon', 'aws-marketplace', or AWS account IDs)",
          ),
        executableUsers: z
          .array(z.string())
          .optional()
          .describe("Users with explicit launch permissions"),
        filters: z
          .array(
            z.object({
              name: z
                .string()
                .describe(
                  "Filter name (e.g., architecture, image-type, state, name)",
                ),
              values: z.array(z.string()).describe("Filter values"),
            }),
          )
          .optional()
          .describe("Filters to apply"),
        includeDeprecated: z
          .boolean()
          .optional()
          .describe("Include deprecated images"),
      }),
      async run(args) {
        try {
          const command = new DescribeImagesCommand({
            ImageIds: args.imageIds,
            Owners: args.owners,
            ExecutableUsers: args.executableUsers,
            Filters: args.filters?.map((f) => ({
              Name: f.name,
              Values: f.values,
            })),
            IncludeDeprecated: args.includeDeprecated,
          })

          const response = await getEC2Client(args.region).send(command)

          const images =
            response.Images?.map((image) => ({
              imageId: image.ImageId,
              name: image.Name,
              description: image.Description,
              architecture: image.Architecture,
              creationDate: image.CreationDate,
              imageLocation: image.ImageLocation,
              imageType: image.ImageType,
              public: image.Public,
              ownerId: image.OwnerId,
              platform: image.Platform,
              platformDetails: image.PlatformDetails,
              usageOperation: image.UsageOperation,
              state: image.State,
              rootDeviceType: image.RootDeviceType,
              rootDeviceName: image.RootDeviceName,
              virtualizationType: image.VirtualizationType,
              hypervisor: image.Hypervisor,
              enaSupport: image.EnaSupport,
              deprecationTime: image.DeprecationTime,
              tags: image.Tags?.map((tag) => ({
                key: tag.Key,
                value: tag.Value,
              })),
            })) || []

          return {
            images,
            count: images.length,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ec2_list_images",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_ec2_describe_images",
      description:
        "Get detailed information about specific AMIs including block device mappings",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        imageIds: z.array(z.string()).min(1).describe("Image IDs to describe"),
      }),
      async run(args) {
        try {
          const command = new DescribeImagesCommand({
            ImageIds: args.imageIds,
          })

          const response = await getEC2Client(args.region).send(command)

          const images =
            response.Images?.map((image) => ({
              imageId: image.ImageId,
              name: image.Name,
              description: image.Description,
              architecture: image.Architecture,
              creationDate: image.CreationDate,
              imageLocation: image.ImageLocation,
              imageType: image.ImageType,
              public: image.Public,
              ownerId: image.OwnerId,
              ownerAlias: image.ImageOwnerAlias,
              platform: image.Platform,
              platformDetails: image.PlatformDetails,
              usageOperation: image.UsageOperation,
              state: image.State,
              stateReason: image.StateReason
                ? {
                    code: image.StateReason.Code,
                    message: image.StateReason.Message,
                  }
                : undefined,
              blockDeviceMappings: image.BlockDeviceMappings?.map(
                (mapping) => ({
                  deviceName: mapping.DeviceName,
                  virtualName: mapping.VirtualName,
                  ebs: mapping.Ebs
                    ? {
                        deleteOnTermination: mapping.Ebs.DeleteOnTermination,
                        iops: mapping.Ebs.Iops,
                        snapshotId: mapping.Ebs.SnapshotId,
                        volumeSize: mapping.Ebs.VolumeSize,
                        volumeType: mapping.Ebs.VolumeType,
                        throughput: mapping.Ebs.Throughput,
                        encrypted: mapping.Ebs.Encrypted,
                        kmsKeyId: mapping.Ebs.KmsKeyId,
                      }
                    : undefined,
                  noDevice: mapping.NoDevice,
                }),
              ),
              rootDeviceType: image.RootDeviceType,
              rootDeviceName: image.RootDeviceName,
              virtualizationType: image.VirtualizationType,
              sriovNetSupport: image.SriovNetSupport,
              hypervisor: image.Hypervisor,
              enaSupport: image.EnaSupport,
              bootMode: image.BootMode,
              deprecationTime: image.DeprecationTime,
              imdsSupport: image.ImdsSupport,
              tags: image.Tags?.map((tag) => ({
                key: tag.Key,
                value: tag.Value,
              })),
            })) || []

          return {
            images,
            count: images.length,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ec2_describe_images",
            toolArgs: args,
          })
        }
      },
    }),

    // ===== NETWORKING - VPCs =====
    tool({
      name: "aws_ec2_list_vpcs",
      description: "List VPCs (Virtual Private Clouds)",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        vpcIds: z
          .array(z.string())
          .optional()
          .describe("Specific VPC IDs to list"),
        filters: z
          .array(
            z.object({
              name: z
                .string()
                .describe(
                  "Filter name (e.g., state, cidr, dhcp-options-id, tag-key)",
                ),
              values: z.array(z.string()).describe("Filter values"),
            }),
          )
          .optional()
          .describe("Filters to apply"),
        maxResults: z
          .number()
          .min(5)
          .max(1000)
          .optional()
          .describe("Maximum number of results"),
        nextToken: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new DescribeVpcsCommand({
            VpcIds: args.vpcIds,
            Filters: args.filters?.map((f) => ({
              Name: f.name,
              Values: f.values,
            })),
            MaxResults: args.maxResults,
            NextToken: args.nextToken,
          })

          const response = await getEC2Client(args.region).send(command)

          const vpcs =
            response.Vpcs?.map((vpc) => ({
              vpcId: vpc.VpcId,
              state: vpc.State,
              cidrBlock: vpc.CidrBlock,
              dhcpOptionsId: vpc.DhcpOptionsId,
              instanceTenancy: vpc.InstanceTenancy,
              isDefault: vpc.IsDefault,
              ownerId: vpc.OwnerId,
              cidrBlockAssociationSet: vpc.CidrBlockAssociationSet?.map(
                (assoc) => ({
                  associationId: assoc.AssociationId,
                  cidrBlock: assoc.CidrBlock,
                  cidrBlockState: assoc.CidrBlockState
                    ? {
                        state: assoc.CidrBlockState.State,
                        statusMessage: assoc.CidrBlockState.StatusMessage,
                      }
                    : undefined,
                }),
              ),
              ipv6CidrBlockAssociationSet: vpc.Ipv6CidrBlockAssociationSet?.map(
                (assoc) => ({
                  associationId: assoc.AssociationId,
                  ipv6CidrBlock: assoc.Ipv6CidrBlock,
                  ipv6CidrBlockState: assoc.Ipv6CidrBlockState
                    ? {
                        state: assoc.Ipv6CidrBlockState.State,
                        statusMessage: assoc.Ipv6CidrBlockState.StatusMessage,
                      }
                    : undefined,
                  ipv6Pool: assoc.Ipv6Pool,
                  networkBorderGroup: assoc.NetworkBorderGroup,
                }),
              ),
              tags: vpc.Tags?.map((tag) => ({
                key: tag.Key,
                value: tag.Value,
              })),
            })) || []

          return {
            vpcs,
            count: vpcs.length,
            nextToken: response.NextToken,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ec2_list_vpcs",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_ec2_describe_vpcs",
      description: "Get detailed information about specific VPCs",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        vpcIds: z.array(z.string()).min(1).describe("VPC IDs to describe"),
      }),
      async run(args) {
        try {
          const command = new DescribeVpcsCommand({
            VpcIds: args.vpcIds,
          })

          const response = await getEC2Client(args.region).send(command)

          const vpcs =
            response.Vpcs?.map((vpc) => ({
              vpcId: vpc.VpcId,
              state: vpc.State,
              cidrBlock: vpc.CidrBlock,
              dhcpOptionsId: vpc.DhcpOptionsId,
              instanceTenancy: vpc.InstanceTenancy,
              isDefault: vpc.IsDefault,
              ownerId: vpc.OwnerId,
              cidrBlockAssociationSet: vpc.CidrBlockAssociationSet?.map(
                (assoc) => ({
                  associationId: assoc.AssociationId,
                  cidrBlock: assoc.CidrBlock,
                  cidrBlockState: assoc.CidrBlockState
                    ? {
                        state: assoc.CidrBlockState.State,
                        statusMessage: assoc.CidrBlockState.StatusMessage,
                      }
                    : undefined,
                }),
              ),
              ipv6CidrBlockAssociationSet: vpc.Ipv6CidrBlockAssociationSet?.map(
                (assoc) => ({
                  associationId: assoc.AssociationId,
                  ipv6CidrBlock: assoc.Ipv6CidrBlock,
                  ipv6CidrBlockState: assoc.Ipv6CidrBlockState
                    ? {
                        state: assoc.Ipv6CidrBlockState.State,
                        statusMessage: assoc.Ipv6CidrBlockState.StatusMessage,
                      }
                    : undefined,
                  ipv6Pool: assoc.Ipv6Pool,
                  networkBorderGroup: assoc.NetworkBorderGroup,
                }),
              ),
              tags: vpc.Tags?.map((tag) => ({
                key: tag.Key,
                value: tag.Value,
              })),
            })) || []

          return {
            vpcs,
            count: vpcs.length,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ec2_describe_vpcs",
            toolArgs: args,
          })
        }
      },
    }),

    // ===== NETWORKING - SUBNETS =====
    tool({
      name: "aws_ec2_list_subnets",
      description: "List subnets in VPCs",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        subnetIds: z
          .array(z.string())
          .optional()
          .describe("Specific subnet IDs to list"),
        filters: z
          .array(
            z.object({
              name: z
                .string()
                .describe(
                  "Filter name (e.g., vpc-id, availability-zone, cidr-block, state)",
                ),
              values: z.array(z.string()).describe("Filter values"),
            }),
          )
          .optional()
          .describe("Filters to apply"),
        maxResults: z
          .number()
          .min(5)
          .max(1000)
          .optional()
          .describe("Maximum number of results"),
        nextToken: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new DescribeSubnetsCommand({
            SubnetIds: args.subnetIds,
            Filters: args.filters?.map((f) => ({
              Name: f.name,
              Values: f.values,
            })),
            MaxResults: args.maxResults,
            NextToken: args.nextToken,
          })

          const response = await getEC2Client(args.region).send(command)

          const subnets =
            response.Subnets?.map((subnet) => ({
              subnetId: subnet.SubnetId,
              vpcId: subnet.VpcId,
              state: subnet.State,
              cidrBlock: subnet.CidrBlock,
              availabilityZone: subnet.AvailabilityZone,
              availabilityZoneId: subnet.AvailabilityZoneId,
              availableIpAddressCount: subnet.AvailableIpAddressCount,
              defaultForAz: subnet.DefaultForAz,
              mapPublicIpOnLaunch: subnet.MapPublicIpOnLaunch,
              assignIpv6AddressOnCreation: subnet.AssignIpv6AddressOnCreation,
              ownerId: subnet.OwnerId,
              tags: subnet.Tags?.map((tag) => ({
                key: tag.Key,
                value: tag.Value,
              })),
            })) || []

          return {
            subnets,
            count: subnets.length,
            nextToken: response.NextToken,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ec2_list_subnets",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_ec2_describe_subnets",
      description: "Get detailed information about specific subnets",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        subnetIds: z
          .array(z.string())
          .min(1)
          .describe("Subnet IDs to describe"),
      }),
      async run(args) {
        try {
          const command = new DescribeSubnetsCommand({
            SubnetIds: args.subnetIds,
          })

          const response = await getEC2Client(args.region).send(command)

          const subnets =
            response.Subnets?.map((subnet) => ({
              subnetId: subnet.SubnetId,
              subnetArn: subnet.SubnetArn,
              vpcId: subnet.VpcId,
              state: subnet.State,
              cidrBlock: subnet.CidrBlock,
              availabilityZone: subnet.AvailabilityZone,
              availabilityZoneId: subnet.AvailabilityZoneId,
              availableIpAddressCount: subnet.AvailableIpAddressCount,
              defaultForAz: subnet.DefaultForAz,
              mapPublicIpOnLaunch: subnet.MapPublicIpOnLaunch,
              mapCustomerOwnedIpOnLaunch: subnet.MapCustomerOwnedIpOnLaunch,
              assignIpv6AddressOnCreation: subnet.AssignIpv6AddressOnCreation,
              ipv6CidrBlockAssociationSet:
                subnet.Ipv6CidrBlockAssociationSet?.map((assoc) => ({
                  associationId: assoc.AssociationId,
                  ipv6CidrBlock: assoc.Ipv6CidrBlock,
                  ipv6CidrBlockState: assoc.Ipv6CidrBlockState
                    ? {
                        state: assoc.Ipv6CidrBlockState.State,
                        statusMessage: assoc.Ipv6CidrBlockState.StatusMessage,
                      }
                    : undefined,
                })),
              ownerId: subnet.OwnerId,
              customerOwnedIpv4Pool: subnet.CustomerOwnedIpv4Pool,
              outpostArn: subnet.OutpostArn,
              enableDns64: subnet.EnableDns64,
              enableLniAtDeviceIndex: subnet.EnableLniAtDeviceIndex,
              privateDnsNameOptionsOnLaunch:
                subnet.PrivateDnsNameOptionsOnLaunch
                  ? {
                      hostnameType:
                        subnet.PrivateDnsNameOptionsOnLaunch.HostnameType,
                      enableResourceNameDnsARecord:
                        subnet.PrivateDnsNameOptionsOnLaunch
                          .EnableResourceNameDnsARecord,
                      enableResourceNameDnsAAAARecord:
                        subnet.PrivateDnsNameOptionsOnLaunch
                          .EnableResourceNameDnsAAAARecord,
                    }
                  : undefined,
              tags: subnet.Tags?.map((tag) => ({
                key: tag.Key,
                value: tag.Value,
              })),
            })) || []

          return {
            subnets,
            count: subnets.length,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ec2_describe_subnets",
            toolArgs: args,
          })
        }
      },
    }),

    // ===== NETWORKING - NETWORK INTERFACES =====
    tool({
      name: "aws_ec2_list_network_interfaces",
      description: "List network interfaces (ENIs)",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        networkInterfaceIds: z
          .array(z.string())
          .optional()
          .describe("Specific network interface IDs to list"),
        filters: z
          .array(
            z.object({
              name: z
                .string()
                .describe(
                  "Filter name (e.g., attachment.status, vpc-id, subnet-id, status)",
                ),
              values: z.array(z.string()).describe("Filter values"),
            }),
          )
          .optional()
          .describe("Filters to apply"),
        maxResults: z
          .number()
          .min(5)
          .max(1000)
          .optional()
          .describe("Maximum number of results"),
        nextToken: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new DescribeNetworkInterfacesCommand({
            NetworkInterfaceIds: args.networkInterfaceIds,
            Filters: args.filters?.map((f) => ({
              Name: f.name,
              Values: f.values,
            })),
            MaxResults: args.maxResults,
            NextToken: args.nextToken,
          })

          const response = await getEC2Client(args.region).send(command)

          const networkInterfaces =
            response.NetworkInterfaces?.map((ni) => ({
              networkInterfaceId: ni.NetworkInterfaceId,
              status: ni.Status,
              interfaceType: ni.InterfaceType,
              vpcId: ni.VpcId,
              subnetId: ni.SubnetId,
              availabilityZone: ni.AvailabilityZone,
              privateIpAddress: ni.PrivateIpAddress,
              privateDnsName: ni.PrivateDnsName,
              macAddress: ni.MacAddress,
              description: ni.Description,
              ownerId: ni.OwnerId,
              requesterManaged: ni.RequesterManaged,
              sourceDestCheck: ni.SourceDestCheck,
              association: ni.Association
                ? {
                    allocationId: ni.Association.AllocationId,
                    associationId: ni.Association.AssociationId,
                    ipOwnerId: ni.Association.IpOwnerId,
                    publicDnsName: ni.Association.PublicDnsName,
                    publicIp: ni.Association.PublicIp,
                    carrierIp: ni.Association.CarrierIp,
                  }
                : undefined,
              attachment: ni.Attachment
                ? {
                    attachmentId: ni.Attachment.AttachmentId,
                    instanceId: ni.Attachment.InstanceId,
                    instanceOwnerId: ni.Attachment.InstanceOwnerId,
                    deviceIndex: ni.Attachment.DeviceIndex,
                    status: ni.Attachment.Status,
                    attachTime: ni.Attachment.AttachTime?.toISOString(),
                    deleteOnTermination: ni.Attachment.DeleteOnTermination,
                    networkCardIndex: ni.Attachment.NetworkCardIndex,
                  }
                : undefined,
              tags: ni.TagSet?.map((tag) => ({
                key: tag.Key,
                value: tag.Value,
              })),
            })) || []

          return {
            networkInterfaces,
            count: networkInterfaces.length,
            nextToken: response.NextToken,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ec2_list_network_interfaces",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_ec2_describe_network_interfaces",
      description:
        "Get detailed information about specific network interfaces including security groups and IP addresses",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        networkInterfaceIds: z
          .array(z.string())
          .min(1)
          .describe("Network interface IDs to describe"),
      }),
      async run(args) {
        try {
          const command = new DescribeNetworkInterfacesCommand({
            NetworkInterfaceIds: args.networkInterfaceIds,
          })

          const response = await getEC2Client(args.region).send(command)

          const networkInterfaces =
            response.NetworkInterfaces?.map((ni) => ({
              networkInterfaceId: ni.NetworkInterfaceId,
              status: ni.Status,
              interfaceType: ni.InterfaceType,
              vpcId: ni.VpcId,
              subnetId: ni.SubnetId,
              availabilityZone: ni.AvailabilityZone,
              privateIpAddress: ni.PrivateIpAddress,
              privateIpAddresses: ni.PrivateIpAddresses?.map((ip) => ({
                primary: ip.Primary,
                privateIpAddress: ip.PrivateIpAddress,
                privateDnsName: ip.PrivateDnsName,
                association: ip.Association
                  ? {
                      allocationId: ip.Association.AllocationId,
                      associationId: ip.Association.AssociationId,
                      ipOwnerId: ip.Association.IpOwnerId,
                      publicDnsName: ip.Association.PublicDnsName,
                      publicIp: ip.Association.PublicIp,
                    }
                  : undefined,
              })),
              ipv6Addresses: ni.Ipv6Addresses?.map((ip) => ({
                ipv6Address: ip.Ipv6Address,
              })),
              privateDnsName: ni.PrivateDnsName,
              macAddress: ni.MacAddress,
              description: ni.Description,
              ownerId: ni.OwnerId,
              requesterId: ni.RequesterId,
              requesterManaged: ni.RequesterManaged,
              sourceDestCheck: ni.SourceDestCheck,
              groups: ni.Groups?.map((group) => ({
                groupName: group.GroupName,
                groupId: group.GroupId,
              })),
              association: ni.Association
                ? {
                    allocationId: ni.Association.AllocationId,
                    associationId: ni.Association.AssociationId,
                    ipOwnerId: ni.Association.IpOwnerId,
                    publicDnsName: ni.Association.PublicDnsName,
                    publicIp: ni.Association.PublicIp,
                    carrierIp: ni.Association.CarrierIp,
                  }
                : undefined,
              attachment: ni.Attachment
                ? {
                    attachmentId: ni.Attachment.AttachmentId,
                    instanceId: ni.Attachment.InstanceId,
                    instanceOwnerId: ni.Attachment.InstanceOwnerId,
                    deviceIndex: ni.Attachment.DeviceIndex,
                    status: ni.Attachment.Status,
                    attachTime: ni.Attachment.AttachTime?.toISOString(),
                    deleteOnTermination: ni.Attachment.DeleteOnTermination,
                    networkCardIndex: ni.Attachment.NetworkCardIndex,
                  }
                : undefined,
              outpostArn: ni.OutpostArn,
              denyAllIgwTraffic: ni.DenyAllIgwTraffic,
              ipv6Native: ni.Ipv6Native,
              ipv4Prefixes: ni.Ipv4Prefixes?.map((prefix) => ({
                ipv4Prefix: prefix.Ipv4Prefix,
              })),
              ipv6Prefixes: ni.Ipv6Prefixes?.map((prefix) => ({
                ipv6Prefix: prefix.Ipv6Prefix,
              })),
              tags: ni.TagSet?.map((tag) => ({
                key: tag.Key,
                value: tag.Value,
              })),
            })) || []

          return {
            networkInterfaces,
            count: networkInterfaces.length,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_ec2_describe_network_interfaces",
            toolArgs: args,
          })
        }
      },
    }),
  ]
}
