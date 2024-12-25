import { Client } from "@elastic/elasticsearch";
import config from "../config/index.js";

class ElasticsearchClient {
  constructor() {
    this.client = null;
  }

  async connect() {
    try {
      this.client = new Client({
        node: config.elasticsearch.node,
        auth: {
          username: process.env.ELASTIC_USERNAME || "elastic",
          password: process.env.ELASTIC_PASSWORD || "dev_password",
        },
      });

      // Test connection
      await this.client.ping();
      console.log("Connected to Elasticsearch");

      // Ensure index exists
      await this.createIndexIfNotExists();

      return this.client;
    } catch (error) {
      console.error("Elasticsearch connection error:", error);
      throw error;
    }
  }

  async createIndexIfNotExists() {
    try {
      const indexExists = await this.client.indices.exists({
        index: config.elasticsearch.index,
      });

      if (!indexExists) {
        await this.client.indices.create({
          index: config.elasticsearch.index,
          body: {
            mappings: {
              properties: {
                userId: { type: "keyword" },
                title: { type: "text" },
                content: { type: "text" },
                type: { type: "keyword" },
                priority: { type: "keyword" },
                createdAt: { type: "date" },
                scheduledFor: { type: "date" },
              },
            },
          },
        });
        console.log(`Created index: ${config.elasticsearch.index}`);
      }
    } catch (error) {
      console.error("Error creating Elasticsearch index:", error);
      throw error;
    }
  }

  getClient() {
    if (!this.client) {
      throw new Error("Elasticsearch client not initialized");
    }
    return this.client;
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      console.log("Disconnected from Elasticsearch");
    }
  }
}

// Create singleton instance
const elasticsearchClient = new ElasticsearchClient();

export default elasticsearchClient;
