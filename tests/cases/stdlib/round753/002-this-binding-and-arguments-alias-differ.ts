// xl:title 调用形状：`this` 的四种绑定与严格模式
// xl:round 753
// xl:judge stdout
// xl:want differ
// xl:why **两处一起量住，两处都不是这一层能收的**：
// xl:why ① **模块顶层的 `this`**（第 5 行）：`(() => this === undefined)()` 在 Node 下给**假**、
// xl:why    本仓给**真**——**这是裁判模式的产物，不是语义差**：`node <文件.ts>` 把入口按 **CJS** 跑，
// xl:why    顶层的 `this` 是 `module.exports`；而判据侧那条批（`judge-batch.mjs` 的 `import()`）
// xl:why    按 **ESM** 跑，那里顶层 `this` 就是 `undefined`。
// xl:why    **同一个文件在两档下给两个答案**（第 686 轮量过一次同类：`.ts` 的执行形态由最近的
// xl:why    `package.json` 决定，而入口与 `import()` 进来的模块不是同一条路）——所以这一格**没有唯一基准**，
// xl:why    本仓按 ESM 的口径给（与箭头函数那一半已经对齐，见第 701 轮）。
// xl:why ② **松散模式下形参与 `arguments` 的别名**（第 9 行）：`function (a) { a = 9; return arguments[0] }`
// xl:why    在 Node 里给 `9`、本仓给 `1`。**这一条是第 749 轮登记过的同一条根**
// xl:why    （`runtime/round749/p749a-a12`：形参住在帧槽、`arguments` 是开帧时另造的数组，**两份存储**），
// xl:why    这里只把它钉在**最短的那一句**上（本用例的另一半是 `arguments.length`——那半是对的）。
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('(function () { return this ===', show(() => (function () { return this === undefined; })()));
console.log('(function () { "use strict"; r', show(() => (function () { "use strict"; return this === undefined; })()));
console.log('(function () { return this; })', show(() => (function () { return this; }).call(1)));
console.log('(function () { "use strict"; r', show(() => (function () { "use strict"; return this; }).call(1)));
console.log('(() => this === undefined)()', show(() => (() => this === undefined)()));
console.log('({ m() { return this === undef', show(() => ({ m() { return this === undefined; } }).m()));
console.log('({ m() { return typeof this; }', show(() => ({ m() { return typeof this; } }).m()));
console.log('(function () { return argument', show(() => (function () { return arguments.length; })(1, 2)));
console.log('(function (a) { a = 9; return ', show(() => (function (a) { a = 9; return arguments[0]; })(1)));
