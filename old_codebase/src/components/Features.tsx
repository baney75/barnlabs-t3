// Features.tsx - Enhanced with modern glassmorphism design
import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, Users, Lightbulb, ArrowRight, Sparkles } from "lucide-react";

interface FeatureCardProps {
  title: string;
  text: string;
  delay: number;
  icon: React.ReactNode;
  gradient: string;
}

function FeatureCard({ title, text, delay, icon, gradient }: FeatureCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className="group relative h-80 cursor-pointer"
      style={{ perspective: "1200px" }}
      onClick={() => setIsFlipped((v) => !v)}
      onKeyDown={(e) =>
        (e.key === "Enter" || e.key === " ") && setIsFlipped((v) => !v)
      }
      role="button"
      aria-pressed={isFlipped}
      tabIndex={0}
    >
      <div
        className={`relative h-full w-full transition-transform duration-700 ease-out ${
          isFlipped ? "rotate-y-180" : ""
        }`}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Front of card */}
        <div
          className="absolute h-full w-full overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-lg"
          style={{ backfaceVisibility: "hidden", transform: "translateZ(1px)" }}
        >
          {/* Gradient background */}
          <div className={`absolute inset-0 opacity-20 ${gradient}`} />

          {/* Glass effect overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />

          {/* Content */}
          <div className="relative flex h-full flex-col items-center justify-center p-8 text-center">
            <motion.div
              className="mb-6 rounded-2xl border border-white/30 bg-white/20 p-4 backdrop-blur-sm"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {icon}
            </motion.div>

            <h3 className="font-display mb-4 text-2xl font-bold text-white drop-shadow-lg md:text-3xl">
              {title}
            </h3>

            <motion.div
              className="flex items-center gap-2 text-white/80 transition-colors group-hover:text-white"
              whileHover={{ x: 5 }}
            >
              <span className="text-sm font-medium">Learn more</span>
              <ArrowRight size={16} />
            </motion.div>
          </div>

          {/* Animated sparkles */}
          <div className="absolute top-4 right-4 opacity-50">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles size={20} className="text-white" />
            </motion.div>
          </div>
        </div>

        {/* Back of card */}
        <div
          className="absolute h-full w-full overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-lg"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg) translateZ(1px)",
          }}
        >
          {/* Gradient background */}
          <div className={`absolute inset-0 opacity-20 ${gradient}`} />

          {/* Glass effect overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />

          {/* Content */}
          <div className="relative flex h-full items-center justify-center p-8">
            <p className="text-center text-lg leading-relaxed font-medium text-white">
              {text}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .rotate-y-180 { transform: rotateY(180deg); }
        @media (hover: hover) {
          .group:hover .flipper { transform: rotateY(180deg); }
        }
      `}</style>
    </motion.div>
  );
}

function Features() {
  return (
    <section
      id="features"
      className="relative overflow-hidden px-4 py-24 md:px-16 md:py-32"
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-cyan-900">
        {/* Animated orbs */}
        <motion.div
          className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 180, 360],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center"
        >
          <h2 className="font-display mb-6 text-5xl font-bold text-white md:text-7xl lg:text-8xl">
            <span className="bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Features
            </span>
          </h2>
          <p className="mx-auto max-w-3xl text-xl font-light text-white/80 md:text-2xl">
            Discover the cutting-edge capabilities that make BARN Labs the
            future of AR/VR education
          </p>
        </motion.div>

        {/* Mission Statement */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="mx-auto mb-16 max-w-4xl"
        >
          <div className="rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg md:p-12">
            <div className="mb-8 flex items-center justify-center gap-4">
              <div className="rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 p-3">
                <Eye size={32} className="text-white" />
              </div>
              <h3 className="font-display bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
                Our Vision
              </h3>
            </div>
            <div className="grid gap-8 text-center md:grid-cols-3">
              <motion.div whileHover={{ scale: 1.05 }} className="space-y-4">
                <div className="text-4xl text-cyan-400">🔬</div>
                <h4 className="text-lg font-semibold text-white">
                  Transform Education
                </h4>
                <p className="text-sm leading-relaxed text-white/80">
                  Cutting-edge AR/VR technology revolutionizes how students
                  learn and interact with complex subjects
                </p>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} className="space-y-4">
                <div className="text-4xl text-purple-400">✨</div>
                <h4 className="text-lg font-semibold text-white">
                  Memorable Experiences
                </h4>
                <p className="text-sm leading-relaxed text-white/80">
                  Create unforgettable learning moments through immersive,
                  interactive educational content
                </p>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} className="space-y-4">
                <div className="text-4xl text-cyan-400">🌉</div>
                <h4 className="text-lg font-semibold text-white">
                  Connect Communities
                </h4>
                <p className="text-sm leading-relaxed text-white/80">
                  Build bridges that unite learners and educators across
                  geographical and cultural boundaries
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-12">
          <FeatureCard
            delay={0.3}
            title="A New Perspective"
            text="Transform how students learn with immersive AR & VR experiences that bring abstract concepts to life. See complex molecular structures, historical events, and mathematical concepts in stunning 3D detail."
            icon={<Eye size={32} className="text-white" />}
            gradient="bg-gradient-to-br from-purple-600 to-pink-600"
          />
          <FeatureCard
            delay={0.5}
            title="Connection"
            text="Break down geographical barriers with collaborative AR/VR learning. Students can interact with 3D models together in real-time, creating shared experiences that enhance understanding and engagement."
            icon={<Users size={32} className="text-white" />}
            gradient="bg-gradient-to-br from-blue-600 to-cyan-600"
          />
          <FeatureCard
            delay={0.7}
            title="Clarity"
            text="Empower educators and students to create their own immersive learning resources. Build, share, and discover a vast library of educational AR/VR content tailored to every learning style and subject."
            icon={<Lightbulb size={32} className="text-white" />}
            gradient="bg-gradient-to-br from-cyan-600 to-teal-600"
          />
        </div>

        {/* Call to action */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-2xl border border-white/20 bg-gradient-to-r from-purple-600 to-cyan-600 px-8 py-4 font-semibold text-white shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl"
          >
            <span className="flex items-center gap-2">
              Explore All Features
              <ArrowRight size={20} />
            </span>
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}

export default Features;
