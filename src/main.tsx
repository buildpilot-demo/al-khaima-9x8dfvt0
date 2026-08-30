import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { convexUrl, siteId } from "./lib/convex";
import { applyTheme } from "./theme";
import { siteConfig } from "./site.config";
import "./styles.css";

applyTheme(siteConfig.palette);

const root = createRoot(document.getElementById("root")!);

root.render(
  <StrictMode>
    <ErrorBoundary>
      {convexUrl ? (
        <ConvexProvider client={new ConvexReactClient(convexUrl)}>
          <BrowserRouter><App /></BrowserRouter>
        </ConvexProvider>
      ) : (
        <main className="page">
          <p className="eyebrow">Configuration needed</p>
          <h1>Connect your Convex deployment</h1>
          <p className="muted">
            Set <code>VITE_CONVEX_URL</code> (and <code>VITE_SITE_ID</code>) in
            your environment, then restart the development server.
          </p>
        </main>
      )}
    </ErrorBoundary>
    {/* data-site-id keeps the tenant id present in the built bundle for deployment verification */}
    <span hidden data-site-id={siteId ?? ""} />
  </StrictMode>,
);
