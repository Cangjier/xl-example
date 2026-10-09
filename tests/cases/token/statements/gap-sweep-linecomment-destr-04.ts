// xl:note SWEEP-linecomment/destr 落点（657 审计语料）
// xl:expect Identifier:4,BindingElement:3,SymbolToken:3,ArrayLiteral,Let,LineAnnotation,ObjectLiteral,Root,Statement
const { a, b: //c
[c] } = o;
