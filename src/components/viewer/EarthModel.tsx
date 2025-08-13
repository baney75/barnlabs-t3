"use client";
import * as React from "react";
import { Suspense, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { type Group } from "three";

const EARTH_GLB_URL_D =
  "https://t3rgh6yjwx.ufs.sh/f/DGcq4LQh6E89kENSLW7vf8xODEsZWtuNTX27M3iVwYrCSFeo";

function EarthFallback(_: React.JSX.IntrinsicElements["group"]) {
  return null;
}

function EarthGLB() {
  const gltf = useGLTF(EARTH_GLB_URL_D) as unknown as { scene: THREE.Object3D };
  const pivotRef = React.useRef<Group>(null);
  useEffect(() => {
    if (!gltf?.scene) return;
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    gltf.scene.position.sub(center);
    // Optional: normalize scale so the model roughly fits a unit sphere
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const target = 1.2; // scene units
    const scale = target / maxDim;
    gltf.scene.scale.setScalar(scale);
  }, [gltf?.scene]);
  useFrame((_, delta) => {
    if (pivotRef.current) pivotRef.current.rotation.y += delta * 0.2;
  });
  return (
    <group ref={pivotRef}>
      <primitive object={gltf.scene} />
    </group>
  );
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
