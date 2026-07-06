import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        fetch: "readonly",
        console: "readonly"
      }
    }
  },
  {
    files: ["test/**/*.js"],
    languageOptions: {
      globals: {
        process: "readonly"
      }
    }
  },
  {
    ignores: ["node_modules/", "dist/"]
  }
];
