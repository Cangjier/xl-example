// xl:note SWEEP-linecomment/obj 落点（657 审计语料）
// xl:expect Identifier:5,SymbolToken:4,Statement:2,Keyword,LineAnnotation,ObjectLiteral,Root
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/obj）：MISS VariableStatement TS[0,29) «const //c o = { a: 1, b: 2 };»
const //c
o = { a: 1, b: 2 };
