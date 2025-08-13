// src/components/forms/LoadingButton.tsx
import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading: boolean;
  loadingText?: string;
  variant?: "primary" | "secondary";
}

const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading,
  loadingText = "Loading...",
  variant = "primary",
  children,
  className = "",
  disabled,
  ...props
}) => {
  const baseClasses =
    "w-full px-4 py-2 font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed flex items-center justify-center";

  const variantClasses = {
    primary:
      "text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300",
    secondary:
      "text-gray-700 bg-gray-200 hover:bg-gray-300 focus:ring-gray-500 disabled:bg-gray-100",
  };

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      aria-busy={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 animate-spin" size={20} />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default LoadingButton;
