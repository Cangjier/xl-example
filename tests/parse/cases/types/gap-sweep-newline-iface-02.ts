// xl:note SWEEP-newline/iface 落点（657 审计语料）
// xl:expect Field:2,TypeDefine:2,Bracket,Identifier,Interface,InterfaceBody,Keyword,ReturnType,Root,Signature
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-newline/iface）：MISS MethodSignature TS[25,36) «m (): void;»
interface I { a: number; m
(): void; }
