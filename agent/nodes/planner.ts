import { ChatOpenAI } from '@langchain/openai';
import { AgentStateType } from '../state';
import { retryAsync } from '@/lib/result';
import { aiMessageToString } from '../utils/messages';

const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0
});

export async function planner(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const prompt = `You are a research planner. Analyze this query and create a search strategy:

Query: ${state.question}

Provide:
1. Key topics to search
2. Specific search queries (2-3)
3. What information to prioritize

Keep it concise.`;

  const result = await retryAsync(() => llm.invoke(prompt), 2);

  return result.match(
    (response) => ({
      notes: aiMessageToString(response),
      status: 'running' as const,
      error: null
    }),
    (error) => ({
      status: 'error' as const,
      error: `Planner failed: ${error.message}`
    })
  );
}
