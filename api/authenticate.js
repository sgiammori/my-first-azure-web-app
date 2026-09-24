const { app } = require('@azure/functions');
const adminAuth = require('./adminauth');

app.http('authenticates', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
      if (request.method === 'POST') {
        // Call the new adminAuth signature and return its result
        return await adminAuth(request, context);
      } else {
        return { status: 405, body: { error: 'Method not allowed' } };
      }
    }
});
