// Single, machine-readable source of truth for everything that makes a
// BuildPilot customer site *this* customer's site. Most businesses get the
// "cinematic" variant: a single-page 3D experience (scroll-scrubbed hero,
// horizontal products/services rail, enquiry section) built from real
// image/frame assets. A business whose category has no matching asset
// collection (see convex/lib/siteConfig3d.ts's resolveAssetCollection in
// the buildpilot-platform repo — it never substitutes a mismatched
// collection's imagery) gets the "plain" variant instead: a normal
// text-only hero, a text-only highlights section, and the same enquiry
// section, with no images or frame animation at all. See
// docs/DEVIN_3D_WEBSITE_SPEC.md (buildpilot-platform repo) for the full
// behavioral spec both variants encode.
//
// Devin's job for a given build is to implement whichever variant
// siteConfig.variant selects — see App.tsx's CinematicHome/PlainHome for
// the baseline this template ships with. Only src/site.config.ts changes
// per customer; this type and the shared chrome around it (EnquiryForm,
// theme) do not.

export type AssetCollection = "restuarant" | "cafe" | "medical" | "ecommerce";

export type SiteContact = {
  phone?: string;
  email?: string;
  address?: string;
  hours?: string;
};

export type SitePalette = {
  background: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accentHover: string;
};

export type SiteNavItem = {
  label: string;
  href: string;
};

export type SiteAssets = {
  /** Must exactly match a directory name directly under public/assets. */
  collection: AssetCollection;
  root: string;
  framesDirectory: string;
  productsDirectory: string;
};

export type SiteHeroFocalPoint = {
  wide: { x: number; y: number };
  narrow: { x: number; y: number };
};

export type SiteHeroChapter = {
  id: string;
  /** Normalized hero scroll progress (0-1) this chapter is shown between. */
  from: number;
  to: number;
  align: "left" | "right";
  eyebrow: string;
  heading: string;
  body: string;
  showScrollCue?: boolean;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
};

export type SiteHero = {
  directory: string;
  poster: string;
  filePrefix: string;
  fileExtension: string;
  framePadding: number;
  firstFrame: number;
  frameCount: number;
  width: number;
  height: number;
  scrollHeightVh: number;
  maxDevicePixelRatio: number;
  maxCachedFrames: number;
  loadConcurrency: number;
  narrowViewportBreakpoint: number;
  focalPoint: SiteHeroFocalPoint;
  chapters: SiteHeroChapter[];
};

export type SiteProductItem = {
  category: string;
  name: string;
  description: string;
  /** Filename only, resolved as `${assets.productsDirectory}/${image}` — never a full path. */
  image: string;
  alt?: string;
};

export type SiteProductsSection = {
  id: string;
  eyebrow: string;
  heading: string;
  body: string;
  scrollHeightVh: number;
  items: SiteProductItem[];
};

export type SiteEnquirySection = {
  id: string;
  eyebrow: string;
  heading: string;
  body: string;
  submitLabel: string;
  enquiryTypes: string[];
  disconnectedMessage: string;
  consentLabel: string;
};

export type SitePlainHero = {
  eyebrow: string;
  heading: string;
  body: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
};

export type SiteHighlightItem = {
  name: string;
  description: string;
};

export type SiteHighlightsSection = {
  id: string;
  eyebrow: string;
  heading: string;
  body: string;
  items: SiteHighlightItem[];
};

type SiteConfigBase = {
  businessName: string;
  /** One or two sentence summary of what the business does / the site's purpose. */
  purpose: string;
  targetAudience?: string;
  contact: SiteContact;
  palette: SitePalette;
  navigation: SiteNavItem[];
  enquirySection: SiteEnquirySection;
};

export type CinematicSiteConfig = SiteConfigBase & {
  variant: "cinematic";
  assets: SiteAssets;
  hero: SiteHero;
  productsSection: SiteProductsSection;
};

export type PlainSiteConfig = SiteConfigBase & {
  variant: "plain";
  hero: SitePlainHero;
  highlightsSection: SiteHighlightsSection;
};

export type SiteConfig = CinematicSiteConfig | PlainSiteConfig;
