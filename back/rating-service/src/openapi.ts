export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Rating Service API',
    version: '1.0.0',
    description: 'Rating and review APIs for e-commerce products. Create, read, update, delete ratings, helpful votes, and reporting functionality.',
  },
  servers: [{ url: '/' }],
  tags: [{ name: 'Health' }, { name: 'Ratings' }],
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
    '/products/{productId}/ratings': {
      parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }],
      get: {
        tags: ['Ratings'],
        summary: 'Get ratings for a product',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
        ],
        responses: {
          '200': {
            description: 'Product ratings with pagination and stats',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductRatingsResponse' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
      post: {
        tags: ['Ratings'],
        summary: 'Create a new rating for a product',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateRatingRequest' },
              examples: {
                default: { value: { rating: 5, title: 'Great product!', comment: 'Really satisfied with this purchase.', is_anonymous: false } },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Rating created successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Rating' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/users/ratings': {
      get: {
        tags: ['Ratings'],
        summary: 'Get current user\'s ratings',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
        ],
        responses: {
          '200': {
            description: 'User ratings with pagination',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UserRatingsResponse' } } },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/ratings/{ratingId}': {
      parameters: [{ name: 'ratingId', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }],
      put: {
        tags: ['Ratings'],
        summary: 'Update a rating',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateRatingRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Rating updated successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Rating' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Ratings'],
        summary: 'Delete a rating',
        responses: {
          '204': { description: 'Rating deleted successfully' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/ratings/{ratingId}/helpful': {
      parameters: [{ name: 'ratingId', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }],
      post: {
        tags: ['Ratings'],
        summary: 'Toggle helpful vote for a rating',
        responses: {
          '200': {
            description: 'Helpful vote toggled',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { message: { type: 'string' }, isHelpful: { type: 'boolean' } },
                  required: ['message', 'isHelpful'],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/ratings/{ratingId}/report': {
      parameters: [{ name: 'ratingId', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }],
      post: {
        tags: ['Ratings'],
        summary: 'Report a rating',
        responses: {
          '200': {
            description: 'Rating reported successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { message: { type: 'string' } },
                  required: ['message'],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
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
      Unauthorized: {
        description: 'Unauthorized',
        content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } }, required: ['error'] } } },
      },
      NotFound: {
        description: 'Not found',
        content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } }, required: ['error'] } } },
      },
    },
    schemas: {
      Rating: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          product_id: { type: 'integer' },
          user_id: { type: 'string', format: 'uuid' },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          title: { type: 'string', nullable: true },
          comment: { type: 'string', nullable: true },
          images: { type: 'array', items: { type: 'string' } },
          is_anonymous: { type: 'boolean' },
          is_published: { type: 'boolean' },
          reported: { type: 'boolean' },
          order_id: { type: 'integer', nullable: true },
          created_at: { type: 'string', format: 'date-time', nullable: true },
          updated_at: { type: 'string', format: 'date-time', nullable: true },
          helpful_votes: { type: 'array', items: { $ref: '#/components/schemas/HelpfulVote' } },
        },
        required: ['id', 'product_id', 'user_id', 'rating', 'is_anonymous', 'is_published', 'reported', 'helpful_votes'],
      },
      HelpfulVote: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          rating_id: { type: 'integer' },
          user_id: { type: 'string', format: 'uuid' },
          is_helpful: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time', nullable: true },
        },
        required: ['id', 'rating_id', 'user_id', 'is_helpful'],
      },
      CreateRatingRequest: {
        type: 'object',
        properties: {
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          title: { type: 'string' },
          comment: { type: 'string' },
          images: { type: 'array', items: { type: 'string' } },
          is_anonymous: { type: 'boolean', default: false },
          order_id: { type: 'integer' },
        },
        required: ['rating'],
      },
      UpdateRatingRequest: {
        type: 'object',
        properties: {
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          title: { type: 'string' },
          comment: { type: 'string' },
          images: { type: 'array', items: { type: 'string' } },
          is_anonymous: { type: 'boolean' },
        },
      },
      ProductRatingsResponse: {
        type: 'object',
        properties: {
          ratings: { type: 'array', items: { $ref: '#/components/schemas/Rating' } },
          pagination: { $ref: '#/components/schemas/Pagination' },
          stats: {
            type: 'object',
            properties: {
              averageRating: { type: 'number' },
              totalRatings: { type: 'integer' },
            },
            required: ['averageRating', 'totalRatings'],
          },
        },
        required: ['ratings', 'pagination', 'stats'],
      },
      UserRatingsResponse: {
        type: 'object',
        properties: {
          ratings: { type: 'array', items: { $ref: '#/components/schemas/Rating' } },
          pagination: { $ref: '#/components/schemas/Pagination' },
        },
        required: ['ratings', 'pagination'],
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
        required: ['page', 'limit', 'total', 'totalPages'],
      },
    },
  },
} as const;
