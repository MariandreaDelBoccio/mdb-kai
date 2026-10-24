import { useState } from "react";
import { useI18n } from "../i18n";

export function BookAction() {
  const { t } = useI18n();
  const [requested, setRequested] = useState(false);

  return (
    <div className="book">
      <button type="button" className="btn" onClick={() => setRequested(true)} disabled={requested}>
        {t.book.cta}
      </button>
      <p className="book-note" role="status">
        {requested ? t.book.done : t.book.note}
      </p>
    </div>
  );
}
