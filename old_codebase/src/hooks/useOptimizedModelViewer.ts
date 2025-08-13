import { useMemo } from "react";

type ViewerContext = "dashboard" | "admin" | "assets" | "share" | "preview";

interface OptimizedModelViewerProps {
  src: string;
  context: ViewerContext;
  style?: React.CSSProperties;
}

export const useOptimizedModelViewer = ({
  src,
  context,
  style,
}: OptimizedModelViewerProps) => {
  return useMemo(() => {
    const baseProps = {
      src,
      style: style || { height: "400px" },
    };

    switch (context) {
      case "dashboard":
        return {
          ...baseProps,
          cameraPosition: [0, 0, 5] as [number, number, number],
          autoRotate: false,
          environment: "sunset" as const,
          minDistance: 2,
          maxDistance: 15,
        };

      case "admin":
        return {
          ...baseProps,
          cameraPosition: [0, 0, 4] as [number, number, number],
          autoRotate: true,
          autoRotateSpeed: 0.5,
          environment: "warehouse" as const,
          minDistance: 1,
          maxDistance: 10,
        };

      case "assets":
        return {
          ...baseProps,
          cameraPosition: [0, 0, 4] as [number, number, number],
          autoRotate: true,
          autoRotateSpeed: 0.4,
          environment: "warehouse" as const,
          minDistance: 1.5,
          maxDistance: 12,
        };

      case "share":
        return {
          ...baseProps,
          cameraPosition: [0, 0, 5] as [number, number, number],
          autoRotate: false,
          environment: "sunset" as const,
          minDistance: 2,
          maxDistance: 15,
          style: { height: "450px" },
        };

      case "preview":
        return {
          ...baseProps,
          cameraPosition: [0, 0, 5] as [number, number, number],
          autoRotate: true,
          autoRotateSpeed: 0.3,
          environment: "studio" as const,
          minDistance: 1,
          maxDistance: 20,
          style: { width: "100%", height: "100%" },
        };

      default:
        return baseProps;
    }
  }, [src, context, style]);
};

// Non-hook utility for contexts where hooks cannot be used (e.g., inside render helpers)
export function getOptimizedModelViewerProps({
  src,
  context,
  style,
}: OptimizedModelViewerProps) {
  const baseProps = {
    src,
    style: style || { height: "400px" },
  } as const;

  switch (context) {
    case "dashboard":
      return {
        ...baseProps,
        cameraPosition: [0, 0, 5] as [number, number, number],
        autoRotate: false,
        environment: "sunset" as const,
        minDistance: 2,
        maxDistance: 15,
      };
    case "admin":
      return {
        ...baseProps,
        cameraPosition: [0, 0, 4] as [number, number, number],
        autoRotate: true,
        autoRotateSpeed: 0.5,
        environment: "warehouse" as const,
        minDistance: 1,
        maxDistance: 10,
      };
    case "assets":
      return {
        ...baseProps,
        cameraPosition: [0, 0, 4] as [number, number, number],
        autoRotate: true,
        autoRotateSpeed: 0.4,
        environment: "warehouse" as const,
        minDistance: 1.5,
        maxDistance: 12,
      };
    case "share":
      return {
        ...baseProps,
        cameraPosition: [0, 0, 5] as [number, number, number],
        autoRotate: false,
        environment: "sunset" as const,
        minDistance: 2,
        maxDistance: 15,
        style: { height: "450px" },
      };
    case "preview":
      return {
        ...baseProps,
        cameraPosition: [0, 0, 5] as [number, number, number],
        autoRotate: true,
        autoRotateSpeed: 0.3,
        environment: "studio" as const,
        minDistance: 1,
        maxDistance: 20,
        style: { width: "100%", height: "100%" },
      };
    default:
      return baseProps;
  }
}
