import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModelTools from "../../../components/admin/ModelTools";

// Mock the useAdminApi hook
const mockUploadModelResource = vi.fn();
vi.mock("../../../hooks/useAdminApi", () => ({
  useAdminApi: () => ({
    uploadModelResource: mockUploadModelResource,
  }),
}));

// Mock react-dropzone
vi.mock("react-dropzone", () => ({
  useDropzone: ({ onDrop, disabled }: any) => {
    const mockGetRootProps = () => ({
      onClick: () => {
        if (!disabled) {
          const file = new File(["test"], "test.glb", {
            type: "model/gltf-binary",
          });
          onDrop([file]);
        }
      },
    });

    const mockGetInputProps = () => ({
      type: "file",
      accept: {
        "model/gltf-binary": [".glb"],
        "model/gltf+json": [".gltf"],
      },
    });

    return {
      getRootProps: mockGetRootProps,
      getInputProps: mockGetInputProps,
      isDragActive: false,
    };
  },
}));

describe("ModelTools Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the main heading and description", () => {
    render(<ModelTools />);

    expect(screen.getByText("Model Tools")).toBeInTheDocument();
    expect(
      screen.getByText(/Upload and process 3D models/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/AR functionality is handled through Google ARCore/),
    ).toBeInTheDocument();
  });

  it("renders all sections", () => {
    render(<ModelTools />);

    expect(screen.getByText("Upload AI Resource")).toBeInTheDocument();
    expect(screen.getByText("Model Processing")).toBeInTheDocument();
    expect(screen.getByText("Export Tools")).toBeInTheDocument();
  });

  it("displays user selection dropdown", () => {
    render(<ModelTools />);

    expect(screen.getByText("Assign to User (optional)")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("handles file upload successfully", async () => {
    mockUploadModelResource.mockResolvedValueOnce({ success: true });
    render(<ModelTools />);

    // Select a user
    const select = screen.getByRole("combobox");
    await userEvent.selectOptions(select, "1");

    // Click the dropzone to trigger file upload
    const dropzone = screen
      .getByText(/Drag and drop a 3D model/i)
      .closest("div");
    fireEvent.click(dropzone!);

    await waitFor(() => {
      expect(mockUploadModelResource).toHaveBeenCalledWith(1, expect.any(File));
      expect(
        screen.getByText("Successfully uploaded test.glb"),
      ).toBeInTheDocument();
    });
  });

  it("shows error when no user is selected", async () => {
    render(<ModelTools />);

    // Don't select a user and try to upload
    const dropzone = screen
      .getByText(/Drag and drop a 3D model/i)
      .closest("div");
    fireEvent.click(dropzone!);

    await waitFor(() => {
      expect(
        screen.getByText("Error: Please select a user for the AI resource"),
      ).toBeInTheDocument();
    });
  });

  it("handles upload failure", async () => {
    mockUploadModelResource.mockResolvedValueOnce({
      success: false,
      message: "Upload failed due to server error",
    });
    render(<ModelTools />);

    // Select a user
    const select = screen.getByRole("combobox");
    await userEvent.selectOptions(select, "1");

    // Click the dropzone
    const dropzone = screen
      .getByText(/Drag and drop a 3D model/i)
      .closest("div");
    fireEvent.click(dropzone!);

    await waitFor(() => {
      expect(
        screen.getByText("Error: Upload failed due to server error"),
      ).toBeInTheDocument();
    });
  });

  it("displays supported file types", () => {
    render(<ModelTools />);

    expect(
      screen.getByText("Supports .glb, .gltf, .pdf, .txt files"),
    ).toBeInTheDocument();
  });

  it("renders processing buttons", () => {
    render(<ModelTools />);

    expect(screen.getByText("Optimize All Models")).toBeInTheDocument();
    expect(screen.getByText("Generate Thumbnails")).toBeInTheDocument();
  });

  it("handles optimize models click", async () => {
    render(<ModelTools />);

    const optimizeButton = screen.getByText("Optimize All Models");
    fireEvent.click(optimizeButton);

    await waitFor(() => {
      expect(screen.getByText("Optimizing all models...")).toBeInTheDocument();
    });

    await waitFor(
      () => {
        expect(
          screen.getByText("Model optimization completed"),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("handles generate thumbnails click", async () => {
    render(<ModelTools />);

    const thumbnailsButton = screen.getByText("Generate Thumbnails");
    fireEvent.click(thumbnailsButton);

    await waitFor(() => {
      expect(screen.getByText("Generating thumbnails...")).toBeInTheDocument();
    });

    await waitFor(
      () => {
        expect(
          screen.getByText("Thumbnails generated successfully"),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("renders export buttons", () => {
    render(<ModelTools />);

    expect(screen.getByText("Export Models")).toBeInTheDocument();
    expect(screen.getByText("Export Metadata")).toBeInTheDocument();
    expect(screen.getByText("Backup All Assets")).toBeInTheDocument();
  });

  it("displays processing options information", () => {
    render(<ModelTools />);

    expect(
      screen.getByText(/Model optimization reduces file sizes/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Thumbnail generation creates preview images/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/AI resources can be assigned to specific users/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /AR viewing is handled automatically through Google ARCore/,
      ),
    ).toBeInTheDocument();
  });

  it("disables dropzone when processing", async () => {
    render(<ModelTools />);

    // Select a user
    const select = screen.getByRole("combobox");
    await userEvent.selectOptions(select, "1");

    // Start upload with a slower resolution to catch the processing state
    let resolveUpload: any;
    mockUploadModelResource.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpload = resolve;
        }),
    );

    const dropzoneContainer = screen
      .getByText(/Drag and drop a 3D model/i)
      .closest("div");

    // Click to start upload
    fireEvent.click(dropzoneContainer!);

    // Wait for the processing state to appear
    await waitFor(() => {
      expect(screen.getByText("Uploading test.glb...")).toBeInTheDocument();
    });

    // Find the actual dropzone div that has the classes
    const dropzoneElement = screen
      .getByText(/Drag and drop a 3D model/i)
      .closest(".border-2.border-dashed");

    // Check that dropzone is disabled
    expect(dropzoneElement).toHaveClass("opacity-50");
    expect(dropzoneElement).toHaveClass("cursor-not-allowed");

    // Resolve the upload
    resolveUpload({ success: true });

    // Wait for success message
    await waitFor(() => {
      expect(
        screen.getByText("Successfully uploaded test.glb"),
      ).toBeInTheDocument();
    });
  });
});
