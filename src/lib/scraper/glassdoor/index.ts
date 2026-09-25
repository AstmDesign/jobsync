import { APP_CONSTANTS } from "@/lib/constants";
import type { JobDetails } from "../types";
import { withBrowserContext, sleep } from "../browser";
import { QueryJobBoardScraper } from "../queryBoard";

// Glassdoor, like Indeed, has no public per-company job API, so this drives a
// real headless Chromium page against glassdoor.com's own search-results page
// and reads the rendered job cards. Only the results-list fields are read
// (title/company/location/snippet) — no per-job detail page is opened, to
// keep one search to a single page load.
//
// Glassdoor is generally more aggressive than Indeed about gating content
// behind a login wall and serving interstitials to automated traffic, so
// expect this one to be the most fragile/most often "blocked" of the three.
export class GlassdoorScraper extends QueryJobBoardScraper {
  readonly id = "glassdoor";
  readonly label = "Glassdoor";

  protected async runSearch(
    keyword: string,
    location: string | undefined,
  ): Promise<{ jobs: JobDetails[] } | { error: string }> {
    try {
      const jobs = await withBrowserContext(async (context) => {
        const page = await context.newPage();
        page.setDefaultTimeout(APP_CONSTANTS.QUERY_SCRAPER_NAV_TIMEOUT_MS);

        const url = new URL(APP_CONSTANTS.GLASSDOOR_SEARCH_URL);
        url.searchParams.set("sc.keyword", keyword);
        if (location) url.searchParams.set("locKeyword", location);

        await page.goto(url.toString(), { waitUntil: "domcontentloaded" });

        // Glassdoor shows a sign-in modal or a "let's confirm you're human"
        // interstitial under bot suspicion — detect both explicitly so they
        // report as "blocked" instead of a confusing empty result set.
        const challenged = await page
          .locator(
            "text=/let's confirm you're human|verify you are a human|sign up to continue/i",
          )
          .first()
          .isVisible()
          .catch(() => false);
        if (challenged) {
          throw new Error(
            "blocked by Glassdoor's bot-verification / sign-in wall — try again later",
          );
        }

        const cardSelector = 'li[data-test="jobListing"], .JobsList_jobListItem__wjTHv';
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
            await card.locator('[data-test="job-title"]').first().innerText().catch(() => "")
          ).trim();
          if (!title) continue;

          const company = (
            await card
              .locator('[data-test="employer-name"]')
              .first()
              .innerText()
              .catch(() => "")
          ).trim();
          const jobLocation = (
            await card.locator('[data-test="emp-location"]').first().innerText().catch(() => "")
          ).trim();
          const snippet = (
            await card
              .locator('[data-test="descSnippet"], .JobCard_jobDescriptionSnippet__l1tnl')
              .first()
              .innerText()
              .catch(() => "")
          ).trim();
          const salary = (
            await card
              .locator('[data-test="detailSalary"]')
              .first()
              .innerText()
              .catch(() => "")
          ).trim();
          const href = await card.locator("a[data-test='job-link'], a").first().getAttribute("href").catch(() => null);
          const jobUrl = href ? new URL(href, APP_CONSTANTS.GLASSDOOR_SEARCH_URL).toString() : url.toString();

          results.push({
            title,
            company: company || "Unknown",
            location: jobLocation,
            description: snippet,
            url: jobUrl,
            salary: salary || undefined,
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

export const glassdoorScraper = new GlassdoorScraper();

// Bound to the AtsProvider["search"] shape used by the run pipeline (see
// ats/registry.ts).
export async function searchGlassdoorJobs(params: {
  keywords: string[];
  locations: string[];
  topK: number;
}) {
  return glassdoorScraper.search(params);
}
