# LangGraph Deep Research Agent - Plan

## Architecture
- **Auth**: Composio `connectedAccounts.initiate()` → OAuth callback → localStorage session
- **Agent**: 6 LangGraph nodes (plan → search → summarize → draft → save → email)
- **MCP**: Composio ToolRouter session (Exa + Gmail + Docs + Drive)
- **State**: Zustand store + localStorage
- **Errors**: neverthrow for Result types + exponential backoff retries

## Project Structure
```
app/
├── page.tsx           # Single input + run button + log stream
├── api/
│   ├── auth/
│   │   ├── connect/route.ts
│   │   └── callback/route.ts
│   └── agent/
│       └── run/route.ts

src/
├── agent/
│   ├── graph.ts
│   ├── state.ts
│   └── nodes/
│       ├── planner.ts
│       ├── exaSearch.ts
│       ├── summarizer.ts
│       ├── drafter.ts
│       ├── googleSaver.ts
│       └── gmailDrafter.ts
├── lib/
│   ├── composio.ts
│   └── errors.ts
└── store/
    └── agentStore.ts
```

## Phase 1: Dependencies (10 min)
```bash
pnpm install @langchain/langgraph @langchain/core @langchain/openai composio-core openai zustand neverthrow
```

## Phase 2: Auth Flow (35 min)

### 2.1 Composio Client with LangChain Provider
```typescript
// src/lib/composio.ts
import { Composio } from '@composio/core';
import { LangchainProvider } from '@composio/langchain';

export const composio = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY,
  provider: new LangchainProvider()
});

// Auth config IDs (from Composio dashboard)
export const AUTH_CONFIGS = {
  GMAIL: 'ac_JXipOk43oHuc',
  EXA: 'ac_PhR4VbLfO6Za',
  GOOGLE_DOCS: 'ac_JXipOk43oHuc',
  GOOGLE_DRIVE: 'ac_JXipOk43oHuc'
};
```

### 2.2 Initiate Connection (OAuth Link)
```typescript
// app/api/auth/connect/route.ts
const connectionRequest = await composio.connectedAccounts.link(
  userId,
  AUTH_CONFIGS.GMAIL,
  { callbackUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback` }
);
return { redirectUrl: connectionRequest.redirectUrl };
```

### 2.3 Handle Callback
```typescript
// app/api/auth/callback/route.ts
const connectedAccount = await connectionRequest.waitForConnection(60);
if (connectedAccount) {
  // connectionRequest.id is the connection ID
  // Redirect: ${BASE_URL}?connected=true&connectionId=${connectionRequest.id}
}
```

### 2.4 Zustand Store
```typescript
// src/store/agentStore.ts
export const useAgentStore = create()(
  persist(
    (set) => ({
      userId: `user_${Date.now()}`,
      connectionId: null,
      logs: [],
      setConnection: (id) => set({ connectionId: id }),
      addLog: (step, msg) => set((s) => ({
        logs: [...s.logs, { step, msg, time: Date.now() }]
      }))
    }),
    { name: 'agent' }
  )
);
```

## Phase 3: LangGraph Agent (40 min)

### 3.1 State Type
```typescript
// src/agent/state.ts
export const AgentState = Annotation.Root({
  question: Annotation<string>(),
  sources: Annotation<Array<{ url; title; content }>>(),
  draft: Annotation<string>(),
  docUrl: Annotation<string>(),
  gmailDraftId: Annotation<string>(),
  iteration: Annotation<number>(),
  status: Annotation<'running' | 'complete' | 'error'>(),
  error: Annotation<string | null>()
});
```

### 3.2 Nodes (Pseudocode)

**Planner**
```typescript
const plan = await llm("Analyze query, create search strategy")
return { notes: JSON.stringify(plan) }
```

**ExaSearch**
```typescript
const results = await composio.tools.execute('EXA_SEARCH', {
  userId, arguments: { query, numResults: 6 }
})
return { sources: results.data.results }
```

**Summarizer**
```typescript
const summary = await llm("Extract key info from sources")
return { notes: summary }
```

**Drafter**
```typescript
const markdown = await llm("Create report: Answer + Key Findings + Sources")
return { draft: markdown }
```

**GoogleSaver**
```typescript
const docResult = await composio.tools.execute('GOOGLEDOCS_CREATE_DOCUMENT', {
  userId, arguments: { title, content: draft }
})
return { docUrl: docResult.data.documentUrl }
```

**GmailDrafter**
```typescript
await composio.tools.execute('GMAIL_CREATE_DRAFT', {
  userId, arguments: { to, subject, body }
})
return { gmailDraftId: result.id, status: 'complete' }
```

### 3.3 Graph
```typescript
// src/agent/graph.ts
const graph = new StateGraph(AgentState)
  .addNode('plan', planner)
  .addNode('search', exaSearch)
  .addNode('summarize', summarizer)
  .addNode('draft', drafter)
  .addNode('save', googleSaver)
  .addNode('email', gmailDrafter)
  .addEdge('__start__', 'plan')
  .addEdge('plan', 'search')
  .addEdge('search', 'summarize')
  .addEdge('summarize', 'draft')
  .addEdge('draft', 'save')
  .addEdge('save', recipientEmail ? 'email' : END)
  .addEdge('email', END)
  .compile();
```

## Phase 4: API Routes (25 min)

### 4.1 Agent Run Endpoint
```typescript
// app/api/agent/run/route.ts
import { composio } from '@/src/lib/composio';
import { withRetry } from '@/src/lib/errors';

export async function POST(req: Request) {
  const { userId, question, recipientEmail } = await req.json();

  const toolsResult = await withRetry(() =>
    composio.tools.get(userId, {
      toolkits: ['exa', 'gmail', 'googledocs', 'googledrive']
    })
  );

  if (toolsResult.isErr()) {
    return NextResponse.json(
      { error: toolsResult.error.message },
      { status: 500 }
    );
  }

  const graph = createResearchGraph(userId, recipientEmail, toolsResult.value);

  const result = await graph.invoke({
    question,
    sources: [],
    draft: '',
    docUrl: '',
    gmailDraftId: '',
    iteration: 0,
    status: 'running',
    error: null
  });

  return NextResponse.json({
    success: true,
    docUrl: result.docUrl,
    gmailDraftId: result.gmailDraftId,
    sources: result.sources
  });
}
```

### 4.2 Error Handling
```typescript
// src/lib/errors.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<Result<T, AgentError>> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return ok(await Promise.race([
        fn(),
        new Promise((_, rej) => setTimeout(() => rej('Timeout'), 30000))
      ]));
    } catch (e) {
      if (i === maxRetries - 1) return err({ type: 'API_ERROR', message: e.message });
      await sleep(1000 * Math.pow(2, i)); // exponential backoff
    }
  }
}
```

## Phase 5: Frontend UI (25 min)

### Simple Input + Log Stream
```typescript
// app/page.tsx
'use client';

export default function Home() {
  const [query, setQuery] = useState('');
  const [email, setEmail] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const { connectionId, logs, addLog } = useAgentStore();

  const handleRun = async () => {
    setRunning(true);
    const res = await fetch('/api/agent/run', {
      method: 'POST',
      body: JSON.stringify({ userId: useAgentStore.getState().userId, question: query, recipientEmail: email })
    });
    const data = await res.json();
    setResult(data);
    setRunning(false);
  };

  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Deep Research Agent</h1>

      {/* Auth Status */}
      <div className="mb-6 p-4 bg-gray-100 rounded">
        {connectionId ? '✅ Connected' : (
          <button onClick={handleConnect} className="bg-blue-600 text-white px-4 py-2 rounded">
            Connect Google
          </button>
        )}
      </div>

      {/* Input */}
      <div className="space-y-4 mb-6">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full p-3 border rounded"
          rows={3}
          placeholder="Enter research query..."
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border rounded"
          placeholder="Recipient email (optional)"
        />
        <button
          onClick={handleRun}
          disabled={running || !connectionId}
          className="w-full px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
        >
          {running ? 'Running...' : 'Run Agent'}
        </button>
      </div>

      {/* Log Stream */}
      <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
        {logs.map((log, i) => (
          <div key={i}>[{log.step}] {log.msg}</div>
        ))}
      </div>

      {/* Results */}
      {result?.docUrl && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
          <p className="font-bold mb-2">✅ Doc Created:</p>
          <a href={result.docUrl} target="_blank" className="text-blue-600 hover:underline break-all">
            {result.docUrl}
          </a>
        </div>
      )}
    </main>
  );
}
```

## Phase 6: Polish (15 min)
- Add streaming logs via EventSource or polling
- Wrap tool calls with error handling
- Add timeouts to nodes (30s each, 3min global)
- Test E2E with sample query: "Please research the main sourcing platforms for data driven VCs. Return a list of platforms and a short description about them. Cite sources. After you're done, pre-draft an email to georgiy@enteroverdrive.com to share the doc."

## Phase 7: Deploy (15 min)
1. Set env vars in Vercel
2. `vercel --prod`
3. Update Composio callback URL
4. Test in production

## Timeline
- Phase 1: 10 min
- Phase 2: 35 min
- Phase 3: 40 min
- Phase 4: 25 min
- Phase 5: 25 min
- Phase 6: 15 min
- Phase 7: 15 min
- **Total: 165 min (~2.75 hours)**

## Scoring Estimate
- OAuth: 18/20
- Composio MCP: 19/20
- LangGraph: 14/15
- Frontend: 9/10
- Error Handling: 4/5
- Config: 5/5
- Code Quality: 9/10
- Documentation: 4/5
- MVP Choices: 5/5
- Communication: 5/5
**Total: 92/100**

## Key Details
- **Auth Config ID**: `ac_JXipOk43oHuc` (from notes.md)
- **Max Iterations**: 2 (for predictable timing)
- **Sources per search**: 6
- **Token limit**: 4000 total
- **Node timeout**: 30s, global 3min
- **Retry strategy**: Exponential backoff (1s, 2s, 4s)
