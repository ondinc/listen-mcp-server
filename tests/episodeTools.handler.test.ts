import { describe, expect, it, vi } from "vitest";
import type { ToolRegistrationServer } from "../src/tools/toolTypes.js";
import { registerEpisodeTools } from "../src/tools/episodeTools.js";
import { getRegisteredHandler } from "./utils.js";

describe("src/tools/episodeTools.ts", () => {
  it("gets episode transcript", async () => {
    const registerToolMock = vi.fn();
    const mockServer: ToolRegistrationServer = {
      registerTool: registerToolMock,
    };
    const mockDeps = {
      fetchGraphQL: vi.fn().mockResolvedValue({
        episode: {
          title: "Test Episode",
          transcriptTxt: "This is a test transcript.",
          transcriptVtt:
            "WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nThis is a test transcript.\n",
          transcriptSrt:
            "1\n00:00:00,000 --> 00:00:05,000\nThis is a test transcript.\n",
        },
      }),
      makeToolLogger: vi.fn().mockReturnValue({
        info: vi.fn(),
      }),
    };
    registerEpisodeTools(mockServer, mockDeps);

    const handler = getRegisteredHandler(
      registerToolMock,
      "get_episode_transcript",
    );

    const resultTxt = await handler({
      episodeId: "test-episode-id",
      format: "txt",
    });

    expect(resultTxt).toEqual({
      content: [{ type: "text", text: "This is a test transcript." }],
    });

    const resultVtt = await handler({
      episodeId: "test-episode-id",
      format: "vtt",
    });

    expect(resultVtt).toEqual({
      content: [
        {
          type: "text",
          text: "WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nThis is a test transcript.\n",
        },
      ],
    });

    const resultSrt = await handler({
      episodeId: "test-episode-id",
      format: "srt",
    });

    expect(resultSrt).toEqual({
      content: [
        {
          type: "text",
          text: "1\n00:00:00,000 --> 00:00:05,000\nThis is a test transcript.\n",
        },
      ],
    });
  });
});
