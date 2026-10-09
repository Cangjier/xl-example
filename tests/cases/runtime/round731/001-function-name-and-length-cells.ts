// xl:title 函数的 `length` / `name` 两格：自有、不可写、不进枚举，以及各类函数上的取值
// xl:round 731
// xl:judge stdout
// xl:end
// **按判定点并组（第 803 轮）**：这一族在三个域里各量了一遍（第 731 / 733 / 734 轮），
// 现在并成一条 —— 吸收 `runtime/round731/p731a-a01` … `a09` 九条、
// `runtime/round733/p733a-a01` · `a02` · `a03` 三条、`runtime/round734/p734a-a01` 一条，
// 一共 **13 条**，正文逐句搬进各自的块里，打印口径与探针一字不差。
// 判据只有一条：**`length` / `name` 这两格答什么、怎么挂**——自定义函数 / 箭头 /
// 生成器 / `async` / 类 / 对象方法与访问器 / 计算键 / `bind` 出来的函数 / 内建方法 /
// 宿主引用（`Math.max` 那一族）/ 原生原型方法（`Array.prototype.push` 那一族）都给同一口径，
// 两格是**自有、不可写、不可枚举**，且**闭包自己的那两格不被原型上那一格遮住**（a09 那句哨兵）。
// 本域另有一条**账**：`002-…-differ`（`Function.prototype` 上的受限属性 `arguments` / `caller`）。
{
  // 731-a01 · 四种函数的 `length` / `name` 与形参口径（默认值 / 剩余 / 解构）
  function named(a: number, b: number) { return a + b; }
  console.log(named.length, named.name);
  console.log((() => {}).length, JSON.stringify((() => {}).name));
  console.log((function (a, b = 1) {}).length, (function (a, ...r: any[]) {}).length);
  console.log((function ({ a, b }: any) {}).length, (function (a = 1) {}).length);
  console.log((function* g(a: number) {}).name, (function* g(a: number) {}).length);
  console.log((async function af(a: number, b: number) {}).name, (async function af(a: number, b: number) {}).length);
  console.log((async (a: number) => {}).length, (async () => {}).name === "");
}

{
  // 731-a02 · `Function.prototype` 自己那两格
  const b: any = Function.prototype;
  console.log(typeof b, typeof b.length, b.length, typeof b.name, JSON.stringify(b.name));
  console.log(b.name === "", b.length === 0);
  console.log(Object.keys(Function.prototype).length);
  console.log(b.call.length, b.apply.length, b.bind.length, b.toString.length);
}

{
  // 731-a03 · 内建方法自己那两格（`call` / `apply` / `bind` / `toString` 那一族）
  console.log(Function.prototype.call.name, Function.prototype.apply.name, Function.prototype.bind.name);
  console.log(Object.prototype.toString.name, Object.prototype.hasOwnProperty.name);
  console.log(Math.max.name, JSON.stringify(Math.max.name), Math.random.name);
}

{
  // 731-a04 · `length` 是自有且不可写：赋值静默失败
  function f(a: number) {}
  f.length = 5;
  f.name = "renamed";
  console.log(f.length, f.name);
  const g = (a: number, b: number) => a;
  g.length = 9;
  console.log(g.length);
}

{
  // 731-a05 · `bind` 出来的函数那两格
  function f(a: number, b: number) { return a + b; }
  const b = f.bind(null, 1);
  console.log(b.length, JSON.stringify(b.name));
  console.log(typeof b, b(2));
}

{
  // 731-a06 · `Object.getOwnPropertyDescriptor(f, "length"|"name")`
  function f(a: number, b: number) {}
  const d = Object.getOwnPropertyDescriptor(f, "length") as any;
  console.log(d === undefined ? "undefined" : d.value + "|" + d.writable + "|" + d.enumerable + "|" + d.configurable);
  const n = Object.getOwnPropertyDescriptor(f, "name") as any;
  console.log(n === undefined ? "undefined" : JSON.stringify(n.value) + "|" + n.writable + "|" + n.enumerable);
}

{
  // 731-a07 · 类那两格与 `prototype`（`name` / `length` / 自有名表）
  class C { constructor(a: number, b: number) {} }
  console.log(C.name, C.length, typeof C.prototype);
  const anon = class {};
  console.log(JSON.stringify(anon.name), anon.length);
  console.log(Object.getOwnPropertyNames(C).join(","));
}

{
  // 731-a08 · 对象方法 / 访问器 / 计算键那几档的 `name`
  const o = { m(a: number) {}, get g() { return 1; }, ["c"]() {} };
  console.log(o.m.name, o.g.name, (o as any).c.name);
  const s = Symbol("k");
  const p = { [s](a: number) {} };
  console.log(p[s].name === "k", typeof p[s].name);
}

{
  // 731-a09 · 闭包的 `length` / `name` 与原型上那一格**互不干扰**（第 690 轮那 40 条回归的哨兵）
  function named(a: number, b: number) { return a + b; }
  const arrow = (x: number) => x;
  const meth = { m(a: number, b: number, c: number) { return a; } }.m;
  console.log(named.length, named.name, arrow.length, arrow.name, meth.length, meth.name);
  console.log(Function.prototype.length, JSON.stringify(Function.prototype.name));
}

{
  // 733-a01 · 宿主引用那一族（`Math.max` / `__lookupGetter__`）的两格：`name` 与 `length`
  const show = (v: any) => (v === null ? "null"
    : v === undefined ? "undefined"
    : typeof v + ":" + String(v).split("\n").join("\\n"));
  const t = (f: any) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

  console.log(t(() => (Math as any).max.name) + " " + t(() => (Math as any).max.length));
  console.log(t(() => (Math as any).hypot.name) + " " + t(() => (Math as any).hypot.length));
  console.log(t(() => (Math as any).random.name) + " " + t(() => (Math as any).random.length));
  console.log(t(() => (Math as any).f16round.name) + " " + t(() => (Math as any).f16round.length));
  console.log(t(() => (Object.prototype as any).__lookupGetter__.name)
    + " " + t(() => (Object.prototype as any).__lookupGetter__.length));
  console.log(t(() => Object.prototype.toString.name) + " " + t(() => Object.prototype.toString.length));
  console.log(t(() => (Reflect as any).get.name) + " " + t(() => (Reflect as any).get.length));
  console.log(t(() => (Object as any).keys.name) + " " + t(() => (Object as any).keys.length));
}

{
  // 733-a02 · 带可调用载荷的对象那一档：`Function.prototype` 四格自己的 `name`
  const show = (v: any) => (v === null ? "null"
    : v === undefined ? "undefined"
    : typeof v + ":" + String(v).split("\n").join("\\n"));
  const t = (f: any) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

  console.log(t(() => Function.prototype.call.name) + " " + t(() => Function.prototype.call.length));
  console.log(t(() => Function.prototype.apply.name) + " " + t(() => Function.prototype.apply.length));
  console.log(t(() => Function.prototype.bind.name) + " " + t(() => Function.prototype.bind.length));
  console.log(t(() => Function.prototype.toString.name) + " " + t(() => Function.prototype.toString.length));
}

{
  // 733-a03 · 那两格的标志位：`name` / `length` 不进枚举、也不进 `for..in`
  console.log(Object.keys(Function.prototype).length, Object.keys(Object.prototype).length);
  console.log(Object.getOwnPropertyNames(Function.prototype).indexOf("call") >= 0);
  console.log(Object.keys(Math).length);
  console.log(Object.getOwnPropertyDescriptor(Function.prototype, "call") !== undefined);
}

{
  // 734-a01 · 原型方法那一族的 `name` / `length`：`Array` / `String` / `Number` / `Object` 四家
  const show = (v: any) => (v === null ? "null"
    : v === undefined ? "undefined"
    : typeof v + ":" + String(v).split("\n").join("\\n"));
  const t = (f: any) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

  console.log(t(() => (Array.prototype.push as any).name) + " " + t(() => (Array.prototype.push as any).length));
  console.log(t(() => (Array.prototype.slice as any).name) + " " + t(() => (Array.prototype.slice as any).length));
  console.log(t(() => (Array.prototype.pop as any).name) + " " + t(() => (Array.prototype.pop as any).length));
  console.log(t(() => (Array.prototype.toString as any).name) + " " + t(() => (Array.prototype.toString as any).length));
  console.log(t(() => (String.prototype.toUpperCase as any).name) + " " + t(() => (String.prototype.toUpperCase as any).length));
  console.log(t(() => (String.prototype.toLowerCase as any).name) + " " + t(() => (String.prototype.toLowerCase as any).length));
  console.log(t(() => (String.prototype.slice as any).name) + " " + t(() => (String.prototype.slice as any).length));
  console.log(t(() => (String.prototype.big as any).name) + " " + t(() => (String.prototype.big as any).length));
  console.log(t(() => (String.prototype.anchor as any).name) + " " + t(() => (String.prototype.anchor as any).length));
  console.log(t(() => (String.prototype.trimLeft as any).name));
  console.log(t(() => (Number.prototype.toFixed as any).name) + " " + t(() => (Number.prototype.toFixed as any).length));
  console.log(t(() => (Object.prototype.hasOwnProperty as any).name) + " " + t(() => (Object.prototype.hasOwnProperty as any).length));
  console.log(t(() => (Error.prototype.toString as any).name) + " " + t(() => (Error.prototype.toString as any).length));
  console.log(t(() => (Promise.prototype.then as any).name) + " " + t(() => (Promise.prototype.then as any).length));
}
