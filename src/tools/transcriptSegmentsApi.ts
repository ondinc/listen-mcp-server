import { API_TOKEN, GRAPHQL_URL } from "../config.js";

type Filters = { offset?: number; limit?: number; start?: number; end?: number };
type Update = {
  version: string;
  edits: { index: number; text: string }[];
  dry_run?: boolean;
};

export type FetchTranscriptSegments = (
  episodeId: string,
  input: { filters: Filters } | { update: Update },
) => Promise<{ status: number; body: unknown }>;

export const fetchTranscriptSegments: FetchTranscriptSegments = async (
  episodeId,
  input,
) => {
  const url = new URL(
    "/api/v1/episodes/" + encodeURIComponent(episodeId) + "/transcript/segments",
    GRAPHQL_URL,
  );
  const update = "update" in input ? input.update : undefined;
  if ("filters" in input) {
    for (const [key, value] of Object.entries(input.filters)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  const response = await fetch(url, {
    method: update ? "PATCH" : "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
      ...(update ? { "Content-Type": "application/json" } : {}),
    },
    body: update ? JSON.stringify(update) : undefined,
    redirect: "error",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.headers.get("content-type")?.includes("application/json")) {
    return {
      status: response.ok ? 502 : response.status,
      body: { message: "LISTEN returned an unexpected response." },
    };
  }

  return { status: response.status, body: await response.json() };
};
