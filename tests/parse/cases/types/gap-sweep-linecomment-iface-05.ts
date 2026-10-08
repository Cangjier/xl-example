// xl:note SWEEP-linecomment/iface 落点（657 审计语料）
// xl:expect Field:2,TypeDefine:2,Bracket,Identifier,Interface,InterfaceBody,LineAnnotation,MethodDeclaration,ReturnType,Root
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/iface）：DRIFT MethodSignature TS[25,39) 产物[25,29) «m(): //c void;»
interface I { a: number; m(): //c
void; }
