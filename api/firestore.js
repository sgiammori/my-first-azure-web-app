// Shared Firestore (Firebase Admin SDK) initialization for Azure Functions.
// Credentials come from env vars (api/local.settings.json locally, Azure App Settings in prod) —
// never from a committed key file. See FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY.
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

function getFirestoreDb() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    // Azure App Settings / local.settings.json store the key as a single-line string
    // with literal "\n" sequences; restore real newlines before handing it to the SDK.
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Firebase credentials are not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and ' +
        'FIREBASE_PRIVATE_KEY (api/local.settings.json locally, Application Settings in Azure).'
      );
    }

    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }

  return getFirestore();
}

module.exports = { getFirestoreDb };
