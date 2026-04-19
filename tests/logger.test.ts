import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pinoMock = vi.fn();
const transportMock = vi.fn();
const destinationMock = vi.fn();

vi.mock("pino", () => {
  const defaultExport = Object.assign(pinoMock, {
    transport: transportMock,
    destination: destinationMock,
  });

  return {
    default: defaultExport,
  };
});

describe("src/lib/logger.ts", () => {
  const originalLogLevel = process.env.LOG_LEVEL;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    pinoMock.mockReturnValue({ mock: "logger-instance" });
    transportMock.mockReturnValue({ mock: "transport" });
    destinationMock.mockReturnValue({ mock: "destination" });
  });

  afterEach(() => {
    if (originalLogLevel === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = originalLogLevel;
    }
  });

  it("uses pretty transport when LOG_LEVEL=debug", async () => {
    process.env.LOG_LEVEL = "debug";

    const mod = await import("../src/lib/logger");

    expect(transportMock).toHaveBeenCalledWith({
      target: "pino-pretty",
      options: {
        colorize: true,
        destination: 2,
      },
    });
    expect(destinationMock).not.toHaveBeenCalled();

    expect(pinoMock).toHaveBeenCalledWith(
      { level: "debug" },
      { mock: "transport" },
    );

    expect(mod.logger).toEqual({ mock: "logger-instance" });
  });

  it("uses pretty transport when LOG_LEVEL=trace", async () => {
    process.env.LOG_LEVEL = "trace";

    await import("../src/lib/logger");

    expect(transportMock).toHaveBeenCalledWith({
      target: "pino-pretty",
      options: {
        colorize: true,
        destination: 2,
      },
    });
    expect(destinationMock).not.toHaveBeenCalled();

    expect(pinoMock).toHaveBeenCalledWith(
      { level: "trace" },
      { mock: "transport" },
    );
  });

  it("uses stderr destination when LOG_LEVEL=info", async () => {
    process.env.LOG_LEVEL = "info";

    await import("../src/lib/logger");

    expect(destinationMock).toHaveBeenCalledWith(2);
    expect(transportMock).not.toHaveBeenCalled();

    expect(pinoMock).toHaveBeenCalledWith(
      { level: "info" },
      { mock: "destination" },
    );
  });

  it("defaults to info when LOG_LEVEL is not set", async () => {
    delete process.env.LOG_LEVEL;

    await import("../src/lib/logger");

    expect(destinationMock).toHaveBeenCalledWith(2);
    expect(transportMock).not.toHaveBeenCalled();

    expect(pinoMock).toHaveBeenCalledWith(
      { level: "info" },
      { mock: "destination" },
    );
  });
});
