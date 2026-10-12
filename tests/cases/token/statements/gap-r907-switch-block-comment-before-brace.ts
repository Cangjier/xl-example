// xl:note `case 1:` 与块之间夹一条注释（第 907 轮片段普查量出）：TS 那边块里的 `break;` 是一条 `BreakStatement`，产物把 `break` 落成 `Identifier`、`;` 落成 `SemicolonToken`
// xl:round 907
// 第 907 轮当轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：根因在
// `text-common-util.xl.md` 的 `IsCaseClauseColon` —— 它往左那一跳只跳软换行
// （`SkipPreviousWrapSymbol`），注释挡住 `:` ⇒ 判否 ⇒ `IsStatementStart` 判否
// ⇒ `BlockCloseRule` 不给这个块补语句队列 ⇒ 块里 `break;` 退化成散单元。
// 第一跳改成 `SkipPreviousTrivia` 之后块里重新有 `Statement`（`BreakStatement` 回来了）。
// xl:expect Switch:1,SwitchCompare:1,SwitchSegment:1,SwitchCase:1,SwitchStatement:1,Bracket:1,Keyword:1,AreaAnnotation:1
// xl:end
switch (a) { case 1:/*c*/ {break;} }
