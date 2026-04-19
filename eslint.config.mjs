import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  {
    files: ["*.mjs"],
    ...tseslint.configs.disableTypeChecked
  },
  {
    ignores: ["main.js", "node_modules", "dist", "coverage"]
  }
);
