# Technical Interview – LangGraph Deep Research Agent

## Project Context

Build a small "deep research" agent that, given a user question, (1) researches on the web via Exa.ai (through Composio MCP), (2) drafts a structured answer, and (3) writes the result into a Google Doc saved in a Google Drive folder (both via Composio MCP), and (4) integrates with the user's Gmail account to pre-draft an email. Allow end-user OAuth so users can connect their own Google Drive/Docs.

Our goal is to test how well you can build LangGraph agents that perform multiple tasks, and allow users to authenticate with their credentials.

Deploy a 1-page frontend (Vercel preferred) deployment to query the agent through a chat.

Please note the @evaluation_criteria.md. Parts of the delivery are not weighted equally. We have provided complementary .cursor files.

You can use Python or JS to complete the requirements as you see fit.

## Challenge (3 hours)

Deliver an agent that:

1. **Accepts a natural-language query** from the user.

2. **Orchestrates a research loop with LangGraph:**

3. **Creates/updates a Google Doc** and saves it to a target Drive folder via Composio MCP (you can create any folder). Ideally, allow the user to authenticate with their Googl eDrive

4. **Pre-drafts a Gmail** to alert that the document is ready.

5. **Shows status + final link** to the Doc in 1-page.

## Technical Requirements

### Orchestration (LangGraph)

- **Nodes:** You can determine the nodes that are required.
- **Control:** Add simple guardrails (eg: max iterations, token/latency budgets).
- **Memory:** Add short-term memory, such that the agent recalls interactions within the session.

### Integrations (via Composio MCP servers)

- **Exa.ai MCP:** web search + content extraction.
- **Google Docs MCP:** create/update document with sections, headings, citations, and source list.
- **Google Drive MCP:** ensure document is placed into specified folder (create folder if missing).
- **Gmail MCP:** pre-draft an email to anyone.
- Keep credentials/config in `.env` and MCP config files.
- OAuth so users can authenticate their own Google and write to their own Drive/Docs.

### Frontend (1 page)

- **Inputs:** query text.
- **Controls:** Run button, show step logs (planner decisions), sources preview, link to final Doc.
- **Deploy on Vercel** (or anywhere public). No need for design polish, just clean and usable.

## Suggested Project Structure

```
/
├─ app/ (or pages/)      # Next.js/Vercel UI (single page)
├─ src/agent/
│  ├─ nodes/
│  └─ types.ts
├─ mcp/
│  ├─ composio.exa.config.json
│  ├─ composio.gdocs.config.json
│  └─ composio.gdrive.config.json
├─ server/
│  └─ api.ts             # minimal API route to invoke agent, if doing Vercel
├─ .env.template
├─ approach.md
└─ README.md
```

## Tools

- composio.dev
- supabase.com (if you need a database)
- vercel.com
- exa.ai
- drive.google.com
- gmail.com
- docs.google.com
- platform.openai.com

## Environment & Config

Add to `.env.template` (fill what you actually need):

```env
OPENAI_API_KEY=
COMPOSIO_API_KEY=
EXA_API_KEY=
NEXT_PUBLIC_BASE_URL=       # your deployed URL
```

## Getting Started

1. Fork the repo (or create one).
2. Populate `.env` from `.env.template`.
3. Configure Composio MCP servers for Exa, Google Docs, Google Drive.
4. Implement graph nodes incrementally:
   - Hardcode folder or create if missing
   - Create Doc with a title like `Research - <slug(question)>`
   - Append sections: Answer, Key Findings, Sources
5. Build the 1-page UI (Next.js). Add a button to invoke `/api/run-agent`.
6. Deploy to Vercel. Post the link.

## Expected Deliverables

1. **Live link** to the 1-page app (Vercel preferred).

2. **GitHub repo** with:

   - `README.md` (setup + run + deploy)
   - `approach.md` (graph design, iteration budget, error handling, future work)
   - Source code as per structure above

3. **A run that generates a Google Doc link** placed in the specified Drive folder.

## Sample request

1. Sample input a query, e.g., _"Please research the main sourcing platforms for data driven VCs. Return a list of platforms and a short description about them. Cite sources. After you're done, pre-draft an email to georgiy@enteroverdrive.com to share the doc."_
2. App shows step logs; completes within reasonable time.
3. Returns Google Doc URL containing:
   - Title
   - Answer (2–5 paragraphs)
   - Bullet Key Findings
   - Sources list with URLs
4. Doc exists in target Drive folder.
5. Email gets pre-drafted

## Rules and Guidelines

- You may use anything that helps you complete the task
- Feel free to use AI tools to assist your development
- You can ask clarifying questions at any time
- Focus on core functionality first
- Document any assumptions you make
- Time management is crucial - prioritize MVP features
- Do your best. If you don't finish, push the progress that you've made and explain how you would go about completing the rest of the project.

Good luck with the challenge! We're excited to see your solution.
