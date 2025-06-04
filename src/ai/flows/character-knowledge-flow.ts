'use server';

/**
 * @fileOverview This file defines a Genkit flow that queries a character's knowledge base.
 *
 * - queryCharacterKnowledge - A function that takes a query and character ID as input and returns knowledge-based responses.
 * - CharacterKnowledgeInput - The input type for the queryCharacterKnowledge function.
 * - CharacterKnowledgeOutput - The return type for the queryCharacterKnowledge function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CharacterKnowledgeInputSchema = z.object({
  query: z
    .string()
    .describe('The query to search for in the character\'s knowledge base.'),
  characterId: z
    .string()
    .describe('The ID of the character whose knowledge base to query.')
});
export type CharacterKnowledgeInput = z.infer<typeof CharacterKnowledgeInputSchema>;

const CharacterKnowledgeOutputSchema = z.object({
  response: z
    .string()
    .describe('The response based on the character\'s knowledge base.'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence score for the response (0-1).'),
  sourceMaterials: z
    .array(
      z.object({
        title: z.string().describe('Title of the source material'),
        content: z.string().describe('Relevant excerpt from the source'),
        relevanceScore: z.number().describe('Relevance score for this source')
      })
    )
    .describe('Source materials from the knowledge base that informed this response.')
});
export type CharacterKnowledgeOutput = z.infer<typeof CharacterKnowledgeOutputSchema>;

export async function queryCharacterKnowledge(input: CharacterKnowledgeInput): Promise<CharacterKnowledgeOutput> {
  return characterKnowledgeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'characterKnowledgePrompt',
  input: {schema: CharacterKnowledgeInputSchema},
  output: {schema: CharacterKnowledgeOutputSchema},
  prompt: `You are an AI assistant that retrieves information from a character's knowledge base.

  Based on the following query, provide a response that reflects the character's knowledge and personality.
  Include source materials that informed your response.

  Query: {{{query}}}
  Character ID: {{{characterId}}}
  `,
});

const characterKnowledgeFlow = ai.defineFlow(
  {
    name: 'characterKnowledgeFlow',
    inputSchema: CharacterKnowledgeInputSchema,
    outputSchema: CharacterKnowledgeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
