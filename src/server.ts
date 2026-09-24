import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import cors from 'cors';

console.log('>>> server.ts entry: process.argv =', process.argv);
console.log('>>> processx.env.API_BASE_URL =', process.env['API_BASE_URL']);
console.log('>>> processx.env.PORT =', process.env['PORT']);
console.log('>>> environment.baseUrl =', environment.baseUrl);

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(cors({
  origin: [
    'https://myexpresswebapp.azurewebsites.net', // (optional, if needed)
    'https://my-first-azure-funcapp.azurewebsites.net'
    //'https://localhost:4200' // for local development
  ],
  credentials: true // if you use cookies/auth
}));

// Middleware to parse JSON bodies
app.use(express.json());

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { environment } from './app/shared/environments';
// Always resolve to the project source assets folder
const newsFilePath = join(process.cwd(), 'src', 'app', 'assets', 'data.txt');

/*
// GET /api/news - return news list
app.get('/api/news', (req, res) => {
  try {
    if (!existsSync(newsFilePath)) {
      return res.json([]);
    }
    const text = readFileSync(newsFilePath, 'utf-8');
    if (!text.trim()) return res.json([]);
    const news = JSON.parse(text);
    if (Array.isArray(news)) return res.json(news);
    return res.status(500).json({ error: 'Invalid news data format' });
  } catch (e) {
    let message = 'Unknown error';
    if (e instanceof Error) message = e.message;
    return res.status(500).json({ error: 'Failed to read news', details: message });
  }
});

// POST /api/news - save news list
app.post('/api/news', (req, res) => {
  try {
    const news = req.body;
    if (!Array.isArray(news)) {
      return res.status(400).json({ error: 'News data must be an array' });
    }
    writeFileSync(newsFilePath, JSON.stringify(news, null, 2), 'utf-8');
    return res.json({ success: true });
  } catch (e) {
    let message = 'Unknown error';
    if (e instanceof Error) message = e.message;
    return res.status(500).json({ error: 'Failed to save news', details: message });
  }
});*/

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);


/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = Number(process.env['PORT']) || 80;
  // Bind to 0.0.0.0 for Azure compatibility
  app.listen(port, '0.0.0.0', (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://0.0.0.0:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

// -----------------------------------------------------------------------
// SECTION: Angular SSR catch-all
// -----------------------------------------------------------------------

/**
 * For every non-API request, hand off to the Angular SSR engine which
 * renders the matching route on the server and streams the result.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});
