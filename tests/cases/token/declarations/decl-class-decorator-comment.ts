// xl:note 装饰器与 `class` 之间夹一条注释：注释是 trivia，声明头仍从**装饰器**起算
// （往回走只跳软换行时，起点会落在 `class` 上 ⇒ 整条 `ClassDeclaration` 缺、多一个 `ExpressionStatement`）
// xl:expect Decorator,Class,ClassBody,Identifier
@a /*x*/ @b class C {}
