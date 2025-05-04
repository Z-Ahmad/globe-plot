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

      // Sanitize text to remove sensitive information
      text = sanitizeText(text);

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

/**
 * Removes sensitive information from the provided text
 */
function sanitizeText(text: string): string {
  // Email regex pattern
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  
  // URL regex pattern (matches http, https, ftp URLs and www.example.com style URLs)
  const urlPattern = /(https?:\/\/|www\.)[^\s]+/g;
  
  // Full credit card number pattern (matches common credit card formats)
  const fullCreditCardPattern = /\b(?:\d[ -]*?){13,16}\b/g;
  
  // Last 4 digits of credit card pattern (common in receipts and confirmations)
  const last4CreditCardPattern = /\b(?:(?:credit|debit|card|cc|acct|account|payment)[\s:]*(?:ending|last|final)?[\s:-]*(?:in|with)?[\s:-]*(?:\d{4}|\*{4}))|(?:x{4}[\s-]?x{4}[\s-]?x{4}[\s-]?\d{4})|(?:ending in \d{4})|(?:\*{4,12}[\s-]?\d{4})\b/gi;
  
  // Phone number patterns (handles various formats)
  const phonePattern = /\b(?:\+\d{1,3}[-\s]?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}\b/g;
  
  // Social Security Number pattern
  const ssnPattern = /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g;
  
  // Passport number pattern (simplified, varies by country)
  const passportPattern = /\b[A-Z0-9]{6,9}\b/g;
  
  // Account/membership number patterns (including loyalty programs, frequent flyer)
  const accountPattern = /\b(acc(oun)?t|member(ship)?|loyalty|freq(uent)?)[.\s-_:#]?(\d{5,}|\d{4}[-\s]\d{4}[-\s]\d{4})/gi;
  
  // Remove emails
  text = text.replace(emailPattern, '[EMAIL REMOVED]');
  
  // Remove URLs
  text = text.replace(urlPattern, '[URL REMOVED]');
  
  // Remove full credit card numbers
  text = text.replace(fullCreditCardPattern, '[CREDIT CARD REMOVED]');
  
  // Remove last 4 digits of credit cards
  text = text.replace(last4CreditCardPattern, '[CARD ENDING REMOVED]');
  
  // Remove phone numbers
  text = text.replace(phonePattern, '[PHONE NUMBER REMOVED]');
  
  // Remove SSNs
  text = text.replace(ssnPattern, '[SSN REMOVED]');
  
  // Remove passport numbers (with caution - may have false positives)
  text = text.replace(passportPattern, (match) => {
    // Avoid replacing common 6-digit dates or generic numbers
    if (/^\d{6}$/.test(match) || /^\d{8}$/.test(match)) {
      return match;
    }
    return '[ID NUMBER REMOVED]';
  });
  
  // Remove account/membership numbers
  text = text.replace(accountPattern, (match) => {
    const prefix = match.replace(/[.\s-_:#]?\d.*$/, '');
    return prefix + ' [ACCOUNT NUMBER REMOVED]';
  });
  
  return text;
} 