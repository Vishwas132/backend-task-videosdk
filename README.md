# Distributed Notification System

A scalable notification system built with Node.js, MongoDB, Kafka, and Elasticsearch.

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

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

### Using Docker

Build and start all services:

```bash
npm run docker:build
npm run docker:up
```

Stop all services:

```bash
npm run docker:down
```

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
   - Validates input
   - Publishes to Kafka

2. **Processing Service**

   - Consumes from Kafka
   - Implements priority queue
   - Handles scheduling

3. **Delivery Service**

   - Manages delivery attempts
   - Implements retry mechanism
   - Tracks delivery status

4. **User Preferences**
   - Manages notification preferences
   - Implements quiet hours
   - Handles throttling

### Technologies

- **Node.js & Express**: Backend framework
- **MongoDB**: Primary database
- **Kafka**: Message queue for async processing
- **Elasticsearch**: Search and analytics
- **Docker**: Containerization
- **Jest**: Testing framework
- **Swagger**: API documentation

## Project Structure

```
/src
  /services
    /ingestion      # Notification ingestion
    /processing     # Priority-based processing
    /delivery       # Multi-channel delivery
    /preferences    # User preferences
  /models          # Database schemas
  /config          # Configuration
  /utils           # Utilities
/tests             # Test files
/docker            # Docker configurations
```

## Error Handling

- Input validation
- Retry mechanism for failed deliveries
- Dead letter queues
- Comprehensive error logging

## Monitoring

- Health check endpoint
- Delivery status tracking
- Performance metrics
- Error logging

## Future Improvements

1. Additional delivery channels
2. Advanced scheduling features
3. Analytics dashboard
4. Real-time notifications
5. Message templating
6. Batch processing
7. Rate limiting per channel
8. A/B testing support

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC
