import { describe, expect, it, vi } from "vitest";
import type { ToolRegistrationServer } from "../src/tools/registerTools.js";
import { registerTools } from "../src/tools/registerTools.js";

describe("src/tools/registerTools.ts", () => {
  it("registers the expected tool names", () => {
    const registerToolMock = vi.fn();
    const mockServer: ToolRegistrationServer = {
      registerTool: registerToolMock,
    };
    const mockDeps = {
      fetchGraphQL: vi.fn(),
      makeToolLogger: vi.fn(),
    };

    expect(() => registerTools(mockServer, mockDeps)).not.toThrow();

    const toolNames = registerToolMock.mock.calls.map((call) => call[0]);
    expect(toolNames).toHaveLength(11);
    expect(toolNames).toEqual([
      "get_my_podcasts",
      "get_me",
      "get_following_podcasts",
      "get_playback_history",
      "get_my_episode_reviews",
      "get_podcast_episodes",
      "get_podcast",
      "get_episode_transcript",
      "get_episode",
      "search_podcasts",
      "search_users",
    ]);
  });
});
