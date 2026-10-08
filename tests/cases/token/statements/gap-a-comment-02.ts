// xl:note A-comment 落点（657 审计语料）
// xl:expect SymbolToken:3,Identifier:2,ObjectLiteral:2,AreaAnnotation,Let,Root,Statement
// xl:known-gap 注释 / 换行落在语法相邻位置之间（A-comment）：MISS SpreadAssignment TS[12,29) «.../*c*/ { a: 1 }»
const o = { .../*c*/ { a: 1 } };
