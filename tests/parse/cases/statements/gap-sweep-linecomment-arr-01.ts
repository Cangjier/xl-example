// xl:note SWEEP-linecomment/arr 落点（657 审计语料）
// xl:expect Identifier:4,SymbolToken:3,Statement:2,ArrayLiteral,Keyword,LineAnnotation,Root
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/arr）：MISS VariableStatement TS[0,24) «const //c a = [1, 2, 3];»
const //c
a = [1, 2, 3];
