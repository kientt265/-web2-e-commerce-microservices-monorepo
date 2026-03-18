# Order Service

## Overview

Order service handles order creation, management, and publishes events to Kafka for microservices communication.

## Features

- **Order Creation**: Create orders with online payment or cash on delivery
- **Event Publishing**: Publishes order events to Kafka topic `order-events`
- **Order Management**: Get orders by ID or user ID
- **Modular Architecture**: Clean separation of concerns with controllers, services, and types

## Event Types

The service publishes two types of events to Kafka:

1. **ORDER_CREATED_ONLINE_PAYMENT**: For orders with online payment method
2. **ORDER_CREATED_CASH_ON_DELIVERY**: For orders with cash on delivery method

## API Documentation

### Swagger UI
Interactive API documentation is available at:
- **Swagger UI**: `http://localhost:3003/docs`
- **OpenAPI Spec**: `http://localhost:3003/openapi.json`

### API Endpoints

### Create Order
```
POST /api/orders
```

**Request Body:**
```json
{
  "userId": "user123",
  "items": [
    {
      "productId": "product1",
      "quantity": 2,
      "price": 99.99
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "paymentMethod": "ONLINE_PAYMENT" | "CASH_ON_DELIVERY",
  "totalAmount": 199.98
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order_1642694400000_abc123def",
    "userId": "user123",
    "items": [...],
    "totalAmount": 199.98,
    "status": "PENDING",
    "paymentMethod": "ONLINE_PAYMENT",
    "paymentStatus": "PENDING",
    "shippingAddress": {...},
    "createdAt": "2023-01-20T12:00:00.000Z",
    "updatedAt": "2023-01-20T12:00:00.000Z",
    "paymentUrl": null // TODO: Implement payment URL generation
  },
  "message": "Order created successfully"
}
```

### Get Order by ID
```
GET /api/orders/:orderId
```

### Get Orders by User ID
```
GET /api/orders/user/:userId
```

## Architecture

### Directory Structure
```
src/
├── config/
│   └── kafka.ts          # Kafka producer configuration
├── constants/
│   └── orderEvents.ts    # Order event type constants
├── controllers/
│   └── orderController.ts # HTTP request handlers
├── routes/
│   └── orderRoutes.ts    # API route definitions
├── services/
│   └── orderService.ts   # Business logic and event publishing
├── types/
│   └── order.ts          # TypeScript interfaces and types
└── index.ts              # Application entry point
```

### Kafka Integration

The service connects to Kafka and publishes order events to the `order-events` topic. Each event includes:

- Order details (ID, user, items, amounts)
- Event type (ORDER_CREATED_ONLINE_PAYMENT or ORDER_CREATED_CASH_ON_DELIVERY)
- Timestamp
- Shipping information
- Payment method

## Environment Variables

- `ORDER_PORT`: Service port (default: 3001)
- `DATABASE_URL`: PostgreSQL connection string
- `KAFKA_BROKER_1`: First Kafka broker (default: kafka-1:9092)
- `KAFKA_BROKER_2`: Second Kafka broker (default: kafka-2:9092)
- `CORS_ORIGINS`: Allowed CORS origins (default: http://localhost:5173)

## TODO Items

1. **Database Integration**: Implement actual database operations for order persistence
2. **Payment URL Generation**: Implement payment gateway integration for online payments
3. **Order Status Updates**: Add endpoints to update order status
4. **Order Validation**: Add inventory and product validation before order creation
5. **Error Handling**: Enhance error handling and logging
6. **Testing**: Add unit tests and integration tests

## Running the Service

With Docker Compose:
```bash
docker-compose up order-service
```

Development mode:
```bash
cd back/order-service
npm install
npm run dev
```

Once the service is running, visit:
- **Swagger UI**: http://localhost:3003/docs
- **Health Check**: http://localhost:3003/run

## Dependencies

- Express.js for HTTP server
- KafkaJS for Kafka integration
- Prisma for database ORM
- TypeScript for type safety
