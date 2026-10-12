// xl:note 第 1241 轮**新登记**的一格（用户口径 1.1，摊第 1236 轮那一族时量出来的）：
// **标签体以「不是 `Identifier` 的那个单元」开头**时，标签收不出来。
//
// `b: 'x'` / `b: (x)` / `b: [1]` / `b: -1` / `` b: `x` `` 在 TS 里都是
// `LabeledStatement(b)` 套一条表达式语句，产物那一列是**缺 3~4 多 1**
//（缺 `LabeledStatement` + 那条表达式语句 + 里面的节点，多一个把整段装走的 `ExpressionStatement`）；
// 本用例四行合计（`tmp/r1241-probe2.mjs` 的单独读数）：**TS 49 节点 / 投影 38、缺 15 漂 0 多 4**。
//
// **与体无关**（第 1241 轮逐体量过一遍）：`if` 的体 / `else` 的体 / `while` 的体 / 函数体 /
// 方法体 / 箭头体 / 顶层裸块 / 顶层，**七个宿主一样坏**；带不带分号也一样坏。
// 所以它**不是** `IsStatementList` 漏了哪一格（第 1241 轮补 `IfBody` 那一笔对它一个字没用）。
//
// **根因落在** `label.xl.md` 的 `LabelCloseRule.StatementStartsHere`：它认「这一格能不能起一条语句」，
// 数字 / 布尔字面量能过是因为它们在词法层就是 `Identifier` 实例（`标识符 / 数字 / 布尔字面量的文本块`），
// 而 `String`、`(`、`[`、`` ` ``、`-`、`!` 这些**是别的 token 类** ⇒ 走到最后那句
// `if (!(item instanceof Identifier)) return false;` 上给假 ⇒ `Previous` 判不下这条标签。
// 入口那一关（名字要在语句开头，`IsStatementStart`）照旧挡着类型标注，所以放宽这一处
// 动的只是「冒号后面那一格能不能起一条语句」这一问。
// xl:known-gap 标签体以非 `Identifier` 单元开头（字符串 / 括号 / 数组 / 一元前缀）时标签收不出来
// xl:round 1241
// xl:end
declare const a: any, b: any, x: any;

if (a) { } else { b: 'x' }
if (a) { } else { b: (x) }
if (a) { } else { b: [1] }
if (a) { } else { b: -1 }
