import { Unosend } from '@unosend/node';

let unosendInstance: Unosend | null = null;

/**
 * Get or create Unosend client instance (singleton)
 * Returns null if UNOSEND_API_KEY is not set
 */
export function getUnosendClient(): Unosend | null {
  if (unosendInstance) {
    return unosendInstance;
  }

  const apiKey = process.env.UNOSEND_API_KEY;
  if (!apiKey) {
    console.warn('UNOSEND_API_KEY is not set. Email notifications will be disabled.');
    return null;
  }

  try {
    unosendInstance = new Unosend(apiKey);
    return unosendInstance;
  } catch (error) {
    console.error('Failed to initialize Unosend client:', error);
    return null;
  }
}

