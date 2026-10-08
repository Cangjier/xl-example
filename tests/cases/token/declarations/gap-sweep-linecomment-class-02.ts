// xl:note SWEEP-linecomment/class 落点（657 审计语料）
// xl:expect Identifier:2,Keyword:2,Bracket,Class,ClassBody,ExpressionWithTypeArguments,HeritageClause,LineAnnotation,MethodBody,MethodDeclaration,Parameter,Root,Statement
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/class）：FIELD MethodDeclaration [20,41) 产物[body,name,parameters] TS[body,name] «m(//c ) { return 1; }»
class C extends B { m(//c
) { return 1; } }
