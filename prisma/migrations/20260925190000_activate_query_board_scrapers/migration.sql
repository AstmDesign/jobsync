-- Indeed/Glassdoor/LinkedIn now have real scraper classes wired into
-- src/lib/scraper/ats/registry.ts (query-mode: headless-browser search by
-- keyword+location, no per-company API — see src/lib/scraper/{indeed,
-- glassdoor,linkedin}/index.ts). Flip them from "coming soon" to supported so
-- the Job Boards admin page and the automation wizard's board dropdown treat
-- them the same way as Greenhouse/Lever/Ashby.
UPDATE "JobBoard"
SET
  "providerKey" = 'linkedin',
  "isSupported" = true,
  "description" = 'Keyword + location search against LinkedIn''s public job search results (logged-out only — no login automation). Most fragile of the three; expect occasional login-wall blocks.',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'linkedin';

UPDATE "JobBoard"
SET
  "providerKey" = 'indeed',
  "isSupported" = true,
  "description" = 'Keyword + location search against Indeed''s public job search results.',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'indeed';

UPDATE "JobBoard"
SET
  "providerKey" = 'glassdoor',
  "isSupported" = true,
  "description" = 'Keyword + location search against Glassdoor''s public job search results. Glassdoor gates content behind sign-in more aggressively than Indeed — expect more frequent blocks.',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'glassdoor';
