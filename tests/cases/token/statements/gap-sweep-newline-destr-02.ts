// xl:note SWEEP-newline/destr 落点（657 审计语料）
// xl:expect Identifier:4,BindingElement:3,SymbolToken:3,Statement:2,ArrayLiteral,Let,ObjectLiteral,Root
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-newline/destr）：FIELD BindingElement [8,9) 产物[] TS[name] «a»
const { a
, b: [c] } = o;
