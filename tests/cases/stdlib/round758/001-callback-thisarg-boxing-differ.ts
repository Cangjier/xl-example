// xl:title 数组回调的 `thisArg` 是原始值时：松散模式要装箱
// xl:round 758
// xl:judge stdout
// xl:want differ
// xl:why **19 行里 11 行对、8 行是缺口**（第 758 轮逐行量出来的：第 10 / 11 / 12 / 13 /
// xl:why 15 / 16 / 17 / 19 行）——**缺的不是一行，是重入那条路整条**：
// xl:why 回调族（`map` / `forEach` / `filter` / `find` / `every` / `flatMap`）
// xl:why 的 `thisArg` 是原始值时，**每一格都不装箱**。第 13 / 16 / 17 行更响：
// xl:why 回调拿 `this === 5` 去比，本仓给**真**（那个数原样递进去）、Node 给**假**
// xl:why （`this` 是 `Number` 包装对象，与 5 严格不等）——**静默的错答案**。
// xl:why **规范**（`OrdinaryCallBindThis`）：松散模式下把原始值 `ToObject` 一次；
// xl:why 严格目标不装箱（拿到什么是什么）。
// xl:why **同一个形状已经收过一次**（第 710 轮）：`Function.prototype.call` / `apply` /
// xl:why `bind` 三条路的 `thisArg` 走 `globals.xl.md` 的 `BoxReceiver`（那一格的说明写着
// xl:why 「三处用它、同一件事写三遍就是三处会漂」）——**而重入那条路没有**：
// xl:why `xs.map(fn, thisArg)` 把 `thisArg` 原样递进 `vm.xl.md` 的 `CallNative`，
// xl:why 而 `CallNative` 只兜 `null` / `undefined`（换成全局对象）那一档、不装箱原始值。
// xl:why **要收它得动引擎**：`CallNative` 那一处要给非严格闭包补一次 `ToObject`——
// xl:why 而 `BoxReceiver` 住在语言层（它要 `Protos` 与隐藏键 `BoxKey`、还要分配），
// xl:why 引擎 import 不了它。**收尾轮不顺手动引擎那条所有回调共用的路**。
// xl:why 前 9 行（`call` / `apply` / `bind` 三条路、字符串与布尔两档、
// xl:why 严格目标不装箱、`null` / `undefined` 兜全局）与第 14 / 18 行**全对**，
// xl:why 所以这一条留着当守卫：谁动 `CallNative`，这里会红。
// xl:end

const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('1 (function () { return (function (t', show(() => (function () { return (function (this: any) { return this; }).call(1); })()));
console.log('2 (function () { return (function (t', show(() => (function () { return (function (this: any) { return this; }).call("x"); })()));
console.log('3 (function () { return (function (t', show(() => (function () { return (function (this: any) { return this; }).call(true); })()));
console.log('4 (function () { return (function (t', show(() => (function () { return (function (this: any) { return this; }).apply(1, []); })()));
console.log('5 (function () { return (function (t', show(() => (function () { return (function (this: any) { return this; }).bind(1)(); })()));
console.log('6 (function () { return (function (t', show(() => (function () { return (function (this: any) { "use strict"; return this; }).call(1); })()));
console.log('7 (function () { return (function (t', show(() => (function () { return (function (this: any) { return this === null ? "null" : typeof this; }).call(null); })()));
console.log('8 (function () { return (function (t', show(() => (function () { return (function (this: any) { return this === undefined ? "u" : typeof this; }).call(undefined); })()));
console.log('9 (function () { return (function (t', show(() => (function () { return (function (this: any) { return this; }).call({ k: 1 }); })()));
console.log('10 (function () { return [1].map(func', show(() => (function () { return [1].map(function (this: any) { return this; }, 5)[0]; })()));
console.log('11 (function () { return [1].map(func', show(() => (function () { return [1].map(function (this: any) { return this; }, "x")[0]; })()));
console.log('12 (function () { let seen: any = nul', show(() => (function () { let seen: any = null; [1].forEach(function (this: any) { seen = this; }, 5); return seen; })()));
console.log('13 (function () { return [1].filter(f', show(() => (function () { return [1].filter(function (this: any) { return this === 5; }, 5).length; })()));
console.log('14 (function () { return [1].map(func', show(() => (function () { return [1].map(function (this: any) { return typeof this; }, null)[0]; })()));
console.log('15 (function () { return [1].map(func', show(() => (function () { return [1].map(function (this: any) { return typeof this; }, 5)[0]; })()));
console.log('16 (function () { return [1].find(fun', show(() => (function () { return [1].find(function (this: any) { return this === 5; }, 5); })()));
console.log('17 (function () { return [1].every(fu', show(() => (function () { return [1].every(function (this: any) { return this === 5; }, 5); })()));
console.log('18 (function () { return [1].reduce(f', show(() => (function () { return [1].reduce(function (this: any, a: any) { return this; }, 0, 5); })()));
console.log('19 (function () { return [1].flatMap(', show(() => (function () { return [1].flatMap(function (this: any) { return [this]; }, 5)[0]; })()));
