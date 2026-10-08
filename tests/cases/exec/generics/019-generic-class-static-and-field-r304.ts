// xl:title 泛型类的静态成员与实例字段
// xl:round 304
// xl:judge stdout
// xl:end

class Stack<T> {
  static created = 0;
  private items: T[] = [];
  constructor() { Stack.created += 1; }
  push(v: T): this { this.items.push(v); return this; }
  pop(): T | undefined { return this.items.pop(); }
  get size(): number { return this.items.length; }
}
const s = new Stack<number>().push(1).push(2);
console.log(s.pop(), s.size, Stack.created);
