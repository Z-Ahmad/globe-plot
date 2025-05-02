import { Request } from 'express';
import pdf from 'pdf-parse';
import { simpleParser } from 'mailparser';
import { createReadStream } from 'fs';
import { promisify } from 'util';

export const documentService = {
  processDocument: async (file: Express.Multer.File) => {
    try {
      let text = '';

      switch (file.mimetype) {
        case 'application/pdf':
          text = await processPDF(file.buffer);
          break;
        case 'message/rfc822':
        case 'text/plain':
          text = await processEmail(file.buffer);
          break;
        default:
          throw new Error('Unsupported file type');
      }

      return { text };
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }
};

async function processPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error('Error processing PDF:', error);
    throw error;
  }
}

async function processEmail(buffer: Buffer): Promise<string> {
  try {
    const parsed = await simpleParser(buffer);
    return parsed.text || '';
  } catch (error) {
    console.error('Error processing email:', error);
    throw error;
  }
} 