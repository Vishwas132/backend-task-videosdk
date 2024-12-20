import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import database from "../src/utils/database.js";
import { beforeAll, afterAll, afterEach } from "vitest";

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Create an in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Set the MongoDB URI to the in-memory instance
  process.env.MONGODB_URI = mongoUri;

  // Connect to the in-memory database
  await database.connect();
});

// Cleanup after all tests
afterAll(async () => {
  await database.disconnect();
  await mongoServer.stop();
});

// Clear database between tests
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
});
