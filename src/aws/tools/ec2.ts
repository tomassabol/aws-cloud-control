import {
  EC2Client,
  DescribeInstancesCommand,
  DescribeVpcsCommand,
  DescribeSecurityGroupsCommand,
} from "@aws-sdk/client-ec2";
import { z } from "zod";
import { tool } from "../../tool";
import type { AWSConfig } from "../auth";
import { createAWSCredentials, getAWSRegion } from "../auth";

export function createEC2Tools(config?: AWSConfig) {
  const credentials = createAWSCredentials(config);
  const region = getAWSRegion(config);

  const ec2Client = new EC2Client({
    region,
    credentials,
  });

  return [
    tool({
      name: "aws:ec2:describe-instances",
      description: "List and describe EC2 instances with optional filtering",
      args: z.object({
        instanceIds: z
          .array(z.string())
          .optional()
          .describe("Specific instance IDs to describe"),
        filters: z
          .array(
            z.object({
              name: z.string(),
              values: z.array(z.string()),
            })
          )
          .optional()
          .describe("Filters to apply (e.g., state, vpc-id, tag:Name)"),
        maxResults: z
          .number()
          .min(5)
          .max(1000)
          .optional()
          .describe("Maximum number of results to return"),
      }),
      async run(args = {}) {
        try {
          const command = new DescribeInstancesCommand({
            InstanceIds: args.instanceIds,
            Filters: args.filters?.map((f) => ({
              Name: f.name,
              Values: f.values,
            })),
            MaxResults: args.maxResults,
          });

          const response = await ec2Client.send(command);

          const instances =
            response.Reservations?.flatMap(
              (r) =>
                r.Instances?.map((i) => ({
                  instanceId: i.InstanceId,
                  state: i.State?.Name,
                  instanceType: i.InstanceType,
                  launchTime: i.LaunchTime?.toISOString(),
                  publicIpAddress: i.PublicIpAddress,
                  privateIpAddress: i.PrivateIpAddress,
                  vpcId: i.VpcId,
                  subnetId: i.SubnetId,
                  securityGroups: i.SecurityGroups?.map((sg) => ({
                    groupId: sg.GroupId,
                    groupName: sg.GroupName,
                  })),
                  tags: i.Tags?.reduce(
                    (acc, tag) => ({
                      ...acc,
                      [tag.Key || ""]: tag.Value || "",
                    }),
                    {}
                  ),
                })) || []
            ) || [];

          return {
            instances,
            count: instances.length,
          };
        } catch (error) {
          throw new Error(
            `EC2 describe instances failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:ec2:describe-vpcs",
      description: "List and describe VPCs",
      args: z.object({
        vpcIds: z
          .array(z.string())
          .optional()
          .describe("Specific VPC IDs to describe"),
        filters: z
          .array(
            z.object({
              name: z.string(),
              values: z.array(z.string()),
            })
          )
          .optional()
          .describe("Filters to apply"),
      }),
      async run(args = {}) {
        try {
          const command = new DescribeVpcsCommand({
            VpcIds: args.vpcIds,
            Filters: args.filters?.map((f) => ({
              Name: f.name,
              Values: f.values,
            })),
          });

          const response = await ec2Client.send(command);

          const vpcs =
            response.Vpcs?.map((vpc) => ({
              vpcId: vpc.VpcId,
              state: vpc.State,
              cidrBlock: vpc.CidrBlock,
              isDefault: vpc.IsDefault,
              tags: vpc.Tags?.reduce(
                (acc, tag) => ({
                  ...acc,
                  [tag.Key || ""]: tag.Value || "",
                }),
                {}
              ),
            })) || [];

          return {
            vpcs,
            count: vpcs.length,
          };
        } catch (error) {
          throw new Error(
            `EC2 describe VPCs failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:ec2:describe-security-groups",
      description: "List and describe security groups",
      args: z.object({
        groupIds: z
          .array(z.string())
          .optional()
          .describe("Specific security group IDs"),
        groupNames: z
          .array(z.string())
          .optional()
          .describe("Specific security group names"),
        filters: z
          .array(
            z.object({
              name: z.string(),
              values: z.array(z.string()),
            })
          )
          .optional()
          .describe("Filters to apply"),
      }),
      async run(args = {}) {
        try {
          const command = new DescribeSecurityGroupsCommand({
            GroupIds: args.groupIds,
            GroupNames: args.groupNames,
            Filters: args.filters?.map((f) => ({
              Name: f.name,
              Values: f.values,
            })),
          });

          const response = await ec2Client.send(command);

          const securityGroups =
            response.SecurityGroups?.map((sg) => ({
              groupId: sg.GroupId,
              groupName: sg.GroupName,
              description: sg.Description,
              vpcId: sg.VpcId,
              inboundRules: sg.IpPermissions?.map((rule) => ({
                protocol: rule.IpProtocol,
                fromPort: rule.FromPort,
                toPort: rule.ToPort,
                ipRanges: rule.IpRanges?.map((range) => range.CidrIp),
                securityGroups: rule.UserIdGroupPairs?.map(
                  (pair) => pair.GroupId
                ),
              })),
              outboundRules: sg.IpPermissionsEgress?.map((rule) => ({
                protocol: rule.IpProtocol,
                fromPort: rule.FromPort,
                toPort: rule.ToPort,
                ipRanges: rule.IpRanges?.map((range) => range.CidrIp),
                securityGroups: rule.UserIdGroupPairs?.map(
                  (pair) => pair.GroupId
                ),
              })),
              tags: sg.Tags?.reduce(
                (acc, tag) => ({
                  ...acc,
                  [tag.Key || ""]: tag.Value || "",
                }),
                {}
              ),
            })) || [];

          return {
            securityGroups,
            count: securityGroups.length,
          };
        } catch (error) {
          throw new Error(
            `EC2 describe security groups failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),
  ];
}
