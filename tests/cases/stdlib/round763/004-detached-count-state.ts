// xl:title 解绑的 `count` / `countReset`：状态挂在 `console` 上、与 `this` 无关
// xl:round 763
// xl:judge stdout
// xl:note 第 763 轮普查当场量到的一格（**静默错值**）：`const c = console.count; c("k")`
// xl:note 在 Node 里**照样接着数**（`k: 1` / `k: 2`），本仓原来印 `k: 2` 之后**回到 `k: 1`**
// xl:note ——解绑调用时接收者是 `undefined`，两张计数表各建一份。症状与「计数没做」
// xl:note **一字不差**（一句异常都没有），所以这一条把它钉在最短的那一句上。
// xl:note **根与 `group` 那一族同一副面孔**：Node 的 `countMap` / `indentLevel`
// xl:note 长在**模块级那个 `Console` 实例**上、**与调用时的 `this` 无关**。
// xl:note 收法：状态与缩进共用一个 holder（`ConsoleGroupOwner`）。
// xl:end
const c = console.count;
const r = console.countReset;
c("k");
c("k");
console.count("k");
r("k");
c("k");
console.count("k");
