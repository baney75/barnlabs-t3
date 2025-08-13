// src/components/SimpleModelViewer.tsx - Enhanced 3D model viewer with XR support
import React, {
  Suspense,
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
  memo,
} from "react";
import { Canvas } from "@react-three/fiber";
import {
  useGLTF,
  OrbitControls,
  Environment,
  Center,
  Html,
  useProgress,
  Bounds,
  useBounds,
  Preload,
  AdaptiveDpr,
  AdaptiveEvents,
  PerformanceMonitor,
} from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { XR, createXRStore } from "@react-three/xr";
import type { Group } from "three";
import * as THREE from "three";
import { RotateCcw, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
// Use DRACO loader from three-stdlib to match drei's loader types
import { DRACOLoader } from "three-stdlib";
import type { GLTF } from "three-stdlib";
import ControlPanel from "./model-viewer/ControlPanel";
import InfoOverlay from "./model-viewer/InfoOverlay";

interface SimpleModelViewerProps {
  src: string;
  usdzSrc?: string;
  style?: React.CSSProperties;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  environment?:
    | "apartment"
    | "city"
    | "dawn"
    | "forest"
    | "lobby"
    | "night"
    | "park"
    | "studio"
    | "sunset"
    | "warehouse";
  cameraPosition?: [number, number, number];
  scale?: number | [number, number, number];
  enableXR?: boolean;
  showXRButtons?: boolean;
  minDistance?: number;
  maxDistance?: number;
  onError?: (error: Error) => void;
  enableShadows?: boolean;
  enablePostProcessing?: boolean;
}

// Lightweight loader that does **not** use any R3F hooks – safe to render outside <Canvas>
function BasicLoader() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-purple-500/20 bg-gradient-to-br from-gray-900/95 to-gray-800/95 p-8 shadow-2xl backdrop-blur-md">
      <div className="relative">
        <Loader2 className="mx-auto mb-4 h-16 w-16 animate-spin text-purple-400" />
        <div className="absolute inset-0 mx-auto h-16 w-16 animate-pulse rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20" />
      </div>
      <h3 className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-xl font-semibold text-transparent">
        Preparing model…
      </h3>
      <p className="mt-2 text-sm text-gray-400">Initializing 3D workspace</p>
    </div>
  );
}

// Enhanced loading component with professional progress
function LoadingProgress() {
  const { progress } = useProgress();

  return (
    <Html center>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-gray-900/95 to-gray-800/95 p-8 text-center shadow-2xl backdrop-blur-md"
      >
        <div className="relative mb-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="mx-auto h-20 w-20"
          >
            <div className="h-full w-full rounded-full border-4 border-gray-700 border-t-purple-500 border-r-cyan-500" />
          </motion.div>
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-500/30 to-cyan-500/30"
            />
          </div>
        </div>

        <h3 className="mb-3 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-xl font-semibold text-transparent">
          Loading 3D Model
        </h3>

        {progress > 0 && progress < 100 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-72"
          >
            <div className="relative mb-3">
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-800 shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="relative h-full rounded-full bg-gradient-to-r from-purple-500 via-purple-400 to-cyan-500"
                >
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-white/20 to-transparent" />
                  <motion.div
                    animate={{ x: [-20, 200] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute top-0 left-0 h-full w-5 skew-x-12 bg-white/30"
                  />
                </motion.div>
              </div>
              <div className="mt-1 flex justify-between text-xs text-gray-400">
                <span>Loading assets...</span>
                <span className="font-medium text-purple-400">
                  {progress.toFixed(0)}%
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {!progress && (
          <motion.p
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-sm text-gray-400"
          >
            Initializing renderer...
          </motion.p>
        )}

        <div className="mt-4 text-xs text-gray-500">
          Preparing immersive 3D experience
        </div>
      </motion.div>
    </Html>
  );
}

// Texture optimization without R3F hooks to avoid context issues
function TextureOptimizer({ gltf }: { gltf: GLTF | null }) {
  useEffect(() => {
    if (!gltf) return;
    gltf.scene.traverse((child) => {
      const mesh = child as unknown as THREE.Mesh;
      if ((mesh as { isMesh?: boolean }).isMesh && mesh.material) {
        const material = mesh.material as THREE.MeshStandardMaterial;
        if (material.map) {
          // Use a conservative anisotropy value that improves quality without requiring renderer caps
          material.map.anisotropy = 8;
        }
      }
    });
  }, [gltf]);
  return null;
}

// Combined model component that handles loading and optimization
const ModelWithOptimization = memo(
  ({
    url,
    scale,
    onLoad,
    onModelStats,
  }: {
    url: string;
    scale: number | [number, number, number];
    onLoad?: () => void;
    onModelStats?: (stats: { vertices: number; faces: number }) => void;
  }) => {
    const groupRef = useRef<Group>(null);

    // Load model with error handling and retry logic
    const gltf = useGLTF(url, false, false, (loader) => {
      // Add draco decoder for compressed models using CDN decoders
      const dracoLoader = new DRACOLoader();
      // Use versioned Google CDN path to avoid bundling decoder files
      dracoLoader.setDecoderPath(
        "https://www.gstatic.com/draco/versioned/decoders/1.5.7/",
      );
      loader.setDRACOLoader(dracoLoader);
    });

    useEffect(() => {
      if (!gltf) return;
      onLoad?.();
      // Compute simple mesh stats
      let vertices = 0;
      let faces = 0;
      gltf.scene.traverse((child) => {
        const mesh = child as unknown as THREE.Mesh;
        const geom = mesh.geometry as THREE.BufferGeometry | undefined;
        if ((mesh as { isMesh?: boolean }).isMesh && geom) {
          const pos = geom.getAttribute("position");
          if (pos) {
            vertices += pos.count;
            faces += Math.floor(pos.count / 3);
          }
        }
      });
      onModelStats?.({ vertices, faces });
    }, [gltf, onLoad, onModelStats]);

    // Enable shadows on the model
    useEffect(() => {
      if (gltf) {
        gltf.scene.traverse((child) => {
          const mesh = child as unknown as THREE.Mesh;
          if ((mesh as { isMesh?: boolean }).isMesh) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });
      }
    }, [gltf]);

    return (
      <>
        <group ref={groupRef} scale={scale}>
          <primitive object={gltf.scene} />
        </group>
        <TextureOptimizer gltf={gltf} />
      </>
    );
  },
);

ModelWithOptimization.displayName = "ModelWithOptimization";

// Auto-rotating wrapper with smooth animation
function AutoRotatingModel({
  children,
  speed = 0.5,
  enabled = true,
}: {
  children: React.ReactNode;
  speed?: number;
  enabled?: boolean;
}) {
  const groupRef = useRef<Group>(null);

  useFrame((_state, delta) => {
    if (groupRef.current && enabled) {
      groupRef.current.rotation.y += delta * speed;
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

// Enhanced bounds component for better camera controls
function BoundsWithReset({ children }: { children: React.ReactNode }) {
  const bounds = useBounds();

  const handleReset = useCallback(() => {
    bounds.refresh().clip().fit();
  }, [bounds]);

  useEffect(() => {
    const timer = setTimeout(handleReset, 100);
    return () => clearTimeout(timer);
  }, [handleReset]);

  return (
    <>
      {children}
      <Html position={[0, 0, 0]}>
        <button
          onClick={handleReset}
          className="fixed right-4 bottom-4 rounded-lg bg-blue-600 p-2 text-white opacity-0 transition-colors hover:bg-blue-700"
          aria-label="Reset camera"
        >
          <RotateCcw size={20} />
        </button>
      </Html>
    </>
  );
}

// Error boundary omitted in this build

// Removed Google Scene Viewer / Quick Look fallback to rely on pure WebXR only

const SimpleModelViewer: React.FC<SimpleModelViewerProps> = ({
  src,
  usdzSrc,
  style = { width: "100%", height: "400px" },
  autoRotate = false,
  autoRotateSpeed = 0.5,
  environment = "warehouse",
  cameraPosition = [0, 0, 5],
  scale = 1,
  enableXR = true,
  showXRButtons = true,
  minDistance = 1,
  maxDistance = 20,
  // optional error handler for parent consumers
  onError: _onError,
  enableShadows = true,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [autoRotateEnabled, setAutoRotateEnabled] = useState(autoRotate);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isARSupported, setIsARSupported] = useState(false);
  const [isVRSupported, setIsVRSupported] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [dpr, setDpr] = useState(1.5);
  const [showInfo, setShowInfo] = useState(false);
  const [modelInfo, setModelInfo] = useState<{
    vertices: number;
    faces: number;
    size: string;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Create XR store for AR/VR
  const xrStore = useMemo(
    () => (enableXR ? createXRStore() : null),
    [enableXR],
  );

  // Detect AR/VR support on mount
  useEffect(() => {
    const detectXRSupport = async () => {
      try {
        if (navigator.xr) {
          // Check AR support
          const isARSupported =
            await navigator.xr.isSessionSupported("immersive-ar");
          setIsARSupported(isARSupported);

          // Check VR support
          const isVRSupported =
            await navigator.xr.isSessionSupported("immersive-vr");
          setIsVRSupported(isVRSupported);
        } else {
          // Fallback: Enable AR/VR buttons for all devices to allow testing
          setIsARSupported(true); // Enable for all to allow testing
          setIsVRSupported(true); // Enable for all to allow testing
        }
      } catch (error) {
        console.warn("XR detection failed, enabling mobile fallbacks:", error);

        // Enable for all devices as fallback
        setIsARSupported(true);
        setIsVRSupported(true);
      }
    };

    if (enableXR) {
      detectXRSupport();
    }
  }, [enableXR]);

  // Resolve and validate URL with authentication and normalize admin/public hosts
  const resolvedUrl = useMemo(() => {
    try {
      if (!src) throw new Error("No model source provided");

      // Handle different URL formats
      if (src.startsWith("blob:") || src.startsWith("data:")) {
        return src;
      }

      // Handle special local hero asset path reliably
      if (src.startsWith("/Hero-Assets/")) {
        // Served from __STATIC_CONTENT in worker; keep absolute path
        return src;
      }
      // Generic relative paths ("/foo.glb")
      if (src.startsWith("/")) return src;

      // Normalize admin/public bucket hosts to configured PUBLIC_BUCKET_BASE_URL
      if (src.includes("r2.cloudflarestorage.com")) {
        const publicBase = (window as any).__PUBLIC_BUCKET_BASE_URL__ || "";
        if (publicBase) {
          try {
            const u = new URL(src);
            const mapped = new URL(publicBase);
            u.host = mapped.host;
            u.protocol = mapped.protocol;
            return u.toString();
          } catch {}
        }
      }
      // Proxy allowed bucket host(s) to avoid CORS/content-type mismatches
      if (src.includes("bucket1.barnlabs.net")) {
        return `/api/proxy-model?url=${encodeURIComponent(src)}`;
      }

      // Ensure absolute URL for anything else
      const url = new URL(src, window.location.origin);
      return url.href;
    } catch {
      setErrorMessage(`Invalid model URL: ${src}`);
      setHasError(true);
      return null;
    }
  }, [src]);

  // Get signed URL for authenticated access
  useEffect(() => {
    if (!resolvedUrl) {
      return;
    }

    // For local assets (like /Hero-Assets/Earth_Model.glb), use them directly
    if (resolvedUrl.startsWith("/") && !resolvedUrl.includes("/model/")) {
      setSignedUrl(resolvedUrl);
      return;
    }

    // For blob and data URLs, use them directly
    if (resolvedUrl.startsWith("blob:") || resolvedUrl.startsWith("data:")) {
      setSignedUrl(resolvedUrl);
      return;
    }

    // Only try to get signed URLs for /model/ endpoints
    if (resolvedUrl.includes("/model/")) {
      const getSignedUrl = async () => {
        try {
          const url = new URL(resolvedUrl, window.location.origin);
          const keyMatch = url.pathname.match(/\/model\/(.+)/);
          if (!keyMatch) {
            setSignedUrl(resolvedUrl);
            return;
          }

          const key = decodeURIComponent(keyMatch[1]);
          const token = localStorage.getItem("token");

          if (!token) {
            // Try to use the URL as-is for public access
            setSignedUrl(resolvedUrl);
            return;
          }

          const response = await fetch(
            `/api/user/asset/signed-url?key=${encodeURIComponent(key)}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );

          if (response.ok) {
            const data = (await response.json()) as { url?: string };
            if (data.url) {
              setSignedUrl(data.url);
            } else {
              console.warn("No signed URL returned, using original");
              setSignedUrl(resolvedUrl);
            }
          } else if (response.status === 401 || response.status === 403) {
            console.error(
              "Authentication failed for model access:",
              response.status,
            );
            setErrorMessage("Access denied. Please log in to view this model.");
            setHasError(true);
            return;
          } else if (response.status === 404) {
            console.error("Model not found:", key);
            setErrorMessage("Model not found. It may have been removed.");
            setHasError(true);
            return;
          } else {
            console.warn(
              `Signed URL request failed: ${response.status}, using original URL`,
            );
            setSignedUrl(resolvedUrl);
          }
        } catch (error) {
          console.error("Failed to get signed URL:", error);

          // For network errors, try to use the model directly if it's a valid URL
          if (error instanceof Error && error.message.includes("fetch")) {
            console.warn("Network error, attempting direct model access");
            setSignedUrl(resolvedUrl);
          } else {
            setErrorMessage(
              "Failed to authenticate model access. Please check your connection and try again.",
            );
            setHasError(true);
          }
        }
      };

      getSignedUrl();
    } else {
      setSignedUrl(resolvedUrl);
    }
  }, [resolvedUrl]);

  // Resolve iOS Quick Look USDZ if available
  useEffect(() => {
    if (!signedUrl) return;
    try {
      const url = new URL(signedUrl, window.location.origin);
      const match = url.pathname.match(/\/model\/(.+)$/);
      const key = match ? decodeURIComponent(match[1]) : null;
      // Only attempt for GLB keys served via /model/
      if (key && key.endsWith(".glb")) {
        const token = localStorage.getItem("token");
        fetch(`/api/user/asset/usdz?key=${encodeURIComponent(key)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
          .then(async (res) => {
            if (res.status === 200) {
              await res.json();
            }
          })
          .catch(() => {});
      } else {
        // ignore
      }
    } catch {
      // ignore
    }
  }, [signedUrl]);

  // Enhanced XR support detection for iOS and Android
  useEffect(() => {
    if (enableXR && xrStore && typeof navigator !== "undefined") {
      const checkXRSupport = async () => {
        try {
          // Check for WebXR support
          if ("xr" in navigator && navigator.xr) {
            // Check AR support with mobile-specific requirements
            try {
              const arSupported =
                await navigator.xr.isSessionSupported("immersive-ar");
              setIsARSupported(arSupported);

              // For iOS Safari, also check for QuickLook support as fallback
              if (
                !arSupported &&
                /iPad|iPhone|iPod/.test(navigator.userAgent)
              ) {
                // iOS Safari QuickLook fallback detection
                const supportsQuickLook = document
                  .createElement("a")
                  .relList?.supports?.("ar");
                setIsARSupported(supportsQuickLook || false);
              }
            } catch (error) {
              console.warn("AR support check failed:", error);
              setIsARSupported(false);
            }

            // Check VR support
            try {
              const vrSupported =
                await navigator.xr.isSessionSupported("immersive-vr");
              setIsVRSupported(vrSupported);
            } catch (error) {
              console.warn("VR support check failed:", error);
              setIsVRSupported(false);
            }
          } else {
            // No WebXR - check for iOS QuickLook as AR fallback
            if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
              const supportsQuickLook = document
                .createElement("a")
                .relList?.supports?.("ar");
              setIsARSupported(supportsQuickLook || false);
            }

            // Android Chrome WebXR Origin Trial check
            if (
              /Android/.test(navigator.userAgent) &&
              /Chrome/.test(navigator.userAgent)
            ) {
              // Check if the page is served over HTTPS (required for WebXR)
              const isSecure =
                location.protocol === "https:" ||
                location.hostname === "localhost";
              if (isSecure) {
                // Enable a basic AR fallback for Android Chrome
                setIsARSupported(true);
              }
            }
          }
        } catch (error) {
          console.error("XR support detection failed:", error);
          setIsARSupported(false);
          setIsVRSupported(false);
        }
      };

      checkXRSupport();
    }
  }, [enableXR, xrStore]);

  // Enhanced fullscreen toggle with better browser support
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if (
          (
            containerRef.current as unknown as {
              webkitRequestFullscreen?: () => Promise<void>;
            }
          ).webkitRequestFullscreen
        ) {
          await (
            containerRef.current as unknown as {
              webkitRequestFullscreen: () => Promise<void>;
            }
          ).webkitRequestFullscreen();
        } else if (
          (
            containerRef.current as unknown as {
              msRequestFullscreen?: () => Promise<void>;
            }
          ).msRequestFullscreen
        ) {
          await (
            containerRef.current as unknown as {
              msRequestFullscreen: () => Promise<void>;
            }
          ).msRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (
          (
            document as unknown as {
              webkitExitFullscreen?: () => Promise<void>;
            }
          ).webkitExitFullscreen
        ) {
          await (
            document as unknown as { webkitExitFullscreen: () => Promise<void> }
          ).webkitExitFullscreen();
        } else if (
          (document as unknown as { msExitFullscreen?: () => Promise<void> })
            .msExitFullscreen
        ) {
          await (
            document as unknown as { msExitFullscreen: () => Promise<void> }
          ).msExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  }, [isFullscreen]);

  // Handle model load completion
  const handleModelLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    setRetryCount(0);
  }, []);

  // handler extracted or unused, remove

  if (hasError) {
    return (
      <div
        style={style}
        className="relative flex items-center justify-center overflow-hidden rounded-xl border border-red-500/20 bg-gradient-to-br from-gray-900 to-gray-800"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="p-8 text-center"
        >
          <div className="relative mb-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-red-500/20 to-orange-500/20">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            <div className="absolute inset-0 mx-auto h-16 w-16 animate-ping rounded-full bg-red-500/10" />
          </div>

          <h3 className="mb-3 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-xl font-semibold text-transparent">
            Failed to Load Model
          </h3>

          <p className="mb-6 max-w-sm text-sm text-gray-300">
            {errorMessage ||
              "Unable to load the 3D model. Please check your connection and try again."}
          </p>

          {retryCount < 2 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setHasError(false);
                setRetryCount((prev) => prev + 1);
              }}
              className="btn btn-accent btn-md group"
            >
              <RefreshCw className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
              Retry Loading
            </motion.button>
          )}

          {retryCount >= 2 && (
            <div className="text-sm text-gray-500">
              Unable to load after multiple attempts
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div
        style={style}
        className="relative flex items-center justify-center overflow-hidden rounded-xl bg-gray-900"
      >
        <BasicLoader />
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        style={style}
        className="group relative overflow-hidden rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-2xl transition-all duration-300 hover:border-purple-500/30"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <Canvas
          shadows={enableShadows}
          dpr={dpr}
          camera={{
            position: cameraPosition as [number, number, number],
            fov: 50,
          }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            preserveDrawingBuffer: true,
          }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.2;
          }}
        >
          <Suspense fallback={<LoadingProgress />}>
            {enableXR && xrStore ? (
              <XR store={xrStore}>
                {/* Performance monitoring */}
                <PerformanceMonitor
                  onDecline={() => setDpr(1)}
                  onIncline={() => setDpr(Math.min(2, window.devicePixelRatio))}
                />

                {/* Adaptive quality */}
                <AdaptiveDpr pixelated />
                <AdaptiveEvents />

                {/* Lighting setup */}
                <ambientLight intensity={0.5} />
                <directionalLight
                  position={[10, 10, 5]}
                  intensity={1}
                  castShadow={enableShadows}
                  shadow-mapSize={[2048, 2048]}
                />
                <pointLight position={[-10, -10, -10]} intensity={0.5} />

                {/* Environment */}
                <Environment preset={environment} background={false} />

                {/* Model with bounds */}
                <Bounds fit clip observe margin={1.2}>
                  <BoundsWithReset>
                    <Center>
                      <AutoRotatingModel
                        speed={autoRotateSpeed}
                        enabled={autoRotateEnabled}
                      >
                        <ModelWithOptimization
                          url={signedUrl}
                          scale={scale}
                          onLoad={handleModelLoad}
                          onModelStats={(stats) =>
                            setModelInfo((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    vertices: stats.vertices,
                                    faces: stats.faces,
                                  }
                                : {
                                    vertices: stats.vertices,
                                    faces: stats.faces,
                                    size: "unknown",
                                  },
                            )
                          }
                        />
                      </AutoRotatingModel>
                    </Center>
                  </BoundsWithReset>
                </Bounds>

                {/* Camera controls */}
                <OrbitControls
                  makeDefault
                  minDistance={minDistance}
                  maxDistance={maxDistance}
                  enablePan={true}
                  enableZoom={true}
                  enableRotate={true}
                  zoomSpeed={0.5}
                  panSpeed={0.5}
                  rotateSpeed={0.5}
                  enableDamping
                  dampingFactor={0.05}
                />

                {/* Preload assets */}
                <Preload all />
              </XR>
            ) : (
              <>
                {/* Performance monitoring */}
                <PerformanceMonitor
                  onDecline={() => setDpr(1)}
                  onIncline={() => setDpr(Math.min(2, window.devicePixelRatio))}
                />

                {/* Adaptive quality */}
                <AdaptiveDpr pixelated />
                <AdaptiveEvents />

                {/* Lighting setup */}
                <ambientLight intensity={0.5} />
                <directionalLight
                  position={[10, 10, 5]}
                  intensity={1}
                  castShadow={enableShadows}
                  shadow-mapSize={[2048, 2048]}
                />
                <pointLight position={[-10, -10, -10]} intensity={0.5} />

                {/* Environment */}
                <Environment preset={environment} background={false} />

                {/* Model with bounds */}
                <Bounds fit clip observe margin={1.2}>
                  <BoundsWithReset>
                    <Center>
                      <AutoRotatingModel
                        speed={autoRotateSpeed}
                        enabled={autoRotateEnabled}
                      >
                        <ModelWithOptimization
                          url={signedUrl}
                          scale={scale}
                          onLoad={handleModelLoad}
                          onModelStats={(stats) =>
                            setModelInfo((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    vertices: stats.vertices,
                                    faces: stats.faces,
                                  }
                                : {
                                    vertices: stats.vertices,
                                    faces: stats.faces,
                                    size: "unknown",
                                  },
                            )
                          }
                        />
                      </AutoRotatingModel>
                    </Center>
                  </BoundsWithReset>
                </Bounds>

                {/* Camera controls */}
                <OrbitControls
                  makeDefault
                  minDistance={minDistance}
                  maxDistance={maxDistance}
                  enablePan={true}
                  enableZoom={true}
                  enableRotate={true}
                  zoomSpeed={0.5}
                  panSpeed={0.5}
                  rotateSpeed={0.5}
                  enableDamping
                  dampingFactor={0.05}
                />

                {/* Preload assets */}
                <Preload all />
              </>
            )}
          </Suspense>
        </Canvas>

        {/* UI Overlays */}
        <AnimatePresence>
          {showControls && !isLoading && (
            <ControlPanel
              autoRotateEnabled={autoRotateEnabled}
              setAutoRotateEnabled={setAutoRotateEnabled}
              dpr={dpr}
              setDpr={setDpr}
              showInfo={showInfo}
              setShowInfo={setShowInfo}
              enableXR={enableXR}
              showXRButtons={showXRButtons}
              isARSupported={isARSupported}
              isVRSupported={isVRSupported}
              xrStore={xrStore}
              toggleFullscreen={toggleFullscreen}
              isFullscreen={isFullscreen}
              modelSrc={signedUrl || src}
              usdzSrc={usdzSrc}
            />
          )}
          {showInfo && (
            <InfoOverlay
              dpr={dpr}
              environment={environment}
              autoRotateEnabled={autoRotateEnabled}
              modelInfo={modelInfo}
              setShowInfo={setShowInfo}
            />
          )}
        </AnimatePresence>

        {/* Enhanced loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-md"
          >
            <BasicLoader />
          </motion.div>
        )}
      </div>
    </>
  );
};

// Cleanup function for hot module replacement
// Guard hot dispose for environments that may not support it fully
// HMR cleanup removed for lint compatibility in this build

export default SimpleModelViewer;
