// xl:note SWEEP-comment/optchain 落点（657 审计语料）
// xl:expect Identifier:4,NullConditionalOperator:3,AreaAnnotation,ArrayLiteral,Bracket,Let,Method,Root,Statement,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-comment/optchain）：MISS ElementAccessExpression TS[10,24) «a?.b?./*c*/[c]»
const v = a?.b?./*c*/[c]?.(d);
