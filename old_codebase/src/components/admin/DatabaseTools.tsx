import React, { useCallback, useEffect, useState } from "react";
import {
  Database,
  RefreshCw,
  Trash2,
  ShieldCheck,
  Activity,
  Download,
} from "lucide-react";
import { useAdminApi } from "../../hooks/useAdminApi";

interface DbStatus {
  success: boolean;
  tables: Array<{
    name: string;
    rows: number;
    indexes?: number;
    columns?: number;
  }>;
  sizeBytes?: number;
  migrations?: Array<{ version: string; applied_at: string }>;
}

const DatabaseTools: React.FC = () => {
  const api = useAdminApi();
  const [status, setStatus] = useState<DbStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.dbStatus();
      setStatus(data as DbStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load status");
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const run = async (fn: () => Promise<any>) => {
    setMessage(null);
    setError(null);
    try {
      const data = await fn();
      setMessage((data && data.message) || "Done");
      await fetchStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const exportDb = async () => {
    setMessage(null);
    setError(null);
    try {
      const blob = await api.dbExport();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage("Export downloaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="text-indigo-600" />
          <h2 className="text-2xl font-bold text-gray-900">Database</h2>
        </div>
        <button
          onClick={fetchStatus}
          className="flex items-center gap-2 rounded bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
          disabled={isLoading}
        >
          <RefreshCw className={isLoading ? "animate-spin" : ""} size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded bg-green-50 p-3 text-sm text-green-700">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-lg font-semibold">Status</h3>
          {!status ? (
            <div className="text-sm text-gray-600">No status loaded</div>
          ) : (
            <div className="space-y-2 text-sm">
              {status.sizeBytes !== undefined && (
                <div>
                  <span className="font-medium">Estimated Size:</span>{" "}
                  {status.sizeBytes.toLocaleString()} bytes
                </div>
              )}
              <div>
                <span className="font-medium">Tables:</span>
                <ul className="mt-2 space-y-1">
                  {status.tables.map((t) => (
                    <li
                      key={t.name}
                      className="flex justify-between rounded border px-2 py-1"
                    >
                      <span className="font-mono">{t.name}</span>
                      <span>{t.rows} rows</span>
                    </li>
                  ))}
                </ul>
              </div>
              {status.migrations && (
                <div>
                  <span className="font-medium">Migrations:</span>
                  <ul className="mt-2 space-y-1">
                    {status.migrations.map((m, i) => (
                      <li
                        key={i}
                        className="flex justify-between rounded border px-2 py-1 text-xs"
                      >
                        <span>{m.version}</span>
                        <span className="text-gray-600">
                          {new Date(m.applied_at).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-lg font-semibold">Maintenance</h3>
          <div className="space-y-2">
            <button
              onClick={() => run(api.dbCleanup)}
              className="flex w-full items-center justify-center gap-2 rounded bg-red-600 px-3 py-2 text-white hover:bg-red-700"
            >
              <Trash2 size={16} /> Cleanup Orphans & Expired Tokens
            </button>
            <button
              onClick={() => run(api.dbEnsureSchema)}
              className="flex w-full items-center justify-center gap-2 rounded bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700"
            >
              <ShieldCheck size={16} /> Ensure Schema
            </button>
            <button
              onClick={() => run(api.dbAnalyze)}
              className="flex w-full items-center justify-center gap-2 rounded bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700"
            >
              <Activity size={16} /> Analyze & Vacuum
            </button>
            <button
              onClick={exportDb}
              className="flex w-full items-center justify-center gap-2 rounded bg-gray-800 px-3 py-2 text-white hover:bg-gray-900"
            >
              <Download size={16} /> Export JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseTools;
