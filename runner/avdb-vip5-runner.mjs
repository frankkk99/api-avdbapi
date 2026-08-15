import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = (process.env.AVDB_BASE_URL || 'https://avdbapi.com').replace(/\/$/, '');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const RUN_ID = process.env.RUN_ID || '';
const DEFAULT_START = Math.max(Number(process.env.START_PAGE || 1), 1);
const DEFAULT_END = Math.max(Number(process.env.END_PAGE || 10262), DEFAULT_START);
const PAGE_DELAY_MS = Math.max(Number(process.env.PAGE_DELAY_MS || 1200), 0);
const API_CONCURRENCY = Math.min(Math.max(Number(process.env.API_CONCURRENCY || 6), 1), 8);
const HEADLESS = !['0', 'false', 'no', 'off'].includes(String(process.env.HEADLESS || 'true').toLowerCase());
const CHROME_USER_DATA_DIR = process.env.CHROME_USER_DATA_DIR || '';
const PAGE_RETRY_COUNT = Math.min(Math.max(Number(process.env.PAGE_RETRY_COUNT || 3), 1), 5);
const PAGE_403_WAIT_MS = Math.max(Number(process.env.PAGE_403_WAIT_MS || 10000), 0);
const MAX_CONSECUTIVE_403 = Math.min(Math.max(Number(process.env.MAX_CONSECUTIVE_403 || 5), 1), 20);
const HUMAN_VERIFICATION_WAIT_MS = Math.max(Number(process.env.HUMAN_VERIFICATION_WAIT_MS || 600000), 30000);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) are required');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pageUrl(pageNumber) {
  return pageNumber <= 1 ? `${BASE_URL}/` : `${BASE_URL}/index-${pageNumber}/`;
}

function findChrome() {
  if (process.env.CHROME_EXECUTABLE_PATH) return process.env.CHROME_EXECUTABLE_PATH;
  for (const command of ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable']) {
    try { return execFileSync('sh', ['-lc', `command -v ${command}`], { encoding: 'utf8' }).trim(); } catch { /* try next */ }
  }
  throw new Error('Chrome/Chromium not found. Set CHROME_EXECUTABLE_PATH.');
}

async function isHumanVerificationPage(page) {
  return page.evaluate(() => {
    const text = String(document.body?.innerText || '').slice(0, 8000);
    const title = String(document.title || '');
    const hasTurnstile = Boolean(document.querySelector(
      'iframe[src*="challenges.cloudflare.com"], input[name="cf-turnstile-response"]'
    ));
    return hasTurnstile || /just a moment|performing security verification|verify you are human|cloudflare/i.test(`${title} ${text}`);
  }).catch(() => false);
}

async function waitForHumanVerification(page, pageNumber) {
  if (HEADLESS) {
    throw new Error(
      `Cloudflare human verification is required on page ${pageNumber}. Set HEADLESS=false and run again.`
    );
  }

  const waitSeconds = Math.round(HUMAN_VERIFICATION_WAIT_MS / 1000);
  console.warn(
    `Cloudflare verification is open for page ${pageNumber}. Tick "Verify you are human" in the visible browser tab; waiting up to ${waitSeconds} seconds.`
  );

  const deadline = Date.now() + HUMAN_VERIFICATION_WAIT_MS;
  while (Date.now() < deadline) {
    if (!(await isHumanVerificationPage(page))) {
      console.log(`Cloudflare verification cleared for page ${pageNumber}; continuing.`);
      return;
    }
    await sleep(1000);
  }

  throw new Error(
    `Cloudflare human verification was not completed within ${waitSeconds} seconds on page ${pageNumber}`
  );
}

function absoluteAvdbUrl(value, base) {
  try {
    const url = new URL(value, base);
    return url.protocol === 'https:' && ['avdbapi.com', 'www.avdbapi.com'].includes(url.hostname.toLowerCase())
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function stripTags(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getPlayerUrl(item) {
  const serverData = item?.episodes?.server_data;
  if (!serverData || typeof serverData !== 'object') return null;
  const full = serverData.Full || serverData.full;
  if (typeof full?.link_embed === 'string' && full.link_embed) return full.link_embed;
  for (const value of Object.values(serverData)) {
    if (typeof value?.link_embed === 'string' && value.link_embed) return value.link_embed;
  }
  return null;
}

async function extractApiLinks(page, currentPageUrl) {
  const fromDom = await page.evaluate((baseUrl) => {
    const found = new Set();
    for (const element of document.querySelectorAll('a,button,[data-api-url],[data-url],[data-href]')) {
      const source = `${element.textContent || ''} ${Array.from(element.attributes).map((attribute) => `${attribute.name}=${attribute.value}`).join(' ')}`;
      for (const attribute of Array.from(element.attributes)) {
        const value = attribute.value;
        if (!value || !(/api|url|href|link|onclick/i.test(attribute.name) || /\bapi\b/i.test(source))) continue;
        try {
          const url = new URL(value, baseUrl);
          if (url.protocol === 'https:' && ['avdbapi.com', 'www.avdbapi.com'].includes(url.hostname.toLowerCase()) && /api/i.test(`${source} ${url}`)) {
            found.add(url.toString());
          }
        } catch { /* ignore malformed DOM values */ }
      }
    }
    return [...found];
  }, currentPageUrl).catch(() => []);

  const html = await page.content();
  const rawUrls = html.match(/(?:https?:\/\/(?:www\.)?avdbapi\.com)?\/[A-Za-z0-9_./?=&%-]*api[A-Za-z0-9_./?=&%-]*/gi) || [];
  const fromHtml = rawUrls.map((value) => absoluteAvdbUrl(value, currentPageUrl)).filter(Boolean);
  return [...new Set([...fromDom, ...fromHtml])].slice(0, 80);
}

async function fetchApiPayloads(page, apiLinks) {
  return page.evaluate(async ({ urls, concurrency }) => {
    const results = [];
    let cursor = 0;
    async function worker() {
      while (cursor < urls.length) {
        const index = cursor++;
        const url = urls[index];
        const started = performance.now();
        try {
          const response = await fetch(url, {
            credentials: 'include',
            cache: 'no-store',
            headers: { Accept: 'application/json,text/plain,*/*' },
          });
          const text = await response.text();
          results.push({ index, url, status: response.status, elapsedMs: Math.round(performance.now() - started), text });
        } catch (error) {
          results.push({ index, url, status: 0, elapsedMs: Math.round(performance.now() - started), text: '', error: String(error?.message || error) });
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
    return results.sort((a, b) => a.index - b.index);
  }, { urls: apiLinks, concurrency: API_CONCURRENCY });
}

function normalizeResult(result, pageNumber, sourcePageUrl) {
  if (result.status < 200 || result.status >= 300) return null;
  let payload;
  try { payload = JSON.parse(result.text); } catch { return null; }
  const rows = Array.isArray(payload?.list) ? payload.list : payload ? [payload] : [];
  const item = rows[0];
  if (!item || item.id === undefined || item.id === null) return null;
  const playerPageUrl = getPlayerUrl(item);
  let origin = null;
  let referer = null;
  try {
    if (playerPageUrl) {
      const playerUrl = new URL(playerPageUrl);
      origin = playerUrl.origin;
      referer = `${playerUrl.origin}/`;
    }
  } catch { /* keep player fields null */ }
  return {
    vip_bucket: 'VIP5',
    source: 'avdbapi',
    source_page_url: sourcePageUrl,
    source_page_number: pageNumber,
    api_url: result.url,
    external_id: String(item.id),
    movie_code: item.movie_code || item.slug || null,
    name: item.name || '',
    original_name: item.origin_name || item.original_name || null,
    slug: item.slug || null,
    type_name: item.type_name || item.type?.name || null,
    category: Array.isArray(item.category) ? item.category : [],
    year: item.year ? String(item.year) : null,
    quality: item.quality || null,
    duration: item.time || item.duration || null,
    description: item.content || item.description || null,
    poster_url: item.poster_url || null,
    thumb_url: item.thumb_url || null,
    player_page_url: playerPageUrl,
    player_provider: playerPageUrl ? 'upload18' : 'unknown',
    player_origin: origin,
    player_referer: referer,
    player_status: playerPageUrl ? 'unverified' : 'missing',
    is_active: true,
    raw_data: item,
    updated_at: new Date().toISOString(),
  };
}

async function getOrCreateRun() {
  if (RUN_ID) {
    const { data, error } = await supabase.from('avdb_vip5_runs').select('*').eq('id', RUN_ID).single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from('avdb_vip5_runs').insert({
    start_page: DEFAULT_START,
    end_page: DEFAULT_END,
    current_page: DEFAULT_START,
    status: 'queued',
  }).select('*').single();
  if (error) throw error;
  return data;
}

async function updateRun(runId, patch) {
  const { error } = await supabase.from('avdb_vip5_runs').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', runId);
  if (error) throw error;
}

async function scanPage(page, pageNumber) {
  const sourcePageUrl = pageUrl(pageNumber);
  let lastError = null;

  for (let attempt = 1; attempt <= PAGE_RETRY_COUNT; attempt += 1) {
    try {
      const navigation = await page.goto(sourcePageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const status = navigation?.status() || 0;

      const challengePage = status === 403 || await isHumanVerificationPage(page);
      if (challengePage) {
        lastError = new Error(`AVDB page ${pageNumber} returned HTTP 403 / Cloudflare verification`);
        await waitForHumanVerification(page, pageNumber);
      }

      await sleep(PAGE_DELAY_MS);
      if (!challengePage && status >= 400) throw new Error(`AVDB page ${pageNumber} returned HTTP ${status}`);

      const htmlText = stripTags(await page.content()).toLowerCase();
      if (/site unavailable|unable to access this site|service unavailable/.test(htmlText)) {
        throw new Error(`AVDB page ${pageNumber} is unavailable`);
      }

      const links = await extractApiLinks(page, sourcePageUrl);
      if (!links.length) throw new Error(`No API buttons found on page ${pageNumber}`);
      const results = await fetchApiPayloads(page, links);
      const items = results.map((result) => normalizeResult(result, pageNumber, sourcePageUrl)).filter(Boolean);
      return { sourcePageUrl, apiLinks: links.length, items };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < PAGE_RETRY_COUNT) await sleep(PAGE_403_WAIT_MS * attempt);
    }
  }

  throw lastError || new Error(`AVDB page ${pageNumber} could not be scanned`);
}

async function main() {
  const run = await getOrCreateRun();
  if (['completed', 'cancelled'].includes(run.status)) throw new Error(`Run ${run.id} is already ${run.status}`);
  const browserOptions = {
    executablePath: findChrome(),
    headless: HEADLESS ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      ...(HEADLESS ? [] : ['--start-maximized']),
    ],
    defaultViewport: HEADLESS ? { width: 1440, height: 1000, deviceScaleFactor: 1 } : null,
  };
  if (CHROME_USER_DATA_DIR) browserOptions.userDataDir = CHROME_USER_DATA_DIR;
  const browser = await puppeteer.launch(browserOptions);
  const page = await browser.newPage();
  await page.setUserAgent(process.env.USER_AGENT || 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/149 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9,th;q=0.8' });
  page.setDefaultNavigationTimeout(30000);
  let pagesScanned = run.pages_scanned || 0;
  let itemsFound = run.items_found || 0;
  let itemsUpserted = run.items_upserted || 0;
  let failedPages = run.failed_pages || 0;
  let consecutive403 = 0;
  const start = Math.max(run.current_page || run.start_page, run.start_page);
  try {
    await updateRun(run.id, { status: 'running', started_at: run.started_at || new Date().toISOString(), last_error: null });
    for (let pageNumber = start; pageNumber <= run.end_page; pageNumber += 1) {
      try {
        const result = await scanPage(page, pageNumber);
        if (result.items.length) {
          const { error } = await supabase.from('avdb_vip5_items').upsert(result.items, { onConflict: 'vip_bucket,external_id', ignoreDuplicates: false });
          if (error) throw error;
          itemsFound += result.items.length;
          itemsUpserted += result.items.length;
        }
        pagesScanned += 1;
        await updateRun(run.id, {
          status: pageNumber >= run.end_page ? 'completed' : 'running',
          current_page: pageNumber + 1,
          pages_scanned: pagesScanned,
          items_found: itemsFound,
          items_upserted: itemsUpserted,
          failed_pages: failedPages,
          last_page_url: result.sourcePageUrl,
          last_error: null,
          ...(pageNumber >= run.end_page ? { finished_at: new Date().toISOString() } : {}),
        });
        console.log(JSON.stringify({ page: pageNumber, pagesScanned, items: result.items.length, totalItems: itemsFound }));
      } catch (error) {
        failedPages += 1;
        pagesScanned += 1;
        const message = error instanceof Error ? error.message : String(error);
        const is403 = /HTTP 403/.test(message);
        consecutive403 = is403 ? consecutive403 + 1 : 0;
        const shouldStop = is403 && consecutive403 >= MAX_CONSECUTIVE_403;
        const patch = {
          status: shouldStop ? 'failed' : 'running',
          current_page: pageNumber + 1,
          pages_scanned: pagesScanned,
          items_found: itemsFound,
          items_upserted: itemsUpserted,
          failed_pages: failedPages,
          last_page_url: pageUrl(pageNumber),
          last_error: shouldStop
            ? `Stopped after ${consecutive403} consecutive HTTP 403 responses`
            : message,
        };
        if (shouldStop) patch.finished_at = new Date().toISOString();
        await updateRun(run.id, patch);
        console.error(JSON.stringify({ page: pageNumber, error: message, consecutive403 }));
        if (shouldStop) throw new Error(patch.last_error);
      }
    }
  } catch (error) {
    await updateRun(run.id, { status: 'failed', last_error: error instanceof Error ? error.message : String(error), finished_at: new Date().toISOString() });
    throw error;
  } finally {
    await browser.close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
