export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Product Service API',
    version: '1.0.0',
    description: 'Basic CRUD APIs for products and categories.',
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'Health' },
    { name: 'Categories' },
    { name: 'Products' },
  ],
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
                  properties: {
                    ok: { type: 'boolean' },
                    service: { type: 'string' },
                  },
                  required: ['ok', 'service'],
                },
              },
            },
          },
        },
      },
    },
    '/categories': {
      get: {
        tags: ['Categories'],
        summary: 'List categories',
        responses: {
          '200': {
            description: 'List of categories',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    items: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Category' },
                    },
                  },
                  required: ['items'],
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Categories'],
        summary: 'Create category',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CategoryCreate' },
              examples: {
                default: {
                  value: { name: 'Shoes', description: 'All shoes' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Category' } },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/categories/{id}': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'integer', minimum: 1 },
        },
      ],
      get: {
        tags: ['Categories'],
        summary: 'Get category by id (includes products)',
        responses: {
          '200': {
            description: 'Category',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/CategoryWithProducts' } },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Categories'],
        summary: 'Update category',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CategoryUpdate' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Category' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Categories'],
        summary: 'Delete category',
        responses: {
          '204': { description: 'Deleted' },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/products': {
      get: {
        tags: ['Products'],
        summary: 'List products (filter + pagination)',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'categoryId', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'minPrice', in: 'query', schema: { type: 'string', example: '10.00' } },
          { name: 'maxPrice', in: 'query', schema: { type: 'string', example: '99.99' } },
          { name: 'inStockOnly', in: 'query', schema: { type: 'boolean' } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          {
            name: 'sort',
            in: 'query',
            schema: { type: 'string', enum: ['newest', 'price_asc', 'price_desc'], default: 'newest' },
          },
        ],
        responses: {
          '200': {
            description: 'List of products',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    items: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    total: { type: 'integer' },
                    totalPages: { type: 'integer' },
                  },
                  required: ['items', 'page', 'limit', 'total', 'totalPages'],
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Products'],
        summary: 'Create product',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProductCreate' },
              examples: {
                default: {
                  value: {
                    name: 'Nike Air',
                    description: 'Running shoes',
                    price: '129.99',
                    categoryId: 1,
                    images: ['https://example.com/1.png'],
                    stock: 10,
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/products/{id}': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'integer', minimum: 1 },
        },
      ],
      get: {
        tags: ['Products'],
        summary: 'Get product by id',
        responses: {
          '200': {
            description: 'Product',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Products'],
        summary: 'Update product',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProductUpdate' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Products'],
        summary: 'Delete product',
        responses: {
          '204': { description: 'Deleted' },
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
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { error: { type: 'string' } },
              required: ['error'],
            },
          },
        },
      },
      NotFound: {
        description: 'Not found',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { error: { type: 'string' } },
              required: ['error'],
            },
          },
        },
      },
    },
    schemas: {
      Category: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time', nullable: true },
        },
        required: ['id', 'name'],
      },
      CategoryWithProducts: {
        allOf: [
          { $ref: '#/components/schemas/Category' },
          {
            type: 'object',
            properties: {
              products: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
            },
            required: ['products'],
          },
        ],
      },
      CategoryCreate: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
        },
        required: ['name'],
      },
      CategoryUpdate: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          price: { type: 'string', example: '129.99' },
          category_id: { type: 'integer', nullable: true },
          images: { type: 'array', items: { type: 'string' } },
          stock: { type: 'integer' },
          created_at: { type: 'string', format: 'date-time', nullable: true },
          updated_at: { type: 'string', format: 'date-time', nullable: true },
          categories: { $ref: '#/components/schemas/Category', nullable: true },
        },
        required: ['id', 'name', 'price', 'images', 'stock'],
      },
      ProductCreate: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          price: { type: 'string', example: '129.99' },
          categoryId: { type: 'integer', nullable: true },
          images: { type: 'array', items: { type: 'string' } },
          stock: { type: 'integer', minimum: 0, default: 0 },
        },
        required: ['name', 'price'],
      },
      ProductUpdate: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          price: { type: 'string', example: '129.99' },
          categoryId: { type: 'integer', nullable: true },
          images: { type: 'array', items: { type: 'string' } },
          stock: { type: 'integer', minimum: 0 },
        },
      },
    },
  },
} as const;

