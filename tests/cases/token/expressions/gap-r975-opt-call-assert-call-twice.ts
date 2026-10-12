// xl:note 第 975 轮收掉：`a?.()!()`：原来漂 1 多 2（投出一格名字叫 `()` 的属性访问、那次调用整格丢）——`assertedMember` 的名称位拿到的是**一对待调用的实参括号**，而它只认「名字」「下标括号」「子链」三档；现在补上实参括号那一档：先建 `CallExpression`、再让 `!` 套在外面，`?.` 挂在那次调用上。
// xl:round 975
// 第 975 轮清空清单之后换了一批更深的底样（48 条），这一条是其中之一。
// 量法：`node tests/parse/ts-ast.mjs --snippets tmp/r975/survey.mjs`。
// 入手处与第 975 轮给 `assertedMember` 补的「核是 `Method`」那一档同一处：
// 实参括号那一档同样要「先建 `CallExpression`、再让 `!` 套在外面」，`?.` 挂在那次调用上
//（TS：`NonNull(CallExpression(Identifier(a) with QuestionDotToken))`）。
// xl:end
a?.()!();
