interface Comparator<T> {
  (a: T, b: T): number;
}

class Container<T extends { id: number }> {
  private items: T[] = [];

  add(...items: T[]): this {
    this.items.push(...items);
    return this;
  }

  sort(compare: Comparator<T>): T[] {
    return [...this.items].sort(compare);
  }

  map<U>(fn: (item: T, index: number) => U): U[] {
    return this.items.map(fn);
  }

  get size(): number {
    return this.items.length;
  }
}

const container = new Container<{ id: number; name: string }>();
container.add({ id: 2, name: "b" }, { id: 1, name: "a" });
const names = container
  .sort((a, b) => a.id - b.id)
  .map((item) => item.name);
console.log(names, container.size);
