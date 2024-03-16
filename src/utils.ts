export type Nil = undefined | null;

export function isNil<T>(thing: T | Nil): thing is Nil {
  return !isPresent(thing);
}

export type Maybe<T> = T | null;

export type Result<Data, Error = Nil> = Error extends Nil
  ? [Data]
  : [Data, Nil] | [Nil, Error];

export function isPresent<T>(thing: Maybe<T>): thing is T {
  return thing != null;
}

export function isEmpty<T>(list: T[] | string): boolean {
  return list.length === 0;
}

export function toRecord<Key extends string | number | symbol, Collection>(
  list: Key[],
): Record<Key, Collection[]> {
  return list.reduce(
    (acc, key) => ({ ...acc, [key]: [] }),
    {} as Record<Key, Collection[]>,
  );
}
