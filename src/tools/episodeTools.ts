import { z } from "zod/v3";
import { assertNonNull } from "../lib/appError.js";
import type { ToolDeps, ToolRegistrationServer } from "./toolTypes.js";

export function registerEpisodeTools(
  server: ToolRegistrationServer,
  { fetchGraphQL, makeToolLogger }: ToolDeps,
) {
  server.registerTool(
    "get_episode_transcript",
    {
      description: "指定したエピソードの文字起こしを取得します",
      inputSchema: {
        episodeId: z.string().describe("エピソードのID"),
        format: z
          .enum(["txt", "vtt", "srt"])
          .optional()
          .describe("出力フォーマット(txt, vtt, srt)。デフォルトはtxt"),
      },
    },
    async ({ episodeId, format = "txt" }) => {
      const log = makeToolLogger("get_episode_transcript", undefined, {
        episodeId,
        format,
      });
      log.info("fetching episode transcript");

      let transcriptField = "transcriptTxt";
      if (format === "vtt") transcriptField = "transcriptVtt";
      if (format === "srt") transcriptField = "transcriptSrt";

      const query = `
        query($id: String!) {
          episode(id: $id) {
            title
            ${transcriptField}
          }
        }
      `;

      const data = await fetchGraphQL(query, { id: episodeId });

      const episode = assertNonNull(
        data.episode,
        "Episode is missing in response",
        {
          field: "episode",
          details: { episodeId, format },
        },
      );

      const transcript = episode[transcriptField];

      if (!transcript) {
        return {
          content: [
            {
              type: "text",
              text: "Transcript is not available for this episode.",
            },
          ],
        };
      }

      return {
        content: [{ type: "text", text: transcript }],
      };
    },
  );

  server.registerTool(
    "get_episode",
    {
      description:
        "指定したIDのエピソードの詳細情報（メタデータやコメント数など）を取得します",
      inputSchema: {
        episodeId: z.string().describe("エピソードのID"),
      },
    },
    async ({ episodeId }) => {
      const log = makeToolLogger("get_episode", undefined, { episodeId });
      log.info("fetching episode");

      const query = `
        query($id: String!) {
          episode(id: $id) {
            id
            title
            description
            pubDate
            duration
            commentsCount
            mentionersCount
            podcast {
              id
              title
            }
          }
        }
      `;

      const data = await fetchGraphQL(query, { id: episodeId });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data.episode, null, 2),
          },
        ],
      };
    },
  );
}
