// xl:title 数组上挂访问器 / 往 `Array.prototype` 加格：两条越界登记
// xl:round 692
// xl:judge stdout
// xl:want differ
// xl:why 并进来的 `150-array-species-subclass` 那一档是**真差异**（第 813 轮并组时现形）：
//       `class MyArr extends Array {}` 上 `a.map(…)` 交出来的对象，
//       node 给 `b instanceof MyArr === true`（走 `Symbol.species` 那一支：子类构造出子类实例），
//       本仓给 `false`（交回普通数组）——`b instanceof Array` / `length` / 元素三格两边相同，
//       所以那一行只差第一个字段。这一族的其余各块（下标访问器 / 原型加格 / concat
//       spreadable / forEach 的 thisArg / ToNumber 实参）两边逐字节相同。
// xl:end
// **合并了原先同一处判据的十条**：
//   probe702-a-e01（ToNumber 那一半）· probe-a25（`Math.max(…arr)`，无关那一半另计）
//   ＋ `143-getter-array-index` / `144-define-on-array-index` / `142-array-proto-mutation`
//     / `149-concat-spreadable` / `150-array-species-subclass` / `154-foreach-this-arg`
//
// 判定点只有两个（都是**边界**，合起来才看得出「数组的格与真数组的关系」）：
//  ① 数组下标上挂访问器 / 数据属性改写：`defineProperty` 能把它变成访问器，
//     但 `length` 那一格的联动规则照旧；
//  ② 往 `Array.prototype` 上加一格，**所有数组**都看得见（这是 `fill` 之类
//     「先往原型上加、再用完删掉」那一路的根据）。
// 本条的**收尾会把加的那一格删掉**（越界的写法要当场改回去，见 README 第 3 节）。
//   `142-array-proto-mutation` · `143-getter-array-index` · `144-define-on-array-index` · `149-concat-spreadable` · `150-array-species-subclass` · `154-foreach-this-arg`
//   正文逐字接在下面（每块一个 IIFE、块首写明出处）；并组完整性由一把一次性尺子核对：
//   合并后的 `node` / `tsrun` stdout 与「本文件改前那一份 ＋ 各来源 stdout 的顺次相接」逐字节相同。
// **第 813 轮（合并，下盘）**：下面这些同判定点的来源**这一轮真的从盘上删掉了**
//   （它们早就被上面那张清单点过名，文件却一直留在盘上——同判定点重复、分母被灌水）：
//   `142-array-proto-mutation` · `143-getter-array-index` · `144-define-on-array-index` · `149-concat-spreadable` · `150-array-species-subclass` · `154-foreach-this-arg`
//   正文逐字接在下面（每块一个 IIFE、块首写明出处）；并组完整性由一把一次性尺子核对：
//   合并后的 `node` / `tsrun` stdout 与「本文件改前那一份 ＋ 各来源 stdout 的顺次相接」逐字节相同。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  // ① 下标上的访问器
  const a: any = [1, 2, 3];
  let got = 0;
  Object.defineProperty(a, "0", { get() { got++; return 9; }, configurable: true });
  console.log(show(a[0] + ":" + got));
  console.log(show(a.join(",")));
  const b: any = [1, 2, 3];
  Object.defineProperty(b, "0", { value: 7, enumerable: true, writable: true, configurable: true });
  console.log(show(b.join(",") + ":" + b.length));
  // ② 往 Array.prototype 上加一格（**当场改回去**）
  console.log(show(([1, 2] as any).zzProbeGone));
  (Array.prototype as any).zzProbeGone = "yes";
  console.log(show(([1, 2] as any).zzProbeGone));
  console.log(show(Object.hasOwn([1, 2] as any, "zzProbeGone")));
  delete (Array.prototype as any).zzProbeGone;
  console.log(show(([1, 2] as any).zzProbeGone));
  // ③ 实参过 ToNumber 那一档（与本条同源的一处边界）
  console.log(show([1, 2, 3].slice("1" as any).join(",")));
  console.log(show([1, 2, 3].fill(0, { valueOf: () => 1 } as any, { valueOf: () => 2 } as any).join(",")));
  console.log(show([1, 2, 3].indexOf(2, { valueOf: () => 1 } as any)));
  console.log(show([1, 2, 3].at({ valueOf: () => 1 } as any)));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
//  ---- 并自 142-array-proto-mutation.ts ----
(function () {
(Array.prototype as any).last = function () { return this[this.length - 1]; };
console.log([1, 2, 3].last());
console.log(JSON.stringify(Object.keys([1])));
delete (Array.prototype as any).last;
console.log(typeof ([1] as any).last);
})();
//  ---- 并自 143-getter-array-index.ts ----
(function () {
const a: any = [1, 2, 3];
Object.defineProperty(a, "1", { get() { return 99; }, enumerable: true });
console.log(a[1], a.join(","), JSON.stringify(a), a.length);
})();
//  ---- 并自 144-define-on-array-index.ts ----
(function () {
const a: any = [1, 2, 3];
Object.defineProperty(a, "1", { value: 9 });
console.log(a[1], a.length, JSON.stringify(a), Object.keys(a).join(","));
Object.defineProperty(a, "1", { enumerable: false });
console.log(Object.keys(a).join(","), a[1], JSON.stringify(a));
})();
//  ---- 并自 149-concat-spreadable.ts ----
(function () {
const a: any = [1];
const obj: any = { 0: "x", 1: "y", length: 2, [Symbol.isConcatSpreadable]: true };
console.log(JSON.stringify(a.concat(obj)));
const b: any = [2, 3];
b[Symbol.isConcatSpreadable] = false;
console.log(JSON.stringify([1].concat(b)));
console.log(JSON.stringify([1].concat(2, [3, 4])));
})();
//  ---- 并自 150-array-species-subclass.ts ----
(function () {
class MyArr extends Array {}
const a: any = MyArr.from([1, 2, 3]);
const b: any = a.map((x: any) => x * 2);
console.log(b instanceof MyArr, b instanceof Array, b.length, JSON.stringify([...b]));
console.log(JSON.stringify([...a.filter((x: any) => x > 1)]));
})();
//  ---- 并自 154-foreach-this-arg.ts ----
(function () {
const ctx: any = { k: 10 };
const seen: number[] = [];
[1, 2].forEach(function (this: any, v: number) { seen.push(v + this.k); }, ctx);
console.log(seen.join(","));
console.log(JSON.stringify([1, 2].map(function (this: any, v: number) { return v + this.k; }, ctx)));
console.log([1, 2].filter(function (this: any, v: number) { return v < this.k; }, ctx).length);
})();
