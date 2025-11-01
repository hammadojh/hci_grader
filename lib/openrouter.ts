import OpenAI from 'openai';
import { Settings } from '@/models/Settings';

/**
 * Get an OpenAI client configured for OpenRouter
 * This centralizes OpenRouter configuration for all AI features
 */
export async function getOpenRouterClient(): Promise<{ client: OpenAI; settings: any }> {
  const settings = await Settings.findOne();
  
  if (!settings || !settings.openRouterApiKey) {
    throw new Error('OpenRouter API key not configured. Please add it in Settings.');
  }

  const client = new OpenAI({
    apiKey: settings.openRouterApiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      'X-Title': 'HCI Grader',
    },
  });

  return { client, settings };
}

/**
 * Get default model for a specific purpose
 * This provides sensible defaults while allowing customization
 */
export function getDefaultModel(purpose: 'rubric' | 'extraction' | 'grading' | 'vision'): string {
  switch (purpose) {
    case 'rubric':
      return 'openai/gpt-4o'; // High quality for rubric generation
    case 'extraction':
      return 'openai/gpt-4o'; // Good at structured extraction
    case 'grading':
      return 'openai/gpt-4o'; // High quality for accurate grading
    case 'vision':
      return 'openai/gpt-4o'; // Supports vision
    default:
      return 'openai/gpt-4o';
  }
}

