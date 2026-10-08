// xl:note SWEEP-comment/optchain 落点（657 审计语料）
// xl:expect Identifier:4,NullConditionalOperator:3,Bracket:2,AreaAnnotation,Let,Method,Root,Statement,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-comment/optchain）：MISS CallExpression TS[10,29) «a/*c*/?.b?.[c]?.(d)»
const v = a/*c*/?.b?.[c]?.(d);
