// src/hooks/useFormValidation.ts
import { useState, useCallback, useMemo } from "react";

interface ValidationRules {
  [key: string]: (value: string) => string | null;
}

interface FormData {
  [key: string]: string;
}

export function useFormValidation<T extends FormData>(
  initialData: T,
  validationRules: ValidationRules,
) {
  const [data, setData] = useState<T>(initialData);
  const [touched, setTouched] = useState<Record<keyof T, boolean>>(
    {} as Record<keyof T, boolean>,
  );
  const [errors, setErrors] = useState<Record<keyof T, string>>(
    {} as Record<keyof T, string>,
  );

  const validateField = useCallback(
    (field: keyof T, value: string) => {
      const rule = validationRules[field as string];
      if (rule) {
        const error = rule(value);
        setErrors((prev) => ({
          ...prev,
          [field]: error || "",
        }));
        return !error;
      }
      return true;
    },
    [validationRules],
  );

  const validateAll = useCallback(() => {
    const newErrors: Record<keyof T, string> = {} as Record<keyof T, string>;
    let isValid = true;

    Object.keys(data).forEach((field) => {
      const rule = validationRules[field];
      if (rule) {
        const error = rule(data[field as keyof T]);
        if (error) {
          newErrors[field as keyof T] = error;
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [data, validationRules]);

  const setValue = useCallback(
    (field: keyof T, value: string) => {
      setData((prev) => ({ ...prev, [field]: value }));

      // Real-time validation
      if (touched[field]) {
        validateField(field, value);
      }
    },
    [touched, validateField],
  );

  const setTouchedField = useCallback(
    (field: keyof T) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      validateField(field, data[field]);
    },
    [data, validateField],
  );

  const reset = useCallback(() => {
    setData(initialData);
    setTouched({} as Record<keyof T, boolean>);
    setErrors({} as Record<keyof T, string>);
  }, [initialData]);

  const isValid = useMemo(() => {
    return (
      Object.values(errors).every((error) => !error) &&
      Object.keys(data).length > 0
    );
  }, [errors, data]);

  const hasErrors = useMemo(() => {
    return Object.values(errors).some((error) => error);
  }, [errors]);

  return {
    data,
    errors,
    touched,
    isValid,
    hasErrors,
    setValue,
    setTouchedField,
    validateAll,
    reset,
  };
}
