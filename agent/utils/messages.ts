import type { AIMessage } from '@langchain/core/messages';

export function aiMessageToString(message: AIMessage | string, fallback = ''): string {
  if (typeof message === 'string') {
    return message;
  }

  if (typeof message.content === 'string') {
    return message.content;
  }

  if (Array.isArray(message.content)) {
    const text = message.content
      .map((item) => (typeof item === 'string' ? item : ''))
      .join(' ')
      .trim();

    return text || fallback;
  }

  return fallback;
}
