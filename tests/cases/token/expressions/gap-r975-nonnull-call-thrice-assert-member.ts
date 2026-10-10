// xl:known-gap 第 975 轮普查量到：`a!()()()!.c`：缺 5 漂 1——产物只有一格 `NonNullExpression[0,2)`：这一格的外壳是 `PropertyAccess`，头一格是 `NotNull(Method(name=""[Method(name=""[Bracket])]), !)`（「断言盖着一条三层调用链」），入口判据与链循环两处都不认这一形状 ⇒ 三层 `CallExpression`、`PropertyAccessExpression` 与 `Identifier(c)` 一起丢。
// xl:round 975
// 第 975 轮清空清单之后换了一批更深的底样（48 条），这一条是其中之一。
// 量法：`node tests/parse/ts-ast.mjs --snippets tmp/r975/survey.mjs`。
// 与 `gap-r975-nonnull-call-assert-index` 同源（都是 `PropertyAccess` 外壳 + 断言那一格），
// 差别是断言的核从实参括号换成了一格 `Method`——两处入手处相同。
// xl:end
a!()()()!.c;
