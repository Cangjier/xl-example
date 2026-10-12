// xl:note 第 1235 轮新立：**语句位的裸块后面那一截**（第 1231 轮登记那一族里
// 「与块 / 对象字面量的分岔」那一格，`gap-r1231-decl-newline-operator` 的第 ① 格）。
//
// `declare const a: any;` 换行 `{ p: 1 }`t`` 在 TS 里是**两条语句**
// （`Block` + `ExpressionStatement > TaggedTemplateExpression`），产物却把整段收进
// **同一个** `Statement` 壳、折成一条标签模板（缺 1 多 2，实测）。
//
// **根因**：壳拆开那一趟（`SplitShell`）只认「第一个孩子是 `IsStatementUnit`」，
// 而**裸块不在那张名单里**（`IsStatementUnit` 刻意不含裸块）⇒ 壳里「一格块 + 一截尾巴」
// 不拆 ⇒ 尾巴被当成那格块的标签 / 后缀。同一个盲点的第二面是**空语句**：
// `{ q: 2 };` 里那个 `;` 在 TS 里是 `EmptyStatement`，而 `SplitShell` 的空壳那一支
// 要问 `BlockClosedStatement`（「以块收尾、自己不吃尾分号」那张名单）——裸块也不在里面。
//
// **修法**：两处各放开一格，都按「语句位的块」这一句认（`startBracket === "{"`，
// 第一处还要问 `IsStatementStart`——与 `IsStatementBoundary` 里那条裸块判据同一句）：
// 「壳的头是裸块」算拆、「裸块不吃尾分号」算收。清单里那两个字（`IsStatementUnit` /
// `BlockClosedStatement`）**一个字没动**（它们各有别的含义），放开的是这两处**用户**。
//
// **为什么这一份里一句注释都不夹**（第 1235 轮实测）：前一条语句与那个裸块之间**夹一条注释**
// 时这一族**本来就对**（`SplitShell` 的头那一趟因为前导 trivia 早退，壳在上游就是另一种收法）
// ⇒ 夹了注释的排版守不住这一格。所以三格连排、注释全写在头上。
//
// 对照档（**必须不变**）：`lbl: { … }` 那一档（标签的体）、`const v = { a: 1 }` 那一档
// （值位花括号，由 `IsObjectLiteralBrace` 挡着）、以及同一条壳里已经能拆的语句级单元
// （`function` / `class` / `while` …）。
// xl:round 1235
// xl:end
declare const a: any, f: any;
{ p: 1 }`t`;
{ q: 2 };
{ a; } f();

// —— 对照：标签块后面那一截
lbl: { a; } f();

// —— 对照：值位的花括号（换行 `/` 仍然是除号）
const v = { p: 1 }
/re/g;

// —— 对照：语句级单元后面那一截（本来就拆得开）
function g() { }
f();

// —— 对照：控制结构之后那个体不是新语句
while (a) { }
f();
