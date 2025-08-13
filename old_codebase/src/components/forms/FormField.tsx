// src/components/forms/FormField.tsx
import React, { forwardRef } from "react";
import { Eye, EyeOff } from "lucide-react";

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  touched?: boolean;
  showPasswordToggle?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
}

const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      label,
      error,
      touched,
      showPasswordToggle = false,
      showPassword = false,
      onTogglePassword,
      className = "",
      ...props
    },
    ref,
  ) => {
    const hasError = Boolean(error && touched);
    const fieldId = props.id || props.name || "field";

    return (
      <div className="space-y-1">
        <label
          htmlFor={fieldId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {props.required && (
            <span className="ml-1 text-red-500" aria-label="required">
              *
            </span>
          )}
        </label>

        <div className="relative">
          <input
            ref={ref}
            id={fieldId}
            className={`w-full rounded-md border bg-white px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 ${
              hasError
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300"
            } ${showPasswordToggle ? "pr-10" : ""} ${className} `}
            {...props}
            type={
              showPasswordToggle
                ? showPassword
                  ? "text"
                  : "password"
                : props.type
            }
            aria-invalid={hasError ? "true" : "false"}
            aria-describedby={hasError ? `${fieldId}-error` : undefined}
          />

          {showPasswordToggle && (
            <button
              type="button"
              onClick={onTogglePassword}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:text-gray-600 focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          )}
        </div>

        {hasError && (
          <p
            id={`${fieldId}-error`}
            className="text-sm text-red-600"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);

FormField.displayName = "FormField";

export default FormField;
