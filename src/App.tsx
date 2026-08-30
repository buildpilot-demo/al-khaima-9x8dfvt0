import { Route, Routes } from "react-router-dom";
import { SiteLayout } from "./components/SiteLayout";
import { CinematicHome } from "./pages/CinematicHome";
import { PlainHome } from "./pages/PlainHome";
import { HealthPage } from "./pages/HealthPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { siteConfig } from "./site.config";

// A single-page site (see docs/DEVIN_3D_WEBSITE_SPEC.md — exactly three
// sections, no extra pages/routes). siteConfig.variant selects which
// experience this business gets: "cinematic" (image/frame-backed) when its
// category matched a real asset collection, or "plain" (text-only, no
// images/animation) when it didn't — see resolveAssetCollection in
// convex/lib/siteConfig3d.ts (buildpilot-platform repo). /health and the
// catch-all stay outside SiteLayout since they aren't customer-facing
// content.
export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route
          index
          element={siteConfig.variant === "cinematic" ? <CinematicHome config={siteConfig} /> : <PlainHome config={siteConfig} />}
        />
      </Route>
      <Route path="health" element={<HealthPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
