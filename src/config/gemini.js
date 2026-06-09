/**
 * @fileoverview Configuration module for initializing the Google Gen AI client.
 */

const { GoogleGenAI } = require('@google/genai');

// Load API key from environment variables
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

let ai = null;

if (apiKey) {
  try {
    // Initialize the official Google Gen AI Client
    ai = new GoogleGenAI({ apiKey });
  } catch (error) {
    console.error('Failed to initialize Google Gen AI Client:', error);
  }
} else {
  console.warn('WARNING: GEMINI_API_KEY/GOOGLE_API_KEY environment variable is not set. Chat assistant will run in fallback mock mode.');
}

module.exports = {
  ai,
  apiKey
};
