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

  // ===== 第 371 轮：加宽矩阵收编的候选（89 条）=====
  {
    "id": "c371-e2e-expression-parser",
    "title": "递归下降的四则运算求值器（含括号与一元负号）",
    "src": "type Tok = { kind: \"num\" | \"op\" | \"paren\"; text: string };\nfunction lex(src: string): Tok[] {\n  const out: Tok[] = [];\n  let i = 0;\n  while (i < src.length) {\n    const ch = src.charAt(i);\n    if (ch === \" \") { i += 1; continue; }\n    if (ch >= \"0\" && ch <= \"9\") {\n      let n = \"\";\n      while (i < src.length && src.charAt(i) >= \"0\" && src.charAt(i) <= \"9\") { n += src.charAt(i); i += 1; }\n      out.push({ kind: \"num\", text: n });\n      continue;\n    }\n    if (ch === \"(\" || ch === \")\") out.push({ kind: \"paren\", text: ch });\n    else out.push({ kind: \"op\", text: ch });\n    i += 1;\n  }\n  return out;\n}\nclass Parser {\n  private at = 0;\n  constructor(private toks: Tok[]) {}\n  private peek(): Tok | undefined { return this.toks[this.at]; }\n  parse(): number { return this.expr(); }\n  private expr(): number {\n    let left = this.term();\n    for (;;) {\n      const t = this.peek();\n      if (t && t.kind === \"op\" && (t.text === \"+\" || t.text === \"-\")) {\n        this.at += 1;\n        const right = this.term();\n        left = t.text === \"+\" ? left + right : left - right;\n      } else return left;\n    }\n  }\n  private term(): number {\n    let left = this.unary();\n    for (;;) {\n      const t = this.peek();\n      if (t && t.kind === \"op\" && (t.text === \"*\" || t.text === \"/\" || t.text === \"%\")) {\n        this.at += 1;\n        const right = this.unary();\n        left = t.text === \"*\" ? left * right : t.text === \"/\" ? Math.trunc(left / right) : left % right;\n      } else return left;\n    }\n  }\n  private unary(): number {\n    const t = this.peek();\n    if (t && t.kind === \"op\" && t.text === \"-\") { this.at += 1; return -this.unary(); }\n    return this.primary();\n  }\n  private primary(): number {\n    const t = this.toks[this.at++];\n    if (t.kind === \"num\") return Number(t.text);\n    if (t.text === \"(\") { const v = this.expr(); this.at += 1; return v; }\n    throw new Error(\"unexpected \" + t.text);\n  }\n}\nfor (const src of [\"1+2*3\", \"(1+2)*3\", \"-4 + 10\", \"100 / 7 % 3\", \"2*(3+(4-1))\"]) {\n  console.log(src, \"=\", new Parser(lex(src)).parse());\n}",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-e2e-dijkstra",
    "title": "Dijkstra 最短路：邻接表 + 朴素选点",
    "src": "type Edge = { to: string; w: number };\nconst graph: Record<string, Edge[]> = {\n  A: [{ to: \"B\", w: 1 }, { to: \"C\", w: 4 }],\n  B: [{ to: \"C\", w: 2 }, { to: \"D\", w: 5 }],\n  C: [{ to: \"D\", w: 1 }],\n  D: [{ to: \"E\", w: 3 }],\n  E: [],\n};\nfunction shortest(start: string, goal: string): { dist: number; path: string[] } {\n  const dist: Record<string, number> = {};\n  const prev: Record<string, string | null> = {};\n  const done: Record<string, boolean> = {};\n  for (const k of Object.keys(graph)) { dist[k] = Infinity; prev[k] = null; }\n  dist[start] = 0;\n  for (;;) {\n    let best: string | null = null;\n    for (const k of Object.keys(dist)) {\n      if (!done[k] && (best === null || dist[k] < dist[best])) best = k;\n    }\n    if (best === null || dist[best] === Infinity) break;\n    done[best] = true;\n    if (best === goal) break;\n    for (const e of graph[best]) {\n      const nd = dist[best] + e.w;\n      if (nd < dist[e.to]) { dist[e.to] = nd; prev[e.to] = best; }\n    }\n  }\n  const path: string[] = [];\n  let cur: string | null = goal;\n  while (cur !== null) { path.unshift(cur); cur = prev[cur]; }\n  return { dist: dist[goal], path };\n}\nconst r = shortest(\"A\", \"E\");\nconsole.log(r.path.join(\"->\"), r.dist);\nconsole.log(JSON.stringify(shortest(\"A\", \"D\").path), shortest(\"C\", \"A\").dist);"
  },
  {
    "id": "c371-e2e-topological-sort",
    "title": "拓扑排序 + 环检测",
    "src": "const deps: Record<string, string[]> = {\n  app: [\"lib\", \"ui\"],\n  ui: [\"lib\", \"theme\"],\n  lib: [\"core\"],\n  theme: [\"core\"],\n  core: [],\n};\nfunction topo(graph: Record<string, string[]>): string[] | null {\n  const indeg: Record<string, number> = {};\n  for (const k of Object.keys(graph)) indeg[k] = indeg[k] ?? 0;\n  for (const k of Object.keys(graph)) for (const d of graph[k]) indeg[d] = (indeg[d] ?? 0) + 1;\n  const ready = Object.keys(indeg).filter((k) => indeg[k] === 0).sort();\n  const out: string[] = [];\n  while (ready.length > 0) {\n    const n = ready.shift() as string;\n    out.push(n);\n    for (const d of graph[n]) {\n      indeg[d] -= 1;\n      if (indeg[d] === 0) { ready.push(d); ready.sort(); }\n    }\n  }\n  return out.length === Object.keys(graph).length ? out : null;\n}\nconsole.log((topo(deps) ?? []).join(\",\"));\nconsole.log(topo({ a: [\"b\"], b: [\"a\"] }));\nconst layered: string[] = [];\nconst order = topo(deps) ?? [];\nfor (const name of order) layered.push(name + \":\" + (deps[name] ?? []).length);\nconsole.log(layered.join(\" \"));"
  },
  {
    "id": "c371-e2e-union-find",
    "title": "并查集：连通分量与环检测",
    "src": "class DSU {\n  private parent: number[] = [];\n  private rank: number[] = [];\n  constructor(n: number) { for (let i = 0; i < n; i++) { this.parent.push(i); this.rank.push(0); } }\n  find(x: number): number {\n    let root = x;\n    while (this.parent[root] !== root) root = this.parent[root];\n    let cur = x;\n    while (this.parent[cur] !== root) { const next = this.parent[cur]; this.parent[cur] = root; cur = next; }\n    return root;\n  }\n  union(a: number, b: number): boolean {\n    const ra = this.find(a);\n    const rb = this.find(b);\n    if (ra === rb) return false;\n    if (this.rank[ra] < this.rank[rb]) this.parent[ra] = rb;\n    else if (this.rank[ra] > this.rank[rb]) this.parent[rb] = ra;\n    else { this.parent[rb] = ra; this.rank[ra] += 1; }\n    return true;\n  }\n}\nconst dsu = new DSU(6);\nconst edges: [number, number][] = [[0, 1], [1, 2], [3, 4], [2, 0]];\nconst results = edges.map(([a, b]) => dsu.union(a, b));\nconsole.log(results.join(\",\"));\nconst groups = new Map<number, number[]>();\nfor (let i = 0; i < 6; i++) {\n  const root = dsu.find(i);\n  const list = groups.get(root) ?? [];\n  list.push(i);\n  groups.set(root, list);\n}\nconsole.log([...groups.values()].map((g) => g.join(\"\")).join(\"|\"), groups.size);"
  },
  {
    "id": "c371-e2e-kmp-search",
    "title": "KMP 子串查找与所有出现位置",
    "src": "function buildTable(pattern: string): number[] {\n  const table: number[] = [0];\n  let len = 0;\n  for (let i = 1; i < pattern.length; i++) {\n    while (len > 0 && pattern.charAt(i) !== pattern.charAt(len)) len = table[len - 1];\n    if (pattern.charAt(i) === pattern.charAt(len)) len += 1;\n    table.push(len);\n  }\n  return table;\n}\nfunction searchAll(text: string, pattern: string): number[] {\n  if (pattern.length === 0) return [];\n  const table = buildTable(pattern);\n  const hits: number[] = [];\n  let len = 0;\n  for (let i = 0; i < text.length; i++) {\n    while (len > 0 && text.charAt(i) !== pattern.charAt(len)) len = table[len - 1];\n    if (text.charAt(i) === pattern.charAt(len)) len += 1;\n    if (len === pattern.length) { hits.push(i - len + 1); len = table[len - 1]; }\n  }\n  return hits;\n}\nconsole.log(buildTable(\"ababaca\").join(\",\"));\nconsole.log(searchAll(\"abababab\", \"abab\").join(\",\"));\nconsole.log(searchAll(\"aaaa\", \"aa\").join(\",\"), searchAll(\"abc\", \"z\").length);\nconsole.log(searchAll(\"the cat sat on the mat\", \"at\").join(\",\"));"
  },
  {
    "id": "c371-e2e-levenshtein",
    "title": "编辑距离与回溯出的编辑脚本",
    "src": "function distance(a: string, b: string): number {\n  const prev: number[] = [];\n  for (let j = 0; j <= b.length; j++) prev.push(j);\n  for (let i = 1; i <= a.length; i++) {\n    const cur: number[] = [i];\n    for (let j = 1; j <= b.length; j++) {\n      const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;\n      cur.push(Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost));\n    }\n    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];\n  }\n  return prev[b.length];\n}\nfunction align(a: string, b: string): string[] {\n  const grid: number[][] = [];\n  for (let i = 0; i <= a.length; i++) {\n    const row: number[] = [];\n    for (let j = 0; j <= b.length; j++) row.push(i === 0 ? j : j === 0 ? i : 0);\n    grid.push(row);\n  }\n  for (let i = 1; i <= a.length; i++) {\n    for (let j = 1; j <= b.length; j++) {\n      const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;\n      grid[i][j] = Math.min(grid[i - 1][j] + 1, grid[i][j - 1] + 1, grid[i - 1][j - 1] + cost);\n    }\n  }\n  const ops: string[] = [];\n  let i = a.length;\n  let j = b.length;\n  while (i > 0 || j > 0) {\n    if (i > 0 && j > 0 && grid[i][j] === grid[i - 1][j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1)) {\n      ops.unshift(a.charAt(i - 1) === b.charAt(j - 1) ? \"=\" + a.charAt(i - 1) : \"~\" + a.charAt(i - 1) + b.charAt(j - 1));\n      i -= 1;\n      j -= 1;\n    } else if (i > 0 && grid[i][j] === grid[i - 1][j] + 1) { ops.unshift(\"-\" + a.charAt(i - 1)); i -= 1; }\n    else { ops.unshift(\"+\" + b.charAt(j - 1)); j -= 1; }\n  }\n  return ops;\n}\nconsole.log(distance(\"kitten\", \"sitting\"), distance(\"\", \"abc\"), distance(\"same\", \"same\"));\nconsole.log(align(\"cat\", \"cut\").join(\" \"));\nconsole.log(align(\"abc\", \"yabd\").join(\" \"));"
  },
  {
    "id": "c371-e2e-lcs-and-diff",
    "title": "最长公共子序列与逐行 diff",
    "src": "function lcs(a: string[], b: string[]): string[] {\n  const grid: number[][] = [];\n  for (let i = 0; i <= a.length; i++) {\n    const row: number[] = [];\n    for (let j = 0; j <= b.length; j++) row.push(0);\n    grid.push(row);\n  }\n  for (let i = 1; i <= a.length; i++) {\n    for (let j = 1; j <= b.length; j++) {\n      grid[i][j] = a[i - 1] === b[j - 1] ? grid[i - 1][j - 1] + 1 : Math.max(grid[i - 1][j], grid[i][j - 1]);\n    }\n  }\n  const out: string[] = [];\n  let i = a.length;\n  let j = b.length;\n  while (i > 0 && j > 0) {\n    if (a[i - 1] === b[j - 1]) { out.unshift(a[i - 1]); i -= 1; j -= 1; }\n    else if (grid[i - 1][j] >= grid[i][j - 1]) i -= 1;\n    else j -= 1;\n  }\n  return out;\n}\nfunction diff(oldLines: string[], newLines: string[]): string[] {\n  const common = lcs(oldLines, newLines);\n  const out: string[] = [];\n  let oi = 0;\n  let ni = 0;\n  for (const line of common) {\n    while (oldLines[oi] !== line) { out.push(\"-\" + oldLines[oi]); oi += 1; }\n    while (newLines[ni] !== line) { out.push(\"+\" + newLines[ni]); ni += 1; }\n    out.push(\" \" + line);\n    oi += 1;\n    ni += 1;\n  }\n  while (oi < oldLines.length) { out.push(\"-\" + oldLines[oi]); oi += 1; }\n  while (ni < newLines.length) { out.push(\"+\" + newLines[ni]); ni += 1; }\n  return out;\n}\nconsole.log(lcs([\"a\", \"b\", \"c\"], [\"a\", \"c\", \"d\"]).join(\",\"));\nfor (const line of diff([\"one\", \"two\", \"three\"], [\"one\", \"three\", \"four\"])) console.log(line);\nconsole.log(diff([\"x\"], [\"x\"]).length);"
  },
  {
    "id": "c371-e2e-bst",
    "title": "二叉搜索树：插入、遍历、查找、最小最大",
    "src": "class Node2 {\n  left: Node2 | null = null;\n  right: Node2 | null = null;\n  constructor(public value: number) {}\n}\nclass BST {\n  root: Node2 | null = null;\n  insert(v: number): void {\n    const node = new Node2(v);\n    if (this.root === null) { this.root = node; return; }\n    let cur = this.root;\n    for (;;) {\n      if (v < cur.value) {\n        if (cur.left === null) { cur.left = node; return; }\n        cur = cur.left;\n      } else {\n        if (cur.right === null) { cur.right = node; return; }\n        cur = cur.right;\n      }\n    }\n  }\n  has(v: number): boolean {\n    let cur = this.root;\n    while (cur !== null) {\n      if (v === cur.value) return true;\n      cur = v < cur.value ? cur.left : cur.right;\n    }\n    return false;\n  }\n  inorder(): number[] {\n    const out: number[] = [];\n    const walk = (n: Node2 | null): void => { if (n === null) return; walk(n.left); out.push(n.value); walk(n.right); };\n    walk(this.root);\n    return out;\n  }\n  min(): number | null { let c = this.root; while (c && c.left) c = c.left; return c ? c.value : null; }\n  max(): number | null { let c = this.root; while (c && c.right) c = c.right; return c ? c.value : null; }\n  height(): number {\n    const go = (n: Node2 | null): number => (n === null ? 0 : 1 + Math.max(go(n.left), go(n.right)));\n    return go(this.root);\n  }\n}\nconst t = new BST();\nfor (const v of [50, 30, 70, 20, 40, 60, 80, 30]) t.insert(v);\nconsole.log(t.inorder().join(\",\"));\nconsole.log(t.has(40), t.has(45), t.min(), t.max(), t.height());\nconst empty = new BST();\nconsole.log(empty.inorder().length, empty.min(), empty.height());",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-e2e-ring-buffer",
    "title": "环形缓冲区：覆盖写、读取与容量",
    "src": "class Ring<T> {\n  private items: (T | undefined)[] = [];\n  private head = 0;\n  private count = 0;\n  constructor(private cap: number) { for (let i = 0; i < cap; i++) this.items.push(undefined); }\n  push(v: T): T | undefined {\n    const overwritten = this.count === this.cap ? this.items[this.head] : undefined;\n    this.items[this.head] = v;\n    this.head = (this.head + 1) % this.cap;\n    if (this.count < this.cap) this.count += 1;\n    return overwritten;\n  }\n  toArray(): T[] {\n    const out: T[] = [];\n    const start = (this.head - this.count + this.cap) % this.cap;\n    for (let i = 0; i < this.count; i++) out.push(this.items[(start + i) % this.cap] as T);\n    return out;\n  }\n  get size(): number { return this.count; }\n  get full(): boolean { return this.count === this.cap; }\n}\nconst r = new Ring<number>(3);\nconsole.log(r.push(1), r.push(2), r.push(3), r.toArray().join(\",\"), r.full);\nconsole.log(r.push(4), r.toArray().join(\",\"), r.size);\nconsole.log(r.push(5), r.push(6), r.toArray().join(\",\"));\nconst big = new Ring<string>(2);\nbig.push(\"a\");\nconsole.log(big.toArray().join(\",\"), big.full, big.size);",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-e2e-deque",
    "title": "双端队列：两端进出与滑动窗口",
    "src": "class Deque<T> {\n  private items: T[] = [];\n  pushBack(v: T): void { this.items.push(v); }\n  pushFront(v: T): void { this.items.unshift(v); }\n  popBack(): T | undefined { return this.items.pop(); }\n  popFront(): T | undefined { return this.items.shift(); }\n  get size(): number { return this.items.length; }\n  toArray(): T[] { return this.items.slice(); }\n  peekFront(): T | undefined { return this.items[0]; }\n  peekBack(): T | undefined { return this.items[this.items.length - 1]; }\n}\nconst d = new Deque<number>();\nd.pushBack(1);\nd.pushBack(2);\nd.pushFront(0);\nconsole.log(d.toArray().join(\",\"), d.peekFront(), d.peekBack(), d.size);\nconsole.log(d.popFront(), d.popBack(), d.toArray().join(\",\"), d.size);\nfunction maxSliding(nums: number[], k: number): number[] {\n  const out: number[] = [];\n  const dq = new Deque<number>();\n  for (let i = 0; i < nums.length; i++) {\n    while (dq.size > 0 && nums[dq.peekBack() as number] <= nums[i]) dq.popBack();\n    dq.pushBack(i);\n    if ((dq.peekFront() as number) <= i - k) dq.popFront();\n    if (i >= k - 1) out.push(nums[dq.peekFront() as number]);\n  }\n  return out;\n}\nconsole.log(maxSliding([1, 3, -1, -3, 5, 3, 6, 7], 3).join(\",\"));"
  },
  {
    "id": "c371-e2e-min-heap-generic",
    "title": "泛型最小堆：比较器、push/pop、堆排序",
    "src": "class Heap<T> {\n  private items: T[] = [];\n  constructor(private cmp: (a: T, b: T) => number) {}\n  get size(): number { return this.items.length; }\n  peek(): T | undefined { return this.items[0]; }\n  push(v: T): void {\n    this.items.push(v);\n    let i = this.items.length - 1;\n    while (i > 0) {\n      const parent = (i - 1) >> 1;\n      if (this.cmp(this.items[i], this.items[parent]) >= 0) break;\n      const tmp = this.items[i];\n      this.items[i] = this.items[parent];\n      this.items[parent] = tmp;\n      i = parent;\n    }\n  }\n  pop(): T | undefined {\n    if (this.items.length === 0) return undefined;\n    const top = this.items[0];\n    const last = this.items.pop() as T;\n    if (this.items.length > 0) {\n      this.items[0] = last;\n      let i = 0;\n      for (;;) {\n        const l = i * 2 + 1;\n        const r = l + 1;\n        let best = i;\n        if (l < this.items.length && this.cmp(this.items[l], this.items[best]) < 0) best = l;\n        if (r < this.items.length && this.cmp(this.items[r], this.items[best]) < 0) best = r;\n        if (best === i) break;\n        const tmp = this.items[i];\n        this.items[i] = this.items[best];\n        this.items[best] = tmp;\n        i = best;\n      }\n    }\n    return top;\n  }\n}\nconst h = new Heap<number>((a, b) => a - b);\nfor (const v of [5, 1, 9, 3, 7, 1]) h.push(v);\nconst sorted: number[] = [];\nwhile (h.size > 0) sorted.push(h.pop() as number);\nconsole.log(sorted.join(\",\"));\ntype Task = { name: string; priority: number };\nconst th = new Heap<Task>((a, b) => b.priority - a.priority);\nth.push({ name: \"low\", priority: 1 });\nth.push({ name: \"high\", priority: 9 });\nth.push({ name: \"mid\", priority: 5 });\nconsole.log(th.pop()!.name, th.pop()!.name, th.peek()!.name, th.size);",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-e2e-quick-and-merge-sort",
    "title": "快排 / 归并 / 插入排序三种实现与稳定性对比",
    "src": "function quick(xs: number[]): number[] {\n  if (xs.length <= 1) return xs.slice();\n  const pivot = xs[0];\n  const less: number[] = [];\n  const same: number[] = [];\n  const more: number[] = [];\n  for (const v of xs) {\n    if (v < pivot) less.push(v);\n    else if (v > pivot) more.push(v);\n    else same.push(v);\n  }\n  return quick(less).concat(same, quick(more));\n}\nfunction merge(xs: number[]): number[] {\n  if (xs.length <= 1) return xs.slice();\n  const mid = Math.floor(xs.length / 2);\n  const left = merge(xs.slice(0, mid));\n  const right = merge(xs.slice(mid));\n  const out: number[] = [];\n  let i = 0;\n  let j = 0;\n  while (i < left.length && j < right.length) out.push(left[i] <= right[j] ? left[i++] : right[j++]);\n  while (i < left.length) out.push(left[i++]);\n  while (j < right.length) out.push(right[j++]);\n  return out;\n}\nfunction insertion(xs: number[]): number[] {\n  const out = xs.slice();\n  for (let i = 1; i < out.length; i++) {\n    const v = out[i];\n    let j = i - 1;\n    while (j >= 0 && out[j] > v) { out[j + 1] = out[j]; j -= 1; }\n    out[j + 1] = v;\n  }\n  return out;\n}\nconst data = [5, 2, 9, 1, 5, 6, -3, 0];\nconsole.log(quick(data).join(\",\"));\nconsole.log(merge(data).join(\",\"));\nconsole.log(insertion(data).join(\",\"), data.join(\",\"));\ntype Row = { k: number; tag: string };\nfunction stableMerge(rows: Row[]): Row[] {\n  if (rows.length <= 1) return rows.slice();\n  const mid = Math.floor(rows.length / 2);\n  const left = stableMerge(rows.slice(0, mid));\n  const right = stableMerge(rows.slice(mid));\n  const out: Row[] = [];\n  let i = 0;\n  let j = 0;\n  while (i < left.length && j < right.length) out.push(left[i].k <= right[j].k ? left[i++] : right[j++]);\n  while (i < left.length) out.push(left[i++]);\n  while (j < right.length) out.push(right[j++]);\n  return out;\n}\nconsole.log(stableMerge([{ k: 1, tag: \"a\" }, { k: 0, tag: \"b\" }, { k: 1, tag: \"c\" }]).map((r) => r.tag).join(\"\"));"
  },
  {
    "id": "c371-e2e-knapsack-and-coin",
    "title": "0/1 背包与零钱兑换（DP + 回溯解）",
    "src": "type Item = { name: string; w: number; v: number };\nconst items: Item[] = [\n  { name: \"map\", w: 2, v: 3 },\n  { name: \"rope\", w: 3, v: 4 },\n  { name: \"torch\", w: 4, v: 5 },\n  { name: \"food\", w: 5, v: 8 },\n];\nconst cap = 9;\nconst dp: number[][] = [];\nfor (let i = 0; i <= items.length; i++) {\n  const row: number[] = [];\n  for (let w = 0; w <= cap; w++) row.push(0);\n  dp.push(row);\n}\nfor (let i = 1; i <= items.length; i++) {\n  for (let w = 0; w <= cap; w++) {\n    dp[i][w] = dp[i - 1][w];\n    if (items[i - 1].w <= w) dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - items[i - 1].w] + items[i - 1].v);\n  }\n}\nconst picked: string[] = [];\nlet w = cap;\nfor (let i = items.length; i > 0; i--) {\n  if (dp[i][w] !== dp[i - 1][w]) { picked.unshift(items[i - 1].name); w -= items[i - 1].w; }\n}\nconsole.log(dp[items.length][cap], picked.join(\",\"));\nfunction coins(amount: number, kinds: number[]): number {\n  const best: number[] = [];\n  for (let i = 0; i <= amount; i++) best.push(i === 0 ? 0 : Infinity);\n  for (let i = 1; i <= amount; i++) {\n    for (const c of kinds) if (c <= i && best[i - c] + 1 < best[i]) best[i] = best[i - c] + 1;\n  }\n  return best[amount];\n}\nconsole.log(coins(11, [1, 2, 5]), coins(3, [2]), coins(0, [1]));"
  },
  {
    "id": "c371-e2e-nqueens",
    "title": "N 皇后：解的个数与第一种解",
    "src": "function solve(n: number): { count: number; first: number[][] } {\n  const cols: number[] = [];\n  const used: boolean[] = [];\n  const diag1: boolean[] = [];\n  const diag2: boolean[] = [];\n  for (let i = 0; i < n; i++) used.push(false);\n  for (let i = 0; i < 2 * n; i++) { diag1.push(false); diag2.push(false); }\n  let count = 0;\n  const first: number[][] = [];\n  const place = (row: number): void => {\n    if (row === n) {\n      count += 1;\n      if (first.length === 0) first.push(cols.slice());\n      return;\n    }\n    for (let c = 0; c < n; c++) {\n      if (used[c] || diag1[row + c] || diag2[row - c + n]) continue;\n      used[c] = true;\n      diag1[row + c] = true;\n      diag2[row - c + n] = true;\n      cols.push(c);\n      place(row + 1);\n      cols.pop();\n      used[c] = false;\n      diag1[row + c] = false;\n      diag2[row - c + n] = false;\n    }\n  };\n  place(0);\n  return { count, first };\n}\nfor (const n of [4, 5, 6]) {\n  const r = solve(n);\n  console.log(n, r.count, r.first[0].join(\",\"));\n}\nconsole.log(solve(8).count);"
  },
  {
    "id": "c371-e2e-sudoku-validator",
    "title": "数独校验器：行 / 列 / 宫",
    "src": "const board = [\n  \"53..7....\",\n  \"6..195...\",\n  \".98....6.\",\n  \"8...6...3\",\n  \"4..8.3..1\",\n  \"7...2...6\",\n  \".6....28.\",\n  \"...419..5\",\n  \"....8..79\",\n];\nfunction valid(rows: string[]): { ok: boolean; why: string } {\n  const check = (cells: string[], label: string): string | null => {\n    const seen: Record<string, boolean> = {};\n    for (const c of cells) {\n      if (c === \".\") continue;\n      if (seen[c]) return label + \":\" + c;\n      seen[c] = true;\n    }\n    return null;\n  };\n  for (let r = 0; r < 9; r++) {\n    const rowsProblem = check(rows[r].split(\"\"), \"row\" + r);\n    if (rowsProblem) return { ok: false, why: rowsProblem };\n    const col: string[] = [];\n    for (let c = 0; c < 9; c++) col.push(rows[c].charAt(r));\n    const colProblem = check(col, \"col\" + r);\n    if (colProblem) return { ok: false, why: colProblem };\n  }\n  for (let br = 0; br < 3; br++) {\n    for (let bc = 0; bc < 3; bc++) {\n      const cells: string[] = [];\n      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cells.push(rows[br * 3 + i].charAt(bc * 3 + j));\n      const problem = check(cells, \"box\" + br + bc);\n      if (problem) return { ok: false, why: problem };\n    }\n  }\n  return { ok: true, why: \"\" };\n}\nconsole.log(valid(board).ok);\nconst bad = board.slice();\nbad[0] = \"55..7....\";\nconsole.log(JSON.stringify(valid(bad)));\nlet filled = 0;\nfor (const row of board) for (const ch of row) if (ch !== \".\") filled += 1;\nconsole.log(filled, board.length, board[0].length);"
  },
  {
    "id": "c371-e2e-game-of-life",
    "title": "生命游戏：三代演化与统计",
    "src": "const rows = 6;\nconst cols = 6;\nlet grid: number[][] = [];\nfor (let r = 0; r < rows; r++) {\n  const row: number[] = [];\n  for (let c = 0; c < cols; c++) row.push(0);\n  grid.push(row);\n}\nfor (const [r, c] of [[1, 2], [2, 3], [3, 1], [3, 2], [3, 3]]) grid[r][c] = 1;\nfunction step(g: number[][]): number[][] {\n  const out: number[][] = [];\n  for (let r = 0; r < rows; r++) {\n    const row: number[] = [];\n    for (let c = 0; c < cols; c++) {\n      let live = 0;\n      for (let dr = -1; dr <= 1; dr++) {\n        for (let dc = -1; dc <= 1; dc++) {\n          if (dr === 0 && dc === 0) continue;\n          const nr = r + dr;\n          const nc = c + dc;\n          if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;\n          live += g[nr][nc];\n        }\n      }\n      row.push(g[r][c] === 1 ? (live === 2 || live === 3 ? 1 : 0) : live === 3 ? 1 : 0);\n    }\n    out.push(row);\n  }\n  return out;\n}\nconst render = (g: number[][]): string => g.map((row) => row.map((v) => (v ? \"#\" : \".\")).join(\"\")).join(\"/\");\nfor (let i = 0; i < 3; i++) {\n  console.log(render(grid));\n  grid = step(grid);\n}\nlet alive = 0;\nfor (const row of grid) for (const v of row) alive += v;\nconsole.log(\"alive\", alive, render(grid).length);"
  },
  {
    "id": "c371-e2e-maze-bfs",
    "title": "迷宫寻路：BFS 最短路与路径还原",
    "src": "const maze = [\n  \"S.#.....\",\n  \".#.#.##.\",\n  \".#...#..\",\n  \"...#.#..\",\n  \"##.#.#..\",\n  \".....#.E\",\n];\ntype P = { r: number; c: number };\nconst rows = maze.length;\nconst cols = maze[0].length;\nfunction find(ch: string): P {\n  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (maze[r].charAt(c) === ch) return { r, c };\n  throw new Error(\"not found: \" + ch);\n}\nfunction bfs(start: P, goal: P): P[] | null {\n  const key = (p: P): string => p.r + \",\" + p.c;\n  const seen: Record<string, boolean> = {};\n  const prev: Record<string, string> = {};\n  const queue: P[] = [start];\n  seen[key(start)] = true;\n  let head = 0;\n  while (head < queue.length) {\n    const cur = queue[head++];\n    if (cur.r === goal.r && cur.c === goal.c) {\n      const path: P[] = [];\n      let k: string | undefined = key(cur);\n      while (k !== undefined && k !== key(start)) {\n        const parts = k.split(\",\");\n        path.unshift({ r: Number(parts[0]), c: Number(parts[1]) });\n        k = prev[k];\n      }\n      path.unshift(start);\n      return path;\n    }\n    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {\n      const nr = cur.r + dr;\n      const nc = cur.c + dc;\n      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;\n      if (maze[nr].charAt(nc) === \"#\") continue;\n      const k = nr + \",\" + nc;\n      if (seen[k]) continue;\n      seen[k] = true;\n      prev[k] = key(cur);\n      queue.push({ r: nr, c: nc });\n    }\n  }\n  return null;\n}\nconst path = bfs(find(\"S\"), find(\"E\"));\nconsole.log(path === null ? \"none\" : path.length);\nconsole.log((path ?? []).map((p) => p.r + \"\" + p.c).join(\" \"));\nconsole.log(bfs(find(\"S\"), find(\"S\"))!.length, bfs({ r: 0, c: 0 }, { r: 0, c: 2 }));"
  },
  {
    "id": "c371-e2e-mustache-template",
    "title": "极简模板引擎：变量、点路径、循环、条件",
    "src": "type Ctx = Record<string, unknown>;\nfunction lookup(ctx: Ctx, path: string): unknown {\n  let cur: unknown = ctx;\n  for (const part of path.split(\".\")) {\n    if (cur === null || typeof cur !== \"object\") return undefined;\n    cur = (cur as Ctx)[part];\n  }\n  return cur;\n}\nfunction render(tpl: string, ctx: Ctx): string {\n  let out = \"\";\n  let i = 0;\n  while (i < tpl.length) {\n    const open = tpl.indexOf(\"{{\", i);\n    if (open < 0) { out += tpl.slice(i); break; }\n    out += tpl.slice(i, open);\n    const close = tpl.indexOf(\"}}\", open);\n    const expr = tpl.slice(open + 2, close).trim();\n    i = close + 2;\n    if (expr.startsWith(\"#each \")) {\n      const list = lookup(ctx, expr.slice(6)) as unknown[];\n      const end = tpl.indexOf(\"{{/each}}\", i);\n      const body = tpl.slice(i, end);\n      for (const item of list) {\n        if (typeof item === \"object\" && item !== null) out += render(body, item as Ctx);\n      }\n      i = end + 9;\n      continue;\n    }\n    if (expr.startsWith(\"#if \")) {\n      const val = lookup(ctx, expr.slice(4));\n      const end = tpl.indexOf(\"{{/if}}\", i);\n      if (val) out += render(tpl.slice(i, end), ctx);\n      i = end + 7;\n      continue;\n    }\n    const val = lookup(ctx, expr);\n    out += val === undefined || val === null ? \"\" : String(val);\n  }\n  return out;\n}\nconst tpl = \"Hello {{user.name}}! {{#if admin}}[admin]{{/if}}\\n{{#each items}}- {{label}}: {{qty}}\\n{{/each}}Total: {{total}}\";\nconsole.log(render(tpl, {\n  user: { name: \"Ann\" },\n  admin: true,\n  total: 7,\n  items: [{ label: \"pen\", qty: 2 }, { label: \"ink\", qty: 5 }],\n}));\nconsole.log(render(\"{{missing}}|{{a.b.c}}|{{#if none}}x{{/if}}\", { a: {} }));"
  },
  {
    "id": "c371-e2e-markdown-renderer",
    "title": "极简 Markdown 转文本/HTML 渲染器",
    "src": "function escapeHtml(s: string): string {\n  return s.split(\"&\").join(\"&amp;\").split(\"<\").join(\"&lt;\").split(\">\").join(\"&gt;\").split('\"').join(\"&quot;\");\n}\nfunction inline(text: string): string {\n  let out = \"\";\n  let i = 0;\n  while (i < text.length) {\n    if (text.startsWith(\"**\", i)) {\n      const end = text.indexOf(\"**\", i + 2);\n      if (end > 0) { out += \"<b>\" + escapeHtml(text.slice(i + 2, end)) + \"</b>\"; i = end + 2; continue; }\n    }\n    if (text.charAt(i) === \"`\") {\n      const end = text.indexOf(\"`\", i + 1);\n      if (end > 0) { out += \"<code>\" + escapeHtml(text.slice(i + 1, end)) + \"</code>\"; i = end + 1; continue; }\n    }\n    out += escapeHtml(text.charAt(i));\n    i += 1;\n  }\n  return out;\n}\nfunction markdown(lines: string[]): string {\n  const out: string[] = [];\n  let inList = false;\n  for (const line of lines) {\n    const trimmed = line.trim();\n    if (trimmed.startsWith(\"- \")) {\n      if (!inList) { out.push(\"<ul>\"); inList = true; }\n      out.push(\"  <li>\" + inline(trimmed.slice(2)) + \"</li>\");\n      continue;\n    }\n    if (inList) { out.push(\"</ul>\"); inList = false; }\n    if (trimmed.startsWith(\"# \")) out.push(\"<h1>\" + inline(trimmed.slice(2)) + \"</h1>\");\n    else if (trimmed.startsWith(\"## \")) out.push(\"<h2>\" + inline(trimmed.slice(3)) + \"</h2>\");\n    else if (trimmed === \"\") out.push(\"\");\n    else out.push(\"<p>\" + inline(trimmed) + \"</p>\");\n  }\n  if (inList) out.push(\"</ul>\");\n  return out.join(\"\\n\");\n}\nconst doc = [\"# Title\", \"\", \"A **bold** and `code` <tag>.\", \"\", \"- one\", \"- two\", \"\", \"## Sub\"];\nconsole.log(markdown(doc));\nconsole.log(escapeHtml(\"<a href=\\\"x\\\">&</a>\"));"
  },
  {
    "id": "c371-e2e-html-template-tagged",
    "title": "标签模板做 HTML 转义与拼接",
    "src": "function escapeHtml(v: unknown): string {\n  const s = String(v);\n  return s.split(\"&\").join(\"&amp;\").split(\"<\").join(\"&lt;\").split(\">\").join(\"&gt;\").split('\"').join(\"&quot;\");\n}\nfunction html(strings: TemplateStringsArray, ...values: unknown[]): string {\n  let out = strings[0];\n  for (let i = 0; i < values.length; i++) {\n    const v = values[i];\n    out += Array.isArray(v) ? v.map(escapeHtml).join(\"\") : escapeHtml(v);\n    out += strings[i + 1];\n  }\n  return out;\n}\nconst user = \"<script>\";\nconst rows = [{ n: \"a&b\" }, { n: \"c<d\" }];\nconst page = html`<ul>${rows.map((r) => `<li>${r.n}</li>`)}</ul>`;\nconsole.log(page);\nconsole.log(html`<p>${user}</p>`, html`${1 + 1}`, html`no-sub`);\nconsole.log(page.length, page.split(\"<li>\").length - 1);"
  },
  {
    "id": "c371-e2e-array-query-builder",
    "title": "数组上的类 SQL 查询：where / orderBy / groupBy / select",
    "src": "type Row = { dept: string; name: string; salary: number };\nconst rows: Row[] = [\n  { dept: \"eng\", name: \"ann\", salary: 120 },\n  { dept: \"eng\", name: \"bob\", salary: 90 },\n  { dept: \"ops\", name: \"cid\", salary: 100 },\n  { dept: \"ops\", name: \"dee\", salary: 95 },\n  { dept: \"sales\", name: \"eve\", salary: 80 },\n];\nclass Query {\n  private data: Row[];\n  constructor(data: Row[]) { this.data = data.slice(); }\n  where(pred: (r: Row) => boolean): Query { return new Query(this.data.filter(pred)); }\n  orderBy(key: (r: Row) => number | string, dir: \"asc\" | \"desc\" = \"asc\"): Query {\n    const sign = dir === \"desc\" ? -1 : 1;\n    const sorted = this.data.slice().sort((a, b) => {\n      const ka = key(a);\n      const kb = key(b);\n      if (typeof ka === \"number\" && typeof kb === \"number\") return (ka - kb) * sign;\n      return String(ka).localeCompare(String(kb)) * sign;\n    });\n    return new Query(sorted);\n  }\n  select<T>(map: (r: Row) => T): T[] { return this.data.map(map); }\n  groupBy<T>(key: (r: Row) => string, agg: (rs: Row[]) => T): Record<string, T> {\n    const groups: Record<string, Row[]> = {};\n    for (const r of this.data) {\n      const k = key(r);\n      groups[k] = groups[k] ?? [];\n      groups[k].push(r);\n    }\n    const out: Record<string, T> = {};\n    for (const k of Object.keys(groups)) out[k] = agg(groups[k]);\n    return out;\n  }\n  count(): number { return this.data.length; }\n}\nconst q = new Query(rows);\nconsole.log(q.where((r) => r.salary >= 95).count());\nconsole.log(q.orderBy((r) => r.salary, \"desc\").select((r) => r.name).join(\",\"));\nconst byDept = q.groupBy((r) => r.dept, (rs) => rs.reduce((a, b) => a + b.salary, 0));\nconsole.log(JSON.stringify(byDept));\nconsole.log(Object.keys(byDept).sort().join(\",\"), q.where((r) => r.dept === \"eng\").count());"
  },
  {
    "id": "c371-e2e-statistics-report",
    "title": "统计报告：均值 / 中位数 / 标准差 / 分位数",
    "src": "function mean(xs: number[]): number { return xs.reduce((a, b) => a + b, 0) / xs.length; }\nfunction median(xs: number[]): number {\n  const s = xs.slice().sort((a, b) => a - b);\n  const mid = Math.floor(s.length / 2);\n  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;\n}\nfunction stdev(xs: number[]): number {\n  const m = mean(xs);\n  return Math.sqrt(xs.reduce((a, b) => a + (b - m) * (b - m), 0) / xs.length);\n}\nfunction percentile(xs: number[], p: number): number {\n  const s = xs.slice().sort((a, b) => a - b);\n  const idx = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));\n  return s[idx];\n}\nfunction histogram(xs: number[], bins: number): number[] {\n  const lo = Math.min(...xs);\n  const hi = Math.max(...xs);\n  const width = (hi - lo) / bins || 1;\n  const out: number[] = [];\n  for (let i = 0; i < bins; i++) out.push(0);\n  for (const v of xs) {\n    const idx = Math.min(bins - 1, Math.floor((v - lo) / width));\n    out[idx] += 1;\n  }\n  return out;\n}\nconst data = [12, 7, 3, 19, 25, 7, 14, 14, 2, 30, 11];\nconsole.log(\"mean\", mean(data).toFixed(3), \"median\", median(data), \"stdev\", stdev(data).toFixed(3));\nconsole.log(\"min\", Math.min(...data), \"max\", Math.max(...data), \"range\", Math.max(...data) - Math.min(...data));\nconsole.log(\"p25\", percentile(data, 25), \"p50\", percentile(data, 50), \"p90\", percentile(data, 90));\nconsole.log(\"hist\", histogram(data, 5).join(\",\"));\nconsole.log(\"sorted\", data.slice().sort((a, b) => a - b).join(\",\"));"
  },
  {
    "id": "c371-e2e-fixed-point-money",
    "title": "定点金额运算：分为单位、分配余数、汇总",
    "src": "class Money {\n  constructor(public readonly cents: number) {}\n  static from(amount: number): Money { return new Money(Math.round(amount * 100)); }\n  add(other: Money): Money { return new Money(this.cents + other.cents); }\n  sub(other: Money): Money { return new Money(this.cents - other.cents); }\n  times(factor: number): Money { return new Money(Math.round(this.cents * factor)); }\n  get dollars(): string {\n    const sign = this.cents < 0 ? \"-\" : \"\";\n    const abs = Math.abs(this.cents);\n    return sign + Math.floor(abs / 100) + \".\" + String(abs % 100).padStart(2, \"0\");\n  }\n  toString(): string { return \"$\" + this.dollars; }\n  valueOf(): number { return this.cents; }\n}\nconst prices = [Money.from(19.99), Money.from(5.05), Money.from(0.1)];\nconst total = prices.reduce((a, b) => a.add(b), new Money(0));\nconsole.log(total.toString(), total.cents);\nconsole.log(total.times(1.08).toString(), total.sub(Money.from(1)).toString());\nfunction allocate(amount: Money, weights: number[]): Money[] {\n  const sum = weights.reduce((a, b) => a + b, 0);\n  const shares: Money[] = [];\n  let used = 0;\n  for (let i = 0; i < weights.length; i++) {\n    const share = i === weights.length - 1 ? amount.cents - used : Math.floor((amount.cents * weights[i]) / sum);\n    shares.push(new Money(share));\n    used += share;\n  }\n  return shares;\n}\nconsole.log(allocate(Money.from(10), [1, 1, 1]).map((m) => m.toString()).join(\",\"));\nconsole.log(allocate(new Money(100), [3, 7]).map((m) => m.cents).join(\",\"));",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-e2e-interval-merge",
    "title": "区间合并、求交与覆盖长度",
    "src": "type Interval = [number, number];\nfunction merge(intervals: Interval[]): Interval[] {\n  if (intervals.length === 0) return [];\n  const sorted = intervals.slice().sort((a, b) => a[0] - b[0]);\n  const out: Interval[] = [sorted[0].slice() as Interval];\n  for (let i = 1; i < sorted.length; i++) {\n    const cur = sorted[i];\n    const last = out[out.length - 1];\n    if (cur[0] <= last[1]) last[1] = Math.max(last[1], cur[1]);\n    else out.push(cur.slice() as Interval);\n  }\n  return out;\n}\nfunction intersect(a: Interval[], b: Interval[]): Interval[] {\n  const out: Interval[] = [];\n  for (const x of a) for (const y of b) {\n    const lo = Math.max(x[0], y[0]);\n    const hi = Math.min(x[1], y[1]);\n    if (lo <= hi) out.push([lo, hi]);\n  }\n  return merge(out);\n}\nfunction covered(intervals: Interval[]): number {\n  return merge(intervals).reduce((acc, [lo, hi]) => acc + (hi - lo), 0);\n}\nconst xs: Interval[] = [[1, 3], [2, 6], [8, 10], [15, 18], [9, 12]];\nconsole.log(JSON.stringify(merge(xs)));\nconsole.log(JSON.stringify(intersect([[1, 5], [8, 12]], [[3, 9]])));\nconsole.log(covered(xs), covered([]), covered([[0, 1]]));\nconst empty = merge([]);\nconsole.log(empty.length, intersect([[1, 2]], [[3, 4]]).length);"
  },
  {
    "id": "c371-e2e-bit-flags",
    "title": "位标志：权限的组合、检查、切换与展示",
    "src": "const PERM = { READ: 1, WRITE: 2, EXEC: 4, DELETE: 8, ADMIN: 16 } as const;\ntype PermName = keyof typeof PERM;\nfunction grant(mask: number, ...names: PermName[]): number {\n  let out = mask;\n  for (const n of names) out |= PERM[n];\n  return out;\n}\nfunction revoke(mask: number, ...names: PermName[]): number {\n  let out = mask;\n  for (const n of names) out &= ~PERM[n];\n  return out;\n}\nfunction has(mask: number, name: PermName): boolean { return (mask & PERM[name]) !== 0; }\nfunction describe(mask: number): string {\n  const names = Object.keys(PERM).filter((k) => has(mask, k as PermName));\n  return names.length === 0 ? \"none\" : names.join(\"|\");\n}\nlet mask = 0;\nmask = grant(mask, \"READ\", \"WRITE\");\nconsole.log(mask, describe(mask), has(mask, \"EXEC\"));\nmask = grant(mask, \"EXEC\", \"ADMIN\");\nconsole.log(describe(mask), mask.toString(2).padStart(5, \"0\"));\nmask = revoke(mask, \"WRITE\", \"ADMIN\");\nconsole.log(describe(mask), (mask & PERM.ADMIN) === 0, mask > 0);\nconsole.log(describe(grant(0, \"DELETE\")), describe(0));"
  },
  {
    "id": "c371-e2e-range-and-slices",
    "title": "区间与切片工具：range / chunk / window / zip",
    "src": "function range(start: number, end: number, step = 1): number[] {\n  const out: number[] = [];\n  if (step === 0) return out;\n  if (step > 0) for (let i = start; i < end; i += step) out.push(i);\n  else for (let i = start; i > end; i += step) out.push(i);\n  return out;\n}\nfunction chunk<T>(xs: T[], size: number): T[][] {\n  const out: T[][] = [];\n  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));\n  return out;\n}\nfunction window<T>(xs: T[], size: number): T[][] {\n  const out: T[][] = [];\n  for (let i = 0; i + size <= xs.length; i++) out.push(xs.slice(i, i + size));\n  return out;\n}\nfunction zip<A, B>(a: A[], b: B[]): [A, B][] {\n  const out: [A, B][] = [];\n  for (let i = 0; i < Math.min(a.length, b.length); i++) out.push([a[i], b[i]]);\n  return out;\n}\nconsole.log(range(0, 5).join(\",\"), range(5, 0, -2).join(\",\"), range(0, 5, 2).join(\",\"));\nconsole.log(JSON.stringify(chunk([1, 2, 3, 4, 5], 2)));\nconsole.log(JSON.stringify(window([1, 2, 3, 4], 3)));\nconsole.log(zip([\"a\", \"b\", \"c\"], [1, 2]).map((p) => p[0] + p[1]).join(\",\"));\nconsole.log(JSON.stringify(chunk([], 2)), window([1], 2).length, range(0, 0).length);"
  },
  {
    "id": "c371-e2e-roman-numerals",
    "title": "罗马数字互转与全表校验",
    "src": "const TABLE: [number, string][] = [[1000, \"M\"], [900, \"CM\"], [500, \"D\"], [400, \"CD\"], [100, \"C\"], [90, \"XC\"], [50, \"L\"], [40, \"XL\"], [10, \"X\"], [9, \"IX\"], [5, \"V\"], [4, \"IV\"], [1, \"I\"]];\nfunction toRoman(n: number): string {\n  if (n <= 0 || n >= 4000) throw new RangeError(\"out of range: \" + n);\n  let out = \"\";\n  let rest = n;\n  for (const [value, symbol] of TABLE) {\n    while (rest >= value) { out += symbol; rest -= value; }\n  }\n  return out;\n}\nfunction fromRoman(s: string): number {\n  const values: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };\n  let total = 0;\n  for (let i = 0; i < s.length; i++) {\n    const cur = values[s.charAt(i)];\n    const next = values[s.charAt(i + 1)] ?? 0;\n    total += cur < next ? -cur : cur;\n  }\n  return total;\n}\nfor (const n of [1, 4, 9, 14, 40, 90, 400, 1987, 3999]) console.log(n, toRoman(n), fromRoman(toRoman(n)));\nconsole.log(fromRoman(\"MCMXCIV\"), toRoman(2024));\ntry { toRoman(0); } catch (e) { console.log((e as Error).name); }\nlet allRoundTrip = true;\nfor (let n = 1; n <= 3999; n++) if (fromRoman(toRoman(n)) !== n) allRoundTrip = false;\nconsole.log(\"roundtrip\", allRoundTrip);"
  },
  {
    "id": "c371-e2e-base-conversion-hexdump",
    "title": "进制转换与十六进制转储",
    "src": "function toBase(n: number, base: number): string {\n  const digits = \"0123456789abcdefghijklmnopqrstuvwxyz\";\n  if (n === 0) return \"0\";\n  const sign = n < 0 ? \"-\" : \"\";\n  let v = Math.abs(Math.trunc(n));\n  let out = \"\";\n  while (v > 0) { out = digits.charAt(v % base) + out; v = Math.floor(v / base); }\n  return sign + out;\n}\nfunction fromBase(s: string, base: number): number {\n  const digits = \"0123456789abcdefghijklmnopqrstuvwxyz\";\n  const sign = s.startsWith(\"-\") ? -1 : 1;\n  const body = sign === -1 ? s.slice(1) : s;\n  let out = 0;\n  for (const ch of body.toLowerCase()) {\n    const d = digits.indexOf(ch);\n    if (d < 0 || d >= base) throw new Error(\"bad digit: \" + ch);\n    out = out * base + d;\n  }\n  return out * sign;\n}\nfor (const [n, b] of [[255, 16], [255, 2], [64, 8], [-100, 36], [0, 2]] as [number, number][]) {\n  console.log(n, b, toBase(n, b), fromBase(toBase(n, b), b));\n}\nfunction hexdump(data: number[]): string[] {\n  const out: string[] = [];\n  for (let i = 0; i < data.length; i += 8) {\n    const slice = data.slice(i, i + 8);\n    const hex = slice.map((b) => b.toString(16).padStart(2, \"0\")).join(\" \");\n    const text = slice.map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : \".\")).join(\"\");\n    out.push(i.toString(16).padStart(4, \"0\") + \"  \" + hex.padEnd(23, \" \") + \"  \" + text);\n  }\n  return out;\n}\nfor (const line of hexdump([72, 101, 108, 108, 111, 0, 255, 65, 66])) console.log(line);"
  },
  {
    "id": "c371-e2e-rle-compression",
    "title": "游程编码压缩与解压",
    "src": "function encode(input: string): string {\n  let out = \"\";\n  let i = 0;\n  while (i < input.length) {\n    const ch = input.charAt(i);\n    let run = 1;\n    while (i + run < input.length && input.charAt(i + run) === ch) run += 1;\n    out += run > 1 ? String(run) + ch : ch;\n    i += run;\n  }\n  return out;\n}\nfunction decode(input: string): string {\n  let out = \"\";\n  let i = 0;\n  while (i < input.length) {\n    let digits = \"\";\n    while (i < input.length && input.charAt(i) >= \"0\" && input.charAt(i) <= \"9\") { digits += input.charAt(i); i += 1; }\n    const ch = input.charAt(i);\n    i += 1;\n    out += ch.repeat(digits === \"\" ? 1 : Number(digits));\n  }\n  return out;\n}\nconst samples = [\"aaabbbcccd\", \"abcd\", \"aaaaaaaaaaaa\", \"a\", \"\"];\nfor (const s of samples) {\n  const packed = encode(s);\n  console.log(JSON.stringify(s), \"->\", JSON.stringify(packed), \"->\", JSON.stringify(decode(packed)), decode(packed) === s);\n}\nconst long = \"ab\".repeat(500) + \"c\";\nconsole.log(encode(long).length, decode(encode(long)).length, decode(encode(long)) === long);"
  },
  {
    "id": "c371-e2e-word-wrap-and-align",
    "title": "文本折行、对齐与盒子绘制",
    "src": "function wrap(text: string, width: number): string[] {\n  const words = text.split(\" \").filter((w) => w.length > 0);\n  const lines: string[] = [];\n  let cur = \"\";\n  for (const w of words) {\n    if (cur === \"\") cur = w;\n    else if (cur.length + 1 + w.length <= width) cur += \" \" + w;\n    else { lines.push(cur); cur = w; }\n  }\n  if (cur !== \"\") lines.push(cur);\n  return lines;\n}\nfunction box(lines: string[], width: number): string[] {\n  const top = \"+\" + \"-\".repeat(width + 2) + \"+\";\n  const out = [top];\n  for (const line of lines) out.push(\"| \" + line.padEnd(width) + \" |\");\n  out.push(top);\n  return out;\n}\nconst text = \"the quick brown fox jumps over the lazy dog and then keeps running\";\nconst lines = wrap(text, 20);\nfor (const line of box(lines, 20)) console.log(line);\nconsole.log(lines.length, lines.map((l) => l.length).join(\",\"));\nconst right = wrap(\"a bb ccc\", 3);\nconsole.log(JSON.stringify(right), wrap(\"\", 5).length, wrap(\"word\", 1).length);"
  },
  {
    "id": "c371-e2e-pivot-table",
    "title": "透视表：行维度 × 列维度 × 聚合",
    "src": "type Sale = { region: string; quarter: string; amount: number };\nconst sales: Sale[] = [\n  { region: \"north\", quarter: \"Q1\", amount: 10 },\n  { region: \"north\", quarter: \"Q2\", amount: 20 },\n  { region: \"south\", quarter: \"Q1\", amount: 5 },\n  { region: \"south\", quarter: \"Q2\", amount: 7 },\n  { region: \"north\", quarter: \"Q1\", amount: 3 },\n];\nfunction pivot(rows: Sale[], rowKey: (s: Sale) => string, colKey: (s: Sale) => string, value: (s: Sale) => number, agg: (xs: number[]) => number): string[][] {\n  const rowNames = [...new Set(rows.map(rowKey))].sort();\n  const colNames = [...new Set(rows.map(colKey))].sort();\n  const table: string[][] = [[\"\"].concat(colNames, [\"total\"])];\n  for (const r of rowNames) {\n    const line: string[] = [r];\n    let rowTotal = 0;\n    for (const c of colNames) {\n      const cell = rows.filter((s) => rowKey(s) === r && colKey(s) === c).map(value);\n      const v = cell.length === 0 ? 0 : agg(cell);\n      rowTotal += v;\n      line.push(String(v));\n    }\n    line.push(String(rowTotal));\n    table.push(line);\n  }\n  const footer: string[] = [\"total\"];\n  let grand = 0;\n  for (const c of colNames) {\n    const v = agg(rows.filter((s) => colKey(s) === c).map(value));\n    grand += v;\n    footer.push(String(v));\n  }\n  footer.push(String(grand));\n  table.push(footer);\n  return table;\n}\nconst sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);\nconst table = pivot(sales, (s) => s.region, (s) => s.quarter, (s) => s.amount, sum);\nfor (const row of table) console.log(row.map((c) => c.padEnd(7)).join(\"\"));\nconsole.log(table.length, table[0].length);\nconst avg = (xs: number[]): number => Math.round(sum(xs) / xs.length);\nconsole.log(pivot(sales, (s) => s.region, (s) => s.quarter, (s) => s.amount, avg)[1].join(\",\"));"
  },
  {
    "id": "c371-e2e-time-bucketing",
    "title": "时间序列分桶与环比",
    "src": "type Event = { at: number; value: number };\nconst events: Event[] = [\n  { at: Date.UTC(2024, 0, 1, 0, 5), value: 1 },\n  { at: Date.UTC(2024, 0, 1, 0, 45), value: 2 },\n  { at: Date.UTC(2024, 0, 1, 1, 10), value: 3 },\n  { at: Date.UTC(2024, 0, 1, 2, 59), value: 4 },\n];\nconst HOUR = 3600000;\nfunction bucket(events: Event[], sizeMs: number): Map<number, number> {\n  const out = new Map<number, number>();\n  for (const e of events) {\n    const key = Math.floor(e.at / sizeMs) * sizeMs;\n    out.set(key, (out.get(key) ?? 0) + e.value);\n  }\n  return out;\n}\nconst hourly = bucket(events, HOUR);\nfor (const [key, total] of hourly) {\n  console.log(new Date(key).toISOString().slice(11, 16), total);\n}\nconst keys = [...hourly.keys()].sort((a, b) => a - b);\nconst deltas: string[] = [];\nfor (let i = 1; i < keys.length; i++) {\n  const prev = hourly.get(keys[i - 1]) as number;\n  const cur = hourly.get(keys[i]) as number;\n  deltas.push(((cur - prev) / prev * 100).toFixed(1) + \"%\");\n}\nconsole.log(deltas.join(\",\"));\nconsole.log(hourly.size, bucket(events, HOUR * 2).size, bucket([], HOUR).size);"
  },
  {
    "id": "c371-e2e-log-aggregation",
    "title": "日志解析与聚合：级别、耗时、热点",
    "src": "const raw = [\n  \"2024-01-01T10:00:00 INFO  request id=1 ms=120 path=/a\",\n  \"2024-01-01T10:00:01 WARN  request id=2 ms=350 path=/b\",\n  \"2024-01-01T10:00:02 ERROR request id=3 ms=900 path=/a\",\n  \"2024-01-01T10:00:03 INFO  request id=4 ms=80 path=/c\",\n  \"malformed line without structure\",\n];\ntype Entry = { level: string; ms: number; path: string };\nfunction parse(line: string): Entry | null {\n  const parts = line.split(\" \");\n  if (parts.length < 6) return null;\n  const level = parts[1];\n  let ms = 0;\n  let path = \"\";\n  for (const p of parts) {\n    if (p.startsWith(\"ms=\")) ms = Number(p.slice(3));\n    if (p.startsWith(\"path=\")) path = p.slice(5);\n  }\n  return { level, ms, path };\n}\nconst entries: Entry[] = [];\nlet bad = 0;\nfor (const line of raw) {\n  const e = parse(line);\n  if (e === null) bad += 1;\n  else entries.push(e);\n}\nconsole.log(entries.length, bad);\nconst byLevel: Record<string, number> = {};\nfor (const e of entries) byLevel[e.level] = (byLevel[e.level] ?? 0) + 1;\nconsole.log(JSON.stringify(byLevel));\nconst byPath = new Map<string, number[]>();\nfor (const e of entries) {\n  const list = byPath.get(e.path) ?? [];\n  list.push(e.ms);\n  byPath.set(e.path, list);\n}\nconst slowest = [...byPath.entries()].map(([p, list]) => ({\n  path: p,\n  avg: Math.round(list.reduce((a, b) => a + b, 0) / list.length),\n  max: Math.max(...list),\n})).sort((a, b) => b.avg - a.avg);\nfor (const s of slowest) console.log(s.path, s.avg, s.max);\nconsole.log(entries.reduce((a, b) => a + b.ms, 0));"
  },
  {
    "id": "c371-e2e-validation-library",
    "title": "校验库：错误累积与路径报告",
    "src": "type Issue = { path: string; message: string };\ntype Rule<T> = (value: unknown, path: string) => Issue[];\nfunction isString(value: unknown, path: string): Issue[] {\n  return typeof value === \"string\" ? [] : [{ path, message: \"expected string\" }];\n}\nfunction minLength(n: number): Rule<unknown> {\n  return (value, path) => (typeof value === \"string\" && value.length < n ? [{ path, message: \"min \" + n }] : []);\n}\nfunction objectShape(shape: Record<string, Rule<unknown>[]>): Rule<unknown> {\n  return (value, path) => {\n    if (typeof value !== \"object\" || value === null) return [{ path, message: \"expected object\" }];\n    const issues: Issue[] = [];\n    for (const key of Object.keys(shape)) {\n      const child = (value as Record<string, unknown>)[key];\n      for (const rule of shape[key]) issues.push(...rule(child, path === \"\" ? key : path + \".\" + key));\n    }\n    return issues;\n  };\n}\nfunction arrayOf(rule: Rule<unknown>): Rule<unknown> {\n  return (value, path) => {\n    if (!Array.isArray(value)) return [{ path, message: \"expected array\" }];\n    const issues: Issue[] = [];\n    value.forEach((item, index) => { for (const r of [rule]) issues.push(...r(item, path + \"[\" + index + \"]\")); });\n    return issues;\n  };\n}\nconst userSchema = objectShape({\n  name: [isString, minLength(3)],\n  tags: [arrayOf(isString)],\n});\nconst cases: unknown[] = [\n  { name: \"ann\", tags: [\"a\"] },\n  { name: \"bo\", tags: [\"a\", 2] },\n  { name: 5, tags: \"not-array\" },\n  null,\n];\nfor (const value of cases) {\n  const issues = userSchema(value, \"\");\n  console.log(issues.length, issues.map((i) => i.path + \":\" + i.message).join(\"|\"));\n}"
  },
  {
    "id": "c371-e2e-plugin-registry",
    "title": "插件注册表：惰性工厂、依赖顺序、失败隔离",
    "src": "type Plugin = { name: string; deps: string[]; factory: () => string };\nclass Registry {\n  private defs = new Map<string, Plugin>();\n  private built = new Map<string, string>();\n  private building = new Set<string>();\n  register(p: Plugin): this { this.defs.set(p.name, p); return this; }\n  get(name: string): string {\n    const cached = this.built.get(name);\n    if (cached !== undefined) return cached;\n    const def = this.defs.get(name);\n    if (!def) throw new Error(\"unknown plugin: \" + name);\n    if (this.building.has(name)) throw new Error(\"cycle at \" + name);\n    this.building.add(name);\n    const parts = def.deps.map((d) => this.get(d));\n    const value = def.factory() + \"(\" + parts.join(\"+\") + \")\";\n    this.building.delete(name);\n    this.built.set(name, value);\n    return value;\n  }\n  names(): string[] { return [...this.defs.keys()].sort(); }\n}\nconst reg = new Registry();\nreg.register({ name: \"core\", deps: [], factory: () => \"core\" });\nreg.register({ name: \"log\", deps: [\"core\"], factory: () => \"log\" });\nreg.register({ name: \"http\", deps: [\"log\", \"core\"], factory: () => \"http\" });\nreg.register({ name: \"app\", deps: [\"http\"], factory: () => \"app\" });\nconsole.log(reg.get(\"app\"));\nconsole.log(reg.names().join(\",\"));\nreg.register({ name: \"x\", deps: [\"x\"], factory: () => \"x\" });\ntry { reg.get(\"x\"); } catch (e) { console.log((e as Error).message); }\ntry { reg.get(\"nope\"); } catch (e) { console.log((e as Error).message); }\nconsole.log(reg.get(\"app\") === reg.get(\"app\"));"
  },
  {
    "id": "c371-e2e-command-dispatcher",
    "title": "命令分发器：注册、别名、参数解析、错误处理",
    "src": "type Cmd = { name: string; aliases: string[]; run: (args: string[]) => string };\nclass Dispatcher {\n  private table = new Map<string, Cmd>();\n  private history: string[] = [];\n  register(cmd: Cmd): void {\n    this.table.set(cmd.name, cmd);\n    for (const a of cmd.aliases) this.table.set(a, cmd);\n  }\n  dispatch(line: string): string {\n    const parts = line.trim().split(\" \").filter((p) => p !== \"\");\n    if (parts.length === 0) return \"empty\";\n    const cmd = this.table.get(parts[0]);\n    this.history.push(parts[0]);\n    if (!cmd) return \"unknown: \" + parts[0];\n    try { return cmd.run(parts.slice(1)); } catch (e) { return \"error: \" + (e as Error).message; }\n  }\n  get log(): string[] { return this.history.slice(); }\n}\nconst d = new Dispatcher();\nd.register({ name: \"add\", aliases: [\"a\", \"+\"], run: (args) => String(args.map(Number).reduce((x, y) => x + y, 0)) });\nd.register({ name: \"echo\", aliases: [\"e\"], run: (args) => args.join(\" \") });\nd.register({ name: \"boom\", aliases: [], run: () => { throw new Error(\"nope\"); } });\nconsole.log(d.dispatch(\"add 1 2 3\"), d.dispatch(\"+ 4 5\"), d.dispatch(\"echo hello world\"));\nconsole.log(d.dispatch(\"nope\"), d.dispatch(\"boom\"), d.dispatch(\"   \"));\nconsole.log(d.log.join(\",\"), d.dispatch(\"a 10\"));"
  },
  {
    "id": "c371-e2e-seeded-random",
    "title": "可复现的伪随机数（LCG）与洗牌 / 抽样",
    "src": "class Rng {\n  private state: number;\n  constructor(seed: number) { this.state = seed >>> 0; }\n  next(): number {\n    this.state = (this.state * 1664525 + 1013904223) >>> 0;\n    return this.state / 4294967296;\n  }\n  int(maxExclusive: number): number { return Math.floor(this.next() * maxExclusive); }\n  pick<T>(xs: T[]): T { return xs[this.int(xs.length)]; }\n  shuffle<T>(xs: T[]): T[] {\n    const out = xs.slice();\n    for (let i = out.length - 1; i > 0; i--) {\n      const j = this.int(i + 1);\n      const tmp = out[i];\n      out[i] = out[j];\n      out[j] = tmp;\n    }\n    return out;\n  }\n}\nconst a = new Rng(42);\nconst b = new Rng(42);\nconsole.log(a.next().toFixed(6), b.next().toFixed(6), a.next() === b.next());\nconst rng = new Rng(7);\nconsole.log([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(() => rng.int(100)).join(\",\"));\nconst rng2 = new Rng(1);\nconsole.log(rng2.shuffle([1, 2, 3, 4, 5]).join(\"\"));\nconsole.log(new Rng(99).shuffle([1, 2, 3, 4, 5]).join(\"\") === new Rng(99).shuffle([1, 2, 3, 4, 5]).join(\"\"));\nconst r = new Rng(3);\nlet inRange = true;\nfor (let i = 0; i < 1000; i++) { const v = r.next(); if (v < 0 || v >= 1) inRange = false; }\nconsole.log(\"inRange\", inRange);"
  },
  {
    "id": "c371-e2e-big-integer-arithmetic",
    "title": "字符串实现的大整数加 / 乘 / 阶乘",
    "src": "function normalize(digits: number[]): number[] {\n  let carry = 0;\n  const out: number[] = [];\n  for (const d of digits) {\n    const v = d + carry;\n    out.push(v % 10);\n    carry = Math.floor(v / 10);\n  }\n  while (carry > 0) { out.push(carry % 10); carry = Math.floor(carry / 10); }\n  while (out.length > 1 && out[out.length - 1] === 0) out.pop();\n  return out;\n}\nfunction fromString(s: string): number[] {\n  const out: number[] = [];\n  for (let i = s.length - 1; i >= 0; i--) out.push(Number(s.charAt(i)));\n  return normalize(out);\n}\nfunction toString(digits: number[]): string {\n  return digits.slice().reverse().join(\"\");\n}\nfunction add(a: number[], b: number[]): number[] {\n  const out: number[] = [];\n  const n = Math.max(a.length, b.length);\n  for (let i = 0; i < n; i++) out.push((a[i] ?? 0) + (b[i] ?? 0));\n  return normalize(out);\n}\nfunction mul(a: number[], b: number[]): number[] {\n  const out: number[] = [];\n  for (let i = 0; i < a.length + b.length; i++) out.push(0);\n  for (let i = 0; i < a.length; i++) {\n    for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];\n  }\n  return normalize(out);\n}\nconsole.log(toString(add(fromString(\"999999999999999999\"), fromString(\"1\"))));\nconsole.log(toString(mul(fromString(\"123456789\"), fromString(\"987654321\"))));\nlet fact = fromString(\"1\");\nfor (let i = 2; i <= 30; i++) fact = mul(fact, fromString(String(i)));\nconsole.log(toString(fact), toString(fact).length);\nconsole.log(toString(add(fromString(\"0\"), fromString(\"0\"))), toString(mul(fromString(\"0\"), fromString(\"5\"))));"
  },
  {
    "id": "c371-e2e-matrix-linear-algebra",
    "title": "矩阵运算：乘、转置、行列式、单位阵",
    "src": "type Matrix = number[][];\nfunction zeros(r: number, c: number): Matrix {\n  const out: Matrix = [];\n  for (let i = 0; i < r; i++) { const row: number[] = []; for (let j = 0; j < c; j++) row.push(0); out.push(row); }\n  return out;\n}\nfunction mul(a: Matrix, b: Matrix): Matrix {\n  const out = zeros(a.length, b[0].length);\n  for (let i = 0; i < a.length; i++) {\n    for (let j = 0; j < b[0].length; j++) {\n      let sum = 0;\n      for (let k = 0; k < b.length; k++) sum += a[i][k] * b[k][j];\n      out[i][j] = sum;\n    }\n  }\n  return out;\n}\nfunction transpose(a: Matrix): Matrix {\n  const out = zeros(a[0].length, a.length);\n  for (let i = 0; i < a.length; i++) for (let j = 0; j < a[0].length; j++) out[j][i] = a[i][j];\n  return out;\n}\nfunction det(a: Matrix): number {\n  const n = a.length;\n  if (n === 1) return a[0][0];\n  if (n === 2) return a[0][0] * a[1][1] - a[0][1] * a[1][0];\n  let total = 0;\n  for (let c = 0; c < n; c++) {\n    const minor: Matrix = [];\n    for (let i = 1; i < n; i++) {\n      const row: number[] = [];\n      for (let j = 0; j < n; j++) if (j !== c) row.push(a[i][j]);\n      minor.push(row);\n    }\n    total += (c % 2 === 0 ? 1 : -1) * a[0][c] * det(minor);\n  }\n  return total;\n}\nfunction identity(n: number): Matrix {\n  const out = zeros(n, n);\n  for (let i = 0; i < n; i++) out[i][i] = 1;\n  return out;\n}\nconst a: Matrix = [[1, 2], [3, 4]];\nconst b: Matrix = [[5, 6], [7, 8]];\nconsole.log(JSON.stringify(mul(a, b)));\nconsole.log(JSON.stringify(transpose([[1, 2, 3], [4, 5, 6]])));\nconsole.log(det(a), det(identity(3)), det([[2, 0, 1], [1, 3, 2], [1, 1, 1]]));\nconsole.log(JSON.stringify(mul(a, identity(2))) === JSON.stringify(a));"
  },
  {
    "id": "c371-e2e-polynomial",
    "title": "多项式：加、乘、求值、求导",
    "src": "class Poly {\n  constructor(public coeffs: number[]) {}\n  static of(...c: number[]): Poly { return new Poly(c); }\n  degree(): number { return this.coeffs.length - 1; }\n  add(other: Poly): Poly {\n    const n = Math.max(this.coeffs.length, other.coeffs.length);\n    const out: number[] = [];\n    for (let i = 0; i < n; i++) out.push((this.coeffs[i] ?? 0) + (other.coeffs[i] ?? 0));\n    return new Poly(trim(out));\n  }\n  mul(other: Poly): Poly {\n    const out: number[] = [];\n    for (let i = 0; i < this.coeffs.length + other.coeffs.length - 1; i++) out.push(0);\n    for (let i = 0; i < this.coeffs.length; i++) {\n      for (let j = 0; j < other.coeffs.length; j++) out[i + j] += this.coeffs[i] * other.coeffs[j];\n    }\n    return new Poly(trim(out));\n  }\n  eval(x: number): number {\n    let out = 0;\n    for (let i = this.coeffs.length - 1; i >= 0; i--) out = out * x + this.coeffs[i];\n    return out;\n  }\n  derivative(): Poly {\n    if (this.coeffs.length <= 1) return new Poly([0]);\n    const out: number[] = [];\n    for (let i = 1; i < this.coeffs.length; i++) out.push(this.coeffs[i] * i);\n    return new Poly(out);\n  }\n  toString(): string {\n    const parts: string[] = [];\n    for (let i = this.coeffs.length - 1; i >= 0; i--) {\n      if (this.coeffs[i] === 0) continue;\n      parts.push(this.coeffs[i] + (i === 0 ? \"\" : i === 1 ? \"x\" : \"x^\" + i));\n    }\n    return parts.length === 0 ? \"0\" : parts.join(\" + \");\n  }\n}\nfunction trim(c: number[]): number[] {\n  const out = c.slice();\n  while (out.length > 1 && out[out.length - 1] === 0) out.pop();\n  return out;\n}\nconst p = Poly.of(1, 2, 3);\nconst q = Poly.of(0, 1);\nconsole.log(p.toString(), q.toString(), p.degree(), q.degree());\nconsole.log(p.add(q).toString(), p.mul(q).toString());\nconsole.log(p.eval(2), p.eval(0), p.derivative().toString(), p.derivative().eval(2));\nconsole.log(Poly.of(0).toString(), Poly.of(5).eval(10));",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-e2e-rational-and-complex",
    "title": "有理数与复数两个小值类型（相等、运算、字符串）",
    "src": "function gcd(a: number, b: number): number { let x = Math.abs(a); let y = Math.abs(b); while (y) { const t = x % y; x = y; y = t; } return x || 1; }\nclass Rat {\n  constructor(public n: number, public d: number = 1) {\n    const g = gcd(n, d);\n    const sign = d < 0 ? -1 : 1;\n    this.n = (n / g) * sign;\n    this.d = Math.abs(d / g);\n  }\n  add(o: Rat): Rat { return new Rat(this.n * o.d + o.n * this.d, this.d * o.d); }\n  mul(o: Rat): Rat { return new Rat(this.n * o.n, this.d * o.d); }\n  equals(o: Rat): boolean { return this.n === o.n && this.d === o.d; }\n  toString(): string { return this.d === 1 ? String(this.n) : this.n + \"/\" + this.d; }\n  valueOf(): number { return this.n / this.d; }\n}\nconsole.log(new Rat(2, 4).toString(), new Rat(-4, 6).toString(), new Rat(3, -9).toString());\nconsole.log(new Rat(1, 2).add(new Rat(1, 3)).toString(), new Rat(2, 3).mul(new Rat(3, 4)).toString());\nconsole.log(new Rat(1, 2).equals(new Rat(2, 4)), new Rat(1, 2) + new Rat(1, 2) as any);\nclass Cx {\n  constructor(public re: number, public im: number = 0) {}\n  add(o: Cx): Cx { return new Cx(this.re + o.re, this.im + o.im); }\n  mul(o: Cx): Cx { return new Cx(this.re * o.re - this.im * o.im, this.re * o.im + this.im * o.re); }\n  abs(): number { return Math.sqrt(this.re * this.re + this.im * this.im); }\n  toString(): string { return this.im === 0 ? String(this.re) : this.re + (this.im < 0 ? \"-\" : \"+\") + Math.abs(this.im) + \"i\"; }\n}\nconst i = new Cx(0, 1);\nconsole.log(i.mul(i).toString(), new Cx(1, 2).add(new Cx(3, -1)).toString());\nconsole.log(new Cx(3, 4).abs(), new Cx(5).toString());",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-e2e-graph-components",
    "title": "图的连通分量与二部性判定",
    "src": "type Graph = Record<string, string[]>;\nfunction components(g: Graph): string[][] {\n  const seen = new Set<string>();\n  const out: string[][] = [];\n  for (const start of Object.keys(g)) {\n    if (seen.has(start)) continue;\n    const group: string[] = [];\n    const stack = [start];\n    seen.add(start);\n    while (stack.length > 0) {\n      const cur = stack.pop() as string;\n      group.push(cur);\n      for (const next of g[cur] ?? []) {\n        if (!seen.has(next)) { seen.add(next); stack.push(next); }\n      }\n    }\n    out.push(group.sort());\n  }\n  return out.sort((a, b) => a[0].localeCompare(b[0]));\n}\nfunction bipartite(g: Graph): boolean {\n  const color = new Map<string, number>();\n  for (const start of Object.keys(g)) {\n    if (color.has(start)) continue;\n    color.set(start, 0);\n    const queue = [start];\n    while (queue.length > 0) {\n      const cur = queue.shift() as string;\n      for (const next of g[cur] ?? []) {\n        if (!color.has(next)) { color.set(next, 1 - (color.get(cur) as number)); queue.push(next); }\n        else if (color.get(next) === color.get(cur)) return false;\n      }\n    }\n  }\n  return true;\n}\nconst g: Graph = { a: [\"b\"], b: [\"a\", \"c\"], c: [\"b\"], d: [\"e\"], e: [\"d\"], f: [] };\nconsole.log(components(g).map((c) => c.join(\"\")).join(\"|\"));\nconsole.log(bipartite(g));\nconsole.log(bipartite({ a: [\"b\", \"c\"], b: [\"a\", \"c\"], c: [\"a\", \"b\"] }));\nconsole.log(components({}).length, components({ solo: [] }).length);"
  },
  {
    "id": "c371-e2e-lru-with-ttl",
    "title": "带 TTL 的 LRU 缓存（注入时钟）",
    "src": "type Entry<V> = { value: V; expires: number };\nclass TtlCache<K, V> {\n  private map = new Map<K, Entry<V>>();\n  private now: () => number;\n  constructor(private cap: number, private ttl: number, now: () => number) { this.now = now; }\n  get(key: K): V | undefined {\n    const e = this.map.get(key);\n    if (!e) return undefined;\n    if (e.expires <= this.now()) { this.map.delete(key); return undefined; }\n    this.map.delete(key);\n    this.map.set(key, e);\n    return e.value;\n  }\n  set(key: K, value: V): void {\n    if (this.map.has(key)) this.map.delete(key);\n    else if (this.map.size >= this.cap) {\n      const oldest = this.map.keys().next();\n      if (!oldest.done) this.map.delete(oldest.value);\n    }\n    this.map.set(key, { value, expires: this.now() + this.ttl });\n  }\n  get size(): number { return this.map.size; }\n  keys(): K[] { return [...this.map.keys()]; }\n}\nlet clock = 0;\nconst cache = new TtlCache<string, number>(3, 100, () => clock);\ncache.set(\"a\", 1);\ncache.set(\"b\", 2);\ncache.set(\"c\", 3);\nconsole.log(cache.get(\"a\"), cache.keys().join(\",\"));\ncache.set(\"d\", 4);\nconsole.log(cache.keys().join(\",\"), cache.get(\"b\"));\nclock = 50;\nconsole.log(cache.get(\"a\"), cache.get(\"d\"));\nclock = 200;\nconsole.log(cache.get(\"d\"), cache.size, cache.keys().join(\",\"));\ncache.set(\"e\", 5);\nconsole.log(cache.keys().join(\",\"));",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-e2e-token-bucket",
    "title": "令牌桶限流器（注入时钟 + 批量判定）",
    "src": "class TokenBucket {\n  private tokens: number;\n  private last: number;\n  constructor(private rate: number, private capacity: number, now: number) { this.tokens = capacity; this.last = now; }\n  tryConsume(n: number, now: number): boolean {\n    this.refill(now);\n    if (this.tokens >= n) { this.tokens -= n; return true; }\n    return false;\n  }\n  private refill(now: number): void {\n    const elapsed = now - this.last;\n    if (elapsed > 0) {\n      this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.rate);\n      this.last = now;\n    }\n  }\n  available(now: number): number { this.refill(now); return Math.floor(this.tokens); }\n}\nconst bucket = new TokenBucket(0.1, 5, 0);\nconst results: string[] = [];\nfor (let t = 0; t < 6; t++) results.push(bucket.tryConsume(2, t) ? \"y\" : \"n\");\nconsole.log(results.join(\"\"));\nconsole.log(bucket.available(6), bucket.available(100), bucket.available(1000));\nconst burst = new TokenBucket(1, 3, 0);\nconsole.log([0, 0, 0, 0].map((_, i) => (burst.tryConsume(1, i) ? \"y\" : \"n\")).join(\"\"));\nconsole.log(burst.tryConsume(1, 10));",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-e2e-observer-with-priority",
    "title": "观察者模式：优先级、退订、一次性监听",
    "src": "type Handler<T> = (payload: T) => void;\nclass Emitter<T> {\n  private handlers: { fn: Handler<T>; once: boolean; priority: number; id: number }[] = [];\n  private nextId = 1;\n  on(fn: Handler<T>, options: { once?: boolean; priority?: number } = {}): () => void {\n    const id = this.nextId++;\n    this.handlers.push({ fn, once: options.once ?? false, priority: options.priority ?? 0, id });\n    this.handlers.sort((a, b) => b.priority - a.priority || a.id - b.id);\n    return () => { this.handlers = this.handlers.filter((h) => h.id !== id); };\n  }\n  emit(payload: T): number {\n    const snapshot = this.handlers.slice();\n    let called = 0;\n    for (const h of snapshot) {\n      h.fn(payload);\n      called += 1;\n      if (h.once) this.handlers = this.handlers.filter((x) => x.id !== h.id);\n    }\n    return called;\n  }\n  get size(): number { return this.handlers.length; }\n}\ntype Ev = { kind: string };\nconst log: string[] = [];\nconst emitter = new Emitter<Ev>();\nemitter.on((e) => log.push(\"low:\" + e.kind), { priority: 1 });\nconst off = emitter.on((e) => log.push(\"high:\" + e.kind), { priority: 10 });\nemitter.on((e) => log.push(\"once:\" + e.kind), { once: true, priority: 5 });\nconsole.log(emitter.emit({ kind: \"a\" }), log.join(\",\"), emitter.size);\noff();\nconsole.log(emitter.emit({ kind: \"b\" }), log.join(\",\"), emitter.size);\nlet removed = 0;\nconst selfOff = emitter.on(() => { removed += 1; selfOff(); }, { priority: 0 });\nemitter.emit({ kind: \"c\" });\nemitter.emit({ kind: \"c\" });\nconsole.log(removed, emitter.size);"
  },
  {
    "id": "c371-e2e-immutable-updates",
    "title": "不可变更新：嵌套路径 set / update 与结构共享",
    "src": "type J = Record<string, unknown>;\nfunction getPath(obj: J, path: string[]): unknown {\n  let cur: unknown = obj;\n  for (const p of path) {\n    if (cur === null || typeof cur !== \"object\") return undefined;\n    cur = (cur as J)[p];\n  }\n  return cur;\n}\nfunction setPath(obj: J, path: string[], value: unknown): J {\n  if (path.length === 0) return value as J;\n  const [head, ...rest] = path;\n  const child = (obj[head] as J) ?? {};\n  return { ...obj, [head]: setPath(child, rest, value) };\n}\nfunction updatePath(obj: J, path: string[], fn: (v: unknown) => unknown): J {\n  return setPath(obj, path, fn(getPath(obj, path)));\n}\nconst state: J = { user: { name: \"ann\", prefs: { theme: \"dark\" } }, count: 0 };\nconst next = setPath(state, [\"user\", \"prefs\", \"theme\"], \"light\");\nconst bumped = updatePath(next, [\"count\"], (v) => (v as number) + 1);\nconsole.log(JSON.stringify(next.user));\nconsole.log(JSON.stringify(state.user), JSON.stringify(bumped.count), state.count);\nconsole.log((state.user as J).prefs === (next.user as J).prefs, state.user === next.user);\nconsole.log(getPath(bumped, [\"user\", \"prefs\", \"theme\"]), getPath(bumped, [\"nope\", \"deep\"]));\nconsole.log(JSON.stringify(setPath(state, [], \"replaced\")));"
  },
  {
    "id": "c371-e2e-reducer-event-sourcing",
    "title": "事件溯源：reducer、回放与快照",
    "src": "type State = { count: number; items: string[]; log: string[] };\ntype Action = { type: \"add\"; item: string } | { type: \"remove\"; item: string } | { type: \"reset\" } | { type: \"inc\" };\nconst initial: State = { count: 0, items: [], log: [] };\nfunction reducer(state: State, action: Action): State {\n  switch (action.type) {\n    case \"add\":\n      if (state.items.includes(action.item)) return { ...state, log: state.log.concat(\"dup:\" + action.item) };\n      return { ...state, items: state.items.concat(action.item), log: state.log.concat(\"add:\" + action.item) };\n    case \"remove\":\n      return { ...state, items: state.items.filter((i) => i !== action.item), log: state.log.concat(\"rm:\" + action.item) };\n    case \"inc\":\n      return { ...state, count: state.count + 1, log: state.log.concat(\"inc\") };\n    case \"reset\":\n      return { ...initial, log: state.log.concat(\"reset\") };\n  }\n}\nconst actions: Action[] = [{ type: \"add\", item: \"a\" }, { type: \"inc\" }, { type: \"add\", item: \"a\" }, { type: \"add\", item: \"b\" }, { type: \"remove\", item: \"a\" }, { type: \"inc\" }];\nlet state = initial;\nfor (const a of actions) state = reducer(state, a);\nconsole.log(JSON.stringify(state.items), state.count, state.log.length);\nconst replayed = actions.reduce(reducer, initial);\nconsole.log(JSON.stringify(replayed) === JSON.stringify(state));\nstate = reducer(state, { type: \"reset\" });\nconsole.log(state.count, state.items.length, state.log.length, JSON.stringify(replayed.items));\nconst snapshot = JSON.parse(JSON.stringify(replayed)) as State;\nconsole.log(snapshot.log.join(\",\").length, reducer(snapshot, { type: \"inc\" }).count);"
  },
  {
    "id": "c371-e2e-diff-objects",
    "title": "对象深比较与差异报告",
    "src": "type Diff = { path: string; kind: \"add\" | \"remove\" | \"change\"; from?: unknown; to?: unknown };\nfunction isObj(v: unknown): v is Record<string, unknown> {\n  return typeof v === \"object\" && v !== null && !Array.isArray(v);\n}\nfunction diff(a: unknown, b: unknown, path = \"\"): Diff[] {\n  if (a === b) return [];\n  if (Array.isArray(a) && Array.isArray(b)) {\n    const out: Diff[] = [];\n    const n = Math.max(a.length, b.length);\n    for (let i = 0; i < n; i++) {\n      const p = path + \"[\" + i + \"]\";\n      if (i >= a.length) out.push({ path: p, kind: \"add\", to: b[i] });\n      else if (i >= b.length) out.push({ path: p, kind: \"remove\", from: a[i] });\n      else out.push(...diff(a[i], b[i], p));\n    }\n    return out;\n  }\n  if (isObj(a) && isObj(b)) {\n    const out: Diff[] = [];\n    for (const k of Object.keys(a)) {\n      const p = path === \"\" ? k : path + \".\" + k;\n      if (!(k in b)) out.push({ path: p, kind: \"remove\", from: a[k] });\n      else out.push(...diff(a[k], b[k], p));\n    }\n    for (const k of Object.keys(b)) {\n      if (!(k in a)) out.push({ path: path === \"\" ? k : path + \".\" + k, kind: \"add\", to: b[k] });\n    }\n    return out;\n  }\n  return [{ path, kind: \"change\", from: a, to: b }];\n}\nfunction deepEqual(a: unknown, b: unknown): boolean { return diff(a, b).length === 0; }\nconst before = { name: \"app\", version: 1, tags: [\"a\", \"b\"], nested: { x: 1, gone: true } };\nconst after = { name: \"app\", version: 2, tags: [\"a\", \"c\"], nested: { x: 1 }, extra: null };\nfor (const d of diff(before, after)) console.log(d.kind, d.path, JSON.stringify(d.from), JSON.stringify(d.to));\nconsole.log(deepEqual(before, JSON.parse(JSON.stringify(before))), deepEqual(before, after), deepEqual([1, [2]], [1, [2]]));"
  },
  {
    "id": "c371-e2e-formatter-pipeline",
    "title": "格式化管道：一串转换器 + 错误收集",
    "src": "type Transform = { name: string; apply: (s: string) => string };\nfunction pipeline(transforms: Transform[], input: string): { out: string; applied: string[]; errors: string[] } {\n  let out = input;\n  const applied: string[] = [];\n  const errors: string[] = [];\n  for (const t of transforms) {\n    try {\n      out = t.apply(out);\n      applied.push(t.name);\n    } catch (e) {\n      errors.push(t.name + \": \" + (e as Error).message);\n    }\n  }\n  return { out, applied, errors };\n}\nconst transforms: Transform[] = [\n  { name: \"trim\", apply: (s) => s.trim() },\n  { name: \"collapse\", apply: (s) => s.split(\" \").filter((p) => p !== \"\").join(\" \") },\n  { name: \"upper-first\", apply: (s) => (s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)) },\n  { name: \"boom\", apply: () => { throw new Error(\"always fails\"); } },\n  { name: \"suffix\", apply: (s) => s + \".\" },\n];\nconst r = pipeline(transforms, \"   hello   world  \");\nconsole.log(JSON.stringify(r.out), r.applied.join(\",\"), r.errors.join(\"|\"));\nconsole.log(pipeline([], \"unchanged\").out);\nconsole.log(JSON.stringify(pipeline([{ name: \"empty\", apply: () => \"\" }], \"x\").out));"
  },
  {
    "id": "c371-e2e-async-pool-with-errors",
    "title": "异步任务池：并发上限、错误隔离、结果汇总",
    "src": "async function pool<T, R>(items: T[], limit: number, work: (item: T, index: number) => Promise<R>): Promise<{ ok: R[]; failed: { item: T; error: string }[] }> {\n  const ok: R[] = [];\n  const failed: { item: T; error: string }[] = [];\n  let next = 0;\n  const workers: Promise<void>[] = [];\n  for (let i = 0; i < Math.min(limit, items.length); i++) {\n    workers.push((async () => {\n      for (;;) {\n        const index = next++;\n        if (index >= items.length) return;\n        try { ok.push(await work(items[index], index)); }\n        catch (e) { failed.push({ item: items[index], error: (e as Error).message }); }\n      }\n    })());\n  }\n  await Promise.all(workers);\n  return { ok, failed };\n}\nasync function main(): Promise<void> {\n  let active = 0;\n  let peak = 0;\n  const items = [1, 2, 3, 4, 5, 6, 7, 8];\n  const r = await pool(items, 3, async (n) => {\n    active += 1;\n    peak = Math.max(peak, active);\n    await Promise.resolve();\n    active -= 1;\n    if (n % 3 === 0) throw new Error(\"bad \" + n);\n    return n * 10;\n  });\n  console.log(r.ok.sort((a, b) => a - b).join(\",\"));\n  console.log(r.failed.map((f) => f.item + \":\" + f.error).join(\"|\"));\n  console.log(\"peak\", peak <= 3, r.ok.length + r.failed.length);\n}\nmain();"
  },
  {
    "id": "c371-e2e-async-pipeline-stages",
    "title": "异步流水线：逐级加工与背压",
    "src": "type Stage = { name: string; run: (v: number) => Promise<number> };\nasync function runPipeline(stages: Stage[], seeds: number[]): Promise<string[]> {\n  const out: string[] = [];\n  for (const seed of seeds) {\n    let value = seed;\n    const trace: string[] = [];\n    for (const stage of stages) {\n      value = await stage.run(value);\n      trace.push(stage.name + \"=\" + value);\n    }\n    out.push(trace.join(\",\"));\n  }\n  return out;\n}\nasync function main(): Promise<void> {\n  const stages: Stage[] = [\n    { name: \"double\", run: async (v) => v * 2 },\n    { name: \"increment\", run: async (v) => { await Promise.resolve(); return v + 1; } },\n    { name: \"clamp\", run: async (v) => Math.min(v, 10) },\n  ];\n  const lines = await runPipeline(stages, [1, 4, 9]);\n  for (const line of lines) console.log(line);\n  const failing: Stage[] = [{ name: \"boom\", run: async () => { throw new Error(\"stop\"); } }];\n  try {\n    await runPipeline(failing, [1]);\n  } catch (e) {\n    console.log(\"caught\", (e as Error).message);\n  }\n  console.log(\"done\", lines.length);\n}\nmain();"
  },
  {
    "id": "c371-e2e-async-generator-paging",
    "title": "异步生成器分页拉取与聚合",
    "src": "type Page = { items: number[]; next: number | null };\nconst source: Record<number, Page> = {\n  0: { items: [1, 2, 3], next: 1 },\n  1: { items: [4, 5], next: 2 },\n  2: { items: [6], next: null },\n};\nasync function fetchPage(cursor: number): Promise<Page> {\n  await Promise.resolve();\n  const page = source[cursor];\n  if (!page) throw new Error(\"bad cursor \" + cursor);\n  return page;\n}\nasync function* allItems(): AsyncGenerator<number> {\n  let cursor: number | null = 0;\n  while (cursor !== null) {\n    const page = await fetchPage(cursor);\n    for (const item of page.items) yield item;\n    cursor = page.next;\n  }\n}\nasync function main(): Promise<void> {\n  const collected: number[] = [];\n  for await (const item of allItems()) {\n    collected.push(item);\n    if (collected.length === 4) break;\n  }\n  console.log(collected.join(\",\"));\n  let total = 0;\n  let count = 0;\n  for await (const item of allItems()) { total += item; count += 1; }\n  console.log(total, count, (total / count).toFixed(2));\n  const it = allItems();\n  console.log((await it.next()).value, (await it.next()).value);\n}\nmain();"
  },
  {
    "id": "c371-e2e-promise-combinators",
    "title": "承诺组合子的实战：allSettled 汇总 + race 超时",
    "src": "type Job = { name: string; ms: number; fail?: boolean };\nfunction run(job: Job): Promise<string> {\n  return new Promise((resolve, reject) => {\n    if (job.fail) { reject(new Error(job.name + \" failed\")); return; }\n    Promise.resolve().then(() => resolve(job.name + \":\" + job.ms));\n  });\n}\nasync function main(): Promise<void> {\n  const jobs: Job[] = [{ name: \"a\", ms: 10 }, { name: \"b\", ms: 20, fail: true }, { name: \"c\", ms: 30 }];\n  const settled = await Promise.allSettled(jobs.map(run));\n  for (const s of settled) {\n    console.log(s.status, s.status === \"fulfilled\" ? s.value : (s.reason as Error).message);\n  }\n  const anyResult = await Promise.any([run({ name: \"slow\", ms: 100 }), run({ name: \"fast\", ms: 1 })]);\n  console.log(\"any\", anyResult);\n  try {\n    await Promise.any([run({ name: \"x\", ms: 1, fail: true }), run({ name: \"y\", ms: 2, fail: true })]);\n  } catch (e: any) {\n    console.log(\"all-failed\", e.errors.length);\n  }\n  const raced = await Promise.race([run({ name: \"quick\", ms: 1 }), run({ name: \"later\", ms: 50 })]);\n  console.log(\"race\", raced);\n}\nmain();"
  },
  {
    "id": "c371-e2e-event-sourced-orders",
    "title": "订单状态机：事件驱动的状态流转与校验",
    "src": "type OrderState = \"created\" | \"paid\" | \"shipped\" | \"delivered\" | \"cancelled\";\ntype Event = { type: \"pay\" } | { type: \"ship\" } | { type: \"deliver\" } | { type: \"cancel\" };\nconst transitions: Record<OrderState, Partial<Record<Event[\"type\"], OrderState>>> = {\n  created: { pay: \"paid\", cancel: \"cancelled\" },\n  paid: { ship: \"shipped\", cancel: \"cancelled\" },\n  shipped: { deliver: \"delivered\" },\n  delivered: {},\n  cancelled: {},\n};\nclass Order {\n  state: OrderState = \"created\";\n  history: string[] = [\"created\"];\n  constructor(public id: string) {}\n  apply(event: Event): boolean {\n    const next = transitions[this.state][event.type];\n    if (!next) { this.history.push(\"reject:\" + event.type); return false; }\n    this.state = next;\n    this.history.push(next);\n    return true;\n  }\n}\nconst orders = [new Order(\"o1\"), new Order(\"o2\"), new Order(\"o3\")];\nconst script: [number, Event][] = [[0, { type: \"pay\" }], [1, { type: \"ship\" }], [0, { type: \"ship\" }], [2, { type: \"cancel\" }], [1, { type: \"pay\" }], [0, { type: \"deliver\" }]];\nfor (const [idx, event] of script) {\n  const ok = orders[idx].apply(event);\n  console.log(orders[idx].id, event.type, ok, orders[idx].state);\n}\nfor (const o of orders) console.log(o.id, o.state, o.history.join(\">\"));\nconst counts: Record<string, number> = {};\nfor (const o of orders) counts[o.state] = (counts[o.state] ?? 0) + 1;\nconsole.log(JSON.stringify(counts));",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-e2e-text-diff-report",
    "title": "文本对比报告：按行比较并统计",
    "src": "function splitLines(text: string): string[] { return text.split(\"\\n\"); }\nfunction compare(a: string, b: string): { added: number; removed: number; same: number; rows: string[] } {\n  const left = splitLines(a);\n  const right = splitLines(b);\n  const counts = new Map<string, number>();\n  for (const line of left) counts.set(line, (counts.get(line) ?? 0) + 1);\n  let added = 0;\n  let removed = 0;\n  let same = 0;\n  const rows: string[] = [];\n  const rightCounts = new Map<string, number>();\n  for (const line of right) rightCounts.set(line, (rightCounts.get(line) ?? 0) + 1);\n  for (const line of left) {\n    const inRight = rightCounts.get(line) ?? 0;\n    if (inRight > 0) { same += 1; rightCounts.set(line, inRight - 1); rows.push(\" \" + line); }\n    else { removed += 1; rows.push(\"-\" + line); }\n  }\n  for (const [line, n] of rightCounts) for (let i = 0; i < n; i++) { added += 1; rows.push(\"+\" + line); }\n  return { added, removed, same, rows };\n}\nconst left = \"alpha\\nbeta\\ngamma\\ndelta\";\nconst right = \"alpha\\ngamma\\ngamma\\nepsilon\";\nconst r = compare(left, right);\nconsole.log(r.added, r.removed, r.same);\nfor (const row of r.rows) console.log(row);\nconsole.log(compare(\"same\", \"same\").rows.length, compare(\"\", \"new\").added);"
  },
  {
    "id": "c371-e2e-tree-printer",
    "title": "树结构的美化打印与路径查找",
    "src": "type TreeNode = { name: string; children: TreeNode[] };\nfunction make(paths: string[]): TreeNode {\n  const root: TreeNode = { name: \"\", children: [] };\n  for (const path of paths) {\n    const parts = path.split(\"/\").filter((p) => p !== \"\");\n    let cur = root;\n    for (const part of parts) {\n      let next = cur.children.find((c) => c.name === part);\n      if (!next) { next = { name: part, children: [] }; cur.children.push(next); }\n      cur = next;\n    }\n  }\n  return root;\n}\nfunction print(node: TreeNode, prefix = \"\", out: string[] = []): string[] {\n  node.children.forEach((child, index) => {\n    const last = index === node.children.length - 1;\n    out.push(prefix + (last ? \"\\\\-- \" : \"|-- \") + child.name);\n    print(child, prefix + (last ? \"    \" : \"|   \"), out);\n  });\n  return out;\n}\nfunction find(node: TreeNode, name: string, path: string[] = []): string[] | null {\n  if (node.name === name) return path;\n  for (const child of node.children) {\n    const hit = find(child, name, path.concat(child.name));\n    if (hit) return hit;\n  }\n  return null;\n}\nconst tree = make([\"src/app/main.ts\", \"src/app/util.ts\", \"src/lib/core.ts\", \"docs/readme.md\"]);\nfor (const line of print(tree)) console.log(line);\nconsole.log((find(tree, \"core.ts\") ?? []).join(\"/\"));\nconsole.log(find(tree, \"nope.ts\"), tree.children.length);"
  },
  {
    "id": "c371-e2e-csv-full",
    "title": "CSV 解析（带引号与转义）与写回",
    "src": "function parseCsv(text: string): string[][] {\n  const rows: string[][] = [];\n  let row: string[] = [];\n  let field = \"\";\n  let inQuotes = false;\n  for (let i = 0; i < text.length; i++) {\n    const ch = text.charAt(i);\n    if (inQuotes) {\n      if (ch === '\"') {\n        if (text.charAt(i + 1) === '\"') { field += '\"'; i += 1; }\n        else inQuotes = false;\n      } else field += ch;\n      continue;\n    }\n    if (ch === '\"') { inQuotes = true; continue; }\n    if (ch === \",\") { row.push(field); field = \"\"; continue; }\n    if (ch === \"\\n\") { row.push(field); rows.push(row); row = []; field = \"\"; continue; }\n    if (ch === \"\\r\") continue;\n    field += ch;\n  }\n  if (field !== \"\" || row.length > 0) { row.push(field); rows.push(row); }\n  return rows;\n}\nfunction toCsv(rows: string[][]): string {\n  return rows.map((row) => row.map((f) => {\n    const needsQuote = f.includes(\",\") || f.includes('\"') || f.includes(\"\\n\");\n    return needsQuote ? '\"' + f.split('\"').join('\"\"') + '\"' : f;\n  }).join(\",\")).join(\"\\n\");\n}\nconst raw = 'name,note\\n\"ann\",\"likes \\\"quotes\\\"\"\\nbob,\"a,b\"\\n\"\" ,empty';\nconst rows = parseCsv(raw);\nconsole.log(rows.length, rows[0].join(\"|\"));\nfor (const row of rows.slice(1)) console.log(row.length, JSON.stringify(row));\nconst roundTrip = toCsv(rows);\nconsole.log(parseCsv(roundTrip).length, parseCsv(roundTrip)[1][1]);\nconsole.log(toCsv([[\"a\", \"b,c\"]].concat([['say \"hi\"']])));"
  },
  {
    "id": "c371-e2e-pagination-and-filtering",
    "title": "分页 + 过滤 + 排序的查询管线",
    "src": "type Item = { id: number; name: string; score: number; tag: string };\nconst items: Item[] = [];\nfor (let i = 1; i <= 25; i++) items.push({ id: i, name: \"item\" + String(i).padStart(2, \"0\"), score: (i * 7) % 13, tag: i % 3 === 0 ? \"c\" : i % 2 === 0 ? \"b\" : \"a\" });\ntype Query = { tag?: string; minScore?: number; sort?: \"id\" | \"score\" | \"name\"; dir?: \"asc\" | \"desc\"; page?: number; size?: number };\nfunction run(items: Item[], q: Query): { rows: Item[]; total: number; pages: number } {\n  let rows = items.filter((i) => (q.tag === undefined || i.tag === q.tag) && (q.minScore === undefined || i.score >= q.minScore));\n  const key = q.sort ?? \"id\";\n  const sign = q.dir === \"desc\" ? -1 : 1;\n  rows = rows.slice().sort((a, b) => {\n    const ka = key === \"name\" ? a.name : a[key];\n    const kb = key === \"name\" ? b.name : b[key];\n    if (typeof ka === \"string\" && typeof kb === \"string\") return ka.localeCompare(kb) * sign;\n    return ((ka as number) - (kb as number)) * sign;\n  });\n  const size = q.size ?? 5;\n  const page = Math.max(1, q.page ?? 1);\n  const start = (page - 1) * size;\n  return { rows: rows.slice(start, start + size), total: rows.length, pages: Math.ceil(rows.length / size) };\n}\nconst r1 = run(items, {});\nconsole.log(r1.total, r1.pages, r1.rows.map((i) => i.id).join(\",\"));\nconst r2 = run(items, { tag: \"a\", sort: \"score\", dir: \"desc\", page: 2, size: 3 });\nconsole.log(r2.total, r2.rows.map((i) => i.id + \":\" + i.score).join(\",\"));\nconst r3 = run(items, { minScore: 10, sort: \"name\", dir: \"desc\", size: 4 });\nconsole.log(r3.total, r3.rows.map((i) => i.name).join(\",\"));\nconsole.log(run(items, { page: 99 }).rows.length, run(items, { tag: \"zzz\" }).pages);"
  },
  {
    "id": "c371-e2e-rate-limiting-window",
    "title": "滑动窗口限流与统计",
    "src": "class SlidingWindow {\n  private hits: number[] = [];\n  constructor(private limit: number, private windowMs: number) {}\n  allow(now: number): boolean {\n    this.hits = this.hits.filter((t) => now - t < this.windowMs);\n    if (this.hits.length >= this.limit) return false;\n    this.hits.push(now);\n    return true;\n  }\n  get current(): number { return this.hits.length; }\n}\nconst w = new SlidingWindow(3, 100);\nconst events = [0, 10, 20, 30, 40, 110, 120, 130];\nconst decisions: string[] = [];\nfor (const t of events) decisions.push((w.allow(t) ? \"y\" : \"n\") + \"@\" + t);\nconsole.log(decisions.join(\" \"));\nconsole.log(w.current);\nconst w2 = new SlidingWindow(2, 50);\nlet allowed = 0;\nfor (let t = 0; t < 200; t += 10) if (w2.allow(t)) allowed += 1;\nconsole.log(allowed, w2.current);\nconst w3 = new SlidingWindow(1, 1000);\nconsole.log(w3.allow(0), w3.allow(1), w3.allow(1001));",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-e2e-number-formatting",
    "title": "自定义数字格式化：千分位、百分比、字节单位",
    "src": "function group(n: number, sep = \",\"): string {\n  const sign = n < 0 ? \"-\" : \"\";\n  const parts = Math.abs(n).toFixed(0).split(\".\");\n  let int = parts[0];\n  let out = \"\";\n  while (int.length > 3) { out = sep + int.slice(int.length - 3) + out; int = int.slice(0, int.length - 3); }\n  return sign + int + out;\n}\nfunction percent(part: number, whole: number, digits = 1): string {\n  if (whole === 0) return \"n/a\";\n  return ((part / whole) * 100).toFixed(digits) + \"%\";\n}\nfunction bytes(n: number): string {\n  const units = [\"B\", \"KB\", \"MB\", \"GB\", \"TB\"];\n  let value = n;\n  let unit = 0;\n  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }\n  return (unit === 0 ? String(value) : value.toFixed(1)) + units[unit];\n}\nconsole.log(group(0), group(999), group(1000), group(1234567), group(-9876543));\nconsole.log(percent(1, 3), percent(2, 3, 2), percent(0, 0), percent(5, 5));\nfor (const n of [0, 512, 1024, 1536, 1048576, 1073741824, 1099511627776]) console.log(n, bytes(n));\nconsole.log([1, 22, 333].map((n) => n.toString().padStart(5, \"0\")).join(\" \"));"
  },
  {
    "id": "c371-e2e-anagram-grouping",
    "title": "变位词分组与字符计数",
    "src": "function signature(word: string): string {\n  const counts = new Map<string, number>();\n  for (const ch of word) counts.set(ch, (counts.get(ch) ?? 0) + 1);\n  return [...counts.keys()].sort().map((k) => k + counts.get(k)).join(\"\");\n}\nfunction group(words: string[]): string[][] {\n  const buckets = new Map<string, string[]>();\n  for (const w of words) {\n    const key = signature(w);\n    const list = buckets.get(key) ?? [];\n    list.push(w);\n    buckets.set(key, list);\n  }\n  return [...buckets.values()].map((g) => g.sort()).sort((a, b) => a[0].localeCompare(b[0]));\n}\nconst words = [\"listen\", \"silent\", \"enlist\", \"google\", \"gogole\", \"cat\", \"act\", \"tac\", \"dog\"];\nfor (const g of group(words)) console.log(g.join(\",\"));\nconsole.log(signature(\"listen\") === signature(\"silent\"), group([]).length);\nconsole.log(group([\"a\"]).length, group([\"ab\", \"ba\", \"abc\"]).map((g) => g.length).join(\"\"));"
  },
  {
    "id": "c371-e2e-palindrome-and-strings",
    "title": "回文判定、最长回文子串与字符统计",
    "src": "function isPalindrome(s: string): boolean {\n  let i = 0;\n  let j = s.length - 1;\n  while (i < j) {\n    if (s.charAt(i) !== s.charAt(j)) return false;\n    i += 1;\n    j -= 1;\n  }\n  return true;\n}\nfunction longestPalindrome(s: string): string {\n  let best = \"\";\n  for (let center = 0; center < s.length; center++) {\n    for (const [start, end] of [[center, center], [center, center + 1]]) {\n      let l = start;\n      let r = end;\n      while (l >= 0 && r < s.length && s.charAt(l) === s.charAt(r)) { l -= 1; r += 1; }\n      const found = s.slice(l + 1, r);\n      if (found.length > best.length) best = found;\n    }\n  }\n  return best;\n}\nfunction charCounts(s: string): [string, number][] {\n  const counts = new Map<string, number>();\n  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);\n  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));\n}\nfor (const s of [\"racecar\", \"abba\", \"abc\", \"\"]) console.log(JSON.stringify(s), isPalindrome(s));\nconsole.log(longestPalindrome(\"babad\"), longestPalindrome(\"cbbd\"), longestPalindrome(\"a\"));\nconsole.log(charCounts(\"mississippi\").slice(0, 3).map(([c, n]) => c + n).join(\"\"));\nconsole.log(longestPalindrome(\"\").length, isPalindrome(\"a\"));"
  },
  {
    "id": "c371-e2e-stack-machine",
    "title": "栈式虚拟机：字节码解释器",
    "src": "type Op = number | string;\nconst OPS: Record<string, (stack: number[]) => void> = {\n  add: (s) => { const b = s.pop() as number; const a = s.pop() as number; s.push(a + b); },\n  sub: (s) => { const b = s.pop() as number; const a = s.pop() as number; s.push(a - b); },\n  mul: (s) => { const b = s.pop() as number; const a = s.pop() as number; s.push(a * b); },\n  dup: (s) => { s.push(s[s.length - 1]); },\n  swap: (s) => { const b = s.pop() as number; const a = s.pop() as number; s.push(b, a); },\n  neg: (s) => { s.push(-(s.pop() as number)); },\n};\nfunction run(program: Op[]): { stack: number[]; steps: number } {\n  const stack: number[] = [];\n  let steps = 0;\n  for (const op of program) {\n    steps += 1;\n    if (typeof op === \"number\") { stack.push(op); continue; }\n    const fn = OPS[op];\n    if (!fn) throw new Error(\"unknown op: \" + op);\n    if (stack.length < 2 && (op === \"add\" || op === \"sub\" || op === \"mul\" || op === \"swap\")) throw new Error(\"stack underflow at \" + op);\n    fn(stack);\n  }\n  return { stack, steps };\n}\nfor (const program of [\n  [2, 3, \"add\"],\n  [5, 1, \"sub\", 3, \"mul\"],\n  [4, \"dup\", \"add\"],\n  [1, 2, \"swap\", \"sub\"],\n  [7, \"neg\"],\n] as Op[][]) {\n  const r = run(program);\n  console.log(program.join(\" \"), \"=>\", r.stack.join(\",\"), r.steps);\n}\ntry { run([\"add\"]); } catch (e) { console.log(\"err\", (e as Error).message); }\ntry { run([1, \"nope\"]); } catch (e) { console.log(\"err\", (e as Error).message); }\nconsole.log(run([]).stack.length);"
  },
  {
    "id": "c371-e2e-symbol-table-scopes",
    "title": "符号表与作用域链：嵌套作用域解析",
    "src": "class Scope {\n  private vars = new Map<string, number>();\n  constructor(private parent: Scope | null = null) {}\n  declare(name: string, value: number): void { this.vars.set(name, value); }\n  lookup(name: string): number | undefined {\n    if (this.vars.has(name)) return this.vars.get(name);\n    return this.parent ? this.parent.lookup(name) : undefined;\n  }\n  assign(name: string, value: number): boolean {\n    if (this.vars.has(name)) { this.vars.set(name, value); return true; }\n    return this.parent ? this.parent.assign(name, value) : false;\n  }\n  localNames(): string[] { return [...this.vars.keys()].sort(); }\n}\nconst global2 = new Scope();\nglobal2.declare(\"x\", 1);\nglobal2.declare(\"y\", 2);\nconst fn = new Scope(global2);\nfn.declare(\"x\", 10);\nconst block = new Scope(fn);\nblock.declare(\"z\", 30);\nconsole.log(fn.lookup(\"x\"), fn.lookup(\"y\"), block.lookup(\"x\"), block.lookup(\"z\"));\nconsole.log(fn.assign(\"y\", 20), global2.lookup(\"y\"));\nconsole.log(block.assign(\"x\", 99), fn.lookup(\"x\"), global2.lookup(\"x\"));\nconsole.log(block.assign(\"q\", 1), block.lookup(\"q\"));\nconsole.log(global2.localNames().join(\",\"), fn.localNames().join(\",\"));",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-e2e-ini-config-parser",
    "title": "INI 风格配置解析与类型强制",
    "src": "type Config = Record<string, Record<string, string | number | boolean>>;\nfunction coerce(raw: string): string | number | boolean {\n  if (raw === \"true\") return true;\n  if (raw === \"false\") return false;\n  if (raw.length > 0 && !Number.isNaN(Number(raw))) return Number(raw);\n  return raw;\n}\nfunction parseIni(text: string): Config {\n  const out: Config = {};\n  let section = \"default\";\n  const problems: string[] = [];\n  for (const rawLine of text.split(\"\\n\")) {\n    const line = rawLine.trim();\n    if (line === \"\" || line.startsWith(\";\") || line.startsWith(\"#\")) continue;\n    if (line.startsWith(\"[\") && line.endsWith(\"]\")) { section = line.slice(1, -1); out[section] = out[section] ?? {}; continue; }\n    const eq = line.indexOf(\"=\");\n    if (eq < 0) { problems.push(line); continue; }\n    const key = line.slice(0, eq).trim();\n    const value = line.slice(eq + 1).trim();\n    out[section] = out[section] ?? {};\n    out[section][key] = coerce(value);\n  }\n  if (problems.length > 0) out._problems = { lines: problems.join(\"|\") };\n  return out;\n}\nconst ini = [\"; comment\", \"name = app\", \"port = 8080\", \"debug = true\", \"\", \"[db]\", \"host = localhost\", \"pool = 5\", \"ratio = 0.5\", \"= broken\"].join(\"\\n\");\nconst cfg = parseIni(ini);\nconsole.log(Object.keys(cfg).join(\",\"));\nconsole.log(cfg.default.name, cfg.default.port, cfg.default.debug);\nconsole.log(cfg.db.host, cfg.db.pool, cfg.db.ratio, typeof cfg.db.pool);\nconsole.log(JSON.stringify(cfg._problems));\nconsole.log(Object.keys(parseIni(\"\")).length);"
  },
  {
    "id": "c371-e2e-todo-board-render",
    "title": "看板渲染：分组、排序、宽度对齐",
    "src": "type Card = { id: number; title: string; status: \"todo\" | \"doing\" | \"done\"; points: number; tags: string[] };\nconst cards: Card[] = [\n  { id: 1, title: \"write parser\", status: \"done\", points: 3, tags: [\"core\"] },\n  { id: 2, title: \"fix bug\", status: \"doing\", points: 1, tags: [\"bug\", \"urgent\"] },\n  { id: 3, title: \"add docs\", status: \"todo\", points: 2, tags: [] },\n  { id: 4, title: \"refactor\", status: \"doing\", points: 5, tags: [\"core\"] },\n  { id: 5, title: \"ship\", status: \"todo\", points: 8, tags: [\"release\"] },\n];\nconst columns: Card[\"status\"][] = [\"todo\", \"doing\", \"done\"];\nfunction renderColumn(status: string, list: Card[]): string[] {\n  const width = Math.max(status.length + 2, ...list.map((c) => c.title.length + 6), 8);\n  const header = \"+\" + \"-\".repeat(width) + \"+\";\n  const out = [header, \"| \" + (status + \" (\" + list.length + \")\").padEnd(width - 1) + \"|\", header];\n  for (const c of list.slice().sort((a, b) => b.points - a.points)) {\n    out.push(\"| \" + (\"#\" + c.id + \" \" + c.title).padEnd(width - 1) + \"|\");\n  }\n  const points = list.reduce((a, b) => a + b.points, 0);\n  out.push(\"| \" + (\"points: \" + points).padEnd(width - 1) + \"|\", header);\n  return out;\n}\nfor (const status of columns) {\n  for (const line of renderColumn(status, cards.filter((c) => c.status === status))) console.log(line);\n  console.log(\"\");\n}\nconst tagCounts = new Map<string, number>();\nfor (const c of cards) for (const t of c.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);\nconsole.log([...tagCounts.entries()].sort().map(([t, n]) => t + \"=\" + n).join(\",\"));\nconsole.log(cards.reduce((a, b) => a + b.points, 0));"
  },
  {
    "id": "c371-e2e-cache-with-metrics",
    "title": "带指标的缓存：命中率、逐出、预热",
    "src": "class Cache<K, V> {\n  private map = new Map<K, V>();\n  hits = 0;\n  misses = 0;\n  evictions = 0;\n  constructor(private cap: number) {}\n  get(key: K): V | undefined {\n    if (!this.map.has(key)) { this.misses += 1; return undefined; }\n    this.hits += 1;\n    const v = this.map.get(key) as V;\n    this.map.delete(key);\n    this.map.set(key, v);\n    return v;\n  }\n  set(key: K, value: V): void {\n    if (this.map.has(key)) this.map.delete(key);\n    else if (this.map.size >= this.cap) { this.evictions += 1; this.map.delete(this.map.keys().next().value as K); }\n    this.map.set(key, value);\n  }\n  get hitRate(): string { const total = this.hits + this.misses; return total === 0 ? \"n/a\" : ((this.hits / total) * 100).toFixed(1) + \"%\"; }\n}\nconst cache = new Cache<string, number>(2);\nconst accesses = [\"a\", \"b\", \"a\", \"c\", \"a\", \"b\", \"c\", \"c\"];\nconst out: string[] = [];\nfor (const key of accesses) {\n  const hit = cache.get(key);\n  if (hit === undefined) { cache.set(key, key.charCodeAt(0)); out.push(\"M\" + key); }\n  else out.push(\"H\" + key);\n}\nconsole.log(out.join(\" \"));\nconsole.log(cache.hits, cache.misses, cache.evictions, cache.hitRate);\nconst prewarm = new Cache<number, number>(3);\nfor (let i = 0; i < 3; i++) prewarm.set(i, i * i);\nconsole.log([0, 1, 2, 5].map((k) => prewarm.get(k) ?? \"-\").join(\",\"), prewarm.hitRate);",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-e2e-typed-config-merge-deep",
    "title": "配置深合并：数组策略、默认值、来源优先级",
    "src": "type Cfg = Record<string, unknown>;\nfunction isPlain(v: unknown): v is Cfg {\n  return typeof v === \"object\" && v !== null && !Array.isArray(v);\n}\nfunction deepMerge(base: Cfg, override: Cfg, options: { arrayStrategy: \"replace\" | \"concat\" } = { arrayStrategy: \"replace\" }): Cfg {\n  const out: Cfg = { ...base };\n  for (const key of Object.keys(override)) {\n    const a = out[key];\n    const b = override[key];\n    if (isPlain(a) && isPlain(b)) out[key] = deepMerge(a, b, options);\n    else if (Array.isArray(a) && Array.isArray(b) && options.arrayStrategy === \"concat\") out[key] = a.concat(b);\n    else out[key] = b;\n  }\n  return out;\n}\nconst defaults: Cfg = { app: { name: \"svc\", port: 80, opts: { tls: false, retries: 3 } }, list: [1, 2] };\nconst env: Cfg = { app: { port: 8080, opts: { tls: true } }, list: [3] };\nconst merged = deepMerge(defaults, env);\nconsole.log(JSON.stringify(merged));\nconsole.log(JSON.stringify(deepMerge(defaults, env, { arrayStrategy: \"concat\" }).list));\nconsole.log(JSON.stringify(defaults.app));\nconst three = deepMerge(deepMerge(defaults, { app: { name: \"a\" } }), { app: { port: 1 } });\nconsole.log(JSON.stringify(three.app));\nconsole.log(isPlain([]), isPlain(null), isPlain({}));"
  },
  {
    "id": "c371-e2e-priority-scheduler",
    "title": "任务调度器：优先级队列 + 依赖等待",
    "src": "type Job = { name: string; priority: number; deps: string[] };\nclass Scheduler {\n  private jobs = new Map<string, Job>();\n  private done = new Set<string>();\n  add(job: Job): void { this.jobs.set(job.name, job); }\n  run(): string[] {\n    const order: string[] = [];\n    let progress = true;\n    while (progress) {\n      progress = false;\n      const ready = [...this.jobs.values()]\n        .filter((j) => !this.done.has(j.name) && j.deps.every((d) => this.done.has(d)))\n        .sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));\n      if (ready.length > 0) {\n        const job = ready[0];\n        this.done.add(job.name);\n        order.push(job.name);\n        progress = true;\n      }\n    }\n    return order;\n  }\n  blocked(): string[] {\n    return [...this.jobs.keys()].filter((n) => !this.done.has(n)).sort();\n  }\n}\nconst s = new Scheduler();\ns.add({ name: \"deploy\", priority: 1, deps: [\"build\", \"test\"] });\ns.add({ name: \"build\", priority: 5, deps: [] });\ns.add({ name: \"test\", priority: 3, deps: [\"build\"] });\ns.add({ name: \"lint\", priority: 9, deps: [] });\ns.add({ name: \"docs\", priority: 2, deps: [\"build\"] });\nconsole.log(s.run().join(\"->\"));\nconsole.log(s.blocked().length);\nconst dead = new Scheduler();\ndead.add({ name: \"a\", priority: 1, deps: [\"b\"] });\ndead.add({ name: \"b\", priority: 1, deps: [\"a\"] });\nconsole.log(dead.run().length, dead.blocked().join(\",\"));"
  },
  {
    "id": "c371-e2e-object-diff-patch",
    "title": "差异补丁的应用与撤销",
    "src": "type Patch = { path: string[]; before: unknown; after: unknown };\nfunction read(obj: any, path: string[]): unknown {\n  let cur: any = obj;\n  for (const p of path) { if (cur === null || typeof cur !== \"object\") return undefined; cur = cur[p]; }\n  return cur;\n}\nfunction write(obj: any, path: string[], value: unknown): void {\n  let cur: any = obj;\n  for (let i = 0; i < path.length - 1; i++) { cur = cur[path[i]] = cur[path[i]] ?? {}; }\n  if (path.length > 0) cur[path[path.length - 1]] = value;\n}\nfunction makePatch(before: any, after: any, path: string[] = [], out: Patch[] = []): Patch[] {\n  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);\n  for (const key of keys) {\n    const a = before?.[key];\n    const b = after?.[key];\n    if (a === b) continue;\n    if (a && b && typeof a === \"object\" && typeof b === \"object\" && !Array.isArray(a) && !Array.isArray(b)) {\n      makePatch(a, b, path.concat(key), out);\n    } else {\n      out.push({ path: path.concat(key), before: a, after: b });\n    }\n  }\n  return out;\n}\nfunction apply(target: any, patches: Patch[], direction: \"forward\" | \"backward\"): any {\n  const clone = JSON.parse(JSON.stringify(target));\n  for (const p of patches) write(clone, p.path, direction === \"forward\" ? p.after : p.before);\n  return clone;\n}\nconst v1 = { name: \"a\", nested: { x: 1, y: 2 }, list: [1] };\nconst v2 = { name: \"b\", nested: { x: 1, y: 9 }, list: [2] };\nconst patches = makePatch(v1, v2);\nfor (const p of patches) console.log(p.path.join(\".\"), JSON.stringify(p.before), \"->\", JSON.stringify(p.after));\nconsole.log(JSON.stringify(apply(v1, patches, \"forward\")) === JSON.stringify(v2));\nconsole.log(JSON.stringify(apply(v2, patches, \"backward\")) === JSON.stringify(v1));\nconsole.log(JSON.stringify(v1), patches.length);"
  },
  {
    "id": "c371-e2e-error-hierarchy-service",
    "title": "服务层错误体系：分类、重试判定、用户消息",
    "src": "class AppError extends Error {\n  constructor(message: string, public code: string, public retryable = false) { super(message); this.name = \"AppError\"; }\n}\nclass NetworkError extends AppError { constructor(m: string) { super(m, \"E_NET\", true); this.name = \"NetworkError\"; } }\nclass ValidationError extends AppError { constructor(m: string, public field: string) { super(m, \"E_VALID\", false); this.name = \"ValidationError\"; } }\nclass NotFoundError extends AppError { constructor(what: string) { super(\"missing \" + what, \"E_404\", false); this.name = \"NotFoundError\"; } }\nfunction call(kind: string): string {\n  if (kind === \"ok\") return \"data\";\n  if (kind === \"net\") throw new NetworkError(\"connection reset\");\n  if (kind === \"valid\") throw new ValidationError(\"too short\", \"name\");\n  throw new NotFoundError(kind);\n}\nfunction attempt(kind: string, maxRetries: number): string {\n  let tries = 0;\n  for (;;) {\n    tries += 1;\n    try { return call(kind) + \" after \" + tries; }\n    catch (e) {\n      const err = e as AppError;\n      console.log(\"try\", tries, err.name, err.code, err.retryable);\n      if (!err.retryable || tries >= maxRetries) {\n        if (err instanceof ValidationError) return \"user: fix field \" + err.field;\n        if (err instanceof NotFoundError) return \"user: not found\";\n        return \"user: try later\";\n      }\n    }\n  }\n}\nfor (const kind of [\"ok\", \"net\", \"valid\", \"thing\"]) console.log(\"->\", attempt(kind, 3));\nconst errs: Error[] = [new NetworkError(\"a\"), new ValidationError(\"b\", \"f\"), new NotFoundError(\"c\")];\nconsole.log(errs.map((e) => e instanceof AppError).join(\",\"), errs.filter((e) => (e as AppError).retryable).length);",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-e2e-json-schema-lite",
    "title": "极简 JSON Schema 校验：类型、必需、数组项、枚举",
    "src": "type Schema = {\n  type: \"object\" | \"array\" | \"string\" | \"number\" | \"boolean\";\n  required?: string[];\n  properties?: Record<string, Schema>;\n  items?: Schema;\n  enum?: unknown[];\n  minLength?: number;\n};\nfunction validate(value: unknown, schema: Schema, path = \"$\"): string[] {\n  const errors: string[] = [];\n  const typeOf = Array.isArray(value) ? \"array\" : value === null ? \"null\" : typeof value;\n  if (schema.enum && !schema.enum.some((e) => e === value)) errors.push(path + \": not in enum\");\n  if (typeOf !== schema.type) { errors.push(path + \": expected \" + schema.type + \" got \" + typeOf); return errors; }\n  if (schema.type === \"string\" && schema.minLength !== undefined && (value as string).length < schema.minLength) {\n    errors.push(path + \": shorter than \" + schema.minLength);\n  }\n  if (schema.type === \"object\") {\n    const obj = value as Record<string, unknown>;\n    for (const key of schema.required ?? []) if (!(key in obj)) errors.push(path + \".\" + key + \": required\");\n    for (const key of Object.keys(schema.properties ?? {})) {\n      if (key in obj) errors.push(...validate(obj[key], (schema.properties as Record<string, Schema>)[key], path + \".\" + key));\n    }\n  }\n  if (schema.type === \"array\" && schema.items) {\n    (value as unknown[]).forEach((item, index) => errors.push(...validate(item, schema.items as Schema, path + \"[\" + index + \"]\")));\n  }\n  return errors;\n}\nconst schema: Schema = {\n  type: \"object\",\n  required: [\"name\", \"tags\"],\n  properties: {\n    name: { type: \"string\", minLength: 3 },\n    age: { type: \"number\" },\n    role: { type: \"string\", enum: [\"admin\", \"user\"] },\n    tags: { type: \"array\", items: { type: \"string\", minLength: 2 } },\n  },\n};\nconst samples: unknown[] = [\n  { name: \"ann\", tags: [\"ab\"] },\n  { name: \"bo\", tags: [\"a\", \"bcd\"], role: \"admin\", age: 30 },\n  { tags: [], role: \"ghost\" },\n  \"not-an-object\",\n];\nfor (const s of samples) console.log(validate(s, schema).length, validate(s, schema).join(\" | \"));"
  },
  {
    "id": "c371-e2e-cursor-stream",
    "title": "流式处理：分批读取、窗口聚合、背压",
    "src": "function* chunks<T>(items: T[], size: number): Generator<T[]> {\n  for (let i = 0; i < items.length; i += size) yield items.slice(i, i + size);\n}\ntype Row = { ts: number; value: number };\nconst rows: Row[] = [];\nfor (let i = 0; i < 20; i++) rows.push({ ts: i, value: i % 5 });\nfunction aggregate(batch: Row[], size: number): string[] {\n  const out: string[] = [];\n  for (const group of chunks(batch, size)) {\n    const sum = group.reduce((a, b) => a + b.value, 0);\n    out.push(group[0].ts + \"-\" + group[group.length - 1].ts + \":\" + sum);\n  }\n  return out;\n}\nlet batches = 0;\nlet total = 0;\nfor (const batch of chunks(rows, 6)) {\n  batches += 1;\n  total += batch.length;\n  console.log(batches, batch.length, aggregate(batch, 2).join(\" \"));\n}\nconsole.log(batches, total, rows.length);\nconst empty: string[] = [];\nfor (const batch of chunks(empty, 3)) console.log(\"never\");\nconsole.log([...chunks([1, 2, 3], 10)].length, [...chunks([1], 1)].length);"
  },
  {
    "id": "c371-e2e-coordinate-geometry",
    "title": "二维几何：距离、点在多边形内、凸包",
    "src": "type Pt = { x: number; y: number };\nconst dist = (a: Pt, b: Pt): number => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);\nfunction inside(poly: Pt[], p: Pt): boolean {\n  let inside2 = false;\n  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {\n    const a = poly[i];\n    const b = poly[j];\n    const crosses = (a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;\n    if (crosses) inside2 = !inside2;\n  }\n  return inside2;\n}\nfunction hull(points: Pt[]): Pt[] {\n  const pts = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);\n  const cross = (o: Pt, a: Pt, b: Pt): number => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);\n  const build = (list: Pt[]): Pt[] => {\n    const out: Pt[] = [];\n    for (const p of list) {\n      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();\n      out.push(p);\n    }\n    return out;\n  };\n  const lower = build(pts);\n  const upper = build(pts.slice().reverse());\n  return lower.slice(0, -1).concat(upper.slice(0, -1));\n}\nconst square: Pt[] = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }];\nconsole.log(dist({ x: 0, y: 0 }, { x: 3, y: 4 }));\nconsole.log(inside(square, { x: 2, y: 2 }), inside(square, { x: 5, y: 2 }), inside(square, { x: 0, y: 2 }));\nconst cloud: Pt[] = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }, { x: 1, y: 3 }, { x: 2, y: 2 }, { x: 0, y: 2 }];\nconsole.log(hull(cloud).map((p) => p.x + \",\" + p.y).join(\" \"));\nconsole.log(hull(cloud).length, inside(hull(cloud), { x: 1, y: 1 }));"
  },
  {
    "id": "c371-e2e-graph-coloring",
    "title": "图着色：贪心 + 回溯找最少颜色",
    "src": "type G = Record<string, string[]>;\nfunction greedy(g: G): Record<string, number> {\n  const color: Record<string, number> = {};\n  for (const node of Object.keys(g).sort()) {\n    const used = new Set<number>();\n    for (const n of g[node]) if (color[n] !== undefined) used.add(color[n]);\n    let c = 0;\n    while (used.has(c)) c += 1;\n    color[node] = c;\n  }\n  return color;\n}\nfunction chromatic(g: G): number {\n  const nodes = Object.keys(g);\n  const color: Record<string, number> = {};\n  let best = nodes.length;\n  const canUse = (node: string, c: number): boolean => g[node].every((n) => color[n] !== c);\n  const go = (index: number, used: number): void => {\n    if (used >= best) return;\n    if (index === nodes.length) { best = Math.min(best, used); return; }\n    const node = nodes[index];\n    for (let c = 0; c < nodes.length; c++) {\n      if (c > used) break;\n      if (!canUse(node, c)) continue;\n      color[node] = c;\n      go(index + 1, Math.max(used, c + 1));\n      delete color[node];\n    }\n  };\n  go(0, 0);\n  return best;\n}\nconst triangle: G = { a: [\"b\", \"c\"], b: [\"a\", \"c\"], c: [\"a\", \"b\"] };\nconst path: G = { a: [\"b\"], b: [\"a\", \"c\"], c: [\"b\", \"d\"], d: [\"c\"] };\nconst cycle5: G = { a: [\"b\", \"e\"], b: [\"a\", \"c\"], c: [\"b\", \"d\"], d: [\"c\", \"e\"], e: [\"d\", \"a\"] };\nfor (const [name, g] of [[\"triangle\", triangle], [\"path\", path], [\"cycle5\", cycle5]] as [string, G][]) {\n  const colors = greedy(g);\n  const groups = new Map<number, string[]>();\n  for (const n of Object.keys(colors)) {\n    const list = groups.get(colors[n]) ?? [];\n    list.push(n);\n    groups.set(colors[n], list);\n  }\n  console.log(name, Object.values(colors).reduce((a, b) => Math.max(a, b), -1) + 1, chromatic(g));\n  console.log(\" \", [...groups.entries()].sort((x, y) => x[0] - y[0]).map(([, ns]) => ns.sort().join(\"\")).join(\"|\"));\n}"
  },
  {
    "id": "c371-e2e-binary-encoding",
    "title": "二进制编码：位打包、位读取、校验和",
    "src": "class BitWriter {\n  private bytes: number[] = [];\n  private current = 0;\n  private used = 0;\n  write(value: number, bits: number): void {\n    for (let i = bits - 1; i >= 0; i--) {\n      this.current = (this.current << 1) | ((value >> i) & 1);\n      this.used += 1;\n      if (this.used === 8) { this.bytes.push(this.current); this.current = 0; this.used = 0; }\n    }\n  }\n  finish(): number[] {\n    if (this.used > 0) this.bytes.push(this.current << (8 - this.used));\n    return this.bytes.slice();\n  }\n}\nclass BitReader {\n  private at = 0;\n  constructor(private bytes: number[]) {}\n  read(bits: number): number {\n    let value = 0;\n    for (let i = 0; i < bits; i++) {\n      const byte = this.bytes[this.at >> 3] ?? 0;\n      const bit = (byte >> (7 - (this.at & 7))) & 1;\n      value = (value << 1) | bit;\n      this.at += 1;\n    }\n    return value;\n  }\n  get consumed(): number { return this.at; }\n}\nconst w = new BitWriter();\nconst records: [number, number][] = [[3, 3], [17, 5], [1, 1], [255, 8], [0, 4]];\nfor (const [v, bits] of records) w.write(v, bits);\nconst bytes = w.finish();\nconsole.log(bytes.length, bytes.map((b) => b.toString(16).padStart(2, \"0\")).join(\" \"));\nconst r = new BitReader(bytes);\nconsole.log(records.map(([, bits]) => r.read(bits)).join(\",\"));\nconsole.log(r.consumed);\nfunction checksum(data: number[]): number {\n  let sum = 0;\n  for (const b of data) sum = (sum + b) & 0xff;\n  return sum;\n}\nconsole.log(checksum(bytes), checksum([]), checksum([255, 255]));",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-e2e-ast-walker",
    "title": "表达式 AST：求值、打印、变量收集",
    "src": "type Expr =\n  | { kind: \"num\"; value: number }\n  | { kind: \"var\"; name: string }\n  | { kind: \"bin\"; op: string; left: Expr; right: Expr }\n  | { kind: \"call\"; callee: string; args: Expr[] };\nconst ast: Expr = {\n  kind: \"bin\",\n  op: \"+\",\n  left: { kind: \"call\", callee: \"max\", args: [{ kind: \"num\", value: 3 }, { kind: \"var\", name: \"x\" }] },\n  right: { kind: \"bin\", op: \"*\", left: { kind: \"num\", value: 2 }, right: { kind: \"var\", name: \"y\" } },\n};\nconst funcs: Record<string, (...args: number[]) => number> = {\n  max: (...ns) => Math.max(...ns),\n  min: (...ns) => Math.min(...ns),\n};\nfunction evaluate(e: Expr, env: Record<string, number>): number {\n  switch (e.kind) {\n    case \"num\": return e.value;\n    case \"var\": {\n      if (!(e.name in env)) throw new Error(\"undefined variable: \" + e.name);\n      return env[e.name];\n    }\n    case \"bin\": {\n      const l = evaluate(e.left, env);\n      const r = evaluate(e.right, env);\n      if (e.op === \"+\") return l + r;\n      if (e.op === \"-\") return l - r;\n      if (e.op === \"*\") return l * r;\n      return Math.trunc(l / r);\n    }\n    case \"call\": {\n      const fn = funcs[e.callee];\n      if (!fn) throw new Error(\"unknown function: \" + e.callee);\n      return fn(...e.args.map((a) => evaluate(a, env)));\n    }\n  }\n}\nfunction print(e: Expr): string {\n  switch (e.kind) {\n    case \"num\": return String(e.value);\n    case \"var\": return e.name;\n    case \"bin\": return \"(\" + print(e.left) + \" \" + e.op + \" \" + print(e.right) + \")\";\n    case \"call\": return e.callee + \"(\" + e.args.map(print).join(\", \") + \")\";\n  }\n}\nfunction collectVars(e: Expr, out: Set<string> = new Set()): Set<string> {\n  if (e.kind === \"var\") out.add(e.name);\n  else if (e.kind === \"bin\") { collectVars(e.left, out); collectVars(e.right, out); }\n  else if (e.kind === \"call\") for (const a of e.args) collectVars(a, out);\n  return out;\n}\nconsole.log(print(ast));\nconsole.log(evaluate(ast, { x: 5, y: 4 }));\nconsole.log([...collectVars(ast)].sort().join(\",\"));\ntry { evaluate(ast, { x: 1 }); } catch (e) { console.log((e as Error).message); }\nconsole.log(collectVars({ kind: \"num\", value: 1 }).size);"
  },
  {
    "id": "c371-e2e-journal-and-undo",
    "title": "编辑器模型：命令、撤销栈、重做",
    "src": "type Command = { name: string; apply: (doc: string) => string; revert: (doc: string) => string };\nclass Editor {\n  private doc = \"\";\n  private undoStack: { cmd: Command; before: string }[] = [];\n  private redoStack: { cmd: Command; before: string }[] = [];\n  get text(): string { return this.doc; }\n  run(cmd: Command): void {\n    const before = this.doc;\n    this.doc = cmd.apply(this.doc);\n    this.undoStack.push({ cmd, before });\n    this.redoStack = [];\n  }\n  undo(): boolean {\n    const entry = this.undoStack.pop();\n    if (!entry) return false;\n    this.redoStack.push(entry);\n    this.doc = entry.before;\n    return true;\n  }\n  redo(): boolean {\n    const entry = this.redoStack.pop();\n    if (!entry) return false;\n    this.undoStack.push(entry);\n    this.doc = entry.cmd.apply(entry.before);\n    return true;\n  }\n  get depth(): [number, number] { return [this.undoStack.length, this.redoStack.length]; }\n}\nconst insert = (text: string): Command => ({\n  name: \"insert:\" + text,\n  apply: (doc) => doc + text,\n  revert: (doc) => doc.slice(0, doc.length - text.length),\n});\nconst editor = new Editor();\neditor.run(insert(\"hello\"));\neditor.run(insert(\" world\"));\neditor.run({ name: \"upper\", apply: (d) => d.toUpperCase(), revert: (d) => d.toLowerCase() });\nconsole.log(editor.text, editor.depth.join(\"/\"));\nconsole.log(editor.undo(), editor.text);\nconsole.log(editor.undo(), editor.text);\nconsole.log(editor.redo(), editor.text);\neditor.run(insert(\"!\"));\nconsole.log(editor.text, editor.depth.join(\"/\"), editor.redo());\nconsole.log(editor.undo(), editor.undo(), editor.undo(), editor.undo(), editor.text);"
  },
  {
    "id": "c371-e2e-matrix-sparse",
    "title": "稀疏矩阵：坐标存储、乘法、转置",
    "src": "type Entry = { r: number; c: number; v: number };\nclass Sparse {\n  private map = new Map<string, number>();\n  constructor(public rows: number, public cols: number) {}\n  set(r: number, c: number, v: number): void {\n    if (v === 0) this.map.delete(r + \",\" + c);\n    else this.map.set(r + \",\" + c, v);\n  }\n  get(r: number, c: number): number { return this.map.get(r + \",\" + c) ?? 0; }\n  get nnz(): number { return this.map.size; }\n  entries(): Entry[] {\n    return [...this.map.entries()].map(([k, v]) => {\n      const [r, c] = k.split(\",\").map(Number);\n      return { r, c, v };\n    }).sort((a, b) => a.r - b.r || a.c - b.c);\n  }\n  transpose(): Sparse {\n    const out = new Sparse(this.cols, this.rows);\n    for (const e of this.entries()) out.set(e.c, e.r, e.v);\n    return out;\n  }\n  mul(other: Sparse): Sparse {\n    const out = new Sparse(this.rows, other.cols);\n    for (const a of this.entries()) {\n      for (const b of other.entries()) {\n        if (a.c === b.r) out.set(a.r, b.c, out.get(a.r, b.c) + a.v * b.v);\n      }\n    }\n    return out;\n  }\n  density(): string { return ((this.nnz / (this.rows * this.cols)) * 100).toFixed(1) + \"%\"; }\n}\nconst a = new Sparse(3, 3);\na.set(0, 0, 1);\na.set(0, 2, 2);\na.set(2, 1, 3);\nconsole.log(a.nnz, a.density(), JSON.stringify(a.entries()));\nconsole.log(a.get(0, 2), a.get(1, 1));\nconst t = a.transpose();\nconsole.log(t.rows, t.cols, JSON.stringify(t.entries()));\nconst m = a.mul(t);\nconsole.log(m.rows, m.cols, JSON.stringify(m.entries()));\na.set(0, 2, 0);\nconsole.log(a.nnz, a.get(0, 2));",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-e2e-csv-to-report",
    "title": "CSV 到报表：解析、分组、格式化输出",
    "src": "const raw = [\n  \"region,product,units,price\",\n  \"north,widget,10,2.5\",\n  \"north,gadget,4,10\",\n  \"south,widget,7,2.5\",\n  \"south,gadget,1,10\",\n  \"east,widget,3,2.5\",\n].join(\"\\n\");\ntype Sale = { region: string; product: string; units: number; price: number };\nconst lines = raw.split(\"\\n\");\nconst header = lines[0].split(\",\");\nconst sales: Sale[] = [];\nfor (const line of lines.slice(1)) {\n  const cells = line.split(\",\");\n  const row: Record<string, string> = {};\n  header.forEach((h, i) => { row[h] = cells[i]; });\n  sales.push({ region: row.region, product: row.product, units: Number(row.units), price: Number(row.price) });\n}\nconst revenue = (s: Sale): number => s.units * s.price;\nlet total = 0;\nconst byRegion = new Map<string, number>();\nconst byProduct = new Map<string, number>();\nfor (const s of sales) {\n  const r = revenue(s);\n  total += r;\n  byRegion.set(s.region, (byRegion.get(s.region) ?? 0) + r);\n  byProduct.set(s.product, (byProduct.get(s.product) ?? 0) + r);\n}\nconst width = Math.max(...[...byRegion.keys()].map((k) => k.length), 6);\nconsole.log(\"region\".padEnd(width) + \" revenue  share\");\nfor (const [region, value] of [...byRegion.entries()].sort((a, b) => b[1] - a[1])) {\n  const share = ((value / total) * 100).toFixed(1) + \"%\";\n  console.log(region.padEnd(width) + \" \" + value.toFixed(2).padStart(7) + \"  \" + share);\n}\nconsole.log(\"total\".padEnd(width) + \" \" + total.toFixed(2).padStart(7));\nfor (const [product, value] of [...byProduct.entries()].sort()) console.log(product, value.toFixed(2));\nconsole.log(sales.length, sales.filter((s) => s.units > 4).length, (total / sales.length).toFixed(2));"
  },
  {
    "id": "c371-e2e-object-pool",
    "title": "对象池：借用、归还、上限与统计",
    "src": "class Pool<T> {\n  private free: T[] = [];\n  private inUse = new Set<T>();\n  private created = 0;\n  constructor(private factory: () => T, private max: number) {}\n  acquire(): T | null {\n    const recycled = this.free.pop();\n    if (recycled !== undefined) { this.inUse.add(recycled); return recycled; }\n    if (this.created >= this.max) return null;\n    const made = this.factory();\n    this.created += 1;\n    this.inUse.add(made);\n    return made;\n  }\n  release(item: T): boolean {\n    if (!this.inUse.has(item)) return false;\n    this.inUse.delete(item);\n    this.free.push(item);\n    return true;\n  }\n  get stats(): { created: number; free: number; inUse: number } {\n    return { created: this.created, free: this.free.length, inUse: this.inUse.size };\n  }\n}\ntype Conn = { id: number; busy: boolean };\nlet nextId = 1;\nconst pool = new Pool<Conn>(() => ({ id: nextId++, busy: false }), 2);\nconst a = pool.acquire();\nconst b = pool.acquire();\nconst c = pool.acquire();\nconsole.log(a!.id, b!.id, c, JSON.stringify(pool.stats));\nconsole.log(pool.release(a!), JSON.stringify(pool.stats));\nconst d = pool.acquire();\nconsole.log(d!.id, d === a, JSON.stringify(pool.stats));\nconsole.log(pool.release(c as Conn), pool.release(b!), pool.release(b!));\nconsole.log(JSON.stringify(pool.stats), nextId);",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-e2e-multi-source-merge",
    "title": "多来源合并：去重、优先级、冲突报告",
    "src": "type Rec = { id: string; value: number; source: string };\nconst sources: { name: string; priority: number; rows: Rec[] }[] = [\n  { name: \"cache\", priority: 1, rows: [{ id: \"a\", value: 1, source: \"cache\" }, { id: \"b\", value: 2, source: \"cache\" }] },\n  { name: \"db\", priority: 3, rows: [{ id: \"b\", value: 20, source: \"db\" }, { id: \"c\", value: 30, source: \"db\" }] },\n  { name: \"api\", priority: 2, rows: [{ id: \"a\", value: 10, source: \"api\" }, { id: \"d\", value: 40, source: \"api\" }] },\n];\nconst merged = new Map<string, Rec>();\nconst conflicts: string[] = [];\nfor (const source of sources.slice().sort((a, b) => a.priority - b.priority)) {\n  for (const row of source.rows) {\n    const existing = merged.get(row.id);\n    if (existing && existing.value !== row.value) conflicts.push(row.id + \":\" + existing.value + \"->\" + row.value);\n    if (!existing || source.priority >= sources.find((s) => s.rows.some((r) => r.id === existing.id))!.priority) {\n      merged.set(row.id, row);\n    }\n  }\n}\nconsole.log([...merged.values()].sort((a, b) => a.id.localeCompare(b.id)).map((r) => r.id + \"=\" + r.value + \"@\" + r.source).join(\",\"));\nconsole.log(conflicts.join(\"|\"));\nconsole.log(merged.size, sources.reduce((a, b) => a + b.rows.length, 0));\nconst winners = new Map<string, number>();\nfor (const s of sources) for (const r of s.rows) winners.set(r.id, (winners.get(r.id) ?? 0) + 1);\nconsole.log([...winners.entries()].map(([k, v]) => k + \":\" + v).join(\",\"));"
  },
  {
    "id": "c371-e2e-id-generator",
    "title": "ID 生成器：自增、前缀、校验位、解析",
    "src": "class IdGen {\n  private counter = 0;\n  constructor(private prefix: string, private width: number) {}\n  next(): string {\n    this.counter += 1;\n    const body = this.prefix + String(this.counter).padStart(this.width, \"0\");\n    return body + \"-\" + this.check(body);\n  }\n  private check(body: string): string {\n    let sum = 0;\n    for (let i = 0; i < body.length; i++) sum = (sum * 31 + body.charCodeAt(i)) % 997;\n    return String(sum).padStart(3, \"0\");\n  }\n  static parse(id: string): { prefix: string; serial: number; valid: boolean } | null {\n    const parts = id.split(\"-\");\n    if (parts.length !== 2) return null;\n    const body = parts[0];\n    const serial = Number(body.slice(2));\n    const gen = new IdGen(body.slice(0, 2), body.length - 2);\n    return { prefix: body.slice(0, 2), serial, valid: gen.check(body) === parts[1] };\n  }\n}\nconst gen = new IdGen(\"AB\", 4);\nconst ids: string[] = [];\nfor (let i = 0; i < 5; i++) ids.push(gen.next());\nconsole.log(ids.join(\",\"));\nconsole.log(ids.map((id) => JSON.stringify(IdGen.parse(id))).join(\"\\n\"));\nconsole.log(IdGen.parse(\"AB0003-999\"), IdGen.parse(\"bad\"), IdGen.parse(ids[0])!.serial);\nconsole.log(new Set(ids).size, ids.every((id) => IdGen.parse(id)!.valid));",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-e2e-debounce-and-batch",
    "title": "批处理调度：合并、去重、按序冲刷",
    "src": "class Batcher<T> {\n  private pending: T[] = [];\n  private seen = new Set<string>();\n  constructor(private keyOf: (item: T) => string, private size: number, private flush: (items: T[]) => void) {}\n  add(item: T): void {\n    const key = this.keyOf(item);\n    if (this.seen.has(key)) return;\n    this.seen.add(key);\n    this.pending.push(item);\n    if (this.pending.length >= this.size) this.drain();\n  }\n  drain(): void {\n    if (this.pending.length === 0) return;\n    const batch = this.pending;\n    this.pending = [];\n    this.seen.clear();\n    this.flush(batch);\n  }\n  get queued(): number { return this.pending.length; }\n}\nconst flushes: string[] = [];\nconst batcher = new Batcher<number>((n) => String(n % 3), 2, (items) => flushes.push(items.join(\"+\")));\nfor (const n of [1, 2, 3, 4, 5, 6, 7]) {\n  batcher.add(n);\n  console.log(\"after\", n, \"queued\", batcher.queued, \"flushes\", flushes.join(\"|\"));\n}\nbatcher.drain();\nconsole.log(flushes.join(\" \"), batcher.queued);\nconst empty: string[] = [];\nconst b2 = new Batcher<string>((s) => s, 5, (items) => empty.push(items.join(\"\")));\nb2.drain();\nconsole.log(empty.length, b2.queued);",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-e2e-iterator-toolkit",
    "title": "迭代器工具箱：map / filter / take / zip / cycle",
    "src": "function* map2<T, R>(it: Iterable<T>, fn: (v: T, i: number) => R): Generator<R> {\n  let i = 0;\n  for (const v of it) yield fn(v, i++);\n}\nfunction* filter2<T>(it: Iterable<T>, pred: (v: T) => boolean): Generator<T> {\n  for (const v of it) if (pred(v)) yield v;\n}\nfunction* take2<T>(it: Iterable<T>, n: number): Generator<T> {\n  let i = 0;\n  for (const v of it) { if (i >= n) return; i += 1; yield v; }\n}\nfunction* naturals(): Generator<number> { let i = 0; while (true) yield i++; }\nfunction* zip2<A, B>(a: Iterable<A>, b: Iterable<B>): Generator<[A, B]> {\n  const ia = a[Symbol.iterator]();\n  const ib = b[Symbol.iterator]();\n  for (;;) {\n    const x = ia.next();\n    const y = ib.next();\n    if (x.done || y.done) return;\n    yield [x.value, y.value];\n  }\n}\nfunction* cycle2<T>(items: T[]): Generator<T> {\n  while (items.length > 0) for (const v of items) yield v;\n}\nconsole.log([...take2(map2(naturals(), (v) => v * v), 5)].join(\",\"));\nconsole.log([...filter2(naturals(), (v) => v % 3 === 0).next().value ? [...take2(filter2(naturals(), (v) => v % 3 === 0), 4)] : []].join(\",\"));\nconsole.log([...zip2([1, 2, 3], [\"a\", \"b\"])].map((p) => p[0] + p[1]).join(\",\"));\nconsole.log([...take2(cycle2([\"x\", \"y\"]), 5)].join(\"\"));\nconsole.log([...take2(naturals(), 0)].length, [...map2([], (v: number) => v)].length);"
  },
  {
    "id": "c371-e2e-string-search-index",
    "title": "倒排索引：建索引、查询、打分排序",
    "src": "const docs: { id: number; text: string }[] = [\n  { id: 1, text: \"the quick brown fox\" },\n  { id: 2, text: \"the lazy dog sleeps\" },\n  { id: 3, text: \"quick quick fox jumps\" },\n  { id: 4, text: \"dog and fox are friends\" },\n];\nfunction tokenize(text: string): string[] {\n  return text.split(\" \").filter((w) => w.length > 0);\n}\nconst index = new Map<string, Map<number, number>>();\nconst lengths = new Map<number, number>();\nfor (const doc of docs) {\n  const words = tokenize(doc.text);\n  lengths.set(doc.id, words.length);\n  for (const w of words) {\n    const posting = index.get(w) ?? new Map<number, number>();\n    posting.set(doc.id, (posting.get(doc.id) ?? 0) + 1);\n    index.set(w, posting);\n  }\n}\nconsole.log(index.size, [...index.get(\"fox\")!.entries()].map(([id, n]) => id + \":\" + n).join(\",\"));\nfunction search(query: string): { id: number; score: number }[] {\n  const scores = new Map<number, number>();\n  for (const term of tokenize(query)) {\n    const posting = index.get(term);\n    if (!posting) continue;\n    const idf = Math.log(docs.length / posting.size);\n    for (const [id, tf] of posting) {\n      const norm = tf / (lengths.get(id) as number);\n      scores.set(id, (scores.get(id) ?? 0) + tf * idf * (1 - norm));\n    }\n  }\n  return [...scores.entries()].map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score || a.id - b.id);\n}\nfor (const q of [\"fox\", \"quick fox\", \"dog\", \"missing\"]) {\n  console.log(q, \"->\", search(q).map((r) => r.id + \"(\" + r.score.toFixed(3) + \")\").join(\" \"));\n}\nconsole.log(search(\"\").length, tokenize(\"a b\").length);"
  },
  {
    "id": "c371-e2e-calculator-with-variables",
    "title": "带变量的计算器：赋值、依赖、错误恢复",
    "src": "function isAlpha(s: string): boolean {\n  if (s.length === 0) return false;\n  for (let i = 0; i < s.length; i++) {\n    const c = s.charAt(i);\n    if (c < \"a\" || c > \"z\") return false;\n  }\n  return true;\n}\nfunction isNumeric(s: string): boolean {\n  if (s.length === 0) return false;\n  for (let i = 0; i < s.length; i++) {\n    const c = s.charAt(i);\n    if (!((c >= \"0\" && c <= \"9\") || c === \".\")) return false;\n  }\n  return true;\n}\nfunction tokenize(text: string): string[] {\n  const out: string[] = [];\n  let cur = \"\";\n  for (let i = 0; i < text.length; i++) {\n    const c = text.charAt(i);\n    if (c === \" \") { if (cur !== \"\") { out.push(cur); cur = \"\"; } continue; }\n    if (\"+-*/()\".includes(c)) { if (cur !== \"\") { out.push(cur); cur = \"\"; } out.push(c); continue; }\n    cur += c;\n  }\n  if (cur !== \"\") out.push(cur);\n  return out;\n}\nclass Calc {\n  private vars = new Map<string, number>();\n  private history: string[] = [];\n  evaluate(input: string): string {\n    try {\n      const eq = input.indexOf(\"=\");\n      if (eq > 0) {\n        const name = input.slice(0, eq).trim();\n        if (!isAlpha(name)) throw new Error(\"bad name: \" + name);\n        const value = this.expr(input.slice(eq + 1).trim());\n        this.vars.set(name, value);\n        this.history.push(name + \"=\" + value);\n        return name + \" = \" + value;\n      }\n      const value = this.expr(input);\n      this.history.push(String(value));\n      return String(value);\n    } catch (e) {\n      this.history.push(\"!\" + (e as Error).message);\n      return \"error: \" + (e as Error).message;\n    }\n  }\n  private expr(text: string): number {\n    const tokens = tokenize(text);\n    let at = 0;\n    const peek = (): string | undefined => tokens[at];\n    const primary = (): number => {\n      const t = tokens[at++];\n      if (t === \"(\") { const v = sum(); at += 1; return v; }\n      if (t === \"-\") return -primary();\n      if (t === undefined) throw new Error(\"unexpected end\");\n      if (isNumeric(t)) return Number(t);\n      if (isAlpha(t)) {\n        if (!this.vars.has(t)) throw new Error(\"undefined: \" + t);\n        return this.vars.get(t) as number;\n      }\n      throw new Error(\"bad token: \" + t);\n    };\n    const product = (): number => {\n      let left = primary();\n      for (;;) {\n        const t = peek();\n        if (t === \"*\" || t === \"/\") { at += 1; const right = primary(); left = t === \"*\" ? left * right : left / right; }\n        else return left;\n      }\n    };\n    const sum = (): number => {\n      let left = product();\n      for (;;) {\n        const t = peek();\n        if (t === \"+\" || t === \"-\") { at += 1; const right = product(); left = t === \"+\" ? left + right : left - right; }\n        else return left;\n      }\n    };\n    return sum();\n  }\n  get log(): string[] { return this.history.slice(); }\n}\nconst calc = new Calc();\nfor (const line of [\"x = 10\", \"y = x * 2 + 1\", \"y + x\", \"z\", \"bad name = 1\", \"2 * (3 + 4)\", \"x / 0\"]) {\n  console.log(line, \"=>\", calc.evaluate(line));\n}\nconsole.log(calc.log.join(\" | \"));"
  },
  {
    "id": "c371-e2e-serialization-roundtrip",
    "title": "自定义序列化：类型标签、循环引用、还原",
    "src": "type Tagged = { __type: string; value: unknown };\nfunction encode(value: unknown, seen = new Map<unknown, string>()): unknown {\n  if (value === null || typeof value !== \"object\") {\n    if (typeof value === \"number\" && !Number.isFinite(value)) return { __type: \"number\", value: String(value) } as Tagged;\n    if (value === undefined) return { __type: \"undefined\" } as Tagged;\n    return value;\n  }\n  const existing = seen.get(value);\n  if (existing !== undefined) return { __type: \"ref\", value: existing } as Tagged;\n  const id = \"#\" + (seen.size + 1);\n  seen.set(value, id);\n  if (Array.isArray(value)) return { __type: \"array\", id, value: value.map((v) => encode(v, seen)) };\n  if (value instanceof Map) return { __type: \"map\", id, value: [...value.entries()].map(([k, v]) => [encode(k, seen), encode(v, seen)]) };\n  if (value instanceof Set) return { __type: \"set\", id, value: [...value].map((v) => encode(v, seen)) };\n  if (value instanceof Date) return { __type: \"date\", id, value: value.getTime() };\n  const props: Record<string, unknown> = {};\n  for (const key of Object.keys(value as Record<string, unknown>)) props[key] = encode((value as Record<string, unknown>)[key], seen);\n  return { __type: \"object\", id, value: props };\n}\nfunction decode(node: unknown, refs = new Map<string, unknown>()): unknown {\n  if (node === null || typeof node !== \"object\") return node;\n  const t = node as Tagged & { id?: string };\n  switch (t.__type) {\n    case \"undefined\": return undefined;\n    case \"number\": return t.value === \"NaN\" ? NaN : t.value === \"Infinity\" ? Infinity : -Infinity;\n    case \"ref\": return refs.get(t.value as string);\n    case \"date\": { const d = new Date(t.value as number); refs.set(t.id as string, d); return d; }\n    case \"array\": { const arr: unknown[] = []; refs.set(t.id as string, arr); for (const v of t.value as unknown[]) arr.push(decode(v, refs)); return arr; }\n    case \"map\": { const m = new Map(); refs.set(t.id as string, m); for (const [k, v] of t.value as [unknown, unknown][]) m.set(decode(k, refs), decode(v, refs)); return m; }\n    case \"set\": { const s = new Set(); refs.set(t.id as string, s); for (const v of t.value as unknown[]) s.add(decode(v, refs)); return s; }\n    default: {\n      const o: Record<string, unknown> = {};\n      refs.set(t.id as string, o);\n      for (const key of Object.keys(t.value as Record<string, unknown>)) o[key] = decode((t.value as Record<string, unknown>)[key], refs);\n      return o;\n    }\n  }\n}\nconst shared = { tag: \"shared\" };\nconst source: any = {\n  n: NaN,\n  inf: Infinity,\n  missing: undefined,\n  arr: [1, shared, shared],\n  map: new Map<string, unknown>([[\"k\", shared]]),\n  set: new Set([1, 2]),\n  date: new Date(0),\n  self: null,\n};\nsource.self = source;\nconst encoded = encode(source);\nconst text = JSON.stringify(encoded);\nconsole.log(text.length);\nconst back = decode(JSON.parse(text)) as any;\nconsole.log(Number.isNaN(back.n), back.inf === Infinity, back.missing === undefined);\nconsole.log(back.arr[1] === back.arr[2], back.map.get(\"k\") === back.arr[1], back.self === back);\nconsole.log(back.date.getTime(), back.set.size, JSON.stringify(back.arr[0]));"
  },
  {
    "id": "c371-e2e-permissions-matrix",
    "title": "权限矩阵：角色 × 资源 × 动作 + 审计",
    "src": "type Role = \"admin\" | \"editor\" | \"viewer\";\ntype Action2 = \"read\" | \"write\" | \"delete\";\nconst rules: Record<Role, Record<Action2, boolean>> = {\n  admin: { read: true, write: true, delete: true },\n  editor: { read: true, write: true, delete: false },\n  viewer: { read: true, write: false, delete: false },\n};\nconst overrides: Record<string, Partial<Record<Action2, boolean>>> = {\n  \"editor:secret\": { read: false },\n  \"viewer:public\": { write: true },\n};\nfunction can(role: Role, resource: string, action: Action2): boolean {\n  const key = role + \":\" + resource;\n  const override = overrides[key];\n  if (override && override[action] !== undefined) return override[action] as boolean;\n  return rules[role][action];\n}\nconst audit: string[] = [];\nfunction attempt(role: Role, resource: string, action: Action2): string {\n  const allowed = can(role, resource, action);\n  audit.push(role + \"/\" + resource + \"/\" + action + \"=\" + (allowed ? \"y\" : \"n\"));\n  return allowed ? \"ok\" : \"denied\";\n}\nconst cases: [Role, string, Action2][] = [\n  [\"admin\", \"secret\", \"delete\"],\n  [\"editor\", \"secret\", \"read\"],\n  [\"editor\", \"doc\", \"write\"],\n  [\"viewer\", \"public\", \"write\"],\n  [\"viewer\", \"doc\", \"delete\"],\n];\nfor (const [role, resource, action] of cases) console.log(role, resource, action, attempt(role, resource, action));\nconsole.log(audit.length, audit.filter((a) => a.endsWith(\"y\")).length);\nconst matrix: string[] = [];\nfor (const role of [\"admin\", \"editor\", \"viewer\"] as Role[]) {\n  matrix.push(role + \":\" + ([\"read\", \"write\", \"delete\"] as Action2[]).map((a) => (rules[role][a] ? \"1\" : \"0\")).join(\"\"));\n}\nconsole.log(matrix.join(\" \"));"
  },

  // ===== 第 383 轮：`override` 的两副面孔（1 条）=====
  {
    "id": "c383-e2e-override-as-value-and-modifier",
    "title": "`override` 的两副面孔：类成员修饰词 vs 普通变量名",
    "src": "// TS 里 `override` 是**上下文关键字**：只在类成员 / 形参的修饰位上是关键字，\n// 而它同时是一个**完全合法的变量名**。两副面孔必须同时成立。\nclass Base {\n  m(): number { return 1; }\n  get g(): number { return 10; }\n}\nclass Derived extends Base {\n  override m(): number { return 2; }\n  override get g(): number { return 20; }\n}\nconsole.log(\"A\", new Derived().m(), new Derived().g);\ninterface Shape2 { override: number; }\nconst shaped: Shape2 = { override: 5 };\nconsole.log(\"B\", shaped.override);\nclass Holder {\n  override = 7;\n}\nconsole.log(\"C\", new Holder().override);\nconst override = 9;\nconsole.log(\"D\", override + 1, typeof override);\nconst overrides: Record<string, number> = { k: 3 };\nfunction pick(key: string): number {\n  const override = overrides[key];\n  if (override && override > 0) return override;\n  return -1;\n}\nconsole.log(\"E\", pick(\"k\"), pick(\"nope\"));\nconst table = { override: 11 };\nconsole.log(\"F\", table.override, table[\"override\"]);",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },

  // ===== 第 384 轮：`|` / `&` 的值位与类型位（1 条）=====
  {
    "id": "c384-e2e-union-and-intersection-shapes",
    "title": "`A | (B & C)` 的两副面孔：值位是位运算、类型位是联合/交叉",
    "src": "// 同一个形状、两种意思 —— 判据只能看**左边那一格**（第 384 轮）。\n// 值位：位运算\nconst a = 1;\nconst b = 2;\nconst c = 3;\nconsole.log(\"A\", a | (b & c), 1 | (2 & 3), a & (b | c));\nlet v = 0;\nv = 1 | (2 & 3);\nconsole.log(\"B\", v);\nfunction f(): number {\n  return 1 | (2 & 3);\n}\nconsole.log(\"C\", f());\nconsole.log(\"D\", ((a + b) & 0xff) | 16);\n// 类型位：联合 / 交叉（同样的括号形状）\ntype Wide = string | number;\ntype Both = { x: number } & { y: string };\ntype Mixed = Wide | (Both & { z: boolean });\ntype Leading =\n  | (Both & { w: number })\n  | Wide;\nconst wide: Wide = \"s\";\nconst both: Both = { x: 1, y: \"y\" };\nconst mixed: Mixed = both;\nconst leading: Leading = both;\nconsole.log(\"E\", typeof wide, both.x, both.y, mixed.y, leading.x);\ninterface HasOpts { mode?: Mixed | undefined; flag?: Leading | null; }\nconst opts: HasOpts = { mode: both, flag: both };\nconsole.log(\"F\", opts.mode !== undefined, opts.flag !== undefined);\nconsole.log(\"G\", a | (b & c) | (a & b), (a | b) & (b | c));",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  // ============ 第 623 轮加宽：普查 tmp/cand-623b.mjs 收进来的场景 ============
  {
    id: "c623-e2e-word-count",
    title: "端到端：分词统计（Map + sort + 模板串）",
    src: "\nconst text = \"the quick brown fox the lazy dog the\";\nconst counts = new Map<string, number>();\nfor (const w of text.split(\" \")) counts.set(w, (counts.get(w) ?? 0) + 1);\nconst rows = [...counts.entries()].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1));\nfor (const [w, n] of rows) console.log(`${w}:${n}`);\n",
  },
  {
    id: "c623-e2e-linked-list",
    title: "端到端：链表（类 + 泛型 + 迭代器协议）",
    nodeArgs: ["--experimental-transform-types"],
    src: "\nclass Node2<T> { next: Node2<T> | null = null; constructor(public value: T) {} }\nclass List<T> {\n  head: Node2<T> | null = null;\n  push(v: T) { const n = new Node2(v); n.next = this.head; this.head = n; return this; }\n  *[Symbol.iterator]() { let c = this.head; while (c !== null) { yield c.value; c = c.next; } }\n}\nconst l = new List<number>().push(1).push(2).push(3);\nconsole.log([...l].join(\",\"), [...l].length);\n",
  },
  {
    id: "c623-e2e-state-machine",
    title: "端到端：状态机（对象 + switch + 闭包）",
    src: "\ntype State = \"idle\" | \"run\" | \"done\";\nfunction machine() {\n  let state: State = \"idle\";\n  const log: string[] = [];\n  return {\n    send(e: string) {\n      switch (state) {\n        case \"idle\": state = e === \"go\" ? \"run\" : \"idle\"; break;\n        case \"run\": state = e === \"finish\" ? \"done\" : \"run\"; break;\n        default: break;\n      }\n      log.push(state);\n      return state;\n    },\n    get states() { return log.join(\">\"); },\n  };\n}\nconst m = machine();\nconsole.log(m.send(\"go\"), m.send(\"tick\"), m.send(\"finish\"), m.states);\n",
  },
  {
    id: "c623-e2e-matrix-ops",
    title: "端到端：矩阵乘法（嵌套数组 + 循环 + 数值）",
    src: "\nconst a = [[1, 2], [3, 4]];\nconst b = [[5, 6], [7, 8]];\nconst out: number[][] = [];\nfor (let i = 0; i < a.length; i++) {\n  const row: number[] = [];\n  for (let j = 0; j < b[0].length; j++) {\n    let sum = 0;\n    for (let k = 0; k < b.length; k++) sum += a[i][k] * b[k][j];\n    row.push(sum);\n  }\n  out.push(row);\n}\nconsole.log(JSON.stringify(out));\n",
  },
  {
    id: "c623-e2e-event-bus",
    title: "端到端：事件总线（Map<事件, 处理器数组> + 注销）",
    src: "\ntype Handler = (payload: any) => void;\nclass Bus {\n  private map = new Map<string, Handler[]>();\n  on(k: string, h: Handler) {\n    const list = this.map.get(k) ?? [];\n    list.push(h);\n    this.map.set(k, list);\n    return () => this.off(k, h);\n  }\n  off(k: string, h: Handler) {\n    const list = this.map.get(k) ?? [];\n    const i = list.indexOf(h);\n    if (i >= 0) list.splice(i, 1);\n  }\n  emit(k: string, payload: any) { for (const h of this.map.get(k) ?? []) h(payload); }\n}\nconst bus = new Bus();\nconst seen: string[] = [];\nconst off = bus.on(\"x\", (p) => seen.push(\"a\" + p));\nbus.on(\"x\", (p) => seen.push(\"b\" + p));\nbus.emit(\"x\", 1);\noff();\nbus.emit(\"x\", 2);\nconsole.log(seen.join(\",\"));\n",
  },
  {
    id: "c623-e2e-async-queue",
    title: "端到端：串行队列（Promise 链 + async/await）",
    src: "\nconst log: number[] = [];\nfunction task(n: number) {\n  return new Promise<void>((res) => {\n    log.push(n);\n    Promise.resolve().then(() => res());\n  });\n}\nasync function run() {\n  for (const n of [1, 2, 3]) await task(n);\n  console.log(log.join(\",\"));\n  console.log(await Promise.resolve(\"done\"));\n}\nrun();\nconsole.log(\"queued\");\n",
  },
  {
    id: "c623-e2e-json-roundtrip",
    title: "端到端：JSON 往返 + 校验 + 错误分支",
    src: "\ntype Row = { id: number; name: string; tags: string[] };\nfunction parseRow(text: string): Row | null {\n  try {\n    const v = JSON.parse(text);\n    if (typeof v.id !== \"number\" || typeof v.name !== \"string\") return null;\n    return { id: v.id, name: v.name, tags: Array.isArray(v.tags) ? v.tags : [] };\n  } catch { return null; }\n}\nconst ok = parseRow('{\"id\":1,\"name\":\"a\",\"tags\":[\"x\"]}');\nconst bad = parseRow('{\"id\":\"1\"}');\nconsole.log(ok === null ? \"null\" : ok.id + ok.name + ok.tags.join(\"-\"), bad === null);\nconsole.log(JSON.stringify(parseRow('{\"id\":2,\"name\":\"b\"}')));\n",
  },
  {
    id: "c623-e2e-inheritance-polymorphism",
    title: "端到端：多态分派（抽象基类 + 三个子类 + instanceof）",
    nodeArgs: ["--experimental-transform-types"],
    src: "\nabstract class Shape {\n  abstract area(): number;\n  describe() { return this.constructor.name + \":\" + this.area(); }\n}\nclass Sq extends Shape { constructor(private s: number) { super(); } area() { return this.s * this.s; } }\nclass Rect extends Shape { constructor(private w: number, private h: number) { super(); } area() { return this.w * this.h; } }\nconst shapes: Shape[] = [new Sq(2), new Rect(2, 3)];\nfor (const s of shapes) console.log(s.describe(), s instanceof Sq, s instanceof Rect);\nconsole.log(shapes.map((s) => s.area()).reduce((a, b) => a + b, 0));\n",
  },
  // ---- 第 639 轮加宽：矩阵里还空着的普通形状（普查过一遍，见 tests/coverage/README.md） ----
  {
    id: "c639-e2e-promise-all-settled",
    title: "端到端：Promise.allSettled + 状态分桶 + 顺序保持",
    src: "\nasync function risky(n: number): Promise<number> {\n  if (n % 3 === 0) return Promise.reject(new Error(\"bad \" + n));\n  return n * 2;\n}\nasync function main(): Promise<void> {\n  const settled = [1, 2, 3, 4, 5, 6].map((n) => risky(n));\n  const results = await Promise.allSettled(settled);\n  const ok: string[] = [];\n  const bad: string[] = [];\n  for (const item of results) {\n    if (item.status === \"fulfilled\") ok.push(String(item.value));\n    else bad.push(item.reason.message);\n  }\n  console.log(ok.join(\",\"));\n  console.log(bad.join(\",\"));\n  console.log(results.length, ok.length, bad.length);\n}\nmain();\n",
  },
  {
    id: "c639-e2e-async-iterator-for-await",
    title: "端到端：异步迭代器 + for await + 提前 break + return 收尾",
    expect: "differ",
    why: "`get_iterator` 只认 `Symbol.iterator`（第 184 轮那条路），`[Symbol.asyncIterator]` 的自定义异步可迭代物还没有那一档：引擎的 `iter_new` 于是报 `iter_new on this kind of object`。AST 那一层已经修好（对象字面量里的关键字方法名 `return()` / `throw()`，第 640 轮）",
    src: "\nconst trace: string[] = [];\nconst source = {\n  [Symbol.asyncIterator]() {\n    let i = 0;\n    return {\n      next(): Promise<IteratorResult<number>> {\n        i += 1;\n        return Promise.resolve(i <= 5 ? { value: i, done: false } : { value: 0, done: true });\n      },\n      return(): Promise<IteratorResult<number>> {\n        trace.push(\"closed\");\n        return Promise.resolve({ value: 0, done: true });\n      },\n    };\n  },\n};\nasync function main(): Promise<void> {\n  for await (const n of source) {\n    trace.push(\"got \" + n);\n    if (n === 3) break;\n  }\n  console.log(trace.join(\"|\"));\n}\nmain();\n",
  },
  {
    id: "c639-e2e-try-return-finally-order",
    title: "端到端：try 里 return 与 finally 的覆盖顺序 + 嵌套 try",
    src: "\nconst log: string[] = [];\nfunction inner(): number {\n  try {\n    log.push(\"inner-try\");\n    return 1;\n  } finally {\n    log.push(\"inner-finally\");\n  }\n}\nfunction outer(): number {\n  try {\n    const v = inner();\n    log.push(\"outer-after \" + v);\n    return v + 10;\n  } finally {\n    log.push(\"outer-finally\");\n    return 99;\n  }\n}\nconsole.log(outer());\nconsole.log(log.join(\",\"));\n",
  },
  {
    id: "c639-e2e-generator-delegation-two-way",
    title: "端到端：yield* 委派 + 双向传值 + return 值透传",
    src: "\nfunction* inner(): Generator<number, string, number> {\n  const first = yield 1;\n  const second = yield first + 1;\n  return \"inner:\" + second;\n}\nfunction* outer(): Generator<number, void, number> {\n  const got = yield* inner();\n  console.log(got);\n  yield 100;\n}\nconst it = outer();\nconsole.log(JSON.stringify(it.next()));\nconsole.log(JSON.stringify(it.next(10)));\nconsole.log(JSON.stringify(it.next(20)));\nconsole.log(JSON.stringify(it.next()));\n",
  },
  {
    id: "c639-e2e-async-throw-inside-map-array",
    title: "端到端：async 函数在 map 回调里 throw，再交给 allSettled",
    src: "\nasync function risky(n: number): Promise<number> {\n  if (n === 3) throw new Error(\"bad\");\n  return n * 2;\n}\nasync function main(): Promise<void> {\n  const settled = [1, 2, 3].map((n) => risky(n));\n  const results = await Promise.allSettled(settled);\n  console.log(results.length, results[2].status, results[2].reason.message);\n}\nmain();\n",
  },
  {
    id: "c639-e2e-primitive-protocol",
    title: "端到端：Symbol.toPrimitive / toString / valueOf 的优先级",
    src: "\nclass Money {\n  private cents: number;\n  constructor(cents: number) { this.cents = cents; }\n  valueOf(): number { return this.cents; }\n  toString(): string { return \"$\" + (this.cents / 100).toFixed(2); }\n  [Symbol.toPrimitive](hint: string): string | number {\n    return hint === \"string\" ? this.toString() : this.cents;\n  }\n}\nconst m = new Money(1250);\nconsole.log(m + 100);\nconsole.log(`${m}`);\nconsole.log(String(m));\nconsole.log(m > 1000, m == 1250, m === 1250);\n",
  },
  {
    id: "c639-e2e-string-matchall-and-index",
    title: "端到端：matchAll + lastIndex + 命名捕获组",
    skip: true,
    why: "口径边界：正则字面量（runtime-architecture.md §15 那张「明确不做」的表）",
    src: "\nconst text = \"a1=10; b2=20; c3=30\";\nconst rows: string[] = [];\nfor (const m of text.matchAll(/(?<key>[a-z])(?<n>\\d)=(?<v>\\d+)/g)) {\n  rows.push(m.groups!.key + \":\" + Number(m.groups!.v));\n  rows.push(\"at \" + m.index);\n}\nconsole.log(rows.join(\"|\"));\nconst re = /\\d+/g;\nconsole.log(re.lastIndex, re.exec(text)![0], re.lastIndex);\n",
  },
  {
    id: "c639-e2e-array-sort-stability-and-holes",
    title: "端到端：sort 稳定性 + 稀疏数组 + at 负下标",
    src: "\nconst rows = [\n  { k: 2, tag: \"a\" },\n  { k: 1, tag: \"b\" },\n  { k: 2, tag: \"c\" },\n  { k: 1, tag: \"d\" },\n];\nrows.sort((x, y) => x.k - y.k);\nconsole.log(rows.map((r) => r.tag).join(\"\"));\nconst sparse: number[] = [1, , 3];\nconsole.log(sparse.length, 1 in sparse, sparse.join(\"-\"));\nconsole.log(sparse.at(-1), sparse.at(-3), sparse.at(-9));\nconst filled = sparse.fill(0, 1, 2);\nconsole.log(filled.join(\"-\"));\n",
  },
  {
    id: "c639-e2e-map-set-object-keys-order",
    title: "端到端：Map / Set / Object 的键序与相等语义",
    src: "\nconst m = new Map<unknown, string>();\nm.set(1, \"num\");\nm.set(\"1\", \"str\");\nm.set(true, \"bool\");\nm.set(1, \"num2\");\nconsole.log(m.size, [...m.keys()].map((k) => typeof k).join(\",\"));\nconsole.log(m.get(1), m.get(\"1\"), m.has(true));\nconst s = new Set<number>([1, 2, 2, 3, 1]);\nconsole.log(s.size, [...s].join(\"\"));\nconst obj: Record<string, number> = {};\nobj[\"2\"] = 2;\nobj[\"1\"] = 1;\nobj[\"b\"] = 3;\nobj[\"a\"] = 4;\nconsole.log(Object.keys(obj).join(\",\"));\n",
  },
  {
    id: "c639-e2e-optional-chain-call-assign",
    title: "端到端：可选链的三种后缀 + 空值合并赋值 + 逻辑赋值",
    src: "\ntype Cfg = { a?: { b?: { run?: (x: number) => number } } };\nconst c: Cfg = { a: { b: { run: (x) => x + 1 } } };\nconst empty: Cfg = {};\nconsole.log(c.a?.b?.run?.(1));\nconsole.log(empty.a?.b?.run?.(1) ?? \"none\");\nlet n: number | null = null;\nn ??= 5;\nn ||= 9;\nn &&= n + 1;\nlet z = 0;\nz ||= 7;\nconsole.log(n, z);\nconst arr: Array<{ f?: () => number }> = [{}, { f: () => 3 }];\nconsole.log(arr[1]?.f?.(), arr[0]?.f?.() ?? -1);\n",
  },
  {
    id: "c639-e2e-class-private-and-static-init",
    title: "端到端：私有字段 + 静态初始化顺序 + getter 只算一次",
    src: "\nconst order: string[] = [];\nclass Counter {\n  static total = 0;\n  static { order.push(\"static-block\"); Counter.total = 100; }\n  #hits = 0;\n  get hits(): number { order.push(\"get\"); return this.#hits; }\n  bump(): number { this.#hits += 1; Counter.total += 1; return this.#hits; }\n  static has(obj: object): boolean { return #hits in obj; }\n}\nconst c = new Counter();\nc.bump();\nc.bump();\nconsole.log(order.join(\",\"));\nconsole.log(c.hits, Counter.total, Counter.has(c));\n",
  },
  {
    id: "c639-e2e-destructure-default-nested-rest",
    title: "端到端：嵌套解构 + 默认值 + 剩余 + 交换 + 函数参数解构",
    src: "\nconst payload = { user: { name: \"kim\", tags: [\"a\", \"b\", \"c\"] }, n: 3 };\nconst { user: { name, tags: [first, ...restTags] }, n = 0 } = payload;\nconsole.log(name, first, restTags.join(\"\"), n);\nfunction draw({ w = 1, h = w * 2, label = `x${w}` } = {}) {\n  return `${label}:${w}x${h}`;\n}\nconsole.log(draw(), draw({ w: 3 }), draw({ w: 2, h: 5, label: \"z\" }));\nlet p = 1;\nlet q = 2;\n[p, q] = [q, p];\nconsole.log(p, q);\nconst [[a, b = 9], [, c = 8]] = [[1], [7]];\nconsole.log(a, b, c);\n",
  },
  {
    id: "c639-e2e-switch-fallthrough-and-label",
    title: "端到端：switch 贯穿 + 标签跳出外层循环 + continue 到标签",
    src: "\nfunction grade(n: number): string {\n  let out = \"\";\n  switch (n) {\n    case 90:\n    case 91:\n      out += \"A\";\n      break;\n    case 80:\n      out += \"B\";\n    default:\n      out += \"?\";\n  }\n  return out;\n}\nconsole.log(grade(90), grade(80), grade(1));\nconst found: string[] = [];\nouter: for (let i = 0; i < 4; i++) {\n  for (let j = 0; j < 4; j++) {\n    if (j === 1) continue outer;\n    if (i === 2) break outer;\n    found.push(`${i}${j}`);\n  }\n}\nconsole.log(found.join(\",\"));\n",
  },
];
