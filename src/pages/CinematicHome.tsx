import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { siteConfig } from "../site.config";
import { EnquirySection } from "../components/EnquirySection";
import type { CinematicSiteConfig, SiteHeroChapter, SiteProductItem } from "../types/site-config";

// The single-page, three-section cinematic experience described in
// docs/DEVIN_3D_WEBSITE_SPEC.md: a scroll-scrubbed photo-sequence hero, a
// scroll-driven horizontal products/services rail, and a normal-flow
// enquiry section. Everything is driven by siteConfig — no animation/3D
// libraries, no custom scrolling, no wheel/touch interception. Only
// rendered by App.tsx when siteConfig.variant === "cinematic".
export function CinematicHome({ config }: { config: CinematicSiteConfig }) {
  useEffect(() => {
    document.title = siteConfig.businessName;
  }, []);

  const reducedMotion = typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <div id="top">
      <CinematicHero config={config} reducedMotion={!!reducedMotion} />
      <ProductsRail config={config} reducedMotion={!!reducedMotion} />
      <EnquirySection />
    </div>
  );
}

/** Eased 0-1 ramp so chapters crossfade instead of popping in and out. */
function ramp(value: number): number {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * (3 - 2 * clamped);
}

/**
 * Opacity for a chapter at the given hero progress: fades up entering its
 * range and back down leaving it, so neighbouring chapters cross over.
 */
function chapterOpacity(chapter: SiteHeroChapter, progress: number): number {
  const span = Math.max(0.0001, chapter.to - chapter.from);
  const fade = Math.min(0.08, span / 3);
  if (progress <= chapter.from - fade || progress >= chapter.to + fade) return 0;
  const fadeIn = ramp((progress - (chapter.from - fade)) / (fade * 2));
  const fadeOut = 1 - ramp((progress - (chapter.to - fade)) / (fade * 2));
  return Math.min(fadeIn, fadeOut);
}

function HeroChapterCopy({ chapter, level }: { chapter: SiteHeroChapter; level: 1 | 2 }) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <>
      <p className="eyebrow">{chapter.eyebrow}</p>
      <Heading className="hero-chapter__heading">{chapter.heading}</Heading>
      <p className="muted hero-chapter__body">{chapter.body}</p>
      {(chapter.primaryCta || chapter.secondaryCta) && (
        <p className="hero-chapter__actions">
          {chapter.primaryCta && <a className="btn" href={chapter.primaryCta.href}>{chapter.primaryCta.label}</a>}
          {chapter.secondaryCta && <a className="btn btn-secondary" href={chapter.secondaryCta.href}>{chapter.secondaryCta.label}</a>}
        </p>
      )}
    </>
  );
}

function CinematicHero({ config, reducedMotion }: { config: CinematicSiteConfig; reducedMotion: boolean }) {
  const { hero } = config;
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chapterRefs = useRef<Array<HTMLDivElement | null>>([]);
  const framesRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const loadingRef = useRef<Set<number>>(new Set());
  const currentFrameRef = useRef<number>(hero.firstFrame);
  const configuredLastFrame = hero.firstFrame + hero.frameCount - 1;
  // The sequence's real last frame: probed once at mount so a sequence that
  // is shorter on disk than `frameCount` still scrubs across the whole hero
  // instead of freezing on its final available frame.
  const lastFrameRef = useRef<number>(configuredLastFrame);

  const frameUrl = (frame: number) =>
    `${hero.directory}/${hero.filePrefix}${String(frame).padStart(hero.framePadding, "0")}.${hero.fileExtension}`;

  const drawFrame = (frame: number) => {
    const canvas = canvasRef.current;
    const image = framesRef.current.get(frame);
    if (!canvas || !image || !image.complete) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, hero.maxDevicePixelRatio);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const narrow = width < hero.narrowViewportBreakpoint;
    const focal = narrow ? hero.focalPoint.narrow : hero.focalPoint.wide;
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const dx = (width - drawWidth) * focal.x;
    const dy = (height - drawHeight) * focal.y;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
  };

  const loadFrame = (frame: number, onLoad?: () => void) => {
    if (framesRef.current.has(frame) || loadingRef.current.has(frame)) return;
    if (loadingRef.current.size >= hero.loadConcurrency) return;
    loadingRef.current.add(frame);
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      loadingRef.current.delete(frame);
      framesRef.current.set(frame, image);
      // Bound the cache: evict frames far from whatever is currently on
      // screen rather than retaining all `frameCount` decoded frames.
      if (framesRef.current.size > hero.maxCachedFrames) {
        const target = currentFrameRef.current;
        let farthest = -1;
        let farthestDistance = -1;
        for (const key of framesRef.current.keys()) {
          const distance = Math.abs(key - target);
          if (distance > farthestDistance) { farthestDistance = distance; farthest = key; }
        }
        if (farthest >= 0) framesRef.current.delete(farthest);
      }
      onLoad?.();
    };
    image.onerror = () => { loadingRef.current.delete(frame); };
    image.src = frameUrl(frame);
  };

  useEffect(() => {
    let cancelled = false;

    const frameExists = (frame: number) => new Promise<boolean>((resolve) => {
      const probe = new Image();
      probe.onload = () => resolve(true);
      probe.onerror = () => resolve(false);
      probe.src = frameUrl(frame);
    });

    // Binary search (≈log2(frameCount) requests) for the highest frame the
    // sequence actually ships with.
    const resolveLastFrame = async (): Promise<number> => {
      if (await frameExists(configuredLastFrame)) return configuredLastFrame;
      let low = hero.firstFrame;
      let high = configuredLastFrame;
      while (high - low > 1) {
        const mid = Math.floor((low + high) / 2);
        if (await frameExists(mid)) low = mid; else high = mid;
      }
      return low;
    };

    const preloadKeyframes = () => {
      const last = lastFrameRef.current;
      const span = last - hero.firstFrame;
      for (let step = 1; step < 8; step += 1) {
        loadFrame(Math.round(hero.firstFrame + (step / 8) * span));
      }
      loadFrame(last);
    };

    loadFrame(hero.firstFrame, () => drawFrame(hero.firstFrame));

    let ticking = false;

    const update = () => {
      ticking = false;
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0;

      const lastFrame = lastFrameRef.current;
      const targetFrame = Math.round(hero.firstFrame + progress * (lastFrame - hero.firstFrame));
      currentFrameRef.current = targetFrame;

      const nearestLoaded = framesRef.current.has(targetFrame)
        ? targetFrame
        : [...framesRef.current.keys()].sort((a, b) => Math.abs(a - targetFrame) - Math.abs(b - targetFrame))[0];
      if (nearestLoaded !== undefined) drawFrame(nearestLoaded);

      // Prioritize frames ahead of scroll direction, load a small window
      // around the target rather than the whole sequence at once.
      for (let offset = -2; offset <= 4; offset += 1) {
        const frame = Math.min(lastFrame, Math.max(hero.firstFrame, targetFrame + offset));
        loadFrame(frame, () => { if (currentFrameRef.current === frame) drawFrame(frame); });
      }

      chapterRefs.current.forEach((element, index) => {
        const chapter = hero.chapters[index];
        if (!element || !chapter) return;
        const opacity = chapterOpacity(chapter, progress);
        const visible = opacity > 0.02;
        element.style.opacity = opacity.toFixed(3);
        element.style.pointerEvents = visible ? "auto" : "none";
        element.toggleAttribute("inert", !visible);
        element.setAttribute("aria-hidden", visible ? "false" : "true");
      });
    };

    void resolveLastFrame().then((last) => {
      if (cancelled) return;
      lastFrameRef.current = last;
      preloadKeyframes();
      if (!reducedMotion) update();
    });

    if (reducedMotion) return () => { cancelled = true; };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    const onResize = () => { requestAnimationFrame(update); };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    update();
    return () => {
      cancelled = true;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  if (reducedMotion) {
    return (
      <section className="hero-static" aria-labelledby="hero-heading">
        <img className="hero-static__poster" src={hero.poster} alt="" />
        <div className="hero-static__chapters">
          {hero.chapters.map((chapter, index) => (
            <div key={chapter.id} className="hero-chapter" data-align={chapter.align}>
              <div id={index === 0 ? "hero-heading" : undefined}>
                <HeroChapterCopy chapter={chapter} level={index === 0 ? 1 : 2} />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={trackRef}
      className="hero-track"
      aria-label={`${siteConfig.businessName} introduction`}
      style={{ height: `${hero.scrollHeightVh}vh` }}
    >
      <div className="hero-sticky" style={{ backgroundImage: `url("${hero.poster}")` }}>
        <canvas ref={canvasRef} className="hero-canvas" aria-hidden="true" />
        <div className="hero-scrim" aria-hidden="true" />
        {hero.chapters.map((chapter, index) => (
          <div
            key={chapter.id}
            ref={(element) => { chapterRefs.current[index] = element; }}
            className="hero-chapter"
            data-align={chapter.align}
            style={{ opacity: index === 0 ? 1 : 0 }}
          >
            <HeroChapterCopy chapter={chapter} level={index === 0 ? 1 : 2} />
            {chapter.showScrollCue && <p className="hero-scroll-cue" aria-hidden="true">Scroll to discover</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Product imagery always lives directly in `assets.productsDirectory`;
 * anything that tries to escape it (path separators, traversal) is rejected
 * and the card renders text-only.
 */
function resolveProductImage(directory: string, filename: string): string | null {
  const name = filename.trim();
  if (!name || name.includes("/") || name.includes("\\") || name.includes("..")) return null;
  return `${directory}/${name}`;
}

/** Config carries "1:1"; CSS needs "1 / 1". */
function cssAspectRatio(ratio: string | undefined): string {
  const parts = (ratio ?? "1:1").split(/[:/]/).map((part) => part.trim());
  if (parts.length !== 2 || parts.some((part) => !part || Number.isNaN(Number(part)))) return "1 / 1";
  return `${parts[0]} / ${parts[1]}`;
}

function ProductCard({ item, directory }: { item: SiteProductItem; directory: string }) {
  const src = resolveProductImage(directory, item.image);
  return (
    <article className="products-card">
      {src && (
        <div className="products-card__media">
          <img src={src} alt={item.alt ?? item.name} loading="lazy" decoding="async" />
        </div>
      )}
      <p className="eyebrow">{item.category}</p>
      <h3 className="products-card__name">{item.name}</h3>
      <p className="muted">{item.description}</p>
    </article>
  );
}

function ProductsRail({ config, reducedMotion }: { config: CinematicSiteConfig; reducedMotion: boolean }) {
  const { productsSection, assets } = config;
  const trackRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const aspectRatio = useMemo(() => cssAspectRatio(productsSection.imageAspectRatio), [productsSection.imageAspectRatio]);
  const headingId = `${productsSection.id}-heading`;

  useEffect(() => {
    if (reducedMotion) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const track = trackRef.current;
      const rail = railRef.current;
      if (!track || !rail) return;
      const rect = track.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0;
      // Measured travel: the rail's own content width minus what fits on
      // screen — never a hardcoded pixel distance.
      const travel = Math.max(0, rail.scrollWidth - window.innerWidth);
      rail.style.transform = `translate3d(-${(progress * travel).toFixed(2)}px, 0, 0)`;
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reducedMotion]);

  const intro = (
    <div className="products-intro">
      <p className="eyebrow">{productsSection.eyebrow}</p>
      <h2 id={headingId}>{productsSection.heading}</h2>
      <p className="muted">{productsSection.body}</p>
    </div>
  );

  const cards = productsSection.items.map((item) => (
    <ProductCard key={item.image} item={item} directory={assets.productsDirectory} />
  ));

  if (reducedMotion) {
    return (
      <section
        id={productsSection.id}
        className="products-list"
        aria-labelledby={headingId}
        style={{ "--products-aspect-ratio": aspectRatio } as CSSProperties}
      >
        {intro}
        <div className="products-list__items">{cards}</div>
      </section>
    );
  }

  return (
    <section
      id={productsSection.id}
      ref={trackRef}
      className="rail-track"
      aria-labelledby={headingId}
      style={{ height: `${productsSection.scrollHeightVh}vh`, "--products-aspect-ratio": aspectRatio } as CSSProperties}
    >
      <div className="rail-sticky">
        <div ref={railRef} className="products-rail">
          <div className="products-rail__intro">{intro}</div>
          {cards}
        </div>
      </div>
    </section>
  );
}
