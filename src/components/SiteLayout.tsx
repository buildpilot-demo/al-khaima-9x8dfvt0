import { useState } from "react";
import { Outlet } from "react-router-dom";
import { siteConfig } from "../site.config";

// Shared chrome for every route: skip-link plus a minimal transparent
// header (wordmark + anchor nav into the single cinematic page's sections)
// and a compact footer with contact details — see
// docs/DEVIN_3D_WEBSITE_SPEC.md, "Section 1 — Cinematic hero". Identical
// across every customer site; only siteConfig itself changes per customer.
export function SiteLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const navId = "site-nav";

  return (
    <div className="site">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="site-header">
        <div className="container site-header__bar">
          <a className="site-header__brand" href="#top" onClick={() => setNavOpen(false)}>
            {siteConfig.businessName}
          </a>
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={navOpen}
            aria-controls={navId}
            onClick={() => setNavOpen((open) => !open)}
          >
            {navOpen ? "Close menu" : "Menu"}
          </button>
          <nav aria-label="Primary">
            <ul id={navId} className="site-nav" data-open={navOpen}>
              {siteConfig.navigation.map((item) => (
                <li key={item.href}>
                  <a href={item.href} onClick={() => setNavOpen(false)}>{item.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
