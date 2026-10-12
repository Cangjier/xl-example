// xl:note 第 975 轮收掉：`a!()()()!.c`：原来缺 5 漂 1（产物只有一格 `NonNullExpression[0,2)`）——这一格的外壳是 `PropertyAccess`、头一格是「断言盖着一条三层调用链」；入口判据现在认 `NotNull` 那一档，摊开之后链循环用 `innermostCallee` + `graftCallee` 把三层调用与 `.c` 一起接回来。
// xl:round 975
// 第 975 轮清空清单之后换了一批更深的底样（48 条），这一条是其中之一。
// 量法：`node tests/parse/ts-ast.mjs --snippets tmp/r975/survey.mjs`。
// 与 `gap-r975-nonnull-call-assert-index` 同源（都是 `PropertyAccess` 外壳 + 断言那一格），
// 差别是断言的核从实参括号换成了一格 `Method`——两处入手处相同。
// xl:end
a!()()()!.c;
