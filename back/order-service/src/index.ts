import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';
import { connectProducer, disconnectProducer } from './config/kafka';
import orderRoutes from './routes/orderRoutes';
import { openApiSpec } from './openapi';

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const port = process.env.ORDER_PORT || 3003;

const allowedOrigins =
  process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) ??
  ['http://localhost:5173'];

const corsOptions: cors.CorsOptions = {
  origin: allowedOrigins,
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

// OpenAPI documentation endpoints
app.get('/openapi.json', (_req, res) => {
  res.status(200).json(openApiSpec);
});

app.get('/docs', (_req, res) => {
  res.status(200).type('html').send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Order Service API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; background: #0b1020; }
      #swagger-ui { background: white; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        persistAuthorization: true
      });
    </script>
  </body>
</html>`);
});

// API routes
app.use('/api/orders', orderRoutes);

app.get('/run', (req, res) => {
  res.send('Order Service is running');
});
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(port, async () => {
  console.log(`Order Service is running on port ${port}`);
  
  // Connect to Kafka producer
  try {
    await connectProducer();
  } catch (error) {
    console.error('Failed to connect Kafka producer:', error);
  }
});

process.on('SIGTERM', async () => {
  console.log('Shutting down Order Service...');
  await disconnectProducer();
  await prisma.$disconnect();
  process.exit(0);
});