// xl:note 第 947 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// 「`new` 的被构造者是一段**后置下标链**、而这一整段后缀里**没有一次调用**」时，
// 下标被留在 `New` **外面**（`ElementAccessExpression` 的 `expression` 才是那个 `NewExpression`）。
//
// 第 946 轮的判据是「这一段下标**后面接不接得上** `(` / `.` / `[` / 模板」，
// 而这一格正是它的补集；第 947 轮实测把那条判据**整体推翻**了：
// `const a = new A` 换行 `[1]();` 在 TS 那边是**一条** `NewExpression`
// （`expression` 是 `ElementAccessExpression(A, 1)`），不是「两个 `NewExpression` / `CallExpression`」。
// TS 的 `parseMemberExpressionOrHigher` **先整段取「构造者」**（`.` 与 `[]` 一起贪心走完、
// 换行也不让路），**再看末尾是不是 `(`**——有没有那对实参括号只决定 `arguments` 挂不挂，
// **不决定下标归谁**。于是判据只剩「这一段下标**收好了**没有」（`IsClosedBracket`），
// 收好了就整段跨过去、落进 `NewType`，`new ns[a]` 与 `new ns[a]()` 走同一条路。
// 五档：下标是数字 / 标识符 / 字符串，以及下标后面再接 `.成员` / 再接下标。
// xl:expect New,NewType,Identifier
const a = new ns[0];
const b = new ns[x];
const c = new ns["k"];
const d = new ns[0].m;
const e = new ns.a[0];
