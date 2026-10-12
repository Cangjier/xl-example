// xl:title `Object.getOwnPropertyNames` / `Object.keys` / `Object.values` / `Object.entries`
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的二十余条**：
//   probe-j11 · probe-j17 · probe-j18 · probe-j19 · probe694-o24 · probe694-o25 ·
//   probe695-o02 · probe695-o03 · probe695-o16 · probe703-o-a08 · probe703-o-a49 ·
//   probe704-o-d08 · probe704-o-d09 · probe704-o-d10 · probe704-o-d14 · probe704-o-d15 ·
//   probe694-o22 · probe694-o23 · probe705-o-b26 · probe705-o-b27
//   ＋ `012-object-getownpropertynames` / `152-object-getownpropertynames-order`
//
// 判定点只有一个：**四支名表的取值范围**（次序那一件事另有 `183`）——
//  ① `getOwnPropertyNames` 带上**不可枚举**的格，`keys` / `values` / `entries` 不带；
//  ② 三支（`keys` / `values` / `entries`）各自把同一批格子取成名字 / 值 / 键值对；
//  ③ 原始值目标（数字 / 字符串 / 布尔）先 `ToObject`，字符串的下标格算自有；
//  ④ 继承来的格一个都不进这四支（`Object.create({a:1})` 给空表）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  // ① 不可枚举那一格的分界
  const hidden: any = {};
  Object.defineProperty(hidden, "b", { value: 2, enumerable: false });
  hidden.a = 1;
  console.log(show(Object.getOwnPropertyNames(hidden).join(",")));
  console.log(show(Object.keys(hidden).join(",")));
  // ② 三支的取值形态
  console.log(show(Object.entries({ a: 1 })[0]!.join(":")));
  console.log(show(Object.entries({ x: 1, y: 2 }).map((e) => e.join(":")).join(",")));
  console.log(show(Object.values({ a: 1, b: 2 }).join(",")));
  console.log(show(Object.entries({ a: 1 }).length));
  console.log(show(Object.keys({ a: 1, b: 2 }).length));
  // ③ 原始值目标
  console.log(show(Object.values("ab").length));
  console.log(show(Object.getOwnPropertyNames(1).length));
  console.log(show(Object.keys(1).length));
  console.log(show("abc".hasOwnProperty("length")));
  console.log(show("abc".hasOwnProperty(0)));
  console.log(show((5).hasOwnProperty("toFixed")));
  // ④ 继承来的格不进名表
  console.log(show(Object.entries(Object.create({ a: 1 })).length));
  console.log(show(Object.keys(Object.create({ a: 1 })).join(",")));
  console.log(show(Object.getOwnPropertyNames(Object.create({ a: 1 })).join(",")));
  console.log(show(({}).hasOwnProperty("a")));
  console.log(show(Object.prototype.hasOwnProperty.call({ a: 1 }, "a")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
