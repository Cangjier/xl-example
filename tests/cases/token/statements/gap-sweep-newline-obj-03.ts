// xl:note SWEEP-newline/obj 落点（657 审计语料）
// xl:expect Identifier:4,SymbolToken:4,Statement:2,Let,ObjectLiteral,Root
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-newline/obj）：DRIFT VariableStatement TS[0,26) 产物[0,24) «const o = { a: 1, b: 2 } ;»
const o = { a: 1, b: 2 }
;
