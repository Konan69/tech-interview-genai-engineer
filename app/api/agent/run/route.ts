import { NextResponse } from 'next/server';
import { Composio, AuthScheme } from '@composio/core';
import { LangchainProvider } from '@composio/langchain';
import { createResearchGraph } from '@/agent/graph';

const GMAIL_AUTH_CONFIG_ID = 'ac_JXipOk43oHuc';
const EXA_AUTH_CONFIG_ID = 'ac_PhR4VbLfO6Za';

const composio = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY,
  provider: new LangchainProvider(),
  toolkitVersions: {
    gmail: '20251027_00',
    googledocs: '20251027_00',
    googledrive: '20251027_00' // Using same format as other toolkits - update if needed
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
    return {
      connectionId: connection.id,
      needsAuth: false
    };
  }

  // Otherwise, create new connection using link
  const connectionRequest = await composio.connectedAccounts.link(
    userId,
    authConfigId
  );

  const redirectUrl = connectionRequest.redirectUrl;

  // Return the redirect URL for the user to authenticate
  return {
    connectionId: null,
    needsAuth: true,
    redirectUrl
  };
}

async function getOrCreateExaConnection(userId: string, authConfigId: string) {
  // Check for existing connections first
  const existingConnections = await composio.connectedAccounts.list({
    userIds: [userId],
    authConfigIds: [authConfigId],
    statuses: ['ACTIVE']
  });

  // If connection exists, delete it to recreate with correct auth
  if (existingConnections.items && existingConnections.items.length > 0) {
    const connection = existingConnections.items[0];
    try {
      await composio.connectedAccounts.delete(connection.id);
    } catch (deleteError) {
      // Silently fail - will create new connection anyway
    }
  }

  // Exa uses API Key authentication - no redirect needed
  if (!process.env.EXA_API_KEY) {
    throw new Error('EXA_API_KEY environment variable is required');
  }

  const connectionRequest = await composio.connectedAccounts.initiate(
    userId,
    authConfigId,
    {
      config: AuthScheme.APIKey({
        api_key: process.env.EXA_API_KEY
      })
    }
  );

  return {
    connectionId: connectionRequest.id,
    needsAuth: false
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
    const exaAuthResult = await getOrCreateExaConnection(userId, EXA_AUTH_CONFIG_ID);

    // Only Gmail needs OAuth redirect, Exa uses API Key (immediate)
    if (gmailAuthResult.needsAuth) {
      return NextResponse.json({
        needsAuth: true,
        redirectUrl: gmailAuthResult.redirectUrl
      });
    }

    // Get the connected account and toolkit to find available versions
    const exaConnection = await composio.connectedAccounts.get(exaAuthResult.connectionId!);

    // Check if connection is ACTIVE
    if (exaConnection.status !== 'ACTIVE') {
      return NextResponse.json({
        error: `EXA connection not active: ${exaConnection.status}. Please check your API key and auth config.`
      }, { status: 400 });
    }

    // Get LangChain-compatible tools for the user
    const allTools = await composio.tools.get(userId, {
      tools: ['EXA_ANSWER', 'EXA_SEARCH', 'EXA_FIND_SIMILAR', 'GMAIL_CREATE_EMAIL_DRAFT', 'GOOGLEDOCS_CREATE_DOCUMENT']
    });

    // Create graph with composio instance, tools, and connection IDs
    // Note: Type assertion needed because Composio with LangchainProvider has different type than expected
    // and tools from LangchainProvider return LangChain-compatible tools
    const graph = createResearchGraph(
      composio as unknown as Composio,
      userId,
      allTools as unknown as Parameters<typeof createResearchGraph>[2],
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
      sources: result.sources,
      draft: result.draft,
      logs: []
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Something went wrong: ${errorMessage}` },
      { status: 500 }
    );
  }
}
