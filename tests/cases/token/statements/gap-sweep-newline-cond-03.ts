// xl:note SWEEP-newline/cond 落点（657 审计语料）
// xl:expect Identifier:3,SymbolToken:3,Statement:2,Let,Root
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-newline/cond）：DRIFT VariableStatement TS[0,21) 产物[0,17) «const x = a ? b : c;»
const x = a ? b : 
c;
