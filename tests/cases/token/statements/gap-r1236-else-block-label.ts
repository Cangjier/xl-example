// xl:note 第 1236 轮**新登记**、第 1241 轮**转绿**的一格（用户口径 1.1）：`else` 的体里那条标签
// ——而且只有「一行写完、末尾没有分号」那一档。`xl:known-gap` 按规矩撤掉，用例留着当守卫。
//
// 缺口原来是：`if (a) { } else { b: 1 }` 在 TS 里是 `else` + 一个 `Block`，块里是一条**标签语句**
//（`LabeledStatement(b)` 套 `ExpressionStatement(1)`）；产物那一列**缺 3 多 1**——
// 体那个花括号认对了（`<IfBody>` 当场成形），坏在体里面：「名字 + 冒号」没被收成标签，
// 整段 `b: 1` 被一条 `ExpressionStatement` 装走（既没有 `LabeledStatement`、也没有那条表达式语句）。
//
// **分界线是「一行写完 + 末尾没有分号」**（第 1236 轮实测）：`else { b: 1; }`（带分号）
// 与**换行写**的同一形状都**逐节点一致**，只有这一份坏 —— 所以这一格不是「`else` 的体里认不出标签」，
// 而是「标签体什么时候算写完」那一问在**同一行就到体末尾**时答错了。
//
// **根因（第 1241 轮量到底）**：`text-common-util.xl.md` 的 `IsStatementList` 白名单里
// **漏了 `IfBody`** —— `while` / `for` / 函数 / 方法 / 箭头的体都登记了，只有 `if` / `else`
// 的花括号体没登记 ⇒ `IsStatementStart(那个名字)` 在 `IfBody` 里一律给假 ⇒ `LabelCloseRule`
// 收不出标签（缺 3 多 1 逐条对得上）。**带分号 / 换行的那两档为什么碰巧对**：它们会先在解析期
// 收一条 `Statement` 壳，标签规则那一刻看到的父单元是 `Statement`（在白名单里）。
// 补上一格之后 `tmp/r1241-probe.mjs` 的 34 条里 22 条对不上 → **2 条对不上**
//（剩下那两条是同一轮新登记的两个族：标签体以非 `Identifier` 单元开头、
// `IfBody` 里再套一个裸块时外层 `}` 丢区间）。同一片探针还量出**同一格的第二次**：
// `class C { static { b: 1 } }`（`StaticBlock` 也漏登记，`FormTail` 的白名单里却有它）
// —— 补上 `StaticBlock` 之后 `tmp/r1241-probe4.mjs` 6 条**全绿**，两处一起进
// [stmt-r1241-body-statement-list.ts](stmt-r1241-body-statement-list.ts) 当守卫。
// xl:round 1236
// xl:end
declare const a: any, b: any;

if (a) { } else { b: 1 }
