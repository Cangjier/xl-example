// 覆盖矩阵：**端到端**——一份「像人写的」普通 `.ts`，一次用上好几族。
//
// 前面三层量的是**一格一格**；这一层量的是**它们合起来**：
// 类 + 闭包 + 集合 + 解构 + 异常 + 异步 + 标准库，都在同一份文件里。
// 这一层的条数少，但每一条都是一份完整的程序——**它才是「普通 `.ts` 能不能直接跑」
// 最接近的读数**。

export const e2eCases = [
  {
    id: "e2e-word-count",
    title: "词频统计：split / Map / sort / entries",
    src: `
const text = "the quick brown fox jumps over the lazy dog the fox";
const counts = new Map<string, number>();
for (const word of text.split(" ")) {
  counts.set(word, (counts.get(word) ?? 0) + 1);
}
const ranked = [...counts.entries()].sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]));
for (const [word, n] of ranked.slice(0, 3)) console.log(word + ": " + n);
console.log("distinct", counts.size, "total", text.split(" ").length);
`,
  },
  {
    id: "e2e-bank-account",
    title: "账户与异常：自定义错误 + finally 记账 + 事务回滚",
    src: `
class InsufficientFunds extends Error {
  needed: number;
  constructor(needed: number) { super("need " + needed); this.name = "InsufficientFunds"; this.needed = needed; }
}
class Account {
  private log: string[] = [];
  owner: string;
  private balance: number;
  constructor(owner: string, balance: number) { this.owner = owner; this.balance = balance; }
  deposit(n: number): void { this.balance += n; this.log.push("+" + n); }
  withdraw(n: number): void {
    if (n > this.balance) throw new InsufficientFunds(n - this.balance);
    this.balance -= n;
    this.log.push("-" + n);
  }
  get amount(): number { return this.balance; }
  history(): string { return this.log.join(","); }
}
const a = new Account("kim", 100);
a.deposit(50);
try {
  a.withdraw(500);
} catch (e) {
  if (e instanceof InsufficientFunds) console.log("denied, short by", e.needed);
  else throw e;
} finally {
  console.log("balance after attempt", a.amount);
}
a.withdraw(30);
console.log(a.owner, a.amount, a.history());
`,
  },
  {
    id: "e2e-event-emitter",
    title: "事件总线：Map<string, 回调数组> + 闭包 + 剩余参数",
    src: `
class Emitter {
  private handlers = new Map<string, Array<(...args: any[]) => void>>();
  on(event: string, fn: (...args: any[]) => void): void {
    const list = this.handlers.get(event) ?? [];
    list.push(fn);
    this.handlers.set(event, list);
  }
  emit(event: string, ...args: any[]): number {
    const list = this.handlers.get(event) ?? [];
    for (const fn of list) fn(...args);
    return list.length;
  }
}
const bus = new Emitter();
let seen = 0;
bus.on("tick", (n: number) => { seen += n; console.log("tick", n); });
bus.on("tick", () => { console.log("second listener"); });
console.log("listeners", bus.emit("tick", 3), "seen", seen);
console.log("no listeners", bus.emit("nope"));
`,
  },
  {
    id: "e2e-data-pipeline",
    title: "数据管道：filter / map / reduce / 解构 / JSON",
    src: `
interface Order { id: number; total: number; paid: boolean; items: string[] }
const orders: Order[] = [
  { id: 1, total: 30, paid: true, items: ["a", "b"] },
  { id: 2, total: 0, paid: false, items: [] },
  { id: 3, total: 70, paid: true, items: ["c"] },
  { id: 4, total: 20, paid: false, items: ["d"] },
];
const paidTotal = orders.filter((o) => o.paid).reduce((sum, o) => sum + o.total, 0);
const unpaidIds = orders.filter((o) => !o.paid).map((o) => o.id);
const itemCount = orders.flatMap((o) => o.items).length;
console.log("paid", paidTotal, "unpaid", unpaidIds.join(","), "items", itemCount);
const summary = { paidTotal, unpaidIds };
console.log(JSON.stringify(summary));
const { paidTotal: again } = summary;
console.log("again", again === paidTotal);
`,
  },
  {
    id: "e2e-state-machine",
    title: "状态机：对象表 + switch + 方法分发",
    src: `
type State = "idle" | "running" | "done";
class Machine {
  state: State = "idle";
  steps = 0;
  next(): State {
    switch (this.state) {
      case "idle": this.state = "running"; break;
      case "running": this.steps++; if (this.steps >= 2) this.state = "done"; break;
      default: break;
    }
    return this.state;
  }
}
const m = new Machine();
const trace: State[] = [];
for (let i = 0; i < 4; i++) trace.push(m.next());
console.log(trace.join(">"), m.steps);
const table: Record<string, string> = { idle: "go", running: "wait", done: "reset" };
console.log(table[m.state]);
`,
  },
  {
    id: "e2e-generator-pipeline",
    title: "生成器管道：惰性的 take / map / filter",
    src: `
function* naturals(): any { let i = 0; while (true) { yield i++; } }
function* take(src: any, n: number): any { let c = 0; for (const v of src) { if (c++ >= n) return; yield v; } }
function* filter(src: any, ok: (v: number) => boolean): any { for (const v of src) if (ok(v)) yield v; }
function* map(src: any, f: (v: number) => number): any { for (const v of src) yield f(v); }
const pipeline = map(filter(take(naturals(), 20), (v) => v % 3 === 0), (v) => v * v);
console.log([...pipeline].join(","));
let sum = 0;
for (const v of take(naturals(), 5)) sum += v;
console.log(sum);
`,
  },
  {
    id: "e2e-async-workflow",
    title: "异步工作流：串行 / 并行 / 失败重试",
    src: `
async function fetchValue(n: number): Promise<number> {
  const v = await Promise.resolve(n * 2);
  return v;
}
async function serial(): Promise<number> {
  let total = 0;
  for (const n of [1, 2, 3]) total += await fetchValue(n);
  return total;
}
async function parallel(): Promise<number> {
  const xs = await Promise.all([1, 2, 3].map((n) => fetchValue(n)));
  return xs.reduce((a, b) => a + b, 0);
}
async function retry(times: number): Promise<string> {
  let attempts = 0;
  while (attempts < times) {
    attempts++;
    try {
      if (attempts < 3) throw new Error("flaky " + attempts);
      return "ok after " + attempts;
    } catch (e) {
      console.log("retrying:", (e as Error).message);
    }
  }
  return "gave up";
}
serial().then((v) => console.log("serial", v));
parallel().then((v) => console.log("parallel", v));
retry(5).then((v) => console.log(v));
console.log("sync end");
`,
  },
  {
    id: "e2e-matrix-stats",
    title: "二维数据：嵌套循环 / Math / 归约 / 类型化函数",
    src: `
const grid: number[][] = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];
const flat = grid.reduce((acc, row) => acc.concat(row), [] as number[]);
const mean = flat.reduce((a, b) => a + b, 0) / flat.length;
const max = Math.max(...flat);
const variance = flat.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / flat.length;
console.log("sum", flat.reduce((a, b) => a + b, 0), "mean", mean, "max", max);
console.log("variance", variance, "std", Math.sqrt(variance).toFixed(4));
const diagonal = grid.map((row, i) => row[i]);
console.log("diagonal", diagonal.join(","));
`,
  },
  {
    id: "e2e-inheritance-hierarchy",
    title: "继承体系：多态 + instanceof 分派 + 抽象基类",
    src: `
class Shape {
  name: string;
  constructor(name: string) { this.name = name; }
  area(): number { return 0; }
  describe(): string { return this.name + " area=" + this.area().toFixed(2); }
}
class Circle extends Shape {
  r: number;
  constructor(r: number) { super("circle"); this.r = r; }
  area(): number { return Math.PI * this.r * this.r; }
}
class Rect extends Shape {
  w: number;
  h: number;
  constructor(w: number, h: number) { super("rect"); this.w = w; this.h = h; }
  area(): number { return this.w * this.h; }
}
class Square extends Rect {
  constructor(side: number) { super(side, side); this.name = "square"; }
}
const shapes: Shape[] = [new Circle(1), new Rect(2, 3), new Square(4)];
for (const s of shapes) {
  const kind = s instanceof Square ? "sq" : s instanceof Rect ? "rect" : s instanceof Circle ? "circ" : "?";
  console.log(s.describe(), kind);
}
console.log("total", shapes.reduce((sum, s) => sum + s.area(), 0).toFixed(2));
`,
  },
  {
    id: "e2e-text-report",
    title: "文本报表：模板字面量 / padStart / repeat / 表格排版",
    src: `
interface Row { name: string; qty: number; price: number }
const rows: Row[] = [
  { name: "apple", qty: 3, price: 1.5 },
  { name: "banana", qty: 12, price: 0.25 },
  { name: "cherry", qty: 7, price: 3 },
];
const line = "-".repeat(34);
console.log(line);
console.log("item".padEnd(10) + "qty".padStart(5) + "total".padStart(12));
console.log(line);
let grand = 0;
for (const { name, qty, price } of rows) {
  const total = qty * price;
  grand += total;
  console.log(name.padEnd(10) + String(qty).padStart(5) + total.toFixed(2).padStart(12));
}
console.log(line);
console.log("grand total".padEnd(15) + grand.toFixed(2).padStart(12));
`,
  },
  {
    id: "e2e-linked-list",
    title: "链表 + 自定义迭代协议 + 与数组互转",
    src: `
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
`,
  },
  {
    id: "e2e-algorithms",
    title: "算法：插入排序 + 二分查找 + 字符串处理",
    src: `
function insertionSort(xs: number[]): number[] {
  const out = xs.slice();
  for (let i = 1; i < out.length; i++) {
    const cur = out[i];
    let j = i - 1;
    while (j >= 0 && out[j] > cur) { out[j + 1] = out[j]; j--; }
    out[j + 1] = cur;
  }
  return out;
}
function binarySearch(xs: number[], target: number): number {
  let lo = 0;
  let hi = xs.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (xs[mid] === target) return mid;
    if (xs[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}
const sorted = insertionSort([5, 3, 9, 1, 7]);
console.log(sorted.join(","), binarySearch(sorted, 7), binarySearch(sorted, 4));
const csv = "name,age\\nkim,30\\nlee,25";
const [header, ...lines] = csv.split("\\n");
console.log(header.split(",").length, lines.map((l) => l.split(",")[0]).join("|"));
`,
  },
  {
    id: "e2e-mixed-everything",
    title: "一锅端：类 + 生成器 + 承诺 + 异常 + 集合 + 解构",
    src: `
class Store {
  private data = new Map<string, number[]>();
  add(key: string, ...values: number[]): void {
    const list = this.data.get(key) ?? [];
    this.data.set(key, list.concat(values));
  }
  *keys(): any { for (const k of this.data.keys()) yield k; }
  async total(key: string): Promise<number> {
    const values = this.data.get(key);
    if (values === undefined) throw new Error("no key " + key);
    return values.reduce((a, b) => a + b, 0);
  }
}
const store = new Store();
store.add("a", 1, 2);
store.add("b", 10);
store.add("a", 3);
console.log([...store.keys()].join(","));
store.total("a").then((v) => console.log("total a", v));
store.total("zzz").catch((e: any) => console.log("missing:", e.message));
const snapshot = [...store.keys()].map((k) => k.toUpperCase());
console.log(snapshot.join("-"));
`,
  },
];
