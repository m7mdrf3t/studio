'use server';

import { generateSpeech, type TextToSpeechInput, type TextToSpeechOutput } from '@/ai/flows/text-to-speech-flow';

export async function generateSpeechAction(text: string): Promise<TextToSpeechOutput> {
  if (!text.trim()) {
    return { audioUrl: "" }; // Or throw an error
  }

  try {
    const input: TextToSpeechInput = { text };
    const output = await generateSpeech(input);
    return output;
  } catch (error) {
    console.error("Error generating speech:", error);
    // Depending on how you want to handle errors, you might throw it or return a specific error structure.
    // For now, returning an empty URL to signify failure to the client.
    return { audioUrl: "" };
  }
}
