"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, useGLTF } from "@react-three/drei";
// Relax types when local env lacks @types/three
type GLTFResult = { scene: object };
function GLB({ src }: { src: string }) {
  const result: GLTFResult = useGLTF(src) as unknown as GLTFResult;
  return <primitive object={result.scene} />;
}

export default function ModelViewer({
  src,
  usdz,
  title: _title,
}: {
  src: string;
  usdz?: string;
  title?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="h-[360px] rounded-lg bg-black/20">
        <Canvas camera={{ position: [2.2, 1.2, 2.2], fov: 50 }}>
          <color attach="background" args={["#000000"]} />
          <ambientLight intensity={1.2} />
          <Stage intensity={0.3}>
            <GLB src={src} />
          </Stage>
          <OrbitControls enablePan={false} />
        </Canvas>
      </div>
      <div className="flex flex-wrap gap-2">
        {usdz && (
          <a
            rel="ar"
            href={usdz}
            className="rounded-md bg-white px-3 py-1 text-sm text-black"
          >
            View in AR (iOS)
          </a>
        )}
        <a
          href={src}
          target="_blank"
          className="rounded-md bg-white px-3 py-1 text-sm text-black"
        >
          Download GLB
        </a>
        <a
          href={`/vr360.html?src=${encodeURIComponent(src)}`}
          target="_blank"
          className="rounded-md bg-white px-3 py-1 text-sm text-black"
        >
          Enter VR
        </a>
      </div>
    </div>
  );
}
