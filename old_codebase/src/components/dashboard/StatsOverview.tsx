import React from "react";
import { Users, FileText, Box, HardDrive } from "lucide-react";
import { Doughnut, Line } from "react-chartjs-2";
import StatsCard from "../ui/StatsCard";

export interface StorageChartData {
  labels: string[];
  datasets: any[]; // keep generic to avoid re-typing ChartJS payload here
}

export interface GrowthChartData {
  labels: string[];
  datasets: any[];
}

export interface StatsOverviewProps {
  stats: {
    users: number;
    assets: number;
    models: number;
    totalSize: number;
  };
  storageChartData: StorageChartData;
  growthChartData: GrowthChartData;
  formatBytes: (bytes: number) => string;
  onRefresh: () => void;
  refreshing: boolean;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({
  stats,
  storageChartData,
  growthChartData,
  formatBytes,
  onRefresh,
  refreshing,
}) => (
  <>
    {/* Top metric cards */}
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        label="Total Users"
        value={stats.users}
        icon={<Users className="h-8 w-8" />}
        iconColorClass="text-blue-600"
      />
      <StatsCard
        label="Total Assets"
        value={stats.assets}
        icon={<FileText className="h-8 w-8" />}
        iconColorClass="text-green-600"
      />
      <StatsCard
        label="3D Models"
        value={stats.models}
        icon={<Box className="h-8 w-8" />}
        iconColorClass="text-purple-600"
      />
      <StatsCard
        label="Storage Used"
        value={formatBytes(stats.totalSize)}
        icon={<HardDrive className="h-8 w-8" />}
        iconColorClass="text-orange-600"
      />
    </div>

    {/* Charts */}
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Storage Distribution</h3>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="text-sm text-blue-600 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
        <div className="h-64">
          <Doughnut
            data={storageChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: "bottom" } },
            }}
          />
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold">Growth Over Time</h3>
        <div className="h-64">
          <Line
            data={growthChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: "bottom" } },
            }}
          />
        </div>
      </div>
    </div>
  </>
);

export default StatsOverview;
