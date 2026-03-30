export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Payment Service API',
    version: '1.0.0',
    description: 'Payments APIs: VNPay return/IPN and internal payment webhook for testing.',
  },
  servers: [{ url: '/' }],
  tags: [{ name: 'Health' }, { name: 'Payments' }, { name: 'VNPay' }],
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
                  properties: { message: { type: 'string' } },
                  required: ['message'],
                },
              },
            },
          },
        },
      },
    },
    '/api/payments/webhook': {
      post: {
        tags: ['Payments'],
        summary: 'Receive internal payment status webhook',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WebhookPaymentRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Webhook processed successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WebhookPaymentResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/api/payments/webhook/test': {
      post: {
        tags: ['Payments'],
        summary: 'Test webhook endpoint (for development/testing)',
        responses: {
          '200': {
            description: 'Test webhook processed successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WebhookPaymentRequestEnvelope' },
              },
            },
          },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/api/payments/vnpay-return': {
      get: {
        tags: ['VNPay'],
        summary: 'VNPay return URL (UI feedback)',
        description:
          'VNPay redirects user to this URL after payment. Business logic is handled via IPN.',
        parameters: [
          {
            name: 'query',
            in: 'query',
            required: false,
            schema: { type: 'object', additionalProperties: true },
          },
        ],
        responses: {
          '200': { description: 'Handled successfully' },
          '400': { $ref: '#/components/responses/BadRequest' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/api/payments/vnpay-ipn': {
      get: {
        tags: ['VNPay'],
        summary: 'VNPay IPN endpoint (verify + update payment status)',
        description: 'VNPay server-to-server call. Must be reachable from VNPay.',
        parameters: [
          {
            name: 'query',
            in: 'query',
            required: false,
            schema: { type: 'object', additionalProperties: true },
          },
        ],
        responses: {
          '200': { description: 'VNPay expects a JSON response (IpnSuccess or error codes)' },
          '400': { $ref: '#/components/responses/BadRequest' },
          '500': { $ref: '#/components/responses/InternalServerError' },
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
              properties: { error: { type: 'string' }, message: { type: 'string' } },
              required: ['error'],
            },
          },
        },
      },
      InternalServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { error: { type: 'string' }, message: { type: 'string' } },
              required: ['error'],
            },
          },
        },
      },
    },
    schemas: {
      WebhookPaymentRequest: {
        type: 'object',
        properties: {
          orderId: { type: 'string', example: 'order_123456' },
          status: { type: 'string', enum: ['SUCCESS', 'FAILED'], example: 'SUCCESS' },
          paymentData: { type: 'object', description: 'Payment gateway response data' },
          timestamp: { type: 'string', format: 'date-time', example: '2026-03-19T12:00:00.000Z' },
        },
        required: ['orderId', 'status', 'timestamp'],
      },
      WebhookPaymentResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              orderId: { type: 'string' },
              status: { type: 'string' },
              processedAt: { type: 'string', format: 'date-time' },
            },
            required: ['orderId', 'status', 'processedAt'],
          },
        },
        required: ['success', 'message', 'data'],
      },
      WebhookPaymentRequestEnvelope: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: { $ref: '#/components/schemas/WebhookPaymentRequest' },
        },
        required: ['success', 'message', 'data'],
      },
    },
  },
} as const;

