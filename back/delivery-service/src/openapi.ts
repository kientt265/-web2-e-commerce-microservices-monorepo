export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Delivery Service API',
    version: '1.0.0',
    description: 'Delivery management APIs with Kafka event processing. Handles cash on delivery orders from outbox.order events, skips online payment orders automatically.',
  },
  servers: [{ url: '/' }],
  tags: [{ name: 'Health' }, { name: 'Delivery' }, { name: 'Kafka Events' }],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { ok: { type: 'boolean' }, service: { type: 'string' } },
                  required: ['ok', 'service'],
                },
              },
            },
          },
        },
      },
    },
    '/deliveries': {
      get: {
        tags: ['Delivery'],
        summary: 'Get all deliveries with pagination and filtering',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'PROCESSING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED', 'RETURNED'] } },
        ],
        responses: {
          '200': {
            description: 'Deliveries list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    deliveries: { type: 'array', items: { $ref: '#/components/schemas/Delivery' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                  required: ['deliveries', 'pagination'],
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Delivery'],
        summary: 'Create a new delivery',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateDeliveryRequest' },
              examples: {
                default: { value: { order_id: 123, shipping_address: '123 Main St, City', carrier: 'FedEx', shipping_fee: '15.99' } },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Delivery created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Delivery' } } } },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/deliveries/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }],
      get: {
        tags: ['Delivery'],
        summary: 'Get delivery by ID',
        responses: {
          '200': { description: 'Delivery', content: { 'application/json': { schema: { $ref: '#/components/schemas/Delivery' } } } },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Delivery'],
        summary: 'Update delivery',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateDeliveryRequest' } } },
        },
        responses: {
          '200': { description: 'Delivery updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Delivery' } } } },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Delivery'],
        summary: 'Delete delivery',
        responses: {
          '204': { description: 'Delivery deleted' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/deliveries/{id}/status': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }],
      patch: {
        tags: ['Delivery'],
        summary: 'Update delivery status',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateStatusRequest' },
              examples: {
                default: { value: { status: 'IN_TRANSIT', description: 'Package is in transit', location: 'Distribution Center' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Status updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Delivery' } } } },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/orders/{orderId}/deliveries': {
      parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }],
      get: {
        tags: ['Delivery'],
        summary: 'Get deliveries by order ID',
        responses: {
          '200': {
            description: 'Deliveries for order',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Delivery' } } } },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
  },
  components: {
    responses: {
      BadRequest: {
        description: 'Bad request',
        content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } }, required: ['error'] } } },
      },
      NotFound: {
        description: 'Not found',
        content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } }, required: ['error'] } } },
      },
    },
    schemas: {
      Delivery: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          order_id: { type: 'integer' },
          tracking_code: { type: 'string', nullable: true },
          carrier: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['PENDING', 'PROCESSING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED', 'RETURNED'] },
          shipping_address: { type: 'string' },
          city: { type: 'string', nullable: true },
          district: { type: 'string', nullable: true },
          ward: { type: 'string', nullable: true },
          postcode: { type: 'string', nullable: true },
          estimated_at: { type: 'string', format: 'date-time', nullable: true },
          delivered_at: { type: 'string', format: 'date-time', nullable: true },
          cancelled_at: { type: 'string', format: 'date-time', nullable: true },
          shipping_fee: { type: 'string', example: '15.99', nullable: true },
          notes: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time', nullable: true },
          updated_at: { type: 'string', format: 'date-time', nullable: true },
          delivery_events: { type: 'array', items: { $ref: '#/components/schemas/DeliveryEvent' } },
        },
        required: ['id', 'order_id', 'status', 'shipping_address', 'delivery_events'],
      },
      DeliveryEvent: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          delivery_id: { type: 'integer' },
          status: { type: 'string', enum: ['PENDING', 'PROCESSING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED', 'RETURNED'] },
          description: { type: 'string', nullable: true },
          location: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time', nullable: true },
        },
        required: ['id', 'delivery_id', 'status'],
      },
      OrderEvent: {
        type: 'object',
        description: 'Order event received from Kafka outbox.order topic',
        properties: {
          eventType: { type: 'string', description: 'Type of order event' },
          orderId: { type: 'string', description: 'Order ID' },
          userId: { type: 'string', description: 'User ID' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/OrderItem' },
            description: 'Order items'
          },
          totalAmount: { type: 'number', description: 'Total order amount' },
          shippingAddress: { $ref: '#/components/schemas/ShippingAddress' },
          paymentMethod: { 
            type: 'string', 
            enum: ['ONLINE_PAYMENT', 'CASH_ON_DELIVERY'],
            description: 'Payment method - only CASH_ON_DELIVERY orders are processed'
          },
          timestamp: { type: 'string', format: 'date-time', description: 'Event timestamp' },
        },
        required: ['eventType', 'orderId', 'userId', 'items', 'totalAmount', 'shippingAddress', 'paymentMethod', 'timestamp'],
      },
      OrderItem: {
        type: 'object',
        properties: {
          productId: { type: 'string' },
          quantity: { type: 'integer' },
          price: { type: 'number' },
        },
        required: ['productId', 'quantity', 'price'],
      },
      ShippingAddress: {
        type: 'object',
        properties: {
          street: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          zipCode: { type: 'string' },
          country: { type: 'string' },
        },
        required: ['street', 'city', 'state', 'zipCode', 'country'],
      },
      CreateDeliveryRequest: {
        type: 'object',
        properties: {
          order_id: { type: 'integer', minimum: 1 },
          carrier: { type: 'string' },
          shipping_address: { type: 'string' },
          city: { type: 'string' },
          district: { type: 'string' },
          ward: { type: 'string' },
          postcode: { type: 'string' },
          estimated_at: { type: 'string', format: 'date-time' },
          shipping_fee: { type: 'string', example: '15.99' },
          notes: { type: 'string' },
        },
        required: ['order_id', 'shipping_address'],
      },
      UpdateDeliveryRequest: {
        type: 'object',
        properties: {
          tracking_code: { type: 'string' },
          carrier: { type: 'string' },
          status: { type: 'string', enum: ['PENDING', 'PROCESSING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED', 'RETURNED'] },
          shipping_address: { type: 'string' },
          city: { type: 'string' },
          district: { type: 'string' },
          ward: { type: 'string' },
          postcode: { type: 'string' },
          estimated_at: { type: 'string', format: 'date-time' },
          delivered_at: { type: 'string', format: 'date-time' },
          cancelled_at: { type: 'string', format: 'date-time' },
          shipping_fee: { type: 'string', example: '15.99' },
          notes: { type: 'string' },
        },
      },
      UpdateStatusRequest: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['PENDING', 'PROCESSING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED', 'RETURNED'] },
          description: { type: 'string' },
          location: { type: 'string' },
        },
        required: ['status'],
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          pages: { type: 'integer' },
        },
        required: ['page', 'limit', 'total', 'pages'],
      },
    },
  },
} as const;
