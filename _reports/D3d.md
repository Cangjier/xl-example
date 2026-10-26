# D3d · switch 残余 2 + 声明体残余

| 项 | 值 |
| --- | --- |
| 状态 | **部分完成**：ON 崩溃 **26 → 24（−2）**、差异 **103 → 103（不增）**、**原来通过现在失败 0 条**；隐藏债 `FileFallbackCount` **213 → 200（−13）**。声明体 4 条**未修**：首跳已定位到 D2 的 `EndsWithClosingBracket` 保守闸（D2b 类型收口），按任务约定只记录不越界改。 |
| 分支 / 目录 | `feature/d3d-switch` · `C:\Users\Admin\Documents\GitHub\xl-example-set\d3d-switch` |
| base | 主仓库 `92db249c`（`609f5526` merge(d4) 之上，本克隆 HEAD）。ON 基线 **26 / 103 / 213**，与 D4 报告一致。 |
| 提交 | 见文末（1 个代码提交 + 1 个报告提交） |
| 改动 | 1 个 `.xl.md`，+30 / −6，全部在**增量路径**；默认开关一个都没动。 |

---

## 1. 结论先行：两条"残余"其实是**两个不同的缺陷**，父任务给的 switch 假设与实测不符

| 条目 | 父任务假设 | 实测首跳 | 结论 |
| --- | --- | --- | --- |
| switch 残余 2 | `case`/`default` 子句头在增量路径与 S6 的 legacy 门控不一致 | `StatementBuilder.BuildCaseBlock` 的 `[WP-S1]` 头分支**只收非 basic 单元** | S6 门控是对的（我复核过：全仓只有 1 处挂载，已带 `IsIncrementalShapesEnabled()`，见 §2.3）；坏的是**收口侧** |
| 声明体 4 | 声明收口 | `VariableDeclarationShape.FinishIncremental` 抛 `declaration 声明体`，**真因**是注解以 `}` `)` `]` 收尾时 `DeclarationAsiBoundary` 不早收 | D2b 类型收口，未修（§3） |

---

## 2. switch 残余 2：`BuildCaseBlock` 的头分支不收 basic 单元

### 2.1 首跳（探针 `tmp/probe-one.mjs`，包 `SourceFileRunner.ParseCore` 并按 `shell` 标记录）

```
tests/.../stmt-switch-comment-before-case.ts     shell=true   switch 块里出现了 case / default 之外的单元
tests/.../stmt-switch-inline-terminator-comment.ts shell=true switch 块里出现了 case / default 之外的单元
```

两条**第一跳**就是这句，不是 D2/D3 记的 `declaration 声明体`（那是 `ParseCore(shell=false)` 第二跳的旧读数）。

### 2.2 最小复现（`tmp/probe-one.mjs`，ON）

```ts
// R1：子句体是「语句位的 `{ }` 块」——不需要注释、不需要缺分号
declare const a: number;
switch (a) { case 1: { break; } }        // 修前 CRASH（100% 复现）
// R2：短语句 + 行尾 ASI（下一条是 default）
declare const a: number;
switch (a) { case 1: break
  default: break }                       // 修前 CRASH
// 对照：case 1: f(); / case 1: break; / case 1: let x = 1; 都 PASS
```

`tmp/probe-case.mjs` 在抛错点 dump 了 `bracket.Data`：

```
R1: [0] CaseClauseShape NONBASIC [41,48]
    [1] WrapSymbol(" ") basic  [2] Bracket basic [49,59]   ← 子句体 `{ break; }`
R2: [0] CaseClauseShape NONBASIC [41,48]
    [2] Common("break") basic  [4] Common("default") basic ← 短语句壳被卸回 raw
```

**机制**：S6 把子句头候选限定在增量模式后，`case`/`default` 那一格由 `CaseClauseHeadPossibleShape` 建成
`CaseClauseShape` 占位节点；`BuildCaseBlock` 的 `[WP-S1]` 分支于是走「头已建、体还没建」的混合序列。
它的体收集循环写的是 `while (!IsBasicToken)`：

- `case 1: { … }` 的子句体是 **`Bracket`，而 `Bracket.IsBasicToken === true`**（括号从来都是 basic 单元）；
- `case 1: break`（无 `;`）的短语句壳在 ASI 判据下收不了口，`DetachShell` 后也退回 raw basic。

两者都在头形状之后留下 basic 单元 ⇒ 内层循环立刻退出 ⇒ 外层循环把第一个 basic 单元当"子句头之外的单元"
抛错（`statement-builder.xl.md` 原第 2366 行）。**这与 legacy 门控无关**：legacy 分支从不进入这段。

### 2.3 我复核过 S6 的门控（不是它）

- 全仓 `CaseClauseHeadPossibleShape` 的**挂载点只有 1 处**：`block-possible-shape.xl.md:625`，
  条件 `EnableSwitchCaseClause && EnableSwitchCaseClauseHead && IsIncrementalShapesEnabled()`；
  `else if` 分支逐字节是 S1 之前的 `[CaseClauseStatementPossibleShape]`。**没有第二处挂载**。
- `case-clause-head-possible-shape.xl.md` 的 `BuildByIndex` 末尾 `Attach` 另有自己的 `IsIncrementalShapesEnabled()`。
- 因此"增量路径与 legacy 门控不一致"这个描述在代码里**不成立**；修 switch 不能靠再加一道模式闸
  （加了只会把两条文件重新变成 hard error）。

### 2.4 改动（1 处，`statement-builder.xl.md` `BuildCaseBlock`）

把 `[WP-S1]` 头分支的体收集循环从「只收非 basic」改成「两条来源都收」：

```ts
while (inner.At < inner.Units.length) {
  const clauseUnit = inner.Units[inner.At];
  if (!clauseUnit.IsBasicToken) {
    if (clauseUnit.constructor.name === "CaseClauseShape"
      || clauseUnit.constructor.name === "DefaultClauseShape") break;   // 下一条子句
    headClause.Add(clauseUnit); clauseTail = clauseUnit; inner.At++; continue;
  }
  if (inner.IsClauseKeyword(clauseUnit)) break;                          // raw case/default（与 legacy 同一条）
  const builtTail = inner.BuildStatement();                              // 与下面 raw 两段同一个建造器
  headClause.Add(builtTail); clauseTail = builtTail;
}
```

- **不新写判据**：停止条件仍是 `inner.IsClauseKeyword`（下面 raw `case` / `default` 两段用的同一句），
  basic 单元仍交给同一个 `inner.BuildStatement()`；已建好的形状仍原样收下。
- 该分支**只有增量路径能进入**（`CaseClauseShape` 占位节点只由 `StatementShellCatalog.Attach` 建，
  而它带增量门控），所以 legacy 一个字节都不变。
- `clauseTail` 的 `End` 补签逻辑沿用原样（一次不改）。

> **ownership 说明**：本 WP 声明的三个文件（`block-possible-shape` / `case-clause-*` / `statement-route-util`）
> 里没有缺陷点；最终一行落在 `statement-builder.xl.md`。已核对并发：`d4b-initializer` 工作树干净（在 HEAD），
> `d3a2-member-chain` 只改 3 个 `expressions/*`，`d3c-angle` 只改 `declarations/*` / `types/angle-judge` /
> `statement-legacy-metrics`——**三者都没有碰 `statement-builder.xl.md`**。

### 2.5 switch 前后读数（同一构建、同一命令）

| 指标 | 修前 | 修后 |
| --- | --- | --- |
| `node tmp/wide-on.mjs --only stmt-switch --verbose` | 崩溃 **2**、差异 0 → FAIL | 崩溃 **0**、差异 0 → **PASS**（14 选中，AST 全等） |
| 全量 wide-on 崩溃 | **26** | **24**（−2） |
| 全量 wide-on 差异 | **103** | **103**（不增） |
| 解析成功 | 2536 | **2538** |
| `FileFallbackCount` | **213** | **200**（**−13**；这 13 个 switch 文件从「靠 legacy 兜底」变成真增量，且 AST 与 legacy 相同） |
| 原来通过现在失败 | — | **0**（`tmp/cmp.mjs` 逐文件，见 §4） |

`FileFallbackByFamily` 的下降集中在 `tests/cases/token`——即这 13 个文件以前整文件 fallback，现在走增量。

---

## 3. 声明体残余 4 条：**未修**，一条根因，属 D2b

### 3.1 清单（首跳全部 `增量变量形状未支持：declaration 声明体`）

| 文件 | 触发行 |
| --- | --- |
| `expressions/ex-call-comment-before-args.ts` | `declare const o: { m: (...args: any[]) => any }` ⏎ `o.m /* ( */ ()` |
| `statements/stmt-empty-blocks.ts` | `declare const xs: number[]` ⏎ `if (flag) {}` |
| `statements/stmt-header-body-next-line.ts` | `declare const xs: number[]` ⏎ `while (a)` |
| `types/type-op-keyof-typeof.ts` | `declare const obj: { a: number }` ⏎ `type X = keyof typeof obj` |

### 3.2 一条最小复现（`tmp/probe-one.mjs`）

```ts
declare const o: { m: (...args: any[]) => any }   // 注解节点以 `}` 收尾
o.m ()                                            // 修前 CRASH: declaration 声明体
```

对照（全部 PASS）：`declare const a: number` ⏎ `const b = 2` / `declare const b: number` / `type Y = ...` /
`if (...)` / `function` / `interface` / 任意短注解。**只要注解是 `{ … }` / `( … ) => …` / `T[]` 就复现。**

### 3.3 根因（不是 `declaration 声明体` 那句，那句只是下游）

`declaration-asi-boundary.xl.md` `CanCloseAtLineBreak` 的 `[D2:TYPED-TAIL]` 分支有三道条件，其中：

```ts
const shapeTail = !current.IsBasicToken
  && HasAnnotationShape(units)
  && !EndsWithClosingBracket(current)      // ← 这一道把本族全部挡掉
  && StartsNewStatementLine(current);
```

`EndsWithClosingBracket`（同文件 `:425`）读注解节点源码区间的**最后一个字符**，是 `}` / `)` / `]` 就返回
`true`（不早收）。D2 加它是为了 `declare const c: { … }` ⏎ `export * from …` 不吞 export（实测
`undici-types/index.d.ts` structural=14）。于是这 4 条声明的注解永远不收口 → 下一行的 `(` / `[` /
第二个注解形状被 `FinishIncremental` 当成"第二个非 basic 单元" ⇒ 抛 `声明体`。

### 3.4 为什么本 WP 不改

- 首跳落在 **D2 的文件**（`declaration-asi-boundary.xl.md` + `variable-declaration-shape.xl.md`），
  任务口径是「若属 D2b 的类型收口，记录并只做本 ownership 内能做的」。
- 直接删掉 `EndsWithClosingBracket` 有已知回归（D2 实测 structural=14）。可行的下一步是把它改成
  「**下一行是不是一条不可能续接表达式的语句**」的判据（`o` / `if` / `while` 放行，`export` 仍挡），
  需要 D2b 用 `undici-types` / `lib.*.d.ts` 全量复核——不在本 WP 的 8 回合与 ownership 内。
- 本 WP 内**没有**能在不碰这两页的前提下修掉它的位置（已确认：`block-possible-shape` / `case-clause-*` /
  `statement-route-util` 都不在这条链上）。

### 3.5 计分

| 族 | 修前 | 修后 |
| --- | --- | --- |
| switch（`switch 块里出现了…`） | 2 | **0** |
| 声明体（`declaration 声明体`） | 4 | **4**（未动，D2b） |
| 其余（5 lib `SourceRange` + 表达式/声明长尾） | 20 | 20 |
| 合计 | **26** | **24** |

**未达 `≤21`（−5）：缺口 3 条，全部在上表 3.5 的"声明体"4 条里**（修掉即 20 ≤ 21）。

---

## 4. 验收读数

### 4.1 默认开关（全 false）四道门——与 base 逐项相同

| 命令 | 读数 |
| --- | --- |
| `xl_build { paths:["core","typescript"]; targets:["ts"] }` | **0 error**（3 条既有 E1107 warning） |
| `node node_modules/typescript/bin/tsc -p .` | **exit 0** |
| `node typescript/cases/tts/tools/tshape-judge.mjs ts-all` | **429 / ok 426 / failures 3**（既有 3 throw，exit 1 是判据语义） |
| `node typescript/cases/tts/run.mjs --quiet` | **exit 0**（PASS 429） |
| `node tests/gates/run.mjs` | **4 PASS / 0 FAIL / 7 N/A**；`wide-ast` PASS（崩溃 0、差异 0、`FileFallbackCount 2`）；`real-dts-ast` ok；`cases:check` ok（1720 条 0 不合格）；`direct:lint` ok |

### 4.2 ON（`tmp/wide-on.mjs`，增量两开关强制 true）

| 指标 | 基线 `92db249c` | 本 WP | 变化 |
| --- | --- | --- | --- |
| 崩溃 | **26** | **24** | **−2** |
| 差异 | **103** | **103** | 0 |
| 解析成功 | 2536 | **2538** | +2 |
| `FileFallbackCount` | 213 | **200** | **−13** |
| 缺 range / 越界 / 字段名 | 0 / 0 / 0 | 0 / 0 / 0 | 0 |
| 原来通过现在失败 | — | **0** | — |

逐文件比对（两份日志的失败清单按「文件 → 状态/明细」取集合差）：`before=129 after=127`、
**`gone=2`（正是 `stmt-switch-inline-terminator-comment.ts` 与 `stmt-switch-comment-before-case.ts`，
均为 `crash` → 消失 = PASS）、`new=0`、明细被改的 `changed=0`**。
即：0 条 diff→crash、0 条 diff 明细变化、0 条新增 diff、0 条「原来通过现在失败」。
（`tmp/cmp.mjs` 是本轮写的同一个集合差脚本；`gone` 里的文件不是"丢了"，而是从失败清单里消失。）

---

## 5. 可复算命令

```powershell
$d="C:\Users\Admin\Documents\GitHub\xl-example-set\d3d-switch"; Set-Location $d
xl_build { cwd:$d, paths:["core","typescript"], targets:["ts"] }   # 0 error
node node_modules/typescript/bin/tsc -p .                          # exit 0

node tmp/probe-one.mjs tests/cases/token/statements/stmt-switch-comment-before-case.ts   # 修前 shell=true 首跳
node tmp/probe-case.mjs tmp/q1.ts                                                        # 修前 dump bracket.Data
node tmp/wide-on.mjs --only stmt-switch --verbose                                        # PASS 崩溃 0
node tmp/wide-on.mjs --top 0 --verbose > tmp/on.log 2>&1                                 # 24 / 103 / 200
node tmp/cmp.mjs on-base.log on-switch1.log                                              # regressions 0
node typescript/cases/tts/tools/tshape-judge.mjs ts-all                                  # 429 / 426 / 3
node typescript/cases/tts/run.mjs --quiet                                                # exit 0
node tests/gates/run.mjs                                                                 # 4 / 0 / 7
```

`tmp/` 全部 gitignored（`wide-on.mjs` 从 `d3-triage\tmp\` 复制）；未 `Start-Sleep`、未 push / pull、
未合并、未删除任何目录、未改判据、未改 `INDEX.md` / README。
