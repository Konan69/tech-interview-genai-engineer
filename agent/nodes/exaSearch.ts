import type { StructuredToolInterface } from '@langchain/core/tools';
import { AgentStateType } from '../state';
import { callExaTool } from './exaUtils';

const EXA_SEARCH_TOOL_NAME = 'EXA_SEARCH';
const MAX_RESULTS = 8;

export async function exaSearch(
  state: AgentStateType,
  composio: unknown,
  userId: string,
  tools: Record<string, StructuredToolInterface>,
  connectedAccountId?: string
): Promise<Partial<AgentStateType>> {
  if (state.status === 'error') {
    return {};
  }

  const tool = tools[EXA_SEARCH_TOOL_NAME];
  if (!tool) {
    return {
      status: 'error' as const,
      error: `Tool ${EXA_SEARCH_TOOL_NAME} not found. Available: ${Object.keys(tools).join(', ')}`
    };
  }

  try {
    const { sources } = await callExaTool(tool, {
      query: state.question,
      numResults: MAX_RESULTS
    });

    return {
      sources: sources.slice(0, MAX_RESULTS)
    };
  } catch (error) {
    return {
      status: 'error' as const,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
