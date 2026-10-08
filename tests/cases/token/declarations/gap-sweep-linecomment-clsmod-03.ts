// xl:note SWEEP-linecomment/clsmod 落点（657 审计语料）
// xl:expect Bracket,Class,ClassBody,Field,Identifier,LineAnnotation,MethodBody,MethodDeclaration,Root,SemicolonClassElement,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/clsmod）：DRIFT PropertyDeclaration TS[10,43) 产物[10,38) «public static readonly a = 1//c ;»
class C { public static readonly a = 1//c
; private m() { } }
