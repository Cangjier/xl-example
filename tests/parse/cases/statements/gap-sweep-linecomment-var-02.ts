// xl:note SWEEP-linecomment/var 落点（657 审计语料）
// xl:expect Identifier:2,Statement:2,Keyword,LineAnnotation,Root,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/var）：MISS VariableStatement TS[0,14) «let a //c = 1;»
let a //c
= 1;
