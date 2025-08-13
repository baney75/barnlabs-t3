import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Blues: Ocean/hero (immersive vision)
        "primary-blue": "#0668bf", // Hero bg top
        "dark-blue": "#183b4e", // Hero bg bottom

        // Browns/Sands: Wood/earth (warm, grounded sections)
        "barn-red": "#9a631c", // Globe land, accents
        "sand-brown": "#c0a57c", // Headers/backgrounds
        "ply-brown": "#d3b587", // Features/contact bg (as requested)
        "dark-brown": "#7f5218", // Borders/shadows

        // Whitish/Mints: Text/fields (crisp on blues/browns)
        "egg-shell": "#e7e9dc", // Fields/bgs (whitish variant)
        "msg-mint": "#fefff0", // Main text (whitish as requested)
        "steel-gray": "#b9b9ca", // Subtle borders
        "vision-mint": "#9dd5cb", // Hovers/accents
        "red-accent": "#910e0e", // Energy/warnings
        "accent-teal": "#00AAAA", // Focus rings, success
      },

      fontFamily: {
        joy: ["Galdeano", "sans-serif"], // Bold, joyful headings
        serious: ["Source Sans Pro", "sans-serif"], // Clean body
      },

      dropShadow: {
        "globe-shadow": "20px 20px 4px rgba(0, 0, 0, 0.2)",
        "text-glow": "0 0 5px #00AAAA",
        "card-glow": "0 4px 6px rgba(6, 104, 191, 0.3)", // Blue glow
      },

      backgroundImage: {
        "hero-gradient": "linear-gradient(to bottom, #0668bf, #183b4e)", // Ocean
        "section-fade": "linear-gradient(to bottom, #d3b587, #c0a57c)", // Wood fade (ply to sand)
        "wood-grain":
          "repeating-linear-gradient(0deg, transparent, rgba(0,0,0,0.05) 1px, transparent 2px)", // For wood texture
      },

      animation: {
        "spin-slow": "spin 20s linear infinite", // Globe hover spin
        "fade-in": "fade-in 1s ease-out forwards",
      },

      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [typography],
};
