"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";

export default function EarthModel(props: JSX.IntrinsicElements["group"]) {
  const group = useRef<THREE.Group>(null);
  const gltf = useGLTF("/Earth_Model.glb");
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.2;
  });
  return (
    <group ref={group} {...props}>
      {/* eslint-disable-next-line react/no-unknown-property */}
      <primitive object={(gltf as any).scene} />
    </group>
  );
}

useGLTF.preload("/Earth_Model.glb");


