// Central place for the shared, multi-tenant Convex backend wiring. See
// convex/README.md for how this connects to BuildPilot's shared deployment.
export const convexUrl = import.meta.env.VITE_CONVEX_URL?.trim();
export const siteId = import.meta.env.VITE_SITE_ID?.trim();
