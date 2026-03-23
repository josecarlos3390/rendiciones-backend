import { Mutex } from 'async-mutex';

const mutexes = new Map<string, Mutex>();

export function getTableMutex(tableName: string): Mutex {
  if (!mutexes.has(tableName)) {
    mutexes.set(tableName, new Mutex());
  }
  return mutexes.get(tableName)!;
}