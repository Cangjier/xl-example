// xl:note SWEEP-comment/ifelse 落点（657 审计语料）
// xl:expect Statement:3,Bracket:2,Method:2,AreaAnnotation,Identifier,IfCondition,IfSegment,IfSet,IfStatement,Keyword,Root
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-comment/ifelse）：FIELD IfStatement [0,34) 产物[expression,thenStatement] TS[elseStatement,expression,thenStatement] «if (a) /*c*/{ b(); } else { c(); }»
if (a) /*c*/{ b(); } else { c(); }
