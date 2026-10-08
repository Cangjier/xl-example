// xl:note SWEEP-linecomment/arrow 落点（657 审计语料）
// xl:expect Identifier:4,Statement:3,Parameter:2,Keyword,Lamda,LamdaBody,LamdaParameters,LineAnnotation,Root,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/arrow）：MISS VariableStatement TS[0,26) «const f //c = (a, b) => a;»
const f //c
= (a, b) => a;
