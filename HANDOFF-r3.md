# HANDOFF — R3：R1 剩余边界与工具修复

分支 `feature/possible-statement-r3`，基线 `feature/possible-statement` @ **29367ad1**（主仓库，R2 的 `6b077c05` 已在其历史里）。
本分支从基线 clone 出来，**未 merge** R2 的独立分支（不需要：基线已含 R2 的三条判据）。

改了什么（4 处文件，3 处生产逻辑 + 2 个工具 + 1 组 cases）：

| 文件 | 改动 |
|---|---|
| `typescript/tokens/statements/expression-statement-possible-shape.xl.md` | 新增 `IsExpressionPositionBefore`（+30 行）；`IsUncontinuableTailBoundary` 增「对象字面量收尾」分支（+7 行）；`ExpectsBodyBefore` 增可选下界 `fromIndex`（+6 行） |
| `typescript/tokens/statements/statement-scanner.xl.md` | `ScanExpressionBody` 增「体的终点是下一条块语句的 `{`」（+13 行） |
| `typescript/tokens/declarations/export-declaration-possible-shape.xl.md` | `export const/let/var` / `export declare` 的无分号收口改为 `EndsAtLineBreakBefore(...) \|\| IsUncontinuableTailBoundary(...)`（+5 行） |
| `tests/statement-possible/r1-cases.json` | `r1-asi` 组 15 → **31** 条 |
| `tests/statement-possible/r2-counterfactual.mjs` | CJS → ESM，**首次可运行** |
| `tests/statement-possible/perf.mjs` | 加 `--warmup`（默认 2）+ 预热后中位数 |
| `tests/statement-possible/r3-probe.mjs` | 新增诊断脚本（28 形态逐节点对拍，非门禁） |

**未动**：`StatementBoundaryUtil.IsAsiBoundary` 函数体（FROZEN 遵守）、`statement-boundary-util.xl.md`、`statement-builder.xl.md`、`StatementScanner.EndsAtLineBreak`。

## 1. 逐项根因与修法

### ① `if (a) b` ⏎ `{}` — THROW → MATCH

**根因（不是 R2 判据不够，是判据没被调用）**：if 体走 `ScanIf → ScanBody → ScanExpressionBody`，而 `ScanExpressionBody` 只读 `EndsAtLineBreak`（三条件 + 调用位），**从不调用** `ExpressionStatementPossibleShape.IsUncontinuableTailBoundary`。R2 的「换行 + `{` 块起点」判据只在 `ScanToSemicolon` 与 `StatementBuilder` 里，控制流体这条路完全没接。于是体扫描一路吃到 EOF，把 `{…}` 并进体，`ExpressionBuilder` 报「语句没有读完」。

**还有第二层**：即使接上 R2 判据也不够——`ExpectsBodyBefore` 从收尾单元往回扫，`if (a) b` 里的 `if` 在 `IsBodyExpectingHead` 白名单里，会被判成「头还在等体」，于是 `{` 被当成 if 的体、不收口。**但扫描体时 `at` 就是体起点**，`if` 是这条语句自己的头、体已经给了；它不该参与「等体」判断。

**修法**：
1. `ScanExpressionBody` 循环里加一条：当前单元是 `{` 括号、`bodyTail`（跳过 trivia 的上一代码单元）能收住表达式、且 `ExpectsBodyBefore(code, bodyTail, at)` 为假 ⇒ `Complete(bodyTail)`。
2. `ExpectsBodyBefore` 增可选 `fromIndex`（缺省 0）作为回扫下界；`ScanExpressionBody` 传 `at`。`if (a) function f ()` ⏎ `{ }` 的 `function` 正好在 `at` 上，仍在界内 → 仍判等体，函数体不被切断（实测 MATCH）。
3. 不要求换行：`if (a) b { }` 在 TS 里同样是 if + 块两条语句（`{` 在一条完整表达式后面**永远不是续接符**）。实测 CJ 的 AST 与 TS 的**恢复 AST** 一致，但 TS 自身对该源码报 1 个语法诊断（harness 按恢复路径 skip），故不做门禁 case。

同源一并修好（同一函数）：`while (a) b` ⏎ `{}`、`for (;;) b` ⏎ `{}`、`lbl: b` ⏎ `{}`。

### ② `const o = { a: 1 }` ⏎ `{ b: 2 }` — THROW → MATCH

**根因**：与 ① 不同源。这条走根层 `ScanToSemicolon`，R2 判据**有**被调用，但第一道门 `CanEndExpression(units[previous])` 对 `{…}` 括号返回 **false**——`CanEndExpression` 有意不认 `{`（它分不清对象字面量与裸块，见 `IsExpressionTail` 的注释）。所以对象字面量永远过不了这道门。

**修法**：不放松 `CanEndExpression`（那会踩 R2 风险 2 的返回类型字面量），而是在 `IsUncontinuableTailBoundary` 里加一条更窄的分支：上一单元是 `{…}` 括号 **且** 它坐在**表达式位**（`IsExpressionPositionBefore`：前一代码单元是 `=` `(` `[` `,` `?` `=>` 或 `return`）。`let a: { x: number }` 的 `{` 前是 `:`，不在白名单 → 不收口，返回类型字面量的函数体保持不被切断。

实测同时修好：`function f() { return { a: 1 }` ⏎ `{ b; } }`（return 操作数是对象字面量）。

### ③ `export let a=1` ⏎ `{}` — DIFF（少一条 BlockStatement）→ MATCH

**根因**：export 家族的无分号收口只读 `StatementScanner.EndsAtLineBreakBefore`（`export-declaration-possible-shape` 的 Stage 13），`{` 在续接表里 → 不收口；`{…}` 被并进导出声明后被丢弃，根层只剩 7 个节点（TS 8 个）。

**修法**：收口条件改成 `EndsAtLineBreakBefore(units, index) || IsUncontinuableTailBoundary(units, index)` —— 扫描器与建造器共用同一个判据，天然与根变量语句一致。只影响 `Kind===4|12`（`export const|let|var` / `export declare`）。

### ④ `x = 1` ⏎ `{}` 的 pos/end 字段差 —— 定位完成，**不是块/表达式区间问题**

**证据链**：
- 顶层切分是**对的**：`x = 1` ⏎ `{}` → `["ExpressionStatement","Block"]`；`x = 1` ⏎ `{ y; }`、`o = { a: 1 }` ⏎ `{ b; }` 同。
- 第一个差异出现在**第一条语句内部**：`#4 depth=3 kind: cj="FirstAssignment" ts="EqualsToken"`。
- 把块去掉，`x = 1;` 单条产生**完全相同**的首个差异；`let = 1;`（declaration-cases 的 `let-as-identifier`）也是同一个差异。

⇒ 根因是**赋值表达式的 AST 节点命名**（CJ 用 `FirstAssignment` 别名壳，TS 用 `EqualsToken`），与 ASI/块边界无关，属既有缺陷，本轮**不修**（修它要动赋值表达式的建树，超出「最小」且会改 6167 条语料的 AST 口径）。

### ⑤ `r2-counterfactual.mjs` 不可运行 —— 已修

原文件是 `.mjs` 却写 `const path = require("path")` → 直接 `ReferenceError: require is not defined`，R2 报告里的对照表从未真正跑出。
改为 ESM：`import` + `createRequire(import.meta.url)` 加载 `build/ts` 的 CJS 产物；`r1-cases.json` 按 `import.meta.url` 定位（原来依赖 `process.cwd()`）。
实测输出：`cases=31 changed-by-fix=12`（表见 §4）。

### ⑥ `perf.mjs` 单次采样噪声 —— 已修

加 `--warmup`（默认 2 轮，不计入样本）+ 保留 5 次取中位数。口径变化：**从「首轮含模块加载/JIT 冷启动的中位数」变成「热态中位数」**，所以本轮读数**不能**与 R2 报告直接相减比较。同一台机器同一份 build：long `5.87ms → 3.92ms`、many `31.70ms → 26.08ms`，降低的部分主要是冷启动与预热轮，不是本次判据带来的性能变化（新判据只在「当前单元是 `{`」时触发，`long`/`many` 语料里 `{` 极少，`candidateCalls` 仍为 34 / 34017，与 R2 同量级）。

## 2. 28 形态前后表（`tests/statement-possible/r3-probe.mjs`，shell=true，与 `ts.createSourceFile` 逐节点对拍）

| # | 形态 | 修复前 | 修复后 |
|---|---|---|---|
| 1 | `if (a) b` ⏎ `{}` | THROW 语句没有读完 | **MATCH** |
| 2 | `if (a) b` ⏎ `{ c; }` | THROW 语句没有读完 | **MATCH** |
| 3 | `if (a) b {}`（同行） | THROW 表达式没有读完 | **MATCH**（TS 自身有语法诊断，不做门禁） |
| 4 | `if (a) b;` ⏎ `{}` | MATCH | MATCH（对照） |
| 5 | `if (a) b` | MATCH | MATCH（对照） |
| 6 | `if (a) {}` ⏎ `else {}` | MATCH | MATCH（对照） |
| 7 | `while (a) b` ⏎ `{}` | THROW 语句没有读完 | **MATCH** |
| 8 | `for (;;) b` ⏎ `{}` | THROW 语句没有读完 | **MATCH** |
| 9 | `lbl: b` ⏎ `{}` | THROW 语句没有读完 | **MATCH** |
| 10 | `if (a) function f ()` ⏎ `{ }` | MATCH | MATCH（对照：等体） |
| 11 | `if (a) class A` ⏎ `{ }` | MATCH | MATCH（对照：等体） |
| 12 | `const o = { a: 1 }` ⏎ `{ b: 2 }` | THROW 表达式语句没有读完 | **MATCH** |
| 13 | `o = { a: 1 }` ⏎ `{ }` | DIFF（赋值壳） | DIFF（既有，见 ④） |
| 14 | `function f() { return { a: 1 }` ⏎ `{ b; } }` | THROW 表达式没有读完 | **MATCH** |
| 15 | `export let a=1` ⏎ `{}` | DIFF（7 节点 vs 8） | **MATCH** |
| 16 | `export const a=1` ⏎ `{ b; }` | DIFF（7 vs 10） | **MATCH** |
| 17 | `x = 1` ⏎ `{}` | DIFF（赋值壳） | DIFF（既有，见 ④） |
| 18 | `x = 1` ⏎ `{ y; }` | DIFF（赋值壳） | DIFF（既有，见 ④） |
| 19 | `x = 1;` | DIFF（赋值壳） | DIFF（**对照：证明 ④ 与块无关**） |
| 20 | `let a = 1` ⏎ `{ b; }` | MATCH（R2 已修） | MATCH（未回归） |
| 21 | `const f = function ()` ⏎ `{ }` | MATCH | MATCH（对照） |
| 22 | `const f = () =>` ⏎ `{ }` | MATCH | MATCH（对照） |
| 23 | `let a: {` ⏎ `x: number` ⏎ `} = { x: 1 }` | MATCH | MATCH（对照：类型字面量） |
| 24 | `{ b; }` ⏎ `let a = 1` | MATCH | MATCH（对照） |
| 25 | `{}` | MATCH | MATCH（对照） |
| 26 | `a` ⏎ `{}` | MATCH | MATCH（对照） |
| 27 | `do b` ⏎ `{}` `while (a);` | THROW 表达式语句没有读完 | THROW（未覆盖，见 §5-1） |
| 28 | `const g = () => 1` ⏎ `{ }` | THROW 表达式语句没有读完 | THROW（未覆盖，见 §5-2） |

合计：**失败 16/28 → 6/28**；其中 4 条是同一个既有赋值壳 DIFF（含 1 条对照），2 条是明确未覆盖。

## 3. 专用 cases（`r1-cases.json`，组 `r1-asi`，31 条）

`forceShell=true` + `skipLegacyCompare=true`，每条都与 `ts.createSourceFile` 逐节点对拍、且同一源码两次 Parse 的 XML 必须逐字节相同（harness 自带确定性检查）。

- 坏形 12：R2 的 3 条 + `r3-if-body-block` / `-block-stmt` / `r3-while-body-block` / `r3-for-body-block` / `r3-label-body-block` / `r3-object-then-block` / `r3-return-object-block` / `r3-export-decl-block` / `r3-export-const-block` / `r3-export-object-block`
- 对照 19：函数表达式 / 箭头块体 / 类型字面量 / 控制头等体 / 分号收口 / 同行 if 块 / if-else / 对象后接声明 / export 函数体与箭头体 / 空语句 / 类体 / 接口体 …
- 修剪 3 条（脚本 `r3-fix-cases.mjs`，已删，理由写进组 description）：
  - `r3-if-body-block-sameline`：TS 自身语法诊断，harness skip，不做门禁；
  - `r3-object-then-block-assign`：命中既有赋值壳 DIFF（`o = { a: 1 }` 单条同样 DIFF）；
  - `r3-ctrl-type-object`：既有缺陷（中和 R3 对象判据后仍 THROW，见 §5-3）。

读数：`[group] r1-asi: pass=31 fail=0 skip=0 uncovered=0`（R2 时为 15/0）。

## 4. 有/无修复逐条对照（`r2-counterfactual.mjs`，首次可运行）

中和方式：`ExpressionStatementPossibleShape.ExpectsBodyBefore = () => true`（= 精确回到 R2 之前）。
`cases=31 changed-by-fix=12`，逐条：

| case | WITH | WITHOUT |
|---|---|---|
| r1-bare-block / r1-empty-block / r1-decl-block | MATCH | THROW 表达式语句没有读完 |
| r1-declare-decl | MATCH | THROW 表达式语句没有读完 |
| r3-if-body-block / -block-stmt | MATCH | THROW 语句没有读完 |
| r3-if-body-block-sameline（已从 cases 移除，脚本内仍可见） | MATCH | THROW 表达式没有读完 |
| r3-while-body-block / r3-for-body-block / r3-label-body-block | MATCH | THROW 语句没有读完 |
| r3-export-decl-block / r3-export-const-block | MATCH | THROW 表达式语句没有读完 |
| 其余 19 条（对照 + 对象字面量族） | MATCH | MATCH |

注意：`r3-object-*` 的 WITHOUT 列不变红，因为「对象字面量收尾」判据不经过 `ExpectsBodyBefore`，脚本表尾已注明。

## 5. 全表回归（本目录，同一份 build/ts）

| 项 | 读数 |
|---|---|
| `xl_build`（core+typescript → ts） | **890 written, 0 error**（本轮首跑 890，改后 3 written / 887 up-to-date；2522 warning 为既有 W3102/W3103） |
| `xl_check` | **890 files, 0 error**, 2522 warning |
| `tsc -p tsconfig.json` | **exit 0** |
| harness `--all` | pass=**101** fail=0 known=**1**，groups run=8 skipped=3 |
| harness `--double-accept` | 冲突 **0**，cases=120 failed=0 |
| harness `--lint` | **PASS**（ASI 实现唯一 / 优先级数字表只在 operator-table） |
| `--group=r1-asi`（31 条） | pass=**31** fail=0 |
| `--group=dev` | pass=**22** fail=0 |
| `--group=operators-live` | pass=**40** fail=0 |
| `--group=stage4b` | pass=**17** fail=0 |
| `--group=stage4c` | pass=**42** fail=0 |
| `--group=stage4c2` | pass=**33** fail=0 |
| `--group=stage5c`（任务给的口径） | **skipped=1**：`declaration-cases.json` 里没有这个分组名，见 §5-8 |
| `declaration-cases.json` 21 条（自建对拍，口径同 harness） | pass=**20** / fail=**1**（`let = 1;`，既有赋值壳） |
| `op-ast-proof.mjs` | **90/90 PASS** |
| `op-proof.mjs` | **40/40 PASS** |
| `control-flow-takeover.mjs` | **39** cases, failed=0 |
| `block-body-takeover.mjs` | **21** cases, failed=0 |
| `s4j-function-body.mjs` | **PASS**（exit 0） |
| `s4l-await-body.mjs` | **19** cases PASS（exit 0） |
| `tests/parse/validate.mjs` | **1720 条用例，0 条不合格** |
| `typescript/cases/ast-json.mjs` | **6167/6167**，`git status --short typescript/cases` **为空**（产物与基线逐字节等价） |
| `ast-json-diff.mjs` | 结构差 0 / 位置差 0 / 字段差 0（无 gap） |
| `token-ast.mjs` | total=**1716** ok=**1706** crash=0 diff=**0** ts-invalid=**10** |
| `real-dts-ast.mjs` | **226/226** AST 完全一致，差异 0 |
| `tests/feas-operator/harness.mjs` | **6/6 PASS** |
| `insert-between.test.mjs` | **9/9 PASS** |
| `perf.mjs` | long n=300 median **3.92ms**（R2 5.87，含预热口径差）；many 2000 median **26.08ms**（R2 31.70）；scale 0.64 / 1.26 / 3.61ms，ratio 1.97 / **2.87**（WARN 阈值 2.5，n=400 一档偏低样本噪声，未判失败） |

**stage5c 口径差异（必须记录）**：`tests/statement-possible/declaration-cases.json` 是**裸对象数组**（21 条 `{name, source, takeover, declarations}`），而 `harness.mjs` 的 `--file` 数组分支假定元素是**字符串**（`parsed.map((source) => ...)`），于是 `createSourceFile` 收到对象 → `TypeError: s.codePointAt is not a function`。这是**文件格式与 harness 口径不兼容**（两者本轮都未改），不是解析回归；因此用与 harness 相同的 `cjAst/tsAst` 对拍口径单独跑了 21 条：20 pass / 1 DIFF（`let = 1;`，同 §1-④）。

## 6. 未覆盖清单

1. `do b` ⏎ `{}` `while (a);` 仍 THROW —— do 体按新判据先收在 `b`，随后 `ScanDo` 期望 `while` 却看到块，整条 do 候选 Mismatch。该形态在 TS 里会被恢复成 do + 块 + while，属**非法/恢复形**，本轮不碰。
2. `const g = () => 1` ⏎ `{ }` 仍 THROW —— 前缀有 `=>`，`ExpectsBodyBefore` 回扫判「等体」保守不动（R2 既有取舍）。
3. `const f = function (): { a: number }` ⏎ `{ }` 仍 THROW —— 类型字面量收尾，`:` 不在表达式位白名单。**证据**：把 `IsExpressionPositionBefore` 中和为 `() => false` 后同 THROW（with/without 都 THROW），且该分支的 `:` 排除使其不可能触发 ⇒ 既有缺陷。
4. `export declare const x: { a: number }` ⏎ `{}` 未单测（同上，类型字面量收尾保守）。
5. `export default { a: 1 }` ⏎ `{}`（Stage 22 的 `IsStatementBoundaryAfterExpression`）未接对象判据 —— 本轮只改 Stage 13（变量/declare 导出）。
6. 带行注释 / 块注释的换行变体（`let a = 1 // c` ⏎ `{ b; }`）未单列 case，只由 `--all` / ast-json 全量语料间接覆盖。
7. `if (a) b {}`（同行块）不做门禁：TS 自身报语法诊断，harness 按恢复路径 skip；实测 CJ 恢复 AST == TS 恢复 AST。
8. 赋值表达式 `FirstAssignment` vs `EqualsToken` 全族 DIFF（`x = 1;` / `let = 1;` / `o = {…}`），未修。
9. `declaration-cases.json` 21 条无法通过 harness 的 `--file` 直接跑（§5 说明），只能自建同口径对拍。

## 7. 风险

1. **同行 `{` 也收口**：判据不要求换行（`if (a) b {}`）。依据是「`{` 在一条完整表达式之后永远不是续接符」。若将来把 `ScanExpressionBody` 复用到新语法位置（例如装饰器表达式、`using` 初始化），需复核这条假设。
2. **`ExpectsBodyBefore` 的 `fromIndex` 是控制流专用下界**：只有 `ScanExpressionBody` 传；其它调用方（`ScanToSemicolon` / `StatementBuilder`）不传 ⇒ 行为与 R2 完全一致（这也是 double-accept 0 冲突、lint PASS 的机械证据：扫描器与建造器仍共用一个函数）。
3. **对象字面量判据靠「前一格白名单」**（`=` `(` `[` `,` `?` `=>` `return`）：新语法（`satisfies` 后的对象、装饰器实参等）不在表内会退化成「不收口 → THROW」，是保守失败而不是错解。`:` 有意排除，专门保住返回类型字面量。
4. **export 路径新增 OR**：`export declare const x = …` ⏎ `{` 现在也会在块前收口。实测 `r3-export-*` 5 条 + 全量 6167/real-dts 226/token-ast 1706 无回归，但「declare + 初始化器」本身就是 TS 报错形态，属恢复路径，行为变化需要知道。
5. **perf 口径变更**：加了 warmup，读数与 R2 不可直接相减；`scale 400/200 = 2.87 > 2.5` 触发了脚本自带的 WARN，本轮判定为 n=400 一档的采样噪声（0.64/1.26/3.61 的绝对量都在 4ms 内），未改判。
6. **两个工具的改动不影响门禁**：`r2-counterfactual.mjs` 与 `perf.mjs` 都不在 `--all` 里；`r3-probe.mjs` 是诊断脚本（非门禁），故意保留以便下一轮复跑 28 形态。

## 8. 复现

```powershell
# 构建 + 编译
#   xl_build / xl_check（targets=["ts"], paths=["core","typescript"]）→ 0 error
node node_modules/typescript/bin/tsc -p tsconfig.json

# 本轮专用
node tests/statement-possible/r3-probe.mjs                       # 28 形态前后表
node tests/statement-possible/harness.mjs --file=tests/statement-possible/r1-cases.json --group=r1-asi
node tests/statement-possible/r2-counterfactual.mjs              # 首次可运行：cases=31 changed=12
node tests/statement-possible/perf.mjs                           # warmup=2 的热态中位数

# 全表
node tests/statement-possible/harness.mjs --all
node tests/statement-possible/harness.mjs --double-accept
node tests/statement-possible/harness.mjs --lint
node tests/parse/validate.mjs
node typescript/cases/ast-json.mjs ; git status --short typescript/cases ; node typescript/cases/ast-json-diff.mjs
node typescript/cases/token-ast.mjs
node typescript/cases/real-dts-ast.mjs
```
