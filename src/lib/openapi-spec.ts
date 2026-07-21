export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Live QR Platform Public API',
    description: 'REST API documentation for programmatic creation, management, rotation, and analytics tracking of dynamic secure QR codes on the Live QR Platform.',
    version: '1.0.0',
  },
  servers: [
    {
      url: '/api',
      description: 'API Server',
    },
  ],
  paths: {
    '/qr': {
      get: {
        summary: 'List QR Codes',
        description: 'Returns a list of QR codes created by the user. ADMIN role retrieves all QR codes across the platform.',
        security: [{ ApiKeyAuth: [] }, { SessionAuth: [] }],
        responses: {
          '200': {
            description: 'A list of QR codes.',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/QRCode' },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        summary: 'Create a new QR Code',
        description: 'Registers a new dynamic secure QR Code. (Requires MANAGER or ADMIN privileges)',
        security: [{ ApiKeyAuth: [] }, { SessionAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateQRCodeInput' },
            },
          },
        },
        responses: {
          '201': {
            description: 'QR Code created successfully.',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/QRCode' },
                    {
                      type: 'object',
                      properties: {
                        currentToken: {
                          type: 'string',
                          description: 'The initial active 32-byte secure token.',
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/qr/{id}': {
      get: {
        summary: 'Get QR Code Details',
        description: 'Retrieves details of a specific QR code, including the current active token status.',
        security: [{ ApiKeyAuth: [] }, { SessionAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'The unique ID of the QR Code.',
          },
        ],
        responses: {
          '200': {
            description: 'Success.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/QRCodeDetails' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        summary: 'Update QR Code settings',
        description: 'Edits the configuration of an existing QR Code. Modifying target URL, expiration, or maximum uses triggers immediate token regeneration. (Requires MANAGER or ADMIN)',
        security: [{ ApiKeyAuth: [] }, { SessionAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateQRCodeInput' },
            },
          },
        },
        responses: {
          '200': {
            description: 'QR Code updated.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/QRCodeDetails' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        summary: 'Delete QR Code',
        description: 'Permanently deletes a QR code, cascade removing all tokens and scan history. Invalidates Redis cache. (Requires MANAGER or ADMIN)',
        security: [{ ApiKeyAuth: [] }, { SessionAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Successfully deleted.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/qr/{id}/regenerate': {
      post: {
        summary: 'Force immediate token rotation',
        description: 'Immediately invalidates the current active token and generates a new secure token for the specified QR code.',
        security: [{ ApiKeyAuth: [] }, { SessionAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Token rotated successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    token: { type: 'string' },
                    expiresAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/analytics/{id}': {
      get: {
        summary: 'Get QR Code Analytics',
        description: 'Returns aggregated scan metrics, browser/OS distributions, geolocation statistics, and timeline datasets for charting.',
        security: [{ ApiKeyAuth: [] }, { SessionAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'range',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['today', '7d', '30d', 'all'],
              default: '7d',
            },
            description: 'Time frame for aggregation calculations.',
          },
        ],
        responses: {
          '200': {
            description: 'Success.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AnalyticsReport' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
        description: 'Provide API key in the format: Bearer lqr_live_...',
      },
      SessionAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'next-auth.session-token',
        description: 'Browser NextAuth session cookie authentication.',
      },
    },
    schemas: {
      QRCode: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          destinationUrl: { type: 'string', format: 'uri' },
          expirationSeconds: { type: 'integer' },
          autoRefresh: { type: 'boolean' },
          maxUses: { type: 'integer', nullable: true },
          description: { type: 'string', nullable: true },
          logoUrl: { type: 'string', format: 'uri', nullable: true },
          fgColor: { type: 'string' },
          bgColor: { type: 'string' },
          dotType: { type: 'string', enum: ['square', 'rounded', 'dots'] },
          frameType: { type: 'string', enum: ['none', 'standard', 'label'] },
          labelText: { type: 'string', nullable: true },
          errorCorrection: { type: 'string', enum: ['L', 'M', 'Q', 'H'] },
          userId: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateQRCodeInput: {
        type: 'object',
        required: ['name', 'destinationUrl'],
        properties: {
          name: { type: 'string' },
          destinationUrl: { type: 'string', format: 'uri' },
          expirationSeconds: { type: 'integer', default: 60 },
          autoRefresh: { type: 'boolean', default: true },
          maxUses: { type: 'integer', nullable: true },
          description: { type: 'string' },
          logoUrl: { type: 'string', format: 'uri' },
          fgColor: { type: 'string', default: '#000000' },
          bgColor: { type: 'string', default: '#ffffff' },
          dotType: { type: 'string', enum: ['square', 'rounded', 'dots'], default: 'square' },
          frameType: { type: 'string', enum: ['none', 'standard', 'label'], default: 'none' },
          labelText: { type: 'string' },
          errorCorrection: { type: 'string', enum: ['L', 'M', 'Q', 'H'], default: 'Q' },
        },
      },
      UpdateQRCodeInput: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          destinationUrl: { type: 'string', format: 'uri' },
          expirationSeconds: { type: 'integer' },
          autoRefresh: { type: 'boolean' },
          maxUses: { type: 'integer', nullable: true },
          description: { type: 'string' },
          logoUrl: { type: 'string', format: 'uri' },
          fgColor: { type: 'string' },
          bgColor: { type: 'string' },
          dotType: { type: 'string', enum: ['square', 'rounded', 'dots'] },
          frameType: { type: 'string', enum: ['none', 'standard', 'label'] },
          labelText: { type: 'string' },
          errorCorrection: { type: 'string', enum: ['L', 'M', 'Q', 'H'] },
        },
      },
      QRCodeDetails: {
        allOf: [
          { $ref: '#/components/schemas/QRCode' },
          {
            type: 'object',
            properties: {
              scanCount: { type: 'integer' },
              currentToken: { type: 'string', nullable: true },
              tokenExpiresAt: { type: 'string', format: 'date-time', nullable: true },
            },
          },
        ],
      },
      AnalyticsReport: {
        type: 'object',
        properties: {
          qrName: { type: 'string' },
          destinationUrl: { type: 'string' },
          totalScans: { type: 'integer' },
          uniqueScans: { type: 'integer' },
          browsers: {
            type: 'array',
            items: {
              type: 'object',
              properties: { name: { type: 'string' }, count: { type: 'integer' } },
            },
          },
          osList: {
            type: 'array',
            items: {
              type: 'object',
              properties: { name: { type: 'string' }, count: { type: 'integer' } },
            },
          },
          devices: {
            type: 'array',
            items: {
              type: 'object',
              properties: { name: { type: 'string' }, count: { type: 'integer' } },
            },
          },
          countries: {
            type: 'array',
            items: {
              type: 'object',
              properties: { name: { type: 'string' }, count: { type: 'integer' } },
            },
          },
          cities: {
            type: 'array',
            items: {
              type: 'object',
              properties: { name: { type: 'string' }, count: { type: 'integer' } },
            },
          },
          timeline: {
            type: 'array',
            items: {
              type: 'object',
              properties: { date: { type: 'string' }, scans: { type: 'integer' } },
            },
          },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Authentication token or API key is missing or invalid.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { error: { type: 'string', example: 'Unauthorized' } },
            },
          },
        },
      },
      Forbidden: {
        description: 'User possesses session but lacks required permissions/roles.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { error: { type: 'string', example: 'Forbidden' } },
            },
          },
        },
      },
      NotFound: {
        description: 'Specified QR code does not exist.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { error: { type: 'string', example: 'QR Code not found' } },
            },
          },
        },
      },
      ValidationError: {
        description: 'Input parameter schema validation failed.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string', example: 'Validation Error' },
                details: { type: 'object' },
              },
            },
          },
        },
      },
    },
  },
};
