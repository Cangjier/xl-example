// xl:known-gap 第 975 轮普查量到：`a!()[0]!()`：缺 2 漂 2——第一格 `Method(name="")[NotNull(a!.), Bracket(())]` 里那个 `NotNull` 是**被调用者**（它的实参括号是平级的兄弟），而链循环里「`callHead` 是 `NotNull`」那一支只认**断言盖着调用**的那两档（核是括号 / 核是 `Method`）⇒ 循环在它前面 `break`，`CallExpression[0,4)` 与后面的下标、断言、第二次调用一起丢。
// xl:round 975
// 第 975 轮清空清单之后换了一批更深的底样（48 条），这一条是其中之一。
// 量法：`node tests/parse/ts-ast.mjs --snippets tmp/r975/survey.mjs`。
// 入手处：这一档的被调用者是 `left` 自己，照 `projectNode(这一格)` 投出来就是对的
//（`Method` 自己的 `anonymousCallee` 那一支已经把「`NotNull` 当被调用者」办好了）——
// 差的只是「核不是调用」时不要落进断言那两档。
// xl:end
a!()[0]!();
