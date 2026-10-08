// xl:note SWEEP-comment/optchain 落点（657 审计语料）
// xl:expect Identifier:4,NullConditionalOperator:3,Bracket:2,AreaAnnotation,Let,Method,Root,Statement,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-comment/optchain）：DRIFT ElementAccessExpression TS[10,19) 产物[10,24) «a?.b?.[c]»
const v = a?.b?.[c]/*c*/?.(d);
