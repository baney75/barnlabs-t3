// src/components/admin/CloudflareManager.tsx
import React, { useState, useEffect } from "react";
import {
  Cloud,
  Database,
  Server,
  Key,
  FileText,
  Shield,
  Activity,
  Users,
  BarChart3,
  Settings,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Globe,
  Cpu,
  HardDrive,
  Layers,
  Eye,
  Zap,
  Lock,
} from "lucide-react";

interface CloudflareManagerProps {
  token: string;
}

const CloudflareManager: React.FC<CloudflareManagerProps> = ({ token }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // State for different sections
  const [overview, setOverview] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [aiModels, setAiModels] = useState<any>(null);
  const [selectedDatabase, setSelectedDatabase] = useState<string>("");
  const [sqlQuery, setSqlQuery] = useState<string>("");
  const [queryResult, setQueryResult] = useState<any>(null);
  const [workerLogs, setWorkerLogs] = useState<any>(null);
  const [selectedWorker, setSelectedWorker] = useState<string>("");

  // Fetch functions
  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings/cf/overview", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
        if (data.workers?.length > 0 && !selectedWorker) {
          setSelectedWorker(data.workers[0].id);
        }
        if (data.d1Databases?.length > 0 && !selectedDatabase) {
          setSelectedDatabase(data.d1Databases[0].uuid);
        }
      }
    } catch (e) {
      setError("Failed to fetch overview");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/admin/settings/cf/analytics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAnalytics(await res.json());
    } catch (e) {
      console.error("Failed to fetch analytics:", e);
    }
  };

  const fetchAIModels = async () => {
    try {
      const res = await fetch("/api/admin/settings/cf/workers-ai", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAiModels(await res.json());
    } catch (e) {
      console.error("Failed to fetch AI models:", e);
    }
  };

  const fetchWorkerLogs = async (scriptName: string) => {
    if (!scriptName) return;
    try {
      const res = await fetch(
        `/api/admin/settings/cf/workers/${scriptName}/logs`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) setWorkerLogs(await res.json());
    } catch (e) {
      console.error("Failed to fetch worker logs:", e);
    }
  };

  const executeD1Query = async () => {
    if (!selectedDatabase || !sqlQuery) return;

    setLoading(true);
    setQueryResult(null);
    try {
      const res = await fetch(
        `/api/admin/settings/cf/d1/${selectedDatabase}/query?sql=${encodeURIComponent(sqlQuery)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      if (res.ok) {
        setQueryResult(data.result);
        setSuccess("Query executed successfully");
      } else {
        setError(data.error || "Query failed");
      }
    } catch (e) {
      setError("Failed to execute query");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchAnalytics();
    fetchAIModels();
  }, []);

  useEffect(() => {
    if (selectedWorker) {
      fetchWorkerLogs(selectedWorker);
    }
  }, [selectedWorker]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const TabButton: React.FC<{
    id: string;
    label: string;
    icon: React.ReactNode;
  }> = ({ id, label, icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-colors ${
        activeTab === id
          ? "bg-blue-600 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
  }> = ({ title, value, icon, color }) => (
    <div className={`rounded-lg border border-gray-200 bg-white p-6 shadow-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className={`rounded-lg p-3 ${color}`}>{icon}</div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-3 text-3xl font-bold">
          <Cloud className="h-8 w-8 text-orange-500" />
          Cloudflare Management
        </h1>
        <p className="mt-2 text-gray-600">
          Comprehensive control over your Cloudflare resources
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
          <XCircle className="h-5 w-5" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 p-4 text-green-700">
          <CheckCircle className="h-5 w-5" />
          {success}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        <TabButton
          id="overview"
          label="Overview"
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <TabButton
          id="r2"
          label="R2 Storage"
          icon={<HardDrive className="h-4 w-4" />}
        />
        <TabButton
          id="d1"
          label="D1 Database"
          icon={<Database className="h-4 w-4" />}
        />
        <TabButton
          id="workers"
          label="Workers"
          icon={<Cpu className="h-4 w-4" />}
        />
        <TabButton
          id="ai"
          label="Workers AI"
          icon={<Zap className="h-4 w-4" />}
        />
        <TabButton
          id="analytics"
          label="Analytics"
          icon={<Activity className="h-4 w-4" />}
        />
      </div>

      {/* Content */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        {loading && activeTab === "overview" && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === "overview" && overview && (
          <div className="space-y-6">
            <h2 className="mb-4 text-xl font-semibold">Account Overview</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Workers"
                value={overview.workers?.length || 0}
                icon={<Server className="h-6 w-6" />}
                color="bg-blue-100 text-blue-600"
              />
              <StatCard
                title="R2 Buckets"
                value={overview.r2Buckets?.length || 0}
                icon={<HardDrive className="h-6 w-6" />}
                color="bg-green-100 text-green-600"
              />
              <StatCard
                title="D1 Databases"
                value={overview.d1Databases?.length || 0}
                icon={<Database className="h-6 w-6" />}
                color="bg-purple-100 text-purple-600"
              />
              <StatCard
                title="KV Namespaces"
                value={overview.kvNamespaces?.length || 0}
                icon={<Key className="h-6 w-6" />}
                color="bg-yellow-100 text-yellow-600"
              />
            </div>

            {/* Quick Actions */}
            <div className="mt-6">
              <h3 className="mb-3 text-lg font-medium">Quick Actions</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <button
                  onClick={() => setActiveTab("r2")}
                  className="rounded-lg border border-gray-200 p-4 text-left hover:bg-gray-50"
                >
                  <HardDrive className="mb-2 h-6 w-6 text-green-600" />
                  <h4 className="font-medium">Configure R2 CORS</h4>
                  <p className="text-sm text-gray-600">
                    Set up CORS for AR/VR support
                  </p>
                </button>
                <button
                  onClick={() => setActiveTab("d1")}
                  className="rounded-lg border border-gray-200 p-4 text-left hover:bg-gray-50"
                >
                  <Database className="mb-2 h-6 w-6 text-purple-600" />
                  <h4 className="font-medium">Query D1 Database</h4>
                  <p className="text-sm text-gray-600">
                    Run SQL queries on your databases
                  </p>
                </button>
                <button
                  onClick={() => setActiveTab("workers")}
                  className="rounded-lg border border-gray-200 p-4 text-left hover:bg-gray-50"
                >
                  <Activity className="mb-2 h-6 w-6 text-blue-600" />
                  <h4 className="font-medium">View Worker Logs</h4>
                  <p className="text-sm text-gray-600">
                    Monitor worker performance
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* R2 Storage Tab */}
        {activeTab === "r2" && overview && (
          <div className="space-y-6">
            <h2 className="mb-4 text-xl font-semibold">
              R2 Storage Management
            </h2>

            {overview.r2Buckets?.length > 0 ? (
              <div className="space-y-4">
                {overview.r2Buckets.map((bucket: any) => (
                  <div
                    key={bucket.name}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium">{bucket.name}</h3>
                        <p className="text-sm text-gray-600">
                          Created:{" "}
                          {new Date(bucket.creation_date).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(
                              `/api/admin/settings/cf/r2/${bucket.name}/cors`,
                              {
                                method: "PUT",
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                  "Content-Type": "application/json",
                                },
                              },
                            );
                            if (res.ok) {
                              setSuccess(`CORS configured for ${bucket.name}`);
                            } else {
                              setError("Failed to configure CORS");
                            }
                          } catch {
                            setError("Failed to configure CORS");
                          }
                        }}
                        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                      >
                        Configure CORS for AR
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No R2 buckets found</p>
            )}

            <div className="mt-6 rounded-lg bg-blue-50 p-4">
              <h4 className="mb-2 font-medium text-blue-900">
                CORS Configuration for AR/VR
              </h4>
              <p className="text-sm text-blue-800">
                Clicking "Configure CORS for AR" will set the following rules:
              </p>
              <ul className="mt-2 list-inside list-disc text-sm text-blue-700">
                <li>Allow all origins (*)</li>
                <li>Allow GET, HEAD, PUT, POST methods</li>
                <li>Allow all headers</li>
                <li>Expose ETag header</li>
                <li>Max age: 3600 seconds</li>
              </ul>
            </div>
          </div>
        )}

        {/* D1 Database Tab */}
        {activeTab === "d1" && overview && (
          <div className="space-y-6">
            <h2 className="mb-4 text-xl font-semibold">D1 Database Query</h2>

            {overview.d1Databases?.length > 0 ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Select Database
                  </label>
                  <select
                    value={selectedDatabase}
                    onChange={(e) => setSelectedDatabase(e.target.value)}
                    className="w-full rounded border border-gray-300 p-2"
                  >
                    {overview.d1Databases.map((db: any) => (
                      <option key={db.uuid} value={db.uuid}>
                        {db.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    SQL Query
                  </label>
                  <textarea
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    placeholder="SELECT * FROM users LIMIT 10"
                    className="w-full rounded border border-gray-300 p-3 font-mono text-sm"
                    rows={6}
                  />
                </div>

                <button
                  onClick={executeD1Query}
                  disabled={!sqlQuery || loading}
                  className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Executing..." : "Execute Query"}
                </button>

                {queryResult && (
                  <div className="mt-4">
                    <h4 className="mb-2 font-medium">Query Result</h4>
                    <div className="max-h-96 overflow-auto rounded bg-gray-50 p-4">
                      <pre className="text-sm">
                        {JSON.stringify(queryResult, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-600">No D1 databases found</p>
            )}
          </div>
        )}

        {/* Workers Tab */}
        {activeTab === "workers" && overview && (
          <div className="space-y-6">
            <h2 className="mb-4 text-xl font-semibold">Workers & Logs</h2>

            {overview.workers?.length > 0 ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Select Worker
                  </label>
                  <select
                    value={selectedWorker}
                    onChange={(e) => setSelectedWorker(e.target.value)}
                    className="w-full rounded border border-gray-300 p-2"
                  >
                    {overview.workers.map((worker: any) => (
                      <option key={worker.id} value={worker.id}>
                        {worker.id}
                      </option>
                    ))}
                  </select>
                </div>

                {workerLogs?.analytics && (
                  <div>
                    <h4 className="mb-2 font-medium">Worker Analytics</h4>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="rounded bg-gray-50 p-4">
                        <p className="text-sm text-gray-600">Total Requests</p>
                        <p className="text-xl font-bold">
                          {workerLogs.analytics
                            .reduce(
                              (sum: number, a: any) => sum + (a.requests || 0),
                              0,
                            )
                            .toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded bg-gray-50 p-4">
                        <p className="text-sm text-gray-600">Total Errors</p>
                        <p className="text-xl font-bold">
                          {workerLogs.analytics
                            .reduce(
                              (sum: number, a: any) => sum + (a.errors || 0),
                              0,
                            )
                            .toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded bg-gray-50 p-4">
                        <p className="text-sm text-gray-600">Avg CPU Time</p>
                        <p className="text-xl font-bold">
                          {(
                            workerLogs.analytics.reduce(
                              (sum: number, a: any) => sum + (a.cpuTime || 0),
                              0,
                            ) / Math.max(workerLogs.analytics.length, 1)
                          ).toFixed(2)}
                          ms
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-600">No workers found</p>
            )}
          </div>
        )}

        {/* Workers AI Tab */}
        {activeTab === "ai" && aiModels && (
          <div className="space-y-6">
            <h2 className="mb-4 text-xl font-semibold">Workers AI Models</h2>

            {aiModels.models?.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {aiModels.models.slice(0, 9).map((model: any) => (
                  <div
                    key={model.name}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <h4 className="font-medium">{model.name}</h4>
                    <p className="mt-1 text-sm text-gray-600">
                      {model.description}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {model.properties?.map((prop: string) => (
                        <span
                          key={prop}
                          className="rounded bg-gray-100 px-2 py-1 text-xs"
                        >
                          {prop}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No AI models available</p>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && analytics && (
          <div className="space-y-6">
            <h2 className="mb-4 text-xl font-semibold">
              Account Analytics & Audit Logs
            </h2>

            {analytics.auditLogs?.length > 0 && (
              <div>
                <h3 className="mb-3 font-medium">Recent Audit Logs</h3>
                <div className="space-y-2">
                  {analytics.auditLogs.map((log: any, i: number) => (
                    <div
                      key={i}
                      className="rounded-lg border border-gray-200 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium">
                          {log.action?.type || "Unknown Action"}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(log.when).toLocaleString()}
                        </span>
                      </div>
                      {log.resource && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Resource:</span>{" "}
                          {log.resource.type} -{" "}
                          {log.resource.name || log.resource.id}
                        </div>
                      )}
                      {log.actor && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Actor:</span>{" "}
                          {log.actor.email || log.actor.id}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CloudflareManager;
