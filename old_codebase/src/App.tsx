// App.tsx
import React, { useState, useEffect, Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Loader2 } from "lucide-react";

// Import the new route protection components
import ProtectedRoute from "./components/auth/ProtectedRoute";
import GuestRoute from "./components/auth/GuestRoute";
import AdminRoute from "./components/auth/AdminRoute";

const Home = lazy(() => import("./components/Home"));
const LoginPage = lazy(() => import("./components/LoginPage"));
const Dashboard = lazy(() => import("./components/Dashboard"));
const SharePage = lazy(() => import("./components/SharePage"));
const SetupPage = lazy(() => import("./components/SetupPage"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));

function App() {
  const [setupNeeded, setSetupNeeded] = useState<boolean | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch("/api/status");
        const data = await response.json();
        if (data.success) {
          setSetupNeeded(data.setupNeeded);
        } else {
          // If the status check fails, assume setup is needed as a fallback.
          setSetupNeeded(true);
        }
      } catch (error) {
        console.error(
          "Failed to fetch app status, assuming setup is needed.",
          error,
        );
        setSetupNeeded(true);
      }
    };
    checkStatus();
  }, []);

  if (setupNeeded === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <Router>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-gray-50">
            Loading…
          </div>
        }
      >
        <Routes>
          {setupNeeded ? (
            <>
              <Route path="/setup" element={<SetupPage />} />
              <Route path="*" element={<Navigate to="/setup" replace />} />
            </>
          ) : (
            <>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/share/:shareId" element={<SharePage />} />

              {/* Guest Route (only for unauthenticated users) */}
              <Route
                path="/login"
                element={
                  <GuestRoute>
                    <LoginPage />
                  </GuestRoute>
                }
              />

              {/* Protected Routes (for authenticated users) */}
              <Route
                path="/dashboard/:username"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Admin Route (for authenticated admin users) */}
              <Route
                path="/admin/:tab?"
                element={
                  <AdminRoute>
                    <AdminLayout />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin"
                element={<Navigate to="/admin/stats" replace />}
              />

              {/* If setup is done, /setup should not be accessible */}
              <Route path="/setup" element={<Navigate to="/login" replace />} />

              {/* Not Found Route */}
              <Route
                path="*"
                element={
                  <div className="flex min-h-screen items-center justify-center bg-gray-100 text-2xl text-gray-800">
                    404 - Page Not Found
                  </div>
                }
              />
            </>
          )}
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
