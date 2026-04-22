import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchGraphQL } from "../src/tools/graphql.js";
import { GRAPHQL_URL } from "../src/config.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("src/tools/graphql.ts", () => {
  it("throws HttpAppError when GraphQL API returns non-200 status", async () => {
    vi.stubGlobal("fetch", async (_info: RequestInfo, _init?: RequestInit) => {
      return new Response("Bad Request", {
        status: 400,
        statusText: "Bad Request",
      });
    });
    await expect(fetchGraphQL("query { test }")).rejects.toMatchObject({
      kind: "http",
      status: 400,
    });
  });

  it("throws ValidationAppError when GraphQL response contains errors", async () => {
    vi.stubGlobal("fetch", async (_info: RequestInfo, _init?: RequestInit) => {
      return new Response(
        JSON.stringify({ errors: [{ message: "Validation error" }] }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    });
    await expect(fetchGraphQL("query { test }")).rejects.toMatchObject({
      kind: "validation",
    });
  });

  it("returns data when GraphQL response is successful", async () => {
    vi.stubGlobal("fetch", async (_info: RequestInfo, _init?: RequestInit) => {
      return new Response(JSON.stringify({ data: { test: "success" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    await expect(fetchGraphQL("query { test }")).resolves.toEqual({
      test: "success",
    });
  });

  it("sends request to GRAPHQL_URL with proper values", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { test: "success" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchGraphQL("query { test }");
    expect(fetchMock).toHaveBeenCalledWith(
      GRAPHQL_URL,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: expect.stringMatching(/^Bearer /),
        }),
        body: JSON.stringify({ query: "query { test }", variables: {} }),
      }),
    );
  });

  it("normalizes AbortError as timeout error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("Abort error", "AbortError")),
    );

    await expect(fetchGraphQL("query { test }")).rejects.toMatchObject({
      kind: "timeout",
      operation: "fetchGraphQL",
    });
  });

  it("normalizes ECONNRESET-like fetch failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValue(
          new Error("Network error", { cause: { code: "ECONNRESET" } }),
        ),
    );

    await expect(fetchGraphQL("query { test }")).rejects.toMatchObject({
      details: expect.any(Object),
    });
  });

  it("normalizes unknown fetch failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Unknown error")),
    );

    await expect(fetchGraphQL("query { test }")).rejects.toEqual(
      expect.objectContaining({
        kind: "internal",
        details: expect.objectContaining({
          operation: "fetchGraphQL",
        }),
      }),
    );
  });

  it("normalizes invalid JSON responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
      }),
    );

    await expect(fetchGraphQL("query { test }")).rejects.toMatchObject({
      kind: expect.any(String),
      details: expect.objectContaining({
        operation: "fetchGraphQL",
      }),
    });
  });
});
