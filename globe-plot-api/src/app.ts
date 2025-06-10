import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import rateLimit from 'express-rate-limit';
import { documentRoutes } from './routes/documentRoutes';
import { geocodeRoutes } from './routes/geocodeRoutes';
import { countryRoutes } from './routes/countryRoutes';
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

// Rate limiting configuration
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const documentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // Limit each IP to 30 document uploads per hour
  message: 'Too many document uploads, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const geocodeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200, // Limit each IP to 200 geocoding requests per hour
  message: 'Too many geocoding requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'https://globeplot.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes with specific rate limiting
app.use('/api/documents', documentLimiter, documentRoutes);
app.use('/api/geocode', geocodeLimiter, geocodeRoutes);
app.use('/api/countries', countryRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
  console.log('Rate limiting enabled:');
  console.log('  - General: 300 requests per 15 minutes');
  console.log('  - Documents: 10 uploads per hour');
  console.log('  - Geocoding: 200 requests per hour');
}); 