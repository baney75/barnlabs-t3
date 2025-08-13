import "@testing-library/jest-dom";
import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = vi.fn();

// Mock Canvas contexts (2D and WebGL) to satisfy libraries like ChartJS and Three
const mockWebGLContext = {
  canvas: document.createElement("canvas"),
  getParameter: vi.fn(),
  getExtension: vi.fn(),
  getContextAttributes: vi.fn(() => ({})),
  isContextLost: vi.fn(() => false),
  getShaderPrecisionFormat: vi.fn(() => ({ precision: 0 })),
};

const mock2DContext = {
  canvas: document.createElement("canvas"),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  closePath: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  drawImage: vi.fn(),
  measureText: vi.fn(() => ({ width: 100 })),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createPattern: vi.fn(() => ({})),
  font: "12px sans-serif",
  textAlign: "left",
  textBaseline: "top",
};

// Cast to suppress lib.dom type checks
(HTMLCanvasElement.prototype as any).getContext = vi.fn(
  (contextType: any): any => {
    if (contextType === "2d") return mock2DContext;
    if (contextType === "webgl" || contextType === "webgl2") {
      return mockWebGLContext;
    }
    return null;
  },
);

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock WebXR
if (!("xr" in navigator)) {
  Object.defineProperty(navigator, "xr", {
    value: {
      requestSession: vi.fn().mockResolvedValue({
        end: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
      isSessionSupported: vi.fn().mockResolvedValue(true),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    configurable: true,
  });
}
