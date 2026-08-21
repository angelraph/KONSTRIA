import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@konstria/rules-engine",
    "@konstria/shared-types",
    "@konstria/db",
  ],
  webpack(config) {
    // Workspace packages are consumed as raw TS source with explicit `.js`
    // extensions on relative imports (correct for tsc's "Bundler"
    // resolution and for tsx/vitest, but webpack won't map `.js` -> `.ts`
    // on its own) — teach webpack that mapping instead of stripping the
    // extensions everywhere.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
