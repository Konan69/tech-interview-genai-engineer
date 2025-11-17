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

  // NOTE: Skipping Google Drive operations for now - we want to display the draft in the UI instead
  // TODO: Re-enable Google Docs/Drive saving when ready

  // Google Docs creation is skipped - we'll show the draft content directly in the UI
  // const title = `Research - ${state.question.slice(0, 50)}`;
  // const docCreation = await retryAsync(
  //   () =>
  //     composio.tools.execute('GOOGLEDOCS_CREATE_DOCUMENT', {
  //       userId,
  //       arguments: {
  //         title,
  //         content: state.draft
  //       }
  //     }),
  //   3
  // );

  // Google Drive folder creation and file moving is skipped
  // let folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '';
  // if (!folderId) {
  //   const folderName = process.env.GOOGLE_DRIVE_FOLDER_NAME || DEFAULT_FOLDER_NAME;
  //   const folderResult = await retryAsync(...);
  //   ...
  // }

  // Return state unchanged - the draft will be displayed in the UI
  return {
    status: 'running' as const,
    error: null
  };
}

function extractIdFromUrl(url: string): string {
  const match = url.match(/document\/d\/([^/]+)/);
  return match?.[1] ?? '';
}
