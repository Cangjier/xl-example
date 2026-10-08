// xl:note SWEEP-newline/arr 落点（657 审计语料）
// xl:expect Identifier:4,SymbolToken:3,Statement:2,ArrayLiteral,Keyword,Root
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-newline/arr）：MISS VariableStatement TS[0,21) «const a = [1, 2, 3];»
const a 
= [1, 2, 3];
