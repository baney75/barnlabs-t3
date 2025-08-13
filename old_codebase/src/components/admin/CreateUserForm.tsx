// src/components/admin/CreateUserForm.tsx
import React, { useState } from "react";
import { useAdminApi } from "../../hooks/useAdminApi";
import { useAdmin } from "../../hooks/useAdmin";
import { Loader2 } from "lucide-react";

const CreateUserForm: React.FC = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isLoading, setIsLoading] = useState(false);
  const adminApi = useAdminApi();
  const { dispatch } = useAdmin();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.email || !formData.password) {
      setMessage({ type: "error", text: "All fields are required." });
      return;
    }
    setIsLoading(true);
    setMessage({ type: "info", text: "Creating user..." });

    try {
      const result = await adminApi.createUser(formData);
      setMessage({ type: "success", text: result.message });
      setFormData({ username: "", email: "", password: "" });

      const usersResponse = await adminApi.fetchUsers();
      if (usersResponse.success) {
        dispatch({ type: "SET_USERS", payload: usersResponse.users });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Creation failed";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <h3 className="mb-4 text-xl font-semibold text-gray-800">
        Create New User
      </h3>
      <form onSubmit={handleCreateUser} className="space-y-4">
        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium text-gray-700"
          >
            Username
          </label>
          <input
            id="username"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            required
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            required
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "Create User"
          )}
        </button>
      </form>
      {message.text && (
        <div
          className={`mt-4 rounded-md p-3 text-center text-sm font-semibold ${
            message.type === "error"
              ? "bg-red-100 text-red-700"
              : message.type === "success"
                ? "bg-green-100 text-green-700"
                : "bg-blue-100 text-blue-700"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
};

export default CreateUserForm;
