// xl:note SWEEP-newline/optchain 落点（657 审计语料）
// xl:expect Identifier:5,NullConditionalOperator:3,Bracket:2,Statement:2,Keyword,Method,Root,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-newline/optchain）：MISS VariableStatement TS[0,26) «const v = a?.b?.[c]?.(d);»
const v 
= a?.b?.[c]?.(d);
