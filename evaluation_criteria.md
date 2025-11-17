# Evaluation Criteria

Candidates will be evaluated across the following dimensions:

## 1. Technical Implementation (65%)

### LangGraph Orchestration (15%)

- Successfully implements working LangGraph loop
- Proper node definitions and state management. Clear separation of nodes and tool wrappers.
- Correct edge transitions and conditional routing
- Implements loop control with guardrails (max iterations, budgets)
- State persistence across nodes (sources, notes, draft)
- Logical graph structure and flow
- Appropriate iteration budget and stopping criteria
- Sources tracked

### Composio MCP Integrations (20%)

- **Exa.ai Integration (5%)**

  - Successfully calls Exa search via Composio MCP
  - Retrieves and extracts relevant web content
  - Handles search results and content extraction

- **Google Docs Integration (5%)**

  - Creates/updates Google Doc via Composio MCP
  - Formats document with proper sections (Answer, Key Findings, Sources)
  - Includes headings and citations
  - Generates clean, structured output

- **Google Drive Integration (5%)**

  - Places document in specified Drive folder via Composio MCP
  - Allows users to select a folder

- **Gmail Integration (5%)**

  - Creates Gmail drafts via Composio MCP

### Frontend Interface (10%)

- Functional 1-page UI for query input
- Run button and agent invocation
- Displays step logs and planner decisions
- Returns chat results
- Usable MVP

### OAuth Implementation (20%)

- Allow any user to authenticate to the tool with their own account. End-user OAuth for Google Drive/Docs
- Session storage of tokens
- Secure token handling

## 2. System Architecture (10%)

### Error Handling & Resilience (5%)

- Implements timeouts and retries
- Gracefully handles API failures (rate limits, auth errors)
- Provides meaningful error messages
- Has sensible fallbacks for common failures

### Configuration Management (5%)

- Environment-based config via `.env`
- No secrets in code
- Proper MCP configuration files
- Clean separation of config and logic

## 3. Code Quality (15%)

### Readability and Organization (10%)

- Small, readable modules
- Proper TypeScript typing (where applicable)
- Clear function and variable names
- Logical code organization following suggested structure
- Proper separation of concerns (nodes, tools, API routes)

### Documentation (5%)

- Clear `approach.md` explaining:
  - Graph design decisions
  - Error handling strategy
  - Trade-offs made under time constraints
  - Known limitations and future improvements
- Comments on key implementation choices
- Setup and deployment instructions

## 4. Problem Solving & Communication (10%)

### MVP Choices Under Constraints (5%)

- Focuses on core functionality first
- Makes pragmatic decisions for 3-hour timeline - this project is designed to be hard to finish!
- Clearly identifies must-haves vs. nice-to-haves

### Technical Communication (5%)

- Clear explanation of design choices
- Discussion of trade-offs
- Notes on what would be improved with more time
- Realistic assessment of limitations
- Responds thoughtfully to questions
