/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  serverExternalPackages: ["snowflake-sdk"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  outputFileTracingIncludes: {
    "/": [
      "./docs/**/*",
      "./README.md",
      "./DESIGN.md",
      "./cli/template/README.md",
    ],
    "/*": [
      "./docs/**/*",
      "./README.md",
      "./DESIGN.md",
      "./cli/template/README.md",
    ],
  },
  experimental: {},
};

export default config;
