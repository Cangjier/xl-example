// xl:note SWEEP-comment/dowhile 落点（657 审计语料）
// xl:expect Statement:2,AreaAnnotation,Bracket,Identifier,Keyword,Method,Root,While,WhileBody,WhileCompare
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-comment/dowhile）：MISS DoStatement TS[0,27) «do { a(); } /*c*/while (b);»
do { a(); } /*c*/while (b);
