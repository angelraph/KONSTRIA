import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // apps/web sits two levels below the monorepo root; without this, Next's
  // file tracing only looks inside apps/web and misses the Prisma query
  // engine binary that lives in the root pnpm store, which is exactly the
  // "Query Engine ... could not be located" error on Vercel.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // Next's tracer follows static require/import calls, but Prisma loads its
  // query engine binary by constructing the path at runtime, so the tracer
  // never sees it — it has to be included explicitly. The version segment
  // in the pnpm store path is wildcarded so a prisma version bump doesn't
  // silently break this again.
  outputFileTracingIncludes: {
    "/*": ["../../node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client/**/*"],
  },
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
