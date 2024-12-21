export class NotificationSearchService {
  constructor(client) {
    this.client = client;
  }

  /**
   * Index a notification in Elasticsearch
   */
  async indexNotification(notification) {
    try {
      const result = await this.client.index({
        index: "notifications",
        document: {
          userId: notification.userId,
          title: notification.title,
          content: notification.content,
          type: notification.type,
          priority: notification.priority,
          createdAt: notification.createdAt || new Date(),
        },
      });
      return result;
    } catch (error) {
      console.error("Error indexing notification:", error);
      throw error;
    }
  }

  /**
   * Search notifications with optional filters
   */
  async searchNotifications(query, filters = {}) {
    const searchQuery = {
      index: "notifications",
      query: {},
    };

    if (query) {
      searchQuery.query.multi_match = {
        query,
        fields: ["title", "content"],
      };
    }

    if (Object.keys(filters).length > 0) {
      searchQuery.query.bool = {
        must: Object.entries(filters).map(([key, value]) => ({
          term: { [key]: value },
        })),
      };
    }

    const result = await this.client.search(searchQuery);
    return result.hits.hits.map((hit) => hit._source);
  }

  /**
   * Find similar notifications within a time window
   */
  async findSimilarNotifications(notification, timeWindow) {
    const now = new Date();
    const windowStart = new Date(now.getTime() - timeWindow);

    const result = await this.client.search({
      index: "notifications",
      query: {
        bool: {
          must: [
            { match: { content: notification.content } },
            { term: { userId: notification.userId } },
            {
              range: {
                createdAt: {
                  gte: windowStart.toISOString(),
                  lte: now.toISOString(),
                },
              },
            },
          ],
        },
      },
    });

    return result.hits.hits.map((hit) => hit._source);
  }

  /**
   * Aggregate similar notifications for a user
   */
  async aggregateSimilarNotifications(userId, timeWindow) {
    const now = new Date();
    const windowStart = new Date(now.getTime() - timeWindow);

    const result = await this.client.search({
      index: "notifications",
      query: {
        bool: {
          must: [
            { term: { userId } },
            { term: { priority: "low" } },
            {
              range: {
                scheduledFor: {
                  gte: windowStart.toISOString(),
                  lte: now.toISOString(),
                },
              },
            },
          ],
        },
      },
      sort: [{ scheduledFor: "asc" }],
    });

    const notifications = result.hits.hits.map((hit) => hit._source);

    // If there are no notifications or just one, return as is
    if (notifications.length <= 1) {
      return notifications;
    }

    // Combine similar notifications into one
    const aggregated = {
      userId: notifications[0].userId,
      type: notifications[0].type,
      priority: notifications[0].priority,
      content: notifications.map((n) => n.content).join("\n"),
      createdAt: notifications[0].createdAt,
      scheduledFor: notifications[0].scheduledFor,
    };

    return [aggregated];
  }
}
