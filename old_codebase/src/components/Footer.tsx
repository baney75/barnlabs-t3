// Footer.tsx - Modern footer with enhanced design
import { Link } from "react-router-dom";
import { Github } from "lucide-react";
import type { Variants } from "framer-motion";
import { motion } from "framer-motion";

function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { name: "Features", href: "/#features" },
      { name: "Dashboard", href: "/login" },
    ],
  };

  const socialLinks = [
    { name: "GitHub", icon: Github, href: "https://github.com/barnlabs" },
  ];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  return (
    <motion.footer
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={containerVariants}
      className="from-dark-brown to-barn-red text-msg-mint relative overflow-hidden bg-gradient-to-b py-16"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="bg-wood-grain absolute inset-0" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Company Info */}
          <motion.div variants={itemVariants}>
            <Link
              to="/"
              className="group mb-4 inline-flex items-center space-x-2"
            >
              <motion.img
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
                src="/Logo.svg"
                alt="BARN Labs Logo"
                className="group-hover:drop-shadow-globe-shadow h-12 w-auto drop-shadow-md transition-all"
              />
              <span className="font-joy text-msg-mint group-hover:text-vision-mint text-3xl font-bold transition-colors">
                BARN Labs
              </span>
            </Link>
            <p className="text-egg-shell/80 mb-6 max-w-sm leading-relaxed">
              Revolutionizing 3D asset management with cutting-edge AR/VR
              technology. Build, share, and experience your digital creations
              like never before.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-dark-brown/30 hover:bg-vision-mint/20 group flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300"
                  aria-label={social.name}
                >
                  <social.icon
                    size={18}
                    className="text-egg-shell group-hover:text-vision-mint transition-colors"
                  />
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div variants={itemVariants}>
            <h3 className="font-joy text-vision-mint mb-4 text-xl font-semibold">
              Quick Links
            </h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-egg-shell/70 hover:text-vision-mint transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/#contact"
                  className="text-egg-shell/70 hover:text-vision-mint transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <motion.div
          variants={itemVariants}
          className="border-dark-brown/30 flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row"
        >
          <p className="text-egg-shell/60 text-center text-sm md:text-left">
            © {currentYear} BARN Labs. All rights reserved. Built with ❤️
          </p>

          <div className="flex items-center gap-6 text-sm">
            <Link
              to="/sitemap"
              className="text-egg-shell/60 hover:text-vision-mint transition-colors"
            >
              Sitemap
            </Link>
            <a
              href="/api/status"
              target="_blank"
              className="text-egg-shell/60 hover:text-vision-mint flex items-center gap-1 transition-colors"
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              API Status
            </a>
          </div>
        </motion.div>
      </div>
    </motion.footer>
  );
}

export default Footer;
