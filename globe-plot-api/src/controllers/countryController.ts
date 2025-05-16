import { Request, Response } from 'express';
import { Country, City } from 'country-state-city';

/**
 * Get all countries
 * @param req Express Request
 * @param res Express Response
 */
export const getAllCountries = (req: Request, res: Response) => {
  try {
    const countries = Country.getAllCountries()
      .filter(country => country.name !== 'Israel') // Filter out Israel
      .map(country => ({
        name: country.name,
        code: country.isoCode, // ISO 3166-1 alpha-2 code
        flag: country.flag,
        phonecode: country.phonecode
      }));
    
    res.json(countries);
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
};

/**
 * Get a specific country by ISO code
 * @param req Express Request
 * @param res Express Response
 */
export const getCountryByCode = (req: Request, res: Response) => {
  try {
    const countryCode = req.params.countryCode;
    const country = Country.getCountryByCode(countryCode);
    
    // If the country is Israel or doesn't exist, return not found
    if (!country || country.name === 'Israel') {
      return res.status(404).json({ error: 'Country not found' });
    }
    
    res.json({
      name: country.name,
      code: country.isoCode,
      flag: country.flag,
      phonecode: country.phonecode
    });
  } catch (error) {
    console.error('Error fetching country:', error);
    res.status(500).json({ error: 'Failed to fetch country' });
  }
};

/**
 * Get all cities for a specific country
 * @param req Express Request
 * @param res Express Response
 */
export const getCitiesByCountry = (req: Request, res: Response) => {
  try {
    const countryCode = req.params.countryCode;
    
    // Check if the country is Israel
    const country = Country.getCountryByCode(countryCode);
    if (country && country.name === 'Israel') {
      return res.status(404).json({ error: 'Country not found' });
    }
    
    const cities = City.getCitiesOfCountry(countryCode) || [];
    
    res.json(cities.map(city => ({
      name: city.name,
      stateCode: city.stateCode,
      countryCode: city.countryCode
    })));
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
};

/**
 * Search for countries by name
 * @param req Express Request
 * @param res Express Response
 */
export const searchCountries = (req: Request, res: Response) => {
  try {
    const query = req.params.query.toLowerCase();
    const countries = Country.getAllCountries();
    
    const filteredCountries = countries
      .filter(country => country.name !== 'Israel') // Filter out Israel
      .filter(country => country.name.toLowerCase().includes(query))
      .map(country => ({
        name: country.name,
        code: country.isoCode,
        flag: country.flag
      }));
    
    res.json(filteredCountries);
  } catch (error) {
    console.error('Error searching countries:', error);
    res.status(500).json({ error: 'Failed to search countries' });
  }
}; 