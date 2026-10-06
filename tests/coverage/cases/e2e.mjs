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

  // ===== 第 305 轮：加宽矩阵（12 条）=====

  {
    id: "c305-e2e-inventory-report",
    title: "库存报表：接口 + 类 + Map + 排序 + JSON + 模板串",
    src: `
interface Item { name: string; qty: number; price: number }
class Store {
  private items = new Map<string, Item>();
  add(item: Item): void { this.items.set(item.name, item); }
  total(): number {
    let sum = 0;
    for (const { qty, price } of this.items.values()) sum += qty * price;
    return sum;
  }
  report(): string[] {
    return [...this.items.values()]
      .sort((a, b) => b.qty * b.price - a.qty * a.price)
      .map(({ name, qty, price }) => name + " x" + qty + " = " + (qty * price).toFixed(2));
  }
}
const s = new Store();
s.add({ name: "bolt", qty: 10, price: 0.5 });
s.add({ name: "nut", qty: 4, price: 1.25 });
s.add({ name: "washer", qty: 100, price: 0.05 });
for (const line of s.report()) console.log(line);
console.log("total", s.total().toFixed(2));
console.log(JSON.stringify(s.report().length));
`,
  },
  {
    id: "c305-e2e-async-load-pipeline",
    title: "异步管道：`async function*` 逐个取数、`for await` 汇总",
    src: `
interface Row { id: number; ok: boolean }
async function fetchRow(id: number): Promise<Row> {
  await null;
  return { id, ok: id % 3 !== 0 };
}
async function* rows(n: number): AsyncGenerator<Row> {
  for (let i = 1; i <= n; i++) yield await fetchRow(i);
}
async function main(): Promise<void> {
  const good: number[] = [];
  const bad: number[] = [];
  for await (const r of rows(7)) {
    if (r.ok) good.push(r.id);
    else bad.push(r.id);
  }
  console.log("good", good.join(","));
  console.log("bad", bad.join(","));
  const counts = await Promise.all(good.map(async (id) => (await fetchRow(id)).id * 10));
  console.log("counts", counts.join(","));
}
main();
`,
  },
  {
    id: "c305-e2e-order-state-machine",
    title: "订单状态机：闭包 + `switch` + 抛错收尾",
    src: `
type State = "new" | "paid" | "shipped" | "done";
function machine(initial: State) {
  let state: State = initial;
  const log: string[] = [];
  return {
    send(event: string): State {
      switch (state) {
        case "new":
          if (event === "pay") { state = "paid"; break; }
          throw new Error("bad " + event + " in " + state);
        case "paid":
          if (event === "ship") { state = "shipped"; break; }
          throw new Error("bad " + event + " in " + state);
        case "shipped":
          if (event === "deliver") { state = "done"; break; }
          throw new Error("bad " + event + " in " + state);
        default:
          throw new Error("closed");
      }
      log.push(state);
      return state;
    },
    history(): string { return log.join(">"); },
  };
}
const m = machine("new");
console.log(m.send("pay"), m.send("ship"), m.send("deliver"));
console.log(m.history());
try { m.send("pay"); } catch (e) { console.log("stopped", (e as Error).message); }
`,
  },
  {
    id: "c305-e2e-lru-cache",
    title: "LRU 缓存：`Map` 的插入序 + 泛型 + 私有字段",
    src: `
class Lru<K, V> {
  #map = new Map<K, V>();
  constructor(private cap: number) {}
  get(k: K): V | undefined {
    if (!this.#map.has(k)) return undefined;
    const v = this.#map.get(k) as V;
    this.#map.delete(k);
    this.#map.set(k, v);
    return v;
  }
  set(k: K, v: V): void {
    if (this.#map.has(k)) this.#map.delete(k);
    this.#map.set(k, v);
    if (this.#map.size > this.cap) {
      const oldest = this.#map.keys().next().value as K;
      this.#map.delete(oldest);
    }
  }
  keys(): string { return [...this.#map.keys()].join(","); }
}
const c = new Lru<string, number>(2);
c.set("a", 1); c.set("b", 2);
console.log(c.get("a"), c.keys());
c.set("c", 3);
console.log(c.keys(), c.get("b"));
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c305-e2e-csv-stats",
    title: "CSV 解析与统计：`split` + `map` + `reduce` + `sort`",
    src: "\nconst csv = \"name,score\\nann,90\\nbob,75\\ncid,88\\ndee,75\";\nconst lines = csv.split(\"\\n\");\nconst header = lines[0].split(\",\");\nconst rows = lines.slice(1).map((line) => {\n  const cells = line.split(\",\");\n  const rec: Record<string, string | number> = {};\n  header.forEach((h, i) => { rec[h] = i === 0 ? cells[i] : Number(cells[i]); });\n  return rec as { name: string; score: number };\n});\nconst scores = rows.map((r) => r.score);\nconsole.log(\"n\", rows.length, \"max\", Math.max(...scores), \"min\", Math.min(...scores));\nconsole.log(\"avg\", (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2));\nconsole.log(\"pass\", rows.filter((r) => r.score >= 80).map((r) => r.name).sort().join(\",\"));\n",
  },
  {
    id: "c305-e2e-event-emitter-generic",
    title: "泛型事件总线：`Map` + `Set` + 回调 + `Array.from`",
    src: `
type Handler<T> = (payload: T) => void;
class Bus<T extends Record<string, unknown>> {
  #handlers = new Map<keyof T, Set<Handler<any>>>();
  on<K extends keyof T>(event: K, fn: Handler<T[K]>): void {
    const set = this.#handlers.get(event) ?? new Set<Handler<any>>();
    set.add(fn);
    this.#handlers.set(event, set);
  }
  emit<K extends keyof T>(event: K, payload: T[K]): number {
    const set = this.#handlers.get(event);
    if (!set) return 0;
    for (const fn of set) fn(payload);
    return set.size;
  }
  count(): number {
    let n = 0;
    for (const set of this.#handlers.values()) n += set.size;
    return n;
  }
}
const bus = new Bus<{ tick: number; name: string }>();
const seen: string[] = [];
bus.on("tick", (n) => seen.push("t" + n));
bus.on("tick", (n) => seen.push("T" + n * 2));
bus.on("name", (s) => seen.push("n:" + s));
console.log(bus.emit("tick", 3), bus.emit("name", "x"), bus.emit("tick", 1));
console.log(seen.join(","), bus.count());
`,
  },
  {
    id: "c305-e2e-bank-ledger",
    title: "账本：自定义错误类 + `try/catch` + `reduce` + 排序",
    src: `
class InsufficientFunds extends Error {
  constructor(readonly needed: number, readonly have: number) {
    super("need " + needed + " have " + have);
    this.name = "InsufficientFunds";
  }
}
class Account {
  private balance = 0;
  private log: string[] = [];
  deposit(n: number): void { this.balance += n; this.log.push("+" + n); }
  withdraw(n: number): void {
    if (n > this.balance) throw new InsufficientFunds(n, this.balance);
    this.balance -= n;
    this.log.push("-" + n);
  }
  get amount(): number { return this.balance; }
  history(): string { return this.log.join(" "); }
}
const a = new Account();
a.deposit(100);
a.withdraw(30);
try { a.withdraw(1000); } catch (e) {
  const err = e as InsufficientFunds;
  console.log(err.name, err.needed, err.have, err instanceof Error, err.message);
}
console.log(a.amount, a.history());
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c305-e2e-word-frequency",
    title: "词频：`Map` + 排序 + 大小写归一",
    src: `
const text = "the quick brown fox jumps over the lazy dog the fox";
const counts = new Map<string, number>();
for (const w of text.split(" ")) {
  const k = w.toLowerCase();
  counts.set(k, (counts.get(k) ?? 0) + 1);
}
const ranked = [...counts.entries()].sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]));
for (const [w, n] of ranked.slice(0, 3)) console.log(w, n);
console.log("unique", counts.size);
`,
  },
  {
    id: "c305-e2e-config-merge",
    title: "配置深合并：递归 + 展开 + `JSON` 往返",
    src: `
type Config = Record<string, any>;
function merge(base: Config, over: Config): Config {
  const out: Config = { ...base };
  for (const key of Object.keys(over)) {
    const a = out[key];
    const b = over[key];
    out[key] = a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)
      ? merge(a, b)
      : b;
  }
  return out;
}
const base = { server: { host: "localhost", port: 80 }, debug: false, tags: ["a"] };
const user = { server: { port: 8080 }, debug: true, tags: ["b"] };
const merged = merge(base, user);
console.log(JSON.stringify(merged));
console.log(merged.server.host, merged.server.port, merged.tags.join(","), base.server.port);
`,
  },
  {
    id: "c305-e2e-matrix-ops",
    title: "矩阵运算：嵌套数组 + `map` / `reduce` + 转置",
    src: `
type Matrix = number[][];
function transpose(m: Matrix): Matrix {
  return m[0].map((_, c) => m.map((row) => row[c]));
}
function multiply(a: Matrix, b: Matrix): Matrix {
  const bt = transpose(b);
  return a.map((row) => bt.map((col) => row.reduce((sum, v, i) => sum + v * col[i], 0)));
}
const A: Matrix = [[1, 2], [3, 4]];
const B: Matrix = [[5, 6], [7, 8]];
console.log(JSON.stringify(multiply(A, B)));
console.log(JSON.stringify(transpose(A)));
console.log(A.flat().reduce((a, b) => a + b, 0));
`,
  },
  {
    id: "c305-e2e-linked-list-ops",
    title: "链表：类 + 私有字段 + 迭代器协议 + 反转",
    src: `
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
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c305-e2e-functional-utils",
    title: "函数式小工具：`compose` / `pipe` / 柯里化 / 闭包计数器",
    src: `
type Fn = (n: number) => number;
const compose = (...fns: Fn[]): Fn => (n) => fns.reduceRight((acc, f) => f(acc), n);
const pipe = (...fns: Fn[]): Fn => (n) => fns.reduce((acc, f) => f(acc), n);
const add = (a: number) => (b: number) => a + b;
const inc: Fn = (n) => n + 1;
const dbl: Fn = (n) => n * 2;
console.log(compose(inc, dbl)(5), pipe(inc, dbl)(5), add(3)(4));
function counter(): () => number {
  let n = 0;
  return () => ++n;
}
const c1 = counter();
const c2 = counter();
console.log(c1(), c1(), c2(), c1());
`,
  },

  // ============ 第 323 轮加宽：10 条 ============
  {
    id: "c323-e2e-typed-config-merge",
    title: "端到端：带默认值的三层配置合并",
    src: `
interface Cfg { host: string; port: number; tls: { on: boolean; cert?: string }; tags: string[] }
const defaults: Cfg = { host: "localhost", port: 80, tls: { on: false }, tags: ["base"] };
const env: Partial<Cfg> = { port: 8080, tls: { on: true, cert: "c.pem" } };
const user: Partial<Cfg> = { host: "example.com", tags: ["user"] };

function merge(...parts: Partial<Cfg>[]): Cfg {
  const out = JSON.parse(JSON.stringify(defaults)) as Cfg;
  for (const p of parts) {
    for (const k of Object.keys(p) as (keyof Cfg)[]) {
      const v = p[k];
      if (v !== undefined) (out as any)[k] = v;
    }
  }
  return out;
}
const cfg = merge(env, user);
console.log(cfg.host, cfg.port, cfg.tls.on, cfg.tls.cert);
console.log(cfg.tags.length, JSON.stringify(Object.keys(cfg).sort()));
`,
  },
  {
    id: "c323-e2e-class-hierarchy-polymorphism",
    title: "端到端：抽象基类 + 三个子类 + 多态分派与排序",
    src: `
abstract class Employee {
  constructor(public name: string, protected base: number) {}
  abstract pay(): number;
  label(): string { return this.name + ":" + this.pay(); }
}
class Salaried extends Employee { pay() { return this.base; } }
class Hourly extends Employee {
  constructor(name: string, base: number, private hours: number) { super(name, base); }
  pay() { return this.base * this.hours; }
}
class Commission extends Salaried {
  constructor(name: string, base: number, private sales: number) { super(name, base); }
  pay() { return super.pay() + this.sales * 0.1; }
}
const staff: Employee[] = [new Salaried("a", 100), new Hourly("b", 10, 5), new Commission("c", 50, 200)];
for (const e of staff.sort((x, y) => y.pay() - x.pay())) console.log(e.label(), e instanceof Salaried);
console.log(staff.reduce((sum, e) => sum + e.pay(), 0));
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c323-e2e-async-retry-with-backoff",
    title: "端到端：异步重试与错误分类（不用定时器）",
    src: `
class Transient extends Error {}
async function attempt(n: number): Promise<string> {
  if (n < 3) throw new Transient("flaky " + n);
  return "ok@" + n;
}
async function withRetry(tries: number): Promise<string> {
  const failures: string[] = [];
  for (let i = 1; i <= tries; i++) {
    try { return await attempt(i); }
    catch (e) { failures.push((e as Error).message); }
  }
  throw new Error("gave up: " + failures.join("|"));
}
async function main() {
  console.log(await withRetry(5));
  try { await withRetry(2); } catch (e) { console.log((e as Error).message, e instanceof Error); }
}
main();
`,
  },
  {
    id: "c323-e2e-custom-iterable-collection",
    title: "端到端：自己写一个可迭代集合类，接上 for..of 与展开",
    src: `
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
`,
  },
  {
    id: "c323-e2e-text-table-report",
    title: "端到端：一张对齐的文本报表（补齐、截断、汇总）",
    src: `
type Row = { name: string; qty: number; price: number };
const rows: Row[] = [
  { name: "widget", qty: 3, price: 2.5 },
  { name: "a-very-long-name", qty: 1, price: 10 },
  { name: "gizmo", qty: 12, price: 0.75 },
];
const pad = (s: string, n: number) => (s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length));
const num = (s: string, n: number) => " ".repeat(Math.max(0, n - s.length)) + s;
console.log(pad("name", 18) + num("qty", 5) + num("total", 9));
for (const r of rows) console.log(pad(r.name, 18) + num(String(r.qty), 5) + num((r.qty * r.price).toFixed(2), 9));
const total = rows.reduce((s, r) => s + r.qty * r.price, 0);
console.log(pad("TOTAL", 18) + num("", 5) + num(total.toFixed(2), 9));
`,
  },
  {
    id: "c323-e2e-generator-pipeline-stages",
    title: "端到端：生成器搭的三段流水线",
    src: `
function* source(n: number) { for (let i = 1; i <= n; i++) yield i; }
function* doubled(xs: Iterable<number>) { for (const x of xs) yield x * 2; }
function* onlyEven(xs: Iterable<number>) { for (const x of xs) if (x % 4 === 0) yield x; }
const out = [...onlyEven(doubled(source(10)))];
console.log(out.join(","), out.length);
let first: number | undefined;
for (const v of onlyEven(doubled(source(5)))) { first = v; break; }
console.log(first);
`,
  },
  {
    id: "c323-e2e-word-index-and-search",
    title: "端到端：建一个倒排索引并做查询（只用字符串方法）",
    src: `
const docs: Record<string, string> = {
  d1: "the quick brown fox",
  d2: "the lazy dog sleeps",
  d3: "quick dogs and foxes",
};
const index = new Map<string, Set<string>>();
for (const id of Object.keys(docs)) {
  for (const raw of docs[id].split(" ")) {
    const w = raw.toLowerCase();
    if (!index.has(w)) index.set(w, new Set());
    index.get(w)!.add(id);
  }
}
function search(q: string): string {
  const hits = index.get(q.toLowerCase());
  return hits ? [...hits].sort().join(",") : "-";
}
console.log(search("the"), search("quick"), search("fox"), search("zzz"));
console.log(index.size, [...index.keys()].length);
`,
  },
  {
    id: "c323-e2e-state-machine-with-map",
    title: "端到端：用 Map 写的状态机驱动一段输入",
    src: `
type State = "idle" | "run" | "done";
const table: Record<State, Record<string, State>> = {
  idle: { start: "run" },
  run: { tick: "run", stop: "done" },
  done: {},
};
function drive(events: string[]): string[] {
  const seen: string[] = [];
  let cur: State = "idle";
  for (const ev of events) {
    const next = table[cur][ev];
    seen.push(cur + "-" + ev + "->" + (next ?? "?"));
    if (!next) break;
    cur = next;
  }
  return seen;
}
console.log(drive(["start", "tick", "tick", "stop", "tick"]).join(" | "));
console.log(drive(["tick"]).join(" | "));
`,
  },
  {
    id: "c323-e2e-error-boundary-and-cleanup",
    title: "端到端：资源清理与错误边界（try/finally 嵌套）",
    src: `
const log: string[] = [];
function withResource<T>(name: string, body: () => T): T {
  log.push("open:" + name);
  try { return body(); } finally { log.push("close:" + name); }
}
function work(fail: boolean): string {
  return withResource("db", () => {
    withResource("tx", () => { if (fail) throw new Error("boom"); });
    return "committed";
  });
}
console.log(work(false));
try { work(true); } catch (e) { console.log("caught", (e as Error).message); }
console.log(log.join(","));
`,
  },
  {
    id: "c323-e2e-memoize-and-generics",
    title: "端到端：泛型 memoize + 递归 DP",
    src: `
function memo<A extends string | number, R>(f: (k: A) => R): (k: A) => R {
  const cache = new Map<A, R>();
  return (k: A) => {
    if (!cache.has(k)) cache.set(k, f(k));
    return cache.get(k)!;
  };
}
let calls = 0;
const fib = memo((n: number): number => { calls += 1; return n < 2 ? n : fib(n - 1) + fib(n - 2); });
console.log(fib(20), calls);
const key = memo((s: string) => s.toUpperCase() + "!");
console.log(key("a"), key("a"), key("b"));
`,
  },
  // ===== 第 330 轮收编（10 条）=====
  {
    id: "c330-e2e-priority-queue",
    title: "优先队列：二叉堆 + 比较器 + 泛型",
    src: `
class PriorityQueue<T> {
  private heap: T[] = [];
  private better: (a: T, b: T) => boolean;
  constructor(better: (a: T, b: T) => boolean) {
    this.better = better;
  }
  get size(): number {
    return this.heap.length;
  }
  push(value: T): void {
    this.heap.push(value);
    let i = this.heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.better(this.heap[i], this.heap[parent])) break;
      const tmp = this.heap[i];
      this.heap[i] = this.heap[parent];
      this.heap[parent] = tmp;
      i = parent;
    }
  }
  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop() as T;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      let i = 0;
      for (;;) {
        const left = i * 2 + 1;
        const right = left + 1;
        let best = i;
        if (left < this.heap.length && this.better(this.heap[left], this.heap[best])) best = left;
        if (right < this.heap.length && this.better(this.heap[right], this.heap[best])) best = right;
        if (best === i) break;
        const tmp = this.heap[i];
        this.heap[i] = this.heap[best];
        this.heap[best] = tmp;
        i = best;
      }
    }
    return top;
  }
}

const pq = new PriorityQueue<number>((a, b) => a < b);
for (const n of [5, 1, 9, 3, 7, 2]) pq.push(n);
const out: number[] = [];
while (pq.size > 0) out.push(pq.pop() as number);
console.log(out.join(","));
`,
  },
  {
    id: "c330-e2e-graph-bfs",
    title: "图的最短路径：邻接表 + 队列 + 距离表",
    src: `
const graph: { [k: string]: string[] } = {
  a: ["b", "c"],
  b: ["d"],
  c: ["d", "e"],
  d: ["e"],
  e: [],
};
function distances(from: string): { [k: string]: number } {
  const dist: { [k: string]: number } = { [from]: 0 };
  const queue: string[] = [from];
  while (queue.length > 0) {
    const node = queue.shift() as string;
    for (const next of graph[node]) {
      if (Object.prototype.hasOwnProperty.call(dist, next)) continue;
      dist[next] = dist[node] + 1;
      queue.push(next);
    }
  }
  return dist;
}
const d = distances("a");
for (const key of Object.keys(d).sort()) console.log(key, d[key]);
`,
  },
  {
    id: "c330-e2e-trie-prefix",
    title: "前缀树：插入 / 查询 / 前缀收集",
    src: `
class TrieNode {
  children = new Map<string, TrieNode>();
  isWord = false;
}
class Trie {
  root = new TrieNode();
  insert(word: string): void {
    let node = this.root;
    for (const ch of word) {
      let next = node.children.get(ch);
      if (next === undefined) {
        next = new TrieNode();
        node.children.set(ch, next);
      }
      node = next;
    }
    node.isWord = true;
  }
  has(word: string): boolean {
    let node = this.root;
    for (const ch of word) {
      const next = node.children.get(ch);
      if (next === undefined) return false;
      node = next;
    }
    return node.isWord;
  }
  withPrefix(prefix: string): string[] {
    let node = this.root;
    for (const ch of prefix) {
      const next = node.children.get(ch);
      if (next === undefined) return [];
      node = next;
    }
    const found: string[] = [];
    const walk = (at: TrieNode, sofar: string): void => {
      if (at.isWord) found.push(sofar);
      for (const [ch, child] of at.children) walk(child, sofar + ch);
    };
    walk(node, prefix);
    return found.sort();
  }
}
const trie = new Trie();
for (const w of ["cat", "car", "card", "dog", "do"]) trie.insert(w);
console.log(trie.has("car"), trie.has("ca"), trie.has("dog"));
console.log(trie.withPrefix("ca").join(","));
console.log(trie.withPrefix("z").length);
`,
  },
  {
    id: "c330-e2e-rpn-calculator",
    title: "逆波兰计算器：栈 + 运算符表 + 报错",
    src: `
function evaluate(expr: string): number {
  const ops: { [k: string]: (a: number, b: number) => number } = {
    "+": (a, b) => a + b,
    "-": (a, b) => a - b,
    "*": (a, b) => a * b,
    "/": (a, b) => a / b,
  };
  const stack: number[] = [];
  for (const token of expr.split(" ")) {
    const op = ops[token];
    if (op !== undefined) {
      const b = stack.pop() as number;
      const a = stack.pop() as number;
      stack.push(op(a, b));
      continue;
    }
    stack.push(Number(token));
  }
  if (stack.length !== 1) throw new Error("bad expression: " + expr);
  return stack[0];
}
console.log(evaluate("3 4 + 2 *"));
console.log(evaluate("10 2 / 3 -"));
try {
  evaluate("1 2");
} catch (e) {
  console.log((e as Error).message);
}
`,
  },
  {
    id: "c330-e2e-text-table",
    title: "文本表格：列宽 + 对齐 + 数字右对齐",
    src: `
type Row = { name: string; qty: number; price: number };
const rows: Row[] = [
  { name: "apple", qty: 3, price: 1.5 },
  { name: "kiwi", qty: 12, price: 0.75 },
  { name: "watermelon", qty: 1, price: 6 },
];
function pad(text: string, width: number, right: boolean): string {
  let out = text;
  while (out.length < width) out = right ? " " + out : out + " ";
  return out;
}
const widths = [
  Math.max(...rows.map((r) => r.name.length), 4),
  Math.max(...rows.map((r) => String(r.qty).length), 3),
  Math.max(...rows.map((r) => r.price.toFixed(2).length), 5),
];
console.log(pad("name", widths[0], false) + " | " + pad("qty", widths[1], true) + " | " + pad("price", widths[2], true));
console.log("-".repeat(widths[0] + widths[1] + widths[2] + 6));
let total = 0;
for (const row of rows) {
  total = total + row.qty * row.price;
  console.log(pad(row.name, widths[0], false) + " | " + pad(String(row.qty), widths[1], true)
    + " | " + pad(row.price.toFixed(2), widths[2], true));
}
console.log("total =", total.toFixed(2));
`,
  },
  {
    id: "c330-e2e-json-path",
    title: "按路径取值：点号路径 + 缺省 + 数组下标",
    src: `
const data = {
  user: { name: "ada", tags: ["math", "code"], address: { city: "london" } },
  items: [{ id: 1 }, { id: 2 }],
};
function pick(root: unknown, path: string, fallback: unknown): unknown {
  let current: any = root;
  for (const step of path.split(".")) {
    if (current === null || current === undefined) return fallback;
    current = current[step];
  }
  return current === undefined ? fallback : current;
}
console.log(pick(data, "user.name", "-"));
console.log(pick(data, "user.address.city", "-"));
console.log(pick(data, "user.missing.deep", "none"));
console.log(pick(data, "items.1.id", -1));
console.log(pick(data, "user.tags.0", "-"));
`,
  },
  {
    id: "c330-e2e-inventory-grouping",
    title: "库存报表：Map 分组 + 排序 + 汇总",
    src: `
type Item = { sku: string; category: string; qty: number; unit: number };
const items: Item[] = [
  { sku: "a1", category: "tool", qty: 2, unit: 10 },
  { sku: "b1", category: "food", qty: 5, unit: 3 },
  { sku: "a2", category: "tool", qty: 1, unit: 25 },
  { sku: "b2", category: "food", qty: 4, unit: 2 },
  { sku: "c1", category: "toy", qty: 7, unit: 1 },
];
const byCategory = new Map<string, Item[]>();
for (const item of items) {
  const bucket = byCategory.get(item.category);
  if (bucket === undefined) byCategory.set(item.category, [item]);
  else bucket.push(item);
}
const report: { category: string; count: number; value: number }[] = [];
for (const [category, list] of byCategory) {
  let value = 0;
  for (const item of list) value = value + item.qty * item.unit;
  report.push({ category, count: list.length, value });
}
report.sort((a, b) => b.value - a.value);
for (const row of report) console.log(row.category, row.count, row.value);
`,
  },
  {
    id: "c330-e2e-async-batch",
    title: "异步分批处理：串行 + 结果汇总 + 错误兜底",
    src: `
async function fetchOne(id: number): Promise<string> {
  await null;
  if (id === 3) throw new Error("boom " + id);
  return "item-" + id;
}
async function run(): Promise<void> {
  const ok: string[] = [];
  const failed: string[] = [];
  for (const id of [1, 2, 3, 4]) {
    try {
      ok.push(await fetchOne(id));
    } catch (e) {
      failed.push((e as Error).message);
    }
  }
  console.log(ok.join("|"));
  console.log(failed.join("|"));
  const all = await Promise.all([fetchOne(1), fetchOne(2)]);
  console.log(all.length, all[1]);
}
run();
`,
  },
  {
    id: "c330-e2e-word-wrap",
    title: "文本折行：宽度 + 长单词 + 段落",
    src: `
function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (line.length === 0) {
      line = word;
      continue;
    }
    if (line.length + 1 + word.length <= width) {
      line = line + " " + word;
      continue;
    }
    lines.push(line);
    line = word;
  }
  if (line.length > 0) lines.push(line);
  return lines;
}
const text = "the quick brown fox jumps over the lazy dog near the river bank";
const lines = wrap(text, 20);
for (const line of lines) console.log("[" + line + "]");
console.log(lines.length);
`,
  },
  {
    id: "c330-e2e-custom-iterable-collection",
    title: "自定义可迭代集合：Symbol.iterator + for..of + 展开",
    src: `
class Range {
  from: number;
  to: number;
  constructor(from: number, to: number) {
    this.from = from;
    this.to = to;
  }
  [Symbol.iterator](): { next(): { value: number; done: boolean } } {
    let at = this.from;
    const stop = this.to;
    return {
      next(): { value: number; done: boolean } {
        if (at >= stop) return { value: 0, done: true };
        const value = at;
        at = at + 1;
        return { value, done: false };
      },
    };
  }
}
const range = new Range(1, 5);
const collected: number[] = [];
for (const n of range) collected.push(n * n);
console.log(collected.join(","));
console.log([...range].length);
console.log(Array.from(range).join("-"));
`,
  },
  // ===== 第 331 轮收编（10 条）=====
  {
    id: "c331-e2e-cli-args",
    title: "命令行参数解析：两种写法、缺省值、未知项",
    src: `
function parse(argv: string[]): { flags: Record<string, string | boolean>; rest: string[] } {
  const flags: Record<string, string | boolean> = {};
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      rest.push(token);
      continue;
    }
    const eq = token.indexOf("=");
    if (eq >= 0) {
      flags[token.slice(2, eq)] = token.slice(eq + 1);
      continue;
    }
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags[token.slice(2)] = next;
      i = i + 1;
      continue;
    }
    flags[token.slice(2)] = true;
  }
  return { flags, rest };
}
const parsed = parse(["--name=ada", "--verbose", "--out", "dist", "input.ts", "extra.ts"]);
console.log(parsed.flags["name"], parsed.flags["verbose"], parsed.flags["out"]);
console.log(parsed.rest.join(","));
console.log(Object.keys(parsed.flags).sort().join(","));
`,
  },
  {
    id: "c331-e2e-pagination",
    title: "分页：切片、边界页与越界页",
    src: `
const items: number[] = [];
for (let i = 1; i <= 23; i++) items.push(i);
function page(all: number[], size: number, index: number): number[] {
  const from = index * size;
  return all.slice(from, from + size);
}
for (const index of [0, 2, 3, 99]) {
  const got = page(items, 5, index);
  console.log(index, got.length, got.length > 0 ? got[0] + ".." + got[got.length - 1] : "-");
}
console.log(Math.ceil(items.length / 5));
`,
  },
  {
    id: "c331-e2e-shopping-cart",
    title: "购物车：Map 计数、折扣、格式化金额",
    src: `
type Line = { sku: string; price: number; qty: number };
class Cart {
  private lines = new Map<string, Line>();
  add(sku: string, price: number, qty = 1): void {
    const found = this.lines.get(sku);
    if (found === undefined) {
      this.lines.set(sku, { sku, price, qty });
      return;
    }
    found.qty = found.qty + qty;
  }
  subtotal(): number {
    let total = 0;
    for (const line of this.lines.values()) total = total + line.price * line.qty;
    return total;
  }
  discount(): number {
    const base = this.subtotal();
    return base >= 100 ? base * 0.1 : 0;
  }
  report(): string[] {
    const out: string[] = [];
    for (const line of this.lines.values()) {
      out.push(line.sku + " x" + line.qty + " = " + (line.price * line.qty).toFixed(2));
    }
    out.push("subtotal " + this.subtotal().toFixed(2));
    out.push("discount " + this.discount().toFixed(2));
    out.push("total " + (this.subtotal() - this.discount()).toFixed(2));
    return out;
  }
}
const cart = new Cart();
cart.add("apple", 3.5, 4);
cart.add("bread", 12, 1);
cart.add("apple", 3.5, 2);
cart.add("milk", 8.25, 6);
for (const line of cart.report()) console.log(line);
`,
  },
  {
    id: "c331-e2e-schedule-conflicts",
    title: "日程排期：重叠检测与排序输出",
    src: `
type Slot = { name: string; start: number; end: number };
const slots: Slot[] = [
  { name: "standup", start: 9, end: 10 },
  { name: "review", start: 11, end: 12 },
  { name: "design", start: 10, end: 11 },
  { name: "retro", start: 12, end: 13 },
  { name: "overlap", start: 10.5, end: 11.5 },
];
slots.sort((a, b) => a.start - b.start);
const conflicts: string[] = [];
for (let i = 1; i < slots.length; i++) {
  if (slots[i].start < slots[i - 1].end) {
    conflicts.push(slots[i - 1].name + "/" + slots[i].name);
  }
}
console.log(slots.map((s) => s.name).join(","));
console.log(conflicts.join(" "));
console.log(slots.length, conflicts.length);
`,
  },
  {
    id: "c331-e2e-tokenizer",
    title: "词法分析器：数字 / 名字 / 运算符 / 空白",
    src: `
type Token = { kind: string; text: string };
function tokenize(source: string): Token[] {
  const out: Token[] = [];
  let at = 0;
  const isDigit = (ch: string) => ch >= "0" && ch <= "9";
  const isAlpha = (ch: string) => (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_";
  while (at < source.length) {
    const ch = source.charAt(at);
    if (ch === " ") {
      at = at + 1;
      continue;
    }
    if (isDigit(ch)) {
      let text = "";
      while (at < source.length && (isDigit(source.charAt(at)) || source.charAt(at) === ".")) {
        text = text + source.charAt(at);
        at = at + 1;
      }
      out.push({ kind: "number", text });
      continue;
    }
    if (isAlpha(ch)) {
      let text = "";
      while (at < source.length && (isAlpha(source.charAt(at)) || isDigit(source.charAt(at)))) {
        text = text + source.charAt(at);
        at = at + 1;
      }
      out.push({ kind: "name", text });
      continue;
    }
    out.push({ kind: "op", text: ch });
    at = at + 1;
  }
  return out;
}
const tokens = tokenize("let x1 = 3.5 + y_2 * 10;");
console.log(tokens.map((t) => t.kind + ":" + t.text).join("|"));
console.log(tokens.filter((t) => t.kind === "number").length);
`,
  },
  {
    id: "c331-e2e-async-map-concurrent",
    title: "并发：`Promise.all` 与串行 `for await` 两种写法",
    src: `
async function fetchValue(id: number): Promise<number> {
  await null;
  return id * 2;
}
async function main(): Promise<void> {
  const ids = [1, 2, 3, 4];
  const concurrent = await Promise.all(ids.map((id) => fetchValue(id)));
  console.log("concurrent", concurrent.join(","));
  const serial: number[] = [];
  for (const id of ids) serial.push(await fetchValue(id));
  console.log("serial", serial.join(","));
  const settled = await Promise.allSettled(ids.map((id) => fetchValue(id)));
  console.log("settled", settled.length, settled[0].status);
}
main();
`,
  },
  {
    id: "c331-e2e-deep-clone-and-compare",
    title: "深拷贝与结构比较（不用 structuredClone）",
    src: `
type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
function clone(value: Json): Json {
  if (Array.isArray(value)) return value.map((item) => clone(item));
  if (value !== null && typeof value === "object") {
    const out: { [k: string]: Json } = {};
    for (const key of Object.keys(value)) out[key] = clone(value[key]);
    return out;
  }
  return value;
}
function equal(a: Json, b: Json): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!equal(a[i], b[i])) return false;
    return true;
  }
  if (a !== null && b !== null && typeof a === "object" && typeof b === "object"
      && !Array.isArray(a) && !Array.isArray(b)) {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const key of ka) {
      if (!(key in b)) return false;
      if (!equal(a[key], b[key])) return false;
    }
    return true;
  }
  return a === b;
}
const source: Json = { a: [1, { b: "x" }], c: null, d: true };
const copy = clone(source);
console.log(equal(source, copy));
(copy as any).a.push(2);
console.log(equal(source, copy), (source as any).a.length);
console.log(JSON.stringify(source));
`,
  },
  {
    id: "c331-e2e-version-compare",
    title: "版本号比较：分段数值、缺位与预发布标记",
    src: `
function compare(left: string, right: string): number {
  const a = left.split(".");
  const b = right.split(".");
  const width = Math.max(a.length, b.length);
  for (let i = 0; i < width; i++) {
    const x = i < a.length ? parseInt(a[i]) : 0;
    const y = i < b.length ? parseInt(b[i]) : 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
const versions = ["1.2.10", "1.2.9", "1.3", "1.2.9.1", "1.2"];
versions.sort(compare);
console.log(versions.join(" "));
console.log(compare("1.2", "1.2.0"), compare("2.0", "10.0"));
`,
  },
  {
    id: "c331-e2e-promise-reject-paths",
    title: "拒绝的四条路：执行器抛、then 抛、reject 调、throw 抛",
    src: `
function boomer(message: string): () => never {
  return () => {
    throw new Error(message);
  };
}
async function main(): Promise<void> {
  const a = await new Promise<string>((resolve, reject) => {
    reject(new Error("rejected"));
  }).catch((e) => "A:" + (e as Error).message);
  console.log(a);
  const b = await new Promise<string>(() => {
    throw new Error("executor");
  }).catch((e) => "B:" + (e as Error).message);
  console.log(b);
  const c = await Promise.resolve("seed")
    .then(boomer("then"))
    .catch((e) => "C:" + (e as Error).message);
  console.log(c);
  async function thrower(): Promise<string> {
    throw new Error("async");
  }
  const d = await thrower().catch((e) => "D:" + (e as Error).message);
  console.log(d);
  const e = await Promise.try(boomer("try")).catch((err) => "E:" + (err as Error).message);
  console.log(e);
}
main();
`,
  },
  {
    id: "c331-e2e-iterator-tools",
    title: "迭代器工具：`map.keys()` / `entries()` / 手动推进",
    src: `
const scores = new Map<string, number>([["ada", 3], ["bob", 1], ["cy", 2]]);
const first = scores.keys().next();
console.log(first.value, first.done);
const all: string[] = [];
for (const [name, score] of scores.entries()) all.push(name + "=" + score);
console.log(all.join(","));
const sorted = [...scores.keys()].sort();
console.log(sorted.join(","));
const set = new Set<number>([10, 20]);
console.log(set.values().next().value, set.entries().next().value.join("-"));
console.log([...scores.values()].reduce((sum, n) => sum + n, 0));
`,
  },
  // ===== 第 338 轮收编：端到端加宽（20 条）=====
  {
    id: "c338-e2e-template-and-escapes",
    title: "模板串：内插、转义、行继续与原文",
    src: `
const name = "world";
const n = 42;
console.log(\`hello \${name}, n=\${n}\`);
console.log(\`tab:\\tend\`, \`tab:\\tend\`.length);
console.log(\`multi
line\`, \`multi
line\`.split("\\n").length);
console.log(\`esc \\\${notInterp}\`, \`a\\\\b\`);
function tag(parts: any, ...rest: any[]): string {
  return parts.raw.join("|") + "#" + rest.length;
}
console.log(tag\`x\\ty\${1}z\`);
console.log(\`\${1 + 1}\${"a"}\${true}\`);
`,
  },
  {
    id: "c338-e2e-this-binding-forms",
    title: "`this` 的几种绑法：方法、摘下来、call/apply/bind、箭头",
    src: `
const counter = {
  n: 0,
  bump() { this.n = this.n + 1; return this.n; },
  describe() { return \`n=\${this.n}\`; },
};
console.log(counter.bump(), counter.bump(), counter.describe());
const detached = counter.describe;
console.log(typeof detached(), detached() === "n=2");
console.log(detached.call(counter), counter.describe.apply(counter, []));
const bound = counter.bump.bind(counter);
console.log(bound(), bound(), counter.n);
const arrowUser = {
  n: 9,
  run() { const f = () => this.n; return f(); },
};
console.log(arrowUser.run());
function plain(this: any): string { return this === globalThis ? "global" : "other"; }
console.log(plain(), plain.call(undefined), plain.call(null), plain.call({}));
`,
  },
  {
    id: "c338-e2e-join-and-tostring",
    title: "数组的 `join` / `toString` 走元素的 `toString`",
    nodeArgs: ["--experimental-transform-types"],
    src: `
class Money {
  constructor(public cents: number) {}
  toString(): string { return "$" + (this.cents / 100).toFixed(2); }
}
const row = [new Money(199), new Money(50)];
console.log(row.join(" | "), row.toString(), String(row));
console.log([1, [2, [3]]].join("-"), [1, [2, [3]]].toString());
console.log([null, undefined, false].join(","), [1, , 3].join("-"));
const like = { 0: "a", 1: "b", length: 2 };
console.log([].slice.call(like as any).join("+"), Array.prototype.join.call(like as any, "/"));
`,
  },
  {
    id: "c338-e2e-structured-clone-graph",
    title: "`structuredClone`：对象图、环与几种内建",
    src: `
const team: any = { name: "core", members: ["a", "b"] };
team.self = team;
team.meta = { created: new Date(0), tags: new Set(["x", "y"]), index: new Map([["a", 1]]) };
const copy = structuredClone(team);
copy.members.push("c");
copy.meta.tags.add("z");
copy.meta.index.set("b", 2);
console.log(team.members.length, copy.members.length);
console.log(team.meta.tags.has("z"), copy.meta.tags.has("z"), copy.meta.tags.has("x"));
console.log(copy.meta.index.get("b"), team.meta.index.get("b"));
console.log(copy.self === copy, copy.meta.created.getTime());
const frozen = Object.freeze({ keep: 1 });
const frozenCopy = structuredClone(frozen);
console.log(Object.isFrozen(frozenCopy), frozenCopy.keep);
`,
  },
  {
    id: "c338-e2e-generator-cleanup",
    title: "生成器的收尾：`break` / `return` / `throw` 三条路都跑 `finally`",
    src: `
const log: string[] = [];
function* resource(tag: string) {
  log.push("open " + tag);
  try {
    yield 1;
    yield 2;
    yield 3;
  } finally {
    log.push("close " + tag);
  }
}
for (const v of resource("loop")) { if (v === 2) break; }
function takeFirst(): number {
  for (const v of resource("func")) return v;
  return -1;
}
console.log(takeFirst());
const it = resource("manual");
console.log(it.next().value);
console.log(JSON.stringify(it.return(7)));
try {
  const it2 = resource("throw");
  it2.next();
  it2.throw(new Error("boom"));
} catch (e) {
  log.push("caught " + (e as Error).message);
}
console.log(log.join(","));
`,
  },
  {
    id: "c338-e2e-array-subclass-and-arraylike",
    title: "`extends Array` 与类数组接收者",
    src: `
class Stack extends Array {
  peek() { return this[this.length - 1]; }
  push2(v: number) { this.push(v); return this; }
}
const s = new Stack();
s.push2(1).push2(2).push2(3);
console.log(s.length, s.peek(), s.join(","), Array.isArray(s), s instanceof Stack, s instanceof Array);
console.log(s.slice(1).join(","), s.map((v: number) => v * 2).join(","));
const args = { 0: "x", 1: "y", 2: "z", length: 3 };
console.log(Array.prototype.slice.call(args as any, 1).join("-"));
function gather(): string { return ([] as any).slice.call(arguments as any).join("|"); }
console.log(gather("p", "q", "r"));
`,
  },
  {
    id: "c338-e2e-arguments-and-names",
    title: "`arguments`、具名函数表达式与 `toString`",
    src: `
function collect(a: number, b: number): string {
  return a + "/" + b + "/" + arguments.length + "/" + arguments[3];
}
console.log(collect(1, 2), collect(1, 2, 3, 4));
const named = function self(n: number): number { return n <= 1 ? 1 : n * self(n - 1); };
console.log(named(5), typeof (named as any).self);
function outer(x: number) { const inner = () => arguments.length; return inner() + x; }
console.log(outer(10, 20, 30));
console.log(named.toString().includes("self"), (() => 1).toString().includes("=>"));
`,
  },
  {
    id: "c338-e2e-date-formatting",
    title: "`Date`：UTC 读写、格式化与比较",
    src: `
const d = new Date(Date.UTC(2020, 0, 2, 3, 4, 5, 6));
console.log(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours());
console.log(d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds());
console.log(d.toISOString());
console.log(d.getTime(), new Date(0).getTime(), new Date(1000).getTime());
const later = new Date(d.getTime() + 86400000);
console.log(later.getUTCDate(), later > d, d < later);
const parsed = new Date("2020-01-02T03:04:05.006Z");
console.log(parsed.getTime() === d.getTime());
console.log(typeof d.getTime(), d.getUTCDay() >= 0);
`,
  },
  {
    id: "c338-e2e-set-operations",
    title: "`Set` 的集合运算与迭代",
    src: `
const a = new Set([1, 2, 3]);
const b = new Set([3, 4]);
console.log(a.size, a.has(2), b.has(2));
console.log([...a.union(b)].join(","));
console.log([...a.intersection(b)].join(","));
console.log([...a.difference(b)].join(","));
console.log(a.isSubsetOf(new Set([1, 2, 3, 4])), a.isDisjointFrom(new Set([9])));
const seen: string[] = [];
a.forEach((v: number) => { seen.push("v" + v); });
console.log(seen.join(","), [...a.values()].join("-"), [...a.keys()].join("-"));
console.log([...a.entries()].map((e: number[]) => e.join(":")).join(" "));
`,
  },
  {
    id: "c338-e2e-map-and-iteration",
    title: "`Map` 的迭代、分组与 `Array.from`",
    src: `
const counts = new Map<string, number>();
for (const word of "b a b c a b".split(" ")) {
  counts.set(word, (counts.get(word) || 0) + 1);
}
console.log(counts.size, counts.get("b"), counts.has("z"));
console.log([...counts.keys()].join(","), [...counts.values()].join(","));
const grouped = new Map<string, string[]>();
for (const [k, v] of counts.entries()) {
  const key = v > 1 ? "many" : "one";
  if (!grouped.has(key)) grouped.set(key, []);
  (grouped.get(key) as string[]).push(k + ":" + v);
}
console.log([...grouped.entries()].map((e: any[]) => e[0] + "=" + e[1].join("/")).join(" "));
console.log(Array.from(counts.entries()).length, Array.from(counts.keys()).join("|"));
counts.delete("c");
console.log(counts.size, [...counts.keys()].join(","));
`,
  },
  {
    id: "c338-e2e-sort-comparators",
    title: "`sort` 的比较器与稳定性",
    src: `
const rows = [
  { k: "b", v: 2 }, { k: "a", v: 1 }, { k: "c", v: 2 }, { k: "d", v: 1 },
];
const byV = rows.slice().sort((x, y) => x.v - y.v);
console.log(byV.map((r) => r.k + r.v).join(","));
const byK = rows.slice().sort((x, y) => (x.k < y.k ? -1 : x.k > y.k ? 1 : 0));
console.log(byK.map((r) => r.k).join(""));
console.log([10, 9, 100, 1].sort().join(","), [10, 9, 100, 1].sort((x, y) => x - y).join(","));
console.log([3, 1, 2].sort().reverse().join(","));
const words = ["pear", "apple", "fig"];
console.log(words.sort().join(","), words.join(","));
`,
  },
  {
    id: "c338-e2e-destructuring-and-spread",
    title: "解构、默认值、剩余与展开的组合",
    src: `
const [first = 0, ...others] = [1, 2, 3];
console.log(first, others.join(","));
const { a = 1, b: renamed = 2, ...rest } = { a: 10, c: 3, d: 4 } as any;
console.log(a, renamed, JSON.stringify(rest));
const nested = { list: [{ id: 1, tags: ["x"] }, { id: 2 }] };
const [{ id: id0, tags: [t0] = [] }, { id: id1 }] = nested.list;
console.log(id0, t0, id1);
const merged = { ...nested, extra: true };
console.log(Object.keys(merged).sort().join(","));
const nums = [0, ...[1, 2], 3];
console.log(nums.join(","), Math.max(...nums));
function sum(...xs: number[]): number { return xs.reduce((s, x) => s + x, 0); }
console.log(sum(...nums), sum(1, ...others, 10));
`,
  },
  {
    id: "c338-e2e-accessors-and-freeze",
    title: "访问器、`defineProperty` 与冻结",
    src: `
const box: any = { _v: 1 };
Object.defineProperty(box, "v", {
  get() { return this._v; },
  set(next: number) { this._v = next * 2; },
  enumerable: true,
  configurable: true,
});
box.v = 5;
console.log(box.v, box._v);
const plain: any = { x: 1 };
Object.defineProperty(plain, "ro", { value: 7, writable: false, enumerable: true });
plain.ro = 9;
console.log(plain.ro);
const frozen: any = Object.freeze({ a: 1 });
frozen.a = 2;
frozen.b = 3;
console.log(frozen.a, frozen.b, Object.isFrozen(frozen), Object.isFrozen({}));
const arr: any = Object.freeze([1]);
try { arr.push(2); console.log("pushed"); } catch (e) { console.log("threw", (e as Error).name); }
`,
  },
  {
    id: "c338-e2e-async-queue-and-generators",
    title: "异步：微任务次序、异步生成器与 `for await`",
    src: `
const order: string[] = [];
async function producer(): Promise<number> {
  order.push("start");
  await null;
  order.push("after-await");
  return 7;
}
queueMicrotask(() => order.push("microtask"));
producer().then((v) => order.push("then" + v));
console.log(order.join(","));
setTimeoutMicrotaskish();
function setTimeoutMicrotaskish(): void {
  Promise.resolve().then(() => order.push("second-then"));
}
async function* stream(): AsyncGenerator<number> {
  for (let i = 1; i <= 3; i++) yield i;
}
(async () => {
  const got: number[] = [];
  for await (const v of stream()) got.push(v);
  console.log(got.join(","), order.join(","));
})();
`,
  },
  {
    id: "c338-e2e-class-features",
    title: "类：字段、静态块、访问器、私有感与参数属性",
    nodeArgs: ["--experimental-transform-types"],
    src: `
class Config {
  static registry: string[] = [];
  static { Config.registry.push("static-block"); }
  static kind = "config";
  #secret = 42;
  readonly name: string;
  constructor(name: string, private level: number = 1) { this.name = name; }
  get label(): string { return this.name + "@" + this.level; }
  set label(next: string) { this.name = next; }
  reveal(): number { return this.#secret; }
  static describe(): string { return Config.kind + "/" + Config.registry.length; }
}
const c = new Config("root");
console.log(c.label, c.reveal(), Config.describe());
c.label = "changed";
console.log(c.label, c instanceof Config);
class Sub extends Config {
  constructor() { super("sub", 2); }
  get label(): string { return "sub:" + super.label; }
}
const sub = new Sub();
console.log(sub.label, sub.reveal(), Sub.describe(), sub instanceof Config);
`,
  },
  {
    id: "c338-e2e-untyped-recursion-and-dp",
    title: "递归、记忆化与动态规划",
    src: `
function fib(n: number, memo: Map<number, number> = new Map()): number {
  if (n < 2) return n;
  const hit = memo.get(n);
  if (hit !== undefined) return hit;
  const value = fib(n - 1, memo) + fib(n - 2, memo);
  memo.set(n, value);
  return value;
}
console.log(fib(10), fib(30));
const grid = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
function paths(r: number, c: number, memo: Map<string, number> = new Map()): number {
  if (r === 0 || c === 0) return 1;
  const key = r + "," + c;
  const hit = memo.get(key);
  if (hit !== undefined) return hit;
  const value = paths(r - 1, c, memo) + paths(r, c - 1, memo);
  memo.set(key, value);
  return value;
}
console.log(paths(2, 2), paths(5, 5));
console.log(grid.map((row) => row.reduce((s, v) => s + v, 0)).join(","));
`,
  },
  {
    id: "c338-e2e-number-and-math",
    title: "数字、`Math` 与解析",
    src: `
console.log((1.005).toFixed(2), (255).toString(16), (8).toString(2));
console.log(parseInt("42px", 10), parseFloat("3.5rem"), Number("  12  "), Number("x"));
console.log(Number.isInteger(3), Number.isInteger(3.5), Number.isFinite(Infinity));
console.log(Math.round(2.5), Math.floor(-1.5), Math.trunc(-1.7), Math.sign(-3));
console.log(Math.max(1, 9, 5), Math.min(1, 9, 5), Math.pow(2, 10), Math.sqrt(81) , Math.abs(-4));
console.log(Math.PI > 3.14, Number.MAX_SAFE_INTEGER, 0.1 + 0.2);
console.log((1234.5678).toPrecision(6), (0.000001234).toString());
console.log((-0).toString(), 1 / 0, -1 / 0, Number.isNaN(NaN));
`,
  },
  {
    id: "c338-e2e-unicode-text",
    title: "文本：码点、代理对、规范化与大小写",
    src: `
const emoji = "a\\u{1F600}b";
console.log(emoji.length, [...emoji].length, emoji.codePointAt(1));
console.log("e\\u0301".normalize("NFC") === "\\u00e9", "\\u00e9".normalize("NFD").length);
console.log("ABC".toLowerCase(), "abc".toUpperCase(), "x".repeat(3));
console.log("  trim  ".trim(), "pad".padStart(5, "*"), "pad".padEnd(5, "-"));
console.log("a-b-c".split("-").join("+"), "abc".includes("b"), "abc".startsWith("a"), "abc".endsWith("c"));
console.log("hello".slice(1, 3), "hello".substring(3), "hello".charAt(0), "hello"[4]);
console.log("ab".isWellFormed(), "\\uD800".isWellFormed(), "\\uD800".toWellFormed().length);
console.log(String.fromCharCode(65, 66), String.fromCodePoint(0x1F600).length);
`,
  },
  {
    id: "c338-e2e-errors-and-boundaries",
    title: "错误：自定义类、分类接住与资源清理",
    nodeArgs: ["--experimental-transform-types"],
    src: `
class AppError extends Error {
  constructor(message: string, public code: number) {
    super(message);
    this.name = "AppError";
  }
}
class NotFound extends AppError {
  constructor(what: string) { super("missing " + what, 404); }
}
const log: string[] = [];
function run(kind: string): string {
  try {
    if (kind === "missing") throw new NotFound("user");
    if (kind === "bad") throw new AppError("bad input", 400);
    throw new TypeError("plain");
  } catch (e) {
    if (e instanceof NotFound) return "notfound:" + e.code;
    if (e instanceof AppError) return "app:" + e.code + ":" + e.message;
    if (e instanceof TypeError) return "type:" + (e as Error).message;
    return "unknown";
  } finally {
    log.push("fin:" + kind);
  }
}
console.log(run("missing"), run("bad"), run("weird"));
console.log(log.join(","));
console.log(new NotFound("x") instanceof Error, new NotFound("x").name, String(new AppError("m", 1)));
console.log(Object.prototype.toString.call(new AppError("m", 1)));
`,
  },
  {
    id: "c338-e2e-symbols-and-reflection",
    title: "符号键、`Object` 反射与属性序",
    src: `
const sym = Symbol("k");
const obj: any = { b: 2, 2: "two", 1: "one", a: 1, [sym]: "hidden" };
console.log(Object.keys(obj).join(","));
console.log(Object.getOwnPropertyNames(obj).join(","));
console.log(Object.getOwnPropertySymbols(obj).length, obj[sym]);
console.log(Object.entries({ x: 1, y: 2 }).map((e: any[]) => e.join("=")).join(" "));
console.log(JSON.stringify({ ...obj }), JSON.stringify(obj[sym]));
console.log(Object.assign({}, { a: 1 }, { b: 2 }).b);
console.log(Object.fromEntries([["k", 9]]).k, Object.is(1, 1), Object.is(NaN, NaN));
const proto = { greet() { return "hi"; } };
const made = Object.create(proto);
made.own = 1;
console.log(made.greet(), Object.getPrototypeOf(made) === proto, "own" in made, "greet" in made);
`,
  },
];
