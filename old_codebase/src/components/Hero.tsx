// Hero.tsx - Simplified hero with interactive globe
import { useState, useEffect, lazy, Suspense } from "react";
import { useOptimizedModelViewer } from "../hooks/useOptimizedModelViewer";
import { ArrowRight, Globe, Sparkles, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SimpleModelViewer = lazy(() => import("./SimpleModelViewer"));

function Hero() {
  const [isModalOpen, setModalOpen] = useState(false);
  const [isLoaded, setLoaded] = useState(false);
  // Use the local Earth model with iOS USDZ fallback
  const [heroSrc] = useState<string>("/Hero-Assets/Earth_Model.glb");
  const [heroUsdzSrc] = useState<string>("/Hero-Assets/Earth_Model.usdz");
  const [modelError, setModelError] = useState<string | null>(null);
  // Removed standalone iOS AR button; use model viewer controls instead

  useEffect(() => {
    // Delay the loaded flag until the next frame to avoid initial flash
    const id = requestAnimationFrame(() => setLoaded(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const optimized = useOptimizedModelViewer({
    src: heroSrc,
    context: "preview",
    style: { width: "100%", height: "100%" },
  });

  const handleModelError = (error: Error) => {
    console.error("Hero model error:", error);
    setModelError(error.message);
  };

  return (
    <>
      <section
        id="hero"
        className={`relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-cyan-900 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
        aria-labelledby="hero-heading"
      >
        {/* Animated background with floating orbs (hidden on small screens to prevent jank) */}
        <div className="pointer-events-none absolute inset-0 hidden will-change-transform sm:block">
          <motion.div
            className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 50, 0],
              y: [0, -30, 0],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl"
            animate={{
              scale: [1.2, 1, 1.2],
              x: [0, -50, 0],
              y: [0, 30, 0],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl"
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, 180, 360],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="container-responsive relative flex min-h-screen flex-col items-center justify-center py-20 text-center">
          {/* Main Heading */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-12"
          >
            <h1
              id="hero-heading"
              className="font-display mb-6 bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-6xl font-bold text-transparent md:text-8xl lg:text-9xl"
            >
              BARN Labs
            </h1>
            <p className="mb-4 font-sans text-xl text-gray-300 md:text-2xl lg:text-3xl">
              Baney Augmented Reality Nexus
            </p>
            <div className="flex items-center justify-center gap-2 text-cyan-400">
              <Sparkles className="h-5 w-5" />
              <span className="font-sans text-lg text-cyan-300">
                Where Innovation Meets Reality
              </span>
              <Sparkles className="h-5 w-5" />
            </div>
          </motion.div>

          {/* Interactive Globe - Main Feature */}
          <motion.div
            initial={{ y: 50, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{
              duration: 1,
              delay: 0.4,
              type: "spring",
              stiffness: 100,
            }}
            className="mb-12"
          >
            <motion.button
              onClick={() => setModalOpen(true)}
              className="group relative"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Launch interactive 3D Earth model"
            >
              {/* Globe Container */}
              <div className="relative mx-auto h-48 w-48 md:h-64 md:w-64 lg:h-80 lg:w-80">
                {/* Animated rings around globe */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-purple-400/30"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
                <motion.div
                  className="absolute inset-4 rounded-full border border-cyan-400/40"
                  animate={{ rotate: -360 }}
                  transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />

                {/* Main globe */}
                <div className="absolute inset-8 rounded-full bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 shadow-2xl transition-all duration-500 group-hover:shadow-purple-500/25">
                  {/* Globe shine effect */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/20 to-transparent" />

                  {/* Globe icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Globe className="h-16 w-16 text-white drop-shadow-lg md:h-20 md:w-20 lg:h-24 lg:w-24" />
                  </div>

                  {/* Pulse effect (lightweight) */}
                  <motion.div
                    className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400/40 to-cyan-400/40"
                    animate={{
                      scale: [1, 1.1, 1],
                      opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </div>

                {/* Play indicator */}
                <motion.div
                  className="absolute right-4 bottom-4 rounded-full bg-white/20 p-3 backdrop-blur-sm transition-all group-hover:bg-white/30"
                  whileHover={{ scale: 1.1 }}
                >
                  <Play className="h-6 w-6 fill-white text-white" />
                </motion.div>

                {/* Floating particles (hidden on small screens to reduce GPU load) */}
                <div className="hidden sm:block">
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute h-2 w-2 rounded-full bg-gradient-to-r from-purple-400 to-cyan-400"
                      style={{
                        left: `${20 + ((i * 60) % 80)}%`,
                        top: `${30 + ((i * 40) % 60)}%`,
                      }}
                      animate={{
                        y: [-10, -30, -10],
                        opacity: [0.4, 1, 0.4],
                        scale: [1, 1.2, 1],
                      }}
                      transition={{
                        duration: 3 + i * 0.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.5,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Globe label */}
              <motion.div
                className="mt-6 rounded-2xl border border-white/20 bg-white/10 px-6 py-3 backdrop-blur-md transition-all group-hover:bg-white/20"
                whileHover={{ y: -2 }}
              >
                <h3 className="mb-2 text-lg font-semibold text-white md:text-xl">
                  🌍 Interactive Earth Model
                </h3>
                <p className="text-sm text-white/80 md:text-base">
                  Click to explore with AR/VR support
                </p>
              </motion.div>
            </motion.button>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-col items-center gap-4 sm:flex-row"
          >
            <a
              href="#features"
              className="group rounded-2xl border border-white/20 bg-gradient-to-r from-purple-600 to-cyan-600 px-8 py-4 font-semibold text-white shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              <span className="flex items-center gap-2">
                Discover Features
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </span>
            </a>

            <a
              href="#contact"
              className="rounded-2xl border border-white/30 bg-white/10 px-8 py-4 font-semibold text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white/20"
            >
              Get Started
            </a>
          </motion.div>

          {/* Removed intrusive standalone AR button; use ModelViewer's AR button inside modal */}
        </div>
      </section>

      {/* Model Viewer Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="3D Earth Model Viewer with AR Support"
            onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative h-[80vh] w-full max-w-6xl rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-800 p-6 shadow-2xl md:h-[85vh]"
            >
              <Suspense
                fallback={
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <motion.div
                        className="mx-auto mb-4 h-16 w-16 rounded-full border-4 border-cyan-500 border-t-transparent"
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                      <p className="text-lg font-medium text-white">
                        Loading Interactive Earth Model...
                      </p>
                      <p className="mt-2 text-sm text-white/60">
                        Preparing AR/VR experience
                      </p>
                    </div>
                  </div>
                }
              >
                <SimpleModelViewer
                  {...optimized}
                  usdzSrc={heroUsdzSrc}
                  onError={handleModelError}
                  enableXR={true}
                  showXRButtons={true}
                  enableShadows={true}
                  environment="sunset"
                />
              </Suspense>

              {modelError && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/80 backdrop-blur-sm"
                >
                  <div className="p-8 text-center">
                    <div className="mb-4 text-6xl text-red-400">⚠️</div>
                    <p className="mb-4 text-lg text-red-400">
                      Error loading model: {modelError}
                    </p>
                    <button
                      onClick={() => {
                        setModelError(null);
                        setModalOpen(false);
                      }}
                      className="rounded-lg bg-red-600 px-6 py-2 font-medium text-white transition-colors hover:bg-red-700"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              )}

              <motion.button
                onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 rounded-xl bg-red-600/90 px-5 py-2.5 font-medium text-white shadow-lg backdrop-blur-sm transition-all hover:scale-105 hover:bg-red-700"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                ✕ Close
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Hero;
