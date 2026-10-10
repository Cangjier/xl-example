// xl:note `new` 的被构造者是一段**后置下标链**时，链与它后面那些后缀都属于**同一条** `NewExpression`
// （TS 的 `parseMemberExpressionOrHigher` 先把 `.成员` / `下标` 整段取成构造者，再看末尾是不是 `(`）。
// 判据落在 `new.xl.md` 的那一问上：**这一段下标后面那一格还能不能接下去**。
//   · 接得上 `(` / `.` / `[` / 模板 ⇒ 下标归被构造者（本文件这几行）
//   · 接不上（`new ns[a]` 单独一格）⇒ 下标留在 `New` 外面（TS 也一样，见 `ex-new-variants.ts`）
// 第 937 轮先把 `[` 从 `NewArguments` 里放了出来；第 946 轮补上「归谁」这一半。
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
