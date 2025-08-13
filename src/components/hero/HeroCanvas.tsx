"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage } from "@react-three/drei";
import EarthModel from "~/components/viewer/EarthModel";

export default function HeroCanvas() {
  return (
    <Canvas camera={{ position: [2.2, 1.2, 2.2], fov: 50 }}>
      <color attach="background" args={["#000000"]} />
      <ambientLight intensity={1.2} />
      <Stage intensity={0.3}>
        <EarthModel />
      </Stage>
      <OrbitControls enablePan={false} />
    </Canvas>
  );
}
