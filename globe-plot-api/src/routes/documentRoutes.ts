import { documentController } from '../controllers/documentController';
import express from 'express';

import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * /api/documents/upload:
 *   post:
 *     summary: Upload a document for processing
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