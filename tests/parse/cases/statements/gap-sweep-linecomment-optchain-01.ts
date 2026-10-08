// xl:note SWEEP-linecomment/optchain 落点（657 审计语料）
// xl:expect Identifier:5,NullConditionalOperator:3,Bracket:2,Statement:2,Keyword,LineAnnotation,Method,Root,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/optchain）：MISS VariableStatement TS[0,29) «const //c v = a?.b?.[c]?.(d);»
const //c
v = a?.b?.[c]?.(d);
