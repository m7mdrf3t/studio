'use server';
/**
 * @fileOverview A Genkit flow to recognize user intent from text.
 *
 * - recognizeUserIntent - A function that takes user input and returns the recognized intent.
 * - UserIntentInput - The input type for the recognizeUserIntent function.
 * - UserIntentOutput - The return type for the recognizeUserIntent function.
 * - UserIntent - The enum type for possible user intents.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const UserIntentSchema = z.enum([ // Changed from export const to const
  "REQUEST_DAY_OFF",
  "SUBMIT_COMPLAINT",
  "REQUEST_REFERRAL",
  "GENERAL_CONVERSATION",
  "UNKNOWN_INTENT"
]);
export type UserIntent = z.infer<typeof UserIntentSchema>;

const UserIntentInputSchema = z.object({
  userInput: z
    .string()
    .describe('The text input from the user.'),
});
export type UserIntentInput = z.infer<typeof UserIntentInputSchema>;

const UserIntentOutputSchema = z.object({
  intent: UserIntentSchema.describe('The recognized intent from the user\'s input.'),
});
export type UserIntentOutput = z.infer<typeof UserIntentOutputSchema>;

export async function recognizeUserIntent(input: UserIntentInput): Promise<UserIntentOutput> {
  return recognizeUserIntentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recognizeUserIntentPrompt',
  input: {schema: UserIntentInputSchema},
  output: {schema: UserIntentOutputSchema},
  prompt: `You are an expert at understanding user requests and classifying them into predefined intents.
  Analyze the user's input and determine which of the following intents it matches:
  - REQUEST_DAY_OFF: User is asking for time off, vacation, leave, etc.
  - SUBMIT_COMPLAINT: User is expressing dissatisfaction, a problem, or wants to file a complaint.
  - REQUEST_REFERRAL: User is asking about referring someone, or for a referral program.
  - GENERAL_CONVERSATION: User is making a general statement, asking a question not related to the other intents, or engaging in small talk.
  - UNKNOWN_INTENT: The user's intent is unclear or does not fit any of the other categories.

  User input: "{{userInput}}"

  Respond with only one of the intent names listed above.
  For example, if the user says "I want to take a vacation", respond with "REQUEST_DAY_OFF".
  If the user says "hello", respond with "GENERAL_CONVERSATION".
  `,
});

const recognizeUserIntentFlow = ai.defineFlow(
  {
    name: 'recognizeUserIntentFlow',
    inputSchema: UserIntentInputSchema,
    outputSchema: UserIntentOutputSchema,
  },
  async (input: UserIntentInput) => {
    const {output} = await prompt(input);
    if (!output) {
      return { intent: "UNKNOWN_INTENT" as UserIntent };
    }
    // Ensure the output intent is one of the valid enum values
    if (UserIntentSchema.safeParse(output.intent).success) {
      return { intent: output.intent as UserIntent };
    }
    console.warn(`LLM returned an invalid intent: ${output.intent}. Defaulting to UNKNOWN_INTENT.`);
    return { intent: "UNKNOWN_INTENT" as UserIntent };
  }
);
