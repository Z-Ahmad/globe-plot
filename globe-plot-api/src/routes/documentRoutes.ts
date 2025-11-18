import { documentController } from '../controllers/documentController';
import express from 'express';

import multer from 'multer';

const router = express.Router();

// Configure multer with file type validation
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'message/rfc822',
      'text/plain',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Supported types: PDF, email files, and images (JPEG, PNG, GIF, WebP).`));
    }
  }
});

/**
 * @swagger
 * /api/documents/upload:
 *   post:
 *     summary: Upload a document or image for processing
 *     description: Supports PDF files, email files (.eml), and images (JPEG, PNG, GIF, WebP). Images are processed using Mistral AI's vision model for text extraction.
 *     tags: [Documents]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *                 description: PDF, email file, or image file (JPEG, PNG, GIF, WebP) up to 10MB
 *     responses:
 *       200:
 *         description: Document processed successfully
 *       400:
 *         description: No file uploaded
 *       500:
 *         description: Server error
 */
router.post('/upload', upload.single('document'), documentController.uploadDocument);

/**
 * @swagger
 * /api/documents/parse:
 *   post:
 *     summary: Parse text content with OpenAI
 *     tags: [Documents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Text parsed successfully
 *       400:
 *         description: No text provided
 *       500:
 *         description: Server error
 */
// router.post('/parse', documentController.parseDocument);

/**
 * @swagger
 * /api/documents/parse-mistral:
 *   post:
 *     summary: Parse text content with Mistral AI
 *     tags: [Documents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Text parsed successfully
 *       400:
 *         description: No text provided
 *       500:
 *         description: Server error
 */
router.post('/parse-mistral', documentController.parseMistral);

export { router as documentRoutes }; 