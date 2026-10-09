// xl:note SWEEP-linecomment/iface 落点（657 审计语料）
// xl:expect Field,TypeDefine,Bracket,Identifier,Interface,InterfaceBody,Keyword,LineAnnotation,ReturnType,Root,Signature
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/iface）：MISS MethodSignature TS[25,39) «m//c (): void;»
interface I { a: number; m//c
(): void; }
