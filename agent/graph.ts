import { StateGraph, END } from '@langchain/langgraph';
import { Composio } from '@composio/core';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { AgentState, AgentStateType } from './state';
import { exaSearch } from './nodes/exaSearch';
import { exaAnswer } from './nodes/exaAnswer';
import { summarizer } from './nodes/summarizer';
import { drafter } from './nodes/drafter';
import { googleSaver } from './nodes/googleSaver';
import { gmailDrafter } from './nodes/gmailDrafter';
import { finalize } from './nodes/finalize';

const MAX_ITERATIONS = 2;
const MIN_CONFIDENCE = 0.65;

export function createResearchGraph(
  composio: Composio,
  userId: string,
  tools: Record<string, StructuredToolInterface> | { tools: StructuredToolInterface[] } | StructuredToolInterface[],
  recipientEmail?: string,
  exaConnectionId?: string
) {
  // Convert tools to a record format
  let toolsRecord: Record<string, StructuredToolInterface>;

  if (Array.isArray(tools)) {
    toolsRecord = Object.fromEntries(tools.map(tool => [tool.name, tool]));
  } else if (tools && typeof tools === 'object' && 'tools' in tools && Array.isArray((tools as { tools: StructuredToolInterface[] }).tools)) {
    const toolsArray = (tools as { tools: StructuredToolInterface[] }).tools;
    toolsRecord = Object.fromEntries(toolsArray.map(tool => [tool.name, tool]));
  } else if (tools) {
    toolsRecord = tools as Record<string, StructuredToolInterface>;
  }
  const graph = new StateGraph(AgentState)
    .addNode('search', (state: AgentStateType) =>
      exaSearch(state, composio, userId, toolsRecord, exaConnectionId)
    )
    .addNode('exaAnswer', (state: AgentStateType) =>
      exaAnswer(state, composio, userId, toolsRecord, exaConnectionId)
    )
    .addNode('summarize', summarizer)
    .addNode('compose', drafter)
    .addNode('save', (state: AgentStateType) => googleSaver(state, composio as Composio, userId))
    .addNode('email', (state: AgentStateType) =>
      gmailDrafter(state, composio as Composio, userId, recipientEmail || '')
    )
    .addNode('finalize', finalize)
    // Parallel execution: both search and exaAnswer start from __start__
    .addEdge('__start__', 'search')
    .addEdge('__start__', 'exaAnswer')
    // Both converge into summarize (sources automatically merged and deduplicated by reducer)
    .addEdge('search', 'summarize')
    .addEdge('exaAnswer', 'summarize')
    // Continue with normal flow
    .addEdge('summarize', 'compose')
    .addConditionalEdges('compose', (state: AgentStateType) => {
      if (state.status === 'error') {
        return END;
      }

      const shouldIterate =
        (state.confidence ?? 0) < MIN_CONFIDENCE && (state.iteration ?? 0) < MAX_ITERATIONS;

      return shouldIterate ? 'search' : 'save';
    })
    .addConditionalEdges('save', (state: AgentStateType) => {
      if (state.status === 'error') {
        return 'finalize';
      }

      if (recipientEmail) {
        return 'email';
      }

      return 'finalize';
    })
    .addEdge('email', 'finalize')
    .addEdge('finalize', END)
    .compile();

  return graph;
}
