import { LLMEngine } from '@/types';

import { predict as predictWithHuggingFace } from './predictWithHuggingFace';

export const defaultLLMEngineName = `${process.env.LLM_ENGINE || ""}` as LLMEngine
export const defaultLLMEngineFunction = predictWithHuggingFace