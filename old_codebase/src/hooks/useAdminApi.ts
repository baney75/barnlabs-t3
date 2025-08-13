import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type {
  AdminUser,
  AdminAssetsResponse,
  AdminLogsResponse,
} from "../types";

export interface UseAdminApiReturn {
  // User operations
  fetchUsers: () => Promise<{
    users: AdminUser[];
    success: boolean;
    total?: number;
  }>;
  createUser: (
    username: string,
    email: string,
    password: string,
    is_admin?: boolean,
  ) => Promise<{ message: string }>;
  updateUserField: (
    userId: number,
    field: string,
    value: string | boolean | number,
  ) => Promise<{ message: string }>;
  deleteUser: (userId: number) => Promise<{ message: string }>;

  // Asset operations
  fetchAssets: () => Promise<AdminAssetsResponse>;
  uploadAsset: (
    file: File,
    ownerUserId?: number,
    options?: { isPublic?: boolean; increaseUserLimit?: boolean },
  ) => Promise<{ message: string; success: boolean }>;
  deleteAsset: (fileName: string) => Promise<{ message: string }>;
  syncAssets: () => Promise<{
    message: string;
    imported: number;
    skipped: number;
  }>;

  // Log operations
  fetchLogs: () => Promise<AdminLogsResponse>;

  // Model processing
  uploadModelResource: (
    userId: number,
    file: File,
  ) => Promise<{ message: string; success: boolean }>;

  // Database operations
  dbStatus: () => Promise<any>;
  dbCleanup: () => Promise<any>;
  dbEnsureSchema: () => Promise<any>;
  dbAnalyze: () => Promise<any>;
  dbExport: () => Promise<Blob>;

  // Model sharing operations
  updateModelSharing: (
    assetKey: string,
    isPublic: boolean,
    increaseUserLimit?: boolean,
    targetUserId?: number,
  ) => Promise<{ message: string; success: boolean }>;
  fetchPublicModelsStats: () => Promise<{
    success: boolean;
    stats: {
      total_public_models: number;
      users_with_access: number;
      total_public_size: number;
      avg_model_size: number;
    };
    recentlyShared: Array<{
      file_name: string;
      size: number;
      upload_date: string;
      uploader: string;
    }>;
  }>;
}

export function useAdminApi(): UseAdminApiReturn {
  const navigate = useNavigate();

  const apiFetch = useCallback(
    async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        throw new Error("No authentication token");
      }

      const response = await fetch(endpoint, {
        ...options,
        headers: {
          ...options.headers,
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        throw new Error("Authentication failed");
      }

      if (response.status === 429) {
        // Don't retry automatically, just throw a user-friendly error
        throw new Error(
          "Too many requests. Please wait a moment before trying again.",
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Request failed (${response.status})`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // If not JSON, use the text response
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    },
    [navigate],
  );

  // User operations
  const fetchUsers = useCallback(() => {
    return apiFetch<{
      users: AdminUser[];
      success: boolean;
      total?: number;
    }>("/api/admin/users");
  }, [apiFetch]);

  const createUser = useCallback(
    (username: string, email: string, password: string, is_admin?: boolean) => {
      return apiFetch<{ message: string }>("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, is_admin }),
      });
    },
    [apiFetch],
  );

  const updateUserField = useCallback(
    (userId: number, field: string, value: string | boolean | number) => {
      return apiFetch<{ message: string }>(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, value }),
      });
    },
    [apiFetch],
  );

  const deleteUser = useCallback(
    (userId: number) => {
      return apiFetch<{ message: string }>(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
    },
    [apiFetch],
  );

  // Asset operations
  const fetchAssets = useCallback(() => {
    return apiFetch<AdminAssetsResponse>("/api/admin/assets");
  }, [apiFetch]);

  const uploadAsset = useCallback(
    (
      file: File,
      ownerUserId?: number,
      options?: { isPublic?: boolean; increaseUserLimit?: boolean },
    ) => {
      const formData = new FormData();
      formData.append("file", file);
      if (typeof ownerUserId === "number") {
        formData.append("userId", String(ownerUserId));
      }
      if (options?.isPublic) {
        formData.append("isPublic", "true");
      }
      if (options?.increaseUserLimit) {
        formData.append("increaseUserLimit", "true");
      }
      return apiFetch<{ message: string; success: boolean }>(
        "/api/admin/upload",
        {
          method: "POST",
          body: formData,
        },
      );
    },
    [apiFetch],
  );

  const deleteAsset = useCallback(
    (fileName: string) => {
      return apiFetch<{ message: string }>(
        `/api/admin/assets/${encodeURIComponent(fileName)}`,
        {
          method: "DELETE",
        },
      );
    },
    [apiFetch],
  );

  const syncAssets = useCallback(() => {
    return apiFetch<{
      message: string;
      imported: number;
      skipped: number;
    }>("/api/admin/sync-assets");
  }, [apiFetch]);

  // USDZ linking removed

  // Log operations
  const fetchLogs = useCallback(() => {
    return apiFetch<AdminLogsResponse>("/api/admin/logs");
  }, [apiFetch]);

  // Model processing
  const uploadModelResource = useCallback(
    (userId: number, file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId.toString());
      return apiFetch<{ message: string; success: boolean }>(
        "/api/admin/upload-ai-resource",
        {
          method: "POST",
          body: formData,
        },
      );
    },
    [apiFetch],
  );

  // Database operations
  const dbStatus = useCallback(
    () => apiFetch<any>("/api/admin/db/status"),
    [apiFetch],
  );
  const dbCleanup = useCallback(
    () => apiFetch<any>("/api/admin/db/cleanup", { method: "POST" }),
    [apiFetch],
  );
  const dbEnsureSchema = useCallback(
    () => apiFetch<any>("/api/admin/db/ensure-schema", { method: "POST" }),
    [apiFetch],
  );
  const dbAnalyze = useCallback(
    () => apiFetch<any>("/api/admin/db/analyze", { method: "POST" }),
    [apiFetch],
  );
  const dbExport = useCallback(async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/admin/db/export", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Export failed: ${res.status} ${txt.slice(0, 120)}`);
    }
    return await res.blob();
  }, []);

  // Model sharing operations
  const updateModelSharing = useCallback(
    (
      assetKey: string,
      isPublic: boolean,
      increaseUserLimit?: boolean,
      targetUserId?: number,
    ) => {
      return apiFetch<{ message: string; success: boolean }>(
        "/api/admin/update-model-sharing",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetKey,
            isPublic,
            increaseUserLimit,
            targetUserId,
          }),
        },
      );
    },
    [apiFetch],
  );

  const fetchPublicModelsStats = useCallback(() => {
    return apiFetch<{
      success: boolean;
      stats: {
        total_public_models: number;
        users_with_access: number;
        total_public_size: number;
        avg_model_size: number;
      };
      recentlyShared: Array<{
        file_name: string;
        size: number;
        upload_date: string;
        uploader: string;
      }>;
    }>("/api/admin/public-models-stats");
  }, [apiFetch]);

  // Return a stable object to avoid infinite effects in components
  return useMemo(
    () => ({
      fetchUsers,
      createUser,
      updateUserField,
      deleteUser,
      fetchAssets,
      uploadAsset,
      deleteAsset,
      syncAssets,
      fetchLogs,
      uploadModelResource,
      dbStatus,
      dbCleanup,
      dbEnsureSchema,
      dbAnalyze,
      dbExport,
      updateModelSharing,
      fetchPublicModelsStats,
    }),
    [
      fetchUsers,
      createUser,
      updateUserField,
      deleteUser,
      fetchAssets,
      uploadAsset,
      deleteAsset,
      syncAssets,
      fetchLogs,
      uploadModelResource,
      dbStatus,
      dbCleanup,
      dbEnsureSchema,
      dbAnalyze,
      dbExport,
      updateModelSharing,
      fetchPublicModelsStats,
    ],
  );
}
