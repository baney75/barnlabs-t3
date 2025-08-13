import React from "react";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  Sparkles,
  Info,
  Smartphone,
  Minimize2,
  Maximize2,
} from "lucide-react";

interface ControlPanelProps {
  autoRotateEnabled: boolean;
  setAutoRotateEnabled: (v: boolean) => void;
  dpr: number;
  setDpr: (v: number) => void;
  showInfo: boolean;
  setShowInfo: (v: boolean) => void;
  enableXR: boolean;
  showXRButtons: boolean;
  isARSupported: boolean;
  isVRSupported: boolean;
  xrStore: any | null;
  toggleFullscreen: () => void;
  isFullscreen: boolean;
  modelSrc?: string;
  usdzSrc?: string;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  autoRotateEnabled,
  setAutoRotateEnabled,
  dpr,
  setDpr,
  showInfo,
  setShowInfo,
  enableXR,
  showXRButtons,
  isARSupported,
  isVRSupported,
  xrStore,
  toggleFullscreen,
  isFullscreen,
  modelSrc,
  usdzSrc,
}) => {
  const logEvent = (event: string, detail?: unknown) => {
    try {
      if (typeof console !== "undefined" && console.log) {
        console.log(`[model-view] ${event}`, detail ?? "");
      }
      void fetch("/api/model-view/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, src: modelSrc, detail }),
      }).catch(() => {});
    } catch {}
  };

  // Enhanced AR button handler with iOS/Android fallbacks and USDZ checking
  const handleARView = async () => {
    logEvent("ar_attempt", {
      hasXR: !!(navigator as any).xr,
      modelSrc,
      usdzSrc,
    });
    const userAgent = navigator.userAgent;
    const toAbsolute = (url: string) =>
      url.startsWith("http") ? url : `${window.location.origin}${url}`;

    // Try WebXR first
    if (xrStore?.enterAR) {
      try {
        await xrStore.enterAR();
        logEvent("webxr_ar_enter_success");
        return;
      } catch (error) {
        console.warn("WebXR AR failed, trying fallback:", error);
        logEvent("webxr_ar_enter_error", String(error));
      }
    }

    // iOS Safari - use Quick Look with USDZ checking
    if (/iPad|iPhone|iPod/.test(userAgent)) {
      // Priority 1: Use provided usdzSrc if available
      if (usdzSrc) {
        const quickLookLink = document.createElement("a");
        quickLookLink.href = toAbsolute(usdzSrc);
        quickLookLink.rel = "ar";
        quickLookLink.style.display = "none";
        document.body.appendChild(quickLookLink);
        quickLookLink.click();
        document.body.removeChild(quickLookLink);
        logEvent("quicklook_open", { src: toAbsolute(usdzSrc) });
        return;
      }

      // Priority 2: Check if we have a model API endpoint
      if (
        modelSrc &&
        modelSrc.includes("/model/") &&
        !modelSrc.endsWith(".usdz")
      ) {
        // Extract the model key from the URL
        const modelKey = decodeURIComponent(modelSrc.split("/model/")[1]);

        try {
          // Check for USDZ availability via API
          const token = localStorage.getItem("token");
          const response = await fetch(
            `/api/user/asset/usdz?key=${encodeURIComponent(modelKey)}`,
            {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            },
          );

          const data = await response.json();

          if (data.success && data.usdzUrl) {
            // USDZ available - use Quick Look
            const quickLookLink = document.createElement("a");
            quickLookLink.href = toAbsolute(data.usdzUrl);
            quickLookLink.rel = "ar";
            quickLookLink.style.display = "none";
            document.body.appendChild(quickLookLink);
            quickLookLink.click();
            document.body.removeChild(quickLookLink);
            logEvent("quicklook_open", { src: toAbsolute(data.usdzUrl) });
            return;
          } else if (data.requiresManualUpload) {
            // Show detailed upload instructions
            const message =
              data.fileSize > 100 * 1024 * 1024
                ? `🔄 iOS AR Requires USDZ File\n\nYour model (${data.fileSizeMB}MB) is too large for auto-conversion.\n\nTo enable iOS AR:\n1. Convert "${data.baseName}.glb" to USDZ using Reality Converter (macOS)\n2. Upload the USDZ file named exactly: "${data.baseName}.usdz"\n3. Files will auto-link for seamless AR support\n\n💡 Tip: Keep USDZ files under 50MB for best performance`
                : `📱 iOS AR Requires USDZ File\n\nTo enable iOS AR support:\n1. Convert your model to USDZ format\n2. Upload as: "${data.baseName}.usdz"\n3. Files will automatically link together\n\n🛠️ Use Reality Converter (macOS) or online USDZ converters`;

            const shouldProceed = confirm(
              message + "\n\nContinue anyway? (AR won't work optimally)",
            );
            if (!shouldProceed) return;
          }
        } catch (apiError) {
          console.warn("USDZ check failed:", apiError);
          logEvent("quicklook_check_error", String(apiError));
        }
      }

      // Fallback: try direct USDZ URL replacement
      const candidate = (modelSrc || "")
        .replace(".glb", ".usdz")
        .replace(".gltf", ".usdz");
      const usdzUrl = candidate ? toAbsolute(candidate) : "";

      const quickLookLink = document.createElement("a");
      quickLookLink.href = usdzUrl;
      quickLookLink.rel = "ar";
      quickLookLink.style.display = "none";
      document.body.appendChild(quickLookLink);
      quickLookLink.click();
      document.body.removeChild(quickLookLink);
      logEvent("quicklook_open_fallback", { src: usdzUrl });
      return;
    }

    // Android Chrome - open in Scene Viewer (use signed URL if needed)
    if (/Android/.test(userAgent) && /Chrome/.test(userAgent) && modelSrc) {
      try {
        const toAbs = (u: string) =>
          u.startsWith("http") ? u : `${window.location.origin}${u}`;
        let arModelUrl = modelSrc;
        if (modelSrc.includes("/model/")) {
          const modelKey = decodeURIComponent(modelSrc.split("/model/")[1]);
          const token = localStorage.getItem("token");
          const res = await fetch(
            `/api/user/asset/signed-url?key=${encodeURIComponent(modelKey)}`,
            { headers: token ? { Authorization: `Bearer ${token}` } : {} },
          );
          if (res.ok) {
            const data = await res.json();
            if (data?.url) arModelUrl = data.url;
          }
        }

        // Prefer Scene Viewer intent; if blocked, fall back to opening the file URL
        const sceneViewerUrl = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(toAbs(arModelUrl))}&mode=ar_only#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(window.location.href)};end;`;
        // Attempt to navigate via assigning location (more compatible than window.open in some contexts)
        window.location.assign(sceneViewerUrl);
        logEvent("scene_viewer_intent", { url: sceneViewerUrl });
      } catch (err) {
        console.warn("Android AR fallback failed:", err);
        logEvent("scene_viewer_intent_error", String(err));
        // As a last resort, try opening the model URL directly
        try {
          if (modelSrc) window.open(toAbsolute(modelSrc), "_blank");
        } catch {}
      }
      return;
    }

    // Fallback - show helpful message
    alert(
      "AR viewing is not supported on this device. Please try on an iOS device with Safari or Android device with Chrome.",
    );
    logEvent("ar_not_supported");
  };

  // Enhanced VR button handler without Cardboard; prefer WebXR, fallback to 360 view
  const handleVRView = async () => {
    logEvent("vr_attempt", { hasXR: !!(navigator as any).xr, modelSrc });
    const userAgent = navigator.userAgent;

    // Resolve model URL (use signed URL for protected /model/* paths)
    let resolvedModelUrl = modelSrc || "";
    try {
      if (modelSrc && modelSrc.includes("/model/")) {
        const modelKey = decodeURIComponent(modelSrc.split("/model/")[1]);
        const token = localStorage.getItem("token");
        const res = await fetch(
          `/api/user/asset/signed-url?key=${encodeURIComponent(modelKey)}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.url) resolvedModelUrl = data.url;
        }
      }
    } catch (e) {
      console.warn("Failed to resolve signed URL for VR:", e);
    }

    // Try WebXR first for native VR
    if (xrStore?.enterVR) {
      try {
        await xrStore.enterVR();
        logEvent("webxr_vr_enter_success");
        return;
      } catch (error) {
        console.warn("WebXR VR failed, trying fallback:", error);
        logEvent("webxr_vr_enter_error", String(error));
      }
    }

    // Check for Oculus browser (native VR support)
    if (/OculusBrowser/.test(userAgent)) {
      // Oculus devices should use native WebXR
      if (xrStore?.enterVR) {
        await xrStore.enterVR();
      }
      logEvent("oculus_vr_native");
      return;
    }

    // Mobile fallback: open 360° VR page (gyro/orientation)
    if (/Android|iPhone|iPad/.test(userAgent)) {
      const vr360Url = `${window.location.origin}/vr360.html?model=${encodeURIComponent(
        resolvedModelUrl,
      )}`;
      const vrWindow = window.open(
        vr360Url,
        "_blank",
        "fullscreen=yes,scrollbars=no,menubar=no,toolbar=no,location=no,status=no",
      );
      if (vrWindow) {
        logEvent("vr360_open", { url: vr360Url });
      } else {
        alert("Please allow popups for VR viewing.");
        logEvent("vr360_popup_blocked");
      }
      return;
    }

    // Desktop fallback
    alert(
      "VR viewing requires a VR headset. For mobile devices, use a modern smartphone with device orientation sensors.",
    );
    logEvent("vr_not_supported_desktop");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="absolute bottom-2 left-1/2 max-w-[calc(100vw-1rem)] -translate-x-1/2 transform overflow-hidden rounded-xl border border-gray-700/50 bg-gradient-to-r from-gray-900/95 to-gray-800/95 p-1.5 shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-purple-500/30 sm:max-w-[calc(100vw-2rem)] sm:rounded-2xl sm:p-4"
    >
      {/* Mobile-optimized layout that prevents overflow */}
      <div
        className="flex items-center justify-center gap-1 sm:gap-3"
        style={{
          // Force horizontal scrolling container with custom scrollbar
          overflowX: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <style>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setAutoRotateEnabled(!autoRotateEnabled)}
          className={`flex flex-shrink-0 items-center gap-1 rounded-lg p-1.5 text-xs transition-all duration-200 sm:gap-2 sm:rounded-xl sm:p-3 sm:text-sm ${
            autoRotateEnabled
              ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg hover:from-cyan-700 hover:to-blue-700"
              : "bg-gray-700/80 text-gray-300 hover:bg-gray-600/80 hover:text-white"
          }`}
          title={autoRotateEnabled ? "Pause rotation" : "Play rotation"}
          aria-label="Toggle auto rotate"
        >
          {autoRotateEnabled ? (
            <Pause size={14} className="sm:h-[18px] sm:w-[18px]" />
          ) : (
            <Play size={14} className="sm:h-[18px] sm:w-[18px]" />
          )}
          <span className="hidden font-medium sm:inline">
            {autoRotateEnabled ? "Pause" : "Rotate"}
          </span>
        </motion.button>

        <div className="h-6 w-px bg-gray-700 sm:h-8" />

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setDpr(dpr === 1 ? 1.5 : dpr === 1.5 ? 2 : 1)}
          className="flex flex-shrink-0 items-center gap-1 rounded-lg bg-gray-700/80 p-1.5 text-xs text-gray-300 transition-all duration-200 hover:bg-gray-600/80 hover:text-white sm:gap-2 sm:rounded-xl sm:p-3 sm:text-sm"
          title={`Quality: ${dpr === 1 ? "Standard" : dpr === 1.5 ? "High" : "Ultra"}`}
          aria-label="Toggle quality"
        >
          <Sparkles size={14} className="sm:h-[18px] sm:w-[18px]" />
          <span className="hidden font-medium sm:inline">
            {dpr === 1 ? "SD" : dpr === 1.5 ? "HD" : "UHD"}
          </span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowInfo(!showInfo)}
          className={`flex flex-shrink-0 items-center gap-1 rounded-lg p-1.5 text-xs transition-all duration-200 sm:gap-2 sm:rounded-xl sm:p-3 sm:text-sm ${
            showInfo
              ? "bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg"
              : "bg-gray-700/80 text-gray-300 hover:bg-gray-600/80 hover:text-white"
          }`}
          title="Model info"
          aria-label="Toggle model info"
        >
          <Info size={14} className="sm:h-[18px] sm:w-[18px]" />
          <span className="hidden font-medium sm:inline">Info</span>
        </motion.button>

        <div className="h-6 w-px bg-gray-700 sm:h-8" />

        {enableXR && showXRButtons && (
          <>
            {isARSupported && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleARView}
                className="flex flex-shrink-0 items-center gap-1 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 p-1.5 text-xs text-white shadow-lg transition-all hover:from-purple-700 hover:to-pink-700 sm:gap-2 sm:p-2.5 sm:text-sm"
                title="View in AR"
                aria-label="Enter AR"
              >
                <Smartphone size={14} className="sm:h-[18px] sm:w-[18px]" />
                <span className="hidden font-medium sm:inline">AR</span>
              </motion.button>
            )}
            {isVRSupported && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleVRView}
                className="flex flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg transition-all hover:from-blue-700 hover:to-cyan-700 sm:px-3 sm:py-2 sm:text-sm"
                title="View in VR"
                aria-label="Enter VR"
              >
                <span>VR</span>
              </motion.button>
            )}
            <div className="h-6 w-px bg-gray-700 sm:h-8" />
          </>
        )}

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleFullscreen}
          className="flex flex-shrink-0 items-center gap-1 rounded-lg bg-gray-700/80 p-1.5 text-xs text-gray-300 transition-all duration-200 hover:bg-gray-600/80 hover:text-white sm:gap-2 sm:rounded-xl sm:p-3 sm:text-sm"
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          aria-label="Toggle fullscreen"
        >
          {isFullscreen ? (
            <Minimize2 size={14} className="sm:h-[18px] sm:w-[18px]" />
          ) : (
            <Maximize2 size={14} className="sm:h-[18px] sm:w-[18px]" />
          )}
          <span className="hidden font-medium sm:inline">
            {isFullscreen ? "Exit" : "Full"}
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ControlPanel;
