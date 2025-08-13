import React, { useEffect, useMemo, useState } from "react";
import { useAdminApi } from "../../hooks/useAdminApi";

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}

const levelColors: Record<LogLevel, string> = {
  info: "text-blue-700 bg-blue-50",
  warn: "text-yellow-800 bg-yellow-50",
  error: "text-red-700 bg-red-50",
  debug: "text-gray-700 bg-gray-50",
};

const LogsViewer: React.FC = () => {
  const api = useAdminApi();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [level, setLevel] = useState<LogLevel | "all">("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const filtered = useMemo(
    () => (level === "all" ? logs : logs.filter((l) => l.level === level)),
    [logs, level],
  );

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.fetchLogs();
      if (res.success) {
        setLogs(res.logs as unknown as LogEntry[]);
      } else {
        setError("Failed to load logs");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load logs");
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = async () => {
    setClearing(true);
    try {
      const qs = level === "all" ? "" : `?level=${encodeURIComponent(level)}`;
      const res = await fetch(`/api/admin/logs${qs}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      await fetchLogs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to clear logs");
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">System Logs</h2>
        <div className="flex items-center space-x-2">
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as any)}
            className="rounded border px-2 py-1"
          >
            <option value="all">All</option>
            <option value="error">Error</option>
            <option value="warn">Warn</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
          <button
            onClick={fetchLogs}
            className="rounded bg-gray-200 px-3 py-1 hover:bg-gray-300"
            disabled={isLoading}
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            onClick={clearLogs}
            className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700"
            disabled={clearing}
          >
            {clearing ? "Clearing..." : "Clear"}
          </button>
        </div>
      </div>
      {error && (
        <div className="rounded bg-red-50 p-3 text-red-700">{error}</div>
      )}
      <div className="max-h-[600px] space-y-2 overflow-auto rounded border bg-white p-2">
        {filtered.length === 0 && <div className="text-gray-500">No logs</div>}
        {filtered.map((log, idx) => (
          <div
            key={idx}
            className={`rounded p-2 text-sm ${levelColors[log.level]}`}
          >
            <div className="flex justify-between">
              <span className="font-mono">{log.timestamp}</span>
              <span className="text-xs font-semibold uppercase">
                {log.level}
              </span>
            </div>
            <div>{log.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LogsViewer;
