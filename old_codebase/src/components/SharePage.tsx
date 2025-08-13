// src/pages/Share.tsx (Improved appearance: Modern layout, offline auto-update with SW check, model loading with Suspense, XR works via ModelViewer)

import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { marked } from "marked";
import DOMPurify from "dompurify";
import {
  Globe,
  Loader2,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize,
  Share2,
} from "lucide-react";
import SimpleModelViewer from "./SimpleModelViewer"; // Simple 3D model viewer
import React from "react";
import { getOptimizedModelViewerProps } from "../hooks/useOptimizedModelViewer";

interface ShareData {
  username: string;
  description: string;
  dashboard_content: string;
  logo_url: string | null;
  created_at: string;
  expires_at?: string;
  title?: string;
  background?: string;
}

interface ShareApiResponse {
  success: boolean;
  data: ShareData;
  error?: string;
}

interface Section {
  type: string;
  data: string;
  description?: string;
  attribution?: string;
}

const SharePage: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [renderedContent, setRenderedContent] = useState<JSX.Element[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const fetchShareData = useCallback(async () => {
    if (!shareId) {
      setError("No Share ID provided.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/share/${shareId}`);

      if (response.status === 404) {
        throw new Error(
          "Share link not found. It may have been removed or the URL is incorrect.",
        );
      }

      if (response.status === 403) {
        throw new Error(
          "Access denied. This share may be private or restricted.",
        );
      }

      if (response.status === 429) {
        throw new Error(
          "Too many requests. Please wait a moment and try again.",
        );
      }

      if (!response.ok) {
        throw new Error(
          `Failed to load content: ${response.status} ${response.statusText}`,
        );
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          "Invalid response format. Please check the share link.",
        );
      }

      const apiData: ShareApiResponse = await response.json();

      if (!apiData.success) {
        throw new Error(apiData.error || "Could not load shared content.");
      }

      if (!apiData.data) {
        throw new Error("No content data received. The share may be empty.");
      }

      if (
        apiData.data.expires_at &&
        new Date(apiData.data.expires_at) < new Date()
      ) {
        throw new Error("Share link has expired.");
      }

      setShareData(apiData.data);
      setError(null);
    } catch (err) {
      console.error("SharePage fetch error:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An unknown error occurred while loading the shared content.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [shareId]);

  useEffect(() => {
    fetchShareData();
  }, [fetchShareData]);

  // Ensure service worker is registered for offline access
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Delay SW registration to idle time to avoid initial load jitter
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

  useEffect(() => {
    if (shareData) {
      const renderContent = () => {
        try {
          const sections: Section[] = (() => {
            try {
              const parsed = JSON.parse(shareData.dashboard_content);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })();
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

          const jsxSections: JSX.Element[] = sections
            .map((section) => {
              let contentElement: JSX.Element;
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
                  contentElement = (
                    <div
                      key={section.data}
                      dangerouslySetInnerHTML={{ __html: html }}
                    />
                  );
                  break;
                }
                case "embed": {
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
                  contentElement = (
                    <div
                      key={section.data}
                      dangerouslySetInnerHTML={{ __html: html }}
                    />
                  );
                  break;
                }
                case "model":
                  contentElement = (
                    <div key={section.data} className="my-6">
                      <SimpleModelViewer
                        key={section.data}
                        {...getOptimizedModelViewerProps({
                          src: section.data,
                          context: "share",
                          style: { height: "500px", borderRadius: "12px" },
                        })}
                        enableXR={true}
                        showXRButtons={true}
                      />
                    </div>
                  );
                  break;
                case "video":
                  contentElement = (
                    <div key={section.data} className="my-6">
                      <div className="relative w-full overflow-hidden rounded-lg shadow-md">
                        <video
                          src={section.data}
                          controls
                          className="h-auto max-h-[480px] w-full bg-black"
                          playsInline
                          preload="metadata"
                        />
                      </div>
                    </div>
                  );
                  break;
                case "pdf":
                  contentElement = (
                    <div key={section.data} className="my-6">
                      <div className="w-full overflow-hidden rounded-lg border shadow-md">
                        <iframe
                          src={`${section.data}#toolbar=1&view=FitH`}
                          className="h-[600px] w-full"
                          title="PDF Preview"
                        />
                      </div>
                    </div>
                  );
                  break;
                default:
                  return null;
              }
              return (
                <div key={section.data}>
                  {contentElement}
                  {(section.description || section.attribution) && (
                    <div className="mt-2 rounded-md bg-gray-100 p-2 shadow-sm transition-all hover:shadow-md">
                      {section.description && (
                        <p>
                          <strong>Description:</strong> {section.description}
                        </p>
                      )}
                      {section.attribution && (
                        <p>
                          <strong>Attribution:</strong> {section.attribution}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
            .filter((el): el is JSX.Element => el !== null);
          setRenderedContent(jsxSections);
        } catch {
          setError("Failed to render shared content.");
        } finally {
          setIsLoading(false);
        }
      };
      renderContent();
    } else if (!isLoading && !error) {
      // Handle case where fetch completes but data is null
      setError("Shared content is unavailable or has been removed.");
    }
  }, [shareData, isLoading, error]);

  useEffect(() => {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        reg.update(); // Force update on load
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          window.location.reload(); // Reload on update
        });
        console.log("SW registered for offline, checking updates");
      });
    }
  }, []);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareData?.title || `${shareData?.username}'s Shared Page`,
          text:
            shareData?.description ||
            "Check out this shared educational content!",
          url: window.location.href,
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.2, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="text-center">
          <div className="relative">
            <Loader2 className="mx-auto h-16 w-16 animate-spin text-cyan-400" />
            <div className="absolute inset-0 mx-auto h-16 w-16 animate-pulse rounded-full border-2 border-purple-400/20" />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-white">
            Loading Shared Content
          </h2>
          <p className="mt-2 text-gray-400">Preparing AR/VR experience...</p>
          <div className="mt-4 flex justify-center gap-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-2 w-2 animate-bounce rounded-full bg-cyan-400"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !shareData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-red-900 to-gray-900">
        <div className="max-w-md p-8 text-center">
          <div className="mb-4 text-6xl">🚫</div>
          <h2 className="mb-4 text-2xl font-bold text-white">
            Content Unavailable
          </h2>
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/20 p-4">
            <p className="text-lg text-red-300">
              {error || "Content not found."}
            </p>
          </div>
          <div className="space-y-2 text-sm text-gray-400">
            <p>• Share link may have expired</p>
            <p>• Content may have been removed</p>
            <p>• Check the URL and try again</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{ backgroundColor: shareData.background || "#f0f0f0" }}
    >
      <header className="bg-white py-4 shadow-lg">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:gap-0 sm:px-6">
          <div className="flex items-center space-x-4">
            {shareData.logo_url ? (
              <img
                src={shareData.logo_url}
                alt={`${shareData.username}'s logo`}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <Globe className="h-12 w-12 text-gray-800" />
            )}
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
                {shareData.title || `${shareData.username}'s Shared Page`}
              </h1>
              <p className="text-gray-500">
                Shared on {new Date(shareData.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            onClick={handleShare}
            className="flex w-full items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 sm:w-auto"
            aria-label="Share this page"
          >
            <Share2 className="mr-2" size={18} /> Share
          </button>
        </div>
      </header>
      <main className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-md sm:p-8 lg:col-span-3">
          {shareData.description && (
            <div className="mb-8 border-l-4 border-blue-400 bg-blue-50 p-4">
              <p className="text-lg text-gray-800">{shareData.description}</p>
            </div>
          )}
          <div
            className="prose max-w-none"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: "top left",
            }}
          >
            {renderedContent}
          </div>
        </div>
        <div className="space-y-4 lg:sticky lg:top-24 lg:col-span-1 lg:self-start">
          <div className="rounded-xl bg-white p-4 shadow-md">
            <h3 className="mb-2 font-bold">Controls</h3>
            <div className="flex space-x-2">
              <button
                onClick={handleZoomIn}
                className="rounded bg-gray-200 p-2"
                aria-label="Zoom in"
              >
                <ZoomIn size={18} />
              </button>
              <button
                onClick={handleZoomOut}
                className="rounded bg-gray-200 p-2"
                aria-label="Zoom out"
              >
                <ZoomOut size={18} />
              </button>
              <button
                onClick={handleResetZoom}
                className="rounded bg-gray-200 p-2"
                aria-label="Reset zoom"
              >
                <RotateCw size={18} />
              </button>
              <button
                onClick={() => document.documentElement.requestFullscreen()}
                className="rounded bg-gray-200 p-2"
                aria-label="Full screen"
              >
                <Maximize size={18} />
              </button>
            </div>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-md">
            <h3 className="mb-2 font-bold">Metadata</h3>
            <p>Shared by: {shareData.username}</p>
            <p>Date: {new Date(shareData.created_at).toLocaleString()}</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SharePage;
