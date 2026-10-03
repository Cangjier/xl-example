// 语料 27：`for..of` 头部里的解构 · `var` 提升 · 对象剩余（第 135 轮）
// ——stdout 与 `node <本文件>` 逐字节对拍。
//
// **这一份的来历**：第 134 轮收尾时列了三条待办 ✓，这一轮把前两条做掉、顺路修掉一条
// **一直是死代码**的判据 ✓：
//
//   ① **`for (const [k, v] of …)`**：绑定模式那一路（第 132 / 134 轮）已经在了 ✓，
//      缺的只是把它接到循环上 ✓——**一行新语义都没有** ✓。
//   ② **`var` 提升**：`CollectHoistedVars` 判的是 `flags === "Var"` ✗，
//      而 `var` 在 TS 里是 **`NodeFlags.None`** ✓（只有 `let` / `const` 才有标志位 ✓），
//      投影写成 `"None"` ✓——**那个 `"Var"` 根本不存在** ✗，
//      于是**整条 `var` 提升一直是死代码** ✓。简单形状（声明在前、用在后）
//      **恰好与 `let` 同形** ✓，所以一直没露 ✗；一旦「用在前、声明在后」或
//      「声明在块里、用在外面」就露出来了 ✓。
//   ③ **对象剩余**（`const {a, ...rest} = o`）：要一份**排除名单** ✓——
//      名单在编译期就知道 ✓，所以由降级层算好、走一条新的语言内建调用
//      `rest_object(源, 已拆走的键数组)` ✓（号段 700..799，与 `spread_into` 同一个写法 ✓）。
//
// **语料里避开的**（各自记着，不是漏测）：
//   · `for (const c of "ab")`（**字符串不是可迭代物**）—— 引擎的迭代只认数组与生成器 ✓，
//     这是**更早**就记着的一条缺口 ✓，与这一轮无关 ✓；
//   · `const {a} = null`（解构 `null` / `undefined`）—— JS 给 `TypeError` ✓，
//     本仓给 `undefined` ✓（也是更早的一条 ✓）；
//   · 绑定模式里的**计算键**（`{["a"]: x} = o`）—— 投影那边就报
//     `ComputedPropertyName has no text` ✓；
//   · `new C(...xs)` / `super(...xs)` —— 第 133 轮记着的两条 ✓。

// ① for..of 头部里的解构
function pairs() { return [[1, "a"], [2, "b"]]; }
console.log("of-pair", (() => {
  const out = [];
  for (const [k, v] of pairs()) out.push(k + "=" + v);
  return out.join(",");
})());
console.log("of-object", (() => {
  const out = [];
  for (const { name, size } of [{ name: "x", size: 2 }]) out.push(name + size);
  return out.join(",");
})());
console.log("of-rest-default", (() => {
  const out = [];
  for (const [first, ...others] of [[1, 2, 3]]) out.push(first + ":" + others.join("+"));
  for (const { n = 9 } of [{}]) out.push(n);
  return out.join(",");
})());
console.log("of-closure", (() => {
  const out = [];
  for (const [a, b] of [[1, 2], [3, 4]]) {
    const sum = () => a + b;
    out.push(sum());
  }
  return out.join(",");
})());

// ② var 提升
function hoisted() {
  inside = 5;
  if (true) { var inside; }
  for (var i = 0; i < 3; i++) { }
  var { w } = { w: 7 };
  return [inside, i, w].join(",");
}
console.log("var-hoist", hoisted(), typeof laterVar);
var laterVar = 1;
console.log("var-late", laterVar);

// ③ 对象剩余
const source = { a: 1, b: 2, c: 3 };
const { a: renamed, ...others } = source;
console.log("rest-object", renamed, Object.keys(others).join(","), JSON.stringify(others));
function pick({ keep, ...drop }) { return keep + "|" + Object.keys(drop).join(","); }
console.log("rest-param", pick({ keep: "k", x: 1, y: 2 }));
console.log("rest-empty", JSON.stringify((({ a, ...r }) => r)({ a: 1 })));
console.log("after", 1 + 1);
