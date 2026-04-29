import { logger } from "../lib/logger.js";
import {
  createHttpError,
  createValidationError,
  normalizeUnknownError,
} from "../lib/appError.js";
import type { GraphQLVariables } from "../tools/toolTypes.js";
import { API_TOKEN, GRAPHQL_URL } from "../config.js";

export async function fetchGraphQL(
  query: string,
  variables: GraphQLVariables = {},
) {
  try {
    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const appError = createHttpError(
        `GraphQL API returned HTTP ${response.status}`,
        response.status,
        {
          statusText: response.statusText,
          url: GRAPHQL_URL,
          details: { operation: "fetchGraphQL" },
        },
      );

      throw appError;
    }

    const result = await response.json();
    if (typeof result !== "object" || result === null) {
      throw createValidationError("GraphQL response is not an object", {
        details: {
          operation: "fetchGraphQL",
        },
      });
    }
    if (Array.isArray(result.errors) && result.errors.length > 0) {
      const appError = createValidationError(
        "GraphQL response contains errors",
        {
          details: {
            operation: "fetchGraphQL",
            graphqlErrors: result.errors,
          },
        },
      );

      logger.error({ err: appError }, appError.message);
      throw appError;
    }

    return result.data;
  } catch (error: unknown) {
    const appError = normalizeUnknownError(error, {
      operation: "fetchGraphQL",
      details: { url: GRAPHQL_URL },
    });

    logger.error({ err: appError }, appError.message);
    throw appError;
  }
}
