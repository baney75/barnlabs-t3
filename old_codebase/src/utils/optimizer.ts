import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export interface OptimizeOptions {
  draco?: boolean;
  meshopt?: boolean;
  textureCompress?: "webp" | "avif" | "ktx2";
  maxTextureSize?: number; // e.g. 1024
}

/**
 * Convert any 3D source file to an optimized GLB using gltf-transform CLI.
 * The function throws if the output file is not generated.
 */
export function optimizeModel(
  inputPath: string,
  outputPath: string,
  opts: OptimizeOptions = {},
) {
  const args: string[] = [
    "optimize",
    `\"${inputPath}\"`,
    `\"${outputPath}\"`,
    "--format",
    "glb",
  ];

  if (opts.draco) args.push("--compress", "draco");
  if (opts.meshopt) args.push("--compress", "meshopt");
  if (opts.textureCompress) {
    args.push("--texture-compress", opts.textureCompress);
    if (opts.maxTextureSize)
      args.push("--texture-resize", String(opts.maxTextureSize));
  }

  const cmd = `npx gltf-transform ${args.join(" ")}`;
  console.log(`[optimizer] ${cmd}`);
  execSync(cmd, { stdio: "inherit" });

  if (!fs.existsSync(outputPath)) {
    throw new Error("Optimization failed: output file not created.");
  }

  const originalSize = fs.statSync(inputPath).size;
  const optimizedSize = fs.statSync(outputPath).size;
  const ratio = ((originalSize - optimizedSize) / originalSize) * 100;
  console.log(
    `✅ Optimized ${path.basename(inputPath)}: ${ratio.toFixed(1)}% smaller`,
  );
}
