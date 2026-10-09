// xl:note 块注释里面的换行也是换行：`public` 是一条只有名字的字段（TS 的 ASI 读 hasPrecedingLineBreak）
// xl:expect AreaAnnotation,Bracket,Class,ClassBody,Field,MethodBody,MethodDeclaration,Root
class C { public /*x
y*/ m() {} }
