// xl:note SWEEP-newline/arrow 落点（657 审计语料）
// xl:expect Identifier:3,SymbolToken:3,Statement:2,BinaryOperator,Bracket,Let,Root
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-newline/arrow）：DRIFT VariableStatement TS[0,23) 产物[0,16) «const f = (a, b) => a;»
const f = (a, b) 
=> a;
