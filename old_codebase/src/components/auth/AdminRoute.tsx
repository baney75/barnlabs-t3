import React from "react";
import { Navigate, useLocation } from "react-router-dom";

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const userString = localStorage.getItem("user");

  let user = null;
  if (userString) {
    try {
      user = JSON.parse(userString);
    } catch (error) {
      console.error("Failed to parse user data from localStorage", error);
    }
  }

  if (!token || !user || !user.is_admin) {
    // If user is not an admin, or token is missing, redirect to login.
    // Also save the location they were trying to go to.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
