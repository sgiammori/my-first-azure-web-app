// Azure Functions v4+ compatible admin password check
module.exports = async function adminAuth(request, context) {
    let password;
    try {
        // For JSON body (Content-Type: application/json)
        const body = await request.json();
        password = body.password;
    } catch (e) {
        // Fallback for text/plain or missing/invalid JSON
        try {
            password = await request.text();
        } catch (err) {
            password = undefined;
        }
    }
    // Read from local.settings.json locally, from the Function App's App settings in Azure
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    // Refuse login if the password is not configured: otherwise a request without a
    // password (undefined) would match an unset ADMIN_PASSWORD (undefined) and succeed.
    if (!ADMIN_PASSWORD || typeof password !== 'string') {
        return {
            status: 401,
            body: { success: false, message: 'Unauthorized' }
        };
    }

    if (password === ADMIN_PASSWORD) {
        return {
            status: 200,
            body: { success: true }
        };
    } else {
        return {
            status: 401,
            body: { success: false, message: 'Unauthorized' }
        };
    }
};
