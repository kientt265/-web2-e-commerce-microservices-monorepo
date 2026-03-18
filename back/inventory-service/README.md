# Inventory Service

## Overview

Inventory service manages product inventory and automatically processes order events from Kafka to reserve stock. It handles both online payment orders (checkout reservation) and cash on delivery orders (shipping reservation).

## Features

- **Kafka Event Processing**: Subscribes to order events from order-service
- **Automatic Inventory Reservation**: Reserves stock based on payment method
- **Transaction Tracking**: Records all inventory movements in database
- **REST API**: Full CRUD operations for inventory management
- **Low Stock Alerts**: Monitor items below threshold
- **Modular Architecture**: Clean separation of concerns

## Event Processing Logic

### Order Events Handled

1. **ORDER_CREATED_ONLINE_PAYMENT**
   - Increments `reserved_checkout` field
   - Creates inventory transaction record
   - Reason: `"Order {orderId} - ORDER_CREATED_ONLINE_PAYMENT - ONLINE_PAYMENT"`

2. **ORDER_CREATED_CASH_ON_DELIVERY**
   - Increments `reserved_shipping` field  
   - Creates inventory transaction record
   - Reason: `"Order {orderId} - ORDER_CREATED_CASH_ON_DELIVERY - CASH_ON_DELIVERY"`

### Inventory Flow

For each order item received:
1. Find or create inventory record for the product
2. Update appropriate reservation field based on payment method
3. Create transaction record in `inventory_transactions` table
4. Log processing details

## API Documentation

### Swagger UI
Interactive API documentation is available at:
- **Swagger UI**: `http://localhost:3005/docs`
- **OpenAPI Spec**: `http://localhost:3005/openapi.json`

### API Endpoints

#### Get All Inventory
```
GET /api/inventory
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "quantity": 100,
      "reserved_checkout": 5,
      "reserved_shipping": 3,
      "min_threshold": 5,
      "location": "Warehouse-product1",
      "updated_at": "2023-01-20T12:00:00.000Z",
      "transactions": [...]
    }
  ],
  "count": 1
}
```

#### Get Inventory by ID
```
GET /api/inventory/:inventoryId
```

#### Update Inventory Quantity
```
PUT /api/inventory/:inventoryId
```

**Request Body:**
```json
{
  "quantity": 150
}
```

#### Get Inventory Transactions
```
GET /api/inventory/transactions?orderId=order_123
```

#### Get Low Stock Items
```
GET /api/inventory/low-stock
```

## Architecture

### Directory Structure
```
src/
├── config/
│   └── kafka.ts              # Kafka consumer configuration
├── constants/
│   └── orderEvents.ts        # Order event type constants
├── controllers/
│   └── inventoryController.ts # HTTP request handlers
├── routes/
│   └── inventoryRoutes.ts    # API route definitions
├── services/
│   ├── inventoryService.ts   # Business logic and inventory operations
│   └── kafkaConsumerService.ts # Kafka message processing
├── types/
│   └── inventory.ts          # TypeScript interfaces and types
└── index.ts                  # Application entry point
```

### Kafka Integration

The service connects to Kafka as a consumer:

- **Topic**: `order-events`
- **Group ID**: `inventory-service-group`
- **Brokers**: `kafka-1:9092`, `kafka-2:9092`

### Database Schema

#### inventories Table
- `id`: Primary key
- `quantity`: Available stock quantity
- `reserved_checkout`: Reserved for online payment orders
- `reserved_shipping`: Reserved for cash on delivery orders
- `min_threshold`: Low stock alert threshold
- `location`: Warehouse location
- `updated_at`: Last update timestamp

#### inventory_transactions Table
- `id`: Primary key
- `inventory_id`: Foreign key to inventories
- `type`: Transaction type (IN/OUT)
- `quantity`: Quantity affected
- `reason`: Transaction description
- `order_id`: Associated order ID
- `created_at`: Transaction timestamp

## Environment Variables

- `INVENTORY_PORT`: Service port (default: 3001)
- `DATABASE_URL`: PostgreSQL connection string
- `KAFKA_BROKER_1`: First Kafka broker (default: kafka-1:9092)
- `KAFKA_BROKER_2`: Second Kafka broker (default: kafka-2:9092)
- `CORS_ORIGINS`: Allowed CORS origins (default: http://localhost:5173)

## TODO Items

1. **Product-Inventory Mapping**: Implement proper product table with foreign key to inventories
2. **Inventory Release Logic**: Handle order cancellations and payment failures
3. **Stock Replenishment**: APIs for adding inventory stock
4. **Advanced Reporting**: Inventory analytics and reporting
5. **Dead Letter Queue**: Handle failed Kafka message processing
6. **Testing**: Unit tests and integration tests
7. **Performance Optimization**: Batch processing for bulk orders

## Running the Service

With Docker Compose:
```bash
docker-compose up inventory-service
```

Development mode:
```bash
cd back/inventory-service
npm install
npm run dev
```

Once the service is running, visit:
- **Swagger UI**: http://localhost:3005/docs
- **Health Check**: http://localhost:3005/run

## Dependencies

- Express.js for HTTP server
- KafkaJS for Kafka integration
- Prisma for database ORM
- TypeScript for type safety

## Monitoring

The service logs important events:
- Kafka connection status
- Order event processing
- Inventory updates
- Transaction records
- Error conditions

## Integration Notes

- Automatically processes orders from order-service via Kafka
- Maintains data consistency with transaction records
- Scales horizontally with Kafka consumer groups
- Resilient to service restarts with Kafka offset management
