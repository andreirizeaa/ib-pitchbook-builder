import express from 'express';
import https from 'https';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import env from './config/env';
import { errorHandler } from './middlewares/error-handler';
import pitchbooksRoutes from './routes/pitchbooks.routes';
import templatesRoutes from './routes/templates.routes';
import companiesRoutes from './routes/companies.routes';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: [env.CORS_ORIGIN, 'https://localhost:8003'],
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Swagger docs
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Pitch Deck Builder API',
      version: '1.0.0',
      description: 'API for generating investment banking pitch books with AI',
    },
    servers: [{ url: `http://localhost:${env.PORT}` }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/pitchbooks', pitchbooksRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/companies', companiesRoutes);

// Error handler
app.use(errorHandler);

// Start server (HTTP + HTTPS for Office Add-in mixed-content)
app.listen(env.PORT, () => {
  console.log(`🚀 Service running on http://localhost:${env.PORT}`);
  console.log(`📚 Swagger docs at http://localhost:${env.PORT}/api-docs`);
});

const certDir = path.join(process.env.HOME || '', '.office-addin-dev-certs');
const keyPath = path.join(certDir, 'localhost.key');
const certPath = path.join(certDir, 'localhost.crt');
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  const httpsPort = Number(env.PORT) + 10;
  https.createServer({ key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }, app)
    .listen(httpsPort, () => {
      console.log(`🔒 HTTPS service running on https://localhost:${httpsPort}`);
    });
}

export default app;
