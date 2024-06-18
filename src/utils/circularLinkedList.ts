export class CircularLinkedList<T> implements Iterable<T> {
  private _cursor = 0;

  private constructor(private readonly _list: T[]) {}

  static from<T>(iterable: T[]): CircularLinkedList<T> {
    if (iterable.length === 0)
      throw new Error("Cannot create a circular list from an empty list");
    return new CircularLinkedList(Array.from(new Set(iterable)));
  }

  next(): T {
    const value = this._list[this._cursor];
    if (this._cursor === this._list.length - 1) {
      this._cursor = 0;
    } else {
      this._cursor += 1;
    }
    return value;
  }

  nextAfter(value: T): T {
    let next = this.next();
    while (next !== value) {
      next = this.next();
    }
    return this.peek();
  }

  peek(): T {
    return this._list[this._cursor];
  }

  preview(): T {
    let nextCursor =
      this._cursor === this._list.length - 1 ? 0 : this._cursor + 1;
    return this._list[nextCursor];
  }

  [Symbol.iterator]() {
    let iterator = this._list[Symbol.iterator]();
    return {
      next: () => {
        const { value, done } = iterator.next();

        if (done) {
          iterator = this._list[Symbol.iterator]();
          return iterator.next();
        }

        return { value };
      },
    };
  }
}
