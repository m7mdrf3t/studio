
'use server';
/**
 * @fileOverview A Genkit flow for generating speech from text using ElevenLabs.
 *
 * - generateSpeech - A function that takes text and returns a URL (data URI) to an audio file.
 * - TextToSpeechInput - The input type for the generateSpeech function.
 * - TextToSpeechOutput - The return type for the generateSpeech function.
 *
 * Environment Variables Required:
 * - ELEVENLABS_API_KEY: Your API key for ElevenLabs.
 * - ELEVENLABS_VOICE_ID: The ID of the voice you want to use from ElevenLabs.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TextToSpeechInputSchema = z.object({
  text: z.string().describe('The text to be converted to speech.'),
});
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;

const TextToSpeechOutputSchema = z.object({
  audioUrl: z.string().describe('A data URI or URL to the generated audio file.'),
});
export type TextToSpeechOutput = z.infer<typeof TextToSpeechOutputSchema>;

const ELEVENLABS_API_BASE_URL = 'https://api.elevenlabs.io/v1';

const textToSpeechFlow = ai.defineFlow(
  {
    name: 'textToSpeechFlow',
    inputSchema: TextToSpeechInputSchema,
    outputSchema: TextToSpeechOutputSchema,
  },
  async ({text}) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;

    if (!apiKey) {
      console.error('ElevenLabs API key is not configured.');
      // Fallback to a silent audio or an error message audio if preferred
      return { audioUrl: 'data:audio/mpeg;base64,' }; // Empty MP3 data URI
    }
    if (!voiceId) {
      console.error('ElevenLabs Voice ID is not configured.');
      return { audioUrl: 'data:audio/mpeg;base64,' };
    }

    if (!text || text.trim() === "") {
      return { audioUrl: '' };
    }

    const ttsUrl = `${ELEVENLABS_API_BASE_URL}/text-to-speech/${voiceId}`;

    try {
      const response = await fetch(ttsUrl, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2', // Or your preferred model
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            // style: 0.0, // Uncomment and set if using a model that supports style_exaggeration
            // use_speaker_boost: true
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`ElevenLabs API Error (${response.status}): ${errorBody}`);
        // Consider returning a pre-recorded error sound or specific error message
        return { audioUrl: 'data:audio/mpeg;base64,' }; // Empty/silent audio on error
      }

      const audioArrayBuffer = await response.arrayBuffer();
      const audioBase64 = Buffer.from(audioArrayBuffer).toString('base64');
      const audioDataUri = `data:audio/mpeg;base64,${audioBase64}`;
      
      console.log(`Successfully generated speech with ElevenLabs for text: "${text}"`);
      return { audioUrl: audioDataUri };

    } catch (error) {
      console.error('Error calling ElevenLabs API:', error);
      return { audioUrl: 'data:audio/mpeg;base64,' }; // Empty/silent audio on error
    }
  }
);

export async function generateSpeech(input: TextToSpeechInput): Promise<TextToSpeechOutput> {
  if (!input.text.trim()) {
    return { audioUrl: '' };
  }
  return textToSpeechFlow(input);
}
