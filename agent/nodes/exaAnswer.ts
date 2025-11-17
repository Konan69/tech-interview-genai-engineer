import type { StructuredToolInterface } from '@langchain/core/tools';
import { AgentStateType } from '../state';
import { callExaTool } from './exaUtils';

const EXA_ANSWER_TOOL_NAME = 'EXA_ANSWER';

export async function exaAnswer(
	state: AgentStateType,
	composio: unknown,
	userId: string,
	tools: Record<string, StructuredToolInterface>,
	connectedAccountId?: string
): Promise<Partial<AgentStateType>> {
	if (state.status === 'error') {
		return {};
	}

	const tool = tools[EXA_ANSWER_TOOL_NAME];
	if (!tool) {
		console.warn(`[EXA_ANSWER] Tool ${EXA_ANSWER_TOOL_NAME} not found. Skipping.`);
		return {
			sources: []
		};
	}

	try {
		const { sources, notes } = await callExaTool(tool, {
			query: state.question
		});

		return {
			sources,
			notes: notes || state.notes
		};
	} catch (error) {
		console.warn('[EXA_ANSWER] Failed:', error instanceof Error ? error.message : String(error));
		return {
			sources: []
		};
	}
}

