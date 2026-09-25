import type { Browser, BrowserContext } from "playwright-core";
import { APP_CONSTANTS } from "@/lib/constants";

// Shared headless-Chromium launcher for the query-based scrapers (Indeed,
// Glassdoor, LinkedIn — see src/lib/scraper/*/index.ts). These sites have no
// public per-company API, so unlike Greenhouse/Lever/Ashby (plain `fetch`
// against a JSON endpoint) they need a real rendered page.
//
// The production Docker image (Alpine) installs the OS `chromium` package
// rather than letting Playwright download its own browser build, since
// Playwright's bundled Chromium is glibc-only and doesn't run on musl/Alpine.
// `CHROMIUM_EXECUTABLE_PATH` must point at that system binary. Locally (non-
// Alpine dev machines), leave it unset and Playwright's own managed Chromium
// (installed via `npx playwright install chromium`) is used instead.
let browserPromise: Promise<Browser> | null = null;

async function launchBrowser(): Promise<Browser> {
  // Deferred import: playwright-core pulls in Node-only internals that must
  // never land in a client bundle.
  const { chromium } = await import("playwright-core");
  return chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
}

// Browsers are expensive to start (hundreds of ms, real OS process) — reuse
// one instance across scraper calls within the same server process instead
// of launching per-run. Automation runs are infrequent (scheduled/manual),
// so this idles most of the time; that's fine for a single-container deploy.
async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = launchBrowser().catch((err) => {
      browserPromise = null; // let the next call retry instead of caching the failure
      throw err;
    });
  }
  return browserPromise;
}

// One fresh, isolated context per search (own cookies/storage) so consecutive
// scrapes don't leak session state into each other, while still reusing the
// underlying browser process.
export async function withBrowserContext<T>(
  fn: (context: BrowserContext) => Promise<T>,
): Promise<T> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: APP_CONSTANTS.QUERY_SCRAPER_USER_AGENT,
    viewport: { width: 1366, height: 900 },
  });
  try {
    return await fn(context);
  } finally {
    await context.close();
  }
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
