import { NextResponse } from 'next/server';
import { Composio } from '@composio/core';
import { createResearchGraph } from '@/agent/graph';

const GMAIL_AUTH_CONFIG_ID = 'ac_JXipOk43oHuc';
const EXA_AUTH_CONFIG_ID = 'ac_PhR4VbLfO6Za';

const composio = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY,
  toolkitVersions: {
    EXA: 'latest'
  }
});

async function getOrCreateConnection(userId: string, authConfigId: string) {
  // Check for existing connections first
  const existingConnections = await composio.connectedAccounts.list({
    userIds: [userId],
    authConfigIds: [authConfigId],
    statuses: ['ACTIVE']
  });

  // If connection exists, return it
  if (existingConnections.items && existingConnections.items.length > 0) {
    const connection = existingConnections.items[0];
    console.log('[AUTH] Using existing connection:', connection.id);
    console.log('[AUTH] Connection toolkit:', connection.toolkit?.slug);
    return {
      connectionId: connection.id,
      needsAuth: false
    };
  }

  // Otherwise, create new connection using link
  console.log('[AUTH] No active connection found. Creating link...');
  const connectionRequest = await composio.connectedAccounts.link(
    userId,
    authConfigId
  );

  const redirectUrl = connectionRequest.redirectUrl;
  console.log('[AUTH] Redirect URL:', redirectUrl);

  // Return the redirect URL for the user to authenticate
  return {
    connectionId: null,
    needsAuth: true,
    redirectUrl
  };
}

export async function POST(req: Request) {
  const { userId, question, recipientEmail } = await req.json();

  if (!userId || !question) {
    return NextResponse.json(
      { error: 'Missing userId or question' },
      { status: 400 }
    );
  }

  try {
    // Get or create connections for required services
    const gmailAuthResult = await getOrCreateConnection(userId, GMAIL_AUTH_CONFIG_ID);
    const exaAuthResult = await getOrCreateConnection(userId, EXA_AUTH_CONFIG_ID);

    if (gmailAuthResult.needsAuth || exaAuthResult.needsAuth) {
      return NextResponse.json({
        needsAuth: true,
        redirectUrl: gmailAuthResult.redirectUrl || exaAuthResult.redirectUrl
      });
    }

    // Get the connected account to verify it's active
    const exaConnection = await composio.connectedAccounts.get(exaAuthResult.connectionId!);
    console.log('[AUTH] Exa connection details:', {
      id: exaConnection.id,
      status: exaConnection.status,
      toolkit: exaConnection.toolkit?.slug
    });

    // Create graph with composio instance and connection IDs
    const graph = createResearchGraph(
      composio,
      userId,
      recipientEmail,
      exaAuthResult.connectionId!
    );

    const result = await graph.invoke({
      question,
      sources: [],
      notes: '',
      draft: '',
      docUrl: '',
      gmailDraftId: '',
      iteration: 0,
      confidence: 0,
      status: 'running',
      error: null
    });

    if (result.status === 'error') {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Agent failed'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      docUrl: result.docUrl,
      gmailDraftId: result.gmailDraftId,
      sources: result.sources
    });
  } catch (err) {
    console.error('[ERROR]:', err);
    return NextResponse.json(
      { error: 'Something went wrong!' },
      { status: 500 }
    );
  }
}
