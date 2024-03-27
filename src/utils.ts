export type Nil = undefined | null;

export function isNil<T>(thing: T | Nil): thing is Nil {
  return !isPresent(thing);
}

export type Maybe<T> = T | null;

export function guard<T>(
  thing: Maybe<T>,
  message?: string,
): asserts thing is T {
  if (isNil(thing)) throw new Error(message ?? "Something required was nil");
}

export function insist<T>(thing: Maybe<T>, message?: string): T {
  guard(thing, message);
  return thing;
}

export type Result<Data, Error = Nil> = Error extends Nil
  ? [Data]
  : [Data, Nil] | [Nil, Error];

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
