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
