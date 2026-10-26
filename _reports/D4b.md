# D4b 修 D4 的两条 `ok→diff`（legacy 体收集通道的「静默空块」）

| 项 | 值 |
| --- | --- |
| 状态 | **检查点已提交**（未合并 / 未 push / 未删目录） |
| 分支 | `feature/d4b-initializer` |
| 目录 | `C:\Users\Admin\Documents\GitHub\xl-example-set\d4b-initializer` |
| base | `609f5526` `merge(d4): make file fallback truly legacy` |
| 提交 | `a5edbbe5` `fix(d4b): decline instead of building an empty block in the legacy body collection channel` |
| 交付 | `typescript/tokens/direct/direct-statement-assembly.xl.md`、`typescript/tokens/direct/direct-expression-engine.xl.md`（2 个文件） |
| 构建 | `xl_build` **628 页 / 0 error / 3 warning**（3 条 E1107 是 base 已有的）；`tsc -p .` **exit 0** |

**结论**：两条 `ok→diff` 都恢复成 `ok`（`2433/103/26` → **`2435/101/26`**），
`ok→diff` **0**、`ok→crash` **0**、崩溃 **26 不变**、`FileFallbackCount` **213 不变**、
默认关的四道门逐项不变。根因**不是**开关，也不是 A4b/A4c 的候选判据：
是 **legacy 体收集通道在「体目录没挂上」时把 `[]` 当成「空体」**，静默建出一个空 `Block`，
里面的 `return` / `yield` 被丢掉。

---

## 1. ON 读数（`tmp/snap.mjs` → 与 `tests/parse/wide-ast.mjs` 同一语料 2573 / 跳过 TS 非法 11）

| 指标 | 改前（`609f5526`） | 改后（本提交） | 差 |
| --- | --- | --- | --- |
| AST 完全一致（ok） | 2433 | **2435** | **+2** |
| 有差异（diff） | 103 | **101** | **−2** |
| **崩溃（crash）** | **26** | **26** | **0** |
| `FileFallbackCount`（救回文件数） | 213 | **213** | 0 |
| `FileFallbackAttempts` | 239 | 239 | 0 |
| 救回但仍有差异 | 2 | **0** | −2 |
| 记号形状（basic-token 残留） | 635 | 635 | 0 |
| 缺 range / 越界 / 未映射 / 字段名 | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 | 0 |
| 四方向合计（structural / moved） | 586 / 129 | 580 / 129 | −6 / 0 |

逐文件三向（`tmp/cmp.mjs tmp/snap-base.json tmp/snap-final.json`）：

```
transitions: {"ok->ok":2433,"crash->crash":26,"diff->diff":101,"diff->ok":2}
ok→diff 0、ok→crash 0、crash→* 0 变化。
[regressions: ok->crash/diff = 0]
```

`2` 条 `diff→ok` 就是任务点名的两个文件（`fallback:true` 两条都在）：

| 文件 | 改前 | 改后 |
| --- | --- | --- |
| `tests/cases/token/expressions/expr-yield-await-context.ts` | diff `ExpressionStatement-2, YieldExpression-1, NumericLiteral-2, AwaitExpression-1` | **ok** |
| `tests/cases/token/statements/st-comment-holds-brace.ts` | diff `ReturnStatement-1, NumericLiteral-1` | **ok** |

正式 driver `tmp/wide-on.mjs`（不是 snap 那把尺子，另跑一遍）：

```
语料 2573 个文件；跳过 TS 非法 11；解析成功 2536、崩溃 26；AST 完全一致 2435、有差异 101
四方向：缺/多出来 580 条、区间漂移 129 条、字段名 0 条；地基：缺 range 0 处、区间越界 0 处、未映射 0 处
记号形状（basic-token）635 个
FileFallbackCount 213；FileFallbackAttempts 239
```

验收口径对照：`ok→diff` **0** ✓（≤101：**101** ✓）；崩溃 **26 不变** ✓；FileFallback **213 不变** ✓；`ok→crash` **0** ✓。

---

## 2. 根因：体收集通道把「没挂上」当成「空体」

### 2.1 触发条件不是两个增量开关，是 `EnableShellExpressions`

D4 §4.1 的归因列写的是「legacy（`shell=false` 且两个增量开关 `false`）」；本波把它拆开量：

| 片段的 `const o = { *m() { return 3; } };` | `Block` 子节点 |
| --- | --- |
| `shell=true, variable=false, incremental=false`（**默认关**） | `ReturnStatement, NumericLiteral`（正确） |
| `shell=false, variable=false, incremental=false`（**fallback 全关**） | **0 个（空块）** |
| `shell=true, variable=true, incremental=true`（ON 首跳） | `ReturnStatement, NumericLiteral`（正确） |

⇒ 决定这一格的是 **`EnableShellExpressions`**，两个增量开关不是开关量的那一维
（这也是为什么「只压变量声明族」的配置里这两条一模一样，见 D4 §2.1）。

### 2.2 机制（`tmp/who.mjs`：给 `BlockShape.TryToClose` 打栈）

`shell=false` 时体目录不挂（`BlockPossibleShape.TryMountControlFlowBody` / `IsFunctionDeclarationBody` /
`TryMountFunctionBody` 都在 `EnableShellExpressions` 之内），体括号的 `Data` 里只剩 **basic token**。
两条收集通道都只收「已经建好的语句」：

```
对象字面量方法体：DirectObjectMemberAssembly.MemberFrom → DirectStatementAssembly.BlockFrom → BuiltChildren
箭头块体        ：DirectExpressionEngine.BuildArrowBlock（BlockFrom 的复刻，注释写明「两处口径必须同步」）
```

`BuiltChildren` 原来的 ① 是「trivia / basic token → 跳过」，于是**未挂上的体收集出 `[]`**，
`BlockFrom` / `BuildArrowBlock` 据此建出一个 `BlockShape`（0 个子节点）——不 `Fail`、不记分类、不抛错。
`{ return 3; }` 变 `{}`，`{ yield 3; }` 也变 `{}`：**语句被静默丢掉**，这正是两条 `ok→diff` 的形状
（少的正是 `ReturnStatement` / `YieldExpression` + 它们的字面量）。

### 2.3 最小复现（`tmp/attr.mjs`，`SourceFileRunner.Parse` 直跑，逐叶计数）

| 最小片段 | 默认关 | **fallback 全关（改前）** | ON | 改后（三种模式一致） |
| --- | --- | --- | --- | --- |
| `const o = { *m() { return 3; } };` | 11 | **9（`Block` 空）** | 11 | **11** |
| `const o = { *m() { yield 3; } };` | 12 | **9（`Block` 空）** | 12 | **12** |
| `const o = { async n() { await 3; } };` | 12 | **9（`Block` 空）** | 12 | **12** |
| `const arrow = () => /* { */ { return 3; };` | 9 | **7（`Block` 空）** | 9 | **9** |
| `const arrow = () => { return 3; };` | 9 | **7（`Block` 空）** | 9 | **9** |
| `function f() { return 3; }`（对照） | 5 | 5 | 5 | 5 |

对照那行说明这条缺陷**只在「表达式侧建体」的通道上**：函数声明体走的是 `StatementBuilder.BuildBlock`，
它本来就有「raw 单元逐条 `BuildStatement`」的分支，所以从来不丢。

---

## 3. 改动（两处，同一口径）

**规则**：体内有 **raw 代码（basic token）却一条已收口语句都没收到** ⇒ **Decline（`Fail` + `null`）**，
**绝不建空块**；只有 trivia 的真空体 `{}` 仍然是空块（收集 `[]` 合法）。

1. `typescript/tokens/direct/direct-statement-assembly.xl.md` → `BuiltChildren`：跳过 trivia 时，
   basic token 只记 `raw = true`；循环后 `if (raw && collected.length === 0) return null;`。
   `BlockFrom` 已有 `children === null → return null`，不用改。
2. `typescript/tokens/direct/direct-expression-engine.xl.md` → `BuildArrowBlock`：同样的 `raw` 标记 +
   `if (raw && shape.Data.length === 0) { this.Fail("箭头块体内还有未挂载的语句"); return null; }`。

**为什么是 Decline 而不是代建**：这份代码的既有纪律是「本引擎不代建」——
代建要么调 `StatementBuilder`（A6 红，且 `assembly → engine` 已成依赖方向，反向 import 成环），
要么重写一遍 `BuildStatement`（静默错建风险）。Decline 之后由上层换
`ExpressionBuilder.ParseObjectLiteral` → `StatementBuilder.BuildBlock` 的 raw 分支逐条建，
`tmp/who.mjs` 实测改后的栈正是：

```
BlockShape children=1 ← StatementBuilder.BuildBlock ← ExpressionBuilder.ParseObjectLiteral ← ParsePrimary ← ParsePostfix
```

即「按 raw 单元建」的那条既有分支，树与 TS 逐节点一致，没有新增第二条建树逻辑。

### 3.1 交叉验证：单独任一补丁已经够（如实记录）

| 配置 | ok | diff | crash | FileFallback | fallbackSavedDiff |
| --- | --- | --- | --- | --- | --- |
| 只有 `BuiltChildren` 那处（`tmp/snap-A.json`） | 2435 | 101 | 26 | 213 | 0 |
| 只有 `BuildArrowBlock` 那处（`tmp/snap-B.json`） | 2435 | 101 | 26 | 213 | 0 |
| 两处都有（本提交，`tmp/snap-final.json`） | 2435 | 101 | 26 | 213 | 0 |

三个配置**逐位相同**。原因是 Decline 的粒度是整个 declarator：任一处 Decline 都会让整条
变量声明退回 `ExpressionBuilder`，而它把同一个语句里的对象字面量体**和**箭头体一起建对，
所以两个文件被交叉救回。两处仍然都改，是因为它们是同一份契约的两份实现
（`BuildArrowBlock` 的注释就写着「两处口径必须同步」）：只改一处，另一条路径下次仍会静默建空块。

---

## 4. 默认关：四道门逐项不变

| 命令 | 读数 |
| --- | --- |
| `node typescript/cases/tts/tools/tshape-judge.mjs ts-all` | total **429** / ok **426** / failures 3（与 base 同一批 `throw`），exit 1 |
| `node typescript/cases/tts/run.mjs --quiet --json tmp/tts-final2.json` | **exit 0**；total **429**；`counts = { incremental: 426, throw: 3, atomic: 0, partial: 0 }`；failures **0** |
| `node tests/gates/run.mjs` | **4 PASS / 0 FAIL / 7 N/A**（`wide-ast` PASS，`FileFallbackCount 2`；`real-dts-ast` PASS；`cases:check` 1720 条 0 不合格；`direct:lint` 0 违反） |
| `xl_build { paths:["core","typescript"] }` | 628 页，**0 error**，3 条 E1107（base 已有） |
| `node node_modules/typescript/bin/tsc -p .` | **exit 0** |

为什么默认关逐字节不变：默认 `EnableShellExpressions = true`，体目录照旧挂上，`BuiltChildren` 收得到
已建语句（`collected.length > 0`），新加的 `raw && collected.length === 0` 分支根本不成立；
只有 trivia 的 `{}` 仍走 `[]`（`raw` 为假），也与改前一致。四道门读数逐项不变即是证据。

---

## 5. 边界（本波不动的东西）

- **26 条崩溃一条没碰**（5 条 `lib.*.d.ts` 的 `SourceRange is not set` + 21 条 legacy 根目录
  `终结候选与其它候选同时成立`）：读数逐位不变，仍是下一波的对象。
- **101 条差异一条没碰**（`structural 580 / moved 129`，其中 `structural` 比改前少 6，正好是两条恢复的）。
- **没有动增量开关**，也没有回滚 D4：`source-file-runner.xl.md` 一个字节没改，
  `ParseCore(shell=false)` 里三个开关的压制与恢复保持 D4 原样。
- 没有新增建树逻辑、没有绕过 `Discover`/目录：Decline 之后走的是既有的
  `ExpressionBuilder` + `StatementBuilder.BuildBlock` raw 分支。

---

## 6. 可复算命令

```powershell
$d="C:\Users\Admin\Documents\GitHub\xl-example-set\d4b-initializer"; Set-Location $d
git log --oneline -1                                          # 见 §0 表头的提交
xl_build { paths:["core","typescript"]; targets:["ts"] }      # 628 / 0 error / 3 warning
node node_modules/typescript/bin/tsc -p .                     # exit 0 -> build/ts

node tmp/snap.mjs tmp/snap-final.json                          # ON：2435 / 101 / 26 / fb 213
node tmp/cmp.mjs tmp/snap-base.json tmp/snap-final.json        # ok→diff 0；diff→ok 2
node tmp/wide-on.mjs                                           # 正式 driver：崩溃 26、有差异 101、fb 213
node tmp/two.mjs legacy                                        # 两个目标文件在 fallback 全关下都 ok
node tmp/two.mjs on                                            # 同上，ON 首跳也 ok
node tmp/attr.mjs objReturn                                    # 最小复现：三种模式的逐叶树
node tmp/who.mjs objReturn legacy                              # 谁建了那个 Block（栈）
node tmp/who.mjs arrowComment legacy

node typescript/cases/tts/run.mjs --quiet --json tmp/tts-final2.json
node typescript/cases/tts/tools/tshape-judge.mjs ts-all
node tests/gates/run.mjs
```

`tmp/` 全部 gitignored，不提交。本波探针：`tmp/attr.mjs`（三模式逐叶树）、
`tmp/who.mjs`（`BlockShape` 构造栈）、`tmp/two.mjs`（两个目标文件的单点判定）、
`tmp/trace.mjs`（`BuildBlock` / `ParseObjectLiteral` / `ParseArrowBody` 调用追踪，用于排除假线索）。
`tmp/snap.mjs` / `tmp/cmp.mjs` / `tmp/wide-on.mjs` 沿用 D4 的口径（D4 目录已不在，从 `d3c-angle` 取回同版本）。
