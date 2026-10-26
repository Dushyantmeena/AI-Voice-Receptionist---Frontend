import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// React Testing Library does not auto-unmount between tests when globals are on.
afterEach(() => {
  cleanup();
});
