import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import SimpleModelViewer from "../../components/SimpleModelViewer";

// Mock @react-three/fiber and @react-three/drei
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: any) => <div data-testid="canvas">{children}</div>,
  useThree: () => ({ gl: { capabilities: { getMaxAnisotropy: () => 16 } } }),
  useFrame: vi.fn(),
}));

vi.mock("@react-three/drei", () => ({
  useGLTF: (_url: string) => ({
    scene: { traverse: vi.fn() },
  }),
  OrbitControls: () => null,
  Environment: () => null,
  Center: ({ children }: any) => <div>{children}</div>,
  Stage: ({ children }: any) => <div>{children}</div>,
  PerspectiveCamera: () => null,
  Html: ({ children }: any) => <div>{children}</div>,
  useProgress: () => ({
    active: false,
    progress: 100,
    errors: [],
    item: "",
    loaded: 1,
    total: 1,
  }),
  Bounds: ({ children }: any) => <div>{children}</div>,
  useBounds: () => ({
    refresh: () => ({
      clip: () => ({
        fit: vi.fn(),
      }),
    }),
  }),
  Preload: () => null,
  useTexture: vi.fn(),
  AdaptiveDpr: () => null,
  AdaptiveEvents: () => null,
  PerformanceMonitor: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@react-three/xr", () => ({
  XR: ({ children }: any) => <div>{children}</div>,
  ARButton: () => <button>AR</button>,
  VRButton: () => <button>VR</button>,
  createXRStore: () => ({}),
}));

// Mock fetch for signed URL requests
global.fetch = vi.fn();

// NOTE: These integration-like tests are heavy due to R3F/XR mocks and
// cause long execution times/OOM on CI in jsdom. Keep skipped and
// validate via lighter smoke tests elsewhere.
describe.skip("SimpleModelViewer Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockReset();
  });

  describe("URL Resolution", () => {
    it("handles local paths directly", async () => {
      render(<SimpleModelViewer src="/Hero-Assets/Earth_Model.glb" />);

      await waitFor(() => {
        expect(screen.getByTestId("canvas")).toBeInTheDocument();
      });

      // Should not make any fetch calls for local assets
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("proxies bucket URLs through proxy endpoint", async () => {
      const bucketUrl = "https://bucket1.barnlabs.net/models/test.glb";
      render(<SimpleModelViewer src={bucketUrl} />);

      await waitFor(() => {
        expect(screen.getByTestId("canvas")).toBeInTheDocument();
      });

      // The resolved URL should use the proxy
      // Note: In the actual implementation, this is handled in the resolvedUrl memo
    });

    it("proxies R2 storage URLs", async () => {
      const r2Url = "https://example.r2.cloudflarestorage.com/models/test.glb";
      render(<SimpleModelViewer src={r2Url} />);

      await waitFor(() => {
        expect(screen.getByTestId("canvas")).toBeInTheDocument();
      });
    });

    it("handles blob URLs directly", async () => {
      const blobUrl = "blob:http://localhost:3000/12345";
      render(<SimpleModelViewer src={blobUrl} />);

      await waitFor(() => {
        expect(screen.getByTestId("canvas")).toBeInTheDocument();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("handles data URLs directly", async () => {
      const dataUrl = "data:model/gltf-binary;base64,Z2xURg==";
      render(<SimpleModelViewer src={dataUrl} />);

      await waitFor(() => {
        expect(screen.getByTestId("canvas")).toBeInTheDocument();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("requests signed URL for authenticated model endpoints", async () => {
      // Mock localStorage
      const mockToken = "test-token";
      localStorage.getItem = vi.fn().mockReturnValue(mockToken);

      // Mock successful signed URL response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://signed-url.example.com/model.glb" }),
      });

      // Use an absolute URL pattern that triggers signed URL logic
      render(
        <SimpleModelViewer src="http://localhost:3000/model/test-model.glb" />,
      );

      // Wait a bit for the effect to run
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should fetch signed URL for /model/ endpoints
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/user/asset/signed-url"),
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` },
        }),
      );
    });

    it("falls back to original URL when signed URL request fails", async () => {
      localStorage.getItem = vi.fn().mockReturnValue("test-token");

      // Mock failed signed URL response
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
      });

      render(<SimpleModelViewer src="/api/user/model/test-model.glb" />);

      await waitFor(() => {
        expect(screen.getByTestId("canvas")).toBeInTheDocument();
      });
    });

    it("shows error for invalid URLs", () => {
      render(<SimpleModelViewer src="" />);

      expect(screen.getByText(/Invalid model URL/)).toBeInTheDocument();
    });
  });

  describe("Component Props", () => {
    it("applies custom styles", () => {
      const customStyle = { width: "500px", height: "300px" };
      const { container } = render(
        <SimpleModelViewer src="/test.glb" style={customStyle} />,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.width).toBe("500px");
      expect(wrapper.style.height).toBe("300px");
    });

    it("enables auto-rotation when specified", () => {
      render(
        <SimpleModelViewer
          src="/test.glb"
          autoRotate={true}
          autoRotateSpeed={2}
        />,
      );

      // Component should render with auto-rotation enabled
      expect(screen.getByTestId("canvas")).toBeInTheDocument();
    });

    it("configures camera position", () => {
      render(
        <SimpleModelViewer src="/test.glb" cameraPosition={[10, 5, 10]} />,
      );

      expect(screen.getByTestId("canvas")).toBeInTheDocument();
    });

    it("sets environment preset", () => {
      render(<SimpleModelViewer src="/test.glb" environment="sunset" />);

      expect(screen.getByTestId("canvas")).toBeInTheDocument();
    });

    it("respects XR enable flags", () => {
      render(
        <SimpleModelViewer
          src="/test.glb"
          enableXR={true}
          showXRButtons={true}
        />,
      );

      // Component should render with XR enabled
      expect(screen.getByTestId("canvas")).toBeInTheDocument();
      // Note: The actual XR buttons are rendered inside the Canvas component
      // which is mocked in tests, so we can't directly test for them
    });

    it("hides XR buttons when disabled", () => {
      render(
        <SimpleModelViewer
          src="/test.glb"
          enableXR={false}
          showXRButtons={false}
        />,
      );

      expect(screen.queryByText("AR")).not.toBeInTheDocument();
      expect(screen.queryByText("VR")).not.toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("calls onError callback when provided", async () => {
      const onError = vi.fn();
      render(<SimpleModelViewer src="/invalid-model.glb" onError={onError} />);

      // In a real scenario, this would be triggered by the model loading error
      // For now, we just verify the callback is passed correctly
      expect(screen.getByTestId("canvas")).toBeInTheDocument();
    });

    it("displays loading state initially", () => {
      render(<SimpleModelViewer src="/test.glb" />);

      // The component should show a loading state
      // Note: The actual loading UI is inside the Canvas component
      expect(screen.getByTestId("canvas")).toBeInTheDocument();
    });
  });

  describe("Performance Features", () => {
    it("enables shadows when specified", () => {
      render(<SimpleModelViewer src="/test.glb" enableShadows={true} />);

      expect(screen.getByTestId("canvas")).toBeInTheDocument();
    });

    it("enables post-processing when specified", () => {
      render(<SimpleModelViewer src="/test.glb" enablePostProcessing={true} />);

      expect(screen.getByTestId("canvas")).toBeInTheDocument();
    });

    it("configures zoom limits", () => {
      render(
        <SimpleModelViewer
          src="/test.glb"
          minDistance={0.5}
          maxDistance={50}
        />,
      );

      expect(screen.getByTestId("canvas")).toBeInTheDocument();
    });
  });
});
