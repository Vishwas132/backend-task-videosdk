import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import database from "../src/utils/database.js";
import { beforeAll, afterAll, beforeEach } from "vitest";

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  try {
    // Create an in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Set the MongoDB URI to the in-memory instance
    process.env.MONGODB_URI = mongoUri;

    // Connect to the in-memory database
    await database.connect();

    console.log("Test database connected successfully");
  } catch (error) {
    console.error("Error setting up test database:", error);
    throw error;
  }
});

// Clear database before each test
beforeEach(async () => {
  try {
    const collections = mongoose.connection.collections;
    const clearPromises = [];

    for (const key in collections) {
      clearPromises.push(collections[key].deleteMany({}));
    }

    await Promise.all(clearPromises);
  } catch (error) {
    console.error("Error clearing test database:", error);
    throw error;
  }
});

// Cleanup after all tests
afterAll(async () => {
  try {
    await mongoose.disconnect();
    await mongoServer.stop();
    console.log("Test database cleanup completed");
  } catch (error) {
    console.error("Error cleaning up test database:", error);
    throw error;
  }
});
