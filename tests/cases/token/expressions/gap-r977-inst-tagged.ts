// xl:note `f<T>`t``：token 层已经认下 `f<T>` 是实例化表达式（`ExpressionWithTypeArguments`），
//        可**投影**没有把它与模板串合成 `TaggedTemplateExpression`——产物是两格平级
//        （`ExpressionWithTypeArguments` + 模板丢掉），TS 那边是**一条** `TaggedTemplateExpression`
//        包着一个 `NoSubstitutionTemplateLiteral`。根因量到了一半：第 977 轮把
//        `tagIsPostfixChain`（`print-ast-common.xl.md` 的 0b 那一段）的链词表补上了
//        `GenericType` / `ExpressionWithTypeArguments`，那一支仍然没接上——下一处入手处是
//        **0b 那一段前面那道「哪些单元算后缀链」的入口判据**（它拿到的是投好的节点名）。
// xl:round 977
// xl:known-gap 投影没有把实例化表达式与模板串合成 `TaggedTemplateExpression`（两格平级）
// xl:end
const a = f<T>`t`;
