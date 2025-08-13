// src/components/admin/AssetManagement.tsx
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useDropzone } from "react-dropzone";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Search,
  Eye,
  Trash2,
  RefreshCw,
  Users,
  Upload,
  Share2,
  Globe,
  Lock,
  UserPlus,
  AlertCircle,
  HardDrive,
} from "lucide-react";
import SimpleModelViewer from "../SimpleModelViewer";
import ErrorBoundary from "../ErrorBoundary";
import { getOptimizedModelViewerProps } from "../../hooks/useOptimizedModelViewer";
import { useAdminApi } from "../../hooks/useAdminApi";
import AssetLinkingTools from "./AssetLinkingTools";
import type { Asset as AdminAsset, AdminUser } from "../../types";

interface MessageState {
  type: "" | "info" | "success" | "error";
  text: string;
}

const AssetManagement: React.FC = () => {
  const adminApi = useAdminApi();
  const isFetchingRef = useRef(false);
  const [assets, setAssets] = useState<AdminAsset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<AdminAsset[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState<MessageState>({ type: "", text: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [totalSize, setTotalSize] = useState(0);
  const [previewAsset, setPreviewAsset] = useState<AdminAsset | null>(null);
  const [assignUserId, setAssignUserId] = useState<string>("");
  const [userOptions, setUserOptions] = useState<AdminUser[]>([]);
  const [shareUploads, setShareUploads] = useState(false);
  const [increaseUserLimits, setIncreaseUserLimits] = useState(false);

  const clearMessage = useCallback(
    () => setMessage({ type: "", text: "" }),
    [],
  );

  const fetchAssets = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);
    setMessage({ type: "", text: "" }); // Clear previous messages
    try {
      const data = await adminApi.fetchAssets();
      if (data.success) {
        const files = Array.isArray(data.files) ? data.files : [];
        setAssets(files);
        setFilteredAssets(files);
        setTotalSize(typeof data.totalSize === "number" ? data.totalSize : 0);
        setMessage({ type: "success", text: `Loaded ${files.length} assets` });
        setTimeout(() => setMessage({ type: "", text: "" }), 2000);
      } else {
        setMessage({ type: "error", text: "Failed to fetch assets" });
      }
    } catch (e) {
      console.error("AssetManagement fetchAssets error:", e);
      const errorMessage =
        e instanceof Error ? e.message : "Failed to fetch assets";
      if (
        errorMessage.includes("401") ||
        errorMessage.includes("Authentication")
      ) {
        setMessage({
          type: "error",
          text: "Session expired. Please refresh the page or log in again.",
        });
      } else if (errorMessage.includes("429")) {
        setMessage({
          type: "error",
          text: "Too many requests. Please wait a moment and try again.",
        });
      } else if (errorMessage.includes("Failed to fetch")) {
        setMessage({
          type: "error",
          text: "Network error. Please check your connection and try again.",
        });
      } else {
        setMessage({ type: "error", text: errorMessage });
      }
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [adminApi]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Load users for assignment dropdown
  useEffect(() => {
    (async () => {
      try {
        const res = await adminApi.fetchUsers();
        if (res.success) {
          setUserOptions(res.users);
        }
      } catch (error) {
        console.warn("Failed to fetch users for assignment:", error);
      }
    })();
  }, [adminApi]);

  useEffect(() => {
    setFilteredAssets(
      assets.filter((a) =>
        a.file_name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    );
  }, [assets, searchTerm]);

  const handleSyncFromR2 = useCallback(async () => {
    setMessage({ type: "info", text: "Syncing from R2..." });
    try {
      const data = await adminApi.syncAssets();
      setMessage({
        type: "success",
        text: `Synced: +${data.imported ?? 0}, skipped: ${data.skipped ?? 0}`,
      });
      fetchAssets();
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Sync failed",
      });
    }
  }, [adminApi, fetchAssets]);

  const handleConvertToUsdz = useCallback(
    async (asset: AdminAsset) => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `/api/admin/convert-usdz?key=${encodeURIComponent(asset.name)}`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!res.ok) throw new Error(`Convert failed: ${res.status}`);
        setMessage({
          type: "success",
          text: "USDZ conversion triggered. It will be available shortly.",
        });
        fetchAssets();
      } catch (e) {
        setMessage({
          type: "error",
          text: e instanceof Error ? e.message : "Conversion failed",
        });
      }
    },
    [fetchAssets],
  );

  // Multipart upload path for large files; use admin endpoints directly
  const uploadLargeFileMultipart = useCallback(
    async (file: File) => {
      const token = localStorage.getItem("token");
      // 1) Create MPU
      const createRes = await fetch("/api/admin/mpu/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          ownerUserId: assignUserId ? Number(assignUserId) : undefined,
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

      // 2) Upload parts
      const PART_SIZE = 10 * 1024 * 1024; // 10MB
      const parts: { partNumber: number; etag: string }[] = [];
      let partNumber = 1;
      for (
        let offset = 0;
        offset < file.size;
        offset += PART_SIZE, partNumber += 1
      ) {
        const chunk = file.slice(
          offset,
          Math.min(offset + PART_SIZE, file.size),
        );
        const res = await fetch(
          `/api/admin/mpu/uploadpart?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}&partNumber=${partNumber}`,
          {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
            body: chunk,
          },
        );
        if (!res.ok)
          throw new Error(
            `Failed to upload part ${partNumber}: ${await res.text()}`,
          );
        const uploaded = (await res.json()) as
          | { etag?: string }
          | { ETag?: string }
          | { eTag?: string };
        const etag =
          (uploaded as { etag?: string }).etag ??
          (uploaded as { ETag?: string }).ETag ??
          (uploaded as { eTag?: string }).eTag;
        if (!etag) throw new Error(`Missing ETag for part ${partNumber}`);
        parts.push({ partNumber, etag });
      }

      // 3) Complete MPU (also inserts DB record)
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
          ownerUserId: assignUserId ? Number(assignUserId) : undefined,
          isPublic: shareUploads,
          increaseUserLimit: increaseUserLimits && shareUploads,
        }),
      });
      if (!completeRes.ok)
        throw new Error(
          `Failed to finalize upload: ${await completeRes.text()}`,
        );
      return (await completeRes.json()) as { success: boolean; url?: string };
    },
    [assignUserId, shareUploads, increaseUserLimits],
  );

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
          // Small file path
          const data = await adminApi.uploadAsset(
            file,
            assignUserId ? Number(assignUserId) : undefined,
            {
              isPublic: shareUploads,
              increaseUserLimit: increaseUserLimits && shareUploads,
            },
          );
          if (!data.success) throw new Error(data.message || "Upload failed");
          setMessage({
            type: "success",
            text: data.message || "Upload complete",
          });
        }
        fetchAssets();
      } catch (e) {
        setMessage({
          type: "error",
          text: e instanceof Error ? e.message : "Failed to upload",
        });
      }
    },
    accept: {
      "model/gltf-binary": [".glb"],
      "model/vnd.usdz+zip": [".usdz"],
      "application/octet-stream": [".usdz"],
      "image/svg+xml": [".svg"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "video/webm": [".webm"],
      "application/pdf": [".pdf"],
    },
    maxSize: 500 * 1024 * 1024,
  });

  const handleDelete = useCallback(
    async (asset: AdminAsset) => {
      if (!window.confirm(`Delete ${asset.file_name}? This cannot be undone.`))
        return;
      setMessage({ type: "info", text: `Deleting ${asset.file_name}...` });
      try {
        const data = await adminApi.deleteAsset(asset.name);
        setMessage({ type: "success", text: data.message || "Deleted" });
        fetchAssets();
      } catch (e) {
        setMessage({
          type: "error",
          text: e instanceof Error ? e.message : "Failed to delete",
        });
      }
    },
    [adminApi, fetchAssets],
  );

  const handleToggleSharing = useCallback(
    async (asset: AdminAsset, increaseUserLimit: boolean = false) => {
      if (!asset.is_admin_upload) {
        setMessage({
          type: "error",
          text: "Only admin-uploaded models can be shared",
        });
        return;
      }

      const newIsPublic = !asset.is_public;
      setMessage({
        type: "info",
        text: `${newIsPublic ? "Sharing" : "Unsharing"} ${asset.file_name}...`,
      });

      try {
        const data = await adminApi.updateModelSharing(
          asset.name,
          newIsPublic,
          increaseUserLimit,
          asset.user_id,
        );
        setMessage({ type: "success", text: data.message || "Updated" });
        fetchAssets();
      } catch (e) {
        setMessage({
          type: "error",
          text: e instanceof Error ? e.message : "Failed to update sharing",
        });
      }
    },
    [adminApi, fetchAssets],
  );

  const columns = useMemo(() => {
    const helper = createColumnHelper<AdminAsset>();
    return [
      helper.accessor("file_name", {
        header: "File Name",
        cell: (info) => info.getValue(),
      }),
      helper.accessor("file_type", {
        header: "Type",
        cell: (info) => info.getValue(),
      }),
      helper.accessor("size", {
        header: "Size (KB)",
        cell: (info) => (info.getValue() / 1024).toFixed(2),
      }),
      helper.accessor("uploaded", {
        header: "Uploaded",
        cell: (info) => new Date(info.getValue()).toLocaleString(),
      }),
      helper.accessor("owner_username", {
        header: "Owner",
        cell: (info) => info.getValue() || "Unknown",
      }),
      helper.display({
        id: "sharing",
        header: "Sharing",
        cell: ({ row }) => {
          const asset = row.original;
          if (!asset.is_admin_upload) {
            return <span className="text-sm text-gray-400">User upload</span>;
          }

          return (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleSharing(asset)}
                className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                  asset.is_public
                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
                title={asset.is_public ? "Make private" : "Make public"}
              >
                {asset.is_public ? <Globe size={12} /> : <Lock size={12} />}
                {asset.is_public ? "Public" : "Private"}
              </button>
              {asset.is_public && (
                <button
                  onClick={() => handleToggleSharing(asset, true)}
                  className="flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 transition-colors hover:bg-blue-200"
                  title="Share and increase user upload limit"
                >
                  <UserPlus size={12} />
                  +Limit
                </button>
              )}
            </div>
          );
        },
      }),
      helper.display({
        id: "companion-status",
        header: "Companion Status",
        cell: ({ row }) => {
          const asset = row.original;
          if (asset.file_type !== "model") {
            return <span className="text-sm text-gray-400">N/A</span>;
          }

          const baseName = asset.file_name.replace(/\.(glb|usdz)$/i, "");
          const isGlb = asset.file_name.endsWith(".glb");
          const isUsdz = asset.file_name.endsWith(".usdz");

          // Look for companion in the current assets list
          const companionExtension = isGlb ? ".usdz" : ".glb";
          const companionName = `${baseName}${companionExtension}`;
          const hasCompanion = assets.some(
            (a) => a.file_name === companionName || a.name === companionName,
          );

          if (hasCompanion) {
            return (
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                  ✓ Complete
                </span>
                <div className="flex gap-1">
                  {(isGlb || hasCompanion) && (
                    <span className="rounded bg-blue-100 px-1 py-0.5 text-xs text-blue-700">
                      GLB
                    </span>
                  )}
                  {(isUsdz || hasCompanion) && (
                    <span className="rounded bg-purple-100 px-1 py-0.5 text-xs text-purple-700">
                      USDZ
                    </span>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                ⚠ Missing {isGlb ? "USDZ" : "GLB"}
              </span>
              <button
                onClick={() => handleConvertToUsdz(asset)}
                className="rounded bg-purple-600 px-2 py-1 text-xs text-white transition-colors hover:bg-purple-700"
                title={`Convert to ${isGlb ? "USDZ" : "GLB"}`}
              >
                Convert
              </button>
            </div>
          );
        },
      }),
      helper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewAsset(row.original)}
              className="rounded p-1 text-blue-600 hover:bg-blue-50 hover:text-blue-800"
              aria-label="Preview asset"
              title="Preview"
            >
              <Eye size={16} />
            </button>
            <button
              onClick={() => handleDelete(row.original)}
              className="rounded p-1 text-red-600 hover:bg-red-50 hover:text-red-800"
              aria-label="Delete asset"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ),
      }),
    ];
  }, [assets, handleDelete, handleConvertToUsdz, handleToggleSharing]);

  const table = useReactTable({
    data: filteredAssets,
    columns,
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Calculate asset health metrics
  const assetHealthMetrics = useMemo(() => {
    const modelAssets = assets.filter((a) => a.file_type === "model");
    const groupedModels = new Map<string, AdminAsset[]>();

    modelAssets.forEach((asset) => {
      const baseName = asset.file_name.replace(/\.(glb|usdz)$/i, "");
      const existing = groupedModels.get(baseName);
      if (existing) {
        existing.push(asset);
      } else {
        groupedModels.set(baseName, [asset]);
      }
    });

    let completeModels = 0;
    let incompleteModels = 0;
    const missingCompanions: string[] = [];

    groupedModels.forEach((models, baseName) => {
      const hasGlb = models.some((m) => m.file_name.endsWith(".glb"));
      const hasUsdz = models.some((m) => m.file_name.endsWith(".usdz"));

      if (hasGlb && hasUsdz) {
        completeModels++;
      } else {
        incompleteModels++;
        if (!hasGlb) missingCompanions.push(`${baseName}.glb`);
        if (!hasUsdz) missingCompanions.push(`${baseName}.usdz`);
      }
    });

    return {
      totalModels: groupedModels.size,
      completeModels,
      incompleteModels,
      missingCompanions,
      completionRate:
        groupedModels.size > 0
          ? (completeModels / groupedModels.size) * 100
          : 100,
    };
  }, [assets]);

  return (
    <div className="space-y-6">
      {/* Asset Health Overview */}
      <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 p-6">
        <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-800">
          <div className="rounded-lg bg-blue-100 p-2">📊</div>
          Asset Health Overview
        </h3>
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">
              {assetHealthMetrics.totalModels}
            </div>
            <div className="text-sm text-gray-600">Total Model Groups</div>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-2xl font-bold text-green-600">
              {assetHealthMetrics.completeModels}
            </div>
            <div className="text-sm text-gray-600">Complete (GLB + USDZ)</div>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-2xl font-bold text-amber-600">
              {assetHealthMetrics.incompleteModels}
            </div>
            <div className="text-sm text-gray-600">Missing Companions</div>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-2xl font-bold text-purple-600">
              {assetHealthMetrics.completionRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Completion Rate</div>
          </div>
        </div>

        {assetHealthMetrics.missingCompanions.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h4 className="mb-2 font-medium text-amber-800">
              Missing Companion Files:
            </h4>
            <div className="flex flex-wrap gap-2">
              {assetHealthMetrics.missingCompanions.map((fileName, idx) => (
                <span
                  key={idx}
                  className="rounded bg-amber-100 px-2 py-1 text-sm text-amber-800"
                >
                  {fileName}
                </span>
              ))}
            </div>
            <p className="mt-2 text-sm text-amber-700">
              💡 These companion files are needed for optimal cross-platform
              AR/VR support
            </p>
          </div>
        )}
      </div>

      {/* Asset Linking Tools */}
      <AssetLinkingTools assets={assets} onRefresh={fetchAssets} />

      {/* Upload */}
      <div className="rounded-lg border bg-gray-50 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Upload size={18} /> Upload Asset
        </h3>
        <div className="mb-3 space-y-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-gray-500" />
            <label className="text-sm text-gray-700">
              Assign to user (optional):
            </label>
            <select
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              className="min-w-[220px] rounded border p-1"
            >
              <option value="">Unassigned (uploaded by you)</option>
              {userOptions.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.username} ({u.email})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Share2 size={16} className="text-gray-500" />
              <label className="text-sm text-gray-700">
                Admin Model Sharing:
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={shareUploads}
                onChange={(e) => setShareUploads(e.target.checked)}
                className="rounded"
              />
              <Globe size={14} />
              Make uploaded models public to all users
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={increaseUserLimits}
                onChange={(e) => setIncreaseUserLimits(e.target.checked)}
                disabled={!shareUploads}
                className="rounded disabled:opacity-50"
              />
              <UserPlus size={14} />
              Increase target user's upload limit
            </label>
          </div>
        </div>
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-md border-2 border-dashed border-gray-300 bg-white p-6 text-center hover:border-blue-500 ${isDragActive ? "bg-blue-50" : ""}`}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>Drop the file here ...</p>
          ) : (
            <p>Drag and drop, or click to select (Max 500MB)</p>
          )}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={handleSyncFromR2}
            disabled={isLoading}
            className="inline-flex items-center rounded-md bg-purple-600 px-3 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            <RefreshCw className="mr-2" size={16} /> Sync from R2
          </button>
          <div className="text-sm text-gray-600">
            Total storage: {(totalSize / (1024 * 1024)).toFixed(2)} MB
          </div>
        </div>
      </div>

      {/* Feedback */}
      {message.text && (
        <div
          className={`flex items-center justify-between rounded-md p-3 text-sm ${
            message.type === "error"
              ? "bg-red-100 text-red-700"
              : message.type === "success"
                ? "bg-green-100 text-green-700"
                : "bg-blue-100 text-blue-700"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={clearMessage} className="underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <Search className="text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded border p-2"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
              <p className="font-medium text-gray-600">Loading assets...</p>
              <p className="mt-1 text-sm text-gray-500">
                This may take a moment
              </p>
            </div>
          </div>
        ) : assets.length === 0 && !message.text ? (
          <div className="py-12 text-center">
            <HardDrive className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              No assets found
            </h3>
            <p className="mb-4 text-gray-500">
              Start by uploading your first asset above.
            </p>
            <button
              onClick={fetchAssets}
              className="inline-flex items-center rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
            >
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </button>
          </div>
        ) : assets.length === 0 && message.type === "error" ? (
          <div className="py-12 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              Failed to load assets
            </h3>
            <p className="mb-4 text-gray-500">
              There was an error loading your assets.
            </p>
            <button
              onClick={fetchAssets}
              className="inline-flex items-center rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
            >
              <RefreshCw size={16} className="mr-2" />
              Try Again
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="sticky top-0 bg-gray-50 px-3 py-2 text-left"
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={
                              header.column.getCanSort()
                                ? "cursor-pointer select-none"
                                : ""
                            }
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {{ asc: " 🔼", desc: " 🔽" }[
                              header.column.getIsSorted() as string
                            ] ?? null}
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
                      <td key={cell.id} className="border-b px-3 py-2">
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
            <div className="mt-3 flex items-center justify-between text-sm">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="rounded bg-gray-200 px-3 py-1 disabled:opacity-50"
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
                className="rounded bg-gray-200 px-3 py-1 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-4xl rounded-lg bg-white p-4 shadow-xl">
            <button
              onClick={() => setPreviewAsset(null)}
              className="absolute top-2 right-2 rounded bg-red-600 px-3 py-1 text-white"
            >
              Close
            </button>
            <h2 className="mb-2 text-lg font-semibold">
              Preview: {previewAsset.file_name}
            </h2>
            {previewAsset.file_type === "model" ? (
              <ErrorBoundary>
                <SimpleModelViewer
                  {...getOptimizedModelViewerProps({
                    src: previewAsset.url,
                    context: "assets",
                    style: { width: "100%", height: "500px" },
                  })}
                  enableXR={true}
                  showXRButtons={true}
                />
              </ErrorBoundary>
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
};

export default AssetManagement;
