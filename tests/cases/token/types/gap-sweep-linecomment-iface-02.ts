// xl:note SWEEP-linecomment/iface 落点（657 审计语料）
// xl:expect TypeDefine:2,Bracket,Field,Identifier,Interface,InterfaceBody,Keyword,LineAnnotation,MethodDeclaration,ReturnType,Root,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/iface）：DRIFT PropertySignature TS[14,28) 产物[14,23) «a: number//c ;»
interface I { a: number//c
; m(): void; }
