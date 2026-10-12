// xl:note 第 979 轮收掉：根因不在 0b 的链词表（第 977 轮补的 `GenericType` / `ExpressionWithTypeArguments`
//        那两格是对的），而在 **0a 那一支先响**——`callee<…>` 一进来就被投成 `ExpressionWithTypeArguments`，
//        剩下的模板串交给 `foldBinaryFrom` 时**整片丢**。修法在 `projectExpression` 的 0a 里补一档
//        「`callee<…>` 后面紧跟模板串 ⇒ **一条** `TaggedTemplateExpression`」：`<…>` 是**这条标签模板
//        自己的** `typeArguments`（与 `f<T>(1)` 那条 `CallExpression` 同一个口径），标签那一格照旧是
//        被实例化的那个表达式本身。三面（单实参 / 两实参 / 带插值）一次全绿。
// xl:round 977
// 原来登记的那一句：`f<T>`t``——token 层已经认下 `f<T>` 是实例化表达式（`ExpressionWithTypeArguments`），
//        可**投影**没有把它与模板串合成 `TaggedTemplateExpression`——产物是两格平级
//        （`ExpressionWithTypeArguments` + 模板丢掉），TS 那边是**一条** `TaggedTemplateExpression`
//        包着一个 `NoSubstitutionTemplateLiteral`。第 977 轮把 `tagIsPostfixChain`（0b 那一段）的
//        链词表补上了 `GenericType` / `ExpressionWithTypeArguments`，那一支仍然没接上。
// xl:end
const a = f<T>`t`;
