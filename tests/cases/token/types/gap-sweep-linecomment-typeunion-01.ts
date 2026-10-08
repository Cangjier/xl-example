// xl:note SWEEP-linecomment/typeunion 落点（657 审计语料）
// xl:expect Identifier:3,Statement:2,SymbolToken:2,BinaryOperator,Keyword,LineAnnotation,Root
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/typeunion）：MISS TypeAliasDeclaration TS[0,19) «type T //c = A | B;»
type T //c
= A | B;
