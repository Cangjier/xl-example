// xl:title 访问器的读与写：`get` / `set` 落在哪一格、写回与继承
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的二十余条**：
//   probe2-d08 · probe2-d16 · probe697-q36 · probe697-q38 · probe697-q39 · probe697-q40 ·
//   probe698-f08 · probe698-f11 · probe698-f12 · probe695-o05（读写那一半）
//   ＋ `096-object-literal-accessors` / `098-getter-on-prototype` / `010-object-valueof`
//     / `029-object-valueof-override`（同一族的成稿）
//
// 判定点只有一个：**`[[Get]]` / `[[Set]]` 沿原型链找访问器、写回落在接收者自己身上**——
//  ① 原型上的 `get` 被读到，`this` 是**接收者**（`c.tag` 是子对象那一格）；
//  ② 原型上的 `set` 被写到时同样以接收者为 `this`（于是 `_z` 落在子对象上）；
//  ③ 只有 `get` 没有 `set` 时，赋值**静默失败**（松散模式，不建自有格）；
//  ④ 对象字面量里的 `get` / `set` 与 `defineProperty` 装出来的是同一档；
//  ⑤ 类体的 `get` / `set` 在 `prototype` 上（是不可枚举的访问器）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  // ① 原型上的 getter 读到的是接收者
  const proto: any = {};
  Object.defineProperty(proto, "x", { get() { return this.tag; } });
  const child: any = Object.create(proto);
  child.tag = "t";
  console.log(show(child.x));
  const lit: any = { get x() { return 5; } };
  const viaProto: any = { __proto__: lit };
  console.log(show(viaProto.x));
  // ② 原型上的 setter：写回落在接收者
  const p2: any = {};
  Object.defineProperty(p2, "z", { set(v: any) { this._z = v; }, configurable: true });
  const c2: any = Object.create(p2);
  c2.z = 9;
  console.log(show(c2._z));
  console.log(show(c2.hasOwnProperty("_z")));
  const p3: any = { set s(v: any) { this._s = v; } };
  const c3: any = Object.create(p3);
  c3.s = 1;
  c3.s = 2;
  console.log(show(c3._s));
  // ③ 只有 getter：写静默失败
  const getOnly: any = { get v() { return 5; } };
  const reader: any = Object.create(getOnly);
  reader.v = 3;
  console.log(show([reader.v, reader.hasOwnProperty("v")].join(",")));
  // ④ 字面量与 defineProperty 同一档
  const both: any = { get a() { return this.b; }, b: 5 };
  console.log(show(both.a));
  const setter: any = { set a(v: any) { this._a = v; } };
  setter.a = 4;
  console.log(show(setter._a));
  const m: any = { m() { return this.v; }, v: 3 };
  console.log(show(m.m()));
  const arrow: any = () => ({ a: 1 });
  console.log(show(arrow().a));
  // ⑤ 类体那一档
  class A { get v() { return 1; } }
  console.log(show(Object.keys(A.prototype).length));
  console.log(show(typeof Object.getOwnPropertyDescriptor(A.prototype, "v")!.get));
  class B { set v(x: number) { (this as any)._v = x; } }
  const b: any = new B();
  b.v = 3;
  console.log(show(b._v));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
