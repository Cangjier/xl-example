// xl:note SWEEP-newline/cond 落点（657 审计语料）
// xl:expect Identifier:4,Statement:2,Keyword,Root,SymbolToken,TernaryOperator,TernaryOperatorCondition,TernaryOperatorFalseStatement,TernaryOperatorTrueStatement
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-newline/cond）：MISS VariableStatement TS[0,21) «const x = a ? b : c;»
const x 
= a ? b : c;
