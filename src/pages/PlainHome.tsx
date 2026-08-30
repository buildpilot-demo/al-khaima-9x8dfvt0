import { useEffect } from "react";
import { siteConfig } from "../site.config";
import { EnquirySection } from "../components/EnquirySection";
import type { PlainSiteConfig } from "../types/site-config";

// Rendered instead of CinematicHome when this business's category has no
// matching image/frame asset collection (see convex/lib/siteConfig3d.ts's
// resolveAssetCollection in the buildpilot-platform repo). A normal,
// text-only single-page site: a plain hero, a text-only highlights list,
// and the same enquiry section — deliberately no images, stock photography,
// or scroll animation, since none of that exists for this business. Only
// rendered by App.tsx when siteConfig.variant === "plain".
export function PlainHome({ config }: { config: PlainSiteConfig }) {
  useEffect(() => {
    document.title = siteConfig.businessName;
  }, []);

  const { hero, highlightsSection } = config;

  return (
    <div id="top">
      <section className="plain-hero">
        <p className="eyebrow">{hero.eyebrow}</p>
        <h1>{hero.heading}</h1>
        <p className="muted">{hero.body}</p>
        {hero.primaryCta && <a className="btn" href={hero.primaryCta.href}>{hero.primaryCta.label}</a>}
        {hero.secondaryCta && <a className="btn btn-secondary" href={hero.secondaryCta.href}>{hero.secondaryCta.label}</a>}
      </section>

      <section id={highlightsSection.id} className="plain-highlights">
        <p className="eyebrow">{highlightsSection.eyebrow}</p>
        <h2>{highlightsSection.heading}</h2>
        <p className="muted">{highlightsSection.body}</p>
        <ul className="plain-highlights__list">
          {highlightsSection.items.map((item) => (
            <li key={item.name}>
              <h3>{item.name}</h3>
              <p className="muted">{item.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <EnquirySection />
    </div>
  );
}
