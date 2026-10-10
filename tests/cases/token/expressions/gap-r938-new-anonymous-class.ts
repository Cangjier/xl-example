// xl:known-gap `new` 后面紧跟一个**匿名类表达式**时它不成形：`const a = new class { m() {} }();`
// 在 TS 那边是 `NewExpression > ClassExpression`，本仓把 `new` 留成裸 `Keyword(new)`、
// 类另起一格、末尾那对括号成了对它的又一次调用 ⇒ 缺 `NewExpression` / `ClassExpression` /
// `MethodDeclaration` / `Identifier(m)` / `Block` 共 5、多 2（`CallExpression` + `NewKeyword`）。
// 根因在 `NewCloseRule.Previous`：它要求 `new` **后面紧跟一个类型名**（`Identifier`）或
// `(` 开头的括号，而 `class` 这个关键字两者都不是 —— 与「括号里的被构造者」
// （`new (class {})()`，那一支已经能走）是同一件事的两半。
// 第 938 轮的片段普查量出这一族 **42 条**（`/*c*/` / 换行 / 行注释三种插法各 14 格，
// 位置遍及 `new` 与 `class` 之间到 `}` 与 `(` 之间），整族一起红。
// xl:expect Class,ClassBody,MethodDeclaration
const a = new class { m() {} }();
const b = new/*c*/ class { m() {} }();
const c = new class {
m() {} }();
