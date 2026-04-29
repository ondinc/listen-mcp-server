import type { ToolDeps, ToolRegistrationServer } from "./toolTypes.js";

export function registerMeTools(
  server: ToolRegistrationServer,
  { fetchGraphQL, makeToolLogger }: ToolDeps,
) {
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
        content: [
          {
            type: "text",
            text: JSON.stringify(data.me, null, 2),
          },
        ],
      };
    },
  );

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
}
