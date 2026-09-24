/*// Call an Azure Logic App (workflow) from JavaScript
// Replace with your actual Logic App HTTP endpoint URL
const logicAppUrl = 'https://<your-logic-app-region>.logic.azure.com:443/workflows/<workflow-id>/triggers/manual/paths/invoke?api-version=2016-10-01&sp=<sp>&sv=<sv>&sig=<sig>';

async function callAzureWorkflow(payload) {
  try {
    const response = await fetch(logicAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Workflow response:', data);
    return data;
  } catch (error) {
    console.error('Error calling Azure workflow:', error);
    throw error;
  }
}

// Example usage:
// callAzureWorkflow({ key: 'value' });
*/

/*
// Example: Call a MongoDB database from Node.js using the official MongoDB driver
// Make sure to install the package: npm install mongodb

const { MongoClient } = require('mongodb');

// Replace with your MongoDB connection string
const uri = 'mongodb+srv://<username>:<password>@<cluster-url>/test?retryWrites=true&w=majority';

async function callMongoDB() {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    const database = client.db('your-database');
    const collection = database.collection('your-collection');
    // Example: Find all documents
    const results = await collection.find({}).toArray();
    console.log('MongoDB results:', results);
    return results;
  } catch (error) {
    console.error('MongoDB error:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Example usage:
// callMongoDB();
*/
