// xl:title 端到端：自己写一个可迭代集合类，接上 for..of 与展开
// xl:round 323
// xl:judge stdout
// xl:end

class Bag<T> {
  private items: T[] = [];
  add(v: T): this { this.items.push(v); return this; }
  get size(): number { return this.items.length; }
  [Symbol.iterator](): Iterator<T> {
    let i = 0;
    const items = this.items;
    return { next: () => (i < items.length ? { value: items[i++], done: false } : { value: undefined as any, done: true }) };
  }
}
const b = new Bag<number>().add(1).add(2).add(3);
console.log([...b].join(","), b.size, Array.from(b).length);
for (const v of b) console.log(v * 2);
