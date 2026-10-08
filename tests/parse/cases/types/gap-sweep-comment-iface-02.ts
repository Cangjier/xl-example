// xl:note SWEEP-comment/iface 落点（657 审计语料）
// xl:expect TypeDefine:2,AreaAnnotation,Bracket,Field,Identifier,Interface,InterfaceBody,Keyword,MethodDeclaration,Parameter,ReturnType,Root
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-comment/iface）：FIELD MethodSignature [25,40) 产物[name,parameters,type] TS[name,type] «m(/*c*/): void;»
interface I { a: number; m(/*c*/): void; }
