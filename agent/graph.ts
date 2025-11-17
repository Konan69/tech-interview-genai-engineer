import { StateGraph, END } from '@langchain/langgraph';
import { Composio } from '@composio/core';
import { AgentState, AgentStateType } from './state';
import { planner } from './nodes/planner';
import { exaSearch } from './nodes/exaSearch';
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
  recipientEmail?: string,
  exaConnectionId?: string
) {
  const graph = new StateGraph(AgentState)
    .addNode('plan', planner)
    .addNode('search', (state: AgentStateType) =>
      exaSearch(state, composio, userId, exaConnectionId)
    )
    .addNode('summarize', summarizer)
    .addNode('compose', drafter)
    .addNode('save', (state: AgentStateType) => googleSaver(state, composio, userId))
    .addNode('email', (state: AgentStateType) =>
      gmailDrafter(state, composio, userId, recipientEmail || '')
    )
    .addNode('finalize', finalize)
    .addEdge('__start__', 'plan')
    .addEdge('plan', 'search')
    .addEdge('search', 'summarize')
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
