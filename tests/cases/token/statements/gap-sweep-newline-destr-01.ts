// xl:note SWEEP-newline/destr 落点（657 审计语料）
// xl:expect ArrayLiteral:1,BindingElement:3,Identifier:4,Let:1,ObjectLiteral:1,Root:1,Statement:1,SymbolToken:3
const 
{ a, b: [c] } = o;
