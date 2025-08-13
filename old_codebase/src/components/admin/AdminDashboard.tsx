// src/components/admin/AdminDashboard.tsx - Enhanced Admin Dashboard
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  FileText,
  Box,
  HardDrive,
  Activity,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Database,
  Upload,
  Download,
  RefreshCw,
  Loader2,
  Share2,
  Trash2,
  Globe,
  Shield,
  Zap,
  Eye,
  UserPlus,
  FolderPlus,
} from "lucide-react";
import { motion } from "framer-motion";
import StatsOverview from "../dashboard/StatsOverview";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

interface AdminStats {
  users: number;
  assets: number;
  models: number;
  images: number;
  videos: number;
  documents: number;
  totalSize: number;
  shares: number;
  activeShares: number;
  recentActivity: ActivityItem[];
  storageByType: Record<string, number>;
  userGrowth: { date: string; count: number }[];
  assetGrowth: { date: string; count: number }[];
}

interface ActivityItem {
  id: string;
  type: "upload" | "share" | "user" | "delete";
  message: string;
  timestamp: string;
  user?: string;
}

interface SystemHealth {
  database: "healthy" | "warning" | "error";
  storage: "healthy" | "warning" | "error";
  api: "healthy" | "warning" | "error";
  lastCheck: string;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const fetchStats = async () => {
    try {
      setError(null);
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login", { replace: true });
        throw new Error("No authentication token");
      }

      const response = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401 || response.status === 403) {
        navigate("/login", { replace: true });
        throw new Error("Session expired. Please log in again.");
      }

      if (response.status === 429) {
        throw new Error(
          "Too many requests. Please wait a moment and try again.",
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch stats: ${response.status} ${errorText || response.statusText}`,
        );
      }

      const data = await response.json();
      setStats(data || {});
    } catch (err) {
      console.error("AdminDashboard fetchStats error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch stats";
      setError(errorMessage);
    }
  };

  const fetchHealth = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/admin/health", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401 || response.status === 403) {
        navigate("/login", { replace: true });
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setHealth(data);
      }
    } catch {
      // Health check is optional, don't show error
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    await Promise.all([fetchStats(), fetchHealth()]);
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-5 w-5" />;
      case "warning":
        return <AlertCircle className="h-5 w-5" />;
      case "error":
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // Prepare chart data
  const storageChartData = {
    labels: ["Models", "Images", "Videos", "Documents"],
    datasets: [
      {
        label: "Storage Usage",
        data: [
          stats.storageByType?.model || 0,
          stats.storageByType?.image || 0,
          stats.storageByType?.video || 0,
          stats.storageByType?.document || 0,
        ],
        backgroundColor: [
          "rgba(59, 130, 246, 0.8)",
          "rgba(16, 185, 129, 0.8)",
          "rgba(251, 146, 60, 0.8)",
          "rgba(147, 51, 234, 0.8)",
        ],
        borderColor: [
          "rgb(59, 130, 246)",
          "rgb(16, 185, 129)",
          "rgb(251, 146, 60)",
          "rgb(147, 51, 234)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const growthChartData = {
    labels: stats.userGrowth?.map((item) => item.date) || [],
    datasets: [
      {
        label: "Users",
        data: stats.userGrowth?.map((item) => item.count) || [],
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
        fill: true,
      },
      {
        label: "Assets",
        data: stats.assetGrowth?.map((item) => item.count) || [],
        borderColor: "rgb(16, 185, 129)",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"
      >
        <div>
          <h1 className="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-3xl font-bold text-transparent">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-gray-500">System overview and analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/users")}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-white shadow-lg transition-all duration-200 hover:from-blue-600 hover:to-blue-700"
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Add User</span>
          </button>
          <button
            onClick={() => navigate("/admin/assets")}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-4 py-2 text-white shadow-lg transition-all duration-200 hover:from-green-600 hover:to-green-700"
          >
            <FolderPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Upload Asset</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white/80 px-4 py-2 text-gray-700 transition-all duration-200 hover:bg-white disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </motion.div>

      {/* Enhanced System Health */}
      {health && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-gray-100 bg-white/80 p-8 shadow-xl backdrop-blur-sm"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-green-600">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">System Health</h3>
              <p className="text-sm text-gray-500">
                Real-time system monitoring
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-6"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="h-6 w-6 text-blue-600" />
                  <span className="font-semibold text-gray-900">Database</span>
                </div>
                <div
                  className={`flex items-center gap-2 ${getHealthColor(health.database)}`}
                >
                  {getHealthIcon(health.database)}
                  <span className="font-medium capitalize">
                    {health.database}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-600">
                Connection status and response time
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 p-6"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <HardDrive className="h-6 w-6 text-purple-600" />
                  <span className="font-semibold text-gray-900">Storage</span>
                </div>
                <div
                  className={`flex items-center gap-2 ${getHealthColor(health.storage)}`}
                >
                  {getHealthIcon(health.storage)}
                  <span className="font-medium capitalize">
                    {health.storage}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-600">
                R2 bucket connectivity and performance
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 p-6"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="h-6 w-6 text-emerald-600" />
                  <span className="font-semibold text-gray-900">API</span>
                </div>
                <div
                  className={`flex items-center gap-2 ${getHealthColor(health.api)}`}
                >
                  {getHealthIcon(health.api)}
                  <span className="font-medium capitalize">{health.api}</span>
                </div>
              </div>
              <div className="text-xs text-gray-600">
                API endpoints and response times
              </div>
            </motion.div>
          </div>

          <div className="mt-6 flex items-center justify-between text-sm">
            <span className="text-gray-500">
              Last checked: {formatDate(health.lastCheck)}
            </span>
            <div className="flex items-center gap-2 text-green-600">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
              <span>Monitoring active</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Enhanced Key Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-xl"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
              <Users className="h-6 w-6" />
            </div>
            <TrendingUp className="h-5 w-5 text-blue-200" />
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold">{stats?.users || 0}</p>
            <p className="font-medium text-blue-100">Total Users</p>
            <p className="text-xs text-blue-200">Active accounts</p>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="rounded-2xl bg-gradient-to-br from-green-500 to-green-600 p-6 text-white shadow-xl"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
              <Box className="h-6 w-6" />
            </div>
            <TrendingUp className="h-5 w-5 text-green-200" />
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold">{stats?.assets || 0}</p>
            <p className="font-medium text-green-100">Total Assets</p>
            <p className="text-xs text-green-200">Files uploaded</p>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white shadow-xl"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
              <HardDrive className="h-6 w-6" />
            </div>
            <BarChart3 className="h-5 w-5 text-purple-200" />
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold">
              {formatBytes(stats?.totalStorage || 0).split(" ")[0]}
            </p>
            <p className="font-medium text-purple-100">
              {formatBytes(stats?.totalStorage || 0).split(" ")[1]} Used
            </p>
            <p className="text-xs text-purple-200">Storage consumed</p>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow-xl"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
              <Globe className="h-6 w-6" />
            </div>
            <Eye className="h-5 w-5 text-orange-200" />
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold">{stats?.models || 0}</p>
            <p className="font-medium text-orange-100">3D Models</p>
            <p className="text-xs text-orange-200">AR/VR ready</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Stats & Charts Overview */}
      <StatsOverview
        stats={stats}
        storageChartData={storageChartData}
        growthChartData={growthChartData}
        formatBytes={formatBytes}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      {/* Asset Breakdown */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold">Asset Breakdown</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-blue-50 p-4 text-center">
            <Box className="mx-auto mb-2 h-8 w-8 text-blue-600" />
            <p className="text-2xl font-bold text-gray-900">{stats.models}</p>
            <p className="text-sm text-gray-600">3D Models</p>
          </div>
          <div className="rounded-lg bg-green-50 p-4 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-green-600" />
            <p className="text-2xl font-bold text-gray-900">{stats.images}</p>
            <p className="text-sm text-gray-600">Images</p>
          </div>
          <div className="rounded-lg bg-orange-50 p-4 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-orange-600" />
            <p className="text-2xl font-bold text-gray-900">{stats.videos}</p>
            <p className="text-sm text-gray-600">Videos</p>
          </div>
          <div className="rounded-lg bg-purple-50 p-4 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-purple-600" />
            <p className="text-2xl font-bold text-gray-900">
              {stats.documents}
            </p>
            <p className="text-sm text-gray-600">Documents</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Clock className="h-5 w-5" />
          Recent Activity
        </h3>
        {stats.recentActivity && stats.recentActivity.length > 0 ? (
          <div className="space-y-3">
            {stats.recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
              >
                <div className="flex items-center gap-3">
                  {activity.type === "upload" && (
                    <Upload className="h-5 w-5 text-blue-600" />
                  )}
                  {activity.type === "share" && (
                    <Share2 className="h-5 w-5 text-green-600" />
                  )}
                  {activity.type === "user" && (
                    <Users className="h-5 w-5 text-purple-600" />
                  )}
                  {activity.type === "delete" && (
                    <Trash2 className="h-5 w-5 text-red-600" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{activity.message}</p>
                    {activity.user && (
                      <p className="text-xs text-gray-500">
                        by {activity.user}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  {formatDate(activity.timestamp)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-gray-500">No recent activity</p>
        )}
      </div>

      {/* Share Statistics */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold">Share Statistics</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Shares</p>
              <p className="text-2xl font-bold text-gray-900">{stats.shares}</p>
            </div>
            <Share2 className="h-8 w-8 text-blue-600" />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Shares</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.activeShares}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
