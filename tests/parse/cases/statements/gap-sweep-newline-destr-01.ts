// xl:note SWEEP-newline/destr 落点（657 审计语料）
// xl:expect Identifier:4,Statement:3,SymbolToken:2,BinaryOperator,Bracket,Keyword,Root,TupleType,TypeDefine
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-newline/destr）：MISS VariableStatement TS[0,25) «const { a, b: [c] } = o;»
const 
{ a, b: [c] } = o;
