// xl:known-gap 第 975 轮普查量到：`a!()![0]`：缺 3 漂 1——产物只有一格 `NonNullExpression[0,2)`：`isCallFirstUnit` 不认「外壳是 `PropertyAccess`、头一格是 `NotNull` 盖着实参括号」这一档（`PropertyAccess[NotNull([Bracket(()) , !]), Bracket([0])]`），链那一支整个进不来。
// xl:round 975
// 第 975 轮清空清单之后换了一批更深的底样（48 条），这一条是其中之一。
// 量法：`node tests/parse/ts-ast.mjs --snippets tmp/r975/survey.mjs`。
// 两处都要补：入口判据（`PropertyAccess` 的头一格要递归问 `isCallFirstUnit`）与
// 链循环里「这一格是 `PropertyAccess`」那一支（`NotNull` 的核是实参括号时先建调用、再套断言）。
// xl:end
a!()![0];
