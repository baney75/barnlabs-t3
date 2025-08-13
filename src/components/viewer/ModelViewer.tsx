"use client";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Stage,
  useGLTF,
  Html,
  useProgress,
  Bounds,
  useBounds,
} from "@react-three/drei";
import * as React from "react";
import { Suspense, useEffect } from "react";
// Relax types when local env lacks @types/three
type GLTFResult = { scene: object };
function GLB({ src }: { src: string }) {
  const result: GLTFResult = useGLTF(src) as unknown as GLTFResult;
  return <primitive object={result.scene} />;
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isAndroid() {
  if (typeof navigator === "undefined") return false;
  return navigator.userAgent.includes("Android");
}

type ViewerBackground = "transparent" | "light" | "dark" | "studio" | "outdoor";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onRetry?: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <>
          <group />
          <Html fullscreen>
            <div className="flex h-full w-full items-center justify-center bg-black/50">
              <div className="rounded-md bg-black/80 p-4 text-white">
                <div className="mb-2 text-sm">Failed to load model</div>
                <button
                  onClick={() => {
                    this.setState({ hasError: false });
                    this.props.onRetry?.();
                  }}
                  className="rounded bg-white/90 px-3 py-1 text-black"
                >
                  Retry
                </button>
              </div>
            </div>
          </Html>
        </>
      );
    }
    return this.props.children;
  }
}

export default function ModelViewer({
  src,
  usdz,
  title: _title,
  background = "dark",
}: {
  src: string;
  usdz?: string;
  title?: string;
  background?: ViewerBackground;
}) {
  const [envPreset, setEnvPreset] = React.useState<
    "studio" | "city" | "sunset" | "forest" | undefined
  >(
    background === "studio"
      ? "studio"
      : background === "outdoor"
        ? "city"
        : undefined,
  );
  const [autoRotate, setAutoRotate] = React.useState(true);
  const [reloadKey, setReloadKey] = React.useState(0);
  const bgColor =
    background === "transparent"
      ? undefined
      : background === "light"
        ? "#f5f5f5"
        : "#000000";
  const stageEnv = envPreset;

  function LoaderBar() {
    const { progress } = useProgress();
    const pct = Math.max(1, Math.round(progress));
    return (
      <Html fullscreen>
        <div className="flex h-full w-full items-center justify-center bg-black/50">
          <div className="w-56 rounded-md bg-black/80 p-4 text-white">
            <div className="h-2 w-full rounded bg-white/20">
              <div
                className="h-2 rounded bg-white"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-2 text-center text-xs">Loading {pct}%</div>
          </div>
        </div>
      </Html>
    );
  }

  function Toolbar({ onFit }: { onFit: () => void }) {
    return (
      <Html position={[0, 0, 0]} fullscreen>
        <div className="pointer-events-auto absolute top-3 right-3 flex gap-2">
          <button
            className="rounded bg-white/90 px-2 py-1 text-xs text-black"
            onClick={onFit}
            title="Fit to view"
          >
            Fit
          </button>
          <button
            className="rounded bg-white/90 px-2 py-1 text-xs text-black"
            onClick={() => setAutoRotate((v) => !v)}
            title="Toggle autorotate"
          >
            {autoRotate ? "Pause" : "Rotate"}
          </button>
          <select
            className="rounded bg-white/90 px-2 py-1 text-xs text-black"
            value={envPreset ?? "none"}
            onChange={(e) =>
              setEnvPreset(
                e.target.value === "none"
                  ? undefined
                  : (e.target.value as typeof envPreset),
              )
            }
            title="Environment"
          >
            <option value="none">Env: none</option>
            <option value="studio">Env: studio</option>
            <option value="city">Env: city</option>
            <option value="sunset">Env: sunset</option>
            <option value="forest">Env: forest</option>
          </select>
          <button
            className="rounded bg-white/90 px-2 py-1 text-xs text-black"
            onClick={() => setReloadKey((k) => k + 1)}
            title="Reload model"
          >
            Reload
          </button>
        </div>
      </Html>
    );
  }

  function FitButtonOverlay() {
    const api = useBounds();
    return <Toolbar onFit={() => api.refresh().fit()} />;
  }

  function AutoFit({ deps }: { deps: React.DependencyList }) {
    const api = useBounds();
    useEffect(() => {
      // Defer one tick to ensure geometry is ready
      const t = setTimeout(() => api.refresh().fit(), 0);
      return () => clearTimeout(t);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="h-[420px] rounded-lg">
        <Canvas
          camera={{ position: [2.2, 1.2, 2.2], fov: 50 }}
          dpr={[1, 2]}
          shadows
        >
          {background !== "transparent" && (
            <color attach="background" args={[bgColor!]} />
          )}
          <ambientLight intensity={0.8} />
          <Stage intensity={0.6} environment={stageEnv} shadows="contact">
            <Suspense fallback={<LoaderBar />}>
              <ErrorBoundary onRetry={() => setReloadKey((k) => k + 1)}>
                <Bounds fit clip observe margin={1.1}>
                  <AutoFit deps={[src, reloadKey]} />
                  <group key={reloadKey}>
                    <GLB src={src} />
                  </group>
                  <FitButtonOverlay />
                </Bounds>
              </ErrorBoundary>
            </Suspense>
          </Stage>
          <OrbitControls
            makeDefault
            enablePan={false}
            enableDamping
            dampingFactor={0.05}
            autoRotate={autoRotate}
            autoRotateSpeed={0.5}
          />
        </Canvas>
      </div>
      <div className="flex flex-wrap gap-2">
        {(() => {
          const commonClass =
            "rounded-md bg-white px-3 py-1 text-sm text-black";
          if (isIOS()) {
            if (!usdz) {
              return (
                <span className="text-sm opacity-70">
                  USDZ not available for AR on iOS
                </span>
              );
            }
            return (
              <a rel="ar" href={usdz} className={commonClass}>
                View in AR
              </a>
            );
          }
          if (isAndroid()) {
            const sceneViewer = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(src)}#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(src)};end;`;
            return (
              <a href={sceneViewer} className={commonClass}>
                View in AR
              </a>
            );
          }
          return (
            <a href={src} className={commonClass} download>
              Download Model
            </a>
          );
        })()}
        {(() => {
          const needsProxy = /^https?:\/\/t3rgh6yjwx\.ufs\.sh\//.test(src);
          const vrSrc = needsProxy
            ? `/api/models/proxy?url=${encodeURIComponent(src)}`
            : src;
          return (
            <a
              href={`/vr360.html?src=${encodeURIComponent(vrSrc)}`}
              target="_blank"
              className="rounded-md bg-white px-3 py-1 text-sm text-black"
            >
              View in VR
            </a>
          );
        })()}
      </div>
    </div>
  );
}
