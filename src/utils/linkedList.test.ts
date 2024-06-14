import { CircularIterator, LinkedList } from "./linkedList";

describe("LinkedList", () => {
  it("fulfills the Iterator Protocol", () => {
    const array = [1, 2, 3];
    const list = LinkedList.fromArray(array);
    expect([...list]).toEqual(array);

    const set = new Set(list);
    expect(set.size).toEqual(array.length);
  });
});

describe("CircularIterator", () => {
  it("throws errors when given an empty list", () => {
    expect(() => {
      CircularIterator.of(new LinkedList());
    }).toThrow();
  });

  it("iterates over a list and doesn't end", () => {
    const iterator = CircularIterator.of(LinkedList.fromArray([1, 2, 3]));
    expect(iterator.next()).toBe(1);
    expect(iterator.next()).toBe(2);
    expect(iterator.next()).toBe(3);
    expect(iterator.next()).toBe(1);
  });

  describe("after", () => {
    it("skips to after the given value", () => {
      const iterator = CircularIterator.of(LinkedList.fromArray([1, 2, 3]));
      expect(iterator.nextAfter(1)).toBe(2);
      expect(iterator.nextAfter(3)).toBe(1);
    });
  });

  describe("peek", () => {
    it("only returns the current value at the cursor", () => {
      const iterator = CircularIterator.of(LinkedList.fromArray([1, 2, 3]));
      expect(iterator.peek()).toBe(1);
      expect(iterator.next()).toBe(1);
      expect(iterator.peek()).toBe(2);
      expect(iterator.next()).toBe(2);
    });
  });

  describe("preview", () => {
    it("only returns value after the cursor", () => {
      const iterator = CircularIterator.of(LinkedList.fromArray([1, 2, 3]));
      expect(iterator.peek()).toBe(1);
      expect(iterator.preview()).toBe(2);
      iterator.next();

      expect(iterator.peek()).toBe(2);
      expect(iterator.preview()).toBe(3);
    });
  });
});
