import { APP_CONSTANTS } from "@/lib/constants";
import type { JobDetails } from "../types";
import { withBrowserContext, sleep } from "../browser";
import { QueryJobBoardScraper } from "../queryBoard";

// Indeed has no public per-company job API (unlike Greenhouse/Lever/Ashby),
// so this drives a real headless Chromium page against indeed.com's own
// search-results page and reads the rendered job cards. It only reads what's
// visible on the results list (title/company/location/snippet) — it does not
// open each job's detail page for the full description, to keep one search
// to a single page load.
//
// Fragile by nature: Indeed can change these CSS selectors at any time, and
// aggressive/frequent use can get the scraping IP rate-limited or served a
// CAPTCHA challenge page, which will surface as zero results or a "blocked"
// error rather than a crash.
export class IndeedScraper extends QueryJobBoardScraper {
  readonly id = "indeed";
  readonly label = "Indeed";

  protected async runSearch(
    keyword: string,
    location: string | undefined,
  ): Promise<{ jobs: JobDetails[] } | { error: string }> {
    try {
      const jobs = await withBrowserContext(async (context) => {
        const page = await context.newPage();
        page.setDefaultTimeout(APP_CONSTANTS.QUERY_SCRAPER_NAV_TIMEOUT_MS);

        const url = new URL(APP_CONSTANTS.INDEED_SEARCH_URL);
        url.searchParams.set("q", keyword);
        if (location) url.searchParams.set("l", location);

        await page.goto(url.toString(), { waitUntil: "domcontentloaded" });

        // Indeed shows an interstitial/CAPTCHA page under bot suspicion —
        // detect it explicitly so it reports as "blocked" instead of a
        // confusing empty result set.
        const challenged = await page
          .locator("text=/verify you are a human|additional verification/i")
          .first()
          .isVisible()
          .catch(() => false);
        if (challenged) {
          throw new Error(
            "blocked by Indeed's bot-verification challenge — try again later",
          );
        }

        const cardSelector = '[data-testid="slider_item"], .job_seen_beacon';
        const found = await page
          .locator(cardSelector)
          .first()
          .waitFor({ state: "attached", timeout: APP_CONSTANTS.QUERY_SCRAPER_NAV_TIMEOUT_MS })
          .then(() => true)
          .catch(() => false);
        if (!found) return [];

        const cards = page.locator(cardSelector);
        const count = Math.min(
          await cards.count(),
          APP_CONSTANTS.QUERY_SCRAPER_MAX_RESULTS_PER_SEARCH,
        );

        const results: JobDetails[] = [];
        for (let i = 0; i < count; i++) {
          const card = cards.nth(i);
          const title = (
            await card.locator('h2.jobTitle span[title], h2.jobTitle').first().innerText().catch(() => "")
          ).trim();
          if (!title) continue;

          const company = (
            await card.locator('[data-testid="company-name"]').first().innerText().catch(() => "")
          ).trim();
          const jobLocation = (
            await card.locator('[data-testid="text-location"]').first().innerText().catch(() => "")
          ).trim();
          const snippet = (
            await card.locator('[data-testid="jobsnippet_footer"], .job-snippet').first().innerText().catch(() => "")
          ).trim();
          const href = await card.locator("a").first().getAttribute("href").catch(() => null);
          const jobUrl = href ? new URL(href, APP_CONSTANTS.INDEED_SEARCH_URL).toString() : url.toString();

          results.push({
            title,
            company: company || "Unknown",
            location: jobLocation,
            description: snippet,
            url: jobUrl,
            isRemote: /remote/i.test(jobLocation) || /remote/i.test(snippet),
          });
        }
        return results;
      });

      await sleep(APP_CONSTANTS.QUERY_SCRAPER_PAGE_DELAY_MS);
      return { jobs };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { error: message };
    }
  }
}

export const indeedScraper = new IndeedScraper();

// Bound to the AtsProvider["search"] shape used by the run pipeline (see
// ats/registry.ts).
export async function searchIndeedJobs(params: {
  keywords: string[];
  locations: string[];
  topK: number;
}) {
  return indeedScraper.search(params);
}
