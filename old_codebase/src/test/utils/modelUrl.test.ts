import { describe, it, expect } from "vitest";

// Test utility functions for model URL handling
describe("Model URL Handling", () => {
  const isBucketUrl = (url: string): boolean => {
    return (
      url.includes("bucket1.barnlabs.net") ||
      url.includes("r2.cloudflarestorage.com")
    );
  };

  const getProxiedUrl = (url: string): string => {
    if (isBucketUrl(url)) {
      return `/api/proxy-model?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  const isLocalAsset = (url: string): boolean => {
    return (
      url.startsWith("/") && !url.includes("/api/") && !url.includes("/model/")
    );
  };

  describe("isBucketUrl", () => {
    it("identifies bucket1.barnlabs.net URLs", () => {
      expect(isBucketUrl("https://bucket1.barnlabs.net/models/test.glb")).toBe(
        true,
      );
      expect(isBucketUrl("http://bucket1.barnlabs.net/test.glb")).toBe(true);
    });

    it("identifies R2 Cloudflare storage URLs", () => {
      expect(
        isBucketUrl("https://example.r2.cloudflarestorage.com/models/test.glb"),
      ).toBe(true);
      expect(
        isBucketUrl("https://test.r2.cloudflarestorage.com/file.glb"),
      ).toBe(true);
    });

    it("returns false for non-bucket URLs", () => {
      expect(isBucketUrl("https://example.com/model.glb")).toBe(false);
      expect(isBucketUrl("/local/model.glb")).toBe(false);
      expect(isBucketUrl("blob:http://localhost:3000/12345")).toBe(false);
    });
  });

  describe("getProxiedUrl", () => {
    it("proxies bucket URLs", () => {
      const bucketUrl = "https://bucket1.barnlabs.net/models/test.glb";
      const proxied = getProxiedUrl(bucketUrl);
      expect(proxied).toBe(
        `/api/proxy-model?url=${encodeURIComponent(bucketUrl)}`,
      );
    });

    it("proxies R2 URLs", () => {
      const r2Url = "https://example.r2.cloudflarestorage.com/models/test.glb";
      const proxied = getProxiedUrl(r2Url);
      expect(proxied).toBe(`/api/proxy-model?url=${encodeURIComponent(r2Url)}`);
    });

    it("returns non-bucket URLs unchanged", () => {
      expect(getProxiedUrl("/local/model.glb")).toBe("/local/model.glb");
      expect(getProxiedUrl("https://example.com/model.glb")).toBe(
        "https://example.com/model.glb",
      );
      expect(getProxiedUrl("blob:http://localhost:3000/12345")).toBe(
        "blob:http://localhost:3000/12345",
      );
    });

    it("properly encodes URLs with special characters", () => {
      const urlWithSpaces =
        "https://bucket1.barnlabs.net/models/test model.glb";
      const proxied = getProxiedUrl(urlWithSpaces);
      expect(proxied).toContain("test%20model.glb");
    });
  });

  describe("isLocalAsset", () => {
    it("identifies local static assets", () => {
      expect(isLocalAsset("/Hero-Assets/Earth_Model.glb")).toBe(true);
      expect(isLocalAsset("/textures/wood.jpg")).toBe(true);
      expect(isLocalAsset("/models/test.glb")).toBe(true);
    });

    it("excludes API endpoints", () => {
      expect(isLocalAsset("/api/user/model/test.glb")).toBe(false);
      expect(isLocalAsset("/api/proxy-model?url=test")).toBe(false);
    });

    it("excludes model endpoints", () => {
      expect(isLocalAsset("/model/user-123/test.glb")).toBe(false);
    });

    it("returns false for external URLs", () => {
      expect(isLocalAsset("https://example.com/model.glb")).toBe(false);
      expect(isLocalAsset("http://localhost:3000/model.glb")).toBe(false);
    });

    it("returns false for relative paths without leading slash", () => {
      expect(isLocalAsset("models/test.glb")).toBe(false);
      expect(isLocalAsset("./models/test.glb")).toBe(false);
    });
  });

  describe("URL validation", () => {
    const isValidModelUrl = (url: string): boolean => {
      if (!url) return false;

      // Allow blob and data URLs
      if (url.startsWith("blob:") || url.startsWith("data:")) return true;

      // Allow local paths
      if (url.startsWith("/")) return true;

      // Validate full URLs
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };

    it("validates empty and invalid URLs", () => {
      expect(isValidModelUrl("")).toBe(false);
      expect(isValidModelUrl("not a url")).toBe(false);
      expect(isValidModelUrl("ftp://example.com/file")).toBe(true); // FTP is a valid protocol
    });

    it("validates blob URLs", () => {
      expect(isValidModelUrl("blob:http://localhost:3000/12345")).toBe(true);
      expect(isValidModelUrl("blob:https://example.com/abc-def")).toBe(true);
    });

    it("validates data URLs", () => {
      expect(isValidModelUrl("data:model/gltf-binary;base64,Z2xURg==")).toBe(
        true,
      );
      expect(
        isValidModelUrl("data:application/octet-stream;base64,ABC123"),
      ).toBe(true);
    });

    it("validates local paths", () => {
      expect(isValidModelUrl("/models/test.glb")).toBe(true);
      expect(isValidModelUrl("/Hero-Assets/Earth_Model.glb")).toBe(true);
      expect(isValidModelUrl("/api/proxy-model?url=test")).toBe(true);
    });

    it("validates full URLs", () => {
      expect(isValidModelUrl("https://example.com/model.glb")).toBe(true);
      expect(isValidModelUrl("http://localhost:3000/model.glb")).toBe(true);
      expect(
        isValidModelUrl("https://bucket1.barnlabs.net/models/test.glb"),
      ).toBe(true);
    });
  });
});
