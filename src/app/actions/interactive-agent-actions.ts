
'use server';

import { getAgentResponse, type InteractiveAgentInput, type InteractiveAgentOutput, type DayOffDetails } from '@/ai/flows/interactive-agent-flow';

export async function getAgentResponseAction(
  userInput: string,
  previousDayOffRequestDetails?: DayOffDetails // Use the exported DayOffDetails type
): Promise<InteractiveAgentOutput> {
  if (!userInput.trim()) {
    return { agentResponse: "Please say something!" };
  }

  try {
    const input: InteractiveAgentInput = { userInput, previousDayOffRequestDetails };
    const output = await getAgentResponse(input);
    return output;
  } catch (error) {
    console.error("Error getting agent response:", error);
    return { agentResponse: "Sorry, I encountered an error trying to respond." };
  }
}
