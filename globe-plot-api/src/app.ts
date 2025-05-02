import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { documentRoutes } from './routes/documentRoutes';
import { swaggerSpec } from './config/swagger';
import path from 'path';
import fs from 'fs';

// Debug environment loading
const envPath = path.resolve(process.cwd(), '.env');
console.log('Current working directory:', process.cwd());
console.log('Environment file path:', envPath);
console.log('Environment file exists:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  console.log('Environment file contents:', fs.readFileSync(envPath, 'utf8'));
}

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
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '***' : 'undefined'
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/documents', documentRoutes);

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