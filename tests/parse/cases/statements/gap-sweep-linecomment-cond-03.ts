// xl:note SWEEP-linecomment/cond 落点（657 审计语料）
// xl:expect Identifier:3,Statement:2,Let,LineAnnotation,Root,SymbolToken,TernaryOperator,TernaryOperatorCondition,TernaryOperatorFalseStatement,TernaryOperatorTrueStatement
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/cond）：DRIFT VariableStatement TS[0,24) 产物[0,17) «const x = a ? b : //c c;»
const x = a ? b : //c
c;
