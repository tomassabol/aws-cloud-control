import {
  DescribeDBClustersCommand,
  DescribeDBClusterSnapshotsCommand,
  DescribeDBEngineVersionsCommand,
  DescribeDBInstancesCommand,
  DescribeDBParameterGroupsCommand,
  DescribeDBParametersCommand,
  DescribeDBSnapshotsCommand,
  DescribeDBSubnetGroupsCommand,
  DescribeReservedDBInstancesCommand,
  DescribeReservedDBInstancesOfferingsCommand,
  RDSClient,
} from "@aws-sdk/client-rds"
import { z } from "zod"

import {
  AWS_REGIONS,
  type AwsRegion,
  DEFAULT_AWS_REGION,
} from "~/utils/aws-region"
import { type Tool, tool } from "~/utils/tool"
import { ToolError } from "~/utils/tool-error"

export function createRDSTools(): Tool[] {
  const getRDSClient = (region: AwsRegion = DEFAULT_AWS_REGION) => {
    return new RDSClient({ region })
  }

  return [
    tool({
      name: "aws_rds_list_db_instances",
      description: "List all RDS DB instances with optional filtering",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        dbInstanceIdentifier: z
          .string()
          .optional()
          .describe("DB instance identifier to filter by"),
        maxRecords: z
          .number()
          .min(20)
          .max(100)
          .optional()
          .describe("Maximum number of records to return"),
        marker: z.string().optional().describe("Pagination token"),
        filters: z
          .array(
            z.object({
              name: z.string().describe("Filter name"),
              values: z.array(z.string()).describe("Filter values"),
            }),
          )
          .optional()
          .describe("Filters to apply"),
      }),
      async run(args) {
        try {
          const command = new DescribeDBInstancesCommand({
            DBInstanceIdentifier: args.dbInstanceIdentifier,
            MaxRecords: args.maxRecords,
            Marker: args.marker,
            Filters: args.filters?.map((f) => ({
              Name: f.name,
              Values: f.values,
            })),
          })

          const response = await getRDSClient(args.region).send(command)

          const dbInstances =
            response.DBInstances?.map((instance) => ({
              dbInstanceIdentifier: instance.DBInstanceIdentifier,
              dbInstanceClass: instance.DBInstanceClass,
              engine: instance.Engine,
              engineVersion: instance.EngineVersion,
              dbInstanceStatus: instance.DBInstanceStatus,
              masterUsername: instance.MasterUsername,
              dbName: instance.DBName,
              allocatedStorage: instance.AllocatedStorage,
              storageType: instance.StorageType,
              iops: instance.Iops,
              storageEncrypted: instance.StorageEncrypted,
              kmsKeyId: instance.KmsKeyId,
              dbInstanceArn: instance.DBInstanceArn,
              availabilityZone: instance.AvailabilityZone,
              multiAZ: instance.MultiAZ,
              publiclyAccessible: instance.PubliclyAccessible,
              vpcId: instance.DBSubnetGroup?.VpcId,
              subnetGroupName: instance.DBSubnetGroup?.DBSubnetGroupName,
              preferredBackupWindow: instance.PreferredBackupWindow,
              backupRetentionPeriod: instance.BackupRetentionPeriod,
              preferredMaintenanceWindow: instance.PreferredMaintenanceWindow,
              latestRestorableTime:
                instance.LatestRestorableTime?.toISOString(),
              autoMinorVersionUpgrade: instance.AutoMinorVersionUpgrade,
              readReplicaDBInstanceIdentifiers:
                instance.ReadReplicaDBInstanceIdentifiers,
              readReplicaDBClusterIdentifiers:
                instance.ReadReplicaDBClusterIdentifiers,
              licenseModel: instance.LicenseModel,
              optionGroupMemberships: instance.OptionGroupMemberships?.map(
                (ogm) => ({
                  optionGroupName: ogm.OptionGroupName,
                  status: ogm.Status,
                }),
              ),
              characterSetName: instance.CharacterSetName,
              secondaryAvailabilityZone: instance.SecondaryAvailabilityZone,
              statusInfos: instance.StatusInfos?.map((si) => ({
                statusType: si.StatusType,
                normal: si.Normal,
                status: si.Status,
                message: si.Message,
              })),
              storageThroughput: instance.StorageThroughput,
              dbInstancePort: instance.DbInstancePort,
              dbClusterIdentifier: instance.DBClusterIdentifier,
              enhancedMonitoringResourceArn:
                instance.EnhancedMonitoringResourceArn,
              monitoringInterval: instance.MonitoringInterval,
              monitoringRoleArn: instance.MonitoringRoleArn,
              performanceInsightsEnabled: instance.PerformanceInsightsEnabled,
              performanceInsightsKMSKeyId: instance.PerformanceInsightsKMSKeyId,
              performanceInsightsRetentionPeriod:
                instance.PerformanceInsightsRetentionPeriod,
              enabledCloudwatchLogsExports:
                instance.EnabledCloudwatchLogsExports,
              processorFeatures: instance.ProcessorFeatures?.map((pf) => ({
                name: pf.Name,
                value: pf.Value,
              })),
              deletionProtection: instance.DeletionProtection,
              associatedRoles: instance.AssociatedRoles?.map((ar) => ({
                roleArn: ar.RoleArn,
                featureName: ar.FeatureName,
                status: ar.Status,
              })),
              listenerEndpoint: instance.ListenerEndpoint
                ? {
                    address: instance.ListenerEndpoint.Address,
                    port: instance.ListenerEndpoint.Port,
                    hostedZoneId: instance.ListenerEndpoint.HostedZoneId,
                  }
                : undefined,
              maxAllocatedStorage: instance.MaxAllocatedStorage,
              tagList: instance.TagList,
              dbInstanceAutomatedBackupsReplications:
                instance.DBInstanceAutomatedBackupsReplications?.map((b) => ({
                  dbInstanceAutomatedBackupsArn:
                    b.DBInstanceAutomatedBackupsArn,
                })),
              customerOwnedIpEnabled: instance.CustomerOwnedIpEnabled,
              awsBackupRecoveryPointArn: instance.AwsBackupRecoveryPointArn,
              activityStreamStatus: instance.ActivityStreamStatus,
              activityStreamKmsKeyId: instance.ActivityStreamKmsKeyId,
              activityStreamMode: instance.ActivityStreamMode,
              activityStreamEngineNativeAuditFieldsIncluded:
                instance.ActivityStreamEngineNativeAuditFieldsIncluded,
              automationMode: instance.AutomationMode,
              resumeFullAutomationModeTime:
                instance.ResumeFullAutomationModeTime?.toISOString(),
              dbInstanceCreateTime: instance.InstanceCreateTime?.toISOString(),
            })) || []

          return {
            dbInstances,
            count: dbInstances.length,
            marker: response.Marker,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_rds_list_db_instances",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_rds_describe_db_instance",
      description: "Get detailed information about a specific DB instance",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        dbInstanceIdentifier: z.string().describe("DB instance identifier"),
      }),
      async run(args) {
        try {
          const command = new DescribeDBInstancesCommand({
            DBInstanceIdentifier: args.dbInstanceIdentifier,
          })

          const response = await getRDSClient(args.region).send(command)

          const instance = response.DBInstances?.[0]
          if (!instance) {
            throw new ToolError({
              message: `DB instance ${args.dbInstanceIdentifier} not found`,
              toolName: "aws_rds_describe_db_instance",
              toolArgs: args,
            })
          }

          return {
            dbInstanceIdentifier: instance.DBInstanceIdentifier,
            dbInstanceClass: instance.DBInstanceClass,
            engine: instance.Engine,
            engineVersion: instance.EngineVersion,
            dbInstanceStatus: instance.DBInstanceStatus,
            masterUsername: instance.MasterUsername,
            dbName: instance.DBName,
            allocatedStorage: instance.AllocatedStorage,
            storageType: instance.StorageType,
            iops: instance.Iops,
            storageEncrypted: instance.StorageEncrypted,
            kmsKeyId: instance.KmsKeyId,
            dbInstanceArn: instance.DBInstanceArn,
            availabilityZone: instance.AvailabilityZone,
            multiAZ: instance.MultiAZ,
            publiclyAccessible: instance.PubliclyAccessible,
            vpcId: instance.DBSubnetGroup?.VpcId,
            subnetGroupName: instance.DBSubnetGroup?.DBSubnetGroupName,
            preferredBackupWindow: instance.PreferredBackupWindow,
            backupRetentionPeriod: instance.BackupRetentionPeriod,
            preferredMaintenanceWindow: instance.PreferredMaintenanceWindow,
            latestRestorableTime: instance.LatestRestorableTime?.toISOString(),
            autoMinorVersionUpgrade: instance.AutoMinorVersionUpgrade,
            readReplicaDBInstanceIdentifiers:
              instance.ReadReplicaDBInstanceIdentifiers,
            readReplicaDBClusterIdentifiers:
              instance.ReadReplicaDBClusterIdentifiers,
            licenseModel: instance.LicenseModel,
            optionGroupMemberships: instance.OptionGroupMemberships?.map(
              (ogm) => ({
                optionGroupName: ogm.OptionGroupName,
                status: ogm.Status,
              }),
            ),
            characterSetName: instance.CharacterSetName,
            secondaryAvailabilityZone: instance.SecondaryAvailabilityZone,
            statusInfos: instance.StatusInfos?.map((si) => ({
              statusType: si.StatusType,
              normal: si.Normal,
              status: si.Status,
              message: si.Message,
            })),
            storageThroughput: instance.StorageThroughput,
            dbInstancePort: instance.DbInstancePort,
            dbClusterIdentifier: instance.DBClusterIdentifier,
            enhancedMonitoringResourceArn:
              instance.EnhancedMonitoringResourceArn,
            monitoringInterval: instance.MonitoringInterval,
            monitoringRoleArn: instance.MonitoringRoleArn,
            performanceInsightsEnabled: instance.PerformanceInsightsEnabled,
            performanceInsightsKMSKeyId: instance.PerformanceInsightsKMSKeyId,
            performanceInsightsRetentionPeriod:
              instance.PerformanceInsightsRetentionPeriod,
            enabledCloudwatchLogsExports: instance.EnabledCloudwatchLogsExports,
            processorFeatures: instance.ProcessorFeatures?.map((pf) => ({
              name: pf.Name,
              value: pf.Value,
            })),
            deletionProtection: instance.DeletionProtection,
            associatedRoles: instance.AssociatedRoles?.map((ar) => ({
              roleArn: ar.RoleArn,
              featureName: ar.FeatureName,
              status: ar.Status,
            })),
            listenerEndpoint: instance.ListenerEndpoint
              ? {
                  address: instance.ListenerEndpoint.Address,
                  port: instance.ListenerEndpoint.Port,
                  hostedZoneId: instance.ListenerEndpoint.HostedZoneId,
                }
              : undefined,
            maxAllocatedStorage: instance.MaxAllocatedStorage,
            tagList: instance.TagList,
            dbInstanceAutomatedBackupsReplications:
              instance.DBInstanceAutomatedBackupsReplications?.map((b) => ({
                dbInstanceAutomatedBackupsArn: b.DBInstanceAutomatedBackupsArn,
              })),
            customerOwnedIpEnabled: instance.CustomerOwnedIpEnabled,
            awsBackupRecoveryPointArn: instance.AwsBackupRecoveryPointArn,
            activityStreamStatus: instance.ActivityStreamStatus,
            activityStreamKmsKeyId: instance.ActivityStreamKmsKeyId,
            activityStreamMode: instance.ActivityStreamMode,
            activityStreamEngineNativeAuditFieldsIncluded:
              instance.ActivityStreamEngineNativeAuditFieldsIncluded,
            automationMode: instance.AutomationMode,
            resumeFullAutomationModeTime:
              instance.ResumeFullAutomationModeTime?.toISOString(),
            dbInstanceCreateTime: instance.InstanceCreateTime?.toISOString(),
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_rds_describe_db_instance",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_rds_list_db_clusters",
      description: "List Aurora/RDS clusters with optional filtering",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        dbClusterIdentifier: z
          .string()
          .optional()
          .describe("DB cluster identifier to filter by"),
        maxRecords: z
          .number()
          .min(20)
          .max(100)
          .optional()
          .describe("Maximum number of records to return"),
        marker: z.string().optional().describe("Pagination token"),
        filters: z
          .array(
            z.object({
              name: z.string().describe("Filter name"),
              values: z.array(z.string()).describe("Filter values"),
            }),
          )
          .optional()
          .describe("Filters to apply"),
      }),
      async run(args) {
        try {
          const command = new DescribeDBClustersCommand({
            DBClusterIdentifier: args.dbClusterIdentifier,
            MaxRecords: args.maxRecords,
            Marker: args.marker,
            Filters: args.filters?.map((f) => ({
              Name: f.name,
              Values: f.values,
            })),
          })

          const response = await getRDSClient(args.region).send(command)

          const dbClusters =
            response.DBClusters?.map((cluster) => ({
              dbClusterIdentifier: cluster.DBClusterIdentifier,
              dbClusterArn: cluster.DBClusterArn,
              status: cluster.Status,
              engine: cluster.Engine,
              engineVersion: cluster.EngineVersion,
              engineMode: cluster.EngineMode,
              allocatedStorage: cluster.AllocatedStorage,
              storageEncrypted: cluster.StorageEncrypted,
              kmsKeyId: cluster.KmsKeyId,
              databaseName: cluster.DatabaseName,
              masterUsername: cluster.MasterUsername,
              masterUserSecret: cluster.MasterUserSecret
                ? {
                    secretArn: cluster.MasterUserSecret.SecretArn,
                    secretStatus: cluster.MasterUserSecret.SecretStatus,
                  }
                : undefined,
              preferredBackupWindow: cluster.PreferredBackupWindow,
              backupRetentionPeriod: cluster.BackupRetentionPeriod,
              preferredMaintenanceWindow: cluster.PreferredMaintenanceWindow,
              latestRestorableTime: cluster.LatestRestorableTime?.toISOString(),
              port: cluster.Port,
              multiAZ: cluster.MultiAZ,
              dbClusterInstanceClass: cluster.DBClusterInstanceClass,
              storageType: cluster.StorageType,
              iops: cluster.Iops,
              publiclyAccessible: cluster.PubliclyAccessible,
              autoMinorVersionUpgrade: cluster.AutoMinorVersionUpgrade,
              monitoringInterval: cluster.MonitoringInterval,
              monitoringRoleArn: cluster.MonitoringRoleArn,
              performanceInsightsEnabled: cluster.PerformanceInsightsEnabled,
              performanceInsightsKMSKeyId: cluster.PerformanceInsightsKMSKeyId,
              performanceInsightsRetentionPeriod:
                cluster.PerformanceInsightsRetentionPeriod,
              enabledCloudwatchLogsExports:
                cluster.EnabledCloudwatchLogsExports,
              deletionProtection: cluster.DeletionProtection,
              httpEndpointEnabled: cluster.HttpEndpointEnabled,
              activityStreamMode: cluster.ActivityStreamMode,
              activityStreamStatus: cluster.ActivityStreamStatus,
              activityStreamKmsKeyId: cluster.ActivityStreamKmsKeyId,
              copyTagsToSnapshot: cluster.CopyTagsToSnapshot,
              crossAccountClone: cluster.CrossAccountClone,
              domainMemberships: cluster.DomainMemberships?.map((dm) => ({
                domain: dm.Domain,
                status: dm.Status,
                fqdn: dm.FQDN,
                iamRoleName: dm.IAMRoleName,
              })),
              tagList: cluster.TagList,
              globalWriteForwardingStatus: cluster.GlobalWriteForwardingStatus,
              globalWriteForwardingRequested:
                cluster.GlobalWriteForwardingRequested,
              pendingModifiedValues: cluster.PendingModifiedValues
                ? {
                    pendingCloudwatchLogsExports:
                      cluster.PendingModifiedValues
                        .PendingCloudwatchLogsExports,
                    dbClusterIdentifier:
                      cluster.PendingModifiedValues.DBClusterIdentifier,
                    masterUserPassword:
                      cluster.PendingModifiedValues.MasterUserPassword,
                    iamDatabaseAuthenticationEnabled:
                      cluster.PendingModifiedValues
                        .IAMDatabaseAuthenticationEnabled,
                    engineVersion: cluster.PendingModifiedValues.EngineVersion,
                    backupRetentionPeriod:
                      cluster.PendingModifiedValues.BackupRetentionPeriod,
                    allocatedStorage:
                      cluster.PendingModifiedValues.AllocatedStorage,
                    iops: cluster.PendingModifiedValues.Iops,
                    storageType: cluster.PendingModifiedValues.StorageType,
                    storageThroughput: cluster.StorageThroughput,
                  }
                : undefined,
              dbClusterMembers: cluster.DBClusterMembers?.map((m) => ({
                dbInstanceIdentifier: m.DBInstanceIdentifier,
                isClusterWriter: m.IsClusterWriter,
                dbClusterParameterGroupStatus: m.DBClusterParameterGroupStatus,
                promotionTier: m.PromotionTier,
              })),
              vpcSecurityGroups: cluster.VpcSecurityGroups?.map((vsg) => ({
                vpcSecurityGroupId: vsg.VpcSecurityGroupId,
                status: vsg.Status,
              })),
              hostedZoneId: cluster.HostedZoneId,
              storageThroughput: cluster.StorageThroughput,
              dbClusterResourceId: cluster.DBClusterIdentifier,
              dbSystemId: cluster.DBSystemId,
              masterUserSecretKmsKeyId: cluster.MasterUserSecret?.KmsKeyId,
              serverlessV2ScalingConfiguration:
                cluster.ServerlessV2ScalingConfiguration
                  ? {
                      minCapacity:
                        cluster.ServerlessV2ScalingConfiguration.MinCapacity,
                      maxCapacity:
                        cluster.ServerlessV2ScalingConfiguration.MaxCapacity,
                    }
                  : undefined,
              networkType: cluster.NetworkType,
              dbClusterCreateTime: cluster.ClusterCreateTime?.toISOString(),
            })) || []

          return {
            dbClusters,
            count: dbClusters.length,
            marker: response.Marker,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_rds_list_db_clusters",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_rds_describe_db_cluster",
      description: "Get detailed information about a specific DB cluster",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        dbClusterIdentifier: z.string().describe("DB cluster identifier"),
      }),
      async run(args) {
        try {
          const command = new DescribeDBClustersCommand({
            DBClusterIdentifier: args.dbClusterIdentifier,
          })

          const response = await getRDSClient(args.region).send(command)

          const cluster = response.DBClusters?.[0]
          if (!cluster) {
            throw new ToolError({
              message: `DB cluster ${args.dbClusterIdentifier} not found`,
              toolName: "aws_rds_describe_db_cluster",
              toolArgs: args,
            })
          }

          return {
            dbClusterIdentifier: cluster.DBClusterIdentifier,
            dbClusterArn: cluster.DBClusterArn,
            status: cluster.Status,
            engine: cluster.Engine,
            engineVersion: cluster.EngineVersion,
            engineMode: cluster.EngineMode,
            allocatedStorage: cluster.AllocatedStorage,
            storageEncrypted: cluster.StorageEncrypted,
            kmsKeyId: cluster.KmsKeyId,
            databaseName: cluster.DatabaseName,
            masterUsername: cluster.MasterUsername,
            masterUserSecret: cluster.MasterUserSecret
              ? {
                  secretArn: cluster.MasterUserSecret.SecretArn,
                  secretStatus: cluster.MasterUserSecret.SecretStatus,
                }
              : undefined,
            preferredBackupWindow: cluster.PreferredBackupWindow,
            backupRetentionPeriod: cluster.BackupRetentionPeriod,
            preferredMaintenanceWindow: cluster.PreferredMaintenanceWindow,
            latestRestorableTime: cluster.LatestRestorableTime?.toISOString(),
            port: cluster.Port,
            multiAZ: cluster.MultiAZ,
            dbClusterInstanceClass: cluster.DBClusterInstanceClass,
            storageType: cluster.StorageType,
            iops: cluster.Iops,
            publiclyAccessible: cluster.PubliclyAccessible,
            autoMinorVersionUpgrade: cluster.AutoMinorVersionUpgrade,
            monitoringInterval: cluster.MonitoringInterval,
            monitoringRoleArn: cluster.MonitoringRoleArn,
            performanceInsightsEnabled: cluster.PerformanceInsightsEnabled,
            performanceInsightsKMSKeyId: cluster.PerformanceInsightsKMSKeyId,
            performanceInsightsRetentionPeriod:
              cluster.PerformanceInsightsRetentionPeriod,
            enabledCloudwatchLogsExports: cluster.EnabledCloudwatchLogsExports,
            deletionProtection: cluster.DeletionProtection,
            httpEndpointEnabled: cluster.HttpEndpointEnabled,
            activityStreamMode: cluster.ActivityStreamMode,
            activityStreamStatus: cluster.ActivityStreamStatus,
            activityStreamKmsKeyId: cluster.ActivityStreamKmsKeyId,
            copyTagsToSnapshot: cluster.CopyTagsToSnapshot,
            crossAccountClone: cluster.CrossAccountClone,
            domainMemberships: cluster.DomainMemberships?.map((dm) => ({
              domain: dm.Domain,
              status: dm.Status,
              fqdn: dm.FQDN,
              iamRoleName: dm.IAMRoleName,
            })),
            tagList: cluster.TagList,
            globalWriteForwardingStatus: cluster.GlobalWriteForwardingStatus,
            globalWriteForwardingRequested:
              cluster.GlobalWriteForwardingRequested,
            pendingModifiedValues: cluster.PendingModifiedValues
              ? {
                  pendingCloudwatchLogsExports:
                    cluster.PendingModifiedValues.PendingCloudwatchLogsExports,
                  dbClusterIdentifier:
                    cluster.PendingModifiedValues.DBClusterIdentifier,
                  masterUserPassword:
                    cluster.PendingModifiedValues.MasterUserPassword,
                  iamDatabaseAuthenticationEnabled:
                    cluster.PendingModifiedValues
                      .IAMDatabaseAuthenticationEnabled,
                  engineVersion: cluster.PendingModifiedValues.EngineVersion,
                  backupRetentionPeriod:
                    cluster.PendingModifiedValues.BackupRetentionPeriod,
                  allocatedStorage:
                    cluster.PendingModifiedValues.AllocatedStorage,
                  iops: cluster.PendingModifiedValues.Iops,
                  storageType: cluster.PendingModifiedValues.StorageType,
                  storageThroughput: cluster.StorageThroughput,
                }
              : undefined,
            dbClusterMembers: cluster.DBClusterMembers?.map((m) => ({
              dbInstanceIdentifier: m.DBInstanceIdentifier,
              isClusterWriter: m.IsClusterWriter,
              dbClusterParameterGroupStatus: m.DBClusterParameterGroupStatus,
              promotionTier: m.PromotionTier,
            })),
            vpcSecurityGroups: cluster.VpcSecurityGroups?.map((vsg) => ({
              vpcSecurityGroupId: vsg.VpcSecurityGroupId,
              status: vsg.Status,
            })),
            hostedZoneId: cluster.HostedZoneId,
            storageThroughput: cluster.StorageThroughput,
            dbClusterResourceId: cluster.DbClusterResourceId,
            dbSystemId: cluster.DBSystemId,
            masterUserSecretKmsKeyId: cluster.MasterUserSecret?.KmsKeyId,
            serverlessV2ScalingConfiguration:
              cluster.ServerlessV2ScalingConfiguration
                ? {
                    minCapacity:
                      cluster.ServerlessV2ScalingConfiguration.MinCapacity,
                    maxCapacity:
                      cluster.ServerlessV2ScalingConfiguration.MaxCapacity,
                  }
                : undefined,
            networkType: cluster.NetworkType,
            dbClusterCreateTime: cluster.ClusterCreateTime?.toISOString(),
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_rds_describe_db_cluster",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_rds_list_reserved_db_instances",
      description: "List reserved DB instances",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        reservedDBInstanceId: z
          .string()
          .optional()
          .describe("Reserved DB instance identifier to filter by"),
        offeringType: z.string().optional().describe("Offering type filter"),
        productDescription: z
          .string()
          .optional()
          .describe("Product description filter"),
        duration: z
          .string()
          .optional()
          .describe("Duration filter (e.g., '1y', '3y')"),
        maxRecords: z
          .number()
          .min(20)
          .max(100)
          .optional()
          .describe("Maximum number of records to return"),
        marker: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new DescribeReservedDBInstancesCommand({
            ReservedDBInstanceId: args.reservedDBInstanceId,
            OfferingType: args.offeringType,
            ProductDescription: args.productDescription,
            Duration: args.duration,
            MaxRecords: args.maxRecords,
            Marker: args.marker,
          })

          const response = await getRDSClient(args.region).send(command)

          const reservedDBInstances =
            response.ReservedDBInstances?.map((reserved) => ({
              reservedDBInstanceId: reserved.ReservedDBInstanceId,
              reservedDBInstancesOfferingId:
                reserved.ReservedDBInstancesOfferingId,
              dbInstanceClass: reserved.DBInstanceClass,
              startTime: reserved.StartTime?.toISOString(),
              duration: reserved.Duration,
              fixedPrice: reserved.FixedPrice,
              usagePrice: reserved.UsagePrice,
              currencyCode: reserved.CurrencyCode,
              dbInstanceCount: reserved.DBInstanceCount,
              productDescription: reserved.ProductDescription,
              offeringType: reserved.OfferingType,
              multiAZ: reserved.MultiAZ,
              state: reserved.State,
              recurringCharges: reserved.RecurringCharges?.map((rc) => ({
                recurringChargeAmount: rc.RecurringChargeAmount,
                recurringChargeFrequency: rc.RecurringChargeFrequency,
              })),
              reservedDBInstanceArn: reserved.ReservedDBInstanceArn,
              leaseId: reserved.LeaseId,
            })) || []

          return {
            reservedDBInstances,
            count: reservedDBInstances.length,
            marker: response.Marker,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_rds_list_reserved_db_instances",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_rds_describe_reserved_db_offerings",
      description: "List available reserved DB instance offerings",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        reservedDBInstancesOfferingId: z
          .string()
          .optional()
          .describe("Reserved DB instances offering identifier"),
        dbInstanceClass: z
          .string()
          .optional()
          .describe("DB instance class filter"),
        duration: z
          .string()
          .optional()
          .describe("Duration filter (e.g., '1y', '3y')"),
        productDescription: z
          .string()
          .optional()
          .describe("Product description filter"),
        offeringType: z.string().optional().describe("Offering type filter"),
        multiAZ: z.boolean().optional().describe("Multi-AZ filter"),
        maxRecords: z
          .number()
          .min(20)
          .max(100)
          .optional()
          .describe("Maximum number of records to return"),
        marker: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new DescribeReservedDBInstancesOfferingsCommand({
            ReservedDBInstancesOfferingId: args.reservedDBInstancesOfferingId,
            DBInstanceClass: args.dbInstanceClass,
            Duration: args.duration,
            ProductDescription: args.productDescription,
            OfferingType: args.offeringType,
            MultiAZ: args.multiAZ,
            MaxRecords: args.maxRecords,
            Marker: args.marker,
          })

          const response = await getRDSClient(args.region).send(command)

          const reservedDBInstancesOfferings =
            response.ReservedDBInstancesOfferings?.map((offering) => ({
              reservedDBInstancesOfferingId:
                offering.ReservedDBInstancesOfferingId,
              dbInstanceClass: offering.DBInstanceClass,
              duration: offering.Duration,
              fixedPrice: offering.FixedPrice,
              usagePrice: offering.UsagePrice,
              currencyCode: offering.CurrencyCode,
              productDescription: offering.ProductDescription,
              offeringType: offering.OfferingType,
              multiAZ: offering.MultiAZ,
              recurringCharges: offering.RecurringCharges?.map((rc) => ({
                recurringChargeAmount: rc.RecurringChargeAmount,
                recurringChargeFrequency: rc.RecurringChargeFrequency,
              })),
            })) || []

          return {
            reservedDBInstancesOfferings,
            count: reservedDBInstancesOfferings.length,
            marker: response.Marker,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_rds_describe_reserved_db_offerings",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_rds_list_db_snapshots",
      description: "List DB snapshots with optional filtering",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        dbInstanceIdentifier: z
          .string()
          .optional()
          .describe("DB instance identifier to filter by"),
        dbSnapshotIdentifier: z
          .string()
          .optional()
          .describe("DB snapshot identifier to filter by"),
        snapshotType: z
          .string()
          .optional()
          .describe("Snapshot type filter (e.g., 'automated', 'manual')"),
        maxRecords: z
          .number()
          .min(20)
          .max(100)
          .optional()
          .describe("Maximum number of records to return"),
        marker: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new DescribeDBSnapshotsCommand({
            DBInstanceIdentifier: args.dbInstanceIdentifier,
            DBSnapshotIdentifier: args.dbSnapshotIdentifier,
            SnapshotType: args.snapshotType,
            MaxRecords: args.maxRecords,
            Marker: args.marker,
          })

          const response = await getRDSClient(args.region).send(command)

          const dbSnapshots =
            response.DBSnapshots?.map((snapshot) => ({
              dbSnapshotIdentifier: snapshot.DBSnapshotIdentifier,
              dbInstanceIdentifier: snapshot.DBInstanceIdentifier,
              snapshotCreateTime: snapshot.SnapshotCreateTime?.toISOString(),
              engine: snapshot.Engine,
              engineVersion: snapshot.EngineVersion,
              allocatedStorage: snapshot.AllocatedStorage,
              status: snapshot.Status,
              port: snapshot.Port,
              availabilityZone: snapshot.AvailabilityZone,
              vpcId: snapshot.VpcId,
              instanceCreateTime: snapshot.InstanceCreateTime?.toISOString(),
              masterUsername: snapshot.MasterUsername,
              licenseModel: snapshot.LicenseModel,
              snapshotType: snapshot.SnapshotType,
              iops: snapshot.Iops,
              optionGroupName: snapshot.OptionGroupName,
              percentProgress: snapshot.PercentProgress,
              sourceRegion: snapshot.SourceRegion,
              sourceDBSnapshotIdentifier: snapshot.SourceDBSnapshotIdentifier,
              storageType: snapshot.StorageType,
              tdeCredentialArn: snapshot.TdeCredentialArn,
              encrypted: snapshot.Encrypted,
              kmsKeyId: snapshot.KmsKeyId,
              dbSnapshotArn: snapshot.DBSnapshotArn,
              timezone: snapshot.Timezone,
              iamDatabaseAuthenticationEnabled:
                snapshot.IAMDatabaseAuthenticationEnabled,
              processorFeatures: snapshot.ProcessorFeatures?.map((pf) => ({
                name: pf.Name,
                value: pf.Value,
              })),
              dbiResourceId: snapshot.DbiResourceId,
              tagList: snapshot.TagList,
              originalSnapshotCreateTime:
                snapshot.OriginalSnapshotCreateTime?.toISOString(),
              snapshotTarget: snapshot.SnapshotTarget,
              storageThroughput: snapshot.StorageThroughput,
            })) || []

          return {
            dbSnapshots,
            count: dbSnapshots.length,
            marker: response.Marker,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_rds_list_db_snapshots",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_rds_list_db_cluster_snapshots",
      description: "List DB cluster snapshots with optional filtering",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        dbClusterIdentifier: z
          .string()
          .optional()
          .describe("DB cluster identifier to filter by"),
        dbClusterSnapshotIdentifier: z
          .string()
          .optional()
          .describe("DB cluster snapshot identifier to filter by"),
        snapshotType: z
          .string()
          .optional()
          .describe("Snapshot type filter (e.g., 'automated', 'manual')"),
        maxRecords: z
          .number()
          .min(20)
          .max(100)
          .optional()
          .describe("Maximum number of records to return"),
        marker: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new DescribeDBClusterSnapshotsCommand({
            DBClusterIdentifier: args.dbClusterIdentifier,
            DBClusterSnapshotIdentifier: args.dbClusterSnapshotIdentifier,
            SnapshotType: args.snapshotType,
            MaxRecords: args.maxRecords,
            Marker: args.marker,
          })

          const response = await getRDSClient(args.region).send(command)

          const dbClusterSnapshots =
            response.DBClusterSnapshots?.map((snapshot) => ({
              dbClusterSnapshotIdentifier: snapshot.DBClusterSnapshotIdentifier,
              dbClusterIdentifier: snapshot.DBClusterIdentifier,
              snapshotCreateTime: snapshot.SnapshotCreateTime?.toISOString(),
              engine: snapshot.Engine,
              engineMode: snapshot.EngineMode,
              allocatedStorage: snapshot.AllocatedStorage,
              status: snapshot.Status,
              port: snapshot.Port,
              vpcId: snapshot.VpcId,
              clusterCreateTime: snapshot.ClusterCreateTime?.toISOString(),
              masterUsername: snapshot.MasterUsername,
              engineVersion: snapshot.EngineVersion,
              snapshotType: snapshot.SnapshotType,
              percentProgress: snapshot.PercentProgress,
              storageEncrypted: snapshot.StorageEncrypted,
              kmsKeyId: snapshot.KmsKeyId,
              dbClusterSnapshotArn: snapshot.DBClusterSnapshotArn,
              sourceDBClusterSnapshotArn: snapshot.SourceDBClusterSnapshotArn,
              iamDatabaseAuthenticationEnabled:
                snapshot.IAMDatabaseAuthenticationEnabled,
              tagList: snapshot.TagList,
              dbSystemId: snapshot.DBSystemId,
              storageType: snapshot.StorageType,
            })) || []

          return {
            dbClusterSnapshots,
            count: dbClusterSnapshots.length,
            marker: response.Marker,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_rds_list_db_cluster_snapshots",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_rds_list_db_parameter_groups",
      description: "List DB parameter groups",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        dbParameterGroupName: z
          .string()
          .optional()
          .describe("DB parameter group name to filter by"),
        maxRecords: z
          .number()
          .min(20)
          .max(100)
          .optional()
          .describe("Maximum number of records to return"),
        marker: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new DescribeDBParameterGroupsCommand({
            DBParameterGroupName: args.dbParameterGroupName,
            MaxRecords: args.maxRecords,
            Marker: args.marker,
          })

          const response = await getRDSClient(args.region).send(command)

          const dbParameterGroups =
            response.DBParameterGroups?.map((pg) => ({
              dbParameterGroupName: pg.DBParameterGroupName,
              dbParameterGroupFamily: pg.DBParameterGroupFamily,
              description: pg.Description,
              dbParameterGroupArn: pg.DBParameterGroupArn,
            })) || []

          return {
            dbParameterGroups,
            count: dbParameterGroups.length,
            marker: response.Marker,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_rds_list_db_parameter_groups",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_rds_describe_db_parameters",
      description: "Get parameters in a DB parameter group",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        dbParameterGroupName: z.string().describe("DB parameter group name"),
        source: z
          .string()
          .optional()
          .describe(
            "Parameter source filter (e.g., 'user', 'system', 'engine-default')",
          ),
        maxRecords: z
          .number()
          .min(20)
          .max(100)
          .optional()
          .describe("Maximum number of records to return"),
        marker: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new DescribeDBParametersCommand({
            DBParameterGroupName: args.dbParameterGroupName,
            Source: args.source,
            MaxRecords: args.maxRecords,
            Marker: args.marker,
          })

          const response = await getRDSClient(args.region).send(command)

          const parameters =
            response.Parameters?.map((param) => ({
              parameterName: param.ParameterName,
              parameterValue: param.ParameterValue,
              description: param.Description,
              source: param.Source,
              applyType: param.ApplyType,
              dataType: param.DataType,
              allowedValues: param.AllowedValues,
              isModifiable: param.IsModifiable,
              minimumEngineVersion: param.MinimumEngineVersion,
              applyMethod: param.ApplyMethod,
              supportedEngineModes: param.SupportedEngineModes,
            })) || []

          return {
            parameters,
            count: parameters.length,
            marker: response.Marker,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_rds_describe_db_parameters",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_rds_list_db_subnet_groups",
      description: "List DB subnet groups",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        dbSubnetGroupName: z
          .string()
          .optional()
          .describe("DB subnet group name to filter by"),
        maxRecords: z
          .number()
          .min(20)
          .max(100)
          .optional()
          .describe("Maximum number of records to return"),
        marker: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new DescribeDBSubnetGroupsCommand({
            DBSubnetGroupName: args.dbSubnetGroupName,
            MaxRecords: args.maxRecords,
            Marker: args.marker,
          })

          const response = await getRDSClient(args.region).send(command)

          const dbSubnetGroups =
            response.DBSubnetGroups?.map((sg) => ({
              dbSubnetGroupName: sg.DBSubnetGroupName,
              dbSubnetGroupDescription: sg.DBSubnetGroupDescription,
              vpcId: sg.VpcId,
              subnetGroupStatus: sg.SubnetGroupStatus,
              subnets: sg.Subnets?.map((subnet) => ({
                subnetIdentifier: subnet.SubnetIdentifier,
                subnetAvailabilityZone: subnet.SubnetAvailabilityZone?.Name,
                subnetStatus: subnet.SubnetStatus,
              })),
              dbSubnetGroupArn: sg.DBSubnetGroupArn,
              supportedNetworkTypes: sg.SupportedNetworkTypes,
            })) || []

          return {
            dbSubnetGroups,
            count: dbSubnetGroups.length,
            marker: response.Marker,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_rds_list_db_subnet_groups",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_rds_describe_db_engine_versions",
      description: "List available database engine versions",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        engine: z
          .string()
          .optional()
          .describe(
            "Database engine (e.g., 'mysql', 'postgres', 'aurora-mysql')",
          ),
        engineVersion: z
          .string()
          .optional()
          .describe("Engine version to filter by"),
        dbParameterGroupFamily: z
          .string()
          .optional()
          .describe("DB parameter group family filter"),
        defaultOnly: z
          .boolean()
          .optional()
          .describe("Show only default versions"),
        listSupportedCharacterSets: z
          .boolean()
          .optional()
          .describe("Include supported character sets"),
        listSupportedTimezones: z
          .boolean()
          .optional()
          .describe("Include supported timezones"),
        maxRecords: z
          .number()
          .min(20)
          .max(100)
          .optional()
          .describe("Maximum number of records to return"),
        marker: z.string().optional().describe("Pagination token"),
      }),
      async run(args) {
        try {
          const command = new DescribeDBEngineVersionsCommand({
            Engine: args.engine,
            EngineVersion: args.engineVersion,
            DBParameterGroupFamily: args.dbParameterGroupFamily,
            DefaultOnly: args.defaultOnly,
            ListSupportedCharacterSets: args.listSupportedCharacterSets,
            ListSupportedTimezones: args.listSupportedTimezones,
            MaxRecords: args.maxRecords,
            Marker: args.marker,
          })

          const response = await getRDSClient(args.region).send(command)

          const dbEngineVersions =
            response.DBEngineVersions?.map((version) => ({
              engine: version.Engine,
              engineVersion: version.EngineVersion,
              dbParameterGroupFamily: version.DBParameterGroupFamily,
              dbEngineDescription: version.DBEngineDescription,
              dbEngineVersionDescription: version.DBEngineVersionDescription,
              defaultCharacterSet: version.DefaultCharacterSet
                ? {
                    characterSetName:
                      version.DefaultCharacterSet.CharacterSetName,
                    characterSetDescription:
                      version.DefaultCharacterSet.CharacterSetDescription,
                  }
                : undefined,
              supportedCharacterSets: version.SupportedCharacterSets?.map(
                (cs) => ({
                  characterSetName: cs.CharacterSetName,
                  characterSetDescription: cs.CharacterSetDescription,
                }),
              ),
              supportedNcharCharacterSets:
                version.SupportedNcharCharacterSets?.map((cs) => ({
                  characterSetName: cs.CharacterSetName,
                  characterSetDescription: cs.CharacterSetDescription,
                })),
              validUpgradeTarget: version.ValidUpgradeTarget?.map((ut) => ({
                engine: ut.Engine,
                engineVersion: ut.EngineVersion,
                description: ut.Description,
                autoUpgrade: ut.AutoUpgrade,
                isMajorVersionUpgrade: ut.IsMajorVersionUpgrade,
              })),
              supportedTimezones: version.SupportedTimezones?.map((tz) => ({
                timezoneName: tz.TimezoneName,
              })),
              exportableLogTypes: version.ExportableLogTypes,
              supportsLogExportsToCloudwatchLogs:
                version.SupportsLogExportsToCloudwatchLogs,
              supportsReadReplica: version.SupportsReadReplica,
              supportedEngineModes: version.SupportedEngineModes,
              supportedFeatureNames: version.SupportedFeatureNames,
              status: version.Status,
              supportsParallelQuery: version.SupportsParallelQuery,
              supportsGlobalDatabases: version.SupportsGlobalDatabases,
              supportsBabelfish: version.SupportsBabelfish,
              supportsLimitlessDatabase: version.SupportsLimitlessDatabase,
              supportsCertificateRotationWithoutRestart:
                version.SupportsCertificateRotationWithoutRestart,
              supportedCACertificateIdentifiers:
                version.SupportedCACertificateIdentifiers,
              supportsLocalWriteForwarding:
                version.SupportsLocalWriteForwarding,
              supportsIntegrations: version.SupportsIntegrations,
            })) || []

          return {
            dbEngineVersions,
            count: dbEngineVersions.length,
            marker: response.Marker,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_rds_describe_db_engine_versions",
            toolArgs: args,
          })
        }
      },
    }),
  ]
}
