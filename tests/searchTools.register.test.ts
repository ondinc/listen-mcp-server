import { describe, expect, it, vi } from "vitest";
import { z } from "zod/v3";
import type { ToolRegistrationServer } from "../src/tools/toolTypes.js";
import { registerSearchTools } from "../src/tools/searchTools.js";

describe("src/tools/searchTools.ts", () => {
  it("registers the expected tools", () => {
    const registerToolMock = vi.fn();
    const mockServer: ToolRegistrationServer = {
      registerTool: registerToolMock,
    };
    const mockDeps = {
      fetchGraphQL: vi.fn(),
      makeToolLogger: vi.fn(),
    };
    registerSearchTools(mockServer, mockDeps);

    const toolNames = registerToolMock.mock.calls.map((call) => call[0]);
    expect(toolNames).toEqual(["search_podcasts", "search_users"]);
    expect(() => {
      const descriptions = registerToolMock.mock.calls.map((call) => call[1]);
      descriptions.forEach((desc) => {
        expect(desc).toHaveProperty("description");
        expect(desc.description).toEqual(expect.any(String));
        expect(desc).toHaveProperty("inputSchema");
        expect(desc.inputSchema).toBeInstanceOf(Object);
        Object.keys(desc.inputSchema).forEach((key) => {
          expect(desc.inputSchema[key]).toBeInstanceOf(z.ZodType);
        });
      });
      const handlers = registerToolMock.mock.calls.map((call) => call[2]);
      handlers.forEach((handler) => {
        expect(handler).toEqual(expect.any(Function));
      });
    }).not.toThrow();
  });
});
