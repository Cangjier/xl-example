// xl:note SWEEP-linecomment/optchain 落点（657 审计语料）
// xl:expect Identifier:4,NullConditionalOperator:3,Bracket:2,Statement:2,Let,LineAnnotation,Root,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/optchain）：DRIFT CallExpression TS[10,24) 产物[10,27) «a?.b?.[c]?.(d)»
const v = a?.b?.[c]?.(d)//c
;
