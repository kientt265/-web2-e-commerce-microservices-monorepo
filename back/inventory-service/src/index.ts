import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';
import inventoryRoutes from './routes/inventoryRoutes';
import { openApiSpec } from './openapi';
import { connectConsumer, disconnectConsumer, subscribeToOrderEvents } from './config/kafka';
import { InventoryService } from './services/inventoryService';
import { KafkaConsumerService } from './services/kafkaConsumerService';

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const port = process.env.INVENTORY_PORT || 3005;

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

app.get('/openapi.json', (_req, res) => {
  res.status(200).json(openApiSpec);
});

app.get('/docs', (_req, res) => {
  res.status(200).type('html').send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Inventory Service API Docs</title>
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

app.use('/', inventoryRoutes);

app.get('/run', (req, res) => {
  res.send('Inventory Service is running');
});
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize Kafka consumer service
let kafkaConsumerService: KafkaConsumerService;

app.listen(port, async () => {
  console.log(`Inventory Service is running on port ${port}`);
  
  // Initialize and start Kafka consumer
  try {
    await connectConsumer();
    await subscribeToOrderEvents();
    
    const inventoryService = new InventoryService(prisma);
    kafkaConsumerService = new KafkaConsumerService(inventoryService);
    
    await kafkaConsumerService.startConsumer();
    console.log('Kafka consumer service started successfully');
  } catch (error) {
    console.error('Failed to start Kafka consumer service:', error);
  }
});

process.on('SIGTERM', async () => {
  console.log('Shutting down Inventory Service...');
  
  if (kafkaConsumerService) {
    await kafkaConsumerService.stopConsumer();
  }
  
  await disconnectConsumer();
  await prisma.$disconnect();
  process.exit(0);
});