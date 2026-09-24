const { app } = require('@azure/functions');
const cheerio = require('cheerio');
const xml2js = require('xml2js');

app.http('itechnews', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
      if (request.method === 'POST') {
        // Save news: just echo back for now
        const newsList = request.body;
        return {
            status: 200,
            body: { success: true, received: newsList }
        };
      } else if (request.method === 'GET') {
          // Optionally allow a ?url= param for custom RSS, but default to ANSA
          const rssUrl = request.query.url || 'https://www.tomshw.it/feed/';
          try {
              const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));
              let response;
              try {
                response = await fetch(rssUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
                    }
                });
              } catch (fetchErr) {
                  console.error('Fetch failed:', fetchErr);
                  return { status: 502, body: 'Failed to fetch URL: ' + fetchErr.message };
              }
              if (!response.ok) {
                  return { status: response.status, body: 'Failed to fetch URL: ' + response.statusText };
              }
              const xml = await response.text();
              const parser = new xml2js.Parser();
              let items = [];
              try {
                  const result = await parser.parseStringPromise(xml);
                  if (result && result.rss && result.rss.channel && result.rss.channel[0].item) {
                      // RSS 2.0
                      items = result.rss.channel[0].item.map(item => ({
                          title: item.title[0],
                          link: item.link[0],
                          pubDate: item.pubDate ? item.pubDate[0] : null,
                          description: item.description ? item.description[0] : null
                      }));
                  } else if (result && result.feed && result.feed.entry) {
                      // Atom (es. Tom's Hardware)
                      items = result.feed.entry.map(entry => ({
                          title: entry.title && entry.title[0] ? (typeof entry.title[0] === 'string' ? entry.title[0] : entry.title[0]._) : '',
                          link: entry.link && entry.link[0] && entry.link[0].$.href ? entry.link[0].$.href : '',
                          pubDate: entry.updated ? entry.updated[0] : null,
                          description: entry.summary && entry.summary[0] ? (typeof entry.summary[0] === 'string' ? entry.summary[0] : entry.summary[0]._) : ''
                      }));
                  }
              } catch (parseErr) {
                  // Parsing fallito: restituisci array vuoto
                  items = [];
              }
              return {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(items)
              };
          } catch (err) {
              // Errore generico: restituisci array vuoto
              return {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([])
              };
          }
      }
    }
});
