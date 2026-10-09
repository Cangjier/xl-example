// xl:title `Number` 包装对象：`new` 与函数调用、`valueOf` 与两条 `-0` 的路
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的十二条**：
//   probe-n15 · probe2-p13 · probe695-n20（无关那一半）· probe693-n34 · probe693-n36
//   ＋ `013-number-valueof-and-conversion` / `015-number-constants-and-valueof`
//     / `025-number-wrapper-and-negative-zero` / `035-number-wrapper-object`
//     / `046-number-valueof-and-wrapper` / `006-number-toprecision-valueof`
//
// 判定点只有一个：**包装对象与原始值是两件事**——
//  ① `new Number(5)` 是 `object`（`typeof`），`Number(5)` 是 `number`；
//  ② `valueOf()` 交出原始值；`==` 会**拆箱**（`new Number(5) == 5` 真）、`===` 不会；
//  ③ `-0` 的两条路：`Object.is(-0, 0)` 假，但 `1 / -0` 给 `-Infinity`、
//     而 `Number("-0")` 与 `-0` 字面量都是 `-0`。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show(typeof new Number(5)));
  console.log(show(typeof Number(5)));
  console.log(show((5).valueOf()));
  console.log(show((new Number(5) as any).valueOf()));
  console.log(show((new Number(5) as any) == 5));
  console.log(show((new Number(5) as any) === 5));
  console.log(show(Object.is(-0, 0)));
  console.log(show(1 / -0));
  console.log(show(Object.is(Number("-0"), -0)));
  console.log(show(Object.is(-0, -0)));
  console.log(show(Number("1e3")));
  console.log(show(1234.5.toLocaleString === undefined));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
