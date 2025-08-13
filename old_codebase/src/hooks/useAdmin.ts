// src/hooks/useAdmin.ts
import { useContext } from "react";
import { AdminContext } from "../contexts/AdminContext";

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}
