import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolDeps } from "./toolTypes.js";
import { registerMeTools } from "./meTools.js";
import { registerPodcastTools } from "./podcastTools.js";
import { registerEpisodeTools } from "./episodeTools.js";
import { registerSearchTools } from "./searchTools.js";

export type ToolRegistrationServer = Pick<McpServer, "registerTool">;

export function registerTools(server: ToolRegistrationServer, deps: ToolDeps) {
  registerMeTools(server, deps);
  registerPodcastTools(server, deps);
  registerEpisodeTools(server, deps);
  registerSearchTools(server, deps);
}
