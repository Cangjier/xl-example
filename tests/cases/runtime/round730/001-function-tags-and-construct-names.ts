// xl:title 函数对象的标签、构造名与 inspect 写法：生成器 / async / async 生成器三档
// xl:round 730
// xl:judge stdout
// xl:end
// **按判定点并组（第 803 轮）**：吸收同域逐条一问的十条原子探针
// `p730a-a01` … `a08` · `a11` · `a12`，正文逐句搬进各自的块里，打印口径与探针一字不差。
// 判据只有一条：**函数对象按哪一档答话**——三档新函数的 `@@toStringTag`
// （`GeneratorFunction` / `AsyncFunction` / `AsyncGeneratorFunction`）、inspect 写法、
// `constructor.name`、原型与自有名表，以及**没被带偏的那两档**（箭头 / 常规函数答 `Function`、
// 类那两档答自己的名字）。
// 两条**账**另立：`002-…-differ`（`%GeneratorFunction.prototype%` 上 V8 多出来的 `prototype`）
// 与 `003-…-differ`（三格构造对象的载荷借的是 `FunctionCtor`，动态造函数本仓没做）。
{
  // a01 · 三档函数各自的标签、构造名与 inspect 写法
  function* gen() {}
  async function af() {}
  async function* agg() {}
  console.log(gen);
  console.log(af);
  console.log(agg);
  console.log(Object.prototype.toString.call(gen), Object.prototype.toString.call(af), Object.prototype.toString.call(agg));
  console.log(gen.constructor.name, af.constructor.name, agg.constructor.name);
}

{
  // a02 · 匿名那三档的 inspect 拼法（`[X (anonymous)]`）
  console.log(function* () {});
  console.log(async () => {});
  console.log(async function* () {});
  console.log(function* () {}.constructor.name, (async () => {}).constructor.name);
}

{
  // a03 · 生成器对象与生成器函数是两格原型、两个标签
  function* g() { yield 1; }
  const it = g();
  console.log(Object.prototype.toString.call(g), Object.prototype.toString.call(it));
  console.log(Object.getPrototypeOf(it) === Object.getPrototypeOf(g));
  console.log(Object.keys(Object.getPrototypeOf(g)).length, Object.keys(Object.getPrototypeOf(it)).length);
  console.log(Object.getPrototypeOf(Object.getPrototypeOf(g)) === Function.prototype);
}

{
  // a04 · 三格构造对象自己那几格（name / length / typeof / prototype / 标签）
  const gc = (function* () {}).constructor;
  const ac = (async function () {}).constructor;
  console.log(gc.name, gc.length, typeof gc);
  console.log(ac.name, ac.length, typeof ac);
  console.log(gc.prototype === Object.getPrototypeOf(function* () {}));
  console.log(gc.prototype.constructor === gc, typeof gc.prototype.constructor);
}

{
  // a05 · 方法那一档也认（对象字面量 / 类 / async）
  const o = { *m() {} };
  class C { *n() {} async p() {} }
  console.log(o.m.constructor.name, C.prototype.n.constructor.name, C.prototype.p.constructor.name);
  console.log(Object.prototype.toString.call(o.m), Object.prototype.toString.call(C.prototype.p));
}

{
  // a06 · 类那一档没被带偏（`extends` 那两个父类的名字与 toString）
  class Base extends Error {}
  console.log((class extends Array {}).toString());
  console.log(Base.name, (new Base()).constructor.name);
  console.log((class Named { static who() { return this.name; } }).who());
}

{
  // a07 · 箭头与常规函数那一档没被带偏（`@@toStringTag` 问过之后再答 `Function`）
  console.log((() => {}).constructor.name, (function () {}).constructor.name, (async () => {}).constructor.name);
  console.log(Object.prototype.toString.call(() => {}), Object.prototype.toString.call(function () {}));
  console.log(Object.prototype.toString.call(function* () {}), Object.prototype.toString.call(Promise.resolve(1)));
}

{
  // a08 · 标签之外 `call` / `apply` / `bind` 照旧沿链找得到
  function* g() { yield 1; }
  console.log(g.call === Function.prototype.call, g.apply === Function.prototype.apply, typeof g.bind);
  console.log(typeof g.call(null), String(g.call(null)));
  console.log(g.name, g.length);
}

{
  // a11 · 生成器 / async / 箭头各自的**自有名表**
  function* g() {}
  async function a() {}
  console.log(Object.getOwnPropertyNames(g).join(","));
  console.log(Object.getOwnPropertyNames(a).join(","));
  console.log(Object.getOwnPropertyNames((() => {})).join(","));
}

{
  // a12 · `Symbol.toStringTag` 挂在哪一格（原型上、不是自己身上）
  async function af() {}
  console.log(Object.getOwnPropertySymbols(af).length);
  console.log(Object.getOwnPropertySymbols(Object.getPrototypeOf(af)).length);
  console.log(Object.prototype.toString.call(af));
}
