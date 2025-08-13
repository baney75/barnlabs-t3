import { useEffect, useState } from "react";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import * as THREE from "three";

/**
 * React hook to load a GLB/GLTF model with support for Draco, Meshopt and KTX2 compressed assets.
 * The hook returns { gltf, loading, error } where gltf is an instance of GLTF when loaded.
 *
 * The loaders are disposed automatically when the component using the hook unmounts to avoid memory leaks.
 */
export function useModelLoader(url: string) {
  const [gltf, setGltf] = useState<GLTF | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!url) return;

    const manager = new THREE.LoadingManager();
    // Prefer KHR_texture_basisu and KTX2 decoding via WebGL capabilities to avoid long blocking on init

    // Draco Loader — geometry compression
    const draco = new DRACOLoader(manager);
    draco.setDecoderPath("/draco/");

    // KTX2 Loader — texture compression
    const ktx2 = new KTX2Loader(manager);
    ktx2.setTranscoderPath("/ktx2/");
    // Use a throwaway renderer only when needed to detect support to prevent flashing/jank
    try {
      const tmp = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
      });
      ktx2.detectSupport?.(tmp);
      tmp.dispose();
    } catch {}

    // GLTF Loader
    const loader = new GLTFLoader(manager)
      .setDRACOLoader(draco)
      .setKTX2Loader(ktx2)
      .setMeshoptDecoder(MeshoptDecoder);

    loader.load(
      url,
      (g) => {
        setGltf(g);
        setLoading(false);
      },
      undefined,
      (e) => {
        console.error("Model load error:", e);
        setError(e instanceof Error ? e : new Error(String(e)));
        setLoading(false);
      },
    );

    return () => {
      draco.dispose();
      ktx2.dispose();
    };
  }, [url]);

  return { gltf, loading, error } as const;
}
