// xl:note SWEEP-newline/optchain 落点（657 审计语料）
// xl:expect Identifier:4,NullConditionalOperator:3,Bracket:2,Let,Method,Root,Statement,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-newline/optchain）：DRIFT ElementAccessExpression TS[10,19) 产物[10,20) «a?.b?.[c]»
const v = a?.b?.[c]
?.(d);
