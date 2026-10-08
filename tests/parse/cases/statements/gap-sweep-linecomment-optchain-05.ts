// xl:note SWEEP-linecomment/optchain 落点（657 审计语料）
// xl:expect Identifier:4,NullConditionalOperator:3,ArrayLiteral,Bracket,Let,LineAnnotation,Method,Root,Statement,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/optchain）：MISS ElementAccessExpression TS[10,23) «a?.b?.//c [c]»
const v = a?.b?.//c
[c]?.(d);
