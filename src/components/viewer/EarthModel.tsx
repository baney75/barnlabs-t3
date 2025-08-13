"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { type Group } from "three";

export default function EarthModel(
  props: React.JSX.IntrinsicElements["group"],
) {
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
