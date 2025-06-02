import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-actions.ts';
import '@/ai/flows/interactive-agent-flow.ts';
import '@/ai/flows/text-to-speech-flow.ts';
import '@/ai/flows/recognize-user-intent-flow.ts';
