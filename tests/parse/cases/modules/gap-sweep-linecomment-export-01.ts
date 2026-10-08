// xl:note SWEEP-linecomment/export 落点（657 审计语料）
// xl:expect Identifier:3,Statement:3,Keyword:2,Bracket,Export,LineAnnotation,Root,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/export）：MISS VariableStatement TS[0,16) «const //c a = 1;»
const //c
a = 1;
export { a };
