import { Maybe, isEmpty } from "../utils";

export class Node<T> {
  private _next: Maybe<Node<T>> = null;

  constructor(public readonly value: T) {}

  set next(node: Maybe<Node<T>>) {
    this._next = node;
  }

  get next(): Maybe<Node<T>> {
    return this._next;
  }
}

export class LinkedList<T> implements Iterable<T> {
  private _head: Maybe<Node<T>> = null;
  private _tail: Maybe<Node<T>> = null;

  get head(): Maybe<Node<T>> {
    return this._head;
  }

  append(value: T): this {
    const node = new Node(value);

    if (!this._head) {
      this._head = node;
      this._tail = node;
    } else {
      if (this._tail === null) throw new Error("tail is null");
      this._tail.next = node;
      this._tail = node;
    }

    return this;
  }

  [Symbol.iterator]() {
    let current = this._head;
    return {
      next: () => {
        if (current === null) {
          return { done: true } as IteratorResult<T, undefined>;
        }

        const value = current.value;
        current = current.next;
        return { value };
      },
    };
  }

  static fromArray<T>(values: T[]): LinkedList<T> {
    const list = new LinkedList<T>();
    if (isEmpty(values)) return list;

    values.forEach(value => list.append(value));
    return list;
  }
}

// todo: this could be simplified to just use an array or set
export class CircularIterator<
  L extends LinkedList<T>,
  T = L extends LinkedList<infer U> ? U : never,
> {
  private _cursor: Node<T>;

  protected constructor(readonly list: L) {
    this._cursor = list.head!;
  }

  static of<L extends LinkedList<any>>(list: L) {
    if (list.head == null) throw new Error("Cannot iterate over an empty list");
    return new CircularIterator(list);
  }

  next(): T {
    const value = this._cursor.value;
    this._cursor = this._cursor.next ?? this.list.head!;
    return value;
  }

  nextAfter(value: T): T {
    let current = this.next();
    while (current !== value) {
      current = this.next();
    }
    return this.next();
  }

  peek(): T {
    return this._cursor.value;
  }

  preview(): T {
    return this._cursor.next?.value ?? this.list.head!.value;
  }
}
