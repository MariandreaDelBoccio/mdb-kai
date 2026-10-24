import { Suspense, useEffect, useRef } from "react";
import { useI18n } from "../i18n";
import { BookAction } from "./BookAction";
import { LazyRamenScene } from "./LazyScene";

function BowlFallback() {
  return (
    <svg className="bowl-fallback" viewBox="0 0 320 220" role="img" aria-label="Ramen bowl">
      <ellipse cx="160" cy="192" rx="110" ry="12" fill="#2a0905" opacity=".35" />
      <path d="M34 92h252c0 56-52 96-126 96S34 148 34 92z" fill="#f2ebdb" />
      <path d="M44 120h232c-6 10-12 20-24 30H68c-12-10-18-20-24-30z" fill="#a3261a" />
      <ellipse cx="160" cy="92" rx="126" ry="30" fill="#f6f1e5" />
      <ellipse cx="160" cy="92" rx="112" ry="25" fill="#d3ab72" />
      <path
        d="M96 90c20-28 40-26 60-14s44 14 68-6c-10 22-36 34-66 30s-48-4-62-10z"
        fill="#e9cc79"
      />
      <ellipse cx="206" cy="86" rx="22" ry="12" fill="#f3ecdc" />
      <circle cx="206" cy="86" r="8" fill="#ee9a26" />
      <ellipse cx="116" cy="76" rx="26" ry="14" fill="#b97a58" />
      <rect x="170" y="44" width="34" height="42" rx="2" fill="#111d15" transform="rotate(8 187 65)" />
    </svg>
  );
}

export function StaticStory({ webgl, reason }: { webgl: boolean; reason: "reduced" | "nogl" }) {
  const { t } = useI18n();
  const progress = useRef(0);

  useEffect(() => {
    document.documentElement.style.setProperty("--hero", "1");
  }, []);

  return (
    <main className="static">
      <section className="static-hero">
        <div className="mark">
          <h1>{t.brand}</h1>
          <p lang="ja">{t.kana}</p>
        </div>
        <div className="stage" aria-hidden="true">
          {webgl ? (
            <Suspense fallback={null}>
              <LazyRamenScene progress={progress} layers={t.layers} still />
            </Suspense>
          ) : (
            <BowlFallback />
          )}
        </div>
        <div className="caption is-active">
          <h2>{t.static.title}</h2>
          <p>{reason === "reduced" ? t.static.note : t.static.noGl}</p>
        </div>
      </section>

      <section className="static-layers" aria-labelledby="layers-title">
        <h2 id="layers-title">{t.static.layersTitle}</h2>
        <ul>
          {t.layers.map((l) => (
            <li key={l.name}>
              <span className="legend-name">{l.name}</span>
              <span className="legend-line">{l.line}</span>
            </li>
          ))}
        </ul>
        <p className="static-extras">
          <strong>{t.extras.title}:</strong> {t.extras.items.join(" · ")}
        </p>
      </section>

      <section className="static-book">
        <h2>{t.phases.book.title}</h2>
        <p>{t.phases.book.text}</p>
        <BookAction />
      </section>
    </main>
  );
}
