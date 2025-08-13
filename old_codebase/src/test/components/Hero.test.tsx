import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Hero from "../../components/Hero";

// Mock the SimpleModelViewer component
vi.mock("../../components/SimpleModelViewer", () => ({
  default: ({ src, onError }: any) => (
    <div data-testid="model-viewer" data-src={src}>
      <button onClick={() => onError?.(new Error("Test error"))}>
        Trigger Error
      </button>
    </div>
  ),
}));

// Mock the useOptimizedModelViewer hook
vi.mock("../../hooks/useOptimizedModelViewer", () => ({
  useOptimizedModelViewer: ({ src }: any) => ({
    src,
    optimized: true,
  }),
}));

describe("Hero Component", () => {
  it("renders the main heading and subheading", () => {
    render(<Hero />);

    expect(
      screen.getByText("Baney Augmented Reality Nexus"),
    ).toBeInTheDocument();
    // Subheading tagline present
    expect(
      screen.getByText(/Where Innovation Meets Reality/i),
    ).toBeInTheDocument();
  });

  it("renders the interactive globe section", () => {
    render(<Hero />);

    expect(screen.getByText(/Interactive Earth Model/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Click to explore with AR\/VR support/i),
    ).toBeInTheDocument();
  });

  it("renders the globe button with correct text", () => {
    render(<Hero />);

    const button = screen.getByRole("button", {
      name: /Launch interactive 3D Earth model/i,
    });
    expect(button).toBeInTheDocument();
  });

  it("opens modal when globe button is clicked", async () => {
    render(<Hero />);

    const button = screen.getByRole("button", {
      name: /Launch interactive 3D Earth model/i,
    });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByTestId("model-viewer")).toBeInTheDocument();
    });
  });

  it("uses the correct model source path", async () => {
    render(<Hero />);

    const button = screen.getByRole("button", {
      name: /Launch interactive 3D Earth model/i,
    });
    fireEvent.click(button);

    await waitFor(() => {
      const modelViewer = screen.getByTestId("model-viewer");
      expect(modelViewer).toHaveAttribute(
        "data-src",
        "/Hero-Assets/Earth_Model.glb",
      );
    });
  });

  it("closes modal when close button is clicked", async () => {
    render(<Hero />);

    // Open modal
    const openButton = screen.getByRole("button", {
      name: /Launch interactive 3D Earth model/i,
    });
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Close modal
    const closeButton = screen.getByText(/Close/);
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("displays error message when model fails to load", async () => {
    render(<Hero />);

    // Open modal
    const openButton = screen.getByRole("button", {
      name: /Launch interactive 3D Earth model/i,
    });
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Trigger error
    const errorButton = screen.getByText("Trigger Error");
    fireEvent.click(errorButton);

    await waitFor(() => {
      expect(
        screen.getByText("Error loading model: Test error"),
      ).toBeInTheDocument();
    });
  });

  it("has fade-in animation on mount", async () => {
    // Ensure requestAnimationFrame runs immediately in test
    const rafSpy = vi
      .spyOn(window, "requestAnimationFrame")
      // @ts-ignore jsdom types allow this
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(0);
        return 1 as unknown as number;
      });

    const { container } = render(<Hero />);

    await waitFor(() => {
      const heroSection = container.querySelector("#hero");
      expect(heroSection).toHaveClass("opacity-100");
    });

    rafSpy.mockRestore();
  });

  // Modal renders model viewer; detailed AR copy may change over time, so we omit that assertion
});
