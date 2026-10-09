// xl:title 泛型类的静态成员与实例字段
// xl:round 330
// xl:judge stdout
// xl:end

class Box<T> {
  static count = 0;
  value: T;
  constructor(value: T) {
    this.value = value;
    Box.count = Box.count + 1;
  }
  map<U>(fn: (value: T) => U): Box<U> {
    return new Box<U>(fn(this.value));
  }
}
const one = new Box<number>(2);
const two = one.map((n) => String(n * 3));
console.log(one.value, two.value, Box.count);
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
