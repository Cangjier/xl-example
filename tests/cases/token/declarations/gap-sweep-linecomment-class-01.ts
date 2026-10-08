// xl:note SWEEP-linecomment/class 落点（657 审计语料）
// xl:expect Bracket:2,Identifier:2,Keyword:2,Class,ClassBody,ExpressionWithTypeArguments,Field,HeritageClause,LineAnnotation,Root,Statement
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/class）：MISS MethodDeclaration TS[20,41) «m//c () { return 1; }»
class C extends B { m//c
() { return 1; } }
