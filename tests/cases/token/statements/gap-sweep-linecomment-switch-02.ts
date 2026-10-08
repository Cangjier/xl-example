// xl:note SWEEP-linecomment/switch 落点（657 审计语料）
// xl:expect Statement:5,Identifier:3,SwitchSegment:2,SwitchStatement:2,Bracket,Keyword,LineAnnotation,Method,Root,Switch,SwitchCase,SwitchCompare
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/switch）：DRIFT ExpressionStatement TS[42,50) 产物[42,43) «c//c ();»
switch (a) { case 1: b(); break; default: c//c
(); }
