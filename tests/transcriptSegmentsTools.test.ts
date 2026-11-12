import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTranscriptSegments } from "../src/tools/transcriptSegmentsApi.js";
import { registerTranscriptSegmentsTools } from "../src/tools/transcriptSegmentsTools.js";

vi.mock("../src/config.js", () => ({
  API_TOKEN: "test-token",
  GRAPHQL_URL: "https://listen.example/graphql",
}));

const episodeId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
const version = "0".repeat(64);
const url = `https://listen.example/api/v1/episodes/${episodeId}/transcript/segments`;

describe("transcript editing tools", () => {
  const server = new McpServer({ name: "test-server", version: "1" });
  registerTranscriptSegmentsTools(server, { fetchTranscriptSegments });
  const client = new Client({ name: "test-client", version: "1" });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("routes reads, previews and saves to the REST API and returns conflicts as tool errors", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ data: { version, segments: [{ index: 12 }] } }))
      .mockResolvedValueOnce(Response.json({ data: { changed_count: 1, dry_run: true } }))
      .mockResolvedValueOnce(Response.json({ message: "Refresh before editing" }, { status: 409 }));
    vi.stubGlobal("fetch", fetchMock);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    try {
      const read = await client.callTool({
        name: "get_episode_transcript_segments",
        arguments: { episodeId, offset: 2, start: 1.5, end: 5 },
      });
      expect(read.isError).toBe(false);
      expect(fetchMock).toHaveBeenNthCalledWith(1, new URL(url + "?offset=2&start=1.5&end=5"), expect.objectContaining({
        method: "GET",
        headers: { Accept: "application/json", Authorization: "Bearer test-token" },
        redirect: "error",
      }));

      const edits = [{ index: 12, text: " 修正 " }];
      const preview = await client.callTool({
        name: "update_episode_transcript_segments",
        arguments: { episodeId, version, edits, dryRun: true },
      });
      expect(preview.isError).toBe(false);
      expect(fetchMock).toHaveBeenNthCalledWith(2, new URL(url), expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ version, edits, dry_run: true }),
      }));

      const conflict = await client.callTool({
        name: "update_episode_transcript_segments",
        arguments: { episodeId, version, edits },
      });
      expect(conflict.isError).toBe(true);
      expect(conflict.content).toEqual([{ type: "text", text: JSON.stringify({
        status: 409, body: { message: "Refresh before editing" },
      }) }]);
      expect(fetchMock).toHaveBeenNthCalledWith(3, new URL(url), expect.objectContaining({
        body: JSON.stringify({ version, edits }),
      }));
    } finally {
      await client.close();
      await server.close();
    }
  });
});
