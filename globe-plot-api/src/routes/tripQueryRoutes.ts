import express from 'express';
import { handleTripQuery } from '../controllers/tripQueryController';

const router = express.Router();

/**
 * @swagger
 * /api/trip-query:
 *   post:
 *     summary: Query trip using AI
 *     description: Ask natural language questions about a trip and get AI-powered answers based on structured itinerary data
 *     tags: [AI Query]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tripId
 *               - question
 *             properties:
 *               tripId:
 *                 type: string
 *                 description: The ID of the trip to query
 *               question:
 *                 type: string
 *                 description: Natural language question about the trip
 *                 maxLength: 500
 *                 example: "How many countries am I visiting?"
 *     responses:
 *       200:
 *         description: Query answered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 answer:
 *                   type: string
 *                   description: The AI-generated answer
 *                 tokensUsed:
 *                   type: number
 *                   description: Total tokens used
 *                 promptTokens:
 *                   type: number
 *                   description: Input tokens used
 *                 completionTokens:
 *                   type: number
 *                   description: Output tokens used
 *                 estimatedCostUsd:
 *                   type: number
 *                   description: Estimated cost in USD
 *                 latencyMs:
 *                   type: number
 *                   description: Response time in milliseconds
 *                 cached:
 *                   type: boolean
 *                   description: Whether result was served from cache
 *                 deterministic:
 *                   type: boolean
 *                   description: Whether result was computed deterministically
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: No access to trip
 *       404:
 *         description: Trip not found
 *       413:
 *         description: Trip too large for AI analysis
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.post('/', handleTripQuery);

export { router as tripQueryRoutes };
