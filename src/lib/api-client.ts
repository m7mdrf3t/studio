/**
 * API client for communicating with the backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Generic fetch function with error handling
 */
async function fetchFromAPI<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const response = await fetch(url, { 
    ...defaultOptions,
    ...options,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API request failed: ${response.status}`);
  }
  
  return response.json() as Promise<T>;
}

/**
 * AI API functions
 */
export const aiApi = {
  /**
   * Get suggested actions based on transcribed text
   */
  suggestActions: (transcription: string) => {
    return fetchFromAPI<{ suggestedActions: string[] }>('/ai/suggest-actions', {
      method: 'POST',
      body: JSON.stringify({ transcription }),
    });
  },
  
  /**
   * Get interactive agent response
   */
  getAgentResponse: (userInput: string, previousDayOffRequestDetails?: any) => {
    return fetchFromAPI('/ai/interactive-agent', {
      method: 'POST',
      body: JSON.stringify({ userInput, previousDayOffRequestDetails }),
    });
  },
  
  /**
   * Convert text to speech
   */
  textToSpeech: (text: string, voiceId?: string) => {
    return fetchFromAPI<{ audioUrl: string, success: boolean }>('/ai/text-to-speech', {
      method: 'POST',
      body: JSON.stringify({ text, voiceId }),
    });
  },
};
