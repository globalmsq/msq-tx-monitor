import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { config } from '../config';

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'MSQ Transaction Monitor API',
    version: '1.0.0',
    description: 'REST API for blockchain transaction monitoring and analysis on the Polygon network',
    contact: {
      name: 'MSQ Team',
      email: 'support@msq.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: `http://localhost:${config.server.port}/api/${config.api.version}`,
      description: 'Development server'
    },
    {
      url: `https://api.msq.com/api/${config.api.version}`,
      description: 'Production server'
    }
  ],
  components: {
    schemas: {
      Transaction: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Transaction hash' },
          block_number: { type: 'number', description: 'Block number' },
          timestamp: { type: 'string', format: 'date-time', description: 'Transaction timestamp' },
          from_address: { type: 'string', description: 'Sender address' },
          to_address: { type: 'string', description: 'Recipient address' },
          amount: { type: 'string', description: 'Transaction amount in wei' },
          token_symbol: { type: 'string', enum: ['MSQ', 'SUT', 'KWT', 'P2UC'], description: 'Token symbol' },
          gas_used: { type: 'number', description: 'Gas used' },
          gas_price: { type: 'string', description: 'Gas price in wei' },
          status: { type: 'string', enum: ['success', 'failed'], description: 'Transaction status' },
          anomaly_score: { type: 'number', minimum: 0, maximum: 1, description: 'Anomaly score (0-1)' }
        },
        required: ['id', 'block_number', 'timestamp', 'from_address', 'to_address', 'amount', 'token_symbol']
      },
      AddressRanking: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Ethereum address' },
          total_volume: { type: 'string', description: 'Total transaction volume in wei' },
          transaction_count: { type: 'number', description: 'Number of transactions' },
          first_seen: { type: 'string', format: 'date-time', description: 'First transaction date' },
          last_seen: { type: 'string', format: 'date-time', description: 'Last transaction date' },
          rank: { type: 'number', description: 'Ranking position' }
        }
      },
      AddressSearch: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Ethereum address' },
          transaction_count: { type: 'number', description: 'Number of transactions' },
          total_volume: { type: 'string', description: 'Total transaction volume in wei' },
          last_activity: { type: 'string', format: 'date-time', description: 'Last activity date' }
        }
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'number', description: 'HTTP status code' },
              message: { type: 'string', description: 'Error message' },
              details: { type: 'object', description: 'Additional error details' },
              timestamp: { type: 'string', format: 'date-time', description: 'Error timestamp' }
            }
          }
        }
      },
      HealthCheck: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['healthy', 'unhealthy'], description: 'Overall health status' },
          timestamp: { type: 'string', format: 'date-time', description: 'Health check timestamp' },
          uptime: { type: 'number', description: 'Server uptime in seconds' },
          version: { type: 'string', description: 'API version' },
          services: {
            type: 'object',
            properties: {
              database: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['connected', 'disconnected'], description: 'Database connection status' },
                  responseTime: { type: 'number', description: 'Database response time in ms' }
                }
              },
              redis: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['connected', 'disconnected'], description: 'Redis connection status' },
                  responseTime: { type: 'number', description: 'Redis response time in ms' }
                }
              }
            }
          }
        }
      }
    },
    parameters: {
      TokenFilter: {
        name: 'token',
        in: 'query',
        description: 'Filter by token symbol',
        schema: {
          type: 'string',
          enum: ['MSQ', 'SUT', 'KWT', 'P2UC']
        }
      },
      TimePeriodFilter: {
        name: 'time_period',
        in: 'query',
        description: 'Time period filter',
        schema: {
          type: 'string',
          enum: ['day', 'week', 'month', 'all'],
          default: 'all'
        }
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        description: 'Number of results to return',
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 20
        }
      },
      OffsetParam: {
        name: 'offset',
        in: 'query',
        description: 'Number of results to skip',
        schema: {
          type: 'integer',
          minimum: 0,
          default: 0
        }
      }
    }
  },
  tags: [
    {
      name: 'Transactions',
      description: 'Blockchain transaction operations'
    },
    {
      name: 'Addresses',
      description: 'Address analytics and rankings'
    },
    {
      name: 'Health',
      description: 'System health and monitoring'
    }
  ]
};

// Options for the swagger docs
const options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts'
  ]
};

// Initialize swagger-jsdoc
export const swaggerSpec = swaggerJSDoc(options);

// Setup Swagger middleware
export const setupSwagger = (app: Express): void => {
  // Swagger page
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'MSQ Transaction Monitor API Documentation'
  }));

  // Swagger JSON
  app.get('/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};