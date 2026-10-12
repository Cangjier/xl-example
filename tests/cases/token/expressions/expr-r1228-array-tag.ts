// xl:note 第 1228 轮新立：**数组字面量当标签模板的标签**那一族（`[a, b]`t`` / `[...a]`t``
// 以及各自后面接 `.d` / `()` / `!` / 下标 / 断言 / 又一个模板的续写）。
// 根因在投影层「后缀链」那张名单：`tagIsPostfixChain`（`print-ast-common.xl.md` 的 0b 那一支）
// 与它下面的 `IsChainTail` 答的是**同一句话**——「这一格能不能接在操作数后面」——
// 所以两串名字本来就该一模一样。`IsArrayLiteralUnit` 从第 947 轮起就一直在 `IsChainTail` 上，
// **只有 `tagIsPostfixChain` 少它** ⇒ 入口判否：标签与模板在产物里是平级两格，
// 通用支只投得出一格 `ArrayLiteralExpression`，**模板字面量与整条 `TaggedTemplateExpression`
// 一起丢**（实测 `tmp/r1227-tag.mjs`：`[a, b]` 与 `[...a]` 两个底样 × 8 个位置共 16 条全对不上）。
// 补法是**一行**：把那一格补进 `tagIsPostfixChain` 的名单（两张名单恢复逐字同源）。
// 判据与理由记在 `typescript/print-ast-common.xl.md` 的 `tagIsPostfixChain` 那一节。
// xl:end
declare const a: any, b: any, c: any, d: any, o: any;

[a, b]`t`;
[...a]`t`;
[]`t`;
[a]`t`;
[a, ...b]`t`;
[[a], b]`t`;
[a, b]`t`.d;
[a, b]`t`();
[a, b]`t`!;
[a, b]`t`[0];
[a, b]`t` as any;
[a, b]`t``u`;
[...a]`t`.c;
[...a]`t`();
[...a]`t`!;
[...a]`t`[0];
[...a]`t` as any;
[...a]`t``u`;
const q1 = [a, b]`t`;
const q2 = [...a]`t`;
function g() { return [a, b]`t`; }
class Z { p = [a, b]`t`; }
o.m([a, b]`t`);
