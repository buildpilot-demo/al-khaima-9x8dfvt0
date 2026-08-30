import { useEffect, useRef } from "react";
import { siteConfig } from "../site.config";
import { EnquirySection } from "../components/EnquirySection";
import type { CinematicSiteConfig } from "../types/site-config";

// The single-page, three-section cinematic experience described in
// docs/DEVIN_3D_WEBSITE_SPEC.md: a scroll-scrubbed photo-sequence hero, a
// scroll-driven horizontal products/services rail, and a normal-flow
// enquiry section. This is a working baseline built entirely from
// siteConfig — Devin's job per build is to take this further (P1 polish:
// chapter fades, grain, spacing) without introducing animation/3D
// libraries or migrating frameworks (see the "Build constraints" section of
// the spec). Only rendered by App.tsx when siteConfig.variant === "cinematic".
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

function CinematicHero({ config, reducedMotion }: { config: CinematicSiteConfig; reducedMotion: boolean }) {
  const { hero } = config;
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chapterRefs = useRef<Array<HTMLDivElement | null>>([]);
  const framesRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const loadingRef = useRef<Set<number>>(new Set());
  const currentFrameRef = useRef<number>(hero.firstFrame);

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
    const lastFrame = hero.firstFrame + hero.frameCount - 1;
    loadFrame(hero.firstFrame, () => drawFrame(hero.firstFrame));
    loadFrame(lastFrame);
    // Spread a handful of keyframes across the sequence so scrubbing to any
    // point shows something close by immediately while nearer frames load.
    for (let step = 1; step < 8; step += 1) {
      loadFrame(Math.round(hero.firstFrame + (step / 8) * (hero.frameCount - 1)));
    }

    if (reducedMotion) return;

    let ticking = false;

    const update = () => {
      ticking = false;
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0;

      const lastFrame = hero.firstFrame + hero.frameCount - 1;
      const targetFrame = Math.round(hero.firstFrame + progress * (hero.frameCount - 1));
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
        if (!element) return;
        const chapter = hero.chapters[index];
        const visible = progress >= chapter.from && progress <= chapter.to;
        element.style.opacity = visible ? "1" : "0";
        element.style.pointerEvents = visible ? "auto" : "none";
      });
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    const onResize = () => { drawFrame(currentFrameRef.current); };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  if (reducedMotion) {
    return (
      <section className="hero-static">
        <img className="hero-static__poster" src={hero.poster} alt="" />
        <div className="hero-static__chapters">
          {hero.chapters.map((chapter) => (
            <div key={chapter.id} className="hero-chapter" data-align={chapter.align}>
              <p className="eyebrow">{chapter.eyebrow}</p>
              <h1>{chapter.heading}</h1>
              <p className="muted">{chapter.body}</p>
              {chapter.primaryCta && <a className="btn" href={chapter.primaryCta.href}>{chapter.primaryCta.label}</a>}
              {chapter.secondaryCta && <a className="btn btn-secondary" href={chapter.secondaryCta.href}>{chapter.secondaryCta.label}</a>}
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={trackRef} className="hero-track" style={{ height: `${hero.scrollHeightVh}vh` }}>
      <div className="hero-sticky">
        <canvas ref={canvasRef} className="hero-canvas" aria-hidden="true" />
        {hero.chapters.map((chapter, index) => (
          <div
            key={chapter.id}
            ref={(element) => { chapterRefs.current[index] = element; }}
            className="hero-chapter"
            data-align={chapter.align}
            style={{ opacity: index === 0 ? 1 : 0 }}
          >
            <p className="eyebrow">{chapter.eyebrow}</p>
            <h1>{chapter.heading}</h1>
            <p className="muted">{chapter.body}</p>
            {chapter.primaryCta && <a className="btn" href={chapter.primaryCta.href}>{chapter.primaryCta.label}</a>}
            {chapter.secondaryCta && <a className="btn btn-secondary" href={chapter.secondaryCta.href}>{chapter.secondaryCta.label}</a>}
            {chapter.showScrollCue && <p className="hero-scroll-cue" aria-hidden="true">Scroll to discover</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function ProductsRail({ config, reducedMotion }: { config: CinematicSiteConfig; reducedMotion: boolean }) {
  const { productsSection, assets } = config;
  const trackRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

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
      const travel = Math.max(0, rail.scrollWidth - rail.clientWidth);
      rail.style.transform = `translateX(-${progress * travel}px)`;
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

  const panels = (
    <>
      <div className="products-panel products-panel--intro">
        <p className="eyebrow">{productsSection.eyebrow}</p>
        <h2>{productsSection.heading}</h2>
        <p className="muted">{productsSection.body}</p>
      </div>
      {productsSection.items.map((item) => (
        <div className="products-panel" key={item.image}>
          <img src={`${assets.productsDirectory}/${item.image}`} alt={item.alt ?? item.name} loading="lazy" />
          <p className="eyebrow">{item.category}</p>
          <h3>{item.name}</h3>
          <p className="muted">{item.description}</p>
        </div>
      ))}
    </>
  );

  if (reducedMotion) {
    return (
      <section id={productsSection.id} className="products-list">
        {panels}
      </section>
    );
  }

  return (
    <section id={productsSection.id} ref={trackRef} className="rail-track" style={{ height: `${productsSection.scrollHeightVh}vh` }}>
      <div className="rail-sticky">
        <div ref={railRef} className="products-rail">
          {panels}
        </div>
      </div>
    </section>
  );
}
