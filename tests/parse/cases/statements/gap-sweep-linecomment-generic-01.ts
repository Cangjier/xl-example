// xl:note SWEEP-linecomment/generic 落点（657 审计语料）
// xl:expect Identifier:6,Keyword:3,Statement:3,TypeDefine:2,Bracket,GenericType,LineAnnotation,MethodBody,MethodDeclaration,Parameter,ReturnType,Root,TypeParameter
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/generic）：MISS FunctionDeclaration TS[0,50) «function //c f<T extends U>(x: T): T { return x; }»
function //c
f<T extends U>(x: T): T { return x; }
