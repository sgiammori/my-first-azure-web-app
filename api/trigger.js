// GET /api/trigger: returns the list of my Google Play apps for the "Servizi" page,
// as [{ ogTitle, ogImage, ogUrl }].
//
// Source of the data, in order:
// 1. Scraped from my public Google Play developer page (GOOGLE_PLAY_DEVELOPER_URL),
//    cached in memory for CACHE_TTL_MS so Google Play is not fetched on every visit.
// 2. If scraping fails or finds no apps: the last successful scrape (even if expired),
//    otherwise the hardcoded backup list in STATIC_APPS_JSON.
//
// Scraping depends on Google Play's HTML: if Google changes the page, the scrape returns
// nothing and the backup kicks in. Check the function logs for "scrape" warnings.

const { app } = require('@azure/functions');
const cheerio = require('cheerio');

const DEFAULT_DEVELOPER_URL = 'https://play.google.com/store/apps/developer?id=Stefano+Giammori&hl=en_US';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// In-memory cache: lives as long as the Function App instance (reset on restart/cold start).
let cache = { apps: null, expires: 0 };

async function scrapeDeveloperPage(url) {
    const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));
    const response = await fetch(url, {
        headers: {
            // Browser-like headers: Google Play serves a reduced page to unknown clients
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
        },
        redirect: 'follow'
    });
    if (!response.ok) throw new Error(`Google Play returned HTTP ${response.status}`);

    const $ = cheerio.load(await response.text());
    const apps = [];

    // Each app on the developer page is a link to /store/apps/details?id=<package>
    $('a[href*="/store/apps/details?id="]').each((i, el) => {
        const href = $(el).attr('href');
        const packageName = new URL(href, 'https://play.google.com').searchParams.get('id');
        if (!packageName || apps.some(a => a.packageName === packageName)) return;

        // Each card has a screenshot (alt "Screenshot image") and the app icon (alt
        // "Thumbnail image"): take the icon, i.e. the last non-screenshot image.
        const img = $(el).find('img')
            .filter((j, im) => !/screenshot/i.test($(im).attr('alt') || ''))
            .last();
        // Icon URLs end with a size suffix like "=s64-rw": request a sharper 256px version
        const ogImage = (img.attr('src') || img.attr('data-src') || '').replace(/=s\d+(-rw)?$/, '=s256$1');

        // Title: prefer an element with a title attribute, then the first text element,
        // then the link's aria-label/text. The card text ends with the developer name.
        let ogTitle = $(el).parent().find('div[title], span[title]').first().attr('title')
            || $(el).find('div,span').first().text().trim()
            || $(el).attr('aria-label')
            || $(el).text().trim();
        ogTitle = ogTitle.split('\n')[0].replace(/Stefano Giammori$/i, '').trim();

        if (ogTitle) {
            apps.push({
                packageName,
                ogTitle,
                ogImage,
                ogUrl: `https://play.google.com/store/apps/details?id=${packageName}`
            });
        }
    });

    return apps.map(({ packageName, ...rest }) => rest);
}

function getStaticApps(context) {
    if (!process.env.STATIC_APPS_JSON) return null;
    try {
        return JSON.parse(process.env.STATIC_APPS_JSON);
    } catch {
        context.warn('Invalid STATIC_APPS_JSON environment variable.');
        return null;
    }
}

app.http('trigger', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const ok = apps => ({
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apps)
        });

        // 1. Fresh cache
        if (cache.apps && Date.now() < cache.expires) return ok(cache.apps);

        // 2. Scrape the developer page
        const url = process.env.GOOGLE_PLAY_DEVELOPER_URL || DEFAULT_DEVELOPER_URL;
        try {
            const apps = await scrapeDeveloperPage(url);
            if (apps.length > 0) {
                cache = { apps, expires: Date.now() + CACHE_TTL_MS };
                return ok(apps);
            }
            context.warn(`Google Play scrape found no apps at ${url}`);
        } catch (err) {
            context.warn(`Google Play scrape failed: ${err.message}`);
        }

        // 3. Backup: last good scrape, then the static list
        if (cache.apps) return ok(cache.apps);
        const staticApps = getStaticApps(context);
        if (staticApps) return ok(staticApps);

        return ok([]);
    }
});
