import pino from "pino";

const logLevel = process.env.LOG_LEVEL ?? "info";
const usePretty = logLevel === "debug" || logLevel === "trace";

const transport = usePretty
  ? pino.transport({
      target: "pino-pretty",
      options: {
        colorize: true,
        destination: 2,
      },
    })
  : pino.destination(2);

export const logger = pino({ level: logLevel }, transport);
