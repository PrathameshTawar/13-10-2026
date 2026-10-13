const mongoose = require('mongoose');

let mongodInstance = null;

async function connectDB() {
  const customUri = process.env.MONGODB_URI;

  if (customUri) {
    try {
      console.log(`[DB] Attempting connection to specified MONGODB_URI...`);
      await mongoose.connect(customUri, {
        serverSelectionTimeoutMS: 5000
      });
      console.log(`[DB] Successfully connected to MongoDB: ${customUri.replace(/\/\/[^@]+@/, '//***@')}`);
      return;
    } catch (err) {
      console.warn(`[DB] Failed to connect to MONGODB_URI: ${err.message}`);
      console.log(`[DB] Falling back to automated in-memory MongoDB instance...`);
    }
  }

  // Fallback to local MongoDB or MongoMemoryServer
  try {
    const localUri = 'mongodb://127.0.0.1:27017/causalfunnel_analytics';
    await mongoose.connect(localUri, { serverSelectionTimeoutMS: 2000 });
    console.log(`[DB] Successfully connected to local MongoDB: ${localUri}`);
    return;
  } catch (localErr) {
    console.log(`[DB] Local mongod daemon not detected. Starting in-memory MongoDB Server...`);
  }

  // Use mongodb-memory-server for zero-setup execution
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongodInstance = await MongoMemoryServer.create();
    const uri = mongodInstance.getUri();
    await mongoose.connect(uri);
    console.log(`[DB] In-Memory MongoDB Server running at: ${uri}`);
    console.log(`[DB] Fully functional MongoDB instance ready without requiring local mongod service.`);
  } catch (memErr) {
    console.error(`[DB] Error starting MongoDB Memory Server:`, memErr);
    throw memErr;
  }
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (mongodInstance) {
    await mongodInstance.stop();
  }
}

module.exports = { connectDB, disconnectDB };
