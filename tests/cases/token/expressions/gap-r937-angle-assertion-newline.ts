// xl:known-gap 尖括号类型断言的 `>` 与操作数之间**换行**时断言收不起来：
// `const a = <T>` 换行 `x;` 在 TS 那边是一整条 `TypeAssertionExpression`（断言只吃一个操作数），
// 本仓把换行当语句边界 ⇒ 缺 `TypeAssertionExpression` 1 + `Identifier` 1、漂 4、多 5
// （`new-member-callee-newline.ts` 同批普查量到的，第 937 轮不动它：
// 要改的是断言那一族的分岔，硬收会摇动已经转绿的 `expr-angle-assertion` 一系）。
// xl:absent TypeAssertionExpression
// xl:expect GenericType,Statement
const a = <T>
x;
const b = <T>// c
x;
