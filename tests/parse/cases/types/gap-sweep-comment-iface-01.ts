// xl:note SWEEP-comment/iface 落点（657 审计语料）
// xl:expect Identifier:2,TypeDefine:2,AreaAnnotation,Bracket,Field,Interface,InterfaceBody,Keyword,ReturnType,Root,Signature
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-comment/iface）：MISS MethodSignature TS[25,40) «m/*c*/(): void;»
interface I { a: number; m/*c*/(): void; }
