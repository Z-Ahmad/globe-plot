import express from 'express';
import { handleAgentChat, handleGenerateItinerary, handleGenerateItineraryStream } from '../controllers/agentController';

const router = express.Router();

/**
 * @swagger
 * /api/agent/chat:
 *   post:
 *     summary: Agentic AI chat with tool calling
 *     description: Multi-turn conversation that can create, edit, and delete trip events
 *     tags: [AI Agent]
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
 *               - messages
 *             properties:
 *               tripId:
 *                 type: string
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
 *                     content:
 *                       type: string
 *     responses:
 *       200:
 *         description: Agent response with optional proposed actions
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: No access to trip
 *       404:
 *         description: Trip not found
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.post('/chat', handleAgentChat);

/**
 * @swagger
 * /api/agent/generate-itinerary:
 *   post:
 *     summary: Generate placeholder itinerary from description
 *     description: AI generates a set of placeholder events based on a natural language trip description
 *     tags: [AI Agent]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tripName
 *               - startDate
 *               - endDate
 *               - tripDescription
 *             properties:
 *               tripName:
 *                 type: string
 *               startDate:
 *                 type: string
 *               endDate:
 *                 type: string
 *               tripDescription:
 *                 type: string
 *                 maxLength: 2000
 *     responses:
 *       200:
 *         description: Generated itinerary events
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.post('/generate-itinerary', handleGenerateItinerary);

// SSE streaming version
router.post('/generate-itinerary-stream', handleGenerateItineraryStream);

export { router as agentRoutes };
