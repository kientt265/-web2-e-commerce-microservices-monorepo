export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Order Service API',
    version: '1.0.0',
    description: 'Order management APIs: create orders, get orders by ID or user ID. Supports online payment and cash on delivery with Kafka event publishing.',
  },
  servers: [{ url: '/' }],
  tags: [{ name: 'Health' }, { name: 'Orders' }],
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
    '/api/orders': {
      post: {
        tags: ['Orders'],
        summary: 'Create a new order',
        description: 'Creates a new order and publishes event to Kafka. Returns payment URL placeholder for online payment orders.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateOrderRequest' },
              examples: {
                onlinePayment: {
                  value: {
                    userId: 'user123',
                    items: [
                      {
                        productId: 'product1',
                        quantity: 2,
                        price: 99.99
                      }
                    ],
                    shippingAddress: {
                      street: '123 Main St',
                      city: 'New York',
                      state: 'NY',
                      zipCode: '10001',
                      country: 'USA'
                    },
                    paymentMethod: 'ONLINE_PAYMENT',
                    totalAmount: 199.98
                  }
                },
                cashOnDelivery: {
                  value: {
                    userId: 'user456',
                    items: [
                      {
                        productId: 'product2',
                        quantity: 1,
                        price: 49.99
                      }
                    ],
                    shippingAddress: {
                      street: '456 Oak Ave',
                      city: 'Los Angeles',
                      state: 'CA',
                      zipCode: '90001',
                      country: 'USA'
                    },
                    paymentMethod: 'CASH_ON_DELIVERY',
                    totalAmount: 49.99
                  }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Order created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/OrderResponse' },
                    message: { type: 'string' }
                  },
                  required: ['success', 'data', 'message']
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '500': { $ref: '#/components/responses/InternalServerError' }
        }
      }
    },
    '/api/orders/{orderId}': {
      parameters: [
        { name: 'orderId', in: 'path', required: true, schema: { type: 'string' }, description: 'Order ID' }
      ],
      get: {
        tags: ['Orders'],
        summary: 'Get order by ID',
        description: 'Retrieves order details by order ID',
        responses: {
          '200': {
            description: 'Order found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/OrderResponse' }
                  },
                  required: ['success', 'data']
                }
              }
            }
          },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/InternalServerError' }
        }
      }
    },
    '/api/orders/user/{userId}': {
      parameters: [
        { name: 'userId', in: 'path', required: true, schema: { type: 'string' }, description: 'User ID' }
      ],
      get: {
        tags: ['Orders'],
        summary: 'Get all orders for a user',
        description: 'Retrieves all orders belonging to a specific user',
        responses: {
          '200': {
            description: 'Orders retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/OrderResponse' }
                    },
                    count: { type: 'integer' }
                  },
                  required: ['success', 'data', 'count']
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '500': { $ref: '#/components/responses/InternalServerError' }
        }
      }
    }
  },
  components: {
    responses: {
      BadRequest: {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string' },
                message: { type: 'string' }
              },
              required: ['error']
            }
          }
        }
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string' },
                message: { type: 'string' }
              },
              required: ['error']
            }
          }
        }
      },
      InternalServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string' },
                message: { type: 'string' }
              },
              required: ['error']
            }
          }
        }
      }
    },
    schemas: {
      OrderItem: {
        type: 'object',
        properties: {
          productId: { type: 'string', description: 'Product ID' },
          quantity: { type: 'integer', minimum: 1, description: 'Item quantity' },
          price: { type: 'number', minimum: 0, description: 'Price per item' }
        },
        required: ['productId', 'quantity', 'price']
      },
      ShippingAddress: {
        type: 'object',
        properties: {
          street: { type: 'string', description: 'Street address' },
          city: { type: 'string', description: 'City' },
          state: { type: 'string', description: 'State or province' },
          zipCode: { type: 'string', description: 'ZIP or postal code' },
          country: { type: 'string', description: 'Country' }
        },
        required: ['street', 'city', 'state', 'zipCode', 'country']
      },
      CreateOrderRequest: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User ID' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/OrderItem' },
            minItems: 1,
            description: 'List of order items'
          },
          shippingAddress: { $ref: '#/components/schemas/ShippingAddress' },
          paymentMethod: {
            type: 'string',
            enum: ['ONLINE_PAYMENT', 'CASH_ON_DELIVERY'],
            description: 'Payment method'
          },
          totalAmount: { type: 'number', minimum: 0, description: 'Total order amount' }
        },
        required: ['userId', 'items', 'shippingAddress', 'paymentMethod', 'totalAmount']
      },
      OrderResponse: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'Unique order identifier' },
          userId: { type: 'string', description: 'User ID' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/OrderItem' },
            description: 'Order items'
          },
          totalAmount: { type: 'number', description: 'Total order amount' },
          status: {
            type: 'string',
            enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
            description: 'Order status'
          },
          paymentMethod: {
            type: 'string',
            enum: ['ONLINE_PAYMENT', 'CASH_ON_DELIVERY'],
            description: 'Payment method'
          },
          paymentStatus: {
            type: 'string',
            enum: ['PENDING', 'PAID', 'FAILED'],
            description: 'Payment status'
          },
          shippingAddress: { $ref: '#/components/schemas/ShippingAddress' },
          createdAt: { type: 'string', format: 'date-time', description: 'Order creation timestamp' },
          updatedAt: { type: 'string', format: 'date-time', description: 'Last update timestamp' },
          paymentUrl: { 
            type: 'string', 
            nullable: true, 
            description: 'Payment URL for online payment (TODO: Implement payment gateway integration)' 
          }
        },
        required: ['orderId', 'userId', 'items', 'totalAmount', 'status', 'paymentMethod', 'paymentStatus', 'shippingAddress', 'createdAt', 'updatedAt']
      }
    }
  }
} as const;
