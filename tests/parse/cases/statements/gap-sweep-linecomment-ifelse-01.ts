// xl:note SWEEP-linecomment/ifelse 落点（657 审计语料）
// xl:expect Statement:4,Bracket:2,Method:2,Identifier,IfCondition,IfSegment,IfSet,IfStatement,Keyword,LineAnnotation,Root
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/ifelse）：DRIFT IfStatement TS[0,33) 产物[0,19) «if (a) //c { b(); } else { c(); }»
if (a) //c
{ b(); } else { c(); }
