import { useEffect, useState } from "react";
import { useI18n, type Lang } from "./i18n";
import { ScrollStory } from "./components/ScrollStory";
import { StaticStory } from "./components/StaticStory";
import { hasWebGL } from "./webgl";

const langs: Lang[] = ["es", "en"];

export default function App() {
  const { t, lang, setLang } = useI18n();
  const [webgl, setWebgl] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setWebgl(hasWebGL());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const animated = webgl && !reduceMotion;

  return (
    <div className="kai">
      <header className="kai-header">
        <span className="kai-brand">
          {t.brand}
          <small lang="ja">{t.kana}</small>
        </span>
        <div className="lang" role="group" aria-label={t.langLabel}>
          {langs.map((l) => (
            <button
              key={l}
              type="button"
              className={lang === l ? "is-active" : ""}
              aria-pressed={lang === l}
              onClick={() => setLang(l)}
            >
              {t.lang[l]}
            </button>
          ))}
        </div>
      </header>

      {animated ? (
        <ScrollStory />
      ) : (
        <StaticStory webgl={webgl} reason={webgl ? "reduced" : "nogl"} />
      )}
    </div>
  );
}
