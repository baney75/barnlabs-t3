// src/hooks/useAuth.ts
import { useState, useCallback } from "react";
import type {
  LoginRequest,
  LoginResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  ApiError,
} from "../types";

interface UseAuthReturn {
  login: (credentials: LoginRequest) => Promise<LoginResponse>;
  requestPasswordReset: (
    request: ForgotPasswordRequest,
  ) => Promise<ForgotPasswordResponse>;
  resetPassword: (
    request: ResetPasswordRequest,
  ) => Promise<ResetPasswordResponse>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useAuth(): UseAuthReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleApiCall = useCallback(
    async <T>(
      apiCall: () => Promise<Response>,
      successMessage?: string,
    ): Promise<T> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiCall();
        const data = await response.json();

        if (!response.ok) {
          const apiError = data as ApiError;
          throw new Error(
            apiError.error || `Request failed with status ${response.status}`,
          );
        }

        // Type guard to check if data has error property
        const hasError = (obj: unknown): obj is { error: string } => {
          return typeof obj === "object" && obj !== null && "error" in obj;
        };

        if (successMessage && !hasError(data)) {
          // You could show a success toast here if you have a toast system
          console.log(successMessage);
        }

        return data as T;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const login = useCallback(
    async (credentials: LoginRequest): Promise<LoginResponse> => {
      return handleApiCall<LoginResponse>(
        () =>
          fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials),
          }),
        "Login successful",
      );
    },
    [handleApiCall],
  );

  const requestPasswordReset = useCallback(
    async (request: ForgotPasswordRequest): Promise<ForgotPasswordResponse> => {
      return handleApiCall<ForgotPasswordResponse>(
        () =>
          fetch("/api/forgot-password/request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
          }),
        "Password reset email sent",
      );
    },
    [handleApiCall],
  );

  const resetPassword = useCallback(
    async (request: ResetPasswordRequest): Promise<ResetPasswordResponse> => {
      return handleApiCall<ResetPasswordResponse>(
        () =>
          fetch("/api/forgot-password/reset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
          }),
        "Password reset successful",
      );
    },
    [handleApiCall],
  );

  return {
    login,
    requestPasswordReset,
    resetPassword,
    isLoading,
    error,
    clearError,
  };
}
