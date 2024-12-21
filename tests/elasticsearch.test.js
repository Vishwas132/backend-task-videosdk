import { describe, it, expect, vi, beforeEach } from "vitest";
import { Client } from "@elastic/elasticsearch";
import { NotificationSearchService } from "../src/services/processing/notification.search.service.js";
import Notification from "../src/models/notification.js";

// Mock Elasticsearch client
vi.mock("@elastic/elasticsearch");

describe("Elasticsearch Integration", () => {
  let searchService;
  let mockElasticClient;

  beforeEach(() => {
    mockElasticClient = new Client();
    searchService = new NotificationSearchService(mockElasticClient);
  });

  describe("Content Indexing", () => {
    it("should index notification content in Elasticsearch", async () => {
      const notification = await Notification.create({
        userId: "test-user",
        title: "Test Notification",
        content: "Test content for search",
        type: "alert",
        priority: "high",
        channel: "email",
      });

      mockElasticClient.index.mockResolvedValueOnce({ result: "created" });

      await searchService.indexNotification(notification);

      expect(mockElasticClient.index).toHaveBeenCalledWith({
        index: "notifications",
        document: expect.objectContaining({
          userId: notification.userId,
          title: notification.title,
          content: notification.content,
          type: notification.type,
          priority: notification.priority,
          createdAt: expect.any(Date),
        }),
      });
    });

    it("should handle indexing errors", async () => {
      const notification = await Notification.create({
        userId: "test-user",
        title: "Test Notification",
        content: "Test content",
        channel: "email",
      });

      mockElasticClient.index.mockRejectedValueOnce(
        new Error("Indexing failed")
      );

      await expect(
        searchService.indexNotification(notification)
      ).rejects.toThrow("Indexing failed");
    });
  });

  describe("Search Functionality", () => {
    it("should search notifications by content", async () => {
      const searchQuery = "system error";
      const mockSearchResult = {
        hits: {
          hits: [
            {
              _source: {
                userId: "test-user",
                title: "System Alert",
                content: "Critical system error detected",
                priority: "high",
              },
            },
          ],
        },
      };

      mockElasticClient.search.mockResolvedValueOnce(mockSearchResult);

      const results = await searchService.searchNotifications(searchQuery);

      expect(mockElasticClient.search).toHaveBeenCalledWith({
        index: "notifications",
        query: {
          multi_match: {
            query: searchQuery,
            fields: ["title", "content"],
          },
        },
      });
      expect(results).toHaveLength(1);
      expect(results[0].content).toContain("system error");
    });

    it("should filter notifications by type and priority", async () => {
      const filters = {
        type: "alert",
        priority: "high",
      };

      mockElasticClient.search.mockResolvedValueOnce({
        hits: { hits: [] },
      });

      await searchService.searchNotifications("", filters);

      expect(mockElasticClient.search).toHaveBeenCalledWith({
        index: "notifications",
        query: {
          bool: {
            must: [{ term: { type: "alert" } }, { term: { priority: "high" } }],
          },
        },
      });
    });
  });

  describe("Similar Notification Detection", () => {
    it("should find similar notifications within time window", async () => {
      const notification = {
        userId: "test-user",
        content: "Service XYZ is down",
        type: "alert",
        channel: "email",
      };

      const mockSimilarNotifications = {
        hits: {
          hits: [
            {
              _source: {
                userId: "test-user",
                content: "Service XYZ is down",
                createdAt: new Date(Date.now() - 1800000), // 30 minutes ago
              },
            },
          ],
        },
      };

      mockElasticClient.search.mockResolvedValueOnce(mockSimilarNotifications);

      const similarNotifications = await searchService.findSimilarNotifications(
        notification,
        3600000 // 1 hour window
      );

      expect(similarNotifications).toHaveLength(1);
      expect(mockElasticClient.search).toHaveBeenCalledWith({
        index: "notifications",
        query: {
          bool: {
            must: [
              { match: { content: notification.content } },
              { term: { userId: notification.userId } },
              {
                range: {
                  createdAt: {
                    gte: expect.any(String),
                    lte: expect.any(String),
                  },
                },
              },
            ],
          },
        },
      });
    });

    it("should not find similar notifications outside time window", async () => {
      const notification = {
        userId: "test-user",
        content: "Service XYZ is down",
        type: "alert",
        channel: "email",
      };

      mockElasticClient.search.mockResolvedValueOnce({
        hits: { hits: [] },
      });

      const similarNotifications = await searchService.findSimilarNotifications(
        notification,
        3600000 // 1 hour window
      );

      expect(similarNotifications).toHaveLength(0);
    });
  });

  describe("Notification Aggregation", () => {
    it("should aggregate similar low-priority notifications", async () => {
      const timeWindow = 3600000; // 1 hour
      const mockAggregations = {
        hits: {
          hits: [
            {
              _source: {
                userId: "test-user",
                type: "update",
                priority: "low",
                content: "System update 1",
              },
            },
            {
              _source: {
                userId: "test-user",
                type: "update",
                priority: "low",
                content: "System update 2",
              },
            },
          ],
        },
      };

      mockElasticClient.search.mockResolvedValueOnce(mockAggregations);

      const aggregatedNotifications =
        await searchService.aggregateSimilarNotifications(
          "test-user",
          timeWindow
        );

      expect(mockElasticClient.search).toHaveBeenCalledWith({
        index: "notifications",
        query: {
          bool: {
            must: [
              { term: { userId: "test-user" } },
              { term: { priority: "low" } },
              {
                range: {
                  scheduledFor: {
                    gte: expect.any(String),
                    lte: expect.any(String),
                  },
                },
              },
            ],
          },
        },
        sort: [{ scheduledFor: "asc" }],
      });

      expect(aggregatedNotifications).toHaveLength(1);
      expect(aggregatedNotifications[0].content).toContain("System update 1");
      expect(aggregatedNotifications[0].content).toContain("System update 2");
    });
  });
});
