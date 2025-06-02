
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

const InteractiveAgentInputSchema = z.object({
  userInput: z
    .string()
    .describe('The text input from the user.'),
});
export type InteractiveAgentInput = z.infer<typeof InteractiveAgentInputSchema>;

const RecognizedIntentEnumSchemaForOutput = z.enum([
  "REQUEST_DAY_OFF",
  "SUBMIT_COMPLAINT",
  "REQUEST_REFERRAL",
  "GENERAL_CONVERSATION",
  "UNKNOWN_INTENT"
]);

const DayOffDetailsSchema = z.object({
  days: z.string().optional().describe("Number of days requested for leave. Extracted from user input."),
  startDate: z.string().optional().describe("The start date for the leave. Extracted in YYYY-MM-DD format if possible, or as mentioned by the user."),
  reason: z.string().optional().describe("The reason for the leave, extracted from user input."),
  isComplete: z.boolean().describe("True if all required information (days, startDate, reason) has been gathered. False otherwise."),
  responseText: z.string().describe("The agent's response to the user, either asking for missing information or confirming the request if all details are present."),
});

const InteractiveAgentOutputSchema = z.object({
  agentResponse: z
    .string()
    .describe('The conversational response from the AI agent.'),
  recognizedIntent: RecognizedIntentEnumSchemaForOutput.optional().describe('The recognized intent, if any specific action was identified.'),
  dayOffRequestDetails: DayOffDetailsSchema.optional().describe('Details collected if the intent is REQUEST_DAY_OFF'),
});
export type InteractiveAgentOutput = {
    agentResponse: string;
    recognizedIntent?: UserIntent;
    dayOffRequestDetails?: z.infer<typeof DayOffDetailsSchema>;
};


export async function getAgentResponse(input: InteractiveAgentInput): Promise<InteractiveAgentOutput> {
  return interactiveAgentFlow(input);
}

const generalConversationPrompt = ai.definePrompt({
  name: 'generalConversationPrompt',
  input: {schema: InteractiveAgentInputSchema},
  output: {schema: z.object({ agentResponse: z.string() }) },
  prompt: `You are a friendly and helpful conversational AI assistant.
  The user has said: "{{userInput}}"
  Please provide a relevant and engaging response.
  If the user's input in Arabic seems like a day-off request, gently guide them by asking how you can help with that, but prioritize fulfilling other intents first if clearly stated.
  `,
});

const dayOffDetailsPrompt = ai.definePrompt({
  name: 'dayOffDetailsPrompt',
  input: { schema: InteractiveAgentInputSchema }, // User's current message
  output: { schema: DayOffDetailsSchema },
  prompt: `You are an HR assistant helping a user request time off.
The user's latest message is: "{{userInput}}"

Your goal is to collect:
1. Number of days for the leave.
2. The start date of the leave.
3. The reason for the leave (only ask for this after obtaining days and start date).

Analyze the user's input:
- Extract 'days', 'startDate', and 'reason' if provided.
- Determine if all three pieces of information are now available. Set 'isComplete' accordingly.
- Craft 'responseText':
    - If 'days' is missing, ask: "Okay, you'd like to request some time off. How many days would you like to take?"
    - If 'days' is present but 'startDate' is missing, ask: "Got it. And when would you like this leave to start?"
    - If 'days' and 'startDate' are present but 'reason' is missing, ask: "Understood. What's the reason for your time off?"
    - If 'days', 'startDate', and 'reason' are all present, set 'responseText' to a confirmation like: "Great! I've noted down your request for {days} starting on {startDate} for {reason}. (This is a simulated action and has been logged for now.)" and ensure 'isComplete' is true.
    - If the user's input seems unrelated to the ongoing day-off request, or if they seem to be abandoning the request, try to gently bring them back or ask for clarification. For example: "We were discussing your day off request. Are you still looking to proceed with that, or is there something else I can help with regarding the day off details?"

Respond with the extracted details and the 'responseText'.
Ensure the 'responseText' is polite and helpful. If the user is speaking in Arabic, respond in Arabic.
Example: If user says "أريد إجازة" (I want a vacation), and 'days' is missing, 'responseText' should be an Arabic question asking for the number of days.
If user says "3 أيام" (3 days) and 'startDate' is missing, 'responseText' should be an Arabic question asking for the start date.
If user says "ابتداء من الغد" (starting tomorrow) and 'reason' is missing, 'responseText' should be an Arabic question asking for the reason.
If user says "للسفر" (for travel) and all details are collected, 'responseText' should be a confirmation in Arabic.
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
    let dayOffDetails: z.infer<typeof DayOffDetailsSchema> | undefined = undefined;

    switch (recognizedIntent) {
      case "REQUEST_DAY_OFF":
        const { output: dayOffOutput } = await dayOffDetailsPrompt(input);
        if (dayOffOutput) {
          agentResponseText = dayOffOutput.responseText;
          dayOffDetails = dayOffOutput;
          if (dayOffOutput.isComplete) {
            console.log(`SIMULATED ACTION: Day-off request fully processed and logged: Days: ${dayOffOutput.days}, StartDate: ${dayOffOutput.startDate}, Reason: ${dayOffOutput.reason}`);
          }
        } else {
          agentResponseText = "I'm having a little trouble processing that day-off request. Could you please try rephrasing?";
        }
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
        const {output: generalOutput} = await generalConversationPrompt(input);
        agentResponseText = generalOutput?.agentResponse || "Sorry, I'm not sure how to respond to that.";
        break;
    }
    return { agentResponse: agentResponseText, recognizedIntent, dayOffRequestDetails: dayOffDetails };
  }
);

