// src/components/Dashboard.tsx
// Fixes applied:
// - Made apiFetch generic for typed responses (fixes 'unknown' assignments).
// - Safely access data.error with type guard.
// - Imported ChangeEvent and updated handleLogoUpload type.
// - Added missing <th> in asset table for Size and Uploaded (fixes misalignment).
// - Previous fixes retained.
// Note: The global "not defined" errors are from ESLint; see instructions above to fix via eslint.config.js.

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  lazy,
  Suspense,
  type ReactElement,
  type ChangeEvent,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { marked } from "marked";
import DOMPurify from "dompurify";
import {
  Globe,
  Upload,
  Share2,
  X,
  Copy,
  Trash2,
  Search,
  MessageSquare,
  Eye,
  Download,
  Edit,
  Crop,
  Printer,
  Info,
  Link2,
  Loader2,
  Home,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import QRCode from "react-qr-code";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import ReactCrop, { type Crop as CropType } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
// motion no longer used in this component
import SimpleModelViewer from "./SimpleModelViewer"; // Simple 3D model viewer
// Heavy editors & managers are code-split to keep initial bundle small
const ModelEditor = lazy(() => import("./ModelEditor"));
const EnhancedDashboardEditor = lazy(() => import("./EnhancedDashboardEditor"));
const ShareManager = lazy(() => import("./ShareManager"));
import { getOptimizedModelViewerProps } from "../hooks/useOptimizedModelViewer";
import type { Asset } from "../types";

interface Share {
  id: string;
  description: string;
  created_at: string;
  title?: string;
  background?: string;
}

interface UserInfo {
  ai_enabled: boolean;
}

interface Section {
  type: string;
  data: string;
  description?: string;
  attribution?: string;
}

interface DashboardResponse {
  success: boolean;
  content: string;
  logo_url: string | null;
  current_models: number;
  max_models: number;
  ai_enabled: boolean;
}

interface AssetsResponse {
  success: boolean;
  files: Asset[];
}

interface SharesResponse {
  success: boolean;
  shares: Share[];
}

interface AiResponse {
  response: string;
}

interface UploadResponse {
  success: boolean;
  url: string;
}

function Dashboard() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [renderedSections, setRenderedSections] = useState<ReactElement[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [userAssets, setUserAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [assetSearchTerm, setAssetSearchTerm] = useState("");
  const [modelUsage, setModelUsage] = useState({ current: 0, max: 0 });
  const [isShareModalOpen, setShareModalOpen] = useState(false);
  // Deprecated share modal state (kept for future re-enable)
  const [_shareDescription, __setShareDescription] = useState("");
  const [_shareTitle, __setShareTitle] = useState("");
  const [_shareBackground, __setShareBackground] = useState("");
  const [_generatedShareLink, __setGeneratedShareLink] = useState("");
  const [shareHistory, setShareHistory] = useState<Share[]>([]);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [errorToast, setErrorToast] = useState("");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [editSections, setEditSections] = useState<Section[]>([]);
  // Preview UI removed; keep minimal state if needed in future
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState("");
  const [crop, setCrop] = useState<CropType>({
    unit: "%",
    width: 30,
    height: 30,
    x: 25,
    y: 25,
  });
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printQRLink, setPrintQRLink] = useState("");
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  }
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isModelEditorOpen, setIsModelEditorOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const apiFetch = useCallback(
    async <T = unknown,>(
      url: string,
      options: RequestInit = {},
    ): Promise<T> => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          throw new Error("No authentication token");
        }

        const headers: HeadersInit = { Authorization: `Bearer ${token}` };
        if (!(options.body instanceof FormData)) {
          headers["Content-Type"] = "application/json";
        }

        const response = await fetch(url, { ...options, headers });

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          throw new Error("Session expired. Please log in again.");
        }

        if (response.status === 429) {
          throw new Error(
            "Too many requests. Please wait before trying again.",
          );
        }

        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          data = { success: false, error: await response.text() };
        }

        if (!response.ok) {
          const errorMsg =
            (data as { error?: string }).error ||
            (data as { message?: string }).message ||
            `Request failed: ${response.status} ${response.statusText}`;
          throw new Error(errorMsg);
        }

        return data as T;
      } catch (error) {
        if (error instanceof Error) {
          console.error(`API fetch error for ${url}:`, error.message);
          throw error;
        }
        throw new Error("An unexpected error occurred");
      }
    },
    [navigate],
  );

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler as EventListener);
    // Listen for appinstalled to clear state
    const onInstalled = () => setDeferredPrompt(null);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handler as EventListener,
      );
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Update the renderSection function to use optimized settings:
  const renderSection = useMemo(
    () =>
      (section: Section): ReactElement => {
        let element: ReactElement;
        try {
          switch (section.type) {
            case "markdown": {
              const html = DOMPurify.sanitize(
                marked.parse(section.data, {
                  gfm: true,
                  breaks: true,
                }) as string,
                {
                  ADD_TAGS: ["iframe"],
                  ADD_ATTR: [
                    "allow",
                    "allowfullscreen",
                    "frameborder",
                    "mozallowfullscreen",
                    "webkitallowfullscreen",
                    "xr-spatial-tracking",
                    "execution-while-out-of-viewport",
                    "execution-while-not-rendered",
                    "web-share",
                  ],
                  // Allow sketchfab embeds
                  FORBID_TAGS: [],
                  FORBID_ATTR: [],
                  ALLOW_DATA_ATTR: false,
                  ALLOW_UNKNOWN_PROTOCOLS: true,
                  USE_PROFILES: { html: true },
                },
              );
              element = <div dangerouslySetInnerHTML={{ __html: html }} />;
              break;
            }
            case "embed": {
              const buildEmbedHtml = (input: string): string => {
                try {
                  const url = new URL(input);
                  const host = url.hostname.replace(/^www\./, "");
                  if (host === "youtube.com" || host === "youtu.be") {
                    let videoId = "";
                    if (host === "youtu.be") videoId = url.pathname.slice(1);
                    else if (url.pathname === "/watch")
                      videoId = url.searchParams.get("v") || "";
                    else if (url.pathname.startsWith("/embed/"))
                      videoId = url.pathname.split("/").pop() || "";
                    if (videoId)
                      return `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
                  }
                  if (host === "sketchfab.com") {
                    if (
                      url.pathname.includes("/models/") &&
                      !url.pathname.includes("/embed")
                    ) {
                      return `<iframe width="640" height="480" src="https://sketchfab.com${url.pathname}/embed" frameborder="0" allow="autoplay; fullscreen; xr-spatial-tracking" mozallowfullscreen="true" webkitallowfullscreen="true"></iframe>`;
                    }
                  }
                  if (/<iframe/i.test(input)) return input;
                  return `<iframe src="${input}" width="100%" height="480" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
                } catch {
                  return input;
                }
              };
              const html = DOMPurify.sanitize(
                buildEmbedHtml(section.data || ""),
                {
                  ADD_TAGS: ["iframe"],
                  ADD_ATTR: [
                    "allow",
                    "allowfullscreen",
                    "frameborder",
                    "mozallowfullscreen",
                    "webkitallowfullscreen",
                    "xr-spatial-tracking",
                    "execution-while-out-of-viewport",
                    "execution-while-not-rendered",
                    "web-share",
                  ],
                  FORBID_TAGS: [],
                  FORBID_ATTR: [],
                  ALLOW_DATA_ATTR: false,
                  ALLOW_UNKNOWN_PROTOCOLS: true,
                  USE_PROFILES: { html: true },
                },
              );
              element = <div dangerouslySetInnerHTML={{ __html: html }} />;
              break;
            }
            case "model":
              element = (
                <div className="model-viewer-container">
                  <SimpleModelViewer
                    key={section.data}
                    {...getOptimizedModelViewerProps({
                      src: section.data,
                      context: "dashboard",
                      style: { height: "400px" },
                    })}
                    enableXR={true}
                    showXRButtons={true}
                    onError={(error) => {
                      console.error("Model viewer error:", error);
                      setErrorToast("Failed to load 3D model");
                    }}
                  />
                </div>
              );
              break;
            case "video":
              element = (
                <div className="relative w-full overflow-hidden rounded-lg shadow-md">
                  <video
                    src={section.data}
                    controls
                    className="h-auto max-h-[480px] w-full bg-black"
                    playsInline
                    preload="metadata"
                  />
                </div>
              );
              break;
            case "pdf":
              element = (
                <div className="w-full overflow-hidden rounded-lg border shadow-md">
                  <iframe
                    src={`${section.data}#toolbar=1&view=FitH`}
                    className="h-[600px] w-full"
                    title="PDF Preview"
                  />
                </div>
              );
              break;
            default:
              element = <p>Unsupported section type</p>;
          }
        } catch (err) {
          console.error(
            "Failed to render section:",
            err,
            "Section data:",
            section,
          );
          element = (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="font-medium text-red-600">Error loading section</p>
              <p className="mt-1 text-sm text-red-500">
                Section type: {section.type || "unknown"}
              </p>
              {process.env.NODE_ENV === "development" && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-red-700">
                    Debug Info
                  </summary>
                  <pre className="mt-1 text-xs whitespace-pre-wrap text-red-600">
                    {err instanceof Error ? err.message : String(err)}
                  </pre>
                </details>
              )}
            </div>
          );
        }

        return (
          <div key={section.data}>
            {element}
            {(section.description || section.attribution) && (
              <div className="mt-2 rounded-md bg-gray-100 p-2">
                {section.description && (
                  <p className="flex items-center">
                    <Info size={16} className="mr-2 text-blue-600" />
                    <strong>Description:</strong> {section.description}
                  </p>
                )}
                {section.attribution && (
                  <p className="flex items-center">
                    <Link2 size={16} className="mr-2 text-green-600" />
                    <strong>Attribution:</strong> {section.attribution}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      },
    [],
  );

  const fetchDashboardContent = useCallback(async () => {
    if (!username) return;
    try {
      const data = await apiFetch<DashboardResponse>(
        `/api/dashboard/${username}`,
      );
      if (data.success) {
        const sections: Section[] = (() => {
          if (!data.content) return [];
          try {
            const parsed = JSON.parse(data.content);
            return Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            console.error(
              `Failed to parse dashboard content for user ${username}:`,
              e,
            );
            return [];
          }
        })();
        setEditSections(sections);
        try {
          setRenderedSections(sections.map(renderSection));
        } catch (renderError) {
          console.error("Failed to render sections:", renderError);
          setRenderedSections([]);
          setErrorToast("Failed to render dashboard content");
        }
        // If logo is a protected model URL, request a signed URL for <img> usage
        if (data.logo_url && data.logo_url.includes("/model/")) {
          try {
            const match = data.logo_url.match(/\/model\/(.+)$/);
            const key = match ? decodeURIComponent(match[1]) : "";
            if (key) {
              const signed = await apiFetch<{ url: string }>(
                `/api/user/asset/signed-url?key=${encodeURIComponent(key)}`,
              );
              setLogoUrl(signed.url);
            } else {
              setLogoUrl(data.logo_url);
            }
          } catch {
            setLogoUrl(data.logo_url);
          }
        } else {
          setLogoUrl(data.logo_url);
        }
        setModelUsage({ current: data.current_models, max: data.max_models });
        setUserInfo({ ai_enabled: data.ai_enabled });
      }
    } catch (err) {
      console.error("Failed to fetch dashboard content", err);
      setErrorToast("Failed to load dashboard content");
    }
  }, [username, apiFetch, renderSection]);

  const fetchUserAssets = useCallback(async () => {
    try {
      const data = await apiFetch<AssetsResponse>("/api/user/assets");
      if (data.success) setUserAssets(data.files);
    } catch (error) {
      console.error("Failed to fetch user assets:", error);
      setErrorToast("Failed to load assets");
    }
  }, [apiFetch]);

  const fetchShareHistory = useCallback(async () => {
    try {
      const data = await apiFetch<SharesResponse>("/api/user/shares");
      if (data.success) {
        setShareHistory(data.shares);
      } else {
        setShareHistory([]);
      }
    } catch (error) {
      console.error("Failed to fetch share history:", error);
      setShareHistory([]);
    }
  }, [apiFetch]);

  useEffect(() => {
    Promise.all([
      fetchDashboardContent(),
      fetchUserAssets(),
      fetchShareHistory(),
    ]).catch((error) => {
      console.error("Failed to load dashboard data:", error);
      setErrorToast("Failed to load dashboard. Please refresh the page.");
    });
  }, [fetchDashboardContent, fetchUserAssets, fetchShareHistory]);

  useEffect(() => {
    const handleOnline = () => {
      Promise.all([
        fetchDashboardContent(),
        fetchUserAssets(),
        fetchShareHistory(),
      ]).catch((error) => {
        console.error(
          "Failed to reload dashboard data after reconnection:",
          error,
        );
        setErrorToast("Failed to reload data after reconnection");
      });
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [fetchDashboardContent, fetchUserAssets, fetchShareHistory]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Defer SW registration slightly to avoid first-paint jitter
      const id = window.requestIdleCallback
        ? window.requestIdleCallback(() => {
            navigator.serviceWorker
              .register("/sw.js")
              .then((reg) => reg.update())
              .catch(() => {});
          })
        : (setTimeout(() => {
            navigator.serviceWorker
              .register("/sw.js")
              .then((reg) => reg.update())
              .catch(() => {});
          }, 1500) as unknown as number);
      return () => {
        if (window.cancelIdleCallback) window.cancelIdleCallback(id as number);
        else clearTimeout(id as unknown as number);
      };
    }
  }, []);

  // Group companion models (GLB/USDZ with same base name)
  const groupedAssets = useMemo(() => {
    const groups = new Map<string, Asset[]>();
    const standalone = new Map<string, Asset>();

    userAssets.forEach((asset) => {
      const isModel =
        asset.file_name.endsWith(".glb") || asset.file_name.endsWith(".usdz");
      if (!isModel) {
        standalone.set(asset.name, asset);
        return;
      }

      const baseName = asset.file_name.replace(/\.(glb|usdz)$/i, "");
      const existing = groups.get(baseName);
      if (existing) {
        existing.push(asset);
      } else {
        groups.set(baseName, [asset]);
      }
    });

    // Convert groups to unified entries
    const unifiedAssets: Asset[] = [];

    // Add standalone (non-model) assets
    standalone.forEach((asset) => unifiedAssets.push(asset));

    // Add model groups
    groups.forEach((models, baseName) => {
      if (models.length === 1) {
        // Single model - show suggestion for companion
        const model = models[0];
        const isGlb = model.file_name.endsWith(".glb");
        const companionType = isGlb ? "USDZ" : "GLB";
        const platformSupport = isGlb ? "Android/Web" : "iOS";
        const companionPlatform = isGlb ? "iOS" : "Android/Web";

        unifiedAssets.push({
          ...model,
          companionSuggestion: {
            needed: companionType,
            fileName: `${baseName}.${companionType.toLowerCase()}`,
            platform: companionPlatform,
            currentPlatform: platformSupport,
          },
        });
      } else {
        // Multiple models - unified entry
        const glbModel = models.find((m) => m.file_name.endsWith(".glb"));
        const usdzModel = models.find((m) => m.file_name.endsWith(".usdz"));
        const primaryModel = glbModel || models[0];

        unifiedAssets.push({
          ...primaryModel,
          file_name: `${baseName} (Multi-platform)`,
          file_type: "model",
          size: models.reduce((sum, m) => sum + m.size, 0),
          isUnified: true,
          platforms: {
            glb: !!glbModel,
            usdz: !!usdzModel,
          },
          models: models,
        });
      }
    });

    return unifiedAssets;
  }, [userAssets]);

  useEffect(() => {
    setFilteredAssets(
      groupedAssets.filter((asset) =>
        asset.file_name.toLowerCase().includes(assetSearchTerm.toLowerCase()),
      ),
    );
  }, [groupedAssets, assetSearchTerm]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const threshold = 95 * 1024 * 1024; // 95MB

      if (file.size > threshold) {
        // New large file upload logic
        try {
          // 1. Create multipart upload
          const create = await apiFetch<{ key: string; uploadId: string }>(
            "/api/user/mpu/create",
            {
              method: "POST",
              body: JSON.stringify({
                fileName: file.name,
                mimeType: file.type,
              }),
            },
          );

          // 2. Upload parts (10MB)
          const PART_SIZE = 10 * 1024 * 1024;
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
              `/api/user/mpu/uploadpart?key=${encodeURIComponent(create.key)}&uploadId=${encodeURIComponent(create.uploadId)}&partNumber=${partNumber}`,
              { method: "PUT", body: chunk },
            );
            if (!res.ok) throw new Error(`Part ${partNumber} failed`);
            const uploaded = await res.json();
            const etag = uploaded.etag || uploaded.ETag || uploaded.eTag;
            if (!etag) throw new Error(`Missing ETag for part ${partNumber}`);
            parts.push({ partNumber, etag });
          }

          // 3. Complete MPU
          await apiFetch("/api/user/mpu/complete", {
            method: "POST",
            body: JSON.stringify({
              key: create.key,
              uploadId: create.uploadId,
              parts,
              originalName: file.name,
              size: file.size,
            }),
          });

          fetchUserAssets();
          fetchDashboardContent();
        } catch (error) {
          console.error("Large file upload failed:", error);
          setErrorToast("Large file upload failed");
        }
      } else {
        // Existing small file upload logic
        const formData = new FormData();
        formData.append("file", file);
        try {
          await apiFetch("/api/user/asset/upload", {
            method: "POST",
            body: formData,
          });
          fetchUserAssets();
          fetchDashboardContent();
        } catch (error) {
          console.error("Upload failed:", error);
          setErrorToast("Upload failed");
        }
      }
    },
  });

  const handleDeleteShare = async (shareId: string) => {
    if (!window.confirm("Are you sure you want to delete this share link?"))
      return;
    try {
      await apiFetch(`/api/user/share/${shareId}`, { method: "DELETE" });
      fetchShareHistory();
    } catch (error) {
      console.error("Failed to delete share link:", error);
      setErrorToast("Failed to delete share link");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleDeleteAsset = useCallback(
    async (name: string) => {
      if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
      try {
        await apiFetch(`/api/user/asset/${encodeURIComponent(name)}`, {
          method: "DELETE",
        });
        fetchUserAssets();
      } catch (error) {
        console.error("Failed to delete asset:", error);
        setErrorToast("Failed to delete asset");
      }
    },
    [apiFetch, fetchUserAssets],
  );

  const handleEditModel = useCallback((asset: Asset) => {
    setEditingAsset(asset);
    setIsModelEditorOpen(true);
  }, []);

  const handleSaveModelEdit = useCallback(
    async (modelData: unknown) => {
      if (!editingAsset) return;

      try {
        // Save model configuration to user preferences
        await apiFetch("/api/user/model-config", {
          method: "PUT",
          body: JSON.stringify({
            assetName: editingAsset.name,
            config: modelData,
          }),
        });
        setErrorToast("");
        console.log("Model configuration saved:", modelData);
      } catch (error) {
        console.error("Failed to save model config:", error);
        setErrorToast("Failed to save model configuration");
      }
    },
    [editingAsset, apiFetch],
  );

  const handleExportModel = useCallback(
    (format: "glb" | "gltf") => {
      if (!editingAsset) return;
      // For now, just download the original file
      // In a full implementation, this would export the edited model
      const link = document.createElement("a");
      link.href = editingAsset.url;
      link.download = `${editingAsset.file_name}.${format}`;
      link.click();
    },
    [editingAsset],
  );

  const handleAiQuestion = async () => {
    if (!aiQuestion || !userInfo?.ai_enabled) return;
    try {
      const data = await apiFetch<AiResponse>("/api/ai/query", {
        method: "POST",
        body: JSON.stringify({
          question: aiQuestion,
          context: JSON.stringify(editSections),
        }),
      });
      setAiResponse(data.response);
    } catch (error) {
      console.error("AI query failed:", error);
      setErrorToast("Failed to get AI response");
    }
  };

  const handleSaveContent = async () => {
    try {
      await apiFetch("/api/user/content", {
        method: "PUT",
        body: JSON.stringify({ content: JSON.stringify(editSections) }),
      });
      setErrorToast("");
      fetchDashboardContent();
    } catch (error) {
      console.error("Save failed:", error);
      setErrorToast("Failed to save content");
    }
  };

  const toggleEditMode = () => setIsEditMode(!isEditMode);

  const handleLogoUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCropSrc(reader.result as string);
        setIsCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const getCroppedImg = () => {
    if (!imgRef.current) return;
    const image = imgRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Normalize crop values to natural image pixels (crop uses % units)
    const cropX = ((crop.x || 0) / 100) * image.naturalWidth;
    const cropY = ((crop.y || 0) / 100) * image.naturalHeight;
    const cropW = ((crop.width || 0) / 100) * image.naturalWidth;
    const cropH = ((crop.height || 0) / 100) * image.naturalHeight;

    // Output a square avatar of 256x256 with circular mask
    const outSize = 256;
    canvas.width = outSize;
    canvas.height = outSize;

    // Draw circular mask
    ctx.save();
    ctx.beginPath();
    ctx.arc(outSize / 2, outSize / 2, outSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Draw cropped image scaled to canvas
    ctx.drawImage(image, cropX, cropY, cropW, cropH, 0, 0, outSize, outSize);
    ctx.restore();

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const formData = new FormData();
      formData.append("file", blob, "logo.png");
      try {
        const data = await apiFetch<UploadResponse>("/api/user/asset/upload", {
          method: "POST",
          body: formData,
        });
        // Save URL in DB
        await apiFetch("/api/user/logo", {
          method: "PUT",
          body: JSON.stringify({ logoUrl: data.url }),
        });
        // For <img>, prefer a signed URL if protected path
        const match = data.url.match(/\/model\/(.+)$/);
        if (match) {
          const key = decodeURIComponent(match[1]);
          try {
            const signed = await apiFetch<{ url: string }>(
              `/api/user/asset/signed-url?key=${encodeURIComponent(key)}`,
            );
            setLogoUrl(signed.url);
          } catch {
            setLogoUrl(data.url);
          }
        } else {
          setLogoUrl(data.url);
        }
        setIsCropModalOpen(false);
      } catch (error) {
        console.error("Failed to upload logo:", error);
        setErrorToast("Failed to upload logo");
      }
    }, "image/png");
  };

  const handlePrintQR = (link: string) => {
    setPrintQRLink(link);
    setIsPrintModalOpen(true);
  };

  const printQR = () => {
    window.print();
  };

  const handleDownloadOffline = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        return;
      } catch {
        // Fall back to caching
      }
    }
    if ("serviceWorker" in navigator && "caches" in window) {
      try {
        const cache = await caches.open("dashboard-cache");
        const urlsToCache = [
          "/",
          "/index.html",
          "/manifest.webmanifest",
          "/sw.js",
          "/pwa-192x192.png",
          "/pwa-512x512.png",
          ...userAssets.map((asset) => asset.url),
        ];
        await Promise.all(
          urlsToCache.map(async (url) => {
            try {
              await cache.add(url);
            } catch {}
          }),
        );
        alert("Cached for offline use. You can Install from browser menu.");
      } catch (error) {
        console.error("Offline cache failed:", error);
        setErrorToast("Failed to cache for offline");
      }
    } else {
      setErrorToast("Offline caching not supported in this browser");
    }
  };

  const assetColumns = createColumnHelper<Asset>();

  const assetTable = useReactTable({
    data: filteredAssets,
    columns: [
      assetColumns.accessor("file_name", {
        header: "Model/File Name",
        cell: ({ row }) => {
          const asset = row.original;
          return (
            <div className="space-y-1">
              <div className="font-medium">{asset.file_name}</div>
              {asset.isUnified && (
                <div className="flex gap-2 text-xs">
                  {asset.platforms?.glb && (
                    <span className="rounded bg-green-100 px-2 py-1 text-green-700">
                      Android/Web
                    </span>
                  )}
                  {asset.platforms?.usdz && (
                    <span className="rounded bg-blue-100 px-2 py-1 text-blue-700">
                      iOS
                    </span>
                  )}
                </div>
              )}
              {asset.companionSuggestion && (
                <div className="rounded-lg border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-3 text-xs shadow-sm">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-amber-600">⚠️</span>
                    <div className="font-semibold text-amber-800">
                      Cross-Platform Support Incomplete
                    </div>
                  </div>
                  <div className="space-y-1 text-amber-700">
                    <div>
                      📱 Current:{" "}
                      <span className="font-medium text-green-700">
                        {asset.companionSuggestion.currentPlatform}
                      </span>
                    </div>
                    <div>
                      🔄 Missing:{" "}
                      <span className="font-medium text-red-700">
                        {asset.companionSuggestion.platform}
                      </span>
                    </div>
                    <div className="mt-2 rounded bg-amber-100 p-2 text-amber-800">
                      <strong>📁 Upload:</strong>{" "}
                      <code className="rounded bg-amber-200 px-1 text-xs">
                        {asset.companionSuggestion.fileName}
                      </code>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-amber-600">
                    💡 For optimal AR/VR experience on iOS, Android, and Web
                  </div>
                </div>
              )}
            </div>
          );
        },
      }),
      assetColumns.accessor("file_type", {
        header: "Type",
        cell: ({ row }) => {
          const asset = row.original;
          if (asset.isUnified) {
            return "Multi-platform Model";
          }
          return asset.file_type;
        },
      }),
      assetColumns.accessor("size", {
        header: "Size (KB)",
        cell: (info) => (info.getValue() / 1024).toFixed(2),
      }),
      assetColumns.accessor("uploaded", {
        header: "Uploaded",
        cell: (info) => new Date(info.getValue()).toLocaleString(),
      }),
      assetColumns.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex space-x-1">
            <button
              onClick={() => setPreviewAsset(row.original)}
              className="rounded p-1 text-blue-600 hover:bg-blue-50 hover:text-blue-800"
              aria-label="Preview asset"
              title="Preview"
            >
              <Eye size={16} />
            </button>
            {(row.original.file_type === "model" || row.original.isUnified) && (
              <button
                onClick={() => handleEditModel(row.original)}
                className="rounded p-1 text-green-600 hover:bg-green-50 hover:text-green-800"
                aria-label="Edit model"
                title="Edit in 3D"
              >
                <Edit size={16} />
              </button>
            )}
            <button
              onClick={() => handleDeleteAsset(row.original.name)}
              className="rounded p-1 text-red-600 hover:bg-red-50 hover:text-red-800"
              aria-label="Delete asset"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ),
      }),
    ],
    initialState: { pagination: { pageIndex: 0, pageSize: 5 } },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-3 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="User logo"
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <Globe className="h-12 w-12 text-gray-800" />
              )}
              <h1 className="bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-3xl font-extrabold text-transparent">
                Welcome, {username}!
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/")}
                className="flex items-center space-x-2 rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
                aria-label="Go home"
              >
                <Home size={20} />
                <span>Go Home</span>
              </button>

              <button
                onClick={() => setShareModalOpen(true)}
                className="flex items-center space-x-2 rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
                aria-label="Share dashboard"
              >
                <Share2 size={20} />
                <span>Share</span>
              </button>

              <button
                onClick={handleLogout}
                className="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                aria-label="Logout"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-4">
          <div className="space-y-6 lg:col-span-2">
            {/* Dashboard Content */}
            <div className="overflow-auto rounded-xl bg-white p-8 shadow-md">
              <div className="mb-6 flex items-center justify-between border-b-2 border-gray-200 pb-3">
                <h2 className="text-2xl font-bold text-gray-800">
                  Your Dashboard
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleEditMode}
                    className={`flex items-center rounded-lg px-3 py-2 transition-colors ${
                      isEditMode
                        ? "bg-blue-600 text-white"
                        : "text-blue-600 hover:bg-blue-50"
                    }`}
                  >
                    <Edit size={18} className="mr-2" />
                    {isEditMode ? "Close Editor" : "Edit Dashboard"}
                  </button>
                  <button
                    onClick={handleDownloadOffline}
                    className="flex items-center rounded-lg px-3 py-2 text-green-600 transition-colors hover:bg-green-50"
                  >
                    <Download size={18} className="mr-2" />
                    Offline
                  </button>
                </div>
              </div>

              {renderedSections.length > 0 ? (
                <div className="prose max-w-none">{renderedSections}</div>
              ) : (
                <div className="py-12 text-center text-gray-500">
                  <Globe size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="mb-2 text-lg">Your dashboard is empty</p>
                  <p className="text-sm">
                    Click "Edit Dashboard" to add content
                  </p>
                </div>
              )}
            </div>
            {isEditMode && (
              <Suspense
                fallback={
                  <div className="p-8 text-center">Loading editor…</div>
                }
              >
                <EnhancedDashboardEditor
                  sections={editSections}
                  onSectionsChange={setEditSections}
                  onSave={handleSaveContent}
                  assets={userAssets}
                  isLoading={false}
                />
              </Suspense>
            )}
            {/* Preview panel removed to simplify editor and avoid unused state */}
            <div className="mt-8">
              {userInfo?.ai_enabled ? (
                <>
                  <h3 className="mb-4 flex items-center text-xl font-bold">
                    <MessageSquare className="mr-2" /> Ask Professor Moses
                  </h3>
                  <input
                    type="text"
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    placeholder="Ask about dashboard content..."
                    className="mb-2 w-full rounded-md border p-2"
                    aria-label="AI question input"
                  />
                  <button
                    onClick={handleAiQuestion}
                    className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                  >
                    Ask
                  </button>
                  {aiResponse && (
                    <p className="mt-4 rounded-md bg-gray-100 p-4">
                      {aiResponse}
                    </p>
                  )}
                </>
              ) : null}
            </div>
          </div>

          <div className="space-y-8 lg:col-span-1">
            <div className="rounded-xl bg-white p-6 shadow-md">
              <h2 className="mb-4 text-2xl font-bold text-gray-800">
                Your Assets
              </h2>
              <div className="mb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Models Used:</span>
                  <span className="font-semibold">
                    {modelUsage.current} / {modelUsage.max}
                  </span>
                </div>

                {(() => {
                  // Calculate companion file status
                  const unifiedAssets = filteredAssets.filter(
                    (a) => a.isUnified,
                  );
                  const incompleteAssets = filteredAssets.filter(
                    (a) => a.companionSuggestion,
                  );

                  const totalModelGroups =
                    unifiedAssets.length + incompleteAssets.length;
                  const completeGroups = unifiedAssets.length;
                  const completionRate =
                    totalModelGroups > 0
                      ? (completeGroups / totalModelGroups) * 100
                      : 100;

                  return totalModelGroups > 0 ? (
                    <div className="rounded-lg border bg-gray-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          Cross-Platform Support:
                        </span>
                        <span className="text-sm font-semibold text-purple-600">
                          {completionRate.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-300"
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                      <div className="mt-1 flex justify-between text-xs text-gray-600">
                        <span>{completeGroups} complete</span>
                        <span>
                          {incompleteAssets.length} missing companions
                        </span>
                      </div>
                      {incompleteAssets.length > 0 && (
                        <div className="mt-2 text-xs text-amber-600">
                          ⚠️ Upload companion files for optimal AR/VR support
                        </div>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>
              <div
                {...getRootProps()}
                className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center ${
                  isDragActive
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-300 bg-gray-50"
                }`}
                aria-label="Upload area"
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-600">
                  Drag & drop files here, or click to select.
                </p>
              </div>
              <div className="mt-4">
                <div className="relative">
                  <Search className="absolute top-3 left-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search assets..."
                    value={assetSearchTerm}
                    onChange={(e) => setAssetSearchTerm(e.target.value)}
                    className="w-full rounded-md border p-2 pl-10"
                    aria-label="Search assets"
                  />
                </div>
                <div className="mt-4 max-h-60 overflow-y-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="p-2 text-left">Model/File Name</th>
                        <th className="p-2 text-left">Type</th>
                        <th className="p-2 text-left">Size (KB)</th>
                        <th className="p-2 text-left">Uploaded</th>
                        <th className="p-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assetTable.getRowModel().rows.map((row) => (
                        <tr key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="border-b p-2">
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
                  <div className="mt-2 flex justify-between">
                    <button
                      onClick={() => assetTable.previousPage()}
                      disabled={!assetTable.getCanPreviousPage()}
                      className="rounded bg-gray-200 px-2 py-1 disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <span>
                      Page {assetTable.getState().pagination.pageIndex + 1} of{" "}
                      {assetTable.getPageCount()}
                    </span>
                    <button
                      onClick={() => assetTable.nextPage()}
                      disabled={!assetTable.getCanNextPage()}
                      className="rounded bg-gray-200 px-2 py-1 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-md">
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-800">
                Change Logo <Crop className="ml-2" size={20} />
              </h2>
              <input type="file" accept="image/*" onChange={handleLogoUpload} />
            </div>
            <div className="rounded-xl bg-white p-6 shadow-md">
              <h2 className="mb-4 text-2xl font-bold text-gray-800">
                Share History
              </h2>
              {shareHistory.length === 0 ? (
                <p className="text-gray-500">No shares yet.</p>
              ) : (
                <ul className="space-y-2">
                  {shareHistory.map((share) => (
                    <li
                      key={share.id}
                      className="flex items-center justify-between rounded border p-2"
                    >
                      <span>
                        {share.description || "No description"} -{" "}
                        {new Date(share.created_at).toLocaleDateString()}
                      </span>
                      <div>
                        <button
                          onClick={() =>
                            handlePrintQR(
                              `${window.location.origin}/share/${share.id}`,
                            )
                          }
                          aria-label="Print QR"
                        >
                          <Printer size={18} className="mr-2 text-green-600" />
                        </button>
                        <button
                          onClick={() =>
                            navigator.clipboard.writeText(
                              `${window.location.origin}/share/${share.id}`,
                            )
                          }
                          aria-label="Copy share link"
                        >
                          <Copy size={18} className="mr-2 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteShare(share.id)}
                          aria-label="Delete share"
                        >
                          <Trash2 size={18} className="text-red-600" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>

      {isShareModalOpen && (
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          }
        >
          <ShareManager
            onClose={() => {
              setShareModalOpen(false);
              fetchShareHistory();
            }}
          />
        </Suspense>
      )}

      {isPrintModalOpen && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black print:hidden">
          <div className="m-4 w-full max-w-md rounded-lg bg-white p-8 shadow-xl">
            <div className="@media print { @page { size: A4; } } text-center">
              <img
                src={logoUrl || "/default-logo.png"}
                alt="Logo"
                className="mx-auto mb-4 h-20 w-20 object-contain"
              />
              <QRCode value={printQRLink} size={256} />
              <p className="mt-4 text-lg font-bold">Scan to view dashboard</p>
            </div>
            <button
              onClick={printQR}
              className="mt-4 w-full rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              Print
            </button>
          </div>
        </div>
      )}

      {previewAsset && (
        <div className="bg-opacity-75 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="relative h-5/6 w-11/12 max-w-4xl rounded-lg bg-white p-4 shadow-xl">
            <button
              onClick={() => setPreviewAsset(null)}
              className="bg-opacity-30 hover:bg-opacity-50 absolute top-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black pb-2 text-white transition-all duration-200 ease-in-out hover:scale-110"
              aria-label="Close preview"
            >
              <span className="text-4xl leading-none">×</span>
            </button>
            {(previewAsset.file_type === "model" || previewAsset.isUnified) && (
              <SimpleModelViewer
                key={previewAsset.url}
                src={
                  previewAsset.isUnified
                    ? previewAsset.models?.[0]?.url || previewAsset.url
                    : previewAsset.url
                }
                // Full-screen preview settings
                cameraPosition={[0, 0, 5]}
                autoRotate={true}
                autoRotateSpeed={0.3}
                scale={1}
                environment="studio"
                enableXR={true}
                showXRButtons={true}
                style={{ width: "100%", height: "100%" }}
              />
            )}
            {previewAsset.file_type === "video" && (
              <video
                src={previewAsset.url}
                controls
                style={{ width: "100%", height: "100%" }}
              />
            )}
            {previewAsset.file_type === "pdf" && (
              <iframe
                src={previewAsset.url}
                style={{ width: "100%", height: "100%" }}
              />
            )}
            {(previewAsset.file_type === "image" ||
              previewAsset.file_type === "svg") && (
              <img
                src={previewAsset.url}
                alt="Asset preview"
                style={{ maxWidth: "100%", maxHeight: "100%" }}
              />
            )}
          </div>
        </div>
      )}

      {isCropModalOpen && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="m-4 w-full max-w-md rounded-lg bg-white p-8 shadow-xl">
            <ReactCrop crop={crop} onChange={(newCrop) => setCrop(newCrop)}>
              <img ref={imgRef} src={cropSrc} alt="Crop preview" />
            </ReactCrop>
            <button
              onClick={getCroppedImg}
              className="mt-4 rounded-md bg-green-600 px-4 py-2 text-white"
            >
              Crop and Upload
            </button>
          </div>
        </div>
      )}

      {/* Model Editor Modal */}
      {isModelEditorOpen && editingAsset && (
        <div className="bg-opacity-75 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="relative h-5/6 w-11/12 max-w-7xl overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="absolute top-4 right-4 z-10 flex space-x-2">
              <button
                onClick={() => {
                  setIsModelEditorOpen(false);
                  setEditingAsset(null);
                }}
                className="bg-opacity-50 hover:bg-opacity-70 flex h-10 w-10 items-center justify-center rounded-full bg-black text-white transition-colors"
                aria-label="Close model editor"
              >
                <X size={20} />
              </button>
            </div>
            <div className="bg-opacity-75 absolute top-4 left-4 z-10 rounded-lg bg-black px-3 py-2 text-white">
              <h3 className="font-semibold">
                Editing: {editingAsset.file_name}
              </h3>
            </div>
            <Suspense
              fallback={<div className="p-8 text-center">Loading editor…</div>}
            >
              <ModelEditor
                modelSrc={
                  editingAsset.isUnified
                    ? editingAsset.models?.[0]?.url || editingAsset.url
                    : editingAsset.url
                }
                onSave={handleSaveModelEdit}
                onExport={handleExportModel}
                style={{ width: "100%", height: "100%" }}
              />
            </Suspense>
          </div>
        </div>
      )}

      {errorToast && (
        <div className="fixed right-4 bottom-4 z-50 rounded-lg bg-red-500 p-4 text-white shadow-lg">
          {errorToast}
          <button
            onClick={() => setErrorToast("")}
            className="ml-2 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
