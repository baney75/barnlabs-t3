// Header.tsx - Modern BARN design with purple-cyan gradient theme
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, User, LogOut, LayoutDashboard, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function Header() {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<{
    username: string;
    is_admin: boolean;
  } | null>(null);
  const location = useLocation();

  useEffect(() => {
    const tickingRef = { current: false } as { current: boolean };
    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 12);
        tickingRef.current = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // Check if user is logged in - use consistent storage with other auth components
    const token = localStorage.getItem("token");
    const userString = localStorage.getItem("user");

    if (token && userString) {
      try {
        const user = JSON.parse(userString);
        setUser({ username: user.username, is_admin: user.is_admin });
      } catch (error) {
        console.error("Failed to parse user data from localStorage", error);
        // Clear corrupted data
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, [location]);

  const closeMenu = () => setMenuOpen(false);

  const navLink =
    "relative px-3 py-2 rounded-lg text-gray-300 hover:text-white transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60 hover:bg-white/10";

  const activeNavLink =
    navLink +
    " text-white bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-purple-500/30";

  const isActive = (path: string) => location.pathname === path;
  const isHashActive = (hash: string) => location.hash === hash;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={[
        "fixed z-50 w-full px-4 py-3 transition-all duration-300 md:px-8 md:py-4",
        scrolled
          ? "border-b border-purple-500/20 bg-gray-900/90 shadow-lg backdrop-blur-lg"
          : "bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-sm",
      ].join(" ")}
      role="banner"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Branding: SVG logo + text with gradient */}
        <Link
          to="/"
          className="group flex items-center space-x-2"
          aria-label="Go to home"
        >
          <motion.img
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
            src="/Logo.svg"
            alt="BARN Labs Logo"
            className="h-10 w-auto drop-shadow-md transition-all duration-300 group-hover:drop-shadow-lg"
          />
          <span className="font-display bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-2xl font-bold text-transparent transition-all duration-300 group-hover:from-purple-300 group-hover:to-cyan-300 md:text-3xl">
            BARN Labs
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center space-x-2 font-sans text-base md:flex">
          {!user ? (
            <>
              <a
                href="/#features"
                className={isHashActive("#features") ? activeNavLink : navLink}
                aria-label="Features section"
              >
                Features
              </a>
              <a
                href="/#contact"
                className={isHashActive("#contact") ? activeNavLink : navLink}
                aria-label="Contact section"
              >
                Contact
              </a>
              <Link
                to="/login"
                className={`${isActive("/login") ? activeNavLink : navLink} flex items-center gap-2`}
                aria-label="Login page"
              >
                <User size={18} />
                Login
              </Link>
            </>
          ) : (
            <>
              <Link
                to={`/dashboard/${user.username}`}
                className={`${location.pathname.includes("/dashboard") ? activeNavLink : navLink} flex items-center gap-2`}
                aria-label="Dashboard"
              >
                <LayoutDashboard size={18} />
                Dashboard
              </Link>
              {user.is_admin && (
                <Link
                  to="/admin/stats"
                  className={`${location.pathname.includes("/admin") ? activeNavLink : navLink} flex items-center gap-2`}
                  aria-label="Admin panel"
                >
                  <Shield size={18} />
                  Admin
                </Link>
              )}
              <div className="group relative">
                <button className={`${navLink} flex items-center gap-2`}>
                  <User size={18} />
                  {user.username}
                </button>
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="invisible absolute right-0 mt-2 w-48 rounded-lg border border-gray-700/50 bg-gray-800/95 opacity-0 shadow-xl backdrop-blur-sm transition-all duration-200 group-hover:visible group-hover:opacity-100"
                >
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-gray-300 transition-colors hover:bg-gray-700/50 hover:text-white"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </motion.div>
              </div>
            </>
          )}
        </nav>

        {/* Mobile Button */}
        <button
          className="rounded-lg p-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-purple-500/60 md:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
        >
          <AnimatePresence mode="wait">
            {isMenuOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90 }}
                animate={{ rotate: 0 }}
                exit={{ rotate: 90 }}
                transition={{ duration: 0.2 }}
              >
                <X size={28} />
              </motion.div>
            ) : (
              <motion.div
                key="menu"
                initial={{ rotate: 90 }}
                animate={{ rotate: 0 }}
                exit={{ rotate: -90 }}
                transition={{ duration: 0.2 }}
              >
                <Menu size={28} />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.nav
            id="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="mx-4 mt-4 flex flex-col items-center space-y-3 overflow-hidden rounded-lg bg-gray-800/50 px-4 pb-4 font-sans text-lg backdrop-blur-sm md:hidden"
          >
            {!user ? (
              <>
                <a
                  href="/#features"
                  onClick={closeMenu}
                  className={
                    isHashActive("#features") ? activeNavLink : navLink
                  }
                  aria-label="Features section"
                >
                  Features
                </a>
                <a
                  href="/#contact"
                  onClick={closeMenu}
                  className={isHashActive("#contact") ? activeNavLink : navLink}
                  aria-label="Contact section"
                >
                  Contact
                </a>
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className={`${isActive("/login") ? activeNavLink : navLink} flex items-center gap-2`}
                >
                  <User size={20} />
                  Login
                </Link>
              </>
            ) : (
              <>
                <div className="mb-2 text-center text-sm text-gray-400">
                  Welcome, {user.username}
                </div>
                <Link
                  to={`/dashboard/${user.username}`}
                  onClick={closeMenu}
                  className={`${location.pathname.includes("/dashboard") ? activeNavLink : navLink} flex items-center gap-2`}
                >
                  <LayoutDashboard size={20} />
                  Dashboard
                </Link>
                {user.is_admin && (
                  <Link
                    to="/admin/stats"
                    onClick={closeMenu}
                    className={`${location.pathname.includes("/admin") ? activeNavLink : navLink} flex items-center gap-2`}
                  >
                    <Shield size={20} />
                    Admin
                  </Link>
                )}
                <button
                  onClick={() => {
                    handleLogout();
                    closeMenu();
                  }}
                  className={`${navLink} flex items-center gap-2 text-red-400 hover:text-red-300`}
                >
                  <LogOut size={20} />
                  Logout
                </button>
              </>
            )}
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

export default Header;
