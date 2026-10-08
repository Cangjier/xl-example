// xl:note SWEEP-linecomment/destr 落点（657 审计语料）
// xl:expect Identifier:4,BindingElement:2,Statement:2,SymbolToken:2,ArrayLiteral,BinaryOperator,Let,LineAnnotation,ObjectLiteral,Root,TypeDefine
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/destr）：DRIFT BindingElement TS[8,9) 产物[8,21) «a»
const { a, b: //c
[c] } = o;
