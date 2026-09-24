// Backs /api/news for the blog module (src/app/modules/blog + core/services/persistance.ts).
// Storage: Firestore, collection "news", one document per news item, keyed by INews.id.
//
// Contract (must match src/app/core/services/persistance.ts, do not change without updating it):
//   GET  /api/news  -> INews[]              (the whole list)
//   POST /api/news  <- INews[]              (the whole list; replaces the collection to match
//                                             Homeblogtunnel/blog.ts, which always save the full array)
const { app } = require('@azure/functions');
const { getFirestoreDb } = require('./firestore');

const COLLECTION = 'news';

app.http('news', {
  route: 'news',
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    let db;
    try {
      db = getFirestoreDb();
    } catch (e) {
      context.error('Firestore not configured', e);
      return { status: 500, jsonBody: { error: e.message } };
    }

    const collectionRef = db.collection(COLLECTION);

    if (request.method === 'GET') {
      try {
        const snapshot = await collectionRef.get();
        const newsList = snapshot.docs.map(docToNews);
        return { status: 200, jsonBody: newsList };
      } catch (e) {
        context.error('Failed to read news from Firestore', e);
        return { status: 500, jsonBody: { error: 'Failed to read news' } };
      }
    }

    // POST: replace the collection with the incoming list (matches saveNewsList's
    // "send the whole array every time" behavior).
    let newsList;
    try {
      newsList = await request.json();
    } catch (e) {
      return { status: 400, jsonBody: { error: 'Invalid JSON body' } };
    }
    if (!Array.isArray(newsList)) {
      return { status: 400, jsonBody: { error: 'Body must be an array of news items' } };
    }

    try {
      const existing = await collectionRef.get();
      const incomingIds = new Set(newsList.map(n => String(n.id)));

      const batch = db.batch();
      existing.docs.forEach(doc => {
        if (!incomingIds.has(doc.id)) batch.delete(doc.ref);
      });
      newsList.forEach(newsItem => {
        batch.set(collectionRef.doc(String(newsItem.id)), newsToDoc(newsItem));
      });
      await batch.commit();

      return { status: 200, jsonBody: { success: true } };
    } catch (e) {
      context.error('Failed to save news to Firestore', e);
      return { status: 500, jsonBody: { error: 'Failed to save news' } };
    }
  }
});

// Firestore document -> INews (src/app/shared/models/INews.ts)
function docToNews(doc) {
  const data = doc.data();
  return {
    id: Number(doc.id),
    title: data.title ?? '',
    subtitle: data.subtitle ?? '',
    content: data.content ?? '',
    date: data.date ?? '',
    authors: Array.isArray(data.authors) ? data.authors : [],
    htmlContent: data.htmlContent ?? '',
    uploadedOnFacebook: !!data.uploadedOnFacebook
  };
}

// INews -> Firestore document fields (id is used as the doc ID, not stored as a field)
function newsToDoc(newsItem) {
  return {
    title: newsItem.title ?? '',
    subtitle: newsItem.subtitle ?? '',
    content: newsItem.content ?? '',
    date: normalizeDateForStorage(newsItem.date),
    authors: Array.isArray(newsItem.authors)
      ? newsItem.authors.map(a => ({ id: a.id, author: a.author }))
      : [],
    htmlContent: newsItem.htmlContent ?? '',
    uploadedOnFacebook: !!newsItem.uploadedOnFacebook
  };
}

// blog.ts stores dates as locale strings (e.g. Italian "21/8/2026", D/M/YYYY) via
// toLocaleDateString(), which JS's Date constructor cannot reliably parse. Normalize to
// ISO when the value parses cleanly (covers ISO strings and real Date objects); otherwise
// pass the original string through unchanged rather than letting toISOString() throw on an
// Invalid Date. Homeblogtunnel.init() already knows how to parse both ISO and DD/MM/YYYY
// strings back into a Date on load, so round-tripping the raw string is safe.
function normalizeDateForStorage(date) {
  if (!date) return '';
  const parsed = date instanceof Date ? date : new Date(date);
  if (isNaN(parsed.getTime())) {
    return typeof date === 'string' ? date : '';
  }
  return parsed.toISOString();
}
