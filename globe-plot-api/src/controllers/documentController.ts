import { Request, Response } from 'express';
import OpenAI from 'openai';
import { documentService } from '@/services/documentService';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('OpenAI API Key:', process.env.OPENAI_API_KEY ? '***' : 'undefined');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
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
}`;

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
  }
}; 