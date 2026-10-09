// xl:note SWEEP-linecomment/generic 落点（657 审计语料）
// xl:expect Identifier:7,Keyword:2,Statement:2,TypeDefine:2,Bracket,Function,FunctionBody,GenericType,LineAnnotation,Parameter,ReturnType,Root,TypeParameter
function f<T //c
extends U>(x: T): T { return x; }
