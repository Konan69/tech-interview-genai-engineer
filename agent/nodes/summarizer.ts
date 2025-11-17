import { ChatOpenAI } from '@langchain/openai';
import { AgentStateType } from '../state';
import { retryAsync } from '@/lib/result';
import { aiMessageToString } from '../utils/messages';

const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0
});

export async function summarizer(state: AgentStateType): Promise<Partial<AgentStateType>> {
  if (state.status === 'error' || !state.sources?.length) {
    return {};
  }

  const sourcesText = state.sources
    .map(
      (s, i) =>
        `[${i + 1}] ${s.title}\nSnippet: ${s.snippet.slice(0, 200)}\nContent: ${s.content.slice(0, 400)}\n`
    )
    .join('\n');

  const prompt = `Extract the most relevant facts from these sources for the query: "${state.question}".

Sources:
${sourcesText}

Provide short bullet notes that the drafting step can rely on.`;

  const result = await retryAsync(() => llm.invoke(prompt), 2);

  return result.match(
    (response) => {
      const summary = aiMessageToString(response);
      const notes = [state.notes, summary].filter(Boolean).join('\n\n').trim();

      console.log('[SUMMARIZER]', summary);

      return {
        notes,
        status: 'running' as const,
        error: null
      };
    },
    (error) => ({
      status: 'error' as const,
      error: `Summarizer failed: ${error.message}`
    })
  );
}
