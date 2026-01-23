import { vi } from "vitest";

export const mockProcessExit = () => {
  return vi.spyOn(process, "exit").mockImplementation((code?: number) => {
    throw new Error(`process.exit(${code})`);
  });
};
