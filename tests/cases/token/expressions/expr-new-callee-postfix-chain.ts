// xl:note `new` 的被构造者是一段**后置下标链**时，链与它后面那些后缀都属于**同一条** `NewExpression`
// （TS 的 `parseMemberExpressionOrHigher` 先把 `.成员` / `下标` 整段取成构造者，再看末尾是不是 `(`）。
// 判据落在 `new.xl.md` 的那一问上：**这一段下标收好了没有**——收好了就整段归被构造者。
// 第 937 轮先把 `[` 从 `NewArguments` 里放了出来；第 946 轮按「后面接不接得上后缀」补了一半；
// 第 947 轮实测把那一半推翻（`new ns[a]` 单独一格在 TS 那边也是**被构造者带下标**，
// 见 `gap-r946-new-postfix-index-without-call.ts`），于是这一族只剩「收好了没有」一条判据。
// xl:expect New,NewType,Identifier
const e = new ns
[a]();
const f = new ns // x
[a]();
const g = new ns[a].b;
const h = new ns[a].b();
const i = new ns[a][b]();
const j = new ns[a]``;
const k = new ns[a + 1]();
const l = new ns[a][b](c);
