// xl:note SWEEP-newline/var 落点（657 审计语料）
// xl:expect Identifier:2,Statement:2,Keyword,Root,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-newline/var）：MISS VariableStatement TS[0,11) «let a = 1;»
let 
a = 1;
