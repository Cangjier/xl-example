// xl:known-gap 第 985 轮第十批底样（嵌套宿主）量出：**继承子句里的标签模板**——`class D extends tag`t` {}` 在 TypeScript 那边是 `ExpressionWithTypeArguments > TaggedTemplateExpression`（`tag` 与那个 `NoSubstitutionTemplateLiteral` 是父子），而我们的产物把 `tag` 与那个 `String` 平铺在 `ExpressionWithTypeArguments` 下（缺 `TaggedTemplateExpression` / `NoSubstitutionTemplateLiteral` 共 2、漂 0 多 0）。入手处：这一格的投影没有「名字后面紧跟模板串 ⇒ 标签模板」那一档（值位那条链在 `print-ast` 里是有的）。
// xl:note 继承子句里的标签模板：`extends tag`t``
class D extends tag`t` {}
class E implements tag`t` {}
