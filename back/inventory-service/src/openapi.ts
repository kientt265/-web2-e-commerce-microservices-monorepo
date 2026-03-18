export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Inventory Service API',
    version: '1.0.0',
    description: 'Inventory management APIs with Kafka event processing. Handles stock reservations for online payment and cash on delivery orders.',
  },
  servers: [{ url: '/' }],
  tags: [{ name: 'Health' }, { name: 'Inventory' }, { name: 'Transactions' }],
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
    '/inventories': {
      get: {
        tags: ['Inventory'],
        summary: 'Get all inventory items',
        responses: {
          '200': {
            description: 'Inventory items retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Inventory' } },
                    count: { type: 'integer' }
                  },
                  required: ['success', 'data', 'count']
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Inventory'],
        summary: 'Create new inventory item',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateInventoryRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Inventory created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Inventory' },
                    message: { type: 'string' }
                  },
                  required: ['success', 'data', 'message']
                }
              }
            }
          }
        }
      }
    },
    '/inventories/low-stock': {
      get: {
        tags: ['Inventory'],
        summary: 'Get low stock items',
        responses: {
          '200': {
            description: 'Low stock items retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Inventory' } },
                    count: { type: 'integer' },
                    message: { type: 'string' }
                  },
                  required: ['success', 'data', 'count']
                }
              }
            }
          }
        }
      }
    },
    '/inventories/{inventoryId}': {
      parameters: [
        { name: 'inventoryId', in: 'path', required: true, schema: { type: 'integer' }, description: 'Inventory ID' }
      ],
      get: {
        tags: ['Inventory'],
        summary: 'Get inventory by ID',
        responses: {
          '200': {
            description: 'Inventory retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/InventoryWithTransactions' }
                  },
                  required: ['success', 'data']
                }
              }
            }
          }
        },
        put: {
          tags: ['Inventory'],
          summary: 'Update inventory',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateInventoryRequest' }
              }
            }
          },
          responses: {
            '200': {
              description: 'Inventory updated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { $ref: '#/components/schemas/Inventory' },
                      message: { type: 'string' }
                    },
                    required: ['success', 'data', 'message']
                  }
                }
              }
            }
          }
        },
        delete: {
          tags: ['Inventory'],
          summary: 'Delete inventory',
          responses: {
            '200': {
              description: 'Inventory deleted successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      message: { type: 'string' }
                    },
                    required: ['success', 'message']
                  }
                }
              }
            }
          }
        }
      }
    },
    '/inventories/transactions': {
      get: {
        tags: ['Transactions'],
        summary: 'Get inventory transactions',
        parameters: [
          { name: 'orderId', in: 'query', schema: { type: 'string' }, description: 'Filter by order ID' }
        ],
        responses: {
          '200': {
            description: 'Transactions retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/InventoryTransaction' } },
                    count: { type: 'integer' }
                  },
                  required: ['success', 'data', 'count']
                }
              }
            }
          }
        }
      }
    },
    '/inventories/transactions/payment-method/{paymentMethod}': {
      parameters: [
        { name: 'paymentMethod', in: 'path', required: true, schema: { type: 'string', enum: ['ONLINE_PAYMENT', 'CASH_ON_DELIVERY'] } }
      ],
      get: {
        tags: ['Transactions'],
        summary: 'Get transactions by payment method',
        responses: {
          '200': {
            description: 'Transactions retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/InventoryTransaction' } },
                    count: { type: 'integer' }
                  },
                  required: ['success', 'data', 'count']
                }
              }
            }
          }
        }
      }
    },
    '/inventories/transactions/payment-status/{paymentStatus}': {
      parameters: [
        { name: 'paymentStatus', in: 'path', required: true, schema: { type: 'string', enum: ['PENDING', 'PAID', 'EXPIRED'] } }
      ],
      get: {
        tags: ['Transactions'],
        summary: 'Get transactions by payment status',
        responses: {
          '200': {
            description: 'Transactions retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/InventoryTransaction' } },
                    count: { type: 'integer' }
                  },
                  required: ['success', 'data', 'count']
                }
              }
            }
          }
        }
      }
    },
    '/inventories/transactions/{transactionId}/status': {
      parameters: [
        { name: 'transactionId', in: 'path', required: true, schema: { type: 'integer' }, description: 'Transaction ID' }
      ],
      put: {
        tags: ['Transactions'],
        summary: 'Update transaction status',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  paymentStatus: { type: 'string', enum: ['PENDING', 'PAID', 'EXPIRED'] }
                },
                required: ['paymentStatus']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Transaction status updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/InventoryTransaction' },
                    message: { type: 'string' }
                  },
                  required: ['success', 'data', 'message']
                }
              }
            }
          }
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
      }
    },
    schemas: {
      Inventory: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'Inventory ID' },
          quantity: { type: 'integer', description: 'Available quantity' },
          reserved_checkout: { type: 'integer', description: 'Reserved for online payment orders' },
          reserved_shipping: { type: 'integer', description: 'Reserved for cash on delivery orders' },
          min_threshold: { type: 'integer', description: 'Low stock threshold' },
          location: { type: 'string', description: 'Warehouse location' },
          updated_at: { type: 'string', format: 'date-time', description: 'Last update timestamp' }
        },
        required: ['id', 'quantity', 'reserved_checkout', 'reserved_shipping', 'min_threshold', 'updated_at']
      },
      InventoryTransaction: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'Transaction ID' },
          inventory_id: { type: 'integer', description: 'Inventory ID' },
          payment_method: { type: 'string', enum: ['ONLINE_PAYMENT', 'CASH_ON_DELIVERY'], description: 'Payment method' },
          payment_status: { type: 'string', enum: ['PENDING', 'PAID', 'EXPIRED'], description: 'Payment status' },
          quantity: { type: 'integer', description: 'Quantity reserved' },
          order_id: { type: 'string', description: 'Order ID' },
          created_at: { type: 'string', format: 'date-time', description: 'Transaction timestamp' }
        },
        required: ['id', 'inventory_id', 'payment_method', 'payment_status', 'quantity', 'order_id', 'created_at']
      },
      InventoryWithTransactions: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'Inventory ID' },
          quantity: { type: 'integer', description: 'Available quantity' },
          reserved_checkout: { type: 'integer', description: 'Reserved for online payment orders' },
          reserved_shipping: { type: 'integer', description: 'Reserved for cash on delivery orders' },
          min_threshold: { type: 'integer', description: 'Low stock threshold' },
          location: { type: 'string', description: 'Warehouse location' },
          updated_at: { type: 'string', format: 'date-time', description: 'Last update timestamp' },
          transactions: {
            type: 'array',
            items: { $ref: '#/components/schemas/InventoryTransaction' },
            description: 'Recent transactions'
          }
        },
        required: ['id', 'quantity', 'reserved_checkout', 'reserved_shipping', 'min_threshold', 'updated_at', 'transactions']
      },
      CreateInventoryRequest: {
        type: 'object',
        properties: {
          quantity: { type: 'integer', minimum: 0, description: 'Available quantity' },
          reserved_checkout: { type: 'integer', minimum: 0, description: 'Reserved for online payment orders' },
          reserved_shipping: { type: 'integer', minimum: 0, description: 'Reserved for cash on delivery orders' },
          min_threshold: { type: 'integer', minimum: 0, description: 'Low stock threshold' },
          location: { type: 'string', description: 'Warehouse location' }
        },
        required: ['quantity']
      },
      UpdateInventoryRequest: {
        type: 'object',
        properties: {
          quantity: { type: 'integer', minimum: 0, description: 'Available quantity' },
          reserved_checkout: { type: 'integer', minimum: 0, description: 'Reserved for online payment orders' },
          reserved_shipping: { type: 'integer', minimum: 0, description: 'Reserved for cash on delivery orders' },
          min_threshold: { type: 'integer', minimum: 0, description: 'Low stock threshold' },
          location: { type: 'string', description: 'Warehouse location' }
        }
      }
    }
  }
} as const;
