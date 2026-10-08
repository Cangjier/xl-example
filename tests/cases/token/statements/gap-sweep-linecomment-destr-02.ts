// xl:note SWEEP-linecomment/destr 落点（657 审计语料）
// xl:expect Identifier:4,BindingElement:3,SymbolToken:3,Statement:2,ArrayLiteral,Let,LineAnnotation,ObjectLiteral,Root
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/destr）：MISS BindingElement TS[12,13) «a»
const { //c
a, b: [c] } = o;
