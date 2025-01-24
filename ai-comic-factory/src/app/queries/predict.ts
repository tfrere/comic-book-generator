"use server"

import { LLMPredictionFunctionParams } from '@/types';

import { defaultLLMEngineFunction } from './getLLMEngineFunction';

export async function predict(params: LLMPredictionFunctionParams): Promise<string> {
  // const llmEngineName = defaultLLMEngineName
  const llmEngineFunction = defaultLLMEngineFunction

  // console.log("predict: using " + llmEngineName)
  const results = await llmEngineFunction(params)

  // console.log("predict: result: " + results)
  return results
}
