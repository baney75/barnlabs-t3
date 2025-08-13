"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { type Group } from "three";

export default function EarthModel(
  props: React.JSX.IntrinsicElements["group"],
) {
  const group = useRef<Group>(null);
  const gltf = useGLTF("/dean_richmond.glb?v=1");
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.2;
  });
  return (
    <group ref={group} {...props}>
      {}
      <primitive object={gltf.scene} />
    </group>
  );
}

useGLTF.preload("/dean_richmond.glb?v=1");
