// xl:note SWEEP-newline/clsmod 落点（657 审计语料）
// xl:expect Bracket,Class,ClassBody,Field,Identifier,MethodBody,MethodDeclaration,Root,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-newline/clsmod）：MISS PropertyDeclaration TS[40,47) «private»
class C { public static readonly a = 1; private 
m() { } }
