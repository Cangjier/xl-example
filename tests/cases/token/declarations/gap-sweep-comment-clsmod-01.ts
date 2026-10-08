// xl:note SWEEP-comment/clsmod 落点（657 审计语料）
// xl:expect Bracket:2,Identifier:2,AreaAnnotation,Class,ClassBody,Field,Keyword,Root,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-comment/clsmod）：MISS MethodDeclaration TS[40,60) «private m/*c*/() { }»
class C { public static readonly a = 1; private m/*c*/() { } }
