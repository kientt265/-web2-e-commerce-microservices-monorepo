export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Order Service API (VNPay)',
    version: '1.0.0',
    description:
      'Order management APIs: create orders, get orders by ID or user ID. Supports VNPay online payment (payment URL creation) and cash on delivery via outbox event publishing.',
  },
  servers: [{ url: '/' }],
  tags: [{ name: 'Health' }, { name: 'Orders' }, { name: 'Payments' }],
  paths: {
    '/run': {
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
                  properties: { 
                    message: { type: 'string' }
                  },
                  required: ['message'],
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
        description: 'Creates a new order and saves to database. Generates VNPay URL for online payment orders. Uses outbox pattern for event publishing.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateOrderRequest' },
              examples: {
                onlinePayment: {
                  value: {
                    userId: '550e8400-e29b-41d4-a716-446655440000',
                    items: [
                      {
                        productId: 'product_123',
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
                    userId: '550e8400-e29b-41d4-a716-446655440000',
                    items: [
                      {
                        productId: 'product_456',
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
        { name: 'orderId', in: 'path', required: true, schema: { type: 'string' }, description: 'Order ID (format: order_123456)' }
      ],
      get: {
        tags: ['Orders'],
        summary: 'Get order by ID',
        description: 'Retrieves order details by order ID from database',
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
        { name: 'userId', in: 'path', required: true, schema: { type: 'string' }, description: 'User ID (UUID format)' }
      ],
      get: {
        tags: ['Orders'],
        summary: 'Get all orders for a user',
        description: 'Retrieves all orders belonging to a specific user from database',
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
    },
    '/api/orders/payment-url': {
      post: {
        tags: ['Payments'],
        summary: 'Create VNPay payment URL',
        description: 'Creates a VNPay payment URL for an existing order',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreatePaymentUrlRequest' },
              example: {
                orderId: 'order_123456',
                amount: 199.98,
                orderInfo: 'Thanh toan don hang #123456',
                bankCode: 'VNBANK'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Payment URL created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/PaymentUrlResponse' },
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
          productId: { type: 'string', description: 'Product ID (format: product_123)', example: 'product_123' },
          quantity: { type: 'integer', minimum: 1, description: 'Item quantity', example: 2 },
          price: { type: 'number', minimum: 0, description: 'Price per item', example: 99.99 }
        },
        required: ['productId', 'quantity', 'price']
      },
      ShippingAddress: {
        type: 'object',
        properties: {
          street: { type: 'string', description: 'Street address', example: '123 Main St' },
          city: { type: 'string', description: 'City', example: 'New York' },
          state: { type: 'string', description: 'State or province', example: 'NY' },
          zipCode: { type: 'string', description: 'ZIP or postal code', example: '10001' },
          country: { type: 'string', description: 'Country', example: 'USA' }
        },
        required: ['street', 'city', 'state', 'zipCode', 'country']
      },
      CreateOrderRequest: {
        type: 'object',
        properties: {
          userId: { 
            type: 'string', 
            format: 'uuid',
            description: 'User ID (UUID format)', 
            example: '550e8400-e29b-41d4-a716-446655440000'
          },
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
          totalAmount: { type: 'number', minimum: 0, description: 'Total order amount', example: 199.98 }
        },
        required: ['userId', 'items', 'shippingAddress', 'paymentMethod', 'totalAmount']
      },
      OrderResponse: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'Unique order identifier', example: 'order_123456' },
          userId: { type: 'string', description: 'User ID', example: '550e8400-e29b-41d4-a716-446655440000' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/OrderItem' },
            description: 'Order items'
          },
          totalAmount: { type: 'number', description: 'Total order amount', example: 199.98 },
          status: {
            type: 'string',
            enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUNDED'],
            description: 'Order status',
            example: 'PENDING'
          },
          paymentMethod: {
            type: 'string',
            enum: ['ONLINE_PAYMENT', 'CASH_ON_DELIVERY'],
            description: 'Payment method',
            example: 'ONLINE_PAYMENT'
          },
          paymentStatus: {
            type: 'string',
            enum: ['PENDING', 'PAID', 'FAILED'],
            description: 'Payment status',
            example: 'PENDING'
          },
          shippingAddress: { $ref: '#/components/schemas/ShippingAddress' },
          createdAt: { type: 'string', format: 'date-time', description: 'Order creation timestamp' },
          updatedAt: { type: 'string', format: 'date-time', description: 'Last update timestamp' },
          paymentUrl: { 
            type: 'string', 
            nullable: true, 
            description: 'VNPay payment URL for online payment orders',
            example: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...'
          }
        },
        required: ['orderId', 'userId', 'items', 'totalAmount', 'status', 'paymentMethod', 'paymentStatus', 'shippingAddress', 'createdAt', 'updatedAt']
      },
      CreatePaymentUrlRequest: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'Order ID', example: 'order_123456' },
          amount: { type: 'number', minimum: 0, description: 'Payment amount', example: 199.98 },
          orderInfo: { type: 'string', description: 'Order description', example: 'Thanh toan don hang #123456' },
          bankCode: { type: 'string', description: 'Bank code (optional)', example: 'VNBANK' }
        },
        required: ['orderId', 'amount', 'orderInfo']
      },
      PaymentUrlResponse: {
        type: 'object',
        properties: {
          paymentUrl: { type: 'string', description: 'VNPay payment URL', example: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...' },
          orderId: { type: 'string', description: 'Order ID', example: 'order_123456' },
          amount: { type: 'number', description: 'Payment amount', example: 199.98 }
        },
        required: ['paymentUrl', 'orderId', 'amount']
      }
    }
  }
} as const;
