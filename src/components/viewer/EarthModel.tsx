"use client";
import * as React from "react";
import { Suspense } from "react";
import { useGLTF } from "@react-three/drei";
import { type Group } from "three";

const EARTH_GLB_URL_D =
  "https://t3rgh6yjwx.ufs.sh/f/DGcq4LQh6E89kENSLW7vf8xODEsZWtuNTX27M3iVwYrCSFeo";

function EarthFallback(_: React.JSX.IntrinsicElements["group"]) {
  return null;
}

function EarthGLB() {
  // Drei's GLTF loader needs a direct file response
  const gltf = useGLTF(EARTH_GLB_URL_D);
  return <primitive object={gltf.scene} />;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
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
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export default function EarthModel(
  props: React.JSX.IntrinsicElements["group"],
) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<EarthFallback {...props} />}>
        <group {...props}>
          <EarthGLB />
        </group>
      </Suspense>
    </ErrorBoundary>
  );
}
