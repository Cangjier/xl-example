// xl:note SWEEP-newline/switch 落点（657 审计语料）
// xl:expect Statement:5,Identifier:3,SwitchSegment:2,SwitchStatement:2,Bracket,Keyword,Method,Root,Switch,SwitchCase,SwitchCompare
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-newline/switch）：DRIFT ExpressionStatement TS[21,26) 产物[21,22) «b ();»
switch (a) { case 1: b
(); break; default: c(); }
