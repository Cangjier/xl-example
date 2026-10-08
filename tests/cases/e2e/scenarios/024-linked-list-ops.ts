// xl:title 链表：类 + 私有字段 + 迭代器协议 + 反转
// xl:round 305
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

class Node2<T> {
  constructor(public value: T, public next: Node2<T> | null = null) {}
}
class List<T> implements Iterable<T> {
  head: Node2<T> | null = null;
  push(v: T): this {
    const node = new Node2(v);
    if (!this.head) this.head = node;
    else {
      let cur = this.head;
      while (cur.next) cur = cur.next;
      cur.next = node;
    }
    return this;
  }
  *[Symbol.iterator](): Generator<T> {
    let cur = this.head;
    while (cur) {
      yield cur.value;
      cur = cur.next;
    }
  }
  reverse(): void {
    let prev: Node2<T> | null = null;
    let cur = this.head;
    while (cur) {
      const next = cur.next;
      cur.next = prev;
      prev = cur;
      cur = next;
    }
    this.head = prev;
  }
}
const list = new List<number>();
list.push(1).push(2).push(3);
console.log([...list].join(","));
list.reverse();
console.log([...list].join(","), [...list].length);
