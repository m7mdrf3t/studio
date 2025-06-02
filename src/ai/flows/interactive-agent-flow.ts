'use server';
/**
 * @fileOverview A conversational AI agent flow.
 *
 * - getAgentResponse - A function that takes user input and returns the agent's response.
 * - InteractiveAgentInput - The input type for the getAgentResponse function.
 * - InteractiveAgentOutput - The return type for the getAgentResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InteractiveAgentInputSchema = z.object({
  userInput: z
    .string()
    .describe('The text input from the user.'),
});
export type InteractiveAgentInput = z.infer<typeof InteractiveAgentInputSchema>;

const InteractiveAgentOutputSchema = z.object({
  agentResponse: z
    .string()
    .describe('The conversational response from the AI agent.'),
});
export type InteractiveAgentOutput = z.infer<typeof InteractiveAgentOutputSchema>;

export async function getAgentResponse(input: InteractiveAgentInput): Promise<InteractiveAgentOutput> {
  return interactiveAgentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'interactiveAgentPrompt',
  input: {schema: InteractiveAgentInputSchema},
  output: {schema: InteractiveAgentOutputSchema},
  prompt: `You are a friendly and helpful conversational AI assistant.
  The user has said: "{{userInput}}"
  Please provide a relevant and engaging response.
  `,
});

const interactiveAgentFlow = ai.defineFlow(
  {
    name: 'interactiveAgentFlow',
    inputSchema: InteractiveAgentInputSchema,
    outputSchema: InteractiveAgentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
