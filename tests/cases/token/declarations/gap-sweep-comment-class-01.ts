// xl:note SWEEP-comment/class 落点（657 审计语料）
// xl:expect Identifier:3,Bracket:2,Keyword:2,AreaAnnotation,Class,ClassBody,ExpressionWithTypeArguments,HeritageClause,Root,Statement
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-comment/class）：MISS MethodDeclaration TS[20,42) «m/*c*/() { return 1; }»
class C extends B { m/*c*/() { return 1; } }
