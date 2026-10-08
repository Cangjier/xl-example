// xl:note SWEEP-linecomment/arrow 落点（657 审计语料）
// xl:expect Identifier:3,SymbolToken:3,Statement:2,BinaryOperator,Bracket,Let,LineAnnotation,Root
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/arrow）：DRIFT VariableStatement TS[0,26) 产物[0,16) «const f = (a, b) //c => a;»
const f = (a, b) //c
=> a;
