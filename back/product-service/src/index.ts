import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';
import productRoutes from './routes/productRoutes';
import { openApiSpec } from './openapi';
import { connectConsumer, subscribeToInventoryEvents, disconnectConsumer } from './config/kafka';
import { KafkaConsumerService } from './services/kafkaConsumerService';
dotenv.config();

const prisma = new PrismaClient();
const app = express();
const port = process.env.PRODUCT_PORT || 3001;

const allowedOrigins =
  process.env.CORS_ORIGINS?.split(',').map((o: string) => o.trim()).filter(Boolean) ??
  ['http://localhost:5173'];

const corsOptions: cors.CorsOptions = {
  origin: allowedOrigins,
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

app.get('/openapi.json', (_req, res) => {
  res.status(200).json(openApiSpec);
});

app.get('/docs', (_req, res) => {
  res.status(200).type('html').send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Product Service API Docs</title>
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

app.use('/', productRoutes);

app.get('/run', (_req, res) => {
  res.send('Product Service is running');
});
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize Kafka Consumer
let kafkaConsumerService: KafkaConsumerService;

const initKafkaConsumer = async () => {
  try {
    await connectConsumer();
    await subscribeToInventoryEvents();
    
    kafkaConsumerService = new KafkaConsumerService(prisma);
    await kafkaConsumerService.startConsumer();
    
    console.log('✅ Kafka consumer initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Kafka consumer:', error);
    // Don't throw here - allow the service to start even if Kafka fails
    // In production, you might want to handle this differently
  }
};

app.listen(port, async () => {
  console.log(`🚀 Product Service is running on port ${port}`);
  
  // Initialize Kafka after server starts
  await initKafkaConsumer();
});

process.on('SIGTERM', async () => {
  console.log('Shutting down Product Service...');
  
  if (kafkaConsumerService) {
    await kafkaConsumerService.stopConsumer();
  }
  await disconnectConsumer();
  await prisma.$disconnect();
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down Product Service (SIGINT)...');
  
  if (kafkaConsumerService) {
    await kafkaConsumerService.stopConsumer();
  }
  await disconnectConsumer();
  await prisma.$disconnect();
  
  process.exit(0);
});