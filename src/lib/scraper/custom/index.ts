import { APP_CONSTANTS } from "@/lib/constants";
import type { JobDetails } from "../types";
import { withBrowserContext, sleep } from "../browser";
import type { QuerySearchParams, QuerySearchResult } from "../queryBoard";
import type { AtsProvider } from "../ats/types";

// Generic best-effort scraper for any company's own careers page added to
// the Job Boards catalog as a plain `websiteUrl` (Job Boards page ->
// Add/Edit). Unlike Indeed/Glassdoor/LinkedIn — fixed, well-known DOM
// structure per site, so each gets its own hand-built scraper with real CSS
// selectors — a custom board's page structure is unknown ahead of time, so
// this can't rely on site-specific selectors at all. Instead it visits the
// configured URL exactly once per run — whatever search/filter the admin
// baked into that URL (e.g. a `?q=` query string) is baked in, this scraper
// never rewrites it — and heuristically picks out anchor elements that look
// like job postings: visible link text of a plausible job-title length,
// deduplicated by resolved href, capped to topK.
//
// Company is set to the catalog board's own label (the page IS that
// company's own careers site); location is a best-effort scan of the
// nearest list-item/article/row container's text for something place-like.
// This is deliberately not comparable in reliability to the fixed-selector
// scrapers — a fully client-rendered SPA with no server-rendered anchors by
// the time we read the DOM may return zero results. It's a floor, not
// Indeed-grade extraction, and that trade-off is inherent to supporting an
// arbitrary career page instead of one knowable site.

const NAV_WORDS = new Set([
  "home",
  "about",
  "about us",
  "careers",
  "jobs",
  "contact",
  "contact us",
  "privacy",
  "privacy policy",
  "terms",
  "terms of service",
  "cookie policy",
  "cookies",
  "sign in",
  "sign up",
  "log in",
  "login",
  "logout",
  "search",
  "apply",
  "apply now",
  "learn more",
  "read more",
  "back",
  "next",
  "previous",
  "blog",
  "news",
  "press",
  "benefits",
  "culture",
  "diversity",
  "life at",
  "faq",
  "help",
  "support",
  "accessibility",
  "sitemap",
  "all jobs",
  "view all",
  "see all",
  "filter",
  "filters",
  "clear",
  "reset",
  "share",
  "print",
]);

function looksLikeJobTitle(text: string): boolean {
  const t = text.trim();
  if (t.length < 4 || t.length > 120) return false;
  if (NAV_WORDS.has(t.toLowerCase())) return false;
  // Filters out pure nav/pagination noise ("1", "2", "»", icon-only links).
  if (!/[a-zA-Z]{3,}/.test(t)) return false;
  return true;
}

interface CustomScrapeResult {
  jobs: JobDetails[];
  error?: string;
}

async function scrapeCustomSite(
  websiteUrl: string,
  companyLabel: string,
  topK: number,
): Promise<CustomScrapeResult> {
  try {
    const jobs = await withBrowserContext(async (context) => {
      const page = await context.newPage();
      page.setDefaultTimeout(APP_CONSTANTS.QUERY_SCRAPER_NAV_TIMEOUT_MS);
      await page.goto(websiteUrl, { waitUntil: "domcontentloaded" });
      // Many career pages (Workday, Greenhouse embeds, custom SPAs) render
      // the job list client-side after load — give it a beat to hydrate
      // before reading the DOM. There's no generic "job list loaded" signal
      // to wait on, so this is a fixed pause rather than a locator wait.
      await page.waitForTimeout(1500);

      const anchors = page.locator("a[href]");
      const count = await anchors.count();
      const seen = new Set<string>();
      const results: JobDetails[] = [];

      // Scan more anchors than topK requires (most of a real page's links
      // are nav/footer, not jobs) but bound the scan so a huge page can't
      // hang the run.
      const scanLimit = Math.min(count, APP_CONSTANTS.CUSTOM_SCRAPER_MAX_ANCHORS_SCANNED);

      for (let i = 0; i < scanLimit && results.length < topK; i++) {
        const a = anchors.nth(i);
        const text = (await a.innerText().catch(() => "")).trim();
        if (!looksLikeJobTitle(text)) continue;

        const href = await a.getAttribute("href").catch(() => null);
        if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
          continue;
        }
        let absoluteUrl: string;
        try {
          absoluteUrl = new URL(href, websiteUrl).toString();
        } catch {
          continue;
        }
        if (seen.has(absoluteUrl)) continue;
        seen.add(absoluteUrl);

        // Best-effort location: scan the nearest list-item/article/table-row
        // ancestor's text for something place-like (a "City, Region" pair,
        // or "Remote"). Falls back to empty — downstream treats a missing
        // location as unknown rather than failing.
        const container = a
          .locator("xpath=ancestor::li[1] | xpath=ancestor::article[1] | xpath=ancestor::tr[1]")
          .first();
        const containerText = await container.innerText().catch(() => "");
        const locationMatch = containerText.match(
          /([A-Za-z][A-Za-z.\s]+,\s*[A-Za-z][A-Za-z.\s]+|Remote)/,
        );
        const jobLocation = locationMatch ? locationMatch[0].trim() : "";

        results.push({
          title: text,
          company: companyLabel,
          location: jobLocation,
          description: "",
          url: absoluteUrl,
          isRemote: /remote/i.test(jobLocation) || /remote/i.test(text),
        });
      }

      return results;
    });

    await sleep(APP_CONSTANTS.QUERY_SCRAPER_PAGE_DELAY_MS);
    return { jobs };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { jobs: [], error: message };
  }
}

// Builds a QueryBoardAtsProvider-shaped provider for one catalog board, so
// it reuses the existing "query" branch in automation-run/atsRun.ts
// wholesale — no new provider mode or run-pipeline branching needed. The
// site's own search/filtering is whatever the admin baked into `websiteUrl`
// when adding the board on the Job Boards page; keywords/locations
// configured on the automation are used only downstream (by the relevance
// pipeline) to rank/filter what comes back — never to construct the
// request, since there's no generic way to know how a given career page's
// own search form works.
export function createCustomSiteProvider(
  slug: string,
  label: string,
  websiteUrl: string,
): AtsProvider {
  return {
    mode: "query",
    id: slug,
    label,
    async search(params: QuerySearchParams): Promise<QuerySearchResult> {
      const result = await scrapeCustomSite(websiteUrl, label, params.topK);
      if (result.error) {
        return { jobs: [], errors: [{ reason: result.error }] };
      }
      return { jobs: result.jobs, errors: [] };
    },
  };
}
