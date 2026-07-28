// Thin Vercel serverless entrypoint. Requires the ncc-bundled output (see vercel.json's
// buildCommand) rather than ../dist/serverless.js directly -- Vercel's function bundler doesn't
// reliably trace pnpm workspace symlinks (@sprintguard/database, @sprintguard/shared) at deploy
// time, so ncc inlines them into a single file at build time instead, when they're guaranteed
// to be resolvable on disk. argon2 and @prisma/client stay external since they ship native
// binaries ncc can't bundle; Vercel's tracer picks those up fine since they're regular
// (non-workspace) npm deps already hoisted into apps/api's own node_modules.
module.exports = require('../dist-bundle/index.js').default;
