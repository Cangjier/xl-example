// xl:title 端到端：链表（类 + 泛型 + 迭代器协议）
// xl:round 623
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

class Node2<T> { next: Node2<T> | null = null; constructor(public value: T) {} }
class List<T> {
  head: Node2<T> | null = null;
  push(v: T) { const n = new Node2(v); n.next = this.head; this.head = n; return this; }
  *[Symbol.iterator]() { let c = this.head; while (c !== null) { yield c.value; c = c.next; } }
}
const l = new List<number>().push(1).push(2).push(3);
console.log([...l].join(","), [...l].length);
