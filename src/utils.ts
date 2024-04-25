export type Nil = undefined | null;

export type Maybe<T> = T | null;

export type Result<Data, Error = Nil> = Error extends Nil
  ? [Data]
  : [Data, Nil] | [Nil, Error];

export function isNil<T>(thing: T | Nil): thing is Nil {
  return !isPresent(thing);
}

export function guard<T>(thing: T | Nil, message?: string): asserts thing is T {
  if (isNil(thing)) throw new Error(message ?? "Something required was nil");
}

export function insist<T>(thing: T | Nil, message?: string): T {
  guard(thing, message);
  return thing;
}

export function isPresent<T>(thing: Maybe<T>): thing is T {
  return thing != null;
}

export function isEmpty<T>(list: T[] | string): boolean {
  return list.length === 0;
}

export function toRecord<Key extends string | number | symbol, T>(
  list: Key[],
  initializer: (key: Key) => T,
) {
  return Object.fromEntries(list.map(i => [i, initializer(i)]));
}

export function last<T>(list: T[]): Maybe<T> {
  return list[list.length - 1];
}

type Obj = { [key: string]: any };

export function merge(obj1: Obj, obj2: Obj) {
  if ("hasOwnProperty" in obj1) {
    obj1.has;
  }
  return {};
}

// Collections

//// Maps
export function values<T>(map: Map<any, T>): T[] {
  return Array.from(map.values());
}

export function keys<T>(map: Map<T, any>): T[] {
  return Array.from(map.keys());
}

//// Lists
export function indexBy<T extends Obj, Key extends keyof T>(
  list: T[],
  key: Key,
): Map<string, T> {
  return new Map(list.map(i => [i[key], i] as [string, T]));
}

export function prune<T>(list: Array<T | Nil>): T[] {
  return list.filter(isPresent) as T[];
}
