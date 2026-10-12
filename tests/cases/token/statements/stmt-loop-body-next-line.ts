// 循环的**单语句体写在下一行**时体是空的：`while (a)` 换行 `foo();` 在 TS 那边
// 是一条 `WhileStatement[0,17)`（体是 `ExpressionStatement[9,17)`），本仓把体判成空、
// `foo();` 另起一条 ⇒ `WhileStatement` 只到头部（`[0,9)`）、多一个空体。
// **第 939 轮收掉**：根因在语句壳那一层——`StatementBranch.Condition` 在换行那一刻就收壳，
// 而那一刻体还没读进来 ⇒ 收尾规则看到的是「头 + 空体」。判据是
// `Statement.IsPendingLoopHead`（循环头必需跟一个体，ASI 在这里不插分号），
// `while` / `for` / `foreach` 三条收尾规则一个字都没改。
// 体是花括号那一半由 `stmt-header-body-next-line.ts` 钉着。
// 循环头后面那个 `;`（`while (a)` 换行 `;`）走的是同一个判据的 `;` 那一侧。
// xl:expect While,WhileBody,For,ForBody,Foreach,ForeachBody,Identifier
while (a)
foo();
while (a)
break;
for (const x of y)
continue;
for (;;)
foo();
