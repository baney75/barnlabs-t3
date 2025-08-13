"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, useGLTF } from "@react-three/drei";
import * as React from "react";
import { Suspense } from "react";
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
  return navigator.userAgent.includes('Android');
}

type ViewerBackground = "transparent" | "light" | "dark" | "studio" | "outdoor";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
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
        <group>
          {/* Empty fallback for 3D scene */}
        </group>
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
  const bgColor =
    background === "transparent"
      ? undefined
      : background === "light"
        ? "#f5f5f5"
        : "#000000";
  const stageEnv = background === "studio" ? "studio" : background === "outdoor" ? "city" : undefined;

  return (
    <div className="space-y-2">
      <div className="h-[360px] rounded-lg">
        <Canvas camera={{ position: [2.2, 1.2, 2.2], fov: 50 }}>
          {background !== "transparent" && <color attach="background" args={[bgColor!]} />}
          <ambientLight intensity={1.2} />
          <Stage intensity={0.3} environment={stageEnv}>
            <Suspense fallback={null}>
              <ErrorBoundary>
                <GLB src={src} />
              </ErrorBoundary>
            </Suspense>
          </Stage>
          <OrbitControls enablePan={false} />
        </Canvas>
      </div>
      <div className="flex flex-wrap gap-2">
        {(() => {
          const commonClass = "rounded-md bg-white px-3 py-1 text-sm text-black";
          if (isIOS()) {
            if (!usdz) {
              return (
                <span className="text-sm opacity-70">USDZ not available for AR on iOS</span>
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
        <a
          href={`/vr360.html?src=${encodeURIComponent(src)}`}
          target="_blank"
          className="rounded-md bg-white px-3 py-1 text-sm text-black"
        >
          View in VR
        </a>
      </div>
    </div>
  );
}
