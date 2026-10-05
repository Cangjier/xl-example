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
];
