import { Composio } from '@composio/core';
import { AgentStateType } from '../state';
import { retryAsync } from '@/lib/result';

export async function gmailDrafter(
  state: AgentStateType,
  composio: Composio,
  userId: string,
  recipientEmail: string
): Promise<Partial<AgentStateType>> {
  if (state.status === 'error') {
    return {};
  }

  if (!recipientEmail) {
    return {
      status: 'complete' as const
    };
  }

  console.log('[GMAIL_DRAFTER] Creating draft for:', recipientEmail);

  const subject = `Research Complete: ${state.question.slice(0, 50)}`;
  const body = `Hi,

Your research query has been completed: "${state.question}"

View the full report here:
${state.docUrl}

Best regards`;

  const draftResult = await retryAsync(
    () =>
      composio.tools.execute('GMAIL_CREATE_DRAFT', {
        userId,
        arguments: {
          to: recipientEmail,
          subject,
          body
        }
      }),
    2
  );

  return draftResult.match(
    (result) => {
      const data = result.data as Record<string, unknown>;
      const gmailDraftId = (data?.id as string) || '';

      console.log('[GMAIL_DRAFTER] Draft created:', gmailDraftId);

      return {
        gmailDraftId
      };
    },
    (error) => ({
      status: 'error' as const,
      error: `Gmail draft failed: ${error.message}`
    })
  );
}
