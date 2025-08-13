import React from "react";
import { Navigate } from "react-router-dom";

interface GuestRouteProps {
  children: React.ReactNode;
}

const GuestRoute: React.FC<GuestRouteProps> = ({ children }) => {
  const token = localStorage.getItem("token");
  const userString = localStorage.getItem("user");

  if (token && userString) {
    try {
      const user = JSON.parse(userString);
      // Redirect to the appropriate dashboard if the user is logged in
      const redirectTo = user.is_admin
        ? "/admin"
        : `/dashboard/${user.username}`;
      return <Navigate to={redirectTo} replace />;
    } catch (error) {
      // If user data is corrupted, clear it and allow access to guest route
      console.error("Failed to parse user data from localStorage", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }

  return <>{children}</>;
};

export default GuestRoute;
