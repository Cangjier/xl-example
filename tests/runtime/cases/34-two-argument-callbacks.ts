// 语料 34：回调要两个实参的那一族（第 142 轮）——stdout 与 `node <本文件>` 逐字节对拍。
//
// **这一份的来历**：第 141 轮收尾做了一次「日常 stdlib 普查」（69 条普通写法 ✓），
// 46/69 ✓——**最大的那一簇是「回调要两个实参」** ✗：`sort((a, b) => …)` 与
// `reduce((acc, x) => …)` 连签名都进不去 ✓（`NativeCall` 只带**一个**实参 ✗，
// 那条限制从第 116 轮 `Map.forEach` 起就记在台账里 ✓）。
//
//   ① **把实参表开宽**（第 142 轮 ✓）：`NativeCall` 从
//      `(callee, thisValue, argument, hasArgument)` 改成 `(callee, thisValue, args)` ✓——
//      访问器给 `[]` / `[value]` ✓，Map 的 `forEach` 给 `[值, 键]` ✓，
//      数组的回调给 `[元素, 下标]` ✓。**一次开到底** ✓：以后再来「回调要三个实参」的
//      （JS 的 `map((值, 下标, 数组))` ✓）不必再动签名 ✓。
//   ② **新方法**：`sort` ✓、`reduce` ✓（外加铺路的 `shift` / `fill` / `flat` ✓）。
//      `sort` 是**插入排序**（稳定 ✓，照 ES2019 起的 JS ✓）；不给比较器时
//      **按「转成字符串再比」** ✓（`[10, 9].sort()` 给 `[10, 9]` ✓——**这一条最容易想当然** ✗）。
//
// **语料里避开的**（各自记着，不是漏测）：
//   · `fill(值, 起, 止)` / `flat(深度)` / `splice` / `replaceAll` ✗——「先做最常用的那一档」 ✓；
//   · `new Array(3)` ✗ ——**第 145 轮通了** ✓（值模型补上「对象也能被调用」那一档 ✓，
//     语料在 `37-callable-globals.ts` 里 ✓；这一份的正文**不动** ✓：它量的是第 142 轮那一格 ✓）；
//   · `Number('7')` / `NaN` / `Infinity` ✗——**`Number('7')` 第 145 轮通了** ✓（同上 ✓），
//     `NaN` / `Infinity` 两个全局名仍未做 ✗；
//   · **`console.log(a?.b)`** ✗——这一条是普查里**最要命**的发现 ✓：
//     `?.` 写在**实参位**时，产物把整个调用**收没了** ✓（`o?.a` 会被并进被调用者那一格 ✓），
//     于是那一行**什么都不打印** ✗（退出码还是 0 ✗）。**静默少一整句** ✓，下一轮第一条 ✓
//     （**第 143 轮修掉了** ✓：修在渲染侧 ✓，语料在 `35-optional-in-arguments.ts` ✓）。

const numbers = [5, 3, 8, 1];
const words = ["pear", "apple", "fig"];
const rows = [{ n: 3 }, { n: 1 }, { n: 2 }];

console.log("sort-comparator", [5, 3, 8, 1].sort((a, b) => a - b).join(","),
  [5, 3, 8, 1].sort((a, b) => b - a).join(","));
console.log("sort-default", [10, 9, 1].sort().join(","), words.slice().sort().join(","));
console.log("sort-in-place", (() => {
  const copy = numbers.slice();
  const returned = copy.sort((a, b) => a - b);
  return [copy.join(","), returned === copy, numbers.join(",")].join(" | ");
})());
console.log("sort-objects", rows.slice().sort((x, y) => x.n - y.n).map((row) => row.n).join(","));
console.log("reduce", [1, 2, 3, 4].reduce((acc, value) => acc + value, 0),
  [1, 2, 3, 4].reduce((acc, value) => acc + value),
  ["a", "b"].reduce((acc, value) => acc + value, ">"));
console.log("reduce-index-free", [2, 3].reduce((acc, value) => acc * value, 1));
console.log("callback-index", [10, 20, 30].map((value, index) => value + index).join(","),
  [10, 20, 30].filter((value, index) => index > 0).join(","),
  [10, 20].findIndex((value, index) => index === 1));
console.log("map-foreach-pair", (() => {
  const m = new Map([["a", 1], ["b", 2]]);
  const seen = [];
  m.forEach((value, key) => seen.push(key + "=" + value));
  const s = new Set([7]);
  const single = [];
  s.forEach((value, key) => single.push(value + "/" + key));
  return [seen.join(","), single.join(",")].join(" | ");
})());
console.log("shift-fill-flat", (() => {
  const queue = [1, 2, 3];
  const first = queue.shift();
  const filled = [1, 2, 3].fill(0);
  const flat = [[1, 2], [3], 4].flat();
  return [first, queue.join(","), filled.join(","), flat.join(",")].join(" | ");
})());
console.log("after", 1 + 1);
