// Contact.tsx - Modern glassmorphism contact section
import { useState } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import {
  Send,
  CheckCircle,
  AlertCircle,
  Mail,
  MessageSquare,
  Sparkles,
} from "lucide-react";

interface ApiResponse {
  success: boolean;
  message: string;
}

function Contact() {
  const WEB3FORMS_ACCESS_KEY = "f73f7250-5451-499f-8e96-5669baece62c";
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setResult({ type: null, message: "Submitting..." });

    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("message", message);
      formData.append("access_key", WEB3FORMS_ACCESS_KEY);

      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });
      const data: ApiResponse = await response.json();
      if (data.success) {
        setResult({
          type: "success",
          message: "Success! Your message has been sent.",
        });
        setEmail("");
        setMessage("");
      } else {
        setResult({
          type: "error",
          message: data.message || "Submission failed. Try again.",
        });
      }
    } catch (error) {
      setResult({
        type: "error",
        message: `An error occurred: ${(error as Error).message}`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="contact"
      className="relative overflow-hidden px-4 py-24 md:px-16 md:py-32"
    >
      {/* Dynamic background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        {/* Animated background elements */}
        <motion.div
          className="absolute top-1/3 left-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-1/4 bottom-1/3 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -100, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center"
        >
          <h2 className="font-display mb-6 text-5xl font-bold text-white md:text-7xl lg:text-8xl">
            <span className="bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Get in Touch
            </span>
          </h2>
          <p className="mx-auto max-w-3xl text-xl leading-relaxed font-light text-white/80 md:text-2xl">
            Ready to transform education with AR/VR? Let's discuss how BARN Labs
            can revolutionize your learning experience.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mx-auto max-w-4xl"
        >
          {/* Glassmorphism contact card */}
          <div className="rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl md:p-12">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid gap-8 md:grid-cols-2">
                {/* Email field */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="space-y-3"
                >
                  <label
                    htmlFor="email"
                    className="flex items-center gap-2 text-lg font-semibold text-white"
                  >
                    <Mail size={20} className="text-cyan-400" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/30 bg-white/10 p-4 text-white placeholder-white/60 backdrop-blur-sm transition-all duration-300 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                    placeholder="you@example.com"
                    disabled={submitting}
                  />
                </motion.div>

                {/* Message length indicator */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-lg font-semibold text-white">
                      <MessageSquare size={20} className="text-purple-400" />
                      Message Preview
                    </label>
                    <span className="text-sm text-white/60">
                      {message.length}/500
                    </span>
                  </div>
                  <div className="flex min-h-[100px] items-center justify-center rounded-xl border border-white/20 bg-white/5 p-4">
                    {message ? (
                      <p className="line-clamp-4 text-sm text-white/80">
                        {message}
                      </p>
                    ) : (
                      <p className="text-white/40 italic">
                        Your message preview will appear here...
                      </p>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Message field */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="space-y-3"
              >
                <label
                  htmlFor="message"
                  className="flex items-center gap-2 text-lg font-semibold text-white"
                >
                  <MessageSquare size={20} className="text-purple-400" />
                  Your Message
                </label>
                <textarea
                  id="message"
                  rows={6}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                  className="w-full resize-none rounded-xl border border-white/30 bg-white/10 p-4 text-white placeholder-white/60 backdrop-blur-sm transition-all duration-300 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                  placeholder="Tell us about your project, questions, or ideas..."
                  disabled={submitting}
                />
              </motion.div>

              {/* Submit button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="flex flex-col items-center gap-4"
              >
                <motion.button
                  type="submit"
                  disabled={submitting || !email || !message}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative min-w-[200px] rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-600 px-8 py-4 font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex items-center justify-center gap-3">
                    {submitting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      >
                        <Sparkles size={20} />
                      </motion.div>
                    ) : (
                      <Send
                        size={20}
                        className="transition-transform group-hover:translate-x-1"
                      />
                    )}
                    {submitting ? "Sending..." : "Send Message"}
                  </div>

                  {/* Animated border */}
                  <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-600 opacity-0 blur-xl transition-opacity group-hover:opacity-100" />
                </motion.button>

                {/* Result message */}
                {result.message && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-3 backdrop-blur-sm ${
                      result.type === "success"
                        ? "border-green-400/30 bg-green-500/20 text-green-300"
                        : result.type === "error"
                          ? "border-red-400/30 bg-red-500/20 text-red-300"
                          : "border-blue-400/30 bg-blue-500/20 text-blue-300"
                    }`}
                  >
                    {result.type === "success" ? (
                      <CheckCircle size={20} />
                    ) : result.type === "error" ? (
                      <AlertCircle size={20} />
                    ) : (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      >
                        <Sparkles size={20} />
                      </motion.div>
                    )}
                    <span className="font-medium">{result.message}</span>
                  </motion.div>
                )}
              </motion.div>
            </form>
          </div>

          {/* Additional contact info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-12 text-center"
          >
            <p className="text-lg text-white/60">
              Prefer email? Reach out directly at{" "}
              <a
                href="mailto:projectbarnlab@gmail.com"
                className="text-cyan-400 underline decoration-cyan-400/30 transition-colors hover:text-cyan-300 hover:decoration-cyan-300"
              >
                projectbarnlab@gmail.com
              </a>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default Contact;
