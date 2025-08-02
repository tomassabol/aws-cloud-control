import assert from "assert";
import { create } from "./index";
import { createAWSTools } from "./aws/index";
import { createAnthropic } from "@ai-sdk/anthropic";

assert(process.env.ANTHROPIC_API_KEY, "ANTHROPIC_API_KEY is required");

// Create AWS tools with default configuration
const awsTools = createAWSTools({
  region: "eu-central-1", // You can change this to your preferred region
  // Credentials will be automatically loaded from:
  // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
  // 2. AWS credentials file (~/.aws/credentials)
  // 3. EC2/ECS instance metadata

  // Optional: disable specific services for testing
  services: {
    // Infrastructure
    ec2: true,
    s3: true,
    iam: true,

    // Serverless
    lambda: true,
    dynamodb: true,
    sqs: true,

    // Monitoring & Cost
    cloudwatch: true,
    cost: true,

    // General AWS CLI
    general: true,
  },
});

// Create the CloudControl server with AWS tools
const app = create({
  tools: awsTools,
  // Optional: add password protection
  // password: "your-secure-password",

  // OpenAI model for the /generate endpoint
  model: createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  })("claude-sonnet-4-20250514"),
});

// Start the server
const server = Bun.serve({
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  hostname: process.env.HOST || "localhost",
  fetch: app.fetch,
});

console.log(
  `🚀 CloudControl MCP Server running on http://${server.hostname}:${server.port}`
);
console.log("");
console.log("📋 Available endpoints:");
console.log("  POST /mcp - MCP JSON-RPC endpoint for tool execution");
console.log(
  "  POST /generate - AI text generation (requires model configuration)"
);
console.log("");
console.log("🛠️  Available AWS tools:");

// Get tool names for display
const toolNames = awsTools.map((tool) => `  - ${tool.name}`);
const groupedTools = {
  EC2: toolNames.filter((name) => name.includes("ec2")),
  S3: toolNames.filter((name) => name.includes("s3")),
  Lambda: toolNames.filter((name) => name.includes("lambda")),
  DynamoDB: toolNames.filter((name) => name.includes("dynamodb")),
  SQS: toolNames.filter((name) => name.includes("sqs")),
  CloudWatch: toolNames.filter((name) => name.includes("cloudwatch")),
  "Cost Management": toolNames.filter((name) => name.includes("cost")),
  IAM: toolNames.filter((name) => name.includes("iam")),
  General: toolNames.filter((name) => name.includes("general")),
};

Object.entries(groupedTools).forEach(([service, tools]) => {
  if (tools.length > 0) {
    console.log(`\n${service}:`);
    tools.forEach((tool) => console.log(tool));
  }
});

console.log(`\n📊 Total tools available: ${awsTools.length}`);
console.log("\n💡 To test the server, run: bun src/test.ts");
console.log(
  "💡 To use with Claude Desktop, add this server to your MCP config"
);

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down CloudControl MCP Server...");
  server.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n👋 Shutting down CloudControl MCP Server...");
  server.stop();
  process.exit(0);
});
