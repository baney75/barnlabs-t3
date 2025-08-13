// src/components/ShareManager.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Share2,
  Copy,
  Calendar,
  Clock,
  Trash2,
  ExternalLink,
  QrCode,
  CheckCircle,
  AlertCircle,
  Loader2,
  Globe,
  X,
} from "lucide-react";
import QRCode from "qrcode.react";

interface Share {
  id: string;
  dashboard_content: string;
  title?: string;
  description?: string;
  background?: string;
  created_at: string;
  expires_at?: string;
  views?: number;
}

interface ShareManagerProps {
  onClose?: () => void;
  compact?: boolean;
}

const ShareManager: React.FC<ShareManagerProps> = ({
  onClose,
  compact = false,
}) => {
  const [shares, setShares] = useState<Share[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showQR, setShowQR] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New share form
  const [newShare, setNewShare] = useState({
    title: "",
    description: "",
    background: "",
    expiresIn: "never" as "never" | "1h" | "24h" | "7d" | "30d",
    password: "",
  });

  // Fetch existing shares
  const fetchShares = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await fetch("/api/user/shares", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch shares");
      }

      const data = await response.json();
      setShares(data.shares || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch shares");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  // Create new share
  const createShare = async () => {
    try {
      setIsCreating(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication required");
        return;
      }

      // Calculate expiration date
      let expiresAt: string | null = null;
      if (newShare.expiresIn !== "never") {
        const now = new Date();
        switch (newShare.expiresIn) {
          case "1h":
            now.setHours(now.getHours() + 1);
            break;
          case "24h":
            now.setHours(now.getHours() + 24);
            break;
          case "7d":
            now.setDate(now.getDate() + 7);
            break;
          case "30d":
            now.setDate(now.getDate() + 30);
            break;
        }
        expiresAt = now.toISOString();
      }

      const response = await fetch("/api/user/share", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newShare.title || undefined,
          description: newShare.description || undefined,
          background: newShare.background || undefined,
          expiresAt,
          password: newShare.password || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create share");
      }

      const data = await response.json();
      if (data.success) {
        setSuccessMessage("Share link created successfully!");
        setNewShare({
          title: "",
          description: "",
          background: "",
          expiresIn: "never",
          password: "",
        });
        fetchShares();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create share");
    } finally {
      setIsCreating(false);
    }
  };

  // Delete share
  const deleteShare = async (shareId: string) => {
    if (!confirm("Are you sure you want to delete this share link?")) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await fetch(`/api/user/share/${shareId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to delete share");
      }

      setSuccessMessage("Share link deleted successfully!");
      fetchShares();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete share");
    }
  };

  // Copy share link
  const copyShareLink = (shareId: string) => {
    const url = `${window.location.origin}/share/${shareId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(shareId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Get share URL
  const getShareUrl = (shareId: string) => {
    return `${window.location.origin}/share/${shareId}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Check if share is expired
  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  // Parse content to get summary
  const getContentSummary = (content: string) => {
    try {
      const sections = JSON.parse(content);
      const types = sections.map((s: any) => s.type);
      const counts: Record<string, number> = {};
      types.forEach((type: string) => {
        counts[type] = (counts[type] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([type, count]) => `${count} ${type}${count > 1 ? "s" : ""}`)
        .join(", ");
    } catch {
      return "Unknown content";
    }
  };

  if (compact) {
    return (
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Share2 className="h-5 w-5" />
            Quick Share
          </h3>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Share title (optional)"
            className="w-full rounded-md border px-3 py-2"
            value={newShare.title}
            onChange={(e) =>
              setNewShare({ ...newShare, title: e.target.value })
            }
          />

          <select
            className="w-full rounded-md border px-3 py-2"
            value={newShare.expiresIn}
            onChange={(e) =>
              setNewShare({ ...newShare, expiresIn: e.target.value as any })
            }
          >
            <option value="never">Never expires</option>
            <option value="1h">Expires in 1 hour</option>
            <option value="24h">Expires in 24 hours</option>
            <option value="7d">Expires in 7 days</option>
            <option value="30d">Expires in 30 days</option>
          </select>

          <button
            onClick={createShare}
            disabled={isCreating}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                Create Share Link
              </>
            )}
          </button>
        </div>

        {successMessage && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-green-700">
            <CheckCircle className="h-4 w-4" />
            {successMessage}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-3 text-2xl font-bold">
              <Share2 className="h-6 w-6" />
              Share Manager
            </h2>
            {onClose && (
              <button
                onClick={onClose}
                className="rounded-lg p-2 transition-colors hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[calc(90vh-8rem)] overflow-y-auto p-6">
          {/* Create new share */}
          <div className="mb-6 rounded-lg bg-gray-50 p-6">
            <h3 className="mb-4 text-lg font-semibold">
              Create New Share Link
            </h3>

            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Title (optional)
                </label>
                <input
                  type="text"
                  placeholder="My Dashboard"
                  className="w-full rounded-md border px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  value={newShare.title}
                  onChange={(e) =>
                    setNewShare({ ...newShare, title: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Expires
                </label>
                <select
                  className="w-full rounded-md border px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  value={newShare.expiresIn}
                  onChange={(e) =>
                    setNewShare({
                      ...newShare,
                      expiresIn: e.target.value as any,
                    })
                  }
                >
                  <option value="never">Never</option>
                  <option value="1h">1 hour</option>
                  <option value="24h">24 hours</option>
                  <option value="7d">7 days</option>
                  <option value="30d">30 days</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Description (optional)
              </label>
              <textarea
                placeholder="Add a description for your shared dashboard..."
                className="w-full rounded-md border px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={newShare.description}
                onChange={(e) =>
                  setNewShare({ ...newShare, description: e.target.value })
                }
              />
            </div>

            <button
              onClick={createShare}
              disabled={isCreating}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  Create Share Link
                </>
              )}
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
              <CheckCircle className="h-5 w-5" />
              {successMessage}
            </div>
          )}

          {/* Existing shares */}
          <div>
            <h3 className="mb-4 text-lg font-semibold">Your Share Links</h3>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : shares.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <Share2 className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p>No share links created yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className={`rounded-lg border p-4 ${
                      isExpired(share.expires_at)
                        ? "bg-gray-50 opacity-60"
                        : "bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h4 className="font-semibold">
                            {share.title || "Untitled Share"}
                          </h4>
                          {isExpired(share.expires_at) && (
                            <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">
                              Expired
                            </span>
                          )}
                        </div>

                        {share.description && (
                          <p className="mb-2 text-sm text-gray-600">
                            {share.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(share.created_at)}
                          </span>
                          {share.expires_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Expires: {formatDate(share.expires_at)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Globe className="h-4 w-4" />
                            {getContentSummary(share.dashboard_content)}
                          </span>
                        </div>
                      </div>

                      <div className="ml-4 flex items-center gap-2">
                        <button
                          onClick={() => copyShareLink(share.id)}
                          className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                          title="Copy link"
                        >
                          {copiedId === share.id ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Copy className="h-5 w-5" />
                          )}
                        </button>

                        <button
                          onClick={() =>
                            setShowQR(showQR === share.id ? null : share.id)
                          }
                          className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                          title="Show QR code"
                        >
                          <QrCode className="h-5 w-5" />
                        </button>

                        <a
                          href={getShareUrl(share.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                          title="Open in new tab"
                        >
                          <ExternalLink className="h-5 w-5" />
                        </a>

                        <button
                          onClick={() => deleteShare(share.id)}
                          className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {showQR === share.id && (
                      <div className="mt-4 flex flex-col items-center rounded-lg bg-gray-50 p-4">
                        <QRCode value={getShareUrl(share.id)} size={200} />
                        <p className="mt-2 text-sm text-gray-600">
                          Scan to open share link
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareManager;
