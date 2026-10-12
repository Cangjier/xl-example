// xl:title 类成员那一格：访问器 / 静态 / 计算键 / 继承与 super
// xl:round 789
// xl:judge stdout
// xl:end
// **按判定点并组（第 789 轮）**：吸收 exec/round706 里逐条一问的 8 条探针
// （p706a-c01 · p706a-c02 · p706a-c03 · p706a-c04 · p706a-c05 · p706a-c06 · p706a-c07 · p706a-c08）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 原型上的访问器与不可枚举、静态成员的位置、类名与 constructor、super 的取值、计算键成员、实例字段

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 p706a-c01.ts（第 706 轮）
(() => {
  class A { get x() { return 1; } }
  console.log(show(Object.keys(new A()).length) + "," + show(Object.getOwnPropertyNames(A.prototype).join("|")));
})();

// 吸收 p706a-c02.ts（第 706 轮）
(() => {
  class A { get x() { return 1; } set x(v) { this.y = v; } }
  const a = new A(); a.x = 5;
  console.log(show(a.x) + "," + show(a.y) + "," + show(Object.keys(a).join("|")));
})();

// 吸收 p706a-c03.ts（第 706 轮）
(() => {
  class A { m() {} }
  console.log(show(Object.getOwnPropertyDescriptor(A.prototype, "m").enumerable) + "," + show(Object.keys(A.prototype).length));
})();

// 吸收 p706a-c04.ts（第 706 轮）
(() => {
  class A { static s() { return 1; } }
  console.log(show(typeof A.s) + "," + show(Object.getOwnPropertyNames(A).includes("s")) + "," + show(A.prototype.s));
})();

// 吸收 p706a-c05.ts（第 706 轮）
(() => {
  class Foo {}
  console.log(show(Foo.name) + "," + show(Foo.prototype.constructor === Foo));
})();

// 吸收 p706a-c06.ts（第 706 轮）
(() => {
  class A { get v() { return 1; } m() { return "A"; } }
  class B extends A { get v() { return super.v + 1; } m() { return super.m() + "B"; } }
  const b = new B();
  console.log(show(b.v) + "," + show(b.m()));
})();

// 吸收 p706a-c07.ts（第 706 轮）
(() => {
  class A { static ["a" + "b"]() { return 1; } }
  console.log(show(typeof A.ab) + "," + show(A.ab()));
})();

// 吸收 p706a-c08.ts（第 706 轮）
(() => {
  class A { x = 1; m() { return this.x; } }
  console.log(show(new A().m()) + "," + show(Object.keys(new A()).join("|")));
})();
