#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { logger } from "./lib/logger.js";
import { normalizeUnknownError, toUserMessage } from "./lib/appError.js";
import { registerTools } from "./tools/registerTools.js";
import type { GraphQLVariables } from "./tools/toolTypes.js";
import { fetchGraphQL } from "./tools/graphql.js";

const pkg = require("../package.json");
const version: string = pkg.version;

const server = new McpServer({
  name: "listen-mcp-server",
  version: version,
});

logger.info("Starting listen-mcp-server " + version + " ...");

function makeToolLogger(
  toolName: string,
  baseRequestId?: string,
  params?: GraphQLVariables,
) {
  return logger.child({
    requestId: baseRequestId ?? crypto.randomUUID(),
    toolName,
    ...params,
  });
}

registerTools(server, {
  fetchGraphQL,
  makeToolLogger,
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("listen-mcp-server running on stdio");
}

main().catch((error: unknown) => {
  const appError = normalizeUnknownError(error, {
    operation: "main",
  });

  logger.error({ err: appError }, appError.message);
  console.error(toUserMessage(appError, "ja"));
  process.exit(1);
});
