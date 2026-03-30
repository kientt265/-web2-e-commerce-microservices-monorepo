import express from 'express';
import cors from 'cors';
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';
import ratingRoutes from './routes/ratingRoutes';
import { openApiSpec } from './openapi';
import { prisma } from './lib/prisma';
import { connectConsumer, disconnectConsumer, subscribeToDeliveryOutbox } from './config/kafka';
import { DeliveryOutboxController } from './controllers/deliveryOutboxController';
import { DeliveryOutboxConsumer } from './consumers/deliveryOutboxConsumer';
dotenv.config();
//test
const app = express();
const port = process.env.RATING_PORT || 3007;

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
    <title>Rating Service API Docs</title>
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

app.use('/', ratingRoutes);
app.get('/run', (req, res) => {
  res.send('Rating Service is running');
});
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(port, async () => {
  console.log(`Rating Service is running on port ${port}`);

  try {
    await connectConsumer();
    await subscribeToDeliveryOutbox();
    const deliveryOutboxController = new DeliveryOutboxController();
    await new DeliveryOutboxConsumer(deliveryOutboxController).start();
    console.log('[kafka] Delivery outbox consumer started');
  } catch (err) {
    console.error('[kafka] Failed to start delivery outbox consumer:', err);
  }
});

process.on('SIGTERM', async () => {
  console.log('Shutting down Rating Service...');
  try {
    await disconnectConsumer();
  } catch (e) {
    console.error('[kafka] disconnect error:', e);
  }
  await prisma.$disconnect();
  process.exit(0);
});