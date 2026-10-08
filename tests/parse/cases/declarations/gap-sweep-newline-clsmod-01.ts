// xl:note SWEEP-newline/clsmod 落点（657 审计语料）
// xl:expect Field:2,Bracket,Class,ClassBody,Identifier,MethodBody,MethodDeclaration,Root,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-newline/clsmod）：DRIFT PropertyDeclaration TS[10,40) 产物[10,23) «public static readonly a = 1;»
class C { public static 
readonly a = 1; private m() { } }
