// xl:note B-oneline 落点（657 审计语料）
// xl:expect Keyword:3,Statement:3,Identifier:2,Bracket,Root,Switch,SwitchCompare,SwitchSegment,SwitchStatement,TypeDefine
// xl:known-gap 注释 / 换行落在语法相邻位置之间（B-oneline）：DRIFT DefaultClause TS[13,32) 产物[13,47) «default: { break; }»
switch (1) { default: { break; } case 1: break; }
