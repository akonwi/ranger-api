// treat undefined and null the same when interacting with 3rd party libraries
export type Nil = undefined | null;

export function isNil<T>(thing: T | Nil): thing is Nil {
  return !isPresent(thing);
}

// prefer null for 1st party code
export type Maybe<T> = T | null;

export type NoNil<T> = {
  [P in keyof T]: Exclude<T[P], Nil>;
};

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

export type OK<Data> = { get(): Data; error: null };
export function ok<Data>(data: Data): OK<Data> {
  return { get: () => data, error: null };
}

export type NotOK<Error> = { get(): null; error: Error };
export function notOK<Error>(error: Error): NotOK<Error> {
  return { get: () => null, error };
}

export type Result<Data, Error = null> = OK<Data> | NotOK<Error>;

export function isOK<D, E>(result: Result<D, E>): result is OK<D> {
  const { get, error } = result;
  return isPresent(get()) && isNil(error);
}

export function isPresent<T>(thing: Maybe<T>): thing is T {
  return thing !== null && thing !== undefined;
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
