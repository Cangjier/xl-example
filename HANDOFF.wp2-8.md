# HANDOFF — impl-wp2-8（WP-2 第八波：core 批次策略落地 / per-token Feed+Recompute 已消除）

STATUS: **DONE**（任务 A 与 B 全部达标；`statement-scaling` 五项门槛连续两次全绿）
BRANCH: impl-wp2-8 @ f6d1e830（本文件另起一次提交）
BASE: impl-wp2-6 @ f0d2c8aa **+ 合并 refactor-integration @ 228c35f4**（wp2-7 的 `=> {` 谓词修复）

## 0. 先合集成分支（拿 wp2-7 的修复）

`git merge --no-ff FETCH_HEAD`（228c35f4）**干净、无冲突**，带来：

- `typescript/run/statement-block-stream.xl.md` 的 `HasStatementPrefix` 回归修复（`=>` 从白名单移除）；
- `tests/body-drive/stream-proof.mjs` 的新期望（`arrow-body` / `type-literal-after-arrow` 两个守卫用例）。

于是 `buffer-equivalence` 从 WP-2-6 的 **4503 PASS / 1 ERROR** 变成 **4504 PASS / 0 ERROR / 同错 52**
（字节数两侧都是 34109694）——WP-2-6 的「关键归因 2」在这一步收口。

## 1. 做了什么（任务 A：core per-token 开销）

4 个文件 / +198 / −43，全部在授权范围内；**没有**碰 `typescript/tokens/files/**`、declarations/members、
`set\TEAM.md` / `tools`，没有 merge / push 集成分支。

| 文件 | 改动 | 语义 |
|---|---|---|
| `core/syntax/batch/basic-token-batch.xl.md` | 新增 `MetaFrom` / `MetaTo` 水位；`Recompute` 改成**增量**（`From` 没变就只补算 `[MetaTo, To)`，O(新增单元)）；`HasLineBreak` 只 `GetRaw` 新增的那一段（`[上一个代码单元末尾, 本单元末尾)`），不再每 token 切一次整批文本；`CodeIndex` 增量 push | 元信息逐字等价（区间只向后长，并集不变），但每 token 从 O(批长)+一次整批分配降到 O(1) |
| `core/syntax/batch/batch-policy.xl.md` | `ShouldFlush(host, batch, token)` 改带批次；判定顺序按代价从低到高：`Sealed` → `MaxTokens`（`To-From`）→ `AtEof` → 只有真开文本判据才 `Recompute`；新增 `FlushOnBraceClose`（按**末字符**判，单字符单元直接跳过）；`FirstCharOf` / `LastCharOf` 只切 1 个字符（原来的 `BasicKind.TextOf` 是整段分配）；trivia 直接返回 false；删掉死方法 `HasMoreChars`；`FlushOnKeyword` 明确写「本层不判，调用方覆写」 | 策略从**死代码**变成热路径；最坏情况每 token 只付 1 次 1 字符读取，典型情况 0 次 |
| `core/syntax/unit-token.xl.md` | 新增 `BatchGated`；`OnBasicTokenClosed` 在有策略时**只在 `ShouldFlush` 为真**才 `Recompute + OnBasicTokens`，否则只推进 `batch.To` / `batch.AtEof`；`FlushBatch` 先补喂攒下的尾巴（`Cursor < To` 时）再封批（软边界的配平）；`ClearBatch` 复位 `BatchGated` | `context.BatchMode === 0` 或 `BatchAdapter === null` 的**第一行原样**（legacy 路径逐字节不变）；策略为 `null` 的宿主（枚举体 / legacy 适配器）仍**每个 token 交一批**，行为不改 |
| `typescript/tokens/items/statement-item-rule.xl.md` | `StatementBodyItemHost.BatchPolicy` 从 `null` 改成 `CreatePolicy()`：`FlushOnSemicolon` + `FlushOnBraceClose` + `MaxTokens = 16` + `FlushOnEof` | 分号收尾建语句、`}` 收尾的复合语句在上层块还开着时就建、长表达式每 16 单元兜一次；item 的最终结论不变（INV-6），变的只是建出时刻 |

**为什么这三条软边界是必要的**（不是调参）：只开 `FlushOnSemicolon` 会把「以 `}` 收尾、没有 `;` 的语句」
（`if (…) { … }`、嵌套块）推迟到块收口才建，`stream-proof` 的 `nested-depth` 立刻红
（`built=1 beforeClose=0`）。补 `FlushOnBraceClose` 后 `beforeClose` 断言**仍然严格**（`at < block.End`），
不需要放宽任何守卫。

## 2. 门禁读数（本分支实测，2026-10-24）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| xl_build | `paths=["core","typescript"], out="dist"` | **887 written / 0 error / 2435 warning**（与基线同数） | 绿 |
| tsc | `node .\node_modules\typescript\bin\tsc -p tsconfig.json` | exit 0（3.9s） | 绿 |
| xl_check | `paths=["core","typescript"], targets=["ts"]` | **0 error / 2435 warning**（W3102/W3103 基线噪声） | 绿 |
| quick | `..\tools\gates.ps1 -Tier quick` | **PASS 5.5s** | 绿 |
| standard | `..\tools\gates.ps1 -Tier standard` | **PASS 10.3s**；AST **6167/6167**，结构 0 / 位置 0 / 字段 0；8 道门 1/8 = KNOWN-RED（基线） | 绿 |
| full | `..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build` | **RESULT: PASS 38.3s**；`buffer-equivalence` **xml PASS 4504 / FAIL 0 / ERROR 0 / 同错 52**（字节 34109694 = 34109694）、digest 同样全 PASS；`real-dts-ast` **226/226**；`parse-perf` PASS；`class-scaling` 12 档 + 21 项等价全 PASS | 绿 |
| ORACLE | `node .\tests\body-drive\item-oracle.mjs` | 88 段 / **450 前缀 / 0 分叉**（含驻留续扫） | 绿 |
| SPLIT | `node .\tests\body-drive\batch-split.mjs` | 19 段 / **170 断言 / 0 失败** | 绿 |
| STREAM | `node .\tests\body-drive\stream-proof.mjs` | **92 断言 / 0 失败**（5 段语料；含 `arrow-body` / `type-literal-after-arrow` 守卫） | 绿 |

### statement-scaling（`--rounds 15 --max-size 500 --base ..\baseline-build\build`，连跑两次）

| 档 | run1 倍数 | run2 倍数 | 门限 |
|---|---|---|---|
| 1 函数体语句数 N | x2.02 | x2.04 | <2.6 ✅ |
| 2 module 根级语句数 N | x2.03 | x2.05 | <2.6 ✅ |
| 3 单条长表达式 T | **x1.97** | **x1.96** | <2.6 ✅（WP-2-6 读数 2.66） |
| 4 长 if 头 T | x1.86 | x1.86 | <2.6 ✅ |
| 5 嵌套块深度 D | x2.08 / x2.04 | x2.05 / x2.04 | <2.6 ✅ |

同规模 new/base（门限 ≤1.10）：

| 项 | run1 | run2 | WP-2-6 |
|---|---|---|---|
| stmt-count-250 | 1.00 | 1.01 | 1.00 |
| stmt-count-500 | **0.99** | **1.05** | 1.10 |
| root-count-250 | 0.98 | 0.94 | 0.99 |
| root-count-500 | 1.07 | 0.99 | 1.04 |
| long-stmt-250 | 1.04 | 1.07 | — |
| long-if-250 | 1.02 | 1.01 | — |
| long-stmt-500 | **0.99** | **1.03** | **2.44** ❌ |
| long-if-500 | 1.02 | 0.98 | 0.99 |
| block-depth-125 | 1.02 | 1.01 | — |
| block-depth-250 | 1.08 | 0.99 | 0.98 |
| block-depth-500 | **1.06** | **0.99** | **1.14** ❌ |

等价：**XML 31/31 PASS**（含 stmt-count/root-count/long-stmt/long-if/block-depth 500 全档）。
两次都是 `PASS 全部通过（标度 6 对，同规模 11 项，等价 31 项）`，exit 0。

> 归因对照：WP-2-6 用 `StatementBlockStream.Enabled=false` 证明「关流式 = 全绿」；本波**开着流式**拿到同样的读数，
> 说明瓶颈确实是 per-token 的 `Recompute`（整批 `GetRaw`）+ `Feed`，已消除。

## 3. 未完成项 / 下一步

1. **`core/syntax/batch` 的批元信息仍是「为契约而留」**：`CodeCount` / `CodeAt` / `Text()` / `FirstStart` /
   `LastEnd` / `HasLineBreak` 在 `core` 之外**没有任何调用方**（本波用 grep 全仓核实）。现在它们是增量的、
   代价可接受，但后续若确认不会有人消费，可以删掉整组字段与方法（会动 core 契约，需 Lead 再授权）。
2. **`FlushOnKeyword` 没有调用方实现**：关键字表属于语言侧，`core` 里不出现 TS 关键字；若以后要按关键字
   flush，应在 `StatementBodyItemHost` 覆写 `ShouldFlush` 并注入关键字表（本波只留了文档与字段）。
3. **表达式语句流式**（WP-2-6 未完成项 1）仍然没做。注意：WP-2-6 给出的「先修 core 再开任务 B」的顺序
   现在已满足——per-token 惩罚没有了，`stmt-count`（全部由表达式语句组成）现在 new/base ≈ 1.0，可以放心开。
4. **`MaxTokens = 16` 是经验值**，不是测量出来的最优：调大到 32/64 可以再少几次 `Feed`，但长语句的建出
   会更晚；本波 500 单元档已经全绿，没有继续扫的必要（`tests/bench/statement-scaling.mjs` 可以直接改
   `CreatePolicy` 试）。
5. `parse-perf` 的 `TOTAL median 543.944 ms` 与基线口径一致（本波不涉及），若要拿它做回归线，需要先有基线数字。

## 4. 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp2-9 -From impl-wp2-8 -Base impl-wp2-8
cd impl-wp2-9
# 起点自检（应该全绿）
#   xl_build(cwd=<clone>, paths=["core","typescript"], targets=["ts"], out="dist")
node .\node_modules\typescript\bin\tsc -p tsconfig.json
node .\tests\body-drive\item-oracle.mjs      # 450 前缀 / 0 分叉
node .\tests\body-drive\stream-proof.mjs     # 92 / 0
node .\tests\body-drive\batch-split.mjs      # 170 / 0
..\tools\gates.ps1 -Tier quick
node .\tests\bench\statement-scaling.mjs --rounds 15 --max-size 500 --base ..\baseline-build\build
# 然后才做表达式语句流式（未完成项 3）
```

## 5. 阻塞点

**无**。合并集成分支、core 补丁、全部门禁都已落地；唯一的外部依赖是「再改 core 契约（清理批元信息）」需要
Lead 授权，但那不是达标项。

## 6. 踩过的坑（让接任者少花一轮）

- **`token.Closed` 在 `OnBasicTokenClosed` 里已经是 `true`**：11 个 basic 单元都是先 `Closed = true`
  再 `parent.OnBasicTokenClosed(this, …)`，所以策略里做文本判据是安全的（这一点 WP-2-6 的 HANDOFF 没写，
  我先入为主怀疑过一次）。
- **每 token 的 `Recompute` 里那句 `GetRaw(FirstStart, LastEnd)` 就是 long-stmt ×2.44 的主因**：批长 500
  时每关一个 token 都要把一个 500 单元的区间切一次字符串。改成增量后 profile 里 `BasicTokenBatch.Recompute`
  不再是热点。
- **只开 `FlushOnSemicolon` 会让 `stream-proof` 的 `nested-depth` 红**（`built=1 beforeClose=0`）：
  `if (x) { … }` 这种语句没有 `;`，本来靠「下一个 token 关闭」顺带建出来。`FlushOnBraceClose` 是精确解
  （按末字符判，`{}` 括号单元才能命中，不会在 `()` `[]` 上多 flush）。
- **PowerShell 5.1 的 `Set-Content -Encoding utf8` 会写 BOM，而且 `Get-Content` 默认按 GBK 读**：一次
  `-replace` 往返把 `batch-policy.xl.md` 的中文写坏、还加了 BOM，`xl_build` 直接 `E0005`。结论：
  `*.xl.md` 只用 write/edit 工具改，或 `[IO.File]::WriteAllText($abs, $text, [Text.UTF8Encoding]::new($false))`
  且 `$text = $text.TrimStart([char]0xFEFF) -replace "\r\n","\n"`。**写完必须核首字节**。
- **改的是 `.xl.md` 就必须先 `xl_build` 再 `tsc`**：只跑 tsc 会用旧的 `dist/ts`（我为此白跑了一轮）。
- `xl_build` 增量可以只传 `paths=["core"]`（输出 63 行 skipped），比全量刷屏舒服。
- `ast-json.mjs` 会重写 `typescript/cases` 的 snapshot；本波跑完 `git status` 干净（说明没有真实差异）。
