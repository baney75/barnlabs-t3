// eslint.config.js
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "node_modules",
      // Ignore huge generated worker declaration file that conflicts with DOM globals
      "worker-configuration.d.ts",
    ],
  },
  {
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Allow empty catch blocks (we often intentionally ignore errors in Workers)
      "no-empty": ["error", { allowEmptyCatch: true }],
      // Allow explicit any when needed for Cloudflare bindings and 3rd-party SDKs
      "@typescript-eslint/no-explicit-any": "off",
      // Ignore unused underscore-prefixed args/vars
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
);

// Note: CSS is linted by stylelint if configured; Tailwind's @apply rules in
// `src/components/ui/improved-themes.css` are expected and safe.
