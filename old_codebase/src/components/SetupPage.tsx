import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import FormField from "./forms/FormField";
import LoadingButton from "./forms/LoadingButton";
import ErrorAlert from "./forms/ErrorAlert";

const SetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "admin",
    email: "projectbarnlab@gmail.com",
    password: "",
    code: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSetup = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.username || !formData.password || !formData.code) {
        setError("Username, password, and code are required.");
        return;
      }
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/setup/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password,
            code: formData.code,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error || "An unknown error occurred during setup.",
          );
        }

        // After successful setup, redirect to the login page to sign in.
        navigate("/login");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Setup failed.");
      } finally {
        setIsLoading(false);
      }
    },
    [formData, navigate],
  );

  const requestCode = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/setup/request-code", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to request setup code.");
      }
      setCodeSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request code.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <Shield className="mx-auto mb-4 h-10 w-10 text-blue-600" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Initial Administrator Setup
          </h1>
          <p className="text-gray-600">
            Welcome! Let's create the first admin account.
          </p>
        </div>

        {error && (
          <ErrorAlert
            error={error}
            onDismiss={() => setError(null)}
            className="mb-6"
          />
        )}

        <form onSubmit={handleSetup} className="space-y-4" noValidate>
          {!codeSent && (
            <div className="mb-4">
              <p className="mb-2 text-sm text-gray-600">
                We will send a one-time setup code to the admin email.
              </p>
              <LoadingButton
                type="button"
                isLoading={isLoading}
                onClick={requestCode}
              >
                Send Setup Code
              </LoadingButton>
            </div>
          )}

          <FormField
            name="username"
            label="Admin Username"
            type="text"
            value={formData.username}
            onChange={handleInputChange}
            required
            disabled={isLoading}
          />
          <FormField
            name="email"
            label="Admin Email"
            type="email"
            value={formData.email}
            readOnly
            disabled
            required
          />
          <FormField
            name="password"
            label="Admin Password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            required
            disabled={isLoading}
          />
          <FormField
            name="code"
            label="One-Time Setup Code"
            type="text"
            value={formData.code}
            onChange={handleInputChange}
            required
            disabled={isLoading}
          />
          <LoadingButton
            type="submit"
            isLoading={isLoading}
            loadingText="Creating Account..."
            disabled={isLoading}
          >
            Create Admin Account
          </LoadingButton>
        </form>
      </div>
    </div>
  );
};

export default SetupPage;
