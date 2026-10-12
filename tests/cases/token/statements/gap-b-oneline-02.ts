// xl:note B-oneline 落点（657 审计语料）
// xl:expect Bracket,Identifier:3,Keyword:2,LineAnnotation:3,Root,Statement:6,Switch,SwitchCase:2,SwitchCompare,SwitchSegment:2,SwitchStatement:2
// 第 841 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// `CaseClause` 漂到 `[13,46)` —— 第二个 `case` 前面紧挨着块括号、切点问 `:` 问不到
//（`statement.xl.md` 的 `LastClauseHeadIndex`，第 841 轮把 `{` 那一档补进判据）。
switch (1) { case 1: { break; } case 2: break; }
