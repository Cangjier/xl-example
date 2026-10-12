// xl:title 链表 + 自定义迭代协议 + 与数组互转
// xl:judge stdout
// xl:end

class Node {
  next: Node | null = null;
  value: number;
  constructor(value: number) { this.value = value; }
}
class List {
  head: Node | null = null;
  push(v: number): this {
    const node = new Node(v);
    if (this.head === null) this.head = node;
    else { let cur = this.head; while (cur.next !== null) cur = cur.next; cur.next = node; }
    return this;
  }
  [Symbol.iterator](): any {
    let cur = this.head;
    return { next: () => { if (cur === null) return { value: 0, done: true }; const v = cur.value; cur = cur.next; return { value: v, done: false }; } };
  }
}
const list = new List();
list.push(1).push(2).push(3);
console.log([...list].join(","));
let sum = 0;
for (const v of list) sum += v;
console.log(sum, Array.from(list).length);
const doubled = [...list].map((v) => v * 2);
console.log(doubled.join(","));
