// xl:note SWEEP-newline/destr 落点（657 审计语料）
// xl:expect Identifier:4,Statement:2,SymbolToken:2,BinaryOperator,BindingElement,Let,ObjectLiteral,Root,TupleType,TypeDefine
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-newline/destr）：DRIFT BindingElement TS[8,9) 产物[8,17) «a»
const { a, b: [c] 
} = o;
