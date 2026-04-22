import { vi } from "vitest";

export function getRegisteredHandler(
  registerToolMock: ReturnType<typeof vi.fn>,
  toolName: string,
) {
  const call = registerToolMock.mock.calls.find((args) => args[0] === toolName);
  if (!call) {
    throw new Error(`${toolName} was not registered`);
  }
  return call[2];
}
