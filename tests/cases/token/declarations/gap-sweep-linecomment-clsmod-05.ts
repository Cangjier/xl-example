// xl:note SWEEP-linecomment/clsmod 落点（657 审计语料）
// xl:expect Bracket:2,Field:2,Class,ClassBody,Identifier,LineAnnotation,Root,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/clsmod）：MISS MethodDeclaration TS[40,59) «private m//c () { }»
class C { public static readonly a = 1; private m//c
() { } }
