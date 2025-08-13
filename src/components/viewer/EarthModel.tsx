"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { type Group } from "three";

export default function EarthModel(
  props: React.JSX.IntrinsicElements["group"],
) {
  const group = useRef<Group>(null);
  const gltf = useGLTF(
    "https://t3rgh6yjwx.ufs.sh/f/DGcq4LQh6E89Co1yGNeldY0T6O4ZvbiLtsrpqA9PuzUwVMmx",
  );
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

useGLTF.preload(
  "https://t3rgh6yjwx.ufs.sh/f/DGcq4LQh6E89Co1yGNeldY0T6O4ZvbiLtsrpqA9PuzUwVMmx",
);
