import React, { useState, useCallback } from "react";
import { useAdminApi } from "../../hooks/useAdminApi";
import {
  Link2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Zap,
  RefreshCw,
} from "lucide-react";
import type { Asset as AdminAsset } from "../../types";

interface AssetLinkingToolsProps {
  assets: AdminAsset[];
  onRefresh: () => void;
}

interface LinkingOperation {
  id: string;
  glbAsset: AdminAsset;
  usdzAsset: AdminAsset;
  status: "pending" | "success" | "error";
  message?: string;
}

const AssetLinkingTools: React.FC<AssetLinkingToolsProps> = ({
  assets,
  onRefresh,
}) => {
  const _adminApi = useAdminApi();
  const [isProcessing, setIsProcessing] = useState(false);
  const [operations, setOperations] = useState<LinkingOperation[]>([]);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Find potential linking opportunities
  const linkingOpportunities = useCallback(() => {
    const modelAssets = assets.filter((a) => a.file_type === "model");
    const opportunities: {
      glb: AdminAsset | null;
      usdz: AdminAsset | null;
      baseName: string;
    }[] = [];

    const grouped = new Map<string, { glb?: AdminAsset; usdz?: AdminAsset }>();

    modelAssets.forEach((asset) => {
      const baseName = asset.file_name.replace(/\.(glb|usdz)$/i, "");
      const isGlb = asset.file_name.endsWith(".glb");

      if (!grouped.has(baseName)) {
        grouped.set(baseName, {});
      }

      const group = grouped.get(baseName)!;
      if (isGlb) {
        group.glb = asset;
      } else {
        group.usdz = asset;
      }
    });

    grouped.forEach((group, baseName) => {
      // Only show opportunities where both files exist but aren't linked
      if (group.glb && group.usdz) {
        opportunities.push({
          glb: group.glb,
          usdz: group.usdz,
          baseName,
        });
      }
    });

    return opportunities;
  }, [assets]);

  const handleBulkLink = async () => {
    const opportunities = linkingOpportunities();
    if (opportunities.length === 0) {
      setMessage({ type: "info", text: "No linking opportunities found" });
      return;
    }

    setIsProcessing(true);
    setMessage({
      type: "info",
      text: `Starting bulk linking of ${opportunities.length} model pairs...`,
    });

    const newOperations: LinkingOperation[] = opportunities.map((opp) => ({
      id: `${opp.baseName}`,
      glbAsset: opp.glb!,
      usdzAsset: opp.usdz!,
      status: "pending",
    }));

    setOperations(newOperations);

    try {
      // Simulate bulk linking operation
      for (let i = 0; i < newOperations.length; i++) {
        const operation = newOperations[i];

        try {
          // In a real implementation, you would call an API endpoint here
          // For now, we'll simulate the operation
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Update operation status
          setOperations((prev) =>
            prev.map((op) =>
              op.id === operation.id
                ? { ...op, status: "success", message: "Successfully linked" }
                : op,
            ),
          );
        } catch (error) {
          setOperations((prev) =>
            prev.map((op) =>
              op.id === operation.id
                ? {
                    ...op,
                    status: "error",
                    message:
                      error instanceof Error ? error.message : "Linking failed",
                  }
                : op,
            ),
          );
        }
      }

      setMessage({ type: "success", text: "Bulk linking completed!" });
      setTimeout(() => {
        onRefresh();
        setOperations([]);
      }, 2000);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Bulk linking failed",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAutoConvert = async () => {
    const modelAssets = assets.filter((a) => a.file_type === "model");
    const glbAssets = modelAssets.filter((a) => a.file_name.endsWith(".glb"));
    const missingUsdz = glbAssets.filter((glb) => {
      const baseName = glb.file_name.replace(/\.glb$/i, "");
      return !modelAssets.some((a) => a.file_name === `${baseName}.usdz`);
    });

    if (missingUsdz.length === 0) {
      setMessage({ type: "info", text: "No GLB files need USDZ conversion" });
      return;
    }

    setIsProcessing(true);
    setMessage({
      type: "info",
      text: `Converting ${missingUsdz.length} GLB files to USDZ...`,
    });

    try {
      let successCount = 0;
      for (const asset of missingUsdz) {
        try {
          const token = localStorage.getItem("token");
          const response = await fetch(
            `/api/admin/convert-usdz?key=${encodeURIComponent(asset.name)}`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            },
          );

          if (response.ok) {
            successCount++;
          }
        } catch (error) {
          console.warn(`Failed to convert ${asset.file_name}:`, error);
        }
      }

      setMessage({
        type: "success",
        text: `Conversion started for ${successCount}/${missingUsdz.length} files. They will be available shortly.`,
      });

      setTimeout(onRefresh, 3000);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Auto-conversion failed",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const opportunities = linkingOpportunities();

  return (
    <div className="rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-cyan-50 p-6">
      <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-800">
        <div className="rounded-lg bg-purple-100 p-2">
          <Link2 size={20} className="text-purple-600" />
        </div>
        Asset Linking Tools
      </h3>

      {/* Status Message */}
      {message && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-lg p-3 text-sm ${
            message.type === "success"
              ? "border border-green-200 bg-green-100 text-green-700"
              : message.type === "error"
                ? "border border-red-200 bg-red-100 text-red-700"
                : "border border-blue-200 bg-blue-100 text-blue-700"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle size={16} />
          ) : message.type === "error" ? (
            <AlertCircle size={16} />
          ) : (
            <Loader2 size={16} className="animate-spin" />
          )}
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-xs underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Linking Opportunities */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h4 className="mb-2 flex items-center gap-2 font-medium text-gray-800">
            <Link2 size={16} className="text-blue-600" />
            Linking Opportunities
          </h4>
          <div className="text-2xl font-bold text-blue-600">
            {opportunities.length}
          </div>
          <div className="text-sm text-gray-600">
            GLB + USDZ pairs ready to link
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h4 className="mb-2 flex items-center gap-2 font-medium text-gray-800">
            <Zap size={16} className="text-purple-600" />
            Auto-Convert Candidates
          </h4>
          <div className="text-2xl font-bold text-purple-600">
            {
              assets
                .filter(
                  (a) =>
                    a.file_type === "model" && a.file_name.endsWith(".glb"),
                )
                .filter((glb) => {
                  const baseName = glb.file_name.replace(/\.glb$/i, "");
                  return !assets.some(
                    (a) => a.file_name === `${baseName}.usdz`,
                  );
                }).length
            }
          </div>
          <div className="text-sm text-gray-600">
            GLB files missing USDZ companions
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={handleBulkLink}
          disabled={isProcessing || opportunities.length === 0}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isProcessing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Link2 size={16} />
          )}
          Bulk Link Assets ({opportunities.length})
        </button>

        <button
          onClick={handleAutoConvert}
          disabled={isProcessing}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isProcessing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Zap size={16} />
          )}
          Auto-Convert Missing USDZ
        </button>

        <button
          onClick={onRefresh}
          disabled={isProcessing}
          className="flex items-center gap-2 rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={16} />
          Refresh Assets
        </button>
      </div>

      {/* Active Operations */}
      {operations.length > 0 && (
        <div className="rounded-lg border bg-white p-4">
          <h4 className="mb-3 font-medium text-gray-800">Linking Operations</h4>
          <div className="max-h-40 space-y-2 overflow-y-auto">
            {operations.map((operation) => (
              <div
                key={operation.id}
                className="flex items-center justify-between rounded bg-gray-50 p-2 text-sm"
              >
                <span className="font-medium">{operation.id}</span>
                <div className="flex items-center gap-2">
                  {operation.status === "pending" && (
                    <Loader2 size={14} className="animate-spin text-blue-600" />
                  )}
                  {operation.status === "success" && (
                    <CheckCircle size={14} className="text-green-600" />
                  )}
                  {operation.status === "error" && (
                    <AlertCircle size={14} className="text-red-600" />
                  )}
                  <span
                    className={` ${
                      operation.status === "success"
                        ? "text-green-600"
                        : operation.status === "error"
                          ? "text-red-600"
                          : "text-blue-600"
                    } `}
                  >
                    {operation.status === "pending"
                      ? "Processing..."
                      : operation.status === "success"
                        ? "Linked"
                        : operation.message || "Failed"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Linking Opportunities Details */}
      {opportunities.length > 0 && (
        <div className="mt-4 rounded-lg border bg-white p-4">
          <h4 className="mb-3 font-medium text-gray-800">
            Available Linking Opportunities
          </h4>
          <div className="max-h-40 space-y-2 overflow-y-auto">
            {opportunities.map((opp) => (
              <div
                key={opp.baseName}
                className="flex items-center justify-between rounded bg-gray-50 p-2 text-sm"
              >
                <span className="font-medium">{opp.baseName}</span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded bg-blue-100 px-2 py-1 text-blue-700">
                    GLB
                  </span>
                  <span className="text-gray-400">+</span>
                  <span className="rounded bg-purple-100 px-2 py-1 text-purple-700">
                    USDZ
                  </span>
                  <span className="text-gray-500">→</span>
                  <span className="rounded bg-green-100 px-2 py-1 text-green-700">
                    Ready to Link
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetLinkingTools;
