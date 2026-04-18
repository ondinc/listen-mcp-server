#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v3";
import { logger } from "./lib/logger.js";

const server = new McpServer({
  name: "listen-mcp-server",
  version: "1.0.0",
});

logger.info("Starting listen-mcp-server...");

const API_TOKEN = process.env.LISTEN_API_TOKEN;
const GRAPHQL_URL =
  process.env.LISTEN_GRAPHQL_URL || "https://listen.style/graphql";

if (!API_TOKEN) {
  logger.error(
    { missingEnv: "LISTEN_API_TOKEN" },
    "required environment variable is missing",
  );
  process.exit(1);
}

type ToolLoggerParams = Record<string, unknown>;

function makeToolLogger(
  toolName: string,
  baseRequestId?: string,
  params?: Record<string, unknown>,
) {
  return logger.child({
    requestId: baseRequestId ?? crypto.randomUUID(),
    toolName,
    ...params,
  });
}

// 共通のGraphQL fetch関数
async function fetchGraphQL(
  query: string,
  variables: Record<string, unknown> = {},
) {
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    logger.error(
      { status: response.status, statusText: response.statusText },
      "GraphQL API HTTP error",
    );
    throw new Error(`GraphQL API HTTP error: ${response.status}`);
  }

  const result = await response.json();
  if (result.errors) {
    logger.error({ err: result.errors }, "failed to fetch GraphQL");
    throw new Error(`GraphQL Error: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
}

// 1. my_podcasts
server.registerTool(
  "get_my_podcasts",
  { description: "ご自身のポッドキャスト一覧を取得します" },
  async () => {
    const log = makeToolLogger("get_my_podcasts");
    log.info("fetching my podcasts");
    const query = `
      query {
        me {
          verifiedPodcasts(first: 50) {
            data {
              id
              title
              description
              imageUrl80
              visibility
              createdAt
            }
          }
        }
      }
    `;
    const data = await fetchGraphQL(query);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data.me.verifiedPodcasts.data, null, 2),
        },
      ],
    };
  },
);

// 2. get_podcast_episodes
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
    const log = makeToolLogger("get_podcast_episodes");
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
      content: [{ type: "text", text: JSON.stringify(data.podcast, null, 2) }],
    };
  },
);

// 3. get_episode_transcript
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
    // ユーザー指定のフォーマットに応じて取得するGraphQLフィールドを変える
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
    const transcript = data.episode?.[transcriptField];

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

// 4. get_me
server.registerTool(
  "get_me",
  { description: "ご自身のプロフィール情報を取得します" },
  async () => {
    const log = makeToolLogger("get_me");
    log.info("fetching my profile");
    const query = `
      query {
        me {
          id
          name
          username
          description
          followingPodcastsCount
          imageUrl
        }
      }
    `;
    const data = await fetchGraphQL(query);
    return {
      content: [{ type: "text", text: JSON.stringify(data.me, null, 2) }],
    };
  },
);

// 5. get_following_podcasts
server.registerTool(
  "get_following_podcasts",
  { description: "フォローしているポッドキャストの一覧を取得します" },
  async () => {
    const log = makeToolLogger("get_following_podcasts");
    log.info("fetching following podcasts");
    const query = `
      query {
        me {
          followingPodcasts(first: 20) {
            data {
              id
              title
              description
              latestEpisodePubDate
            }
          }
        }
      }
    `;
    const data = await fetchGraphQL(query);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data.me.followingPodcasts.data, null, 2),
        },
      ],
    };
  },
);

// 6. get_playback_history
server.registerTool(
  "get_playback_history",
  { description: "最近再生したエピソードの履歴を取得します" },
  async () => {
    const log = makeToolLogger("get_playback_history");
    log.info("fetching playback history");
    const query = `
      query {
        me {
          playbackHistoryEpisodes(first: 20) {
            data {
              id
              title
              duration
              podcast {
                id
                title
              }
            }
          }
        }
      }
    `;
    const data = await fetchGraphQL(query);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            data.me.playbackHistoryEpisodes?.data || [],
            null,
            2,
          ),
        },
      ],
    };
  },
);

// 7. search_podcasts
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
        { type: "text", text: JSON.stringify(data.searchPodcasts, null, 2) },
      ],
    };
  },
);

// 8. search_users
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
        { type: "text", text: JSON.stringify(data.searchUsers, null, 2) },
      ],
    };
  },
);

// 9. get_podcast
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
      content: [{ type: "text", text: JSON.stringify(data.podcast, null, 2) }],
    };
  },
);

// 10. get_episode
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
      content: [{ type: "text", text: JSON.stringify(data.episode, null, 2) }],
    };
  },
);

// 11. get_my_episode_reviews
server.registerTool(
  "get_my_episode_reviews",
  {
    description:
      "自分が書いたエピソードの感想（EpisodeReview）を最新順で一覧取得します。引用されたテキスト（quoteText）も含まれます。",
    inputSchema: {},
  },
  async () => {
    const log = makeToolLogger("get_my_episode_reviews");
    log.info("fetching my episode reviews");
    const query = `
      query {
        me {
          episodeReviews(first: 20) {
            data {
              id
              content
              quoteText
              startTime
              status
              createdAt
              episode {
                id
                title
              }
            }
          }
        }
      }
    `;
    const data = await fetchGraphQL(query);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data.me?.episodeReviews?.data || [], null, 2),
        },
      ],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("listen-mcp-server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
