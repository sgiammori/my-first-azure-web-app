const { app } = require('@azure/functions');
const cheerio = require('cheerio');
const xml2js = require('xml2js');

app.http('ansanews', {
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
          const rssUrl = request.query.url || 'https://www.ansa.it/sito/ansait_rss.xml';
          try {
              const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));
              let response;
              try {
                  response = await fetch(rssUrl);
              } catch (fetchErr) {
                  console.error('Fetch failed:', fetchErr);
                  return { status: 502, body: 'Failed to fetch URL: ' + fetchErr.message };
              }
              if (!response.ok) {
                  return { status: response.status, body: 'Failed to fetch URL: ' + response.statusText };
              }
              const xml = await response.text();
              const parser = new xml2js.Parser();
              const result = await parser.parseStringPromise(xml);
              // Extract news items
              const items = result.rss.channel[0].item.map(item => ({
                  title: item.title[0],
                  link: item.link[0],
                  pubDate: item.pubDate[0],
                  description: item.description[0]
              }));
              return {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(items)
              };
          } catch (err) {
              return {
                  status: 500,
                  body: JSON.stringify({ error: err.message })
              };
          }
      }
    }
});
