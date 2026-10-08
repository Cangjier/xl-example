// xl:note SWEEP-linecomment/dowhile 落点（657 审计语料）
// xl:expect Statement:2,Bracket,Identifier,Keyword,LineAnnotation,Method,Root,While,WhileBody,WhileCompare
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/dowhile）：MISS DoStatement TS[0,26) «do { a(); } //c while (b);»
do { a(); } //c
while (b);
