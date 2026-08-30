# buildpilot-starter-template

The base React + TypeScript + Vite project every BuildPilot customer site is
generated from. Kept minimal and generic on purpose — no business-specific
content lives here.

## What's included

- React 19 + TypeScript + Vite
- A single typed config, `src/site.config.ts` (shape: `src/types/site-config.ts`),
  that drives routing, nav, footer, and page content. BuildPilot's document
  generation stage overwrites this file per customer instead of emitting
  separate BUILD_SPEC.md / REQUIREMENTS.md / README.md prose files with
  duplicated page lists.
- Shared chrome, built once and reused by every customer site:
  - `src/components/SiteLayout.tsx` — header, responsive nav (accessible,
    `aria-expanded` toggle), footer, skip-to-content link
  - `src/theme.ts` — applies `site.config.ts`'s `palette` as CSS custom
    properties, so per-customer branding is config-only
  - `src/styles.css` — design tokens plus button/form/field primitives
  - `src/components/EnquiryForm.tsx` — accessible contact form (labelled
    fields, `aria-live` status, honeypot spam field), defaults to a
    `mailto:` submission with zero backend wiring required
  - `src/components/PageRenderer.tsx` — renders a page's `sections` from
    `site.config.ts` generically, so a new page is a config entry, not new
    code (see "Adding a page" below)
- `react-router-dom` routing generated from `site.config.ts`'s `pages`
  array, plus a `/health` smoke-test route and a catch-all not-found route
- A top-level React error boundary (`src/components/ErrorBoundary.tsx`)
- Shared, multi-tenant Convex backend client wiring (`src/lib/convex.ts`,
  see `convex/README.md`)
- Firebase Hosting config (`firebase.json`) — the hosting site/project are
  injected per customer, not hardcoded here
- A committed `package-lock.json`

No lint or test tooling is configured here. CI only runs a production
build (`npm run build`, which includes a `tsc --noEmit` type check) before
deploying.

## Development

```
npm ci
npm run dev
```

Copy `.env.example` to `.env.local` and set `VITE_CONVEX_URL` /
`VITE_SITE_ID` to use the shared Convex backend locally.

## Build

```
npm run build
npm run preview
```

`npm run preview` serves the production build so the `/health` route can be
used as a bounded smoke-test target instead of waiting on `npm run dev`.

## Customizing for a project

Devin builds on top of this base per `src/site.config.ts` (business data:
name, services, hours, contact, CTA, palette, per-page sections) and the
short prose guidance in `SITE_BRIEF.md`, both generated for each customer
project. Do not add business-specific content to this template repository
itself — publish a new template version instead.

Per-build work is primarily **content + palette**: edit the values in
`src/site.config.ts`. Shared chrome (header/nav/footer, design tokens,
button/form primitives, `EnquiryForm`) already lives in this template and
should not be rebuilt.

### Adding a page

Add an entry to `site.config.ts`'s `pages` array (`slug`, `name`,
`sections`) — it immediately gets a route, nav link, and rendered content
via `PageRenderer`. Only add a component to `src/pages/registry.tsx` (keyed
by the page's `slug`) if a page needs a bespoke layout beyond what
`PageRenderer`'s section kinds (`hero`, `text`, `features`, `gallery`,
`testimonials`, `cta`, `contact`) can express.
