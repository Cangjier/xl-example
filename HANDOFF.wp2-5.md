# HANDOFF — impl-wp2-5（WP-2 第五波：语句块真流式 + 阶段 2 未做）

STATUS: PARTIAL（任务 A 全部落盘并全绿；任务 B 阶段 2 **未做**，见「未完成项」）
BRANCH: impl-wp2-5（commit 见 `git log --oneline -1`；本文件与前一次提交同分支）
BASE: impl-wp2-4 @ 9da4efe7（起于 refactor-integration @ a5e31a54 + 契约 G0–G6 + WP-1 enum 试点）

## 做了什么

### A1 core 钩子（Lead 已批准的最小面：2 文件 / 9 行）

| 文件 | 改动 |
|---|---|
| `core/syntax/syntax-context.xl.md` | 新增 `## field BracketHook:any = null`（签名 `(bracket:Token, host:Token, context:SyntaxContext)=>void`）+ 8 行说明。**故意用 `any`**：xl 的类型打印器会吃掉函数类型外层括号，`((…)=>void) \| null` 被渲染成「返回 `void \| null` 的函数」，`= null` 直接 TS2322（实测）——可空函数指针在 xl 里没有别的写法 |
| `core/syntax/basic-tokens/bracket.xl.md` | `Transit` 在父单元 `OnBracketCreatedEvent` **之后**加 `if (context.BracketHook !== null) { context.BracketHook(mounted, unit, context); }` + 说明。钩子只挂载、不建 token、不返回状态 → 不可能制造 `Reload`，返回路径逐字未动 |

**BatchMode=0 / 钩子未装配时行为逐字节不变**：`BatchMode=0` 时钩子第一行就 return，且 `UnitToken.OnBasicTokenClosed` 在 `BatchMode===0` 时走 legacy；`BracketHook` 默认 `null` 时 `Transit` 只多一次判空。证据：装配前的 AST 全量就已是 6167/6167（0/0/0）。

### A2 语言侧装配（新文件在 `typescript/run/**`，没碰 `typescript/tokens/files/**`）

- **新增 `typescript/run/statement-block-stream.xl.md`**：`StatementBlockStream` 类
  - `Enabled:bool = true` 总开关（关掉 = 回到 WP-2-4 的闭合后批处理，AST 一定一致）；
  - `Hook(bracket, host, context)`：`BatchMode===0`/开关关 → return；不是 `{ }` → return；
    `bracket.BatchAdapter !== null`（enum/interface/class/module 体已被壳接管）→ return；
    `Wants` 通过才 `bracket.BatchAdapter = new StatementBodyItemHost(body, StatementBodyItemHost.CreateRules())`
    （动作与 WP-1 枚举体 `enum-declaration-shape.xl.md:99` 一致）；
  - `IsStatementContainer`（宿主身份闸）：`host === context.Root`，或 `host` 是 `Bracket` 且它的
    `BatchAdapter instanceof StatementBodyItemHost`（「自己人」判据，树外括号永不误挂）；
  - `HasStatementPrefix`（前缀白名单，**先跳过 trivia 再取 `Data[len-2]`**）：已闭合的 `)` 括号 / `=>` /
    `else` / `try` / `finally` / `do`。额外一条：`switch (…) {` 往前再看一个非 trivia 单元是 `switch` 就**不挂**
    ——switch 体走 `BuildCaseBlock`，语句 item 建进去没人消费。
- **`typescript/run/source-file-runner.xl.md`**：`new SyntaxContext(root, 128)` 之后立刻
  `context.BracketHook = StatementBlockStream.Hook;`，`Process` 之前完成（研究文档推荐的落点）。

### A3 收窄块表（`typescript/tokens/statements/statement-builder.xl.md` 的 `BuildBlock`）

```ts
if (bracket.BatchAdapter !== null) {
  bracket.FlushBatch(this.Context);   // 流式块：item 解析期已建，只补建最后一条收口时才确定的
} else if (this.Context.BatchMode !== 0) {
  this.DriveBodyItems(bracket);       // 非流式块：WP-2-4 的闭合后批处理兜底
}
```

即：**只有挂了宿主的块才走流式**，其余块保留 legacy/兜底循环（研究文档 §4.3 要求的收窄）；`BuildBlock`
后面的「非 basic、非 trivia 单元当子节点」判断不变。`DriveBodyItems` 保留（兜底 + 单测在用）。

### A4 验证资产

- **新增 `tests/body-drive/stream-proof.mjs`**（94 断言全过）：
  1. 挂载时刻 `bracket.Data.length === 0`（早于块内第一个单元关闭）；
  2. 块内 item 由 `StatementItemRule.Build` 在**解析期**建出：建出时刻 `context.Index < bracket.SourceRange.End`；
  3. 该块 `Data` 里已有非 basic 的 item token；
  4. 反面：对象 / 类型字面量、class 体、方法体、switch 体、数组里的对象字面量**一个都不挂**；
  5. **流式路径 == 闭合后批处理路径**：同一语料 `Enabled=true` vs `false` 两次解析，整树 XML 逐字节相同
     （4 段语料全部 789/2705/615/892 字节一致）。
- **`batch-split` 没有新增 `stream` 族**（见「未完成项」4：理由与替代）。

## 门禁读数（本分支实测，2026-10-24）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| xl_build | `paths=["core","typescript"], out="dist"` | **887 written / 0 error** / 2435 warning | 绿 |
| tsc | `node .\node_modules\typescript\bin\tsc -p tsconfig.json` | exit 0 | 绿 |
| quick | `..\tools\gates.ps1 -Tier quick` | **PASS 5.6s** | 绿 |
| standard | `..\tools\gates.ps1 -Tier standard` | **PASS 10.2s**；8 道门 1/8 = KNOWN-RED（基线） | 绿（含已知红） |
| AST statements | `ast-json.mjs statements` + `ast-json-diff.mjs statements` | **412/412**，结构 0 / 位置 0 / 字段 0 | 绿 |
| AST 全量 | `ast-json.mjs` + `ast-json-diff.mjs` | **6167/6167（47 构造）**，结构 0 / 位置 0 / 字段 0 | 绿 |
| STREAM | `node .\tests\body-drive\stream-proof.mjs` | **94 断言 / 0 失败**，4 段语料 | 绿 |
| ORACLE | `node .\tests\body-drive\item-oracle.mjs` | 88 段 / **450 前缀** / **0 分叉** | 绿 |
| SPLIT | `node .\tests\body-drive\batch-split.mjs` | 19 段 / **170 断言 / 0 失败** | 绿 |
| STMT（性能） | `node .\tests\bench\statement-scaling.mjs --rounds 15 --max-size 500 --base ..\baseline-build\build` | **XML 等价 31/31 PASS**；**FAIL 3 项**：档 3 倍数 **3.87**（门限 <2.6）、`stmt-count-500 new/base 1.17`、`block-depth-500 new/base 1.15`（门限 ≤1.10） | 红（见下） |

### 流式性读数（stream-proof 逐块）

| 语料 | 挂载块 | 真流式（解析期建出 item） | 回退旧循环 |
|---|---|---|---|
| `block-and-if` | 2 | 1（f 体：3 条 item，全部 `beforeClose`） | 1（if 体只有 `a = 2;`） |
| `negatives-and-try` | 4（g 体 + try + catch + finally） | 1（g 体：3 条） | 3（try/catch/finally 体都只有 `g();`） |
| `nested-depth` | 3 | 2 | 1 |
| `arrow-body` | 3 | 3 | 0 |

## 关键发现（下一任必须先读）

### D1 xl 不支持「可空函数指针」类型

`## field BracketHook:((…)=>void) | null = null` 会被 xl 打印成 `(…)=>void | null`（返回 `void|null` 的函数），
tsc 报 TS2322、`= null` 不合法。本波改成 `any` 并在注释里写明签名。**以后要类型化，得先给 xl 的 type printer 加括号保留**。

### D2 `host.Data` 尾部是 trivia

`function f() {` 的 `Data[len-2]` 是**那格空格**（`WrapSymbol`），不是 `()` 括号。
前缀判定必须先往前跳过 `IsTriviaToken`（第一版漏了这条 → 0 挂载）。

### D3 表达式语句不流式：`StatementItemScan` 对表达式头返回 `Mismatch`

`StatementItemRule.Classify(['g', '(', ')', ';'])` → `Run` 返回 `Status=2` → `[]`，规则不认领，
引擎把该区间整段 raw（`classify-failed`），`BuildBlock` 的旧循环逐条建。
所以**整块只有表达式语句时该块不流式**（`{ a = 2; }` / `{ g(); }`）。
这不是缺陷、也不是本波引入：wp2-4 的 `Classify` 注释就写着「Mismatch 的头（import / 表达式起头等）返回空数组，让别的规则接」。
真正的解法是给语句族加第二条规则（`ExpressionStatementItemRule`，用 `ExpressionStatementPossibleShape.IsAsiBoundary` 收口），
**本波没做**（不在写范围的工作量内）。当前状态：AST 与流式块走同一个 `BuildStatement`，输出等价（XML 31/31 + AST 6167/6167 已证）。

### D4 性能：新出现的两项 new/base 退化需要安静机器复测

- wp2-4（没有流式）读数：`stmt-count-500 x1.06`、`block-depth-500 x0.97`、档 3 倍数 3.80；
- 本波（有流式）：`stmt-count-500 x1.17`、`block-depth-500 x1.15`、档 3 倍数 3.87。
- **XML 等价 31/31**（含 500 档）说明只是耗时差，不是语义差。
- 可疑成本：流式把「一个块一次 `Feed`」变成「每个 basic token 关闭一次 `Feed`」（`BatchSink.Recompute` +
  `ItemStateCache.Begin/End` 的次数从 O(块) 变成 O(token)）。**未定位到具体行**。
- 本机同时有 `impl-wp3` 在跑（并发构建/门禁），性能读数只作参考；**必须在安静机器上 `--repeat 3` 复测**再决定是否把它算成本波引入。

## 未完成项（逐条，带精确下一步）

1. **任务 B：阶段 2 逐 unit 增量扫描 — 完全没做**（轮次用尽在任务 A 的门禁/资产上）。
   落点与做法不变，见 `HANDOFF.wp2-3.md`「性能代价」：把 `StatementItemScan` 的五个驻留状态
   （`Semi(4)` / `IfHead(9)` / `DeclBody(3)` / `DoBody(14)` / `TryBlock(17)`）改成每 unit 单调推进
   （`ScannedTo` / `Watermark` 只做前缀复用），消除每次 `Analyze` 的 O(前缀)。
   达标判据：档 3 倍数 **< 2.6**、`long-stmt-500 new/base <= 1.10`。当前读数 3.87 / 见上表（未达标，如实记录）。
2. **D3 的表达式语句规则**：新增第二条 `ItemRule`（`ExpressionStatementItemRule`），
   `Classify` 认表达式头、`Analyze` 用 `ExpressionStatementPossibleShape.IsAsiBoundary` + `;` 收口。
   只在 `StatementBodyItemHost.CreateRules()` 里追加，**不动** `StatementItemRule`（oracle 口径不变）。
   然后 `stream-proof` 的 `expectStreaming/expectLegacy` 会变，要同步改期望值。
3. **D4 性能复测**：`node .\tests\bench\statement-scaling.mjs --rounds 15 --max-size 500 --base ..\baseline-build\build --repeat 3`
   （安静机器）。若确认退化，先看 `BasicTokenBatch.Recompute` 是否每 token 全量重算；可以考虑「只在 `Sealed` 时 Recompute」
   或给语句宿主一个 `BatchPolicy` 软边界。
4. **`batch-split` 的 `stream` 族没加**。理由：`statement` 族的语料本来就用 `StatementBuilder.Load` 抓到的
   **块级 Data**（例如 `g(); a = 2;` 那种 7 单元段），它的切点 `k = 1 / N/2 / N-1` 已经在块内部；
   再开一族只是在同一宿主上重复同一断言。流式维度改用 `stream-proof` 第 5 段（`Enabled=true` vs `false` 整树 XML）
   覆盖——它把「流式 vs 闭合后批处理」的切点交给真实解析，比手工 `k` 更强。若 Lead 仍要 `stream` 族：
   把 `FAMILIES` 再加一项、`cases()` 返回抓到的块级段、`makeHost` 先 `host.BatchAdapter = new StatementBodyItemHost(host, …)`
   再交给同一对驱动函数即可（约 25 行，纯配置）。
5. **块以外**的语句容器（`BuildCaseBlock`、`if`/`while`/`for` 体）仍走 `BuildStatement → BuildBlock`，
   因此**已经**享受流式；真正还没接的是 `switch` 的 case 体（有意排除，见 D 前缀白名单）与 module/class 体（WP-3 范围）。

## 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp2-6 -From impl-wp2-5 -Base impl-wp2-5
cd impl-wp2-6
# 0) 起点自检（应该全绿）
#    xl_build(cwd=<clone>, paths=["core","typescript"], targets=["ts"], out="dist")
node .\node_modules\typescript\bin\tsc -p tsconfig.json
node .\tests\body-drive\stream-proof.mjs      # 94 断言 / 0 失败
node .\tests\body-drive\item-oracle.mjs        # 450 前缀 / 0 分叉
node .\tests\body-drive\batch-split.mjs        # 19 段 / 170 断言 / 0 失败
..\tools\gates.ps1 -Tier quick
# 1) 阶段 2（最高价值）：statement-item-scan.xl.md 逐 unit 单调推进 → 重跑
node .\tests\bench\statement-scaling.mjs --rounds 15 --max-size 500 --base ..\baseline-build\build
#    达标：档 3 < 2.6 且 long-stmt-500 new/base <= 1.10
# 2) D3 表达式语句规则 → 改 stream-proof 期望值 → stream-proof + AST statements + standard
# 3) 有轮次再跑 full：..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build
```

## 阻塞点

无外部阻塞。本波**没有**改动 `typescript/tokens/files/**`、module-block / declarations / members、
`set\TEAM.md` / `tools\**`；没有 merge / push。
（`statement-possible-shape` 未删，仍被 root 使用。）

## 踩过的坑（让接任者少花一轮）

- **xl_build 的输出巨大**（全量 ~380KB / 2300+ warning 行），增量（`paths=["typescript"]` 或 `["core"]`）小得多；
  本波 core 与 typescript 分两次增量构建。
- **`ast-json.mjs` 会重写 `typescript/cases` 的 snapshot**：跑完必须 `git checkout -- typescript/cases`。
- **`xl_build` 里 0 error 不等于 `tsc` 绿**：函数类型那一条只有 tsc 会报（TS2322）。每次改完 `.xl.md` 都要 `tsc`。
- **`UnitToken.OnBasicTokenClosed` 的 `last = Data.length - 1`** 是新 token 的下标，`batch.Reset(this, last, …)`
  每批从最新一格起；块内**最后一条没有 `;` 的语句**不会被 `Feed` 建出，由 `BuildBlock` 的 `FlushBatch` 用
  `Engine.Flush` 的 `incomplete` 分支留给 legacy —— 这是设计内行为，不是丢语句（XML 31/31 已证）。
- **`Bracket.Close` 只问父单元**：语句块括号关闭时父单元是 `Root`/外层 `Bracket`（没有 `FlushBatch` 调用者），
  所以流式块的收口必须在 `BuildBlock` 里做（本波就是这么做的），不要指望块自己 flush。
- **调试挂载点最省时间的办法**：临时把 `context.BracketHook` 换成打印函数（host 类名 / `isRoot` / `Data` 尾部的
  非 trivia 单元 / `Wants` 返回值），一次解析就能看清哪个 `{` 被判成什么。
