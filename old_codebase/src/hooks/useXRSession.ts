import { useEffect, useState } from "react";

/**
 * Manage lifecycle of a WebXR session (AR or VR).
 * If the device/browser does not support WebXR the hook sets an error string.
 *
 * Usage:
 *   const { session, error } = useXRSession(canvasRef.current, "immersive-ar");
 */
export function useXRSession(
  canvas: HTMLCanvasElement | null,
  mode: "immersive-ar" | "immersive-vr" = "immersive-ar",
) {
  const [session, setSession] = useState<XRSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Clean up previous session when mode changes.
    return () => {
      session?.end().catch(() => {
        /* ignore */
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (!canvas) return;

    if (!(navigator as any).xr) {
      setError("WebXR not supported on this device");
      return;
    }

    let cancelled = false;

    (navigator as any).xr
      .requestSession(mode, {
        requiredFeatures: ["local-floor"],
        optionalFeatures: ["hit-test", "dom-overlay"],
        domOverlay: { root: document.body },
      })
      .then((s: XRSession) => {
        if (cancelled) {
          s.end();
          return;
        }
        setSession(s);
      })
      .catch((e: Error) => {
        setError(e.message || "Failed to start XR session");
      });

    return () => {
      cancelled = true;
    };
  }, [canvas, mode]);

  return { session, error } as const;
}
