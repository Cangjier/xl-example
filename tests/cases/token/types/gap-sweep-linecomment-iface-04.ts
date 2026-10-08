// xl:note SWEEP-linecomment/iface 落点（657 审计语料）
// xl:expect TypeDefine:2,Bracket,Field,Identifier,Interface,InterfaceBody,Keyword,LineAnnotation,MethodDeclaration,Parameter,ReturnType,Root
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/iface）：FIELD MethodSignature [25,39) 产物[name,parameters,type] TS[name,type] «m(//c ): void;»
interface I { a: number; m(//c
): void; }
