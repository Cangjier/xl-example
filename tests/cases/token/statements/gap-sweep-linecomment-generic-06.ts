// xl:note SWEEP-linecomment/generic 落点（657 审计语料）
// xl:expect Identifier:7,Statement:3,Bracket:2,Keyword:2,TypeDefine:2,Function,GenericType,LineAnnotation,Parameter,ReturnType,Root,TypeParameter
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/generic）：DRIFT FunctionDeclaration TS[0,50) 产物[0,30) «function f<T extends U>(x: T): //c T { return x; }»
function f<T extends U>(x: T): //c
T { return x; }
