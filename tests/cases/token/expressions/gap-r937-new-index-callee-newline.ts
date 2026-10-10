// xl:known-gap `new` 的被调者是**跨行的下标访问**时（`new ns` 换行 `[a]()`），末尾那对 `()`
// 折不成 `Method`：产物是 `PropertyAccess[New, [a]]` 再**平级**跟一个 `Bracket(())`
// ⇒ 缺 `ElementAccessExpression` 1、漂 1、多 3（`new ns // x` 换行 `[a]()` 同格）。
// 第 937 轮收掉的是**点号**那一侧（换行 / 行注释落在 `.` 两边）；
// 下标这一侧这一轮把 `NewCloseRule` 的落点按 `startBracket` 分了岔：
// **`[` 已经不再被搬进 `NewArguments`**（产物里那一格现在是 `PropertyAccess` 里的下标括号），
// 但末尾那对括号仍没被收进 `Method` —— 剩下的一步在 `MethodCloseRule` 与
// `PropertyAccess` 的先后上，不在 `NewCloseRule` 里（试过把 `New` 与 `[` 之间的 trivia
// 一并收掉，`[` 挂上了链、`()` 还是没折，见 `new.xl.md` 那一处注释）。
// 下一轮的第一站：`MethodCloseRule.Previous` 对 `PropertyAccess` 那一步为什么没接手。
// xl:expect New,NewType,Identifier
const e = new ns
[a]();
const f = new ns // x
[a]();
