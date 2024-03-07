export type Nil = undefined | null;

export type Maybe<T> = T | Nil;

export type Result<Data, Error = Nil> = Error extends Nil
  ? [Data]
  : [Data, Nil] | [Nil, Error];

export function isPresent<T>(thing: T | Nil): thing is T {
  return thing != null;
}
