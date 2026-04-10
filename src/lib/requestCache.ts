const inflightRequests = new Map<string, Promise<unknown>>();

export function runSingleFlight<T>(key: string, task: () => Promise<T>): Promise<T> {
  const existing = inflightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = task().finally(() => {
    if (inflightRequests.get(key) === promise) {
      inflightRequests.delete(key);
    }
  });

  inflightRequests.set(key, promise as Promise<unknown>);
  return promise;
}
