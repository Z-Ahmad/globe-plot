import { Request, Response } from 'express';
import OpenAI from 'openai';
import { documentService } from '@/services/documentService';
import dotenv from 'dotenv';
import { Mistral } from '@mistralai/mistralai';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

// console.log('OpenAI API Key:', process.env.OPENAI_API_KEY ? '***' : 'undefined');
console.log('Mistral API Key:', process.env.MISTRAL_API_KEY ? '***' : 'undefined');

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY
// });

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY || ''
});

// Normalize event to set top-level start/end fields based on type
function normalizeEvent(event: any) {
  let start = '';
  let end = '';
  // Always set placeName for accommodation events
  if (event.category === 'accommodation') {
    event.placeName = event.placeName || event.hotelName || event.hostelName || event.airbnbName || '';
  }
  
  // Determine start/end times based on category
  switch (event.category) {
    case 'accommodation':
      start = event.checkIn?.date || '';
      end = event.checkOut?.date || '';
      break;
    case 'travel':
      start = event.departure?.date || '';
      end = event.arrival?.date || '';
      break;
    case 'experience':
      start = event.startDate || '';
      end = event.endDate || '';
      break;
    case 'meal':
      start = event.date || '';
      end = event.date || '';
      break;
    default:
      start = event.start || '';
      end = event.end || '';
  }
  
  // Handle non-standard fields by moving them to notes
  const knownFields: Record<string, boolean> = {
    // Common fields
    id: true, category: true, type: true, title: true, start: true, end: true, 
    location: true, notes: true,
    
    // Travel event fields
    departure: true, arrival: true, airline: true, flightNumber: true, 
    trainNumber: true, seat: true, car: true, class: true, bookingReference: true,
    
    // Accommodation event fields
    placeName: true, checkIn: true, checkOut: true, roomNumber: true, 
    // Accommodation events can also have a bookingReference (already defined above)
    
    // Experience event fields
    startDate: true, endDate: true, // bookingReference already defined above
    
    // Meal event fields
    date: true, reservationReference: true
  };
  
  // Collect unknown fields
  const unknownFields: string[] = [];
  for (const key in event) {
    if (!knownFields[key] && event[key] !== undefined && event[key] !== null) {
      unknownFields.push(`${key}: ${JSON.stringify(event[key])}`);
    }
  }
  
  // Add unknown fields to notes
  let notes = event.notes || '';
  if (unknownFields.length > 0) {
    if (notes) notes += '\n\n';
    notes += 'Additional information:\n' + unknownFields.join('\n');
  }
  
  // Create normalized event
  const normalizedEvent = {
    ...event,
    start,
    end,
    notes,
    id: event.id || uuidv4(),
  };
  
  // Remove unknown fields
  for (const key in normalizedEvent) {
    if (!knownFields[key]) {
      delete normalizedEvent[key];
    }
  }
  
  return normalizedEvent;
}

// Validate that event has required fields for its category
function validateEvent(event: any) {
  switch (event.category) {
    case 'accommodation':
      return !!(event.checkIn?.date && event.checkOut?.date);
    case 'travel':
      return !!(event.departure?.date && event.arrival?.date);
    case 'experience':
      return !!(event.startDate && event.endDate);
    case 'meal':
      return !!event.date;
    default:
      return false;
  }
}

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

//   parseDocument: async (req: Request, res: Response) => {
//     try {
//       const { text } = req.body;
//       if (!text) {
//         return res.status(400).json({ error: 'No text provided' });
//       }

//       const prompt = `Extract travel information from the following text. Look for flights, hotels, activities, and other travel-related events. For each event, extract:
// - Type (flight, hotel, activity, etc.)
// - Dates and times
// - City and country (ALWAYS include both, even if you have to infer or guess from the location name or context)
// - Location name/address
// - Booking references
// - Additional details specific to the event type

// For every event, always include:
// - "city": "string" (e.g., "Paris")
// - "country": "string" (e.g., "France")

// Text: ${text}

// Return the data in JSON format matching this structure:
// {
//   "events": [
//     {
//       "type": "flight|hotel|activity|transit|meal",
//       "title": "string",
//       "city": "string",
//       "country": "string",
//       "departure": {
//         "time": "string",
//         "location": {
//           "name": "string",
//           "coordinates": { "lat": number, "lng": number } // optional
//         }
//       },
//       "arrival": {
//         "time": "string",
//         "location": {
//           "name": "string",
//           "coordinates": { "lat": number, "lng": number } // optional
//         }
//       },
//       "bookingReference": "string",
//       "additionalDetails": {
//         // type-specific details
//       }
//     }
//   ]
// }
// IMPORTANT: RETURN ONLY THE JSON OBJECT, NOTHING ELSE. IF NO INFORMATION IS ABLE TO BE EXTRACTED, RETURN AN EMPTY ARRAY.`;

//       const completion = await openai.chat.completions.create({
//         model: "gpt-4",
//         messages: [
//           { role: "system", content: "You are a travel document parser. Extract travel information and return it in structured JSON format." },
//           { role: "user", content: prompt }
//         ],
//         temperature: 0.1,
//       });

//       const response = completion.choices[0].message.content;
//       if (!response) {
//         throw new Error('No response from OpenAI');
//       }

//       const parsedData = JSON.parse(response);
//       res.json(parsedData);
//     } catch (error) {
//       console.error('Error parsing document:', error);
//       res.status(500).json({ error: 'Failed to parse document' });
//     }
//   },
  
  parseMistral: async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'No text provided' });
      }

      const prompt = `You are a travel document parser. Your job is to extract structured travel events from the provided text. 

IMPORTANT RULES:
- ONLY extract information that is explicitly present in the text or can be reliably inferred (e.g., city/country from a location name).
- NEVER invent, guess, or hallucinate any details (such as booking references, seat numbers, times, or names).
- If a field is not present in the text, either omit it or set it to an empty string.
- For every event, always include these required fields based on category:

BASE EVENT FIELDS:
- id (leave blank, will be set automatically)
- category: "travel" | "accommodation" | "experience" | "meal"
- type: specific subtype based on category
- title: string
- start: string (ISO date format) - will be set automatically based on category-specific fields
- end: string (ISO date format) - will be set automatically based on category-specific fields
- location: { name: string, city: string, country: string } - **ALL events must have this top-level location property**
- notes: string (optional)

CATEGORY-SPECIFIC FIELDS:
1. Travel events (category: "travel"):
   - location: { name: string, city: string, country: string } - **Same as departure location**
   - departure: { date: string, location: { name: string, city: string, country: string } }
   - arrival: { date: string, location: { name: string, city: string, country: string } }
   - airline: string (optional)
   - flightNumber: string (optional)
   - trainNumber: string (optional)
   - seat: string (optional)
   - car: string (optional) - for train car number
   - class: string (optional) - for travel class (economy, business, etc.)
   - bookingReference: string (optional)

2. Accommodation events (category: "accommodation"):
   - location: { name: string, city: string, country: string } - **Same as checkIn location**
   - placeName: string 
   - checkIn: { date: string, location: { name: string, city: string, country: string } }
   - checkOut: { date: string, location: { name: string, city: string, country: string } }
   - roomNumber: string (optional)
   - bookingReference: string (optional)

3. Experience events (category: "experience"):
   - location: { name: string, city: string, country: string }
   - startDate: string
   - endDate: string
   - bookingReference: string (optional)

4. Meal events (category: "meal"):
   - location: { name: string, city: string, country: string }
   - date: string
   - reservationReference: string (optional)

EXAMPLES:

Example 1 (flight, all fields present):
{
  "category": "travel",
  "type": "flight",
  "title": "Flight from New York to Reykjavik",
  "airline": "Icelandair",
  "flightNumber": "FI614",
  "departure": {
    "date": "2025-06-10T20:30:00",
    "location": {
      "name": "JFK – New York",
      "city": "New York",
      "country": "USA"
    }
  },
  "arrival": {
    "date": "2025-06-11T06:10:00",
    "location": {
      "name": "KEF – Reykjavik",
      "city": "Reykjavik",
      "country": "Iceland"
    }
  },
  "location": {
    "name": "JFK – New York",
    "city": "New York",
    "country": "USA"
  },
  "seat": "14A",
  "bookingReference": "ABC123",
  "notes": "Window seat requested"
}

Example 2 (flight, missing optional fields):
{
  "category": "travel",
  "type": "flight",
  "title": "Flight from Paris to New York",
  "departure": {
    "date": "2025-06-24T13:15:00",
    "location": {
      "name": "CDG – Paris Charles de Gaulle",
      "city": "Paris",
      "country": "France"
    }
  },
  "arrival": {
    "date": "2025-06-24T15:50:00",
    "location": {
      "name": "JFK – New York",
      "city": "New York",
      "country": "USA"
    }
  },
  "location": {
    "name": "CDG – Paris Charles de Gaulle",
    "city": "Paris",
    "country": "France"
  }
}

Example 3 (accommodation, missing some fields):
{
  "category": "accommodation",
  "type": "hostel",
  "title": "YellowSquare Hostel Stay",
  "placeName": "YellowSquare Hostel",
  "checkIn": {
    "date": "2025-06-13T14:00:00",
    "location": {
      "name": "Via Palestro 51, 00185 Rome, Italy",
      "city": "Rome",
      "country": "Italy"
    }
  },
  "checkOut": {
    "date": "2025-06-17T11:00:00",
    "location": {
      "name": "Via Palestro 51, 00185 Rome, Italy",
      "city": "Rome",
      "country": "Italy"
    }
  },
  "location": {
    "name": "Via Palestro 51, 00185 Rome, Italy",
    "city": "Rome",
    "country": "Italy"
  }
}

Example 4 (experience, minimal):
{
  "category": "experience",
  "type": "tour",
  "title": "Vatican Guided Tour",
  "startDate": "2025-06-14T10:00:00",
  "endDate": "2025-06-14T12:00:00",
  "location": {
    "name": "Viale Vaticano 100",
    "city": "Vatican City",
    "country": "Vatican City"
  }
}

Text: ${text}

Return the data in JSON format:
{
  "events": [ ... ]
}

DO NOT include any fields that are not present in the text. DO NOT invent or guess any information. If no information can be extracted, return {"events": []}`;

      // @ts-ignore - Temporarily ignore type checking for Mistral SDK
      const chatResponse = await mistral.chat.complete({
        model: "ministral-3b-latest",
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

      // Remove code block formatting if present (```json ... ```)
      contentStr = contentStr.replace(/```(json|javascript)?\s*/, '').replace(/\s*```\s*$/, '');

      // Try to parse the response as JSON
      try {
        const parsedData = JSON.parse(contentStr);
        // Normalize all events
        if (parsedData && Array.isArray(parsedData.events)) {
          parsedData.events = parsedData.events.map(normalizeEvent);
          // Validate events and log warnings
          parsedData.events.forEach((event: any) => {
            if (!validateEvent(event)) {
              console.warn('Event failed validation:', event);
            }
          });
        }
        res.json(parsedData);
      } catch (parseError) {
        console.error('Error parsing Mistral response as JSON:', parseError);
        
        // Try to extract JSON from the text response
        const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extractedJson = jsonMatch[0];
          try {
            const parsedData = JSON.parse(extractedJson);
            // Normalize all events
            if (parsedData && Array.isArray(parsedData.events)) {
              parsedData.events = parsedData.events.map(normalizeEvent);
              // Validate events and log warnings
              parsedData.events.forEach((event: any) => {
                if (!validateEvent(event)) {
                  console.warn('Event failed validation:', event);
                }
              });
            }
            res.json(parsedData);
          } catch (innerError) {
            console.error('Failed to parse extracted JSON:', innerError);
            throw new Error('Could not parse JSON from response');
          }
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