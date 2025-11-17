import { ChatOpenAI } from '@langchain/openai';
import { AgentStateType } from '../state';
import { retryAsync } from '@/lib/result';
import { z } from 'zod';

const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0
});

const draftSchema = z.object({
  draft: z.string(),
  confidence: z.number().min(0).max(1)
});

const structuredDrafter = llm.withStructuredOutput(draftSchema);

export async function drafter(state: AgentStateType): Promise<Partial<AgentStateType>> {
  if (state.status === 'error') {
    return {};
  }

  const sourcesText = state.sources
    .map(
      (s, i) =>
        `[${i + 1}] ${s.title}\nURL: ${s.url}\nKey snippet: ${s.snippet.slice(0, 180)}\n`
    )
    .join('\n');

  const prompt = [
    [
      'system',
      `You are a research assistant. Draft a markdown report with sections: Answer, Key Findings, Sources.
Use inline citations like [1] referencing the provided sources. Return confidence between 0 and 1 based on how complete the information is.`
    ],
    [
      'human',
      `Question: ${state.question}

Helpful notes:
${state.notes || 'N/A'}

Sources:
${sourcesText}`
    ]
  ] as const;

  const result = await retryAsync(() => structuredDrafter.invoke(prompt), 2);

  return result.match(
    (payload) => {
      console.log('[DRAFTER] Created draft, confidence:', payload.confidence.toFixed(2));

      return {
        draft: payload.draft,
        confidence: payload.confidence,
        iteration: (state.iteration || 0) + 1,
        status: 'running' as const,
        error: null
      };
    },
    (error) => ({
      status: 'error' as const,
      error: `Drafting failed: ${error.message}`
    })
  );
}
