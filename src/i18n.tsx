import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "es";
export type PhaseKey = "hero" | "explode" | "rebuild" | "extras" | "box" | "book";

const en = {
  brand: "KAI",
  kana: "ラーメン",
  lang: { en: "EN", es: "ES" },
  langLabel: "Language",
  scrollHint: "Scroll",
  storyLabel: "KAI ramen, taken apart and packed to go",
  phases: {
    hero: {
      title: "One bowl. Six layers.",
      text: "Scroll to take it apart.",
    },
    explode: {
      title: "Every layer in plain sight.",
      text: "Nothing hides under the broth.",
    },
    rebuild: {
      title: "Back in its place.",
      text: "Bottom to top, one by one.",
    },
    extras: {
      title: "Now, the extras.",
      text: "Menma, narutomaki, chopsticks.",
    },
    box: {
      title: "To go.",
      text: "All in. Lid down.",
    },
    book: {
      title: "A seat for two.",
      text: "Tonight · 20:30 · At the counter",
    },
  } satisfies Record<PhaseKey, { title: string; text: string }>,
  layers: [
    { name: "Bowl", line: "Porcelain with a lantern-red band." },
    { name: "Broth", line: "Pork bone, twelve hours at a rolling simmer." },
    { name: "Noodles", line: "Thin, wavy, firm to the bite." },
    { name: "Chashu", line: "Braised pork belly in soy and mirin." },
    { name: "Ajitama", line: "Marinated egg, yolk just set." },
    { name: "Nori & negi", line: "Toasted seaweed, spring onion." },
  ],
  extras: {
    title: "On the side",
    items: ["Menma", "Narutomaki", "Chopsticks"],
  },
  book: {
    cta: "Request a seat",
    done: "Noted: a seat for two at 20:30. Demo — no real booking.",
    note: "Demo — no real booking.",
  },
  static: {
    title: "One bowl. Six layers.",
    note: "Motion is reduced, so the bowl stays whole. The layers are listed below.",
    noGl: "3D is unavailable in this browser. The layers are listed below.",
    layersTitle: "What goes in the bowl",
  },
};

const es: typeof en = {
  brand: "KAI",
  kana: "ラーメン",
  lang: { en: "EN", es: "ES" },
  langLabel: "Idioma",
  scrollHint: "Scroll",
  storyLabel: "Ramen KAI, desarmado y empaquetado para llevar",
  phases: {
    hero: {
      title: "Un bowl. Seis capas.",
      text: "Baja para desarmarlo.",
    },
    explode: {
      title: "Cada capa, a la vista.",
      text: "Nada se esconde bajo el caldo.",
    },
    rebuild: {
      title: "Y vuelve a su sitio.",
      text: "De abajo arriba, una a una.",
    },
    extras: {
      title: "Ahora, los extras.",
      text: "Menma, narutomaki, palillos.",
    },
    box: {
      title: "Para llevar.",
      text: "Todo dentro. Tapa cerrada.",
    },
    book: {
      title: "Mesa para dos.",
      text: "Esta noche · 20:30 · En la barra",
    },
  },
  layers: [
    { name: "Tazón", line: "Porcelana con banda rojo farol." },
    { name: "Caldo", line: "Hueso de cerdo, doce horas a fuego vivo." },
    { name: "Fideos", line: "Finos, ondulados, firmes al morder." },
    { name: "Chashu", line: "Panceta braseada en soja y mirin." },
    { name: "Ajitama", line: "Huevo marinado, yema apenas cuajada." },
    { name: "Nori y negi", line: "Alga tostada, cebolleta." },
  ],
  extras: {
    title: "Aparte",
    items: ["Menma", "Narutomaki", "Palillos"],
  },
  book: {
    cta: "Pedir mesa",
    done: "Anotado: mesa para dos a las 20:30. Demo — sin reserva real.",
    note: "Demo — sin reserva real.",
  },
  static: {
    title: "Un bowl. Seis capas.",
    note: "El movimiento está reducido, así que el bowl se queda entero. Las capas van listadas debajo.",
    noGl: "El 3D no está disponible en este navegador. Las capas van listadas debajo.",
    layersTitle: "Qué lleva el bowl",
  },
};

const dicts = { en, es };

type I18nValue = {
  lang: Lang;
  t: typeof en;
  setLang: (lang: Lang) => void;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("kai-lang");
    return saved === "en" || saved === "es" ? saved : "es";
  });

  const setLang = (next: Lang) => {
    setLangState(next);
    localStorage.setItem("kai-lang", next);
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => ({ lang, t: dicts[lang], setLang }), [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
