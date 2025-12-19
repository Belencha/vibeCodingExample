import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Budget API Documentation',
      version: '1.0.0',
      description: 'API documentation for the Budget Management System',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        BudgetItem: {
          type: 'object',
          required: ['year', 'category', 'type', 'amount', 'description'],
          properties: {
            _id: {
              type: 'string',
              description: 'Unique identifier for the budget item',
              example: '507f1f77bcf86cd799439011',
            },
            year: {
              type: 'integer',
              description: 'Year of the budget item',
              example: 2024,
            },
            category: {
              type: 'string',
              enum: ['income', 'spending'],
              description: 'Category of the budget item',
              example: 'income',
            },
            type: {
              type: 'string',
              description: 'Type of income or spending',
              example: 'personal_income_tax',
            },
            amount: {
              type: 'number',
              description: 'Amount in euros',
              example: 95000000000,
            },
            description: {
              type: 'string',
              description: 'Description of the budget item',
              example: 'Personal Income Tax (IRPF)',
            },
            source: {
              type: 'string',
              description: 'URL or source of the data',
              example: 'https://example.com/data',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        BudgetSummary: {
          type: 'object',
          properties: {
            year: {
              type: 'integer',
              example: 2024,
            },
            income: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      _id: {
                        type: 'string',
                        example: 'personal_income_tax',
                      },
                      total: {
                        type: 'number',
                        example: 95000000000,
                      },
                    },
                  },
                },
                total: {
                  type: 'number',
                  example: 416000000000,
                },
              },
            },
            spending: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      _id: {
                        type: 'string',
                        example: 'pensions',
                      },
                      total: {
                        type: 'number',
                        example: 140000000000,
                      },
                    },
                  },
                },
                total: {
                  type: 'number',
                  example: 467000000000,
                },
              },
            },
            balance: {
              type: 'number',
              description: 'Income minus spending',
              example: -51000000000,
            },
            dataSource: {
              type: 'string',
              enum: ['real', 'hardcoded'],
              description: 'Source of the data',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            details: {
              type: 'string',
              description: 'Additional error details',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/index.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;

