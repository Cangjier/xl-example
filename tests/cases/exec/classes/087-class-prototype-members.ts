// xl:title 原型上的成员：`constructor` 那一格、成员描述符、方法名与形参个数
// xl:round 788
// xl:judge stdout
// xl:end
// **按判定点并组（第 788 轮）**：吸收原先逐条一问的 22 条用例——
//   · 074-function-class-a-return-a-prototype-constructor-a、076-…-constructor-name、080-class-getter-on-prototype
//   · exec/classes/probe693b-k02、k26、k33、k34
//   · probe694-k19、k20
//   · probe695-k06、k09、k10
//   · probe699-k-e22、e23、e24、e25、e28、e29、t06、t10
//   · probe704-k-c11、c20
// 判据一行一条（`probe(f)` 与原子探针同壳）⇒ 输出逐行等于原来那些条之和。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const guard = (f) => {
  try {
    console.log(f());
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};
const probe = (f) => guard(() => show(f()));

// 原型上那一格 `constructor` 指回类自己
probe(() => { class A { } return A.prototype.constructor === A; });
probe(() => { class A { } return A.prototype.constructor.name; });
probe(() => { class A { } return new A().constructor === A; });
probe(() => { class A { } return typeof Object.getOwnPropertyDescriptor(A.prototype, "constructor").value; });
// 方法住在原型上、取下来还是函数
probe(() => { class A { m() { return 1; } } const m = new A().m; return typeof m; });
probe(() => { class A { m() { } } return typeof A.prototype.m; });
probe(() => (class A { m() { return this; } }).prototype.m === undefined);
// 原型上的名表与枚举
probe(() => { class A { m() { return 1; } } return Object.getOwnPropertyNames(A.prototype).sort().join(","); });
probe(() => { class A { m() { return 1; } } return new A().m() + Object.getOwnPropertyNames(A.prototype).length; });
probe(() => { class A { m() {} } return Object.keys(A.prototype).length; });
probe(() => (class { get x() { return 1; } }).prototype.x);
probe(() => (class A { m() {} }).prototype.m.name);
// 成员描述符：不可枚举、可写、可配置、值是一个函数
probe(() => { class A { m() { } } return Object.getOwnPropertyDescriptor(A.prototype, "m").enumerable; });
probe(() => { class A { m() { } } return typeof Object.getOwnPropertyDescriptor(A.prototype, "m").value; });
guard(() => {
  class A { m() { return 1; } }
  const a = new A();
  const d = Object.getOwnPropertyDescriptor(A.prototype, "m");
  return show(d.enumerable) + "|" + show(d.writable) + "|" + show(d.configurable) + "|" + show(a.m());
});
// 方法自己的 length 看形参表
probe(() => { class A { m() {} } return A.prototype.m.length; });
probe(() => { class A { m(a, b) {} } return A.prototype.m.length; });
// 直接装在原型上的访问器（`defineProperty`）照常读得到
probe(() => { class A { } Object.defineProperty(A.prototype, "v", { get() { return 7; }, enumerable: false }); return new A().v; });
guard(() => {
  class A { }
  Object.defineProperty(A.prototype, "g", { get() { return 42; }, configurable: true });
  return show(new A().g) + "|" + show(Object.getOwnPropertyDescriptor(A.prototype, "g").enumerable);
});
// 类的原型链按字面走
probe(() => { class A { } return Object.getPrototypeOf(A.prototype) === Object.prototype; });
// 实例上取到的方法就是原型上那一个
probe(() => { class A { m() {} } return (new A().m === A.prototype.m); });
