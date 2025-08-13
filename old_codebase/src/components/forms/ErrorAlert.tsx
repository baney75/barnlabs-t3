// src/components/forms/ErrorAlert.tsx
import React from "react";
import { X, AlertCircle } from "lucide-react";

interface ErrorAlertProps {
  error: string;
  onDismiss?: () => void;
  className?: string;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({
  error,
  onDismiss,
  className = "",
}) => {
  return (
    <div
      className={`rounded-md border border-red-200 bg-red-50 p-4 ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start">
        <AlertCircle className="mt-0.5 mr-3 h-5 w-5 flex-shrink-0 text-red-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-3 inline-flex rounded-md text-red-400 hover:text-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-red-50 focus:outline-none"
            aria-label="Dismiss error"
          >
            <X size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorAlert;
