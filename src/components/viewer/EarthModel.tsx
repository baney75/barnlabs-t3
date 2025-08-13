"use client";
import * as React from "react";
import { useRef, Suspense } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { type Group } from "three";

const EARTH_GLB_URL_D =
  "https://t3rgh6yjwx.ufs.sh/f/DGcq4LQh6E89kENSLW7vf8xODEsZWtuNTX27M3iVwYrCSFeo"

function EarthFallback(props: React.JSX.IntrinsicElements["group"]) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.2;
  });
  return (
    <group ref={group} {...props}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial color="#1e90ff" metalness={0.2} roughness={0.5} />
      </mesh>
    </group>
  );
}

function EarthGLB() {
  // Drei's GLTF loader needs a direct file response
  const gltf = useGLTF(EARTH_GLB_URL_D);
  return <primitive object={gltf.scene} />;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback as React.ReactElement;
    return this.props.children;
  }
}

export default function EarthModel(
  props: React.JSX.IntrinsicElements["group"],
) {
  return (
    <ErrorBoundary fallback={<EarthFallback {...props} />}>
      <Suspense fallback={<EarthFallback {...props} />}>
        <group {...props}>
          <EarthGLB />
        </group>
      </Suspense>
    </ErrorBoundary>
  );
}
