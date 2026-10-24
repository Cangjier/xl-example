# HANDOFF — impl-wp3-15（WP-3 第十五波：item 收口「挂起一格」= 已验证中性）

STATUS: PARTIAL（**零净收益**：AST 仍 **6127 / 6167**、cj-fail 0、real-dts 226/226、
buffer 与起点**逐项相同**；本次提交的代码经全量门禁验证为**惰性**，不改善也不倒退）
BRANCH: impl-wp3-15 @ 4421cd7e（源码）+ 本文件
BASE: impl-wp3-14 @ 18324de0

## 0. 一句话结论（给 Lead）

本波把「item 收口过早」这条假设**证伪了一半**，并拿到了下一波真正能用的一条新证据：

> **4 条真回归的收口点不在 `Alive.size === 1` 的 accept 分支，而在 `Alive.size === 0`
> 分支的 `before` 回退里。**（wp3-14 §3.3 的探针只看到 `StatementBuilder` 拿到的 `Units`
> 少一格，没有看到是哪个分支把 `End` 定在了那一格。）

按 accept 分支写补丁（本波提交的 4421cd7e）在全量门禁上是**完全惰性**的：AST 6127→6127、
结构差 34→34、buffer 4481/23/52→4481/23/52。保留它是因为它是「只挂明确可续接形状」的
安全骨架，下一波把同一个判据搬到 `Alive.size === 0` 分支即可复用（见 §4）。

## 1. 本波新增的实测证据（下一波不必重跑）

### 1.1 accept 分支：进得去，但**建不出**

在 `build/ts/.../root-item-rule.js` 的 `if (this.Alive.size === 1) {` 后插一行
`console.error`（只改生成物），解析 `decl-instantiation-line-end.ts`：

```
[A1] len=2 at=1 last=true eof=false
[A1] len=3 at=2 last=true eof=false
...
[A1] len=17 at=16 last=true eof=false     // 17 次，全部 at === code.length-1、eof=false
```

`[A1]` 共 17 次，**而插在 `if (lastAt >= 0) {` 里的 `[HOLDCHECK]` 一次都没打印**
⇒ `shape.IsBuildable(...)` 或 `BuildByKind(...)` 在这一整个文件上**从未成功**，
accept 分支根本没走到收口那一步。`const f = a<b` 的 item 是被**别的分支**收掉的。

### 1.2 真正的收口点是 `Alive.size === 0` 的 `before` 回退

`const f = a < b` 之后 `>` 到来时，13 个根候选在 `>` 上**全部 Reject**（`>` 不能当语句开头），
于是走 `Alive.size === 0` 分支：先按 `;` 试（不是），再 `before = BuildByKind(..., CodeAt[at-1])`
= 用 `a<b` 六个单元建出 `VariableStatement`（初始化为**比较式**）→ 收口到 `b`，
`>` 留给下一格（下一格又是 `>` 开头 → raw）。这与 wp3-14 观测到的「item 只有六个单元」一致。
**该分支下面几行本来就有 `over`（含这一格建）的路径**——把它在 `>` 上先试，就是最直接的修法。

### 1.3 JS 级试补丁：位置对、但上下文不对

把「续接格优先」写进 `Alive.size === 0` 的 `before` 分支（`>` 用 `AngleJudge.CanStart`、
`(` 用 `HasTailNew`），三条文件（decl/gap-instantiation、ex-new-variants）**全部抛**
（`ERR=[object Object]`），prefix-operand-newline 不受影响。说明该分支里
`AngleJudge` / `Bracket` / `units` 的可见上下文与 accept 分支不同，**必须用一次 xl_build
的正式改动来验证**，不能手改生成物（本波手改的 `build/ts` 已用 `tsc` 还原，工作区干净）。

### 1.4 ex-new-variants 的额外事实：`()` 已经在 `code` 里，形状还是在它前面收口

`const e = new a.b.C()`：`[HOLDCHECK] lt=-1 new=true lastAt=5 len=7` —— `HasTailNew(built, ...)`
为真（末尾确实是一个无实参的 `new`），但 **`lastAt = 5` 而 `len = 7`**：即使 `()` 这一格
已经喂进 `code`，`BuildByKind(..., CodeAt[at])` 建出来的形状仍然**停在被构造者**上。
⇒ 这条不只是「收口早一格」，`StatementBuilder` / `ParseNew` 的建造入口也没把 `()` 吃进去；
下一波要么让 `BuildStatement` 的 units 多带一格并让 `ParseNew` 吃空实参表，
要么在 item 层把 `()` 显式并进 `NewExpressionShape`。

## 2. 本波提交了什么（1 个文件，+约 120 行，**惰性**）

`typescript/tokens/items/root-item-rule.xl.md`：

1. 新增 `HoldAt` / `HoldGt` / `HoldLt` / `HoldKind` 四个字段（`Reseed` 里复位）；
2. accept 分支：`lastAt === code.length-1 && !AtEof` 且「末尾吊着未闭合 `<`」或
   「末尾是无实参 `new`」时**挂起一格**（不 `Complete`），下一格到了由
   `TryResolveHold` 收口；
3. `TryResolveHold`：下一格是配对的 `>`（`AngleJudge.CanStart` 判）或被调用者的 `(` 时
   **含这一格**重建；否则按挂起前那一格**原样**收口（与不挂起逐字节相同）；
4. 新增 `LastOpenAngle`（未闭合 `<` 的 `Code` 下标）与 `HasTailNew`（右界正好停在末格的
   `NewExpressionShape`）。

**注意**：它不触发（§1.1），所以不能算「修好了」。它的价值是把「只挂明确可续接形状、
不整体推迟（wp3-12 的 6122→6117 雷区）」写成了可复用的形状，`TryResolveHold` 的
`>` / `(` 两条续接判据可以直接搬到 `Alive.size === 0` 分支。

## 3. 门禁读数（本分支实测，与起点**逐项相同**）

| 项 | 读数 | 判定 |
|---|---|---|
| xl_build（单文件 root-item-rule） | 1 written / 0 error / 0 warning | PASS |
| tsc | exit 0 | PASS |
| AST 全量 | **6127 / 6167**；结构差 34、位置差 33、字段差 0；cj-fail **0** | 与 wp3-14 相同 |
| buffer-equivalence | xml **PASS 4481 / FAIL 23 / ERROR 52**；digest PASS 4373 / FAIL 131 / ERROR 52 | 与 wp3-14 相同 |
| real-dts | 未重跑（本波没碰 .d.ts 路径；上一波 226/226） | — |

4 条真回归**仍然存在**（FAIL 23 没变）：decl-instantiation、gap-instantiation、ex-new-variants、
prefix-operand-newline。

## 4. 下一波的精确落点（按把握排序）

1. **instantiation 两条**：`root-item-rule.xl.md` · `Analyze` 的 `Alive.size === 0` 分支，
   在 `before` 之前加：
   `if (IsSymbolAt(code, at, ">") && at > 0)` → `lt = LastOpenAngle(code, at-1)`；
   `lt >= 0 && AngleJudge.CanStart(units, state.CodeAt[lt] - base)` 成立时
   **直接落到已有的 `over` 路径**（它已经会把 End 反推到 `>` 那一格并 `Watermark = overAt+1`）。
   `units` / `base` 在该作用域里已有定义；`AngleJudge` 已在依赖里（本波加）。
2. **ex-new-variants**：先查 `StatementBuilder` 为什么没吃空实参表（§1.4 的 `lastAt=5 len=7`），
   大概率要动 `statements/statement-builder.xl.md` 的表达式终点，或在 item 层把 `()`
   并进 `NewExpressionShape`（用 `HasTailNew` 判）。
3. **prefix-operand-newline**：与前三条不同族（`--` / `a` / `;` 全 raw）。用同样的探针看
   `a++` 之后 item 在哪一格收口（很可能也是 `Alive.size === 0`），再决定是否动
   `statement-item-rule`。
4. C / D / F / G / H / I 六类**本波一步没动**，状态与 wp3-14 §4 完全一致（照旧引用）。

## 5. 踩过的坑（新增，省一轮）

1. **`[A1]` 进得去 ≠ accept 会收口**：`Alive.size === 1` 每次都会进，但 `IsBuildable` /
   `Build` 可能一直为假。打点要打在 `if (lastAt >= 0)` 里面（本波的 `[HOLDCHECK]`），
   才能区分「没进去」和「进去了但没建出来」。
2. **PowerShell 里 `$diff = (cmd1; cmd2 | Out-String)` 直接语法错**（子表达式里不能这样接 `;`），
   会**整条命令不执行**且只报 ParserError。拆成多行，别把两条 node 塞进一个 `$()`。
3. `tsc` 按时间戳增量：手改过 `build/ts/*.js` 后，删掉那一个 `.js` 再 `tsc` 才会重新生成
   （否则认作最新，`dist` 的干净版本进不去）。本波用它把 1.3 的手改还原了。
4. 手改 `build/ts` 做「位置试验」是快的，但**一旦涉及新 import / 新上下文，手改的版本不可信**
   （§1.3 的 `[object Object]`）——那种探针必须走 xl_build。

## 6. 交付状态

- 分支 tip：`impl-wp3-15`（`4421cd7e` 源码 + 本 HANDOFF 提交）。
- 树可编译：`xl_build` 0 error、`tsc` exit 0；AST / buffer **零倒退**（也是零进步）。
- 改动文件：**1 个** `typescript/tokens/items/root-item-rule.xl.md`（+ HANDOFF）。
- 未 merge、未 push；`dist/` / `build/` 未提交。
