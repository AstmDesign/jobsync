import { APP_CONSTANTS } from "@/lib/constants";
import type { JobDetails } from "../types";
import { withBrowserContext, sleep } from "../browser";
import { QueryJobBoardScraper } from "../queryBoard";

// IMPORTANT SCOPE LIMITATION: this scraper only ever navigates LinkedIn's
// public "guest" job search results page (the same page search engines can
// index, visible to a logged-out visitor). It never logs in, never carries a
// session cookie, and never automates authenticated pages. This is a
// deliberate, permanent constraint — not a placeholder to "upgrade" later —
// because LinkedIn has a well-documented history of pursuing legal action
// against automated scraping of its authenticated surface (see hiQ Labs v.
// LinkedIn). Restricting this to the logged-out guest search page keeps the
// scope to publicly-published, unauthenticated content only.
//
// Practical consequence of that restriction: LinkedIn's guest search page is
// also the most likely of the three to serve a login-wall interstitial or an
// incomplete result set to automated traffic, so treat this as the most
// fragile / most rate-limit-prone provider of the three.
export class LinkedInScraper extends QueryJobBoardScraper {
  readonly id = "linkedin";
  readonly label = "LinkedIn";

  protected async runSearch(
    keyword: string,
    location: string | undefined,
  ): Promise<{ jobs: JobDetails[] } | { error: string }> {
    try {
      const jobs = await withBrowserContext(async (context) => {
        const page = await context.newPage();
        page.setDefaultTimeout(APP_CONSTANTS.QUERY_SCRAPER_NAV_TIMEOUT_MS);

        const url = new URL(APP_CONSTANTS.LINKEDIN_SEARCH_URL);
        url.searchParams.set("keywords", keyword);
        if (location) url.searchParams.set("location", location);

        await page.goto(url.toString(), { waitUntil: "domcontentloaded" });

        // LinkedIn redirects logged-out automated traffic to an
        // authwall/login page under bot suspicion — detect it explicitly so
        // it reports as "blocked" instead of a confusing empty result set.
        const challenged = await page
          .locator("text=/sign in to see more jobs|join now to see|authwall/i")
          .first()
          .isVisible()
          .catch(() => false);
        if (challenged) {
          throw new Error(
            "blocked by LinkedIn's login wall for guest traffic — try again later",
          );
        }

        const cardSelector = ".jobs-search__results-list li, .base-card";
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
            await card
              .locator(".base-search-card__title, h3")
              .first()
              .innerText()
              .catch(() => "")
          ).trim();
          if (!title) continue;

          const company = (
            await card
              .locator(".base-search-card__subtitle, h4")
              .first()
              .innerText()
              .catch(() => "")
          ).trim();
          const jobLocation = (
            await card
              .locator(".job-search-card__location")
              .first()
              .innerText()
              .catch(() => "")
          ).trim();
          const href = await card.locator("a").first().getAttribute("href").catch(() => null);
          const jobUrl = href ? new URL(href, APP_CONSTANTS.LINKEDIN_SEARCH_URL).toString() : url.toString();

          // The guest results list doesn't render a description snippet
          // (unlike Indeed/Glassdoor) — only title/company/location/link are
          // available without opening the authenticated job detail view,
          // which this scraper deliberately never does.
          results.push({
            title,
            company: company || "Unknown",
            location: jobLocation,
            description: "",
            url: jobUrl,
            isRemote: /remote/i.test(jobLocation),
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

export const linkedInScraper = new LinkedInScraper();

// Bound to the AtsProvider["search"] shape used by the run pipeline (see
// ats/registry.ts).
export async function searchLinkedInJobs(params: {
  keywords: string[];
  locations: string[];
  topK: number;
}) {
  return linkedInScraper.search(params);
}
