// src/components/admin/AdminStats.tsx
import React, { useEffect, useState } from "react";
import {
  Users,
  HardDrive,
  Activity,
  Database,
  TrendingUp,
  RefreshCw,
  FileText,
  Image,
  Video,
  Box,
  Share2,
  Clock,
  AlertCircle,
  Cloud,
  Zap,
  Server,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  Legend,
} from "recharts";

interface StatsData {
  users: number;
  assets: number;
  models: number;
  images: number;
  videos: number;
  documents: number;
  totalSize: number;
  shares: number;
  activeShares: number;
  recentActivity: Array<{
    id: string;
    type: "upload" | "share" | "user" | "delete" | "view";
    message: string;
    timestamp: string;
    user?: string;
  }>;
  storageByType: {
    model: number;
    image: number;
    video: number;
    document: number;
  };
  userGrowth: Array<{ date: string; count: number }>;
  assetGrowth: Array<{ date: string; count: number }>;
  cloudflare?: {
    r2Buckets: number;
    r2BucketNames: string[];
    bandwidth?: number;
    requests?: number;
  };
  performance?: {
    avgLoadTime: number;
    uptime: number;
    errorRate: number;
  };
  modelViews?: Array<{ date: string; views: number; arViews: number }>;
}

const AdminStats: React.FC = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("7d");

  const fetchStats = async () => {
    try {
      setError(null);
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token");

      const response = await fetch(`/api/admin/stats?range=${timeRange}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        // Tolerate 500s with a friendly message
        throw new Error("Failed to fetch stats");
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch stats");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [timeRange]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4">
        <div className="flex items-center">
          <AlertCircle className="mr-2 h-5 w-5 text-red-400" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const storageData = Object.entries(stats.storageByType).map(
    ([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: value,
      percentage: (value / stats.totalSize) * 100,
    }),
  );

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

  const activityTypeIcons = {
    upload: <Upload className="h-4 w-4" />,
    share: <Share2 className="h-4 w-4" />,
    user: <Users className="h-4 w-4" />,
    delete: <AlertCircle className="h-4 w-4" />,
    view: <Eye className="h-4 w-4" />,
  };

  const activityTypeColors = {
    upload: "text-green-600 bg-green-100",
    share: "text-blue-600 bg-blue-100",
    user: "text-purple-600 bg-purple-100",
    delete: "text-red-600 bg-red-100",
    view: "text-yellow-600 bg-yellow-100",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header with Controls */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Dashboard Overview
          </h2>
          <p className="mt-1 text-gray-600">
            Real-time analytics and system performance
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex rounded-lg bg-gray-100 p-1">
            {(["24h", "7d", "30d"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  timeRange === range
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {range === "24h"
                  ? "24 Hours"
                  : range === "7d"
                    ? "7 Days"
                    : "30 Days"}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-lg border border-gray-200 bg-white p-2 transition-colors hover:bg-gray-50 disabled:opacity-50"
            title="Refresh stats"
          >
            <RefreshCw
              className={`h-5 w-5 text-gray-600 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-100">Total Users</p>
              <p className="mt-2 text-3xl font-bold">
                {formatNumber(stats.users)}
              </p>
              {stats.userGrowth.length > 1 && (
                <p className="mt-2 text-sm text-blue-100">
                  +
                  {stats.userGrowth[stats.userGrowth.length - 1].count -
                    stats.userGrowth[0].count}{" "}
                  this period
                </p>
              )}
            </div>
            <div className="rounded-lg bg-white/20 p-3">
              <Users className="h-8 w-8" />
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="rounded-xl bg-gradient-to-br from-green-500 to-green-600 p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-100">Total Assets</p>
              <p className="mt-2 text-3xl font-bold">
                {formatNumber(stats.assets)}
              </p>
              <p className="mt-2 text-sm text-green-100">
                {stats.models} models • {stats.images} images
              </p>
            </div>
            <div className="rounded-lg bg-white/20 p-3">
              <Database className="h-8 w-8" />
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-100">
                Active Shares
              </p>
              <p className="mt-2 text-3xl font-bold">
                {formatNumber(stats.activeShares)}
              </p>
              <p className="mt-2 text-sm text-purple-100">
                {stats.shares} total shares
              </p>
            </div>
            <div className="rounded-lg bg-white/20 p-3">
              <Share2 className="h-8 w-8" />
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-100">
                Storage Used
              </p>
              <p className="mt-2 text-3xl font-bold">
                {formatBytes(stats.totalSize)}
              </p>
              <p className="mt-2 text-sm text-orange-100">Across all assets</p>
            </div>
            <div className="rounded-lg bg-white/20 p-3">
              <HardDrive className="h-8 w-8" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Performance Metrics */}
      {stats.performance && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            System Performance
          </h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center">
                <svg className="h-24 w-24 -rotate-90 transform">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-200"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${stats.performance.uptime * 2.51} 251`}
                    className="text-green-500"
                  />
                </svg>
                <span className="absolute text-2xl font-bold">
                  {stats.performance.uptime}%
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600">Uptime</p>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {stats.performance.avgLoadTime.toFixed(2)}s
              </div>
              <p className="mt-2 text-sm text-gray-600">Avg Load Time</p>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {stats.performance.errorRate.toFixed(2)}%
              </div>
              <p className="mt-2 text-sm text-gray-600">Error Rate</p>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* User Growth Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            User Growth
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={stats.userGrowth}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#3B82F6"
                fillOpacity={1}
                fill="url(#colorUsers)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Storage Distribution */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Storage Distribution
          </h3>
          <div className="flex items-center justify-between">
            <ResponsiveContainer width="50%" height={250}>
              <PieChart>
                <Pie
                  data={storageData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {storageData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatBytes(value)} />
              </PieChart>
            </ResponsiveContainer>

            <div className="space-y-3">
              {storageData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-3">
                  <div
                    className="h-4 w-4 rounded"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">
                      {entry.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatBytes(entry.value)} ({entry.percentage.toFixed(1)}
                      %)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Model Views Chart */}
      {stats.modelViews && stats.modelViews.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Model Views & AR Sessions
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.modelViews}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="views"
                stroke="#3B82F6"
                strokeWidth={2}
                name="Total Views"
                dot={{ fill: "#3B82F6", r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="arViews"
                stroke="#10B981"
                strokeWidth={2}
                name="AR Views"
                dot={{ fill: "#10B981", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cloudflare Integration */}
      {stats.cloudflare && (
        <div className="rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-white shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xl font-semibold">
              <Cloud className="h-6 w-6" />
              Cloudflare Integration
            </h3>
            <Zap className="h-8 w-8 opacity-20" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-orange-100">R2 Buckets</p>
              <p className="text-2xl font-bold">{stats.cloudflare.r2Buckets}</p>
            </div>
            <div>
              <p className="text-sm text-orange-100">Active Buckets</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {stats.cloudflare.r2BucketNames.map((bucket) => (
                  <span
                    key={bucket}
                    className="rounded bg-white/20 px-2 py-1 text-xs font-medium"
                  >
                    {bucket}
                  </span>
                ))}
              </div>
            </div>
            {stats.cloudflare.bandwidth && (
              <div>
                <p className="text-sm text-orange-100">Bandwidth Used</p>
                <p className="text-2xl font-bold">
                  {formatBytes(stats.cloudflare.bandwidth)}
                </p>
              </div>
            )}
            {stats.cloudflare.requests && (
              <div>
                <p className="text-sm text-orange-100">API Requests</p>
                <p className="text-2xl font-bold">
                  {formatNumber(stats.cloudflare.requests)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Activity
          </h3>
          <Activity className="h-5 w-5 text-gray-400" />
        </div>

        <div className="max-h-96 space-y-3 overflow-y-auto">
          <AnimatePresence initial={false}>
            {stats.recentActivity.map((activity) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100"
              >
                <div
                  className={`rounded-lg p-2 ${
                    activityTypeColors[activity.type]
                  }`}
                >
                  {activityTypeIcons[activity.type]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.message}
                  </p>
                  {activity.user && (
                    <p className="mt-1 text-xs text-gray-500">
                      by {activity.user}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {stats.recentActivity.length === 0 && (
            <p className="py-8 text-center text-gray-500">No recent activity</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AdminStats;
