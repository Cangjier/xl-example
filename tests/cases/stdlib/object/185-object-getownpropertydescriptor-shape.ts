// xl:title `Object.getOwnPropertyDescriptor`：数据四格 / 访问器两格 / 缺失那一档
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的三十余条**（同一件事被逐批重抄的结果）：
//   probe2-d05 · probe2-d23 · probe2-d24 · probe2-d25 · probe693-o15 · probe693-o16 ·
//   probe693-o17 · probe693-o47 · probe694-o21 · probe694-o20 · probe695-o05 ·
//   probe695-o06 · probe695-o07 · probe695-o08 · probe695-o09 · probe703-o-a01 ·
//   probe703-o-a02 · probe703-o-a03 · probe703-o-a04 · probe703-o-a05 · probe703-o-a06 ·
//   probe703-o-a35 · probe703-o-a50 · probe704-o-d03 · probe704-o-d16 ·
//   probe704-o-d35 · probe704-o-d36 · probe705-o-b01 · probe705-o-b02 · probe705-o-b03 ·
//   probe705-o-b04 · probe705-o-b05 · probe705-o-b06 · probe705-o-b07 · probe705-o-b08 ·
//   probe-j24
//   ＋ `115-l677p-obj-descriptor-shape`（同一件事的点名那一份）
//
// 判定点只有一个：**描述符对象的形状与每一格的值**——
//  ① 数据属性给 `value` / `writable` / `enumerable` / `configurable` 四格；
//  ② 访问器属性给 `get` / `set`（外加 `enumerable` / `configurable`），**没有** `value` / `writable`；
//  ③ 缺这一格时给 `undefined`（不是抛）；
//  ④ 三套不同的默认标志：普通对象（全真）、数组元素（全真且 `configurable` 真）、
//     数组 / 字符串的 `length`（不可枚举、不可配置）、`Math.PI`（不可写）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const d = (o: any, k: any) => Object.getOwnPropertyDescriptor(o, k) as any;

try {
  // ① 数据属性四格
  console.log(show([d({ a: 1 }, "a").writable, d({ a: 1 }, "a").enumerable, d({ a: 1 }, "a").configurable].join(",")));
  console.log(show(d({ a: 1 }, "a").value));
  console.log(show(d({ a: 1 }, "a").enumerable));
  console.log(show(d({ a: 1 }, "a").configurable));
  console.log(show(d({ a: 1 }, "a").get === undefined));
  // ② 访问器两格
  console.log(show(d({ get a() { return 1; } }, "a").get !== undefined));
  console.log(show(typeof d({ get a() { return 1; } }, "a").get));
  console.log(show([typeof d({ get a() { return 1; } }, "a").get, d({ get a() { return 1; } }, "a").set === undefined, d({ get a() { return 1; } }, "a").enumerable].join(",")));
  console.log(show(d({ get a() { return 1; } }, "a").get()));
  // ③ 缺失那一格
  console.log(show(d({ a: 1 }, "b") === undefined));
  console.log(show(d({ a: 1 }, "b")));
  // ④ 三套默认标志
  console.log(show(d([1], 0).value));
  console.log(show(d([1], "0").value));
  console.log(show(d([1, 2], "0").configurable));
  console.log(show(d([1, 2], "1").enumerable));
  console.log(show(d([1], "length").value));
  console.log(show(d([1, 2], "length").enumerable));
  console.log(show(d("ab", 0).value));
  console.log(show(d("ab", "0").writable));
  console.log(show(d("ab", "length").value));
  console.log(show(d(Math, "PI").writable));
  console.log(show(d(function f(a: number) { return a; }, "length").value));
  console.log(show(d(function f() {}, "name").value));
  console.log(show(d(Object.prototype, "toString").enumerable));
  console.log(show(d(Object.freeze({ a: 1 }), "a").writable));
  // 复数那一支：一次拿全表（三格与 `value` 对得上）
  console.log(show((Object.getOwnPropertyDescriptors({ a: 1 }) as any).a.value));
  console.log(show(Object.getOwnPropertyDescriptors({ a: 1 }).a.writable));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
