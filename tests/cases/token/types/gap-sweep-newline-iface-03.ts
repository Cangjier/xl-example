// xl:note SWEEP-newline/iface 落点（657 审计语料）
// xl:expect TypeDefine:2,Bracket,Field,Identifier,Interface,InterfaceBody,Keyword,MethodDeclaration,ReturnType,Root,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-newline/iface）：DRIFT MethodSignature TS[25,36) 产物[25,34) «m(): void ;»
interface I { a: number; m(): void
; }
