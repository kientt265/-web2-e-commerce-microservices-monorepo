import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const port = process.env.PAYMENT_PORT || 3008;

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
app.get('/run', (req, res) => {
  res.send('Payment Service is running');
});
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(port, async () => {
  console.log(`Payment Service is running on port ${port}`);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down Payment Service...');
  await prisma.$disconnect();
  process.exit(0);
});