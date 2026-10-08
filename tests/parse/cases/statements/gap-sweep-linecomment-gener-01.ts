// xl:note SWEEP-linecomment/gener 落点（657 审计语料）
// xl:expect Identifier:2,Statement:2,Bracket,Function,FunctionBody,Keyword,LineAnnotation,Parameter,Root,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/gener）：FIELD FunctionDeclaration [0,30) 产物[asteriskToken,body,name,parameters] TS[asteriskToken,body,name] «function* g(//c ) { yield 1; }»
function* g(//c
) { yield 1; }
