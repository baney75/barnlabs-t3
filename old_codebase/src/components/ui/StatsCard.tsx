import React from "react";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  iconColorClass?: string;
  className?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  label,
  value,
  icon,
  iconColorClass = "text-gray-600",
  className = "",
}) => (
  <div className={`rounded-lg bg-white p-6 shadow ${className}`.trim()}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      {icon && <div className={iconColorClass}>{icon}</div>}
    </div>
  </div>
);

export default StatsCard;
