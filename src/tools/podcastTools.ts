import { z } from "zod/v3";
import type { ToolDeps, ToolRegistrationServer } from "./toolTypes.js";

export function registerPodcastTools(
  server: ToolRegistrationServer,
  { fetchGraphQL, makeToolLogger }: ToolDeps,
) {
  server.registerTool(
    "get_podcast_episodes",
    {
      description: "指定したポッドキャストのエピソード一覧を取得します",
      inputSchema: {
        podcastId: z.string().describe("ポッドキャストのID"),
        status: z
          .enum(["published", "draft", "scheduled"])
          .optional()
          .describe("取得するエピソードのステータス（デフォルトはpublished）"),
      },
    },
    async ({ podcastId, status = "published" }) => {
      const log = makeToolLogger("get_podcast_episodes", undefined, {
        podcastId,
        status,
      });
      log.info("fetching podcast episodes");

      const statusEnum = status.toUpperCase();

      const query = `
        query($id: String!, $status: EpisodeStatus) {
          podcast(id: $id) {
            title
            episodes(first: 50, status: $status) {
              data {
                id
                title
                pubDate
                status
                duration
              }
            }
          }
        }
      `;

      const data = await fetchGraphQL(query, {
        id: podcastId,
        status: statusEnum,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data.podcast, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "get_podcast",
    {
      description:
        "指定したIDのポッドキャストの詳細情報（ホストなど）を取得します",
      inputSchema: {
        podcastId: z.string().describe("ポッドキャストのID"),
      },
    },
    async ({ podcastId }) => {
      const log = makeToolLogger("get_podcast", undefined, { podcastId });
      log.info("fetching podcast");

      const query = `
        query($id: String!) {
          podcast(id: $id) {
            id
            title
            description
            author
            latestEpisodePubDate
            visibility
            episodes(first: 10) {
              data {
                id
                title
                pubDate
              }
            }
            owners {
              id
              name
              username
            }
          }
        }
      `;

      const data = await fetchGraphQL(query, { id: podcastId });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data.podcast, null, 2),
          },
        ],
      };
    },
  );
}
