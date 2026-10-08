// xl:note SWEEP-linecomment/destr 落点（657 审计语料）
// xl:expect Identifier:4,Statement:2,SymbolToken:2,BinaryOperator,BindingElement,Let,LineAnnotation,ObjectLiteral,Root,TupleType,TypeDefine
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/destr）：DRIFT BindingElement TS[8,9) 产物[8,17) «a»
const { a, b: [c] //c
} = o;
