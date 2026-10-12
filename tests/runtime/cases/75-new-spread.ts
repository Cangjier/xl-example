// 第 197 轮：**`new C(...xs)`**（带展开的构造）。
//
// 普查里 `new-spread` 那一条：`class P { constructor(x) { this.x = x; } }
// console.log(new P(...[5]).x)` 报 `unimplemented: spreading into new`
// ——**整份文件进不来**。
//
// 根因：引擎的 `Op.New` 只认「从某格开始的**连续**若干格」，
// 而带展开的实参个数**只有运行期才知道**——铺不出那张连续的表。
// `f(...xs)` 那条早就解决了同一件事：先把实参收成一个数组（`BuildArgsArray`），
// 再走 `CallArray` 那条「按数组铺参数」的算子。构造这边缺的是**同一个落点**。
//
// 修法：**引擎一行都不用改**。降级层把「构造函数 + 实参数组」交给语言内建调用
// `NewApplyId`（与 `SpreadIntoId` 同一个号段、同一个理由：那边要 `protos` 造实例），
// 那一侧按 JS 的 `[[Construct]]` 造实例：读 `prototype` → 拿它当原型造对象 →
// 用新对象当 `this` 调构造函数 → 构造函数返回对象就用它。
//
// **顺带一处水位 bug**（实测抓到的）：新分支是**早返回**，而原路末尾有一句
// `Release(ctor)`——漏掉它水位高一格，后面所有变量的槽整体错位，
// 症状离现场很远（5 条 check 红、4 份 CLI 不一致）。

class P {
  a: number;
  b: number;
  constructor(a: number, b: number) { this.a = a; this.b = b; }
  sum() { return this.a + this.b; }
}

// ① 基本形状：实参整个来自一个数组
const xs = [1, 2];
const p = new P(...xs);
console.log(p.a, p.b, p.sum(), p instanceof P);

// ② 混着写：展开夹在定长实参中间（铺出来的表长度运行期才知道）
console.log(new P(1, ...[9], 4).sum(), new P(...[5], 6).sum());

// ③ 多个展开连用
const head = [7];
const tail = [8];
console.log(new P(...head, ...tail).sum());

// ④ 派生类：`new Q(...xs)` 里 Q 的构造函数再 `super(...)`
class Q extends P {
  constructor(a: number, b: number) { super(a, b); }
  double() { return this.sum() * 2; }
}
const q = new Q(...xs);
console.log(q.sum(), q.double(), q instanceof Q, q instanceof P);

// ⑤ 展开的实参不够 / 多了：JS 照旧（缺的是 undefined，多的丢掉）
console.log(new P(...[3]).b === undefined, new P(...[1, 2, 3, 4]).b);

// ⑥ 宿主构造函数走同一条路（`Map` 是带可调用载荷的对象，自己造实例并返回）
console.log(new Map([["a", 1], ["b", 2]]).size);
const pairs: Array<[string, number]> = [["k", 9]];
console.log((new Map(pairs) as any).get("k"));
console.log([...new Set(...[[1, 2, 3]])].join(","));

// ⑦ 构造函数**返回对象**时用它（JS 的 `[[Construct]]` 那一支）
class Boxed {
  constructor() { return { tag: "boxed" }; }
}
console.log((new Boxed() as any).tag);

// ⑧ 回归：不带展开的 `new` 一个字都不许变
const plain = new P(10, 20);
console.log(plain.sum(), plain instanceof P, new P(1, 2).sum());
