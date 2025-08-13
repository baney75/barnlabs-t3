import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Home,
  Upload,
  Share2,
  Settings,
  HelpCircle,
  Bell,
  Search,
} from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: {
    username: string;
    is_admin: boolean;
  };
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  user,
  activeSection = "overview",
  onSectionChange,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const navigationItems = [
    {
      id: "overview",
      label: "Overview",
      icon: Home,
      description: "Dashboard overview",
    },
    {
      id: "models",
      label: "Models",
      icon: Upload,
      description: "Manage your 3D models",
    },
    {
      id: "shares",
      label: "Shares",
      icon: Share2,
      description: "Shared content",
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      description: "Account settings",
    },
  ];

  const filteredItems = navigationItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSectionClick = (sectionId: string) => {
    if (onSectionChange) {
      onSectionChange(sectionId);
    }
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: sidebarOpen ? 0 : -320,
        }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className={`fixed top-0 left-0 z-50 h-full w-80 border-r border-gray-200 bg-white shadow-lg lg:static lg:z-0 lg:translate-x-0`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-cyan-600">
                <span className="text-lg font-bold text-white">B</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">BARN Labs</h1>
                <p className="text-sm text-gray-600">Dashboard</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-2 transition-colors duration-200 hover:bg-gray-100 lg:hidden"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search */}
          <div className="border-b border-gray-200 p-4">
            <div className="relative">
              <Search
                size={18}
                className="absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400"
              />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-transparent bg-gray-100 py-2 pr-4 pl-10 transition-all duration-200 focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-4">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSectionClick(item.id)}
                  className={`group flex w-full items-center space-x-3 rounded-lg px-4 py-3 text-left transition-all duration-200 ${
                    isActive
                      ? "border border-purple-200 bg-purple-100 text-purple-700"
                      : "text-gray-700 hover:bg-gray-100 hover:text-purple-600"
                  }`}
                >
                  <Icon
                    size={20}
                    className={`transition-colors duration-200 ${
                      isActive
                        ? "text-purple-600"
                        : "text-gray-500 group-hover:text-purple-600"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-medium ${isActive ? "text-purple-900" : ""}`}
                    >
                      {item.label}
                    </p>
                    <p
                      className={`truncate text-sm ${
                        isActive ? "text-purple-600" : "text-gray-500"
                      }`}
                    >
                      {item.description}
                    </p>
                  </div>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="h-2 w-2 rounded-full bg-purple-600"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Info */}
          {user && (
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center space-x-3 rounded-lg bg-gray-50 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-cyan-600">
                  <span className="font-medium text-white">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">
                    {user.username}
                  </p>
                  <p className="text-sm text-gray-500">
                    {user.is_admin ? "Administrator" : "User"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="lg:ml-80">
        {/* Top Bar */}
        <header className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-2 transition-colors duration-200 hover:bg-gray-100 lg:hidden"
              >
                <Menu size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 capitalize">
                  {activeSection}
                </h1>
                <p className="text-sm text-gray-600">
                  Welcome back, {user?.username || "User"}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative rounded-lg p-2 transition-colors duration-200 hover:bg-gray-100">
                <Bell size={20} className="text-gray-600" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
              </button>

              {/* Help */}
              <button className="rounded-lg p-2 transition-colors duration-200 hover:bg-gray-100">
                <HelpCircle size={20} className="text-gray-600" />
              </button>

              {/* User Menu */}
              {user && (
                <div className="flex items-center space-x-3 rounded-lg bg-gray-100 px-3 py-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-cyan-600">
                    <span className="text-sm font-medium text-white">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden font-medium text-gray-900 sm:block">
                    {user.username}
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="p-6">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mx-auto max-w-7xl"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
