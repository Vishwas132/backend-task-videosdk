# Distributed Notification System

A scalable notification system built with Node.js, MongoDB, Kafka, and Elasticsearch. The system provides a robust platform for handling notifications across multiple delivery channels with features like priority processing, user preferences, and comprehensive delivery tracking.

## Implementation Details

### Architecture Overview

The system follows a microservices-inspired architecture with clear separation of concerns:

1. **API Layer**

   - RESTful endpoints for notification submission and preference management
   - Input validation and request sanitization
   - Swagger documentation for API discoverability

2. **Message Queue Architecture**

   - Kafka-based message broker for reliable message delivery
   - Producer-consumer pattern for asynchronous processing
   - Topics segregation for different notification priorities

3. **Processing Pipeline**

   - Priority queue implementation for message ordering
   - Batch processing capabilities for improved throughput
   - Elasticsearch integration for notification search and analytics

4. **Delivery System**
   - Modular delivery channels (Email, SMS, Push)
   - Retry mechanism with exponential backoff
   - Delivery status tracking and reporting

### Design Choices

1. **Technology Stack**

   - Node.js/Express for its non-blocking I/O and rich ecosystem
   - MongoDB for flexible document storage and scalability
   - Kafka for reliable message queuing and high throughput
   - Elasticsearch for efficient notification search

2. **Code Organization**

   - Service-based architecture for better modularity
   - Controller-Service pattern for business logic separation
   - Repository pattern for data access abstraction

3. **Scalability Considerations**

   - Horizontally scalable components
   - Stateless API design
   - Message queue for handling traffic spikes
   - Caching layer for frequently accessed data

4. **Reliability Features**
   - Dead letter queues for failed messages
   - Comprehensive error handling
   - Retry mechanisms with backoff
   - Transaction support for critical operations

### Known Issues

1. **Performance**

   - Large batch processing can cause memory spikes
   - Elasticsearch query optimization needed for complex searches
   - Potential bottlenecks in priority queue implementation

2. **Limitations**

   - No real-time delivery status updates
   - Limited support for custom delivery channels
   - Basic rate limiting implementation
   - Missing message templating system

3. **Technical Debt**
   - Need for improved error handling in some edge cases
   - Better logging and monitoring implementation required
   - Missing comprehensive integration tests
   - Configuration management needs refinement

## Features

- Multi-channel notification delivery (Email, SMS, Push)
- Priority-based notification processing
- Scheduled notifications
- User preferences and quiet hours
- Rate limiting and throttling
- Retry mechanism with exponential backoff
- Delivery status tracking
- API documentation with Swagger

## Prerequisites

- Node.js >= 18.0.0
- Docker and Docker Compose
- MongoDB
- Apache Kafka
- Elasticsearch

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd backend-task-videosdk
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```
   Update the environment variables as needed.

## Running the Application

### Local Development

```bash
# Run without Docker
npm run dev  # Development mode with nodemon
npm start    # Production mode
```

### Docker Environments

The application includes separate configurations for development and production environments.

#### Development Environment

Development setup includes:

- Hot reloading with nodemon
- Source code mounting
- Exposed ports for all services
- Development-friendly settings
- Default development passwords

```bash
# Build development containers
npm run docker:build

# Start development environment
npm run docker:up

# Stop development environment
npm run docker:down
```

Exposed ports in development:

- Application: 3000
- MongoDB: 27017
- Kafka: 9092
- Elasticsearch: 9200

#### Production Environment

Production setup includes:

- Multi-stage builds for optimization
- Resource limits and monitoring
- Security-focused configuration
- Production-grade logging
- No exposed internal services

```bash
# Build production containers
npm run docker:build:prod

# Start production environment
npm run docker:up:prod

# Stop production environment
npm run docker:down:prod
```

### Environment Files

1. Development:

   - Uses default docker-compose.yml
   - Dockerfile configured for development
   - Mounts source code for hot reloading

2. Production:
   - Uses docker-compose.prod.yml
   - Dockerfile.prod with multi-stage builds
   - Optimized for deployment

## Testing

Run tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

Watch mode:

```bash
npm run test:watch
```

## API Documentation

Once the application is running, access the API documentation at:

```
http://localhost:3000/api-docs
```

## Architecture

### Components

1. **Ingestion Service**

   - Handles notification requests
   - Validates input using notification validator service
   - Publishes to Kafka using producer service

2. **Processing Service**

   - Consumes from Kafka
   - Implements priority queue
   - Processes notifications
   - Integrates with Elasticsearch for search capabilities

3. **Delivery Service**

   - Supports multiple delivery channels (Email, SMS, Push)
   - Implements retry mechanism
   - Tracks delivery status

4. **User Preferences**
   - Manages notification preferences
   - Implements quiet hours
   - Handles throttling

### Technologies

- **Node.js & Express**: Backend framework
- **MongoDB**: Primary database for storing notifications, preferences, and delivery status
- **Kafka**: Message queue for asynchronous processing
- **Elasticsearch**: Search and analytics engine
- **Docker**: Containerization and service orchestration
- **Vitest**: Testing framework with coverage support
- **Swagger**: API documentation

## Project Structure

```
/src
  app.js            # Express application setup
  server.js         # Server initialization
  swagger.js        # Swagger configuration
  /config           # Configuration settings
    - index.js
  /controllers      # Request handlers
    - notification.controller.js
    - preference.controller.js
  /models          # MongoDB schemas
    - notification.js
    - userPreference.js
    - deliveryStatus.js
  /routes          # API routes
    - notification.routes.js
    - preference.routes.js
  /services
    /delivery      # Delivery channel implementations
      - delivery.service.js
      - email.service.js
      - sms.service.js
      - push.service.js
    /ingestion     # Notification ingestion
      - kafka.producer.service.js
      - notification.validator.service.js
    /processing    # Message processing
      - kafka.consumer.service.js
      - notification.processor.service.js
      - notification.search.service.js
      - processing.service.js
    /preferences   # User preference management
      - user.preference.service.js
  /utils           # Utility functions
    - database.js
    - priorityQueue.js
/tests            # Test files
  - delivery.test.js
  - elasticsearch.test.js
  - notification.test.js
  - preferences.test.js
  - processing.test.js
  - setup.js
```

## Error Handling

- Input validation using notification validator service
- Retry mechanism for failed deliveries
- Dead letter queues for undeliverable messages
- Comprehensive error logging

## Monitoring

- Health check endpoint
- Delivery status tracking
- Performance metrics
- Error logging

## Dependencies

### Main Dependencies

- Express.js: Web framework
- Mongoose: MongoDB ODM
- KafkaJS: Kafka client
- Elasticsearch: Search engine client
- Swagger: API documentation
- dotenv: Environment configuration

### Dev Dependencies

- Vitest: Testing framework
- MongoDB Memory Server: In-memory MongoDB for testing
- Nodemon: Development server
- Supertest: HTTP testing
