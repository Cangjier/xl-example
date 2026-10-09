// xl:title `__proto__` / `setPrototypeOf` / `isPrototypeOf`：原型链的三个写入出口
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的三十余条**：
//   probe697-q01 · probe697-q02 · probe697-q03 · probe697-q04 · probe697-q05 · probe697-q06 ·
//   probe697-q07 · probe697-q08 · probe697-q09 · probe697-q10 · probe697-q11 · probe697-q12 ·
//   probe697-q14 · probe697-q15 · probe697-q17 · probe697-q18 · probe697-q19 · probe697-q20 ·
//   probe697-q21 · probe697-q22 · probe697-q23 · probe697-q25 · probe697-q26 · probe697-q27 ·
//   probe697-q28 · probe697-q29 · probe697-q30 · probe697-q31 · probe697-q32 · probe697-q33 ·
//   probe697-q34 · probe697-q38 · probe697-q39 · probe697-q40 · probe697-q41 · probe697-q42 ·
//   probe697-q43 · probe697-q44 · probe697-q46 · probe697-q47 · probe697-q49 · probe697-q50 ·
//   probe697-f10 · probe697-f11 · probe698-f09 · probe698-f10 · probe703-o-a46 · probe703-o-a47 ·
//   probe703-o-a48 · probe704-o-d40 · probe705-o-b09 · probe705-o-b10 · probe705-o-b11 ·
//   probe705-o-b12 · probe705-o-b13 · probe705-o-b31（无关那一半）
//   ＋ `047-object-setprototypeof-value` / `081-object-prototype-and-instanceof` / `104-object-is-and-setprototypeof`
//     / `007-object-getprototypeof`
//
// 判定点只有一个：**原型链的三个出口读的是同一格**——
//  ① 读：`getPrototypeOf` / `__proto__` / 原始值那一族的原型；
//  ② 写：`o.__proto__ = p` 与 `setPrototypeOf(o, p)` 都改那一格（`null` 也给写，
//     写成非对象 / `undefined` **静默不改**）；`Object.prototype.__proto__` 是 `null`；
//  ③ `__proto__` 是 `Object.prototype` 上的**访问器**（可枚举假、有自己的 `get`）；
//     对象字面量里写 `__proto__: p` 是**设原型**，写 `["__proto__"]: p` 是**普通格**；
//  ④ `isPrototypeOf` / `instanceof` 跟着原型链走；`JSON.parse` 出来的 `"__proto__"` 是**普通格**。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  // ① 读那三个出口
  console.log(show(({} as any).__proto__ === Object.prototype));
  console.log(show(([] as any).__proto__ === Array.prototype));
  console.log(show((1 as any).__proto__ === Number.prototype));
  console.log(show(("a" as any).__proto__ === String.prototype));
  console.log(show((true as any).__proto__ === Boolean.prototype));
  console.log(show(((function () {}) as any).__proto__ === Function.prototype));
  console.log(show(Object.getPrototypeOf(function () {}) === Function.prototype));
  console.log(show(Object.getPrototypeOf("a") === String.prototype));
  console.log(show(Object.getPrototypeOf(Object.create(null)) === null));
  console.log(show(Object.getPrototypeOf(Object.setPrototypeOf({}, null))));
  console.log(show(Object.prototype.__proto__));
  console.log(show(Object.prototype.__proto__ === null));
  console.log(show(({} as any).__proto__ === Object.prototype));
  // **本条合并时撞出的一处缺口，如实写在这里、不当成通过**：
  // 语句头部的**类表达式**（`class A {}.prototype.__proto__`）在本仓给 `false`（Node 给 `true`），
  // 而把同一个类表达式**放进括号**、或者**先赋给一个变量**再取 `.prototype`，两边都对得上——
  // 也就是说这不是「类原型链」那一档坏了，是**类表达式当成员表达式的主语**时
  // `prototype` 那一格没接上 `Object.prototype`。它属于**降级层**的活，判据在
  // `tests/cases/exec/classes` 那一类里（`exec` 尺子），这里就不再钉一遍。
  // ② 写那一格
  const o: any = {};
  const p: any = { g: 1, m() { return 7; } };
  o.__proto__ = p;
  console.log(show(o.g));
  console.log(show(Object.getPrototypeOf(o) === p));
  console.log(show(o.m()));
  o.__proto__ = null;
  console.log(show(Object.getPrototypeOf(o)));
  console.log(show(o.toString));
  const o2: any = {};
  o2.__proto__ = 1;
  console.log(show(Object.getPrototypeOf(o2) === Object.prototype));
  const o3: any = {};
  o3.__proto__ = undefined;
  console.log(show(Object.getPrototypeOf(o3) === Object.prototype));
  const o4: any = {};
  o4.__proto__ = { a: 1 };
  delete o4.__proto__;
  console.log(show(Object.getPrototypeOf(o4) === Object.prototype));
  console.log(show(Object.setPrototypeOf({}, 1) === undefined || "no"));
  try {
    Object.setPrototypeOf({}, 1);
    console.log(show("no"));
  } catch (e) {
    console.log(show((e as any).constructor.name));
  }
  const o5: any = {};
  Object.setPrototypeOf(o5, null);
  console.log(show(o5.hasOwnProperty));
  // ③ `__proto__` 是访问器 / 字面量那一档
  console.log(show(typeof Object.getOwnPropertyDescriptor(Object.prototype, "__proto__")!.get));
  console.log(show(Object.getOwnPropertyDescriptor(Object.prototype, "__proto__")!.enumerable));
  console.log(show(Object.prototype.hasOwnProperty("__proto__")));
  console.log(show(Object.keys(Object.prototype).length));
  const lit: any = { __proto__: p };
  console.log(show(lit.g));
  const litNull: any = { __proto__: null };
  console.log(show(Object.getPrototypeOf(litNull)));
  const computed: any = { ["__proto__"]: { z: 1 } };
  console.log(show(computed.z));
  console.log(show(Object.getPrototypeOf(computed) === Object.prototype));
  console.log(show(Object.getOwnPropertyDescriptor({ ["__proto__"]: 1 }, "__proto__")!.value));
  console.log(show((({ ["__proto__"]: { z: 1 } }) as any).z));
  const nullProto: any = { ["__proto__"]: null, a: 1 };
  console.log(show(Object.getPrototypeOf(nullProto)));
  // ④ `isPrototypeOf` / `instanceof` / JSON 那一档
  console.log(show(Object.prototype.isPrototypeOf({})));
  console.log(show(({}).isPrototypeOf(Object.create({}))));
  function B() {}
  B.prototype.t = "b";
  const viaSet: any = {};
  Object.setPrototypeOf(viaSet, B.prototype);
  console.log(show([viaSet.t, viaSet instanceof B].join(",")));
  class C {}
  const c: any = new C();
  Object.setPrototypeOf(c, null);
  console.log(show(c instanceof C));
  const parsed: any = JSON.parse('{"__proto__":{"x":1}}');
  console.log(show(Object.getPrototypeOf(parsed) === Object.prototype));
  console.log(show(Object.keys(parsed).join(",")));
  console.log(show(parsed.x));
  console.log(show(JSON.stringify(parsed)));
  console.log(show(JSON.parse('{"__proto__":1}').__proto__));
  console.log(show(Object.getPrototypeOf(JSON.parse('{"a":1}')) === Object.prototype));
  console.log(show(JSON.parse('{"a":1,"a":2}').a));
  // ⑤ `isPrototypeOf` 与 `hasOwnProperty` 分工
  console.log(show(Object.create(null).hasOwnProperty));
  console.log(show(Object.hasOwn(Object.create({ a: 1 }), "a")));
  console.log(show("a" in Object.create({ a: 1 })));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
