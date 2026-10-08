// xl:note B-oneline 落点（657 审计语料）
// xl:expect Identifier:3,Keyword:3,Statement:3,Bracket,Root,Switch,SwitchCase,SwitchCompare,SwitchSegment,SwitchStatement,TypeDefine
// xl:known-gap 注释 / 换行落在语法相邻位置之间（B-oneline）：DRIFT CaseClause TS[13,31) 产物[13,46) «case 1: { break; }»
switch (1) { case 1: { break; } case 2: break; }
