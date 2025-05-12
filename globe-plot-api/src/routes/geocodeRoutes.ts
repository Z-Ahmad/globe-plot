import express from 'express';
import { geocodeLocationController, batchGeocodeController } from '../controllers/geocodeController';

export const geocodeRoutes = express.Router();

/**
 * @swagger
 * /api/geocode:
 *   post:
 *     summary: Geocode a location
 *     description: Converts a location (address, city, country) to geographic coordinates
 *     tags: [Geocoding]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the location (e.g., street address, venue name)
 *               city:
 *                 type: string
 *                 description: The city of the location
 *               country:
 *                 type: string
 *                 description: The country of the location
 *     responses:
 *       200:
 *         description: Successfully geocoded location
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lat:
 *                   type: number
 *                   description: Latitude of the location
 *                 lng:
 *                   type: number
 *                   description: Longitude of the location
 *       400:
 *         description: Bad request - insufficient location data
 *       500:
 *         description: Server error
 */
geocodeRoutes.post('/', geocodeLocationController);

/**
 * @swagger
 * /api/geocode/batch:
 *   post:
 *     summary: Batch geocode multiple locations
 *     description: Converts multiple locations to geographic coordinates in a single request
 *     tags: [Geocoding]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: A unique identifier for the location
 *                 name:
 *                   type: string
 *                   description: The name of the location (e.g., street address, venue name)
 *                 city:
 *                   type: string
 *                   description: The city of the location
 *                 country:
 *                   type: string
 *                   description: The country of the location
 *     responses:
 *       200:
 *         description: Successfully geocoded locations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *       400:
 *         description: Bad request - invalid input data
 *       500:
 *         description: Server error
 */
geocodeRoutes.post('/batch', batchGeocodeController); 