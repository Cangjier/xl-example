// xl:note `switch` 体的两个 `case` 标签连着写、而**第二个标签的冒号后面**换行（第 933 轮片段普查量出）：
// `switch (x) { case 1: case 2:` 换行 ` break; }` 在 TS 那边是**两条** `CaseClause`
//（`case 1:` 与 `case 2:` 各一条，`break` 挂在第二条下），而产物把两条并成一条
//（`CaseClause[13,36) = "case 1: case 2:"`）、第二条又另外落成一条 `ExpressionStatement`
//（缺 2 漂 1 多 3）。**注意**：换行落在**第一个**冒号后面（`case 1:` 换行 `case 2: break;`）
// 那一档是**对的**——两档的差别只在「第几条标签的冒号后面换行」。根因**第 934 轮量清了**：
// `;` 那一档的成形器（`Statement.FormFrom`）早就会在 `switch` 体里按**最后一个段头**切壳
// （`LastClauseHeadIndex`），而**换行那一档**（`StatementBranch.Success`）漏了同一句 ⇒
// 两个段头进了同一条壳。两处成形器对齐之后第 934 轮转绿
//（`xl:known-gap` 按规矩撤掉，用例留着当守卫）。
switch (x) { case 1: case 2:
 break; }
