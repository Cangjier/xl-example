// xl:note SWEEP-newline/typeunion 落点（657 审计语料）
// xl:expect Identifier:3,Statement:2,SymbolToken:2,BinaryOperator,Keyword,Root
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-newline/typeunion）：MISS TypeAliasDeclaration TS[0,16) «type T = A | B;»
type T 
= A | B;
