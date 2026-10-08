// xl:note SWEEP-newline/destr 落点（657 审计语料）
// xl:expect Identifier:4,SymbolToken:3,BindingElement:2,Statement:2,ArrayLiteral,BinaryOperator,Let,ObjectLiteral,Root
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-newline/destr）：DRIFT BindingElement TS[8,9) 产物[8,18) «a»
const { a, b: 
[c] } = o;
