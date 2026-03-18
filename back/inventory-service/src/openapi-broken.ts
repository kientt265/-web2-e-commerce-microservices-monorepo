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
    '/api/inventory': {
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
    '/api/inventory/low-stock': {
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
    '/api/inventory/{inventoryId}': {
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
    '/api/inventory/transactions': {
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
    '/api/inventory/transactions/payment-method/{paymentMethod}': {
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
    '/api/inventory/transactions/payment-status/{paymentStatus}': {
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
    '/api/inventory/transactions/{transactionId}/status': {
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
    },
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
        },
      },
      Conflict: {
        description: 'Conflict',
        content: {
          'application/json': {
            schema: { type: 'object', properties: { error: { type: 'string' } }, required: ['error'] },
          },
        },
      },
    },
    schemas: {
      Inventory: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          product_id: { type: 'integer' },
          quantity: { type: 'integer' },
          reserved: { type: 'integer' },
          min_threshold: { type: 'integer' },
          location: { type: 'string', nullable: true },
          updated_at: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'product_id', 'quantity', 'reserved', 'min_threshold', 'updated_at'],
      },
      InventoryCreate: {
        type: 'object',
        properties: {
          productId: { type: 'integer', minimum: 1 },
          quantity: { type: 'integer', minimum: 0, default: 0 },
          reserved: { type: 'integer', minimum: 0, default: 0 },
          minThreshold: { type: 'integer', minimum: 0, default: 5 },
          location: { type: 'string', nullable: true },
        },
        required: ['productId'],
      },
      InventoryUpdate: {
        type: 'object',
        properties: {
          quantity: { type: 'integer', minimum: 0 },
          reserved: { type: 'integer', minimum: 0 },
          minThreshold: { type: 'integer', minimum: 0 },
          location: { type: 'string', nullable: true },
        },
      },
      InventoryAdjust: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['IN', 'OUT'] },
          quantity: { type: 'integer', minimum: 1 },
          reason: { type: 'string' },
          referenceId: { type: 'string' },
        },
        required: ['type', 'quantity'],
      },
      InventoryTransaction: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          inventory_id: { type: 'integer' },
          type: { type: 'string', enum: ['IN', 'OUT'] },
          quantity: { type: 'integer' },
          reason: { type: 'string', nullable: true },
          reference_id: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'inventory_id', 'type', 'quantity', 'created_at'],
      },
    },
  },
} as const;

