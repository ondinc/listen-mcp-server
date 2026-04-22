import { describe, expect, it, vi } from "vitest";
import type { ToolRegistrationServer } from "../src/tools/toolTypes.js";
import { registerSearchTools } from "../src/tools/searchTools.js";
import { getRegisteredHandler } from "./utils.js";

describe("src/tools/searchTools.ts", () => {
  it("returns podcast search results from GraphQL response", async () => {
    const registerToolMock = vi.fn();
    const mockServer: ToolRegistrationServer = {
      registerTool: registerToolMock,
    };
    const fetchGraphQLMock = vi.fn().mockResolvedValue({
      searchPodcasts: [
        {
          id: "test-podcast-id",
          title: "Test Podcast",
          description: "Test Description",
          author: "Test Author",
        },
      ],
    });
    const infoMock = vi.fn();
    const mockDeps = {
      fetchGraphQL: fetchGraphQLMock,
      makeToolLogger: vi.fn().mockReturnValue({
        info: infoMock,
      }),
    };
    registerSearchTools(mockServer, mockDeps);

    const handler = getRegisteredHandler(registerToolMock, "search_podcasts");

    const result = await handler({
      query: "test query",
    });

    expect(fetchGraphQLMock).toHaveBeenCalledTimes(1);
    expect(fetchGraphQLMock).toHaveBeenCalledWith(
      expect.stringContaining("searchPodcasts"),
      {
        query: "test query",
      },
    );
    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            [
              {
                id: "test-podcast-id",
                title: "Test Podcast",
                description: "Test Description",
                author: "Test Author",
              },
            ],
            null,
            2,
          ),
        },
      ],
    });
  });
});
