import type { StructuredToolInterface } from '@langchain/core/tools';
import { retryAsync } from '@/lib/result';

type Source = { url: string; title: string; snippet: string; content: string };
const DEFAULT_SOURCE_TITLE = 'Untitled Source';

/**
 * Calls an EXA tool directly with the given arguments (no LLM needed)
 */
export async function callExaTool(
  tool: StructuredToolInterface,
  args: Record<string, unknown>
): Promise<{ sources: Source[]; notes?: string }> {
  const toolResult = await retryAsync(() => tool.invoke(args), 3);

  return toolResult.match(
    (result) => {
      // Parse the result - it may come as a JSON string
      let parsedResult: Record<string, unknown>;
      if (typeof result === 'string') {
        try {
          parsedResult = JSON.parse(result) as Record<string, unknown>;
        } catch (parseError) {
          throw new Error(`Failed to parse tool result: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        }
      } else {
        parsedResult = result as Record<string, unknown>;
      }

      // Extract data from nested structure
      const data = parsedResult.data as Record<string, unknown> | undefined;
      
      // Handle EXA_SEARCH format: data.results
      const results = (data?.results as Array<Record<string, unknown>>) || [];
      
      // Handle EXA_ANSWER format: data.answer + data.citations or data.results
      const answer = (data?.answer as string) || (data?.text as string) || '';
      const citations = (data?.citations as Array<Record<string, unknown>>) || results;

      // Map to sources format
      const sources: Source[] = citations.map((item, index) => ({
        url: (item.url as string) || (item.id as string) || '',
        title: (item.title as string) || DEFAULT_SOURCE_TITLE,
        snippet: (item.snippet as string) || (item.text as string) || answer.slice(0, 200) || '',
        content: ((item.text || item.snippet || item.content) as string) || answer || ''
      }));

      // If EXA_ANSWER has answer but no citations, create a source entry
      if (answer && sources.length === 0) {
        sources.push({
          url: '',
          title: 'EXA Answer',
          snippet: answer.slice(0, 200),
          content: answer
        });
      }

      return {
        sources,
        notes: answer ? `EXA Answer: ${answer.slice(0, 500)}` : undefined
      };
    },
    (error) => {
      throw new Error(`Tool execution failed: ${error.message}`);
    }
  );
}

