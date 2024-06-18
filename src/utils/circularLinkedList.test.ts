import { CircularLinkedList } from "./circularLinkedList";

describe("CircularLinkedList", () => {
  it("throws an error if instantiated with an empty list", () => {
    expect(() => CircularLinkedList.from([])).toThrow();
  });

  it("iterates over a list and doesn't end", () => {
    const list = CircularLinkedList.from([1, 2, 3]);
    expect(list.next()).toBe(1);
    expect(list.next()).toBe(2);
    expect(list.next()).toBe(3);
    expect(list.next()).toBe(1);
  });

  describe("after", () => {
    it("skips to after the given value", () => {
      const iterator = CircularLinkedList.from([1, 2, 3]);
      expect(iterator.nextAfter(1)).toBe(2);
      expect(iterator.nextAfter(3)).toBe(1);
    });
  });

  describe("peek", () => {
    it("only returns the current value at the cursor", () => {
      const iterator = CircularLinkedList.from([1, 2, 3]);
      expect(iterator.peek()).toBe(1);
      expect(iterator.next()).toBe(1);
      expect(iterator.peek()).toBe(2);
      expect(iterator.next()).toBe(2);
    });
  });

  describe("preview", () => {
    it("only returns value after the cursor", () => {
      const iterator = CircularLinkedList.from([1, 2, 3]);
      expect(iterator.peek()).toBe(1);
      expect(iterator.preview()).toBe(2);
      iterator.next();

      expect(iterator.peek()).toBe(2);
      expect(iterator.preview()).toBe(3);
    });
  });
});
