import type { ToolDeps } from "./toolTypes.js";
import { registerMeTools } from "./meTools.js";
import { registerPodcastTools } from "./podcastTools.js";
import { registerEpisodeTools } from "./episodeTools.js";
import { registerSearchTools } from "./searchTools.js";
import { ToolRegistrationServer } from "./toolTypes.js";

export function registerTools(server: ToolRegistrationServer, deps: ToolDeps) {
  registerMeTools(server, deps);
  registerPodcastTools(server, deps);
  registerEpisodeTools(server, deps);
  registerSearchTools(server, deps);
}
