// src/components/admin/AdminLayout.tsx - Enhanced Admin Interface
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Users,
  HardDrive,
  BarChart3,
  LogOut,
  Menu,
  X,
  Database as DbIcon,
  Cloud,
  Home,
  Settings,
  Activity,
  Shield,
  Bell,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AdminProvider } from "../../contexts/AdminContext";
import { useAdmin } from "../../hooks/useAdmin";
import { useAdminApi } from "../../hooks/useAdminApi";
import type { AdminTab } from "../../types";

import UserManagement from "./UserManagement";
import AssetManagement from "./AssetManagement";
import LogsViewer from "./LogsViewer";
import AdminDashboard from "./AdminDashboard";
import DatabaseTools from "./DatabaseTools";
import CloudflareManager from "./CloudflareManager";

type ExtendedAdminTab = AdminTab | "settings" | "database" | "cloudflare";

const tabs: {
  id: ExtendedAdminTab;
  label: string;
  icon: React.ReactNode;
  description: string;
  badge?: string;
}[] = [
  {
    id: "stats",
    label: "Dashboard",
    icon: <BarChart3 size={20} />,
    description: "System overview and analytics",
  },
  {
    id: "users",
    label: "Users",
    icon: <Users size={20} />,
    description: "Manage user accounts and permissions",
  },
  {
    id: "assets",
    label: "Assets",
    icon: <HardDrive size={20} />,
    description: "Manage files and 3D models",
  },
  {
    id: "logs",
    label: "Activity",
    icon: <Activity size={20} />,
    description: "System logs and audit trail",
  },
  {
    id: "database",
    label: "Database",
    icon: <DbIcon size={20} />,
    description: "Database management tools",
  },
  {
    id: "cloudflare",
    label: "Infrastructure",
    icon: <Cloud size={20} />,
    description: "Cloudflare services and CDN",
  },
  {
    id: "settings",
    label: "Settings",
    icon: <Settings size={20} />,
    description: "System configuration",
  },
];

function AdminContent() {
  const { state, dispatch } = useAdmin();
  const navigate = useNavigate();
  const adminApi = useAdminApi();
  const params = useParams<{ tab?: string }>();
  const currentTab: ExtendedAdminTab =
    (params.tab as ExtendedAdminTab) || "stats";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifItems, setNotifItems] = useState<any[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [currentTab]);

  // Remove aggressive data fetching from layout - let individual components handle their own data
  useEffect(() => {
    // Only set initial loading state, let components fetch their own data
    dispatch({ type: "SET_LOADING", payload: false });
  }, [dispatch]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const fetchNotifications = async () => {
    setNotifLoading(true);
    setNotifError(null);
    try {
      const res = await adminApi.fetchLogs();
      if (res.success) {
        const logs = (res.logs || []) as Array<{
          timestamp?: string;
          level?: string;
          message?: string;
        }>;
        // Show the most recent 10 entries
        const recent = logs.slice(0, 10);
        setNotifItems(recent);
      } else {
        setNotifError("Failed to load notifications");
      }
    } catch (e) {
      setNotifError(
        e instanceof Error ? e.message : "Failed to load notifications",
      );
    } finally {
      setNotifLoading(false);
    }
  };

  // Content is selected directly by currentTab further below

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 border-b border-white/20 bg-white/80 shadow-lg backdrop-blur-lg"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                className="rounded-xl p-2 transition-colors hover:bg-white/50 lg:hidden"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Toggle navigation"
              >
                <motion.div
                  animate={{ rotate: sidebarOpen ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                </motion.div>
              </button>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-xl font-bold text-transparent">
                    BARN Admin
                  </h1>
                  <p className="hidden text-xs text-gray-500 sm:block">
                    System Management
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Quick Search */}
              <div className="relative hidden md:flex">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <input
                  type="text"
                  placeholder="Quick search..."
                  className="rounded-lg border border-gray-200 bg-white/50 py-2 pr-4 pl-10 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* Notifications */}
              <div className="relative">
                <button
                  className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-white/50 hover:text-gray-700"
                  onClick={async () => {
                    const next = !notifOpen;
                    setNotifOpen(next);
                    if (next && notifItems.length === 0 && !notifLoading) {
                      await fetchNotifications();
                    }
                  }}
                  aria-haspopup="menu"
                  aria-expanded={notifOpen}
                >
                  <Bell size={20} />
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
                </button>
                {notifOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                    <div className="border-b bg-gray-50 px-4 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-800">
                          Notifications
                        </span>
                        <button
                          onClick={() => setNotifOpen(false)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-auto">
                      {notifLoading && (
                        <div className="p-4 text-sm text-gray-600">
                          Loading…
                        </div>
                      )}
                      {notifError && (
                        <div className="p-4 text-sm text-red-600">
                          {notifError}
                        </div>
                      )}
                      {!notifLoading &&
                        !notifError &&
                        notifItems.length === 0 && (
                          <div className="p-4 text-sm text-gray-600">
                            No recent activity
                          </div>
                        )}
                      {!notifLoading &&
                        !notifError &&
                        notifItems.length > 0 && (
                          <ul className="divide-y divide-gray-100">
                            {notifItems.map((n, idx) => (
                              <li key={idx} className="p-3 hover:bg-gray-50">
                                <div className="truncate text-sm text-gray-900">
                                  {n.message || "Activity"}
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                                  <span className="capitalize">
                                    {n.level || "info"}
                                  </span>
                                  {n.timestamp && (
                                    <span>
                                      • {new Date(n.timestamp).toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                    </div>
                    <div className="border-t bg-gray-50 px-4 py-2 text-right">
                      <button
                        onClick={async () => {
                          await fetchNotifications();
                        }}
                        className="text-xs text-purple-600 hover:text-purple-700"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Go Home */}
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white/70 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-white"
              >
                <Home size={16} />
                <span className="hidden sm:inline">Home</span>
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all duration-200 hover:from-red-600 hover:to-red-700"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Layout: Sidebar + Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex gap-6">
          {/* Modern Sidebar */}
          <AnimatePresence>
            {(sidebarOpen ||
              (typeof window !== "undefined" && window.innerWidth >= 1024)) && (
              <motion.aside
                initial={{ x: -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="sticky top-24 h-fit w-64 rounded-2xl border border-white/20 bg-white/70 p-6 shadow-xl backdrop-blur-lg lg:w-72"
              >
                <nav className="space-y-2">
                  {tabs.map((tab) => {
                    const isActive = currentTab === tab.id;
                    return (
                      <motion.button
                        key={tab.id}
                        onClick={() => navigate(`/admin/${tab.id}`)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`group w-full rounded-xl p-4 text-left transition-all duration-200 ${
                          isActive
                            ? "bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-lg"
                            : "text-gray-700 hover:bg-white/80 hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`${isActive ? "text-white" : "text-gray-500 group-hover:text-purple-500"} transition-colors`}
                          >
                            {tab.icon}
                          </div>
                          <div className="flex-1">
                            <div
                              className={`font-medium ${isActive ? "text-white" : "text-gray-900"}`}
                            >
                              {tab.label}
                            </div>
                            <div
                              className={`text-xs ${isActive ? "text-purple-100" : "text-gray-500"}`}
                            >
                              {tab.description}
                            </div>
                          </div>
                          {tab.badge && (
                            <span className="rounded-full bg-red-500 px-2 py-1 text-xs text-white">
                              {tab.badge}
                            </span>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </nav>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Main Content */}
          <main className="min-w-0 flex-1">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl border border-white/20 bg-white/70 p-8 text-gray-900 shadow-xl backdrop-blur-lg"
            >
              {state.isLoading && (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
                    <p className="text-lg font-medium text-gray-600">
                      Loading admin data...
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                      This may take a moment
                    </p>
                  </div>
                </div>
              )}

              {state.error && (
                <div className="mb-6">
                  <div className="rounded-xl border border-red-200 bg-red-50 p-6">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-6 w-6 text-red-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="mb-1 text-sm font-medium text-red-800">
                          Admin Data Loading Error
                        </h3>
                        <p className="text-sm text-red-700">{state.error}</p>
                        <button
                          onClick={() => window.location.reload()}
                          className="mt-3 rounded-md bg-red-100 px-3 py-1 text-sm text-red-800 transition-colors hover:bg-red-200"
                        >
                          Refresh Page
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!state.isLoading &&
                !state.error &&
                (() => {
                  switch (currentTab) {
                    case "stats":
                      return <AdminDashboard />;
                    case "users":
                      return <UserManagement />;
                    case "assets":
                      return <AssetManagement />;
                    case "logs":
                      return <LogsViewer />;
                    case "database":
                      return <DatabaseTools />;
                    case "cloudflare":
                      return (
                        <CloudflareManager
                          token={localStorage.getItem("token") || ""}
                        />
                      );
                    case "settings":
                      return <SettingsPanel />;
                    default:
                      return <AdminDashboard />;
                  }
                })()}
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white/80 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          System Settings
        </h2>
        <p className="text-gray-600">
          Configuration options will be available here.
        </p>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <AdminProvider>
      <AdminContent />
    </AdminProvider>
  );
}
