// xl:note 第 975 轮收掉：`a!()[0]!()`：原来缺 2 漂 2——第一格里那个 `NotNull` 是**被调用者**（实参括号是平级的兄弟），而链循环「`callHead` 是 `NotNull`」那一支只认「断言盖着调用」那两档 ⇒ 循环 `break`、整段丢；现在补上「核是下标括号」那一档，另加一条兜底（核既不是调用也不是下标 ⇒ 这一格照 `projectNode` 整投，「被调用者带 `!` + 实参表」`Method` 自己那一支早就会办）。
// xl:round 975
// 第 975 轮清空清单之后换了一批更深的底样（48 条），这一条是其中之一。
// 量法：`node tests/parse/ts-ast.mjs --snippets tmp/r975/survey.mjs`。
// 入手处：这一档的被调用者是 `left` 自己，照 `projectNode(这一格)` 投出来就是对的
//（`Method` 自己的 `anonymousCallee` 那一支已经把「`NotNull` 当被调用者」办好了）——
// 差的只是「核不是调用」时不要落进断言那两档。
// xl:end
a!()[0]!();
