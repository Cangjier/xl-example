// xl:known-gap 第 985 轮第十批底样（嵌套宿主）量出：**继承子句里的模板串**——`class D extends `a${X}b` {}` 整条类**没有成形**（产物是 `<Statement><Keyword>class</Keyword>…<Bracket>{}</Bracket>`：缺 `ClassDeclaration` / `Identifier` / `HeritageClause` / `ExpressionWithTypeArguments` / `TemplateExpression` / `TemplateHead` 共 9、漂 0 多 2）。入手处：类头扫描（`class.xl.md` 的 `ClassBranch.ScanHead`）在继承子句里遇到 `String` 单元就停了，`{` 于是没被认成类体。
// xl:note 继承子句里的模板串：整条类都不见了
class D extends `a${X}b` {}
