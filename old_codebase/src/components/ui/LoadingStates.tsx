import React from "react";
import { motion } from "framer-motion";
import { Loader2, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";

// Skeleton Loading Components
export const SkeletonCard: React.FC<{ className?: string }> = ({
  className = "",
}) => (
  <div className={`card animate-pulse p-6 ${className}`}>
    <div className="flex items-center space-x-4">
      <div className="loading-shimmer h-12 w-12 rounded-lg bg-gray-200"></div>
      <div className="flex-1 space-y-2">
        <div className="loading-shimmer h-4 rounded bg-gray-200"></div>
        <div className="loading-shimmer h-3 w-2/3 rounded bg-gray-200"></div>
      </div>
    </div>
    <div className="mt-4 space-y-3">
      <div className="loading-shimmer h-3 rounded bg-gray-200"></div>
      <div className="loading-shimmer h-3 w-5/6 rounded bg-gray-200"></div>
      <div className="loading-shimmer h-3 w-4/6 rounded bg-gray-200"></div>
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => (
  <div className="card overflow-hidden">
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-6 py-3">
                <div className="loading-shimmer h-4 rounded bg-gray-200"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-6 py-4">
                  <div
                    className={`loading-shimmer h-4 rounded bg-gray-200 ${
                      colIndex === 0
                        ? "w-3/4"
                        : colIndex === columns - 1
                          ? "w-1/2"
                          : "w-full"
                    }`}
                  ></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const SkeletonGrid: React.FC<{ items?: number; className?: string }> = ({
  items = 6,
  className = "",
}) => (
  <div
    className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 ${className}`}
  >
    {Array.from({ length: items }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

// Loading Spinner Components
interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  color?: "primary" | "secondary" | "white";
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  color = "primary",
  className = "",
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12",
  };

  const colorClasses = {
    primary: "text-purple-600",
    secondary: "text-gray-600",
    white: "text-white",
  };

  return (
    <Loader2
      className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
    />
  );
};

interface LoadingOverlayProps {
  message?: string;
  submessage?: string;
  transparent?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = "Loading...",
  submessage,
  transparent = false,
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className={`fixed inset-0 z-50 flex items-center justify-center ${
      transparent ? "bg-black/20 backdrop-blur-sm" : "bg-white"
    }`}
  >
    <div className="text-center">
      <div className="mb-4 flex justify-center">
        <div className="relative">
          <div className="h-16 w-16 animate-pulse rounded-full border-4 border-purple-200"></div>
          <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
        </div>
      </div>
      <h3 className="mb-2 text-xl font-semibold text-gray-900">{message}</h3>
      {submessage && <p className="max-w-sm text-gray-600">{submessage}</p>}
    </div>
  </motion.div>
);

// Progress Components
interface ProgressBarProps {
  progress: number;
  color?: "primary" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";
  showPercentage?: boolean;
  animated?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = "primary",
  size = "md",
  showPercentage = true,
  animated = true,
  className = "",
}) => {
  const colorClasses = {
    primary: "bg-purple-600",
    success: "bg-green-600",
    warning: "bg-yellow-500",
    error: "bg-red-600",
  };

  const backgroundColorClasses = {
    primary: "bg-purple-100",
    success: "bg-green-100",
    warning: "bg-yellow-100",
    error: "bg-red-100",
  };

  const sizeClasses = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
  };

  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={`w-full ${className}`}>
      {showPercentage && (
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-medium text-gray-600">
            {Math.round(clampedProgress)}%
          </span>
        </div>
      )}
      <div
        className={`w-full ${backgroundColorClasses[color]} overflow-hidden rounded-full ${sizeClasses[size]}`}
      >
        <motion.div
          className={`h-full ${colorClasses[color]} ${animated ? "transition-all duration-300" : ""}`}
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: animated ? 0.5 : 0 }}
        />
      </div>
    </div>
  );
};

// Error and Empty States
interface ErrorStateProps {
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  message = "We encountered an error while loading this content.",
  action,
  icon,
  className = "",
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`px-6 py-12 text-center ${className}`}
  >
    <div className="mb-4 flex justify-center">
      {icon || (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <AlertCircle size={32} className="text-red-600" />
        </div>
      )}
    </div>
    <h3 className="mb-2 text-xl font-semibold text-gray-900">{title}</h3>
    <p className="mx-auto mb-6 max-w-md text-gray-600">{message}</p>
    {action && (
      <button onClick={action.onClick} className="btn btn-primary btn-md">
        <RefreshCw size={18} />
        <span>{action.label}</span>
      </button>
    )}
  </motion.div>
);

interface EmptyStateProps {
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No data found",
  message = "There is no content to display at this time.",
  action,
  icon,
  className = "",
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`px-6 py-12 text-center ${className}`}
  >
    <div className="mb-4 flex justify-center">
      {icon || (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <div className="h-8 w-8 rounded bg-gray-300"></div>
        </div>
      )}
    </div>
    <h3 className="mb-2 text-xl font-semibold text-gray-900">{title}</h3>
    <p className="mx-auto mb-6 max-w-md text-gray-600">{message}</p>
    {action && (
      <button onClick={action.onClick} className="btn btn-primary btn-md">
        {action.label}
      </button>
    )}
  </motion.div>
);

// Success State
interface SuccessStateProps {
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const SuccessState: React.FC<SuccessStateProps> = ({
  title = "Success!",
  message = "The operation completed successfully.",
  action,
  className = "",
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className={`px-6 py-12 text-center ${className}`}
  >
    <div className="mb-4 flex justify-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <CheckCircle size={32} className="text-green-600" />
      </div>
    </div>
    <h3 className="mb-2 text-xl font-semibold text-gray-900">{title}</h3>
    <p className="mx-auto mb-6 max-w-md text-gray-600">{message}</p>
    {action && (
      <button onClick={action.onClick} className="btn btn-primary btn-md">
        {action.label}
      </button>
    )}
  </motion.div>
);

// Inline Loading Component
interface InlineLoadingProps {
  text?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  text = "Loading...",
  size = "md",
  className = "",
}) => {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <div
      className={`flex items-center space-x-2 text-gray-600 ${sizeClasses[size]} ${className}`}
    >
      <LoadingSpinner size={size} color="secondary" />
      <span>{text}</span>
    </div>
  );
};
