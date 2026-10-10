// xl:known-gap 循环的**单语句体写在下一行**时体是空的：`while (a)` 换行 `foo();` 在 TS 那边
// 是一条 `WhileStatement[0,17)`（体是 `ExpressionStatement[9,17)`），本仓把体判成空、
// `foo();` 另起一条 ⇒ `WhileStatement` 只到头部（`[0,9)`）、多一个空体。
// `while (a)` 换行 `break;` / `for (const x of y)` 换行 `continue;` / `for (;;)` 换行 `foo();`
// 是同一格；而 `if (a)` 换行 `foo();` **没有这个毛病**（`IfSegment` 走另一条路）——
// 所以坏的是 `WhileCloseRule.Process` / `ForCloseRule.Process` 体那一段找语句结尾的那一步
// （`SearchStatementEnd` 在「体还不在单元列表里」时给 -1 ⇒ 落进 `emptyBody` 那一支）。
// 现有的 `stmt-header-body-next-line.ts` 只钉了**花括号体**那一半（`while (a)` 换行 `{ break }`），
// 体是单语句时没有守卫，这条用例把它补上。
// xl:expect While,WhileBody,For,ForBody,Foreach,ForeachBody,Identifier
while (a)
foo();
while (a)
break;
for (const x of y)
continue;
for (;;)
foo();
