// src/components/AssetManager.tsx (Updated to use ModelViewer for preview)
/* global localStorage, window, fetch, FormData, File, RequestInit */ // Suppress globals

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import {
  Loader2,
  Search,
  Eye,
  Trash2,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import SimpleModelViewer from "./SimpleModelViewer"; // Simple 3D model viewer
import { useOptimizedModelViewer } from "../hooks/useOptimizedModelViewer";

interface Asset {
  name: string;
  url: string;
  file_name: string;
  file_type: string;
  size: number;
  uploaded: string;
}

function AssetManager() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [totalSize, setTotalSize] = useState(0);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const navigate = useNavigate();

  // Authentication Check
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!token || !user.is_admin) {
      navigate("/login");
    }
  }, [navigate]);

  // API Fetch Helper
  const apiFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<unknown> => {
      const token = localStorage.getItem("token");
      setIsLoading(true);
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`,
            // Only set Content-Type for non-POST; for POST with FormData, omit to let fetch handle multipart boundary
            ...(options.method !== "POST" && {
              "Content-Type": "application/json",
            }),
          },
        });
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          throw new Error("Unauthorized. Redirecting to login.");
        }
        const contentType = response.headers.get("content-type");
        let data;
        if (contentType && contentType.includes("application/json")) {
          data = (await response.json()) as unknown;
        } else {
          const text = await response.text();
          throw new Error(`Received non-JSON response: ${text}`);
        }
        if (!response.ok) {
          throw new Error(
            (data as { error?: string }).error || "API request failed",
          ); // Fixed type assertion for error handling
        }
        return data;
      } finally {
        setIsLoading(false);
      }
    },
    [navigate],
  );

  // Presigned single-request upload to R2 (preferred; avoids Worker memory issues)
  const uploadLargeFileMultipart = useCallback(async (file: File) => {
    const token = localStorage.getItem("token");

    // 1) Create multipart upload
    const createRes = await fetch("/api/admin/mpu/create", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
      }),
    });
    if (!createRes.ok)
      throw new Error(
        `Failed to start multipart upload: ${await createRes.text()}`,
      );
    const { key, uploadId } = (await createRes.json()) as {
      key: string;
      uploadId: string;
    };

    // 2) Upload in chunks (10MB parts)
    const PART_SIZE = 10 * 1024 * 1024; // 10MB
    const parts: { partNumber: number; etag: string }[] = [];
    let partNumber = 1;
    for (
      let offset = 0;
      offset < file.size;
      offset += PART_SIZE, partNumber += 1
    ) {
      const chunk = file.slice(offset, Math.min(offset + PART_SIZE, file.size));
      const putRes = await fetch(
        `/api/admin/mpu/uploadpart?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}&partNumber=${partNumber}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: chunk,
        },
      );
      if (!putRes.ok) {
        throw new Error(
          `Failed to upload part ${partNumber}: ${await putRes.text()}`,
        );
      }
      const uploaded = (await putRes.json()) as { etag?: string };
      const etag =
        (uploaded as any).etag ||
        (uploaded as any).ETag ||
        (uploaded as any).eTag;
      if (!etag) throw new Error(`Missing ETag for part ${partNumber}`);
      parts.push({ partNumber, etag });
    }

    // 3) Complete MPU and insert DB record
    const completeRes = await fetch("/api/admin/mpu/complete", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key,
        uploadId,
        parts,
        originalName: file.name,
        size: file.size,
      }),
    });
    if (!completeRes.ok)
      throw new Error(`Failed to finalize upload: ${await completeRes.text()}`);
    return (await completeRes.json()) as { success: boolean; url?: string };
  }, []);

  // Fetch Assets
  const fetchAssets = useCallback(async () => {
    try {
      const data = (await apiFetch("/api/admin/assets")) as {
        success: boolean;
        files: Asset[];
        totalSize: number;
      };
      if (data.success) {
        setAssets(data.files);
        setFilteredAssets(data.files);
        setTotalSize(data.totalSize);
      } else {
        setMessage({
          type: "error",
          text: (data as { error?: string }).error || "Failed to fetch assets",
        });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to fetch assets",
      });
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Sync from R2
  const handleSyncFromR2 = useCallback(async () => {
    try {
      const data = (await apiFetch("/api/admin/sync-assets")) as {
        success?: boolean;
        imported?: number;
        skipped?: number;
        message?: string;
      };
      if ((data as any).success) {
        setMessage({
          type: "success",
          text: `Synced: +${(data as any).imported ?? 0}, skipped: ${(data as any).skipped ?? 0}`,
        });
      } else {
        setMessage({
          type: "error",
          text: (data as any).message || "Sync failed",
        });
      }
      fetchAssets();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to sync from R2",
      });
    }
  }, [apiFetch, fetchAssets]);

  // Upload Asset
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      setMessage({ type: "info", text: "Uploading file..." });
      try {
        if (file.size > 25 * 1024 * 1024) {
          await uploadLargeFileMultipart(file);
          setMessage({ type: "success", text: "Multipart upload completed" });
        } else {
          const formData = new FormData();
          formData.append("file", file);
          const data = (await apiFetch("/api/admin/upload", {
            method: "POST",
            body: formData,
          })) as { message: string };
          setMessage({ type: "success", text: data.message });
        }
        fetchAssets();
      } catch (err) {
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to upload file",
        });
      }
    },
    accept: {
      "model/gltf-binary": [".glb"],
      "model/vnd.usdz+zip": [".usdz"],
      "image/svg+xml": [".svg"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "video/webm": [".webm"],
      "application/pdf": [".pdf"],
    },
    maxSize: 500 * 1024 * 1024,
  });

  // Delete Asset
  const handleDeleteAsset = useCallback(
    async (fileName: string) => {
      if (
        !window.confirm(
          `Are you sure you want to delete ${fileName}? This cannot be undone.`,
        )
      ) {
        return;
      }
      setMessage({ type: "info", text: `Deleting ${fileName}...` });
      try {
        const data = (await apiFetch(
          `/api/admin/assets/${encodeURIComponent(fileName)}`,
          {
            method: "DELETE",
          },
        )) as { message: string };
        setMessage({ type: "success", text: data.message });
        fetchAssets();
      } catch (err) {
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to delete asset",
        });
      }
    },
    [apiFetch, fetchAssets],
  );

  // Logout
  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }, [navigate]);

  // Clear Message
  const clearMessage = useCallback(() => {
    setMessage({ type: "", text: "" });
  }, []);

  useEffect(() => {
    setFilteredAssets(
      assets.filter((asset) =>
        asset.file_name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    );
  }, [assets, searchTerm]);

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<Asset>();
    return [
      columnHelper.accessor("file_name", {
        header: "File Name",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("file_type", {
        header: "Type",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("size", {
        header: "Size (KB)",
        cell: (info) => (info.getValue() / 1024).toFixed(2),
      }),
      columnHelper.accessor("uploaded", {
        header: "Uploaded",
        cell: (info) => new Date(info.getValue()).toLocaleString(),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <>
            <button
              onClick={() => setPreviewAsset(row.original)}
              className="mr-2 text-blue-600 hover:text-blue-800"
              aria-label="Preview asset"
            >
              <Eye size={18} />
            </button>
            <button
              onClick={() => handleDeleteAsset(row.original.name)}
              className="text-red-600 hover:text-red-800"
              aria-label="Delete asset"
            >
              <Trash2 size={18} />
            </button>
          </>
        ),
      }),
    ];
  }, [handleDeleteAsset]);

  const table = useReactTable({
    data: filteredAssets,
    columns,
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Precompute viewer props for preview (hook is called unconditionally)
  const previewViewerProps = useOptimizedModelViewer({
    src: previewAsset?.url || "",
    context: "assets",
    style: { width: "100%", height: "500px" },
  });

  return (
    <div className="container mx-auto min-h-screen bg-gray-50 p-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/admin"
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft size={24} />
            <span className="ml-2">Back to Admin</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Asset Manager</h1>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Logout
        </button>
      </div>
      {message.text && (
        <div
          className={`mb-4 flex items-center justify-between rounded-md p-4 text-center font-semibold ${
            message.type === "error"
              ? "bg-red-100 text-red-700"
              : message.type === "success"
                ? "bg-green-100 text-green-700"
                : "bg-blue-100 text-blue-700"
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={clearMessage}
            className="ml-4 text-sm underline hover:text-gray-900"
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="mb-8 rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-2xl font-semibold">Upload Asset</h2>
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-md border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center hover:border-blue-500 ${
            isDragActive ? "bg-blue-50" : ""
          }`}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p className="text-lg">Drop the file here ...</p>
          ) : (
            <p className="text-lg">
              Drag 'n' drop a file here, or click to select (Max 500MB)
            </p>
          )}
        </div>
        <p className="mt-2 text-gray-600">
          Total storage: {(totalSize / (1024 * 1024)).toFixed(2)} MB / 10GB
        </p>
        <button
          onClick={handleSyncFromR2}
          disabled={isLoading}
          className="mt-4 flex items-center rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
        >
          <RefreshCw className="mr-2" size={18} />
          Sync from R2 (Import Missing)
        </button>
      </div>
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-2xl font-semibold">Uploaded Assets</h2>
        <div className="relative mb-4">
          <Search className="absolute top-3 left-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border p-2 pl-10"
          />
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
            <span className="ml-2">Loading assets...</span>
          </div>
        ) : assets.length === 0 ? (
          <p className="text-center text-gray-500">No assets found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="sticky top-0 bg-gray-100 px-4 py-2 text-left"
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            {...{
                              className: header.column.getCanSort()
                                ? "cursor-pointer select-none"
                                : "",
                              onClick: header.column.getToggleSortingHandler(),
                            }}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {{
                              asc: " 🔼",
                              desc: " 🔽",
                            }[header.column.getIsSorted() as string] ?? null}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="border-b px-4 py-2">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="rounded-md bg-gray-200 px-4 py-2 disabled:opacity-50"
              >
                Previous
              </button>
              <span>
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </span>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="rounded-md bg-gray-200 px-4 py-2 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      {previewAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-4xl rounded-lg bg-white p-4 shadow-xl">
            <button
              onClick={() => setPreviewAsset(null)}
              className="absolute top-2 right-2 rounded bg-red-600 px-3 py-1 text-white"
            >
              Close
            </button>
            <h2 className="mb-2 text-xl font-semibold">
              Preview: {previewAsset.file_name}
            </h2>
            {previewAsset.file_type === "model" ? (
              previewAsset.url && (
                <SimpleModelViewer
                  {...previewViewerProps}
                  enableXR={true}
                  showXRButtons={true}
                />
              )
            ) : previewAsset.file_type === "video" ? (
              <video
                src={previewAsset.url}
                controls
                className="h-auto w-full"
              />
            ) : previewAsset.file_type === "image" ? (
              <img
                src={previewAsset.url}
                alt="Preview"
                className="mx-auto max-h-[500px]"
              />
            ) : previewAsset.file_type === "pdf" ? (
              <iframe
                src={`${previewAsset.url}#toolbar=1&view=FitH`}
                className="h-[600px] w-full"
                title="PDF Preview"
              />
            ) : (
              <p>Unsupported preview type.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AssetManager;
