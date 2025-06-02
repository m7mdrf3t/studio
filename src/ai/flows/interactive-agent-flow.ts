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
import { recognizeUserIntent, type UserIntentInput, type UserIntentOutput, type UserIntent } from './recognize-user-intent-flow'; // Removed UserIntentSchema import, ensure UserIntent type is imported

const InteractiveAgentInputSchema = z.object({
  userInput: z
    .string()
    .describe('The text input from the user.'),
});
export type InteractiveAgentInput = z.infer<typeof InteractiveAgentInputSchema>;

// Define the Zod enum locally for the output schema, matching the one in recognize-user-intent-flow.ts
const RecognizedIntentEnumSchemaForOutput = z.enum([
  "REQUEST_DAY_OFF",
  "SUBMIT_COMPLAINT",
  "REQUEST_REFERRAL",
  "GENERAL_CONVERSATION",
  "UNKNOWN_INTENT"
]);

const InteractiveAgentOutputSchema = z.object({
  agentResponse: z
    .string()
    .describe('The conversational response from the AI agent.'),
  recognizedIntent: RecognizedIntentEnumSchemaForOutput.optional().describe('The recognized intent, if any specific action was identified.'),
});
export type InteractiveAgentOutput = {
    agentResponse: string;
    recognizedIntent?: UserIntent; // UserIntent is the imported type
};


export async function getAgentResponse(input: InteractiveAgentInput): Promise<InteractiveAgentOutput> {
  return interactiveAgentFlow(input);
}

const generalConversationPrompt = ai.definePrompt({
  name: 'generalConversationPrompt',
  input: {schema: InteractiveAgentInputSchema},
  output: {schema: z.object({ agentResponse: z.string() }) }, // Output only the response string
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
  async (input: InteractiveAgentInput): Promise<InteractiveAgentOutput> => {
    const intentInput: UserIntentInput = { userInput: input.userInput };
    const intentOutput: UserIntentOutput = await recognizeUserIntent(intentInput);
    const recognizedIntent = intentOutput.intent;

    let agentResponseText: string;

    switch (recognizedIntent) {
      case "REQUEST_DAY_OFF":
        agentResponseText = "Okay, I understand you'd like to request a day off. I've made a note of that. (This is a simulated action)";
        console.log(`ACTION TRIGGERED: User intent: REQUEST_DAY_OFF for input: "${input.userInput}"`);
        // In a real app, you would trigger backend logic here (e.g., call an HR API)
        break;
      case "SUBMIT_COMPLAINT":
        agentResponseText = "I'm sorry to hear you have a complaint. I've logged it for review. (This is a simulated action)";
        console.log(`ACTION TRIGGERED: User intent: SUBMIT_COMPLAINT for input: "${input.userInput}"`);
        // In a real app, you would trigger backend logic here (e.g., create a complaint ticket)
        break;
      case "REQUEST_REFERRAL":
        agentResponseText = "You're looking to make a referral? I've noted that down and someone will follow up. (This is a simulated action)";
        console.log(`ACTION TRIGGERED: User intent: REQUEST_REFERRAL for input: "${input.userInput}"`);
        // In a real app, you would trigger backend logic here (e.g., initiate referral process)
        break;
      case "GENERAL_CONVERSATION":
      case "UNKNOWN_INTENT":
      default:
        // Fallback to general conversation prompt
        const {output: generalOutput} = await generalConversationPrompt(input);
        agentResponseText = generalOutput?.agentResponse || "Sorry, I'm not sure how to respond to that.";
        break;
    }
    return { agentResponse: agentResponseText, recognizedIntent };
  }
);
