# HANDOFF — impl-wp3-31（WP-3 第三十一波：模板标签三条修好，AST 6162→6165）

STATUS: **PARTIAL / 净正（AST +3）**。6162 → **6165 / 6167**（结构差 5→**2**、位置差 4→**1**、字段差 0、cj-fail 0）。
本波修好 **#13 / #15 / #61（模板标签 TaggedTemplateExpression）**；**#86（BOM）**定位到 root 尾部/
item 区间口径但未修；**#81（`type T = A` 续行）**未动（wp3-30 的证伪结论仍然成立，见 §3.1）。

BRANCH: impl-wp3-31
BASE: impl-wp3-30 @ 54b7e9f8
COMMIT: 439486a4（源码）+ 本 HANDOFF 的文档提交

## 0. 读数（本分支实测，2026-10-24）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| 起点复现 | xl_build + tsc + ast-json + diff | 6162/6167；结构 5 / 位置 4 / 字段 0；cj-fail 0 | 与 wp3-30 逐项相同 |
| 本波终值 | 同上 | **6165/6167**；结构 **2** / 位置 **1** / 字段 0；cj-fail 0（6167/6167） | **+3**，无回退 |
| real-dts | `real-dts-ast.mjs` | 226 成功 / 226 一致 / 崩溃 0 | PASS |
| quick | `..\tools\gates.ps1 -Tier quick` | PASS（5.6s） | PASS |
| standard | full 档内的 standard 段 | AST 全量 PASS、body-guide 全量 PASS、tests/gates 1/8（基线 KNOWN-RED） | PASS |
| full | `..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build` | 42.5s；real-dts/parse-perf PASS；**3 项红**：buffer-equivalence、class-scaling(measure)、class-scaling --base | AST 硬门 PASS |
| buffer（base=baseline-build） | 同上 | xml **PASS 4489 / FAIL 15 / ERROR 52**；digest **PASS 4385 / FAIL 119 / ERROR 52** | 与 wp3-30 **逐项相同**（未倒退） |
| xl_check | core+typescript | **0 error / 2414 warning** | PASS |

剩余 2 条结构差（位置差 1）：**#86、#81**（#13/#15/#61 已消）。`class-scaling(measure)` 的
「档 C 装饰器成员长度 ×4.02 ≥ 2.6」是**计时噪声**（同波 wp3-30 未红、本波代码不涉及成员长度路径），
重跑一次通常回到 2.5 以下；`class-scaling --base` 的 same-line 错误差异是早期错误恢复波次的既存差异。

## 1. 源码改动（1 个文件，2 处）

### `typescript/tokens/items/root-item-rule.xl.md` — #13 / #15 / #61

**根因不是 `ScanToSemicolon`，也不是 `BuildVariableStatement` 的终点扫描，而是 `RootItemRule.Analyze`
的 ① 分支（Alive 全灭 → 按「不含这一格」收口）。** 实测打点（临时给 `build/ts/**/root-item-rule.js`
加 `console.error`，未进提交）：

```
#13 const t1 = f<T>`t`
[an] len=7 ... alive=1            ← 第 7 格 `>`：IsBuildable=false，不收口
[an] len=8 ... alive=1
  at=7 String alive=1
   (1) covers=true tailEmpty=false contCall=false   ← ① 分支：按 `>` 收口
```

即：模板 token 到达时候选全灭，`continuesCall` 只覆盖**跨行**调用位（判据里有
`!NoLineBreakBetween(...)`），同一行的模板因此被当成「下一条语句的开头」，语句收口在 `>`。

修法（两处）：

1. `Analyze` 的 `continuesCall` 增加一项：`|| this.ContinuesTagOrCall(code, at, base, units, state.CodeAt)`；
2. 新增 `private method ContinuesTagOrCall`：**同一行**上的「标签模板 / 调用」续接——
   - `code[at]` 是反引号 `String`、`code[at-1]` 是 `>`、`LastOpenAngle` 找到的 `<` 由
     `AngleJudge.CanStart` 认定为类型实参段 ⇒ 续接（`f<T>` + 模板 = TaggedTemplateExpression）；
   - `code[at]` 是 `(` Bracket、`code[at-1]` 是反引号 `String` ⇒ 续接（模板后同一行的 `()` 是调用）。
   两条都先过 `StatementScanner.NoLineBreakBetween`（跨行仍走老的 `EndsAtLineBreak` 判据）。

于是 ① 不再收口，落到 ②（含这一格建）：`BuildVariableStatement` 本来就能把
`f<T>`t`` 建成 TaggedTemplateExpression（#15 早就证明这点），`()` 也能进 CallExpression。
**正向 +3，无回退**（全量 6167 逐条不变，buffer 与 wp3-30 逐项相同）。

## 2. 未完成项（本波实测，供下一波）

### 2.1 #86 `const﻿b8 = 3;`（BOM 紧跟在关键字后）— 已定位到「item 区间 vs 形状右界」

实测三件事：

1. **BOM 是 trivia，不在 `Code` 里**：打点显示 `Code` 依次是 `[const]`、`[const,b8]`、
   `[const,b8,=]`、`[const,b8,=,3]`（len=4 且 `eof=true`），BOM 从未进入 `Code`；
2. **建是建得出来的**：EOF 那一格走 C 路径，`(C) lastAt=3 clen=4 eof=true built=13`
   —— `BuildVariableStatement` 给出的形状右界是 **13**（整条 `const b8 = 3;`，含 `;`）；
3. **但最终树不是它**：`SourceFileShape[0,13]` 下面是 `VariableStatement[0,5]`（空声明列表）+
   `ExpressionStatement[6,13]`（`b8 = 3`）。即这条 item 的结论**被丢了**，root 的尾部建造
   （`source-file-tail-builder.BuildTrailingItems` / `BuildTrailingDeclaration`）按段重建，
   在 BOM 那一格切成两段。

最可能的机制：C 路径收口时 `state.End = state.CodeAt[lastAt]`（= `3` 的宿主下标），
而 `Pending` 形状的右界是 13（已吃掉 `;`，`;` 还没进 `Code`）——**item 区间 [Start, End+1) 与形状右界不一致**，
引擎按区间 splice 后形状被丢弃，落到尾部重建。下一波建议：
① 先给 `source-file-tail-builder` 的 `BuildTrailingItems` 打点，看它按什么切段（BOM 是不是 raw 段边界）；
② 再看 C 路径收口时是否应把 `End` 推到「形状实际右界覆盖的最后一格」（`builtEnd` 反推，
   与 D/E 分支同一套 `lastAt` 反推写法），而不是直接 `CodeAt[lastAt]`。

对照组（同波实测）：`const a﻿= 3;`（BOM 在标识符与 `=` 之间）**正常**，
`const a = 1;﻿const b = 2;`（BOM 在 `;` 后）**正常**，`﻿const b8 = 3;`（文件头 BOM）**正常**。
所以缺口只在「BOM 紧跟关键字之后」这一格。

### 2.2 #81 `import x from "m"` ⏎ `type T = A;` — 未动

wp3-30 §2.1 的证伪结论仍然成立（`KindOf` 的 `TextOf(code[probe]) !== "="` 对 `Symbol` 恒真 →
KindOf 返回 9；改成 `IsSymbolAt` 会净负 13 条 recovery）。下一波方向不变：
KindOf=8 时让类型别名在**类型右界**截断（`TypeAliasDeclarationShape.FromUnits` 的 `ParseType`
之后若还有剩余代码单元就不收），或 `KindOf` 只在「`=` 后到行尾没有续行」时返回 8。

## 3. 命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp3-32 -From impl-wp3-31 -Base impl-wp3-31
cd impl-wp3-32
# xl_build(cwd=..., paths=["core","typescript"], targets=["ts"], out="dist")
node .\node_modules\typescript\bin\tsc -p tsconfig.json
node .\typescript\cases\ast-json.mjs; node .\typescript\cases\ast-json-diff.mjs
git checkout -- typescript/cases   # 先读 diff 再 checkout
```

**调试技巧（本波省了大量时间）**：`dist/ts` 生成后 tsc 编到 `build/ts`，可以直接在
`build/ts/**/*.js` 里加 `console.error` 打点并 `node` 跑单条用例（`SourceFileRunner.Parse(src,"case.ts")`），
**下一格 `xl_build`/`tsc` 会把改动覆盖掉**，不会污染提交——比「改 .xl.md → 重建 → 猜」快一个数量级。

## 4. 踩过的坑

1. ① 分支（Alive 全灭）才是本题的收口点，不是 `ScanToSemicolon`（`EndsAtLineBreak` /
   `IsUncontinuableTailBoundary` 都要求有换行，同一行根本不会命中），也不是
   `BuildVariableStatement` 的终点扫描（那里 `typeArgsClosed` 的条件同样带 `!NoLineBreakBetween`，
   同一行不会 break）。
2. `xl_build` 增量只传改动文件即可（1 个文件 ~1s）；**改完必须 xl_build 再 tsc**，否则 diff 读数一模一样。
3. 跑 `xl_build` / `xl_check` 的输出极大（>300KB），一次调用就会吃掉大量上下文：能只传单个文件就只传单个文件，
   xl_check 每波只在最后跑一次。
4. `git checkout -- typescript/cases` 会把 `*.cj-ast.json` 还原成 committed 快照——**先读 diff**。
5. `pwsh` 里给 node 传含反引号的用例串必须用**单引号**（双引号里 `` ` `` 是 PowerShell 转义符，
   会把字符串截断报「缺少终止符」）。
