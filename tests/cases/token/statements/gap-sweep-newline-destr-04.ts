// xl:note SWEEP-newline/destr 落点（657 审计语料）
// xl:expect Identifier:4,BindingElement:3,SymbolToken:3,ArrayLiteral,Let,ObjectLiteral,Root,Statement
const { a, b: [c] 
} = o;
