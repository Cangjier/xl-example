// xl:title `Object.getOwnPropertyNames` 的自有 / 继承之分：访问器写回落在哪一格
// xl:round 697
// xl:judge stdout
// xl:end
// 合并原先**同一个判定点**的两条原子探针：
//   probe697-q35（原型上是 setter，`o.v = 3` 之后）· probe697-q37（类里的 setter，`a.v = 3` 之后）
// 判定点只有一个：**setter 是写在原型上的，而它写回的那一格（`_v`）落在接收者自己身上**
// ⇒ 自有名表里出现的是 `_v`，**不是 `v`**。这一条与 `Object.getOwnPropertyNames({a:1})`
// 不是同一个判定点（那是"普通自有格"），所以单独立一条。
// 打印壳与原来那两条一致。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  // 一：原型上一个对象字面量的 setter
  const p: any = { set v(x: any) { this._v = x; } };
  const o: any = Object.create(p);
  o.v = 3;
  console.log(show([o._v, Object.getOwnPropertyNames(o).join(",")].join("|")));
  // 二：类里的 setter（原型是 class 的 prototype）
  class A { set v(x: any) { (this as any)._v = x; } }
  const a: any = new A();
  a.v = 3;
  console.log(show(Object.getOwnPropertyNames(a).join(",")));
  // 对照：原型上那一格**不在**自有名表里（`v` 从头到尾没上过接收者）
  console.log(show(Object.getOwnPropertyNames(a).includes("v")));
  console.log(show(Object.getOwnPropertyNames(Object.getPrototypeOf(a)).includes("v")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
