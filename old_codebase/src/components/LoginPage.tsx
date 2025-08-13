// src/components/LoginPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Shield, Key, Mail, Home } from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import { useFormValidation } from "../hooks/useFormValidation";
import type { FormMode } from "../types";

import FormField from "./forms/FormField";
import LoadingButton from "./forms/LoadingButton";
import ErrorAlert from "./forms/ErrorAlert";

// Validation rules
const createValidationRules = (mode: FormMode) => ({
  identifier: (value: string) => {
    if (!value.trim()) return "Username or email is required";
    return null;
  },

  password: (value: string) => {
    if (!value) return "Password is required";
    if (mode === "reset-password" && value.length < 8) {
      return "Password must be at least 8 characters long";
    }
    return null;
  },

  email: (value: string) => {
    if (!value.trim()) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return "Please enter a valid email address";
    return null;
  },

  resetToken: (value: string) => {
    if (!value.trim()) return "Reset token is required";
    if (value.length < 10) return "Reset token appears to be invalid";
    return null;
  },

  newPassword: (value: string) => {
    if (!value) return "New password is required";
    if (value.length < 8) return "Password must be at least 8 characters long";
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
      return "Password must contain at least one uppercase letter, one lowercase letter, and one number";
    }
    return null;
  },
});

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    login,
    requestPasswordReset,
    resetPassword,
    isLoading,
    error,
    clearError,
  } = useAuth();

  const [mode, setMode] = useState<FormMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Form validation for each mode
  const loginForm = useFormValidation(
    { identifier: "", password: "" },
    createValidationRules("login"),
  );

  const forgotForm = useFormValidation(
    { email: "" },
    createValidationRules("forgot-password"),
  );

  const resetForm = useFormValidation(
    { resetToken: "", newPassword: "" },
    createValidationRules("reset-password"),
  );

  // Clear errors when mode changes
  useEffect(() => {
    clearError();
    setResetEmailSent(false);
  }, [mode, clearError]);

  // Check for reset token in URL on load
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    if (token) {
      setMode("reset-password");
      resetForm.setValue("resetToken", token);
    }
  }, [location, resetForm]);

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!loginForm.validateAll()) {
        // Mark all fields as touched to show validation errors
        Object.keys(loginForm.data).forEach((field) => {
          loginForm.setTouchedField(field as keyof typeof loginForm.data);
        });
        return;
      }

      try {
        const response = await login(loginForm.data);

        // Store auth data
        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));

        // Prefer redirecting back to the intended page
        const state = location.state as { from?: Location } | null;
        const fromPath = state?.from?.pathname;
        if (fromPath && fromPath !== "/login") {
          navigate(fromPath, { replace: true });
          return;
        }

        // Otherwise, navigate to appropriate default page
        navigate(
          response.user.is_admin
            ? "/admin"
            : `/dashboard/${response.user.username}`,
        );
      } catch (err) {
        // Error is handled by useAuth hook
        console.error("Login failed:", err);
      }
    },
    [loginForm, login, navigate, location.state],
  );

  const handleForgotPassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!forgotForm.validateAll()) {
        forgotForm.setTouchedField("email");
        return;
      }

      try {
        await requestPasswordReset(forgotForm.data);
        setResetEmailSent(true);
      } catch (err) {
        console.error("Password reset request failed:", err);
      }
    },
    [forgotForm, requestPasswordReset],
  );

  const handleResetPassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!resetForm.validateAll()) {
        Object.keys(resetForm.data).forEach((field) => {
          resetForm.setTouchedField(field as keyof typeof resetForm.data);
        });
        return;
      }

      try {
        // Map form data to API request format
        const resetRequest = {
          token: resetForm.data.resetToken, // Map resetToken to token
          newPassword: resetForm.data.newPassword,
        };

        await resetPassword(resetRequest);
        // Show success state briefly before switching to login
        setResetEmailSent(true);
        setTimeout(() => {
          setMode("login");
          resetForm.reset();
          setResetEmailSent(false);
        }, 2000);
      } catch (err) {
        console.error("Password reset failed:", err);
      }
    },
    [resetForm, resetPassword],
  );

  const handleModeChange = useCallback(
    (newMode: FormMode) => {
      setMode(newMode);
      setShowPassword(false);
      // Reset forms
      loginForm.reset();
      forgotForm.reset();
      resetForm.reset();
    },
    [loginForm, forgotForm, resetForm],
  );

  const renderModeIcon = () => {
    switch (mode) {
      case "login":
        return <Shield className="mx-auto mb-4 h-8 w-8 text-blue-600" />;
      case "forgot-password":
        return <Mail className="mx-auto mb-4 h-8 w-8 text-blue-600" />;
      case "reset-password":
        return <Key className="mx-auto mb-4 h-8 w-8 text-blue-600" />;
    }
  };

  const renderModeTitle = () => {
    switch (mode) {
      case "login":
        return "Welcome Back";
      case "forgot-password":
        return "Reset Password";
      case "reset-password":
        return "Set New Password";
    }
  };

  const renderModeSubtitle = () => {
    switch (mode) {
      case "login":
        return "Sign in to your account";
      case "forgot-password":
        return resetEmailSent
          ? "Check your email for reset instructions"
          : "Enter your email to receive reset instructions";
      case "reset-password":
        return "Enter your reset token and new password";
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-cyan-900 p-4">
      {/* Go Home Button */}
      <div className="absolute top-6 left-6">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white backdrop-blur-md transition-all duration-300 hover:bg-white/20"
        >
          <Home size={18} />
          <span className="font-medium">Go Home</span>
        </Link>
      </div>

      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-gray-900 shadow-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          {renderModeIcon()}
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {renderModeTitle()}
          </h1>
          <p className="text-gray-600">{renderModeSubtitle()}</p>
        </div>

        {/* Error Alert */}
        {error && (
          <ErrorAlert error={error} onDismiss={clearError} className="mb-6" />
        )}

        {/* Forms */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <FormField
              name="identifier"
              label="Username or Email"
              type="text"
              value={loginForm.data.identifier}
              onChange={(e) => loginForm.setValue("identifier", e.target.value)}
              onBlur={() => loginForm.setTouchedField("identifier")}
              error={loginForm.errors.identifier}
              touched={loginForm.touched.identifier}
              autoComplete="username"
              required
              disabled={isLoading}
            />

            <FormField
              name="password"
              label="Password"
              value={loginForm.data.password}
              onChange={(e) => loginForm.setValue("password", e.target.value)}
              onBlur={() => loginForm.setTouchedField("password")}
              error={loginForm.errors.password}
              touched={loginForm.touched.password}
              showPasswordToggle
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              autoComplete="current-password"
              required
              disabled={isLoading}
            />

            <LoadingButton
              type="submit"
              isLoading={isLoading}
              loadingText="Signing in..."
              disabled={!loginForm.isValid}
            >
              Sign In
            </LoadingButton>
          </form>
        )}

        {mode === "forgot-password" && (
          <form
            onSubmit={handleForgotPassword}
            className="space-y-4"
            noValidate
          >
            <FormField
              name="email"
              label="Email Address"
              type="email"
              value={forgotForm.data.email}
              onChange={(e) => forgotForm.setValue("email", e.target.value)}
              onBlur={() => forgotForm.setTouchedField("email")}
              error={forgotForm.errors.email}
              touched={forgotForm.touched.email}
              autoComplete="email"
              required
              disabled={isLoading || resetEmailSent}
            />

            {!resetEmailSent && (
              <LoadingButton
                type="submit"
                isLoading={isLoading}
                loadingText="Sending reset email..."
                disabled={!forgotForm.isValid}
              >
                Send Reset Email
              </LoadingButton>
            )}

            {resetEmailSent && (
              <div className="text-center">
                <p className="mb-4 text-sm text-green-600">
                  Reset email sent! Check your inbox for instructions.
                </p>
                <button
                  type="button"
                  onClick={() => setResetEmailSent(false)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Didn't receive it? Try again
                </button>
              </div>
            )}
          </form>
        )}

        {mode === "reset-password" && (
          <form onSubmit={handleResetPassword} className="space-y-4" noValidate>
            <FormField
              name="resetToken"
              label="Reset Token"
              type="text"
              value={resetForm.data.resetToken}
              onChange={(e) => resetForm.setValue("resetToken", e.target.value)}
              onBlur={() => resetForm.setTouchedField("resetToken")}
              error={resetForm.errors.resetToken}
              touched={resetForm.touched.resetToken}
              placeholder="Enter the token from your email"
              required
              disabled={isLoading}
            />

            <FormField
              name="newPassword"
              label="New Password"
              value={resetForm.data.newPassword}
              onChange={(e) =>
                resetForm.setValue("newPassword", e.target.value)
              }
              onBlur={() => resetForm.setTouchedField("newPassword")}
              error={resetForm.errors.newPassword}
              touched={resetForm.touched.newPassword}
              showPasswordToggle
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              autoComplete="new-password"
              required
              disabled={isLoading}
            />

            <LoadingButton
              type="submit"
              isLoading={isLoading}
              loadingText="Resetting password..."
              disabled={!resetForm.isValid}
            >
              Reset Password
            </LoadingButton>
          </form>
        )}

        {/* Mode Switch Links */}
        <div className="mt-6 space-y-2 text-center">
          {mode === "login" ? (
            <button
              type="button"
              onClick={() => handleModeChange("forgot-password")}
              className="rounded text-sm text-blue-600 hover:underline focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
              disabled={isLoading}
            >
              Forgot your password?
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleModeChange("login")}
              className="rounded text-sm text-blue-600 hover:underline focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
              disabled={isLoading}
            >
              Back to sign in
            </button>
          )}

          {mode === "forgot-password" && resetEmailSent && (
            <div>
              <button
                type="button"
                onClick={() => handleModeChange("reset-password")}
                className="mx-auto block rounded text-sm text-blue-600 hover:underline focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                disabled={isLoading}
              >
                I have a reset token
              </button>
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Your connection is secured with industry-standard encryption
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
