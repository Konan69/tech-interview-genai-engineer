# Approach

## Overview
This document outlines the design decisions, architecture, and trade-offs made in building the LangGraph Deep Research Agent within the 3-hour time constraint.

## Graph Design

### Node Architecture
The agent uses a 6-node graph structure:

1. **Planner** - Analyzes the user query and determines search strategy
2. **Exa Search** - Executes web search via Composio MCP and extracts content
3. **Summarize** - Processes search results and extracts key passages
4. **Draft** - Synthesizes findings into a structured answer with citations
5. **Save to Google** - Creates formatted Google Doc and places in Drive folder
6. **Done** - Terminal state

### State Management
State object tracks:
```typescript
{
  question: string
  sources: Array<{ url, title, snippet, content }>
  notes: string
  draft: string
  docUrl: string
  iteration: number
  status: 'running' | 'complete' | 'error'
}
```

### Conditional Routing
- `draft → exaSearch`: If confidence is low and iterations < MAX_ITERATIONS
- `draft → saveToGoogle`: If draft is ready or iteration budget exhausted
- Simple binary decision to keep complexity low

## Iteration Budget

### Budget: 2 iterations max
**Rationale:**
- Each iteration involves: search (5-10s) + LLM calls (3-5s) + content extraction (5-10s)
- Total time budget: ~3 minutes for full loop
- 2 iterations provide refinement without risk of timeout
- Allows one initial pass + one refinement if needed

### Token Budget
- Max 8 sources per iteration
- Trim each source to ~500 tokens
- Total context: ~4000 tokens + query + instructions
- Stays well within GPT-4 8k context window

## Error Handling Strategy

### Rate Limits
- Implemented exponential backoff (1s, 2s, 4s)
- Max 3 retries per API call
- Clear error messages to user if exhausted

### Timeout Handling
- 30s timeout per node execution
- 3-minute global timeout for full agent run
- Graceful degradation: save partial results if timeout occurs

### Auth Errors
- Validate MCP credentials at startup
- Clear instructions if Google OAuth fails
- Fallback to default folder if folder creation fails

### MCP Tool Failures
- Check tool responses for errors before proceeding
- Log tool outputs for debugging
- Skip to next source if individual URL fetch fails

## Trade-offs Made

### Shallow Loop (2 iterations)
- **Why**: Time constraint and timeout risk
- **Alternative**: Deeper loop with confidence scoring
- **Future**: Implement adaptive iteration based on query complexity

### Fixed Source Count
- **Why**: Predictable token usage and performance
- **Alternative**: Dynamic source selection based on relevance
- **Future**: Implement source deduplication and ranking

### Synchronous Flow
- **Why**: Simpler implementation, easier debugging
- **Alternative**: Parallel search + extraction
- **Future**: Concurrent API calls for faster execution

### Simple Folder Handling
- **Why**: MVP requires basic folder placement
- **Alternative**: Full folder hierarchy management
- **Future**: Support for nested folders and permissions

## Known Limitations

### Content Quality
- No source deduplication (may fetch similar content)
- No domain-based filtering (could get low-quality sources)
- Limited content extraction (text only, no images/tables)

### Error Recovery
- Partial failures not recovered (all-or-nothing approach)
- No caching of intermediate results
- Cannot resume failed runs

### UI/UX
- No real-time streaming of progress
- Basic error messages without retry UI
- No conversation history or follow-up questions

### Performance
- Sequential node execution (not parallelized)
- No caching of search results
- Full LLM calls for each iteration (no prompt optimization)

## Future Improvements

### High Priority
1. **Idempotent writes**: Update existing Doc on re-run (avoid duplicates)
2. **Source deduplication**: Group by domain, limit per domain
3. **Better progress UI**: WebSocket or SSE for real-time updates
4. **Caching layer**: Cache search results for 1 hour

### Medium Priority
1. **OAuth implementation**: User's own Google account
2. **Confidence scoring**: More intelligent iteration decisions
3. **Parallel execution**: Concurrent MCP tool calls
4. **Telemetry**: Structured logging and metrics

### Low Priority
1. **Conversation history**: Multi-turn research sessions
2. **Document templating**: Custom Doc formats
3. **Export formats**: PDF, Markdown in addition to Doc
4. **Advanced search**: Filters, date ranges, source types

## Testing Strategy

### Manual Testing
1. End-to-end flow with sample query
2. Error cases: invalid folder, rate limits
3. Edge cases: very long queries, no results found
4. Different query types: factual, analytical, comparative

### Validation Checklist
- [ ] Query accepted and parsed correctly
- [ ] Exa search returns relevant results
- [ ] Content extraction works for various URL types
- [ ] Draft includes 2-5 paragraphs
- [ ] Key findings formatted as bullets
- [ ] Sources list includes all URLs
- [ ] Doc created with correct title
- [ ] Doc placed in specified folder
- [ ] Link returned and accessible

## Deployment Considerations

### Vercel Compatibility
- All code is edge-compatible
- No file system dependencies
- Environment variables configured via Vercel UI
- Function timeout set to 3 minutes (Pro plan)

### Environment Setup
- Clear `.env.template` with all required keys
- Setup instructions in README
- Test environment validation at startup
- Graceful failures with helpful error messages

## Conclusion

This implementation prioritizes **working end-to-end functionality** over advanced features, making pragmatic trade-offs to deliver within the 3-hour constraint. The architecture is designed to be extended incrementally with the improvements outlined above.
