// xl:title 默认实参里的**函数表达式**（第 882 轮转绿：两条根因都收掉了）
// xl:round 778
// xl:judge stdout
// xl:end
// 第 882 轮：原来的 `xl:want blocked` 撤掉（不再是「还没实现的构造」），缺口原来是
// `function (f: any = function () { return 16; }) { return f.name; }` 整份文件进不来
// （`unimplemented: expression FunctionDeclaration`）。两条根因：
//   ① **投影**（`typescript/tokens/lamda/lamda-parameter.xl.md` 的 `PrintAst`）：
//      默认值那一格走的是「取一格当节点」（`ctx.Project(init)`），**不置
//      `ctx.expressionPosition`** ⇒ 那个 `function () { … }` 被投成 `FunctionDeclaration`；
//      修法是与 `projectBindingElement` 的默认值那一支对齐、改走 `ctx.Expression(...)`。
//   ② **降级**（`typescript-exec/lowering.xl.md` 的 `LowerParamDefault`）：修好①之后名字仍是空的
//      ——JS 的 NamedEvaluation 在 `Initializer : = AssignmentExpression` 那一支上要的是
//      **被绑定名字的文本**（`f.name` 是 `"f"`，判据 `exec/round882/001-param-default-named-evaluation`）。
// 这一条用例留着当守卫（`f.name` 两边都给 `"f"`）。
function withDefault(f: any = function () { return 16; }) { return f.name; }
console.log(withDefault());
