import { lazy } from "react";

export const LazyRamenScene = lazy(() =>
  import("./RamenScene").then((m) => ({ default: m.RamenScene })),
);
