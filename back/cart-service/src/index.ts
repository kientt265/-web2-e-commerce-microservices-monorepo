import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';
import cartRoutes from './routes/cartRoutes';
import { openApiSpec } from './openapi';

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const port = process.env.CART_PORT || 3004;

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
    <title>Cart Service API Docs</title>
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

app.use('/', cartRoutes);

app.get('/run', (req, res) => {
  res.send('Cart Service is running');
});
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(port, async () => {
  console.log(`Cart Service is running on port ${port}`);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down Cart Service...');
  await prisma.$disconnect();
  process.exit(0);
});