import { ResultAsync, errAsync } from 'neverthrow';

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function retryAsync<T>(
  operation: () => Promise<T>,
  attempts = 3,
  delayMs = 500
): ResultAsync<T, Error> {
  return ResultAsync.fromPromise(operation(), toError).orElse((error) => {
    if (attempts <= 1) {
      return errAsync(error);
    }

    return ResultAsync.fromPromise(wait(delayMs), toError).andThen(() =>
      retryAsync(operation, attempts - 1, delayMs * 2)
    );
  });
}

export { toError };
