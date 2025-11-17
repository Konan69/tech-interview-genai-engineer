import { AgentStateType } from '../state';

export function finalize(state: AgentStateType): Partial<AgentStateType> {
  if (state.status === 'error') {
    return {};
  }

  return {
    status: 'complete' as const
  };
}
