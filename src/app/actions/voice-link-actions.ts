// src/app/actions/voice-link-actions.ts
"use server";

import { suggestActions, type SuggestActionsInput, type SuggestActionsOutput } from '@/ai/flows/suggest-actions';

// This file might become obsolete if we fully switch to the interactive agent.
// For now, we keep it in case it's used elsewhere or for future features.

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
    return { suggestedActions: ["Error: Could not fetch suggestions."] };
  }
}
