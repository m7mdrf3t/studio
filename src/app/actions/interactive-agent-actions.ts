'use server';

import { getAgentResponse, type InteractiveAgentInput, type InteractiveAgentOutput } from '@/ai/flows/interactive-agent-flow';

export async function getAgentResponseAction(userInput: string): Promise<InteractiveAgentOutput> {
  if (!userInput.trim()) {
    return { agentResponse: "Please say something!" };
  }

  try {
    const input: InteractiveAgentInput = { userInput };
    const output = await getAgentResponse(input);
    return output;
  } catch (error) {
    console.error("Error getting agent response:", error);
    return { agentResponse: "Sorry, I encountered an error trying to respond." };
  }
}
