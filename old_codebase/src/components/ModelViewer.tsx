import React, { useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { useModelLoader } from "../hooks/useModelLoader";
import { useXRSession } from "../hooks/useXRSession";

export interface ModelViewerProps {
  /** URL of the GLB/GLTF asset (must be CORS accessible) */
  modelUrl: string;
  /** WebXR session mode to request. Defaults to "immersive-ar". */
  xrMode?: "immersive-ar" | "immersive-vr";
  /** Placeholder element while loading */
  loadingFallback?: React.ReactNode;
}

/**
 * High-level R3F canvas that renders a GLB model and optionally attaches a WebXR session.
 *
 * Works in mobile AR/VR compatible browsers as well as desktop fallback via OrbitControls.
 */
export const ModelViewer: React.FC<ModelViewerProps> = ({
  modelUrl,
  xrMode = "immersive-ar",
  loadingFallback = <p>Loading model…</p>,
}) => {
  const { gltf, loading, error } = useModelLoader(modelUrl);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { session, error: xrError } = useXRSession(canvasRef.current, xrMode);

  // Attach XR session to the renderer once both the session and renderer exist
  useEffect(() => {
    if (!session || !canvasRef.current) return;
    // R3F stores the Three.js renderer on the canvas element as __threeRenderer
    const renderer: any = (canvasRef.current as any).__threeRenderer;
    if (renderer?.xr) {
      renderer.xr.setSession(session);
    }
  }, [session]);

  if (loading) return <>{loadingFallback}</>;
  if (error) return <p style={{ color: "red" }}>❌ {error.message}</p>;
  if (xrError) return <p style={{ color: "red" }}>❌ XR error: {xrError}</p>;

  return (
    <Canvas
      ref={canvasRef as any}
      shadows
      camera={{ position: [0, 1.5, 3], fov: 60 }}
      style={{ width: "100%", height: "100%" }}
    >
      {/* Lights */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />

      {/* Environment & Controls */}
      <Environment preset="city" />
      <OrbitControls enablePan enableZoom />

      {/* The loaded model */}
      {gltf?.scene && <primitive object={gltf.scene} dispose={null} />}
    </Canvas>
  );
};
