import { Suspense, useEffect, useRef, useState } from "react";
import { useI18n, type PhaseKey } from "../i18n";
import { BookAction } from "./BookAction";
import { LazyRamenScene } from "./LazyScene";

const PHASES: { key: PhaseKey; from: number }[] = [
  { key: "hero", from: 0 },
  { key: "explode", from: 0.09 },
  { key: "rebuild", from: 0.48 },
  { key: "extras", from: 0.65 },
  { key: "box", from: 0.77 },
  { key: "book", from: 0.935 },
];

function phaseAt(p: number) {
  let idx = 0;
  PHASES.forEach((ph, i) => {
    if (p >= ph.from) idx = i;
  });
  return idx;
}

export function ScrollStory() {
  const { t } = useI18n();
  const sectionRef = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const section = sectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const total = Math.max(1, rect.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -rect.top / total));
      progress.current = p;
      const hero = 1 - Math.min(1, Math.max(0, (p - 0.03) / 0.1));
      document.documentElement.style.setProperty("--hero", String(hero));
      const next = phaseAt(p);
      setPhase((prev) => (prev === next ? prev : next));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="story" ref={sectionRef} aria-label={t.storyLabel}>
      <div className="story-sticky">
        <div className="mark">
          <h1>{t.brand}</h1>
          <p lang="ja">{t.kana}</p>
        </div>

        <div className="stage" aria-hidden="true">
          <Suspense fallback={null}>
            <LazyRamenScene progress={progress} layers={t.layers} />
          </Suspense>
        </div>

        <div className="captions">
          {PHASES.map((ph, i) => (
            <div
              key={ph.key}
              className={`caption${phase === i ? " is-active" : ""}`}
              aria-hidden={phase !== i}
              inert={phase !== i}
            >
              <h2>{t.phases[ph.key].title}</h2>
              <p>{t.phases[ph.key].text}</p>
              {ph.key === "book" && <BookAction />}
            </div>
          ))}
        </div>

        <p className="scroll-hint" aria-hidden="true">
          {t.scrollHint}
          <span />
        </p>
      </div>
    </section>
  );
}
