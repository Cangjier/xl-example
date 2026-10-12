// xl:note 断言那一格的**核是一条成员链**（第 1218 轮，用户口径 1.1）：`` a["b"](d).b! `` 的产物是
// `[PropertyAccess([Identifier(a), Bracket(["b"])]), NotNull([PropertyAccess([Bracket((d)), ., Identifier(b)]), !])]`
// —— 断言里装着「实参括号 + 点号 + 名字」，而投影那条链循环的第四份副本只认「点号 + 名字」，
// 那个 `(d)` 与它后面那位被跳过 ⇒ **那次调用、`d`、外层那格属性访问一起丢**（缺 4 / 缺 3 漂 1）。
// 补两档：核是属性访问 ⇒ 逐格交给 `membersOnto`（认下标 / 实参括号 / 调用 / 里层那条链）；
// 核又是一格 `NotNull`（`` a["b"](d)!! ``）⇒ 交给 `assertedMember` 递回折。
// xl:expect PropertyAccess,Identifier,Method,Bracket,NotNull
const a1 = a["b"](d).b!;
const a2 = a["b"](d)[c]!;
const a3 = a["b"](d)!!;
const a4 = f()[c](d).b!;
const a5 = a.b["c"](d)[e]!;
