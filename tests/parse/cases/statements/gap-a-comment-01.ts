// xl:note A-comment 落点（657 审计语料）
// xl:expect Statement:2,AreaAnnotation,For,ForBody,ForCompare,ForInitial,ForNext,Identifier,Keyword,Label,Root
// xl:known-gap 注释 / 换行落在语法相邻位置之间（A-comment）：DRIFT BreakStatement TS[22,34) 产物[22,33) «break label;»
label: /*c*/ for (;;) break label;
