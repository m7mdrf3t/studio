// src/app/actions/voice-link-actions.ts
"use server";

import { suggestActions, type SuggestActionsInput, type SuggestActionsOutput } from '@/ai/flows/suggest-actions';

export async function getSuggestionsAction(transcription: string): Promise<SuggestActionsOutput> {
  if (!transcription.trim()) {
    return { suggestedActions: [] };
  }

  try {
    const input: SuggestActionsInput = { transcription };
    const output = await suggestActions(input);
    return output;
  } catch (error) {
    console.error("Error getting suggestions:", error);
    // It's better to throw a custom error or return an error structure
    // For now, re-throwing or returning an empty set.
    // throw new Error("Failed to get suggestions from AI."); 
    // Or, return a specific error structure if your client expects it:
    return { suggestedActions: ["Error: Could not fetch suggestions."] };
  }
}
