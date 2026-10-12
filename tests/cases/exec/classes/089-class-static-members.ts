// xl:title 静态成员：字段、方法、取值器、静态块与继承
// xl:round 788
// xl:judge stdout
// xl:end
// **按判定点并组（第 788 轮）**：吸收原先逐条一问的 28 条用例——
//   · 073-function-class-a-static-this-z-3-return-a-z、082-static-getter-read
//   · 066-class-static-blocks、p-class-static-inherit（静态块的次序与继承，后者只删不搬）
//   · exec/classes/probe-c04、probe-c09、probe2-k01、probe2-k08
//   · probe693-c13、probe693b-k05、k07、k14、k18
//   · probe694-k05、k07、k16、k17、k21
//   · probe695-k04、k11
//   · probe696-k05
//   · probe699-k-e05、e06、e08、e33、e39、t05、t09、t14
//   · probe704-k-c14
// 判据一行一条（`probe(f)` 与原子探针同壳；拼串那几条走 `guard`）⇒ 输出逐行等于原来那些条之和。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const guard = (f) => {
  try {
    console.log(f());
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};
const probe = (f) => guard(() => show(f()));

// 静态字段与静态方法住在类对象自己那一格
probe(() => (class { static x = 1; }).x);
probe(() => { class A { static x = 2; } return A.x; });
probe(() => { class C { static v = 7; } return C.v; });
probe(() => { class A { static m() { return 1; } } return typeof A.m; });
probe(() => { class A { static s() { return 1; } } return A.s(); });
probe(() => { class A { static m() { } } return Object.getOwnPropertyDescriptor(A, "m").enumerable; });
probe(() => { class A { static x = 1; } return Object.keys(A).length; });
// 静态取值器，以及它里面的 `this`
probe(() => { class A { static get s() { return 5; } } return A.s; });
probe(() => (class A { static get x() { return 4; } }).x);
probe(() => { class A { static x = 1; static get y() { return this.x + 1; } } return A.y; });
probe(() => { class A { static set s(v) { A._s = v; } static get s() { return A._s; } } A.s = 2; return A.s; });
// 静态块：`this` 就是类对象，次序按书写
probe(() => { class A { static { this.y = 1; } } return A.y; });
probe(() => { class A { static { A.s = 1; } } return A.s; });
probe(() => (class A { static { A.y = 2; } }).y);
probe(() => { class A { static { this.z = 3; } } return A.z; });
probe(() => { class A { static { A.v = 2; } static { A.w = A.v + 1; } } return A.w; });
probe(() => { class A { static x = 1; static { this.y = this.x + 1; } } return A.y; });
guard(() => { class A { static #count = 0; static bump() { return ++A.#count; } } return show(A.bump()) + "|" + show(A.bump()); });
// 静态成员可继承（字段 / 取值器 / 方法），自有那一格仍然分得清
probe(() => { class A { static s = 1 } class B extends A {} return (B.s); });
probe(() => { class A { static get g() { return 5; } } class B extends A {} return (B.g); });
probe(() => { class A { static get s() { return 1; } } class B extends A { } return B.s; });
probe(() => { class A { static m() { return 1; } } class B extends A { } return B.m(); });
probe(() => { class A { static m() { return "a"; } } class B extends A { static m() { return super.m() + "b"; } } return B.m(); });
probe(() => { class A { static m() { return 1; } } class B extends A { static m() { return super.m() + 1; } } return B.m(); });
probe(() => { class A { static s() { return 7; } } class B extends A { static s() { return super.s() + 1; } } return B.s(); });
probe(() => { class A { static x = 1; } class B extends A { static m() { return super.x; } } return B.m(); });
guard(() => {
  class A { static m() { return 1; } }
  class B extends A {}
  return show(B.m()) + "|" + show(Object.getPrototypeOf(B) === A) + "|" + show(B.hasOwnProperty("m"));
});
// 静态方法里的 `this` 就是类对象自己
probe(() => { class A { static m() { return this === A; } } return A.m(); });
probe(() => { class A { static m() { return this.name; } } return A.m(); });
probe(() => { class A { static name2() { return this.name; } } return A.name2(); });
// 静态计算名上的取值器
probe(() => { class A { static get [Symbol.species]() { return Array; } } return (A[Symbol.species] === Array); });
// 静态块与静态字段的次序在同一个类里一起走（原 066 的正文，逐字）
(() => {
  class C {
    static a = 1;
    static { console.log("block", C.a); C.a = 2; }
    static b = C.a + 1;
  }
  console.log(C.a, C.b);
})();
