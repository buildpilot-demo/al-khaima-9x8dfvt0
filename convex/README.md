# Convex integration

This site connects to BuildPilot's shared, multi-tenant Convex deployment —
it does not deploy its own Convex backend or hold any deployment
credentials.

- `VITE_CONVEX_URL` (see `.env.example`) points the browser client at the
  shared deployment.
- `VITE_SITE_ID` scopes this site's reads/writes to its own tenant record;
  every shared query/mutation enforces `siteId` isolation server-side.
- The client wiring lives in `src/lib/convex.ts` and `src/main.tsx`.

Shared backend functions (e.g. contact-form submission) are defined and
deployed separately from this repository. Reference their function paths by
name once they are available — do not add new Convex functions or a
`convex/schema.ts` here.
