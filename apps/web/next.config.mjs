/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@sprintguard/shared'],
  typedRoutes: true,
  // Self-contained server bundle (.next/standalone) for the production Docker image
  // (apps/web/Dockerfile) -- no full node_modules copy needed at runtime. Gated behind
  // DOCKER_BUILD (set by the Dockerfile only) because Next's output-tracing step symlinks into
  // pnpm's .pnpm store, which fails with EPERM on Windows without Developer Mode's elevated
  // symlink privilege -- local `next build`/`pnpm build` stay on the normal (non-standalone)
  // output so they keep working everywhere.
  ...(process.env.DOCKER_BUILD === 'true' ? { output: 'standalone' } : {}),
};

export default nextConfig;
