import { Annotation } from '@langchain/langgraph';

type Source = { url: string; title: string; snippet: string; content: string };

export const AgentState = Annotation.Root({
  question: Annotation<string>(),
  sources: Annotation<Source[]>({
    reducer: (x: Source[], y: Source[]) => {
      // Merge arrays and deduplicate by URL
      const merged = [...(x || []), ...(y || [])];
      const seenUrls = new Set<string>();
      return merged.filter((source) => {
        const url = source.url || '';
        if (!url || seenUrls.has(url)) {
          return false;
        }
        seenUrls.add(url);
        return true;
      });
    },
    default: () => []
  }),
  notes: Annotation<string>(),
  draft: Annotation<string>(),
  docUrl: Annotation<string>(),
  gmailDraftId: Annotation<string>(),
  iteration: Annotation<number>(),
  confidence: Annotation<number>(),
  status: Annotation<'running' | 'complete' | 'error'>({
    reducer: (x, y) => {
      // Handle undefined/null - if both are undefined, return running
      const xVal = x || 'running';
      const yVal = y || 'running';
      // If either is error, return error. Otherwise return running or complete (prefer complete)
      if (xVal === 'error' || yVal === 'error') return 'error';
      if (xVal === 'complete' || yVal === 'complete') return 'complete';
      return 'running';
    }
  }),
  error: Annotation<string | null>({
    reducer: (x, y) => x || y || null
  })
});

export type AgentStateType = typeof AgentState.State;
