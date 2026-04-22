import { logger } from "./lib/logger.js";

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

export { API_TOKEN, GRAPHQL_URL };
