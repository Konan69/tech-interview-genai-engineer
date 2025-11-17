import { Annotation } from '@langchain/langgraph';

export const AgentState = Annotation.Root({
  question: Annotation<string>(),
  sources: Annotation<
    Array<{ url: string; title: string; snippet: string; content: string }>
  >(),
  notes: Annotation<string>(),
  draft: Annotation<string>(),
  docUrl: Annotation<string>(),
  gmailDraftId: Annotation<string>(),
  iteration: Annotation<number>(),
  confidence: Annotation<number>(),
  status: Annotation<'running' | 'complete' | 'error'>(),
  error: Annotation<string | null>()
});

export type AgentStateType = typeof AgentState.State;
