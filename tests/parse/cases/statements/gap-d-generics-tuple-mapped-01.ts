// xl:note D-generics-tuple-mapped 落点（657 审计语料）
// xl:expect Identifier:7,SymbolToken:3,Statement:2,TypeDefine:2,Bracket,Function,GenericType,Let,Parameter,ReturnType,Root,TypeParameter
// xl:known-gap 注释 / 换行落在语法相邻位置之间（D-generics-tuple-mapped）：MISS ExpressionWithTypeArguments TS[40,49) «f<string>»
declare function f<T>(x: T): T;
let g = f<string>;
