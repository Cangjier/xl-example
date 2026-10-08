// xl:note D-generics-tuple-mapped 落点（657 审计语料）
// xl:expect Identifier:6,GenericType:2,Statement:2,SymbolToken:2,TypeDefine:2,Keyword,Lamda,LamdaBody,LamdaParameters,Let,Parameter,ReturnType,Root,TypeParameter
// xl:known-gap 注释 / 换行落在语法相邻位置之间（D-generics-tuple-mapped）：MISS ArrowFunction TS[10,43) «async <T,>(x: T): Promise<T> => x»
const f = async <T,>(x: T): Promise<T> => x;
