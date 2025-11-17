import { Composio } from '@composio/core';
import { AgentStateType } from '../state';
import { retryAsync } from '@/lib/result';

const DEFAULT_FOLDER_NAME = 'LangGraph Research';

export async function googleSaver(
  state: AgentStateType,
  composio: Composio,
  userId: string
): Promise<Partial<AgentStateType>> {
  if (state.status === 'error') {
    return {};
  }

  console.log('[GOOGLE_SAVER] Creating document...');

  const title = `Research - ${state.question.slice(0, 50)}`;

  const docCreation = await retryAsync(
    () =>
      composio.tools.execute('GOOGLEDOCS_CREATE_DOCUMENT', {
        userId,
        arguments: {
          title,
          content: state.draft
        }
      }),
    3
  );

  return docCreation.match(
    async (docResult) => {
      const data = docResult.data as Record<string, unknown>;
      const docUrl = (data?.documentUrl as string) || '';
      const docId =
        (data?.documentId as string) || (data?.id as string) || extractIdFromUrl(docUrl);

      let folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

      if (!folderId) {
        const folderName = process.env.GOOGLE_DRIVE_FOLDER_NAME || DEFAULT_FOLDER_NAME;
        const folderResult = await retryAsync(
          () =>
            composio.tools.execute('GOOGLEDRIVE_CREATE_FOLDER', {
              userId,
              arguments: {
                name: folderName
              }
            }),
          2
        );

        folderId = await folderResult.match(
          (folderResponse) => {
            const folderData = folderResponse.data as Record<string, unknown>;
            return (folderData?.id as string) || '';
          },
          (error) => {
            console.warn('[GOOGLE_SAVER] Unable to create folder:', error);
            return '';
          }
        );
      }

      if (docId && folderId) {
        await retryAsync(
          () =>
            composio.tools.execute('GOOGLEDRIVE_MOVE_FILE', {
              userId,
              arguments: {
                fileId: docId,
                folderId
              }
            }),
          2
        ).match(
          () => {
            console.log('[GOOGLE_SAVER] Doc moved to folder');
            return undefined;
          },
          (error) => {
            console.warn('[GOOGLE_SAVER] Failed to move doc:', error);
            return undefined;
          }
        );
      }

      console.log('[GOOGLE_SAVER] Doc created:', docUrl);

      return {
        docUrl,
        status: 'running' as const,
        error: null
      };
    },
    (error) => ({
      status: 'error' as const,
      error: `Google Docs save failed: ${error.message}`
    })
  );
}

function extractIdFromUrl(url: string): string {
  const match = url.match(/document\/d\/([^/]+)/);
  return match?.[1] ?? '';
}
