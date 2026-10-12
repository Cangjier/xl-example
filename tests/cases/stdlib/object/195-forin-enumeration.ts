// xl:title `for...in`：自有与继承来的可枚举格，以及它的键序
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的十条**：
//   probe2-d10 · probe697-f12 · probe697-f13 · probe697-f14 · probe697-f15 · probe697-q13 ·
//   probe698-f06 · p-obj-forin-inherited
//   ＋ `141-forin-order`（同一件事的成稿那一份）
//
// 判定点只有一个：**`for...in` 的键集与键序**——
//  ① 走**整条原型链**上的可枚举字符串键（自有 + 继承）；
//  ② 不可枚举的格**不出现**（与 `keys` 同一口径）；
//  ③ 同一条链上重复的名字只出现一次（近的那一格赢）；
//  ④ 次序是 `OrdinaryOwnPropertyKeys` 那一套（整数键在前升序，其余插入序）逐层接起来。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const keys = (o: any): string => { const out: any[] = []; for (const k in o) out.push(k); return out.join(","); };

try {
  console.log(show(keys({ a: 1, b: 2 })));
  console.log(show(keys({ 2: 1, 1: 2, a: 3 })));
  const partial: any = { a: 1 };
  Object.defineProperty(partial, "b", { value: 2, enumerable: false });
  console.log(show(keys(partial)));
  function A() {}
  A.prototype.x = 1;
  console.log(show(keys(new (A as any)())));
  const acc: any = {};
  Object.defineProperty(acc, "a", { get() { return 1; }, enumerable: true });
  console.log(show(keys(acc)));
  const shadow: any = { x: 1 };
  const child: any = Object.create(shadow);
  child.x = 2;
  console.log(show(keys(child)));
  const nested: any = {};
  for (const k in { a: 1, b: 2 }) nested[k] = 1;
  console.log(show(Object.keys(nested).join(",")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
