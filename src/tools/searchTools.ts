import { z } from "zod/v3";
import type { ToolDeps, ToolRegistrationServer } from "./toolTypes.js";

export function registerSearchTools(
  server: ToolRegistrationServer,
  { fetchGraphQL, makeToolLogger }: Pick<ToolDeps, "fetchGraphQL" | "makeToolLogger">,
) {
  server.registerTool(
    "search_podcasts",
    {
      description: "キーワードからポッドキャストを検索します",
      inputSchema: {
        query: z.string().describe("検索キーワード"),
      },
    },
    async ({ query }) => {
      const log = makeToolLogger("search_podcasts", undefined, { query });
      log.info("searching podcasts");

      const gqlQuery = `
        query($query: String!) {
          searchPodcasts(query: $query) {
            id
            title
            description
            author
          }
        }
      `;

      const data = await fetchGraphQL(gqlQuery, { query });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data.searchPodcasts, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "search_users",
    {
      description: "キーワードからユーザーを検索します",
      inputSchema: {
        query: z.string().describe("検索キーワード"),
      },
    },
    async ({ query }) => {
      const log = makeToolLogger("search_users", undefined, { query });
      log.info("searching users");

      const gqlQuery = `
        query($query: String!) {
          searchUsers(query: $query) {
            id
            name
            username
            description
          }
        }
      `;

      const data = await fetchGraphQL(gqlQuery, { query });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data.searchUsers, null, 2),
          },
        ],
      };
    },
  );
}
