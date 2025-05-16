import express from 'express';
import { 
  getAllCountries, 
  getCountryByCode, 
  getCitiesByCountry, 
  searchCountries 
} from '../controllers/countryController';

const router = express.Router();

/**
 * @swagger
 * /api/countries:
 *   get:
 *     tags:
 *       - Country
 *     summary: Get all countries
 *     description: Retrieve a list of all countries with ISO codes and flags
 *     responses:
 *       200:
 *         description: A list of countries
 */
router.get('/', getAllCountries);

/**
 * @swagger
 * /api/countries/search/{query}:
 *   get:
 *     tags:
 *       - Country
 *     summary: Search countries
 *     description: Search for countries by name (for autocomplete)
 *     parameters:
 *       - in: path
 *         name: query
 *         required: true
 *         description: Search query
 *     responses:
 *       200:
 *         description: List of matching countries
 */
router.get('/search/:query', searchCountries);

/**
 * @swagger
 * /api/countries/{countryCode}:
 *   get:
 *     tags:
 *       - Country
 *     summary: Get a specific country
 *     description: Retrieve details for a specific country by ISO code
 *     parameters:
 *       - in: path
 *         name: countryCode
 *         required: true
 *         description: ISO 3166-1 alpha-2 country code
 *     responses:
 *       200:
 *         description: Country details
 *       404:
 *         description: Country not found
 */
router.get('/:countryCode', getCountryByCode);

/**
 * @swagger
 * /api/countries/{countryCode}/cities:
 *   get:
 *     tags:
 *       - Country
 *     summary: Get cities for a country
 *     description: Retrieve all cities for a specific country
 *     parameters:
 *       - in: path
 *         name: countryCode
 *         required: true
 *         description: ISO 3166-1 alpha-2 country code
 *     responses:
 *       200:
 *         description: List of cities
 */
router.get('/:countryCode/cities', getCitiesByCountry);

export const countryRoutes = router; 