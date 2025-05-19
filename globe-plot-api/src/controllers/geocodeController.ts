import { Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { Country } from 'country-state-city';

// Load environment variables
dotenv.config();

const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

/**
 * Converts a country name to its ISO 3166-1 alpha-2 code
 * @param country Country name or code
 * @returns ISO 3166-1 alpha-2 code or undefined if not found
 */
const getCountryCode = (country?: string): string | undefined => {
  if (!country) return undefined;
  
  // If it's already a 2-letter code, return it
  if (country.length === 2 && country === country.toUpperCase()) {
    console.log(`Country code already in ISO format: ${country}`);
    return country;
  }
  
  try {
    // Log the country name being looked up
    console.log(`Looking up country code for: "${country}"`);
    
    // Check special cases first
    const specialCases: Record<string, string> = {
      'vatican city': 'VA',
      'vatican': 'VA',
      'holy see': 'VA',
      'vatican city state': 'VA',
      'vatican city state (holy see)': 'VA',
      'palestine': 'PS',
      'east timor': 'TL',
      'timor-leste': 'TL'
    };
    
    const normalized = country.toLowerCase().trim();
    if (specialCases[normalized]) {
      console.log(`Using special case mapping for ${country}: ${specialCases[normalized]}`);
      return specialCases[normalized];
    }
    
    // If no special case match, try the lookup using country-state-city
    const result = Country.getAllCountries().find(c => 
      c.name.toLowerCase() === normalized || 
      c.isoCode.toLowerCase() === normalized
    );
    
    if (result?.isoCode) {
      console.log(`Found country code for ${country}: ${result.isoCode}`);
      return result.isoCode;
    } else {
      console.warn(`No country code found for: "${country}"`);
      return undefined;
    }
  } catch (error) {
    console.error('Error converting country name to code:', error);
    return undefined;
  }
};

/**
 * Controller to geocode a single location using Mapbox Search Box API
 */
export const geocodeLocationController = async (req: Request, res: Response) => {
  const { query, name, city, country } = req.body;

  // Convert country name to ISO 3166-1 alpha-2 code if provided
  const countryCode = getCountryCode(country);

  // Build a search query from the components if no query provided
  const searchQuery = query || [name, city, country].filter(Boolean).join(', ');

  // Ensure we have some location data to work with
  if (!searchQuery) {
    return res.status(400).json({
      error: 'Insufficient location data. Please provide either a query string or location components.'
    });
  }

  try {
    // Use the Search Box forward endpoint
    const response = await axios.get(
      `https://api.mapbox.com/search/searchbox/v1/forward`,
      {
        params: {
          q: searchQuery,
          country: countryCode, // Use the ISO code instead of full name
          limit: 1,
          access_token: MAPBOX_ACCESS_TOKEN
        }
      }
    );

    // Extract the coordinates from the response
    if (response.data.features && response.data.features.length > 0) {
      const feature = response.data.features[0];
      const { latitude, longitude } = feature.properties.coordinates;

      // Extract place information
      let extractedCity = city;
      let extractedCountry = country;
      
      // Extract from context if available
      if (feature.properties?.context) {
        const context = feature.properties.context;
        
        // Extract place (city) from context
        if (context.place?.name) {
          extractedCity = context.place.name;
        }
        
        // Extract country from context
        if (context.country?.name) {
          extractedCountry = context.country.name;
        }
      }

      // Return both coordinates and place data
      return res.json({ 
        lat: latitude, 
        lng: longitude,
        placeName: feature.properties?.name,
        placeType: feature.properties?.feature_type,
        city: extractedCity,
        country: extractedCountry,
        formattedAddress: feature.properties?.full_address
      });
    }

    // No results found
    return res.status(404).json({
      error: 'No location found for the provided parameters.'
    });
  } catch (error) {
    console.error('Error geocoding location:', error);
    
    // Check if it's an API error with specific message
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const errorData = error.response.data;
      
      if (status === 422 && errorData?.message) {
        return res.status(422).json({
          error: errorData.message,
          details: 'If using a country name, please ensure it is in ISO 3166-1 alpha-2 format (e.g., "IS" for Iceland)'
        });
      }
    }
    
    return res.status(500).json({
      error: 'An error occurred while geocoding the location.'
    });
  }
};

/**
 * Controller to geocode multiple locations in a batch using Mapbox Search Box API
 */
export const batchGeocodeController = async (req: Request, res: Response) => {
  const locations = req.body;

  if (!Array.isArray(locations) || locations.length === 0) {
    return res.status(400).json({
      error: 'Invalid request body. Expected an array of location objects.'
    });
  }

  // Limit batch size to avoid overloading the API
  if (locations.length > 100) {
    return res.status(400).json({
      error: 'Batch size exceeds maximum limit of 100 locations.'
    });
  }

  try {
    // Search Box API doesn't have a true batch endpoint, so we need to process sequentially
    const results = [];

    for (const location of locations) {
      const { id, query, name, city, country } = location;

      // Skip if we don't have an ID or location parameters
      const searchText = query || [name, city, country].filter(Boolean).join(', ');
      if (!id || !searchText) {
        results.push({ id, error: 'Insufficient location data or missing ID' });
        continue;
      }

      // Convert country name to ISO 3166-1 alpha-2 code if provided
      const countryCode = getCountryCode(country);
      console.log(`Geocoding location ${id}: Using country code ${countryCode} for country "${country}"`);

      try {
        // Call the Mapbox Search Box API
        const response = await axios.get(
          `https://api.mapbox.com/search/searchbox/v1/forward`,
          {
            params: {
              q: searchText,
              country: countryCode, // Use the ISO code instead of full name
              limit: 1,
              access_token: MAPBOX_ACCESS_TOKEN
            }
          }
        );

        // Log the API response for debugging
        console.log(`Mapbox API response for ${id}:`, {
          query: searchText,
          countryCode,
          result: response.data.features?.[0]?.properties
        });

        // Extract the coordinates from the response
        if (response.data.features && response.data.features.length > 0) {
          const feature = response.data.features[0];
          const { latitude, longitude } = feature.properties.coordinates;
          
          // Extract place information
          let extractedCity = city;
          let extractedCountry = country;
          
          // Extract from context if available
          if (feature.properties?.context) {
            const context = feature.properties.context;
            
            // Extract place (city) from context
            if (context.place?.name) {
              extractedCity = context.place.name;
            }
            
            // Extract country from context
            if (context.country?.name) {
              extractedCountry = context.country.name;
            }
          }
          
          results.push({ 
            id, 
            lat: latitude, 
            lng: longitude,
            placeName: feature.properties?.name,
            placeType: feature.properties?.feature_type,
            city: extractedCity,
            country: extractedCountry,
            formattedAddress: feature.properties?.full_address
          });
        } else {
          results.push({ id, error: 'No location found' });
        }
      } catch (error) {
        console.error(`Error geocoding location with ID ${id}:`, error);
        results.push({ id, error: 'Geocoding failed' });
      }
    }

    return res.json(results);
  } catch (error) {
    console.error('Error processing batch geocoding request:', error);
    return res.status(500).json({
      error: 'An error occurred while processing the batch geocoding request.'
    });
  }
};