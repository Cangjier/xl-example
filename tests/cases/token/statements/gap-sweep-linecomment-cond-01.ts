// xl:note SWEEP-linecomment/cond 落点（657 审计语料）
// xl:expect Identifier:4,Statement:2,Keyword,LineAnnotation,Root,SymbolToken,TernaryOperator,TernaryOperatorCondition,TernaryOperatorFalseStatement,TernaryOperatorTrueStatement
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/cond）：MISS VariableStatement TS[0,24) «const //c x = a ? b : c;»
const //c
x = a ? b : c;
