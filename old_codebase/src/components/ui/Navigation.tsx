import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  User,
  LogOut,
  LayoutDashboard,
  Shield,
  Sparkles,
  MessageSquare,
  ChevronDown,
} from "lucide-react";

interface User {
  username: string;
  is_admin: boolean;
}

interface NavigationProps {
  user?: User | null;
  onLogout?: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setUserMenuOpen(false);
  }, [location]);

  const isActive = (path: string) => location.pathname === path;
  const isHashActive = (hash: string) => location.hash === hash;

  const navItems = user
    ? [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        ...(user.is_admin
          ? [{ href: "/admin", label: "Admin", icon: Shield }]
          : []),
      ]
    : [
        { href: "/#features", label: "Features", icon: Sparkles },
        { href: "/#contact", label: "Contact", icon: MessageSquare },
      ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("is_admin");
    if (onLogout) onLogout();
    window.location.href = "/";
  };

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-gray-200 bg-white/95 shadow-lg backdrop-blur-md"
          : "bg-transparent"
      }`}
    >
      <nav className="container-responsive">
        <div className="flex h-16 items-center justify-between md:h-20">
          {/* Logo */}
          <Link
            to="/"
            className="group flex items-center space-x-3"
            aria-label="BARN Labs Home"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-cyan-600 transition-transform duration-200 group-hover:scale-105 md:h-12 md:w-12">
              <span className="text-lg font-bold text-white md:text-xl">B</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
                BARN Labs
              </h1>
              <p className="-mt-1 text-sm text-gray-600">
                Augmented Reality Nexus
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center space-x-8 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.href.startsWith("/#")
                ? isHashActive(item.href.substring(1))
                : isActive(item.href);

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center space-x-2 rounded-lg px-3 py-2 font-medium transition-all duration-200 ${
                    active
                      ? "bg-purple-100 text-purple-600"
                      : "text-gray-700 hover:bg-gray-100 hover:text-purple-600"
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User Menu / Auth Buttons */}
          <div className="hidden items-center space-x-4 md:flex">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 rounded-lg bg-gray-100 px-3 py-2 transition-colors duration-200 hover:bg-gray-200"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-cyan-600">
                    <span className="text-sm font-medium text-white">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {user.username}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                    >
                      <div className="border-b border-gray-100 px-3 py-2">
                        <p className="text-sm font-medium text-gray-900">
                          {user.username}
                        </p>
                        <p className="text-xs text-gray-500">
                          {user.is_admin ? "Administrator" : "User"}
                        </p>
                      </div>
                      <Link
                        to="/dashboard"
                        className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 transition-colors duration-150 hover:bg-gray-100"
                      >
                        <LayoutDashboard size={16} />
                        <span>Dashboard</span>
                      </Link>
                      {user.is_admin && (
                        <Link
                          to="/admin"
                          className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 transition-colors duration-150 hover:bg-gray-100"
                        >
                          <Shield size={16} />
                          <span>Admin Panel</span>
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center space-x-2 px-3 py-2 text-sm text-red-600 transition-colors duration-150 hover:bg-red-50"
                      >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link to="/login" className="btn btn-primary btn-md">
                <User size={18} />
                <span>Sign In</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-lg bg-gray-100 p-2 transition-colors duration-200 hover:bg-gray-200 md:hidden"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden border-t border-gray-200 bg-white md:hidden"
            >
              <div className="space-y-2 py-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = item.href.startsWith("/#")
                    ? isHashActive(item.href.substring(1))
                    : isActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`mx-4 flex items-center space-x-3 rounded-lg px-4 py-3 font-medium transition-all duration-200 ${
                        active
                          ? "bg-purple-100 text-purple-600"
                          : "text-gray-700 hover:bg-gray-100 hover:text-purple-600"
                      }`}
                    >
                      <Icon size={20} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}

                {/* Mobile User Section */}
                {user ? (
                  <div className="mx-4 border-t border-gray-200 pt-4">
                    <div className="mb-3 flex items-center space-x-3 rounded-lg bg-gray-50 px-4 py-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-cyan-600">
                        <span className="font-medium text-white">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.username}
                        </p>
                        <p className="text-sm text-gray-500">
                          {user.is_admin ? "Administrator" : "User"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center space-x-3 rounded-lg px-4 py-3 text-red-600 transition-colors duration-200 hover:bg-red-50"
                    >
                      <LogOut size={20} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <div className="mx-4 border-t border-gray-200 pt-4">
                    <Link to="/login" className="btn btn-primary btn-md w-full">
                      <User size={18} />
                      <span>Sign In</span>
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
};

export default Navigation;
