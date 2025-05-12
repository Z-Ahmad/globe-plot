import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { documentRoutes } from './routes/documentRoutes';
import { geocodeRoutes } from './routes/geocodeRoutes';
import { swaggerSpec } from './config/swagger';

// Load environment variables
const result = dotenv.config();
if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('Environment loaded successfully');
}

console.log('Environment variables after loading:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY ? '***' : 'undefined',
  MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN ? '***' : 'undefined'
});

const app = express();

// Middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/documents', documentRoutes);
app.use('/api/geocode', geocodeRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
}); 