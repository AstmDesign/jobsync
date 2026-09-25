import { APP_CONSTANTS } from "@/lib/constants";
import { isQueryBoard, type JobBoard } from "@/models/automation.model";

export interface AtsRunConfig {
  // Company-mode boards (Greenhouse/Lever/Ashby) populate this from the
  // watchlist; query-mode boards (Indeed/Glassdoor/LinkedIn) have no
  // companies concept, so it's always empty for them — search runs off
  // `keywords`/`locations` instead (see queryBoard.ts / atsRun.ts).
  companies: { name: string; token: string; host?: "default" | "eu" }[];
  targetTitles: string[];
  keywords: string[];
  locations: string[];
  strictLocation: boolean;
  topK: number;
  saveUnanalyzed: boolean;
}

export function parseAtsConfig(
  sourceConfig: string | null | undefined,
  jobBoard: JobBoard,
): AtsRunConfig | null {
  if (!sourceConfig) return null;
  try {
    const parsed = JSON.parse(sourceConfig);
    const cfg = parsed?.[jobBoard];
    if (!cfg) return null;

    const keywords = Array.isArray(cfg.keywords) ? cfg.keywords : [];
    // Query-mode boards search by keyword instead of a company watchlist —
    // require at least one keyword instead of at least one company.
    if (isQueryBoard(jobBoard)) {
      if (keywords.length === 0) return null;
    } else if (!Array.isArray(cfg.companies)) {
      return null;
    }

    return {
      companies: Array.isArray(cfg.companies) ? cfg.companies : [],
      targetTitles: Array.isArray(cfg.targetTitles) ? cfg.targetTitles : [],
      keywords,
      locations: Array.isArray(cfg.locations)
        ? isQueryBoard(jobBoard)
          ? cfg.locations.slice(0, APP_CONSTANTS.QUERY_SCRAPER_MAX_LOCATIONS)
          : cfg.locations
        : [],
      strictLocation: !!cfg.strictLocation,
      topK:
        typeof cfg.topK === "number" && cfg.topK > 0
          ? cfg.topK
          : APP_CONSTANTS.MAX_JOBS_PER_RUN,
      saveUnanalyzed: cfg.saveUnanalyzed !== false,
    };
  } catch {
    return null;
  }
}
