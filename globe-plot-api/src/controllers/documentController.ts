import { Request, Response } from 'express';
import OpenAI from 'openai';
import { documentService } from '@/services/documentService';
import dotenv from 'dotenv';
import { Mistral } from '@mistralai/mistralai';

// Load environment variables
dotenv.config();

console.log('OpenAI API Key:', process.env.OPENAI_API_KEY ? '***' : 'undefined');
console.log('Mistral API Key:', process.env.MISTRAL_API_KEY ? '***' : 'undefined');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY || ''
});

export const documentController = {
  uploadDocument: async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const result = await documentService.processDocument(req.file);
      res.json(result);
    } catch (error) {
      console.error('Error processing document:', error);
      res.status(500).json({ error: 'Failed to process document' });
    }
  },

  parseDocument: async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'No text provided' });
      }

      const prompt = `Extract travel information from the following text. Look for flights, hotels, activities, and other travel-related events. For each event, extract:
- Type (flight, hotel, activity, etc.)
- Dates and times
- Locations
- Booking references
- Additional details specific to the event type

Text: ${text}

Return the data in JSON format matching this structure:
{
  "events": [
    {
      "type": "flight|hotel|activity|transit|meal",
      "title": "string",
      "departure": {
        "time": "string",
        "location": {
          "name": "string",
          "coordinates": { "lat": number, "lng": number } // optional
        }
      },
      "arrival": {
        "time": "string",
        "location": {
          "name": "string",
          "coordinates": { "lat": number, "lng": number } // optional
        }
      },
      "bookingReference": "string",
      "additionalDetails": {
        // type-specific details
      }
    }
  ]
}
IMPORTANT: RETURN ONLY THE JSON OBJECT, NOTHING ELSE. IF NO INFORMATION IS ABLE TO BE EXTRACTED, RETURN AN EMPTY ARRAY.
`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a travel document parser. Extract travel information and return it in structured JSON format." },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const parsedData = JSON.parse(response);
      res.json(parsedData);
    } catch (error) {
      console.error('Error parsing document:', error);
      res.status(500).json({ error: 'Failed to parse document' });
    }
  },
  
  parseMistral: async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'No text provided' });
      }

      const prompt = `Extract travel information from the following text. Look for flights (including layovers), hotels, activities, meals, and transit options. Each event should be correctly categorized based on its type.

Text: ${text}

Return the data in JSON format matching this structure:
{
  "events": [
    {
      "type": "flight", // Must be one of: flight, hotel, activity, meal, transit
      "title": "Short descriptive title",
      
      // Flight event
      "airline": "Airline name", // Required for flight
      "flightNumber": "Flight number", // Required for flight
      "departure": {
        "time": "ISO date string", // e.g., "2025-06-15T07:45:00"
        "location": {
          "name": "Airport or city name", // Include airport code if available
          "coordinates": { "lat": number, "lng": number } // Optional
        },
        "terminal": "Terminal info" // Optional
      },
      "arrival": {
        "time": "ISO date string", // e.g., "2025-06-15T13:00:00"
        "location": {
          "name": "Airport or city name", // Include airport code if available
          "coordinates": { "lat": number, "lng": number } // Optional
        },
        "terminal": "Terminal info" // Optional
      },
      "bookingReference": "Reference code", // Optional
      "seat": "Seat assignment", // Optional
      "notes": "Additional notes" // Optional
    },
    {
      "type": "hotel", // Must be one of: flight, hotel, activity, meal, transit
      "title": "Short descriptive title",
      
      // Hotel event
      "hotelName": "Name of hotel", // Required for hotel
      "checkIn": {
        "time": "ISO date string", // e.g., "2025-06-19T15:00:00"
        "location": {
          "name": "Hotel address or location name",
          "coordinates": { "lat": number, "lng": number } // Optional
        }
      },
      "checkOut": {
        "time": "ISO date string", // e.g., "2025-06-23T12:00:00"
        "location": {
          "name": "Hotel address or location name",
          "coordinates": { "lat": number, "lng": number } // Optional
        }
      },
      "bookingReference": "Reference code", // Optional
      "roomNumber": "Room number", // Optional
      "notes": "Additional notes" // Optional
    },
    {
      "type": "transit", // Must be one of: flight, hotel, activity, meal, transit
      "title": "Short descriptive title",
      
      // Transit event
      "mode": "train", // Required for transit: one of train, bus, ferry, car
      "departure": {
        "time": "ISO date string", // e.g., "2025-06-15T14:30:00"
        "location": {
          "name": "Departure station/location",
          "coordinates": { "lat": number, "lng": number } // Optional
        }
      },
      "arrival": {
        "time": "ISO date string", // e.g., "2025-06-15T16:45:00"
        "location": {
          "name": "Arrival station/location",
          "coordinates": { "lat": number, "lng": number } // Optional
        }
      },
      "bookingReference": "Reference code", // Optional
      "seat": "Seat assignment", // Optional
      "notes": "Additional notes" // Optional
    },
    {
      "type": "activity", // Must be one of: flight, hotel, activity, meal, transit
      "title": "Short descriptive title",
      
      // Activity event
      "startTime": "ISO date string", // e.g., "2025-06-20T09:00:00"
      "endTime": "ISO date string", // e.g., "2025-06-20T12:00:00"
      "location": {
        "name": "Activity location",
        "coordinates": { "lat": number, "lng": number } // Optional
      },
      "bookingReference": "Reference code", // Optional
      "notes": "Additional notes" // Optional
    },
    {
      "type": "meal", // Must be one of: flight, hotel, activity, meal, transit
      "title": "Short descriptive title",
      
      // Meal event
      "time": "ISO date string", // e.g., "2025-06-20T19:30:00"
      "location": {
        "name": "Restaurant or location name",
        "coordinates": { "lat": number, "lng": number } // Optional
      },
      "reservationReference": "Reference code", // Optional
      "notes": "Additional notes" // Optional
    }
  ]
}

IMPORTANT INSTRUCTIONS:
1. Include ALL required fields for the specific event type
2. For flight events, always include airline and flight number if available
3. For hotel events, always include hotelName
4. For transit events, always specify the mode of transportation
5. Where dates/times are mentioned, use ISO format (YYYY-MM-DDTHH:MM:SS)
6. RETURN ONLY THE JSON OBJECT, NOTHING ELSE
7. IF NO INFORMATION IS ABLE TO BE EXTRACTED, RETURN {"events": []}`;

      // @ts-ignore - Temporarily ignore type checking for Mistral SDK
      const chatResponse = await mistral.chat.complete({
        model: "mistral-small-latest",
        messages: [
          { role: "system", content: "You are a travel document parser. Extract travel information and return it in structured JSON format." },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
      });

      // @ts-ignore - Temporarily ignore type checking for Mistral SDK
      if (!chatResponse.choices || chatResponse.choices.length === 0) {
        throw new Error('No response from Mistral AI');
      }

      // @ts-ignore - Temporarily ignore type checking for Mistral SDK
      const content = chatResponse.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from Mistral AI');
      }

      // Convert content to string regardless of its actual type
      let contentStr = '';
      
      // @ts-ignore - Handle both string and array cases
      if (typeof content === 'string') {
        contentStr = content;
      } else {
        // @ts-ignore - Handle array case by joining elements
        contentStr = Array.isArray(content) ? content.join('') : String(content);
      }

      // Try to parse the response as JSON
      try {
        const parsedData = JSON.parse(contentStr);
        res.json(parsedData);
      } catch (parseError) {
        console.error('Error parsing Mistral response as JSON:', parseError);
        
        // Try to extract JSON from the text response
        const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extractedJson = jsonMatch[0];
          const parsedData = JSON.parse(extractedJson);
          res.json(parsedData);
        } else {
          throw new Error('Could not extract valid JSON from response');
        }
      }
    } catch (error) {
      console.error('Error parsing document with Mistral:', error);
      res.status(500).json({ error: 'Failed to parse document with Mistral' });
    }
  }
}; 