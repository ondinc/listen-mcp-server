#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "listen-mcp-server",
  version: "1.0.0"
});

const API_TOKEN = process.env.LISTEN_API_TOKEN;
const GRAPHQL_URL = process.env.LISTEN_GRAPHQL_URL || "https://listen.style/graphql";

if (!API_TOKEN) {
  console.error("Error: LISTEN_API_TOKEN environment variable is required");
  process.exit(1);
}

// 共通のGraphQL fetch関数
async function fetchGraphQL(query: string, variables: any = {}) {
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_TOKEN}`
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    throw new Error(`GraphQL API HTTP error: ${response.status}`);
  }

  const result = await response.json();
  if (result.errors) {
    throw new Error(`GraphQL Error: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
}

// 1. my_podcasts
server.tool("get_my_podcasts",
  "ご自身のポッドキャスト一覧を取得します",
  {},
  async () => {
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
      content: [{ type: "text", text: JSON.stringify(data.me.verifiedPodcasts.data, null, 2) }]
    };
  }
);

// 2. get_podcast_episodes
server.tool("get_podcast_episodes",
  "指定したポッドキャストのエピソード一覧を取得します",
  { podcastId: z.string().describe("ポッドキャストのID") },
  async ({ podcastId }) => {
    const query = `
      query($id: String!) {
        podcast(id: $id) {
          title
          episodes(first: 50) {
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
    const data = await fetchGraphQL(query, { id: podcastId });
    return {
      content: [{ type: "text", text: JSON.stringify(data.podcast, null, 2) }]
    };
  }
);

// 3. get_episode_transcript
server.tool("get_episode_transcript",
  "指定したエピソードの文字起こしを取得します",
  { 
    episodeId: z.string().describe("エピソードのID"),
    format: z.enum(["txt", "vtt", "srt"]).optional().describe("出力フォーマット(txt, vtt, srt)。デフォルトはtxt")
  },
  async ({ episodeId, format = "txt" }) => {
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
       return { content: [{ type: "text", text: "Transcript is not available for this episode." }] };
    }

    return {
      content: [{ type: "text", text: transcript }]
    };
  }
);

// 4. get_me
server.tool("get_me",
  "ご自身のプロフィール情報を取得します",
  {},
  async () => {
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
      content: [{ type: "text", text: JSON.stringify(data.me, null, 2) }]
    };
  }
);

// 5. get_following_podcasts
server.tool("get_following_podcasts",
  "フォローしているポッドキャストの一覧を取得します",
  {},
  async () => {
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
      content: [{ type: "text", text: JSON.stringify(data.me.followingPodcasts.data, null, 2) }]
    };
  }
);

// 6. get_playback_history
server.tool("get_playback_history",
  "最近再生したエピソードの履歴を取得します",
  {},
  async () => {
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
      content: [{ type: "text", text: JSON.stringify(data.me.playbackHistoryEpisodes?.data || [], null, 2) }]
    };
  }
);

// 7. search_podcasts
server.tool("search_podcasts",
  "キーワードからポッドキャストを検索します",
  { query: z.string().describe("検索キーワード") },
  async ({ query }) => {
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
      content: [{ type: "text", text: JSON.stringify(data.searchPodcasts, null, 2) }]
    };
  }
);

// 8. search_users
server.tool("search_users",
  "キーワードからユーザーを検索します",
  { query: z.string().describe("検索キーワード") },
  async ({ query }) => {
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
      content: [{ type: "text", text: JSON.stringify(data.searchUsers, null, 2) }]
    };
  }
);

// 9. get_podcast
server.tool("get_podcast",
  "指定したIDのポッドキャストの詳細情報（ホストなど）を取得します",
  { podcastId: z.string().describe("ポッドキャストのID") },
  async ({ podcastId }) => {
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
      content: [{ type: "text", text: JSON.stringify(data.podcast, null, 2) }]
    };
  }
);

// 10. get_episode
server.tool("get_episode",
  "指定したIDのエピソードの詳細情報（メタデータやコメント数など）を取得します",
  { episodeId: z.string().describe("エピソードのID") },
  async ({ episodeId }) => {
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
      content: [{ type: "text", text: JSON.stringify(data.episode, null, 2) }]
    };
  }
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
