// xl:note SWEEP-linecomment/destr 落点（657 审计语料）
// xl:expect Field:2,Identifier:2,Statement:2,Keyword,LineAnnotation,Root,SymbolToken,TupleType,TypeDefine,TypeLiteral,TypeLiteralBody
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/destr）：MISS VariableStatement TS[0,28) «const { a, b: [c] } //c = o;»
const { a, b: [c] } //c
= o;
