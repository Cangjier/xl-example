// xl:note 继承子句里的标签模板：`extends tag`t``（第 986 轮收掉，第 985 轮登记时缺 4 漂 0 多 0）
// xl:expect ExpressionWithTypeArguments:2,Identifier:2,String:2
// 第 985 轮第十批底样（嵌套宿主）量出：`class D extends tag`t` {}` 在 TypeScript 那边是
// `ExpressionWithTypeArguments > TaggedTemplateExpression`（`tag` 与那个 `NoSubstitutionTemplateLiteral`
// 是父子），而这一格的投影只把名字投进 `expression` ⇒ 模板整格丢。
// 改法：名字后面跟着一个**反引号开头**的 `String` 时就地合成 `TaggedTemplateExpression`
// （判据与值位那一支同源），见 `heritage-clause.xl.md` 的 `ExpressionWithTypeArguments.PrintAst`。
class D extends tag`t` {}
class E implements tag`t` {}
