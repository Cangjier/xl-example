// xl:note SWEEP-linecomment/iface 落点（657 审计语料）
// xl:expect Field:2,TypeDefine:2,Bracket,Interface,InterfaceBody,Keyword,LineAnnotation,MethodDeclaration,ReturnType,Root
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/iface）：DRIFT PropertySignature TS[14,28) 产物[14,16) «a: //c number;»
interface I { a: //c
number; m(): void; }
