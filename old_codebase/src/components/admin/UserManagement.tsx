// src/components/admin/UserManagement.tsx
import React, { useState, useMemo, useEffect } from "react";
import { useAdmin } from "../../hooks/useAdmin";
import { useAdminApi } from "../../hooks/useAdminApi";
import CreateUserForm from "./CreateUserForm";
import UserTable from "./UserTable";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import type { AdminUser } from "../../types";

const UserManagement: React.FC = () => {
  const {
    state: { users },
    dispatch,
  } = useAdmin();
  const adminApi = useAdminApi();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch users data
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setError(null);
        const data = await adminApi.fetchUsers();
        if (data.success) {
          dispatch({ type: "SET_USERS", payload: data.users || [] });
        } else {
          setError("Failed to fetch users");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch users");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [adminApi, dispatch]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.fetchUsers();
      if (data.success) {
        dispatch({ type: "SET_USERS", payload: data.users || [] });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh users");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (user: AdminUser) =>
          !user.is_admin &&
          (user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())),
      ),
    [users, searchTerm],
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="mt-1 text-sm text-gray-600">
            Create, view, and manage user accounts and their dashboard settings.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Error Loading Users
              </h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-2 rounded-md bg-red-100 px-3 py-1 text-sm text-red-800 transition-colors hover:bg-red-200"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <CreateUserForm />
        </div>
        <div className="lg:col-span-2">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-4 text-xl font-semibold text-gray-800">
              Existing Users
            </h3>
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-purple-600" />
                  <p className="text-gray-600">Loading users...</p>
                </div>
              </div>
            ) : (
              <UserTable users={filteredUsers} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
