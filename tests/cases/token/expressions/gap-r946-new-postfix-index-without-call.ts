// xl:known-gap `new` 的被构造者是一段**后置下标链**、而这一整段后缀里**没有一次调用**时，
// 下标该留在 `New` 外面：`new A[0]` 在 TS 那边是
// `NewExpression(expression: A)` 再被 `[0]` 挂一次（`ElementAccessExpression` 的 `expression`
// 才是那个 `NewExpression`，两个区间不同）——与 `new A[0]()`（`New` 包住下标）**不是一回事**。
// 第 946 轮把「后面接得上 `(` / `.` / `[` / 模板」那一半收掉了
// （`IsClosedBracket` + `PostfixIndexRunEnd` 那一问），这一格是它的**补集**：
// 判据要能「撤回」已经收进去的下标，而 `new.xl.md` 的扫描是**一路往前**的
// ——`Process` 返回到 `ReplaceCountAt` 之后那一格已经不是它能改的了。
// 实测（`tmp/r946/sweep.mjs`：20 个底样 × 每个缝隙 × 三种 trivia = 1005 条，
// TS 合法的 630 条里 **68 条**是这一族，全是这一格、不是 68 个根）。
// 修法方向记在这里：把「下标归谁」挪到**投影层**（`NewExpression` 的 `end` 取被构造者的末尾、
// 下标另投一层），别在扫描里做「先收再撤」。
// xl:expect New,NewType,Identifier
const a = new ns[0];
const b = new ns[x];
const c = new ns["k"];
const d = new ns[0].m;
const e = new ns.a[0];
