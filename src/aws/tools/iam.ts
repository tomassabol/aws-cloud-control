import {
  IAMClient,
  ListUsersCommand,
  ListRolesCommand,
  ListPoliciesCommand,
  GetUserCommand,
  GetRoleCommand,
} from "@aws-sdk/client-iam";
import { z } from "zod";
import { tool } from "../../tool";
import type { AWSConfig } from "../auth";
import { createAWSCredentials, getAWSRegion } from "../auth";

export function createIAMTools(config?: AWSConfig) {
  const credentials = createAWSCredentials(config);
  const region = getAWSRegion(config);

  const iamClient = new IAMClient({
    region,
    credentials,
  });

  return [
    tool({
      name: "aws:iam:list-users",
      description: "List IAM users in the account",
      args: z.object({
        pathPrefix: z
          .string()
          .optional()
          .describe("Path prefix to filter users"),
        maxItems: z
          .number()
          .min(1)
          .max(1000)
          .optional()
          .describe("Maximum number of users to return"),
      }),
      async run(args = {}) {
        try {
          const command = new ListUsersCommand({
            PathPrefix: args.pathPrefix,
            MaxItems: args.maxItems,
          });

          const response = await iamClient.send(command);

          const users =
            response.Users?.map((user) => ({
              userName: user.UserName,
              userId: user.UserId,
              arn: user.Arn,
              path: user.Path,
              createDate: user.CreateDate?.toISOString(),
              passwordLastUsed: user.PasswordLastUsed?.toISOString(),
              tags: user.Tags?.map((tag) => ({
                key: tag.Key,
                value: tag.Value,
              })),
            })) || [];

          return {
            users,
            count: users.length,
            isTruncated: response.IsTruncated,
            marker: response.Marker,
          };
        } catch (error) {
          throw new Error(
            `IAM list users failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:iam:get-user",
      description: "Get details for a specific IAM user",
      args: z.object({
        userName: z
          .string()
          .optional()
          .describe("User name (omit for current user)"),
      }),
      async run(args = {}) {
        try {
          const command = new GetUserCommand({
            UserName: args.userName,
          });

          const response = await iamClient.send(command);

          if (!response.User) {
            throw new Error("User not found");
          }

          const user = response.User;
          return {
            userName: user.UserName,
            userId: user.UserId,
            arn: user.Arn,
            path: user.Path,
            createDate: user.CreateDate?.toISOString(),
            passwordLastUsed: user.PasswordLastUsed?.toISOString(),
            permissionsBoundary: user.PermissionsBoundary
              ? {
                  type: user.PermissionsBoundary.PermissionsBoundaryType,
                  arn: user.PermissionsBoundary.PermissionsBoundaryArn,
                }
              : undefined,
            tags: user.Tags?.map((tag) => ({
              key: tag.Key,
              value: tag.Value,
            })),
          };
        } catch (error) {
          throw new Error(
            `IAM get user failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:iam:list-roles",
      description: "List IAM roles in the account",
      args: z.object({
        pathPrefix: z
          .string()
          .optional()
          .describe("Path prefix to filter roles"),
        maxItems: z
          .number()
          .min(1)
          .max(1000)
          .optional()
          .describe("Maximum number of roles to return"),
      }),
      async run(args = {}) {
        try {
          const command = new ListRolesCommand({
            PathPrefix: args.pathPrefix,
            MaxItems: args.maxItems,
          });

          const response = await iamClient.send(command);

          const roles =
            response.Roles?.map((role) => ({
              roleName: role.RoleName,
              roleId: role.RoleId,
              arn: role.Arn,
              path: role.Path,
              createDate: role.CreateDate?.toISOString(),
              description: role.Description,
              maxSessionDuration: role.MaxSessionDuration,
              assumeRolePolicyDocument: role.AssumeRolePolicyDocument
                ? decodeURIComponent(role.AssumeRolePolicyDocument)
                : undefined,
              tags: role.Tags?.map((tag) => ({
                key: tag.Key,
                value: tag.Value,
              })),
            })) || [];

          return {
            roles,
            count: roles.length,
            isTruncated: response.IsTruncated,
            marker: response.Marker,
          };
        } catch (error) {
          throw new Error(
            `IAM list roles failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:iam:list-policies",
      description: "List IAM policies",
      args: z.object({
        scope: z
          .enum(["All", "AWS", "Local"])
          .optional()
          .default("Local")
          .describe("Scope of policies to list"),
        pathPrefix: z
          .string()
          .optional()
          .describe("Path prefix to filter policies"),
        maxItems: z
          .number()
          .min(1)
          .max(1000)
          .optional()
          .describe("Maximum number of policies to return"),
        onlyAttached: z
          .boolean()
          .optional()
          .describe("Only list attached policies"),
      }),
      async run(args = {}) {
        try {
          const command = new ListPoliciesCommand({
            Scope: args.scope,
            PathPrefix: args.pathPrefix,
            MaxItems: args.maxItems,
            OnlyAttached: args.onlyAttached,
          });

          const response = await iamClient.send(command);

          const policies =
            response.Policies?.map((policy) => ({
              policyName: policy.PolicyName,
              policyId: policy.PolicyId,
              arn: policy.Arn,
              path: policy.Path,
              defaultVersionId: policy.DefaultVersionId,
              attachmentCount: policy.AttachmentCount,
              permissionsBoundaryUsageCount:
                policy.PermissionsBoundaryUsageCount,
              isAttachable: policy.IsAttachable,
              description: policy.Description,
              createDate: policy.CreateDate?.toISOString(),
              updateDate: policy.UpdateDate?.toISOString(),
              tags: policy.Tags?.map((tag) => ({
                key: tag.Key,
                value: tag.Value,
              })),
            })) || [];

          return {
            policies,
            count: policies.length,
            isTruncated: response.IsTruncated,
            marker: response.Marker,
          };
        } catch (error) {
          throw new Error(
            `IAM list policies failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),
  ];
}
