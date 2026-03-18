export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Cart Service API',
    version: '1.0.0',
    description: 'Basic cart APIs: get/create cart, list/add/update/remove/clear items.',
  },
  servers: [{ url: '/' }],
  tags: [{ name: 'Health' }, { name: 'Cart' }],
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
    '/carts/{userId}': {
      parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      get: {
        tags: ['Cart'],
        summary: 'Get or create cart by userId (UUID)',
        responses: {
          '200': {
            description: 'Cart',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Cart' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/carts/{userId}/items': {
      parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      get: {
        tags: ['Cart'],
        summary: 'List cart items',
        responses: {
          '200': {
            description: 'Items',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    cartId: { type: 'integer' },
                    items: { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
                  },
                  required: ['cartId', 'items'],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
      post: {
        tags: ['Cart'],
        summary: 'Add item (or increase quantity if exists)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AddItemRequest' },
              examples: {
                default: { value: { productId: 1, quantity: 2, priceAtAdded: '129.99' } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Item added/updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    cartId: { type: 'integer' },
                    item: { $ref: '#/components/schemas/CartItem' },
                  },
                  required: ['cartId', 'item'],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
      delete: {
        tags: ['Cart'],
        summary: 'Clear cart (delete all items)',
        responses: {
          '204': { description: 'Cleared' },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/carts/{userId}/items/{itemId}': {
      parameters: [
        { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'itemId', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
      ],
      put: {
        tags: ['Cart'],
        summary: 'Update cart item quantity',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateItemRequest' } } },
        },
        responses: {
          '200': { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/CartItem' } } } },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Cart'],
        summary: 'Remove an item from cart',
        responses: {
          '204': { description: 'Removed' },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
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
      Cart: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          user_id: { type: 'string', format: 'uuid' },
          created_at: { type: 'string', format: 'date-time', nullable: true },
          updated_at: { type: 'string', format: 'date-time', nullable: true },
          cart_items: { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
        },
        required: ['id', 'user_id', 'cart_items'],
      },
      CartItem: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          cart_id: { type: 'integer' },
          product_id: { type: 'integer' },
          quantity: { type: 'integer' },
          price_at_added: { type: 'string', example: '129.99' },
          created_at: { type: 'string', format: 'date-time', nullable: true },
          updated_at: { type: 'string', format: 'date-time', nullable: true },
        },
        required: ['id', 'cart_id', 'product_id', 'quantity', 'price_at_added'],
      },
      AddItemRequest: {
        type: 'object',
        properties: {
          productId: { type: 'integer', minimum: 1 },
          quantity: { type: 'integer', minimum: 1, default: 1 },
          priceAtAdded: { type: 'string', example: '129.99' },
        },
        required: ['productId', 'priceAtAdded'],
      },
      UpdateItemRequest: {
        type: 'object',
        properties: {
          quantity: { type: 'integer', minimum: 1 },
        },
        required: ['quantity'],
      },
    },
  },
} as const;

