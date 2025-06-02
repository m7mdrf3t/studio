'use server';

/**
 * @fileOverview This file defines a Genkit flow that analyzes transcribed text and suggests relevant actions.
 *
 * - suggestActions - A function that takes transcribed text as input and returns suggested actions.
 * - SuggestActionsInput - The input type for the suggestActions function.
 * - SuggestActionsOutput - The return type for the suggestActions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestActionsInputSchema = z.object({
  transcription: z
    .string()
    .describe('The transcribed text from the user\'s voice input.'),
});
export type SuggestActionsInput = z.infer<typeof SuggestActionsInputSchema>;

const SuggestActionsOutputSchema = z.object({
  suggestedActions: z
    .array(z.string())
    .describe('An array of suggested actions based on the transcribed text.'),
});
export type SuggestActionsOutput = z.infer<typeof SuggestActionsOutputSchema>;

export async function suggestActions(input: SuggestActionsInput): Promise<SuggestActionsOutput> {
  return suggestActionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestActionsPrompt',
  input: {schema: SuggestActionsInputSchema},
  output: {schema: SuggestActionsOutputSchema},
  prompt: `You are an AI assistant that analyzes user input and suggests relevant actions.

  Based on the following transcribed text, suggest a list of possible actions the user can take.
  Return the actions as a JSON array of strings.

  Transcribed Text: {{{transcription}}}
  `,
});

const suggestActionsFlow = ai.defineFlow(
  {
    name: 'suggestActionsFlow',
    inputSchema: SuggestActionsInputSchema,
    outputSchema: SuggestActionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
