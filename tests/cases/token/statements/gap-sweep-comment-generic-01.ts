// xl:note SWEEP-comment/generic 落点（657 审计语料）
// xl:expect AreaAnnotation,Bracket,Function,FunctionBody,GenericType,Identifier:7,Keyword:2,Parameter,ReturnType,Root,TypeDefine:2,TypeParameter
function f/*c*/<T extends U>(x: T): T { return x; }
