import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

// Mock useModelLoader to bypass real GLTF loading
vi.mock("@/hooks/useModelLoader", () => {
  return {
    useModelLoader: () => ({
      gltf: { scene: {} } as any,
      loading: false,
      error: null,
    }),
  };
});

// Mock useXRSession so we don't request a real XR session
vi.mock("@/hooks/useXRSession", () => {
  return {
    useXRSession: () => ({ session: null, error: null }),
  };
});

import { ModelViewer } from "../../components/ModelViewer";

describe("ModelViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders canvas element", () => {
    const { container } = render(<ModelViewer modelUrl="/models/mock.glb" />);
    const canvas = container.querySelector("canvas");
    expect(canvas).toBeTruthy();
  });
});
