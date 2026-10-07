"use client";

import { useSearchParams } from "next/navigation";
import { HomeBento } from "./home-bento";
import { StudioView } from "./studio-view";
import { FinanceView } from "./finance-view";
import { PerformanceView } from "./performance-view";
import { AttentionView } from "./attention";

type View = "home" | "attention" | "studio" | "finance" | "performance";

/**
 * Home is a set of chunks that each answer one question. Tapping a chunk opens
 * its own focused view (?view=…) instead of stacking every section on one page.
 */
export function HomeView() {
  const params = useSearchParams();
  const view = (params.get("view") as View) || "home";
  switch (view) {
    case "attention":
      return <AttentionView />;
    case "studio":
      return <StudioView />;
    case "finance":
      return <FinanceView />;
    case "performance":
      return <PerformanceView />;
    default:
      return <HomeBento />;
  }
}
