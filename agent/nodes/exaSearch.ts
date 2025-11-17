import { Composio } from '@composio/core';
import { AgentStateType } from '../state';
import { retryAsync } from '@/lib/result';

const MAX_RESULTS = 8;
const DEFAULT_SOURCE_TITLE = 'Untitled Source';

export async function exaSearch(
  state: AgentStateType,
  composio: Composio,
  userId: string
): Promise<Partial<AgentStateType>> {
  if (state.status === 'error') {
    return {};
  }

  console.log('[EXA_SEARCH] Searching for:', state.question);

  const searchResult = await retryAsync(
    () =>
      composio.tools.execute('EXA', {
        userId,
        arguments: {
          query: state.question,
          numResults: MAX_RESULTS
        }
      }),
    3
  );

  return searchResult.match(
    (result) => {
      const data = result.data as Record<string, unknown>;
      const results = (data?.results as Array<Record<string, unknown>>) || [];

      const sources = results.slice(0, MAX_RESULTS).map((r) => ({
        url: (r.url as string) || '',
        title: (r.title as string) || DEFAULT_SOURCE_TITLE,
        snippet: (r.snippet as string) || '',
        content: ((r.text || r.snippet) as string) || ''
      }));

      console.log('[EXA_SEARCH] Found sources:', sources.length);

      return {
        sources,
        status: 'running' as const,
        error: null
      };
    },
    (error) => ({
      status: 'error' as const,
      error: `Search failed: ${error.message}`
    })
  );
}
