// xl:note SWEEP-comment/arrow 落点（657 审计语料）
// xl:expect Identifier:3,Parameter:2,Statement:2,AreaAnnotation,Lamda,LamdaBody,LamdaParameters,Let,Root,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-comment/arrow）：DRIFT VariableDeclarationList TS[0,21) 产物[0,26) «const f = (a, b) => a»
const f = (a, b) => a/*c*/;
