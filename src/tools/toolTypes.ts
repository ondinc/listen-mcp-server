import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Logger } from "pino";

export type GraphQLVariables = Record<string, unknown>;

export type FetchGraphQL = (
  query: string,
  variables?: GraphQLVariables,
) => Promise<any>;

export type MakeToolLogger = (
  toolName: string,
  baseRequestId?: string,
  params?: GraphQLVariables,
) => Logger;

export type ToolDeps = {
  fetchGraphQL: FetchGraphQL;
  makeToolLogger: MakeToolLogger;
};

export type ToolRegistrationServer = Pick<McpServer, "registerTool">;
