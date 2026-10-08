// xl:note SWEEP-linecomment/clsmod 落点（657 审计语料）
// xl:expect Field:2,Bracket,Class,ClassBody,LineAnnotation,MethodBody,MethodDeclaration,Root,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/clsmod）：DRIFT PropertyDeclaration TS[10,43) 产物[10,36) «public static readonly a = //c 1;»
class C { public static readonly a = //c
1; private m() { } }
