import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Vedic eBook Library API',
      version: '1.0.0',
      description: 'A comprehensive API for managing Vedic texts with authentication, file storage, and user management',
      contact: {
        name: 'Vedic Library Team',
        email: 'support@vedicebooks.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.vedicebooks.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT Bearer token'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID'
            },
            username: {
              type: 'string',
              description: 'Unique username'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            role: {
              type: 'string',
              enum: ['admin', 'user', 'guest'],
              description: 'User role'
            },
            profile: {
              type: 'object',
              properties: {
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                preferences: {
                  type: 'object',
                  properties: {
                    defaultLanguage: {
                      type: 'string',
                      enum: ['english', 'telugu', 'sanskrit']
                    },
                    theme: {
                      type: 'string',
                      enum: ['light', 'dark', 'auto']
                    },
                    booksPerPage: { type: 'number' }
                  }
                }
              }
            },
            isActive: {
              type: 'boolean',
              description: 'Account status'
            },
            emailVerified: {
              type: 'boolean',
              description: 'Email verification status'
            }
          }
        },
        Book: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Book ID'
            },
            title: {
              type: 'string',
              description: 'Book title'
            },
            author: {
              type: 'string',
              description: 'Book author'
            },
            description: {
              type: 'string',
              description: 'Book description'
            },
            language: {
              type: 'string',
              enum: ['english', 'telugu', 'sanskrit'],
              description: 'Book language'
            },
            category: {
              type: 'string',
              enum: [
                'Srila Prabhupada',
                'Acaryas',
                'Great Vaishnavas',
                'Vaishnavas of ISKCON',
                'Contemporary vaishnavas',
                'Vedic Sages',
                'Other authors',
                'Sastras',
                'Other'
              ],
              description: 'Book category'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Book tags'
            },
            fileInfo: {
              type: 'object',
              properties: {
                originalName: { type: 'string' },
                filename: { type: 'string' },
                mimeType: { type: 'string' },
                fileSize: { type: 'number' },
                fileExtension: { type: 'string' }
              }
            },
            metadata: {
              type: 'object',
              properties: {
                totalPages: { type: 'number' },
                isbn: { type: 'string' },
                publishedDate: { type: 'string', format: 'date' },
                publisher: { type: 'string' },
                edition: { type: 'string' }
              }
            },
            statistics: {
              type: 'object',
              properties: {
                downloadCount: { type: 'number' },
                viewCount: { type: 'number' },
                averageRating: { type: 'number' },
                totalRatings: { type: 'number' }
              }
            }
          }
        },
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              description: 'JWT access token'
            },
            refreshToken: {
              type: 'string',
              description: 'JWT refresh token'
            },
            tokenType: {
              type: 'string',
              default: 'Bearer'
            },
            expiresIn: {
              type: 'string',
              description: 'Token expiration time'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              default: false
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            error: {
              type: 'string',
              description: 'Detailed error (development only)'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              default: true
            },
            message: {
              type: 'string',
              description: 'Success message'
            },
            data: {
              type: 'object',
              description: 'Response data'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Books',
        description: 'Book management and access endpoints'
      },
      {
        name: 'Users',
        description: 'User profile and activity endpoints'
      },
      {
        name: 'Admin',
        description: 'Administrative endpoints (admin only)'
      },
      {
        name: 'Health',
        description: 'System health check endpoints'
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'], // Path to the API files
};

const specs = swaggerJSDoc(options);

export { specs, swaggerUi };