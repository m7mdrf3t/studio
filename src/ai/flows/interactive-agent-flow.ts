
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
import { recognizeUserIntent, type UserIntentInput, type UserIntentOutput, type UserIntent } from './recognize-user-intent-flow';

// Schema for the details collected during a day-off request
const DayOffDetailsSchema = z.object({
  days: z.string().optional().describe("Number of days requested for leave. Extracted from user input."),
  startDate: z.string().optional().describe("The start date for the leave. Extracted in YYYY-MM-DD format if possible, or as mentioned by the user."),
  reason: z.string().optional().describe("The reason for the leave, extracted from user input."),
  isComplete: z.boolean().describe("True if all required information (days, startDate, reason) has been gathered. False otherwise."),
  responseText: z.string().describe("The agent's response to the user, either asking for missing information or confirming the request if all details are present."),
});
export type DayOffDetails = z.infer<typeof DayOffDetailsSchema>;

const InteractiveAgentInputSchema = z.object({
  userInput: z
    .string()
    .describe('The text input from the user.'),
  previousDayOffRequestDetails: DayOffDetailsSchema.optional().describe('Details of an ongoing day-off request from a previous turn, if applicable and not yet complete.'),
});
export type InteractiveAgentInput = z.infer<typeof InteractiveAgentInputSchema>;

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
  dayOffRequestDetails: DayOffDetailsSchema.optional().describe('Details collected if the intent is REQUEST_DAY_OFF. This should be sent back by the client in subsequent requests if the interaction is ongoing and not yet complete.'),
});
export type InteractiveAgentOutput = {
    agentResponse: string;
    recognizedIntent?: UserIntent;
    dayOffRequestDetails?: DayOffDetails;
};


export async function getAgentResponse(input: InteractiveAgentInput): Promise<InteractiveAgentOutput> {
  return interactiveAgentFlow(input);
}

const generalConversationPrompt = ai.definePrompt({
  name: 'generalConversationPrompt',
  input: {schema: z.object({ userInput: z.string() }) },
  output: {schema: z.object({ agentResponse: z.string() }) },
  prompt: `You are a friendly and helpful conversational AI assistant.
  The user has said: "{{userInput}}"
  Please provide a relevant and engaging response.
  If the user's input in Arabic seems like a day-off request, gently guide them by asking how you can help with that, but prioritize fulfilling other intents first if clearly stated.
  `,
});

// Input schema for the dayOffDetailsPrompt
const DayOffPromptInputSchema = z.object({
  userInput: z.string().describe("The user's latest message."),
  daysPreviouslyCollected: z.string().optional().describe("Number of days collected in prior turns, if any."),
  startDatePreviouslyCollected: z.string().optional().describe("Start date collected in prior turns, if any."),
  reasonPreviouslyCollected: z.string().optional().describe("Reason collected in prior turns, if any."),
});

const dayOffDetailsPrompt = ai.definePrompt({
  name: 'dayOffDetailsPrompt',
  input: { schema: DayOffPromptInputSchema },
  output: { schema: DayOffDetailsSchema }, // Output is the full DayOffDetailsSchema
  prompt: `You are an HR assistant meticulously collecting details for a time-off request.
User's current message: "{{userInput}}"

Previously collected information (if this is part of an ongoing request):
- Days: {{#if daysPreviouslyCollected}}{{daysPreviouslyCollected}}{{else}}Not yet specified{{/if}}
- Start Date: {{#if startDatePreviouslyCollected}}{{startDatePreviouslyCollected}}{{else}}Not yet specified{{/if}}
- Reason: {{#if reasonPreviouslyCollected}}{{reasonPreviouslyCollected}}{{else}}Not yet specified{{/if}}

Your tasks:
1. Analyze the "{{userInput}}" in conjunction with any "Previously collected information".
2. Update your understanding of 'days', 'startDate', and 'reason'. Information in "{{userInput}}" takes precedence if it conflicts, otherwise, combine new partial info with previous info.
3. Determine if all three pieces of information ('days', 'startDate', 'reason') are now definitively available. Set 'isComplete' to true if so, false otherwise.
4. Craft 'responseText' based on what's missing or if the request is complete:
    - If 'days' is still missing or unclear (even after considering previous info and current input), set 'responseText' to ask: "Okay, you'd like to request some time off. How many days would you like to take?"
    - Else if 'startDate' is still missing or unclear, set 'responseText' to ask: "Got it, for {{days}}. And when would you like this leave to start?" (Use the just-confirmed/updated 'days' value).
    - Else if 'reason' is still missing or unclear, set 'responseText' to ask: "Understood, {{days}} starting {{startDate}}. What's the reason for your time off?" (Use confirmed/updated 'days' and 'startDate').
    - Else (all details 'days', 'startDate', 'reason' are present and clear), set 'responseText' to a confirmation like: "Great! I've noted down your request for {{days}} starting on {{startDate}} for {{reason}}. (This is a simulated action and has been logged for now.)" and ensure 'isComplete' is true.

Important:
- The 'days', 'startDate', and 'reason' fields in your output should reflect the most current, combined understanding.
- If the user's "{{userInput}}" clearly indicates they want to cancel or abandon the day-off request (e.g., "nevermind", "cancel that"), set 'responseText' to something like "Okay, cancelling that request. Let me know if there's anything else." Set 'isComplete' to false, and clear any collected 'days', 'startDate', 'reason' in your output.
- Respond in Arabic if the user's input is in Arabic. For example: If user says "أريد إجازة", and 'days' is missing, 'responseText' should be an Arabic question asking for the number of days.

Output the final 'days', 'startDate', 'reason', 'isComplete', and 'responseText'.
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
    let recognizedIntent = intentOutput.intent;

    let agentResponseText: string;
    let dayOffDetails: DayOffDetails | undefined = input.previousDayOffRequestDetails?.isComplete === false ? input.previousDayOffRequestDetails : undefined;

    // If we have ongoing day-off details and the new intent isn't something totally different, assume we're continuing.
    if (dayOffDetails && recognizedIntent !== "SUBMIT_COMPLAINT" && recognizedIntent !== "REQUEST_REFERRAL") {
        recognizedIntent = "REQUEST_DAY_OFF"; // Force context if continuing a day-off request
    }


    switch (recognizedIntent) {
      case "REQUEST_DAY_OFF":
        const dayOffPromptInput: z.infer<typeof DayOffPromptInputSchema> = {
          userInput: input.userInput,
          daysPreviouslyCollected: dayOffDetails?.days,
          startDatePreviouslyCollected: dayOffDetails?.startDate,
          reasonPreviouslyCollected: dayOffDetails?.reason,
        };
        const { output: dayOffOutputFromPrompt } = await dayOffDetailsPrompt(dayOffPromptInput);

        if (dayOffOutputFromPrompt) {
          agentResponseText = dayOffOutputFromPrompt.responseText;
          dayOffDetails = dayOffOutputFromPrompt; // This is the full, updated details object
          if (dayOffOutputFromPrompt.isComplete) {
            console.log(`SIMULATED ACTION: Day-off request fully processed and logged: Days: ${dayOffOutputFromPrompt.days}, StartDate: ${dayOffOutputFromPrompt.startDate}, Reason: ${dayOffOutputFromPrompt.reason}`);
            // dayOffDetails will be sent back to client; if isComplete is true, client should stop sending it back.
          }
        } else {
          agentResponseText = "I'm having a little trouble processing that day-off request. Could you please try rephrasing?";
           // Potentially clear dayOffDetails or handle error state more gracefully
          dayOffDetails = undefined;
        }
        break;
      case "SUBMIT_COMPLAINT":
        agentResponseText = "I'm sorry to hear you have a complaint. I've logged it for review. (This is a simulated action)";
        console.log(`ACTION TRIGGERED: User intent: SUBMIT_COMPLAINT for input: "${input.userInput}"`);
        dayOffDetails = undefined; // Clear any ongoing day-off context
        break;
      case "REQUEST_REFERRAL":
        agentResponseText = "You're looking to make a referral? I've noted that down and someone will follow up. (This is a simulated action)";
        console.log(`ACTION TRIGGERED: User intent: REQUEST_REFERRAL for input: "${input.userInput}"`);
        dayOffDetails = undefined; // Clear any ongoing day-off context
        break;
      case "GENERAL_CONVERSATION":
      case "UNKNOWN_INTENT":
      default:
        const {output: generalOutput} = await generalConversationPrompt({userInput: input.userInput});
        agentResponseText = generalOutput?.agentResponse || "Sorry, I'm not sure how to respond to that.";
        // If it was a general conversation but there was an incomplete dayOffRequest,
        // we might want to clear dayOffDetails or prompt if they want to continue.
        // For now, if intent recognition says it's general, we clear day-off context.
        if (input.previousDayOffRequestDetails && !input.previousDayOffRequestDetails.isComplete) {
            // Heuristic: if user switches topic away from an incomplete day off request, we might want to abandon it.
            // For now, let's preserve dayOffDetails unless it's explicitly cleared by another intent.
            // This could be refined by having the generalConversationPrompt also assess if a day-off abandon happened.
        }
         // if the user switches topic, we might want to clear the dayOffDetails.
        // For now, let's clear it if it's not an explicit day off request.
        if (recognizedIntent !== "REQUEST_DAY_OFF") {
            dayOffDetails = undefined;
        }
        break;
    }
    return { agentResponse: agentResponseText, recognizedIntent, dayOffRequestDetails };
  }
);

