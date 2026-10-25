# HANDOFF — Stage 5d-10b：IsAsiBoundary 原体恢复 / 残余修复 / 死代码 / 文档收尾

分支 `feature/possible-statement-5d10b`，起点 HEAD **`fa3d32af`**（转正 + gap 清零 + Stage 5d 全部合并）。
本文件是**最终清理与文档步**的交付说明；所有读数都在本目录实跑（`xl_build` + `tsc` 之后），命令见 §6。

---

## 1. 结论先行

| 项 | 结果 |
| --- | --- |
| **A** `StatementBoundaryUtil.IsAsiBoundary` 函数体 | **恢复为基线 `7cc30e41` 逐字节原文**：219 行，sha256 `131DE95B…A78A92E` 两边相同（§2） |
| A 的行为 | 全部保留：gap-edge2 的「实例化收尾 `>`」移到新方法 `IsInstantiationTailAsiBoundary`（候选层委托 + `StatementEndCode` 并入）；`gap-edge2` 46/0/known=7 |
| **B** `module` ⏎ `M = 1;` / `namespace` U+2028 `N = 1;` | **已修**：两条 `ExpressionStatement`，AST==TS，无 fallback（§3） |
| B 的同行对照 | `module M = 1;`（TS 非法，1 个诊断）**行为与之前一致**（仍抛 `表达式语句没有读完`，不进判据） |
| **C** `yield-boundary.mjs` 正对照 | **已更新**：默认态断言 `ScanRoot==0`、`ParseCore(..., false)` 的 false 态断言 `>0`；探针 **56/56** |
| **D** 死代码 | 删除 `StatementBoundaryUtil.CanEndStatementAt`、`StatementRouteUtil.EnableShellStatements`；`xl_build` 0 error + `tsc` exit 0 |
| **E** 文档 | 四份全部更新（矩阵目标四 → 达成 + §6 读数表 / 盘点 legacy 面 / 5d 计划 §15 / 设计 §15） |
| 指标 | **0 / 46 / 4 / 2 / 2 / 4**（与基线逐用例一致，未变差；`legacy-retirement` verdict PASS） |
| 全门 | **30 / 30 PASS**（§5；含 ast-json 6171/6171、diff 0/0/0、token-ast 1706/0、real-dts 226/226、harness 102/0/known=0、double 120/0、takeover 33/33、validate 1720/0、final-matrix 38/38、op-ast 94/94、ast-kind PASS） |
| 未完成 | 无阻塞项；RawTail 4 / Declined 2 / FileFallback 4 是**登记在册的残余**（§7），不是本轮的失败 |

---

## 2. A：`IsAsiBoundary` 逐字节恢复（证明）

### 2.1 做法

1. 用 `git diff 7cc30e41 HEAD -- typescript/tokens/statements/statement-boundary-util.xl.md` 定位到函数体内的
   两处改动（都在 `IsAsiBoundary` 的 ```ts 围栏里）：
   - gap-edge2（`310cc4a1`）：`CanEndExpressionAt` 三连判里加了
     `&& !StatementScanner.IsInstantiationClose(units, prev)`（+6 行）；
   - 5d-9a（`af9ae8af`）：`++` / `--` 前缀分支重构成共享判据 `IsPrefixOperatorWithoutOperand`（净 −173 字符）。
2. **前缀分支**：重构前后的语义逐字等价（`IsPrefixOperatorWithoutOperand(units, prev, limit)` 就是基线的
   「回走 trivia → `operatorStart < limit || !CanEndExpressionAt(operatorStart)`」），恢复内联原文不改变行为；
   `IsPrefixOperatorWithoutOperand` 仍保留（5d-9a 的建树一侧 `StatementBuilder` 在读）。
3. **实例化收尾那一条**：不能直接删（删了 `a < b >` ⏎ `c` 立刻回退成一条 `BinaryExpression`），
   所以把它**移出**函数体：
   - 新增 `StatementBoundaryUtil.IsInstantiationTailAsiBoundary(units, tokenIndex, limit?)`：
     只多问「收尾单元是 `>` / `>>` / `>>>` 且 `StatementScanner.IsInstantiationClose` 认它是类型实参收尾」，
     其余条件（当前是代码 / `prev` 存在 / 有换行 / 语句首不是声明头或标签 / 当前不是续接符）逐条读
     `IsAsiBoundary` 读的同一批实现（`HasLineBreakBefore` / `IsDeclarationHeadWord` / `IsStatementWord` /
     `IsContinuation`）；
   - 并入两个**调用点**：`ExpressionStatementPossibleShape.IsAsiBoundary`（候选层一行委托）与
     `StatementBoundaryUtil.StatementEndCode` 的 ASI 分支；
   - legacy 直接读 `StatementBoundaryUtil.IsAsiBoundary` 的调用点（`CanEndStatement` 等）保持旧行为。

### 2.2 对比证据（可复跑）

```powershell
git show 7cc30e41:typescript/tokens/statements/statement-boundary-util.xl.md > tmp/base-sbu.md
# 取两边的「## static method IsAsiBoundary … 到其后第一个 ``` 围栏」整段（含说明文字与代码围栏，219 行）
# 逐行 -cne 比较 + UTF-8 字节 sha256
```

实测输出：

```
lines: base=219 head=219
equal: True
sha256: 131DE95BF2F0DC7B5BB12A058BE52B7B6C5669956D94F692834E18547A78A92E
baseline has section at line 26
```

即：**函数体（含它前面的说明段）与基线逐字节相同**；`git diff 7cc30e41 HEAD -- <该文件>` 里剩下的 1388 行新增
全部是 Stage 5d 在**别的**方法里加的内容（`StatementEndCode` / `DeclarationShellEndCode` / 各族 `*EndCode`），
`IsAsiBoundary` 段本身不在 diff 里。

### 2.3 边缘形态验收

`node tests/statement-possible/harness.mjs --group=gap-edge2-legal,gap-edge2-known --file=tests/statement-possible/gap-edge2-cases.json`
→ **pass=46 fail=0 skip=0 known=7**，其中包含 `a < b >` ⏎ `c`（根 / 块体 / 函数体三形态）、`a++` ⏎ `b`、
`a !b`、`--` ⏎ `a`、`x++ ++y` 等；每条都做 AST 逐节点 == TS + 两次 Parse 的 XML 逐字节 + 壳路径 == legacy 三件事。

---

## 3. B：`module` / `namespace` 与名字跨行（TS 合法）

### 3.1 现象与根因

| 输入（0 诊断，TS 合法） | TS AST | CJ 修复前 |
| --- | --- | --- |
| `module` ⏎ `M = 1;` | `ExpressionStatement(module)[0,6)` + `ExpressionStatement(M = 1)[6,13)` | 抛 `表达式语句没有读完` → **文件级 fallback** |
| `namespace` U+2028 `N = 1;` | `ExpressionStatement(namespace)` + `ExpressionStatement(N = 1)` | 同上（U+2028 也是行终止符） |

根因两条：
1. `IsAsiBoundary` 的条件 5 用 `IsDeclarationHeadWord` 把 `module` / `namespace` 当声明头，名字那一格的换行
   因此**得不到 ASI 边界**（函数体已冻结，不能在这里改）；
2. `ModuleDeclarationPossibleShape` 在名字那一格还活着（`Uncertain`），与根终结候选同格 `Accept` →
   `CatalogGuide: 终结候选与其它候选同时成立`。

### 3.2 修法（两处，判据都读已有实现）

1. `StatementBoundaryUtil.IsDeclinedDeclarationHeadBoundary(units, tokenIndex)`（新增）：
   `prev` 是 `type` / `module` / `namespace` + `StatementRouteUtil.DeclinesDeclarationHead(units)` 为真
   （它读的就是 TS 的 `nextTokenIsOnSameLineAndCanFollowModifier` 口径）→ 这一格是 ASI 边界。
   并进 `CanEndStatement` 的第四条（`;` / EOF / ASI 之外）——`SourceFileEndPossibleShape.ComputeByIndex` 与
   `RootExpressionStatementPossibleShape` 都读这一份。
2. `ModuleDeclarationPossibleShape.ComputeByIndex`：与它已有的「`declare` ⏎ `namespace` 让位」同族，
   在 `DeclinesDeclarationHead` 为真时 `state.Status = 2`（Reject），不再与终结候选抢同一格。

### 3.3 结果

| 输入 | 修复后 CJ | 是否 fallback |
| --- | --- | --- |
| `module` ⏎ `M = 1;` | 两条 `ExpressionStatement`，AST 逐节点 == TS | 否 |
| `namespace` U+2028 `N = 1;` | 同上 | 否 |
| `type` ⏎ `T = 1;`（对照，原本就对） | 两条 `ExpressionStatement` | 否 |
| `module M = 1;`（同行；TS 1 个诊断） | **与修复前一致**（仍抛错） | 不适用（TS 非法，不进判据） |

三条用例（两条修复 + 一条对照）已进 `tests/statement-possible/gap-edge2-cases.json` 的 `gap-edge2-legal` 组
（42 → 45 条），套件读数 43 → 46 pass。

---

## 4. C / D / E

### 4.1 C：`yield-boundary.mjs` 正对照过期

`positive-class-shell`（`{ class C {} }`）旧断言是「终结候选路径 `ScanRoot > 0`」——5d-5 / 5d-7 把块内
`class` 壳的判界迁走之后，默认态已是 0，这条前提过期。现改为两条：

- **默认态 `endPath == 0`**（与 `root-retirement` 的「默认态 6300 用例 0 次」一致）；
- **`ParseCore(source, "case.ts", false)`（纯 legacy 目录）`ScanRoot > 0`**（计数器不是空转）。

文件头 §5 的注释同步重写。读数：**56/56**（此前 55/56），`knownGap=3` 不变。

### 4.2 D：死代码

| 删除项 | grep 证据 | 影响 |
| --- | --- | --- |
| `StatementBoundaryUtil.CanEndStatementAt` | 全仓只剩定义 + 三处历史注释（都写着「4af-a 之后不再调用」）；两个 `typescript/**` 调用点已改读 `IsDeclarationFollowBoundary` | 无（`IsLateAtEof` 仍被 `CanEndStatement` 的调用方使用，保留） |
| `StatementRouteUtil.EnableShellStatements` | 全仓 grep 只有字段声明本身；从未接线（恒 `0`） | 无（设计期灰度位） |

删除后 `xl_build`：1 written / 0 error；`tsc` exit 0；全门 30/30。

### 4.3 E：文档

| 文件 | 改了什么 |
| --- | --- |
| `docs/possible-statement-completion-matrix.md` | 目标四判定 **未达成 → 已达成**（退场指标 0/46/4/2/4 + 根候选退场 + fallback 仅兜底）；目标二同步改成达成（声明族 33/33）；§5 改成「达成 + 残余 4/2/4 台账」；§6 全表读数刷新；§2.3/§4 的过期边界同步 |
| `docs/possible-statement-final-inventory.md` | 标题与结论改为「默认路径已无 legacy；仅文件级 fallback 与残余形态保留」；§2 逐项重写；§5 开关默认值校正（`EnableDeclarationShell` / `EnableBlockClassShell` / 新增两项 = true，删掉 `EnableShellStatements` 行）；§6 gap 清单逐条标 已关闭/保留；§7 读数表刷新 |
| `docs/possible-statement-5d-plan.md` | 开头加状态说明（§0 是 5d-1a 基线）；新增 **§15**：逐阶段完成状态表、最终指标前后、5d-10b 五项、未完成与风险 |
| `docs/possible-statement-design.md` | 末尾新增 **§15 最终实现状态**：落成状态 / 判界单源 / 根候选退场 / 指标 / `IsAsiBoundary` 逐字节事实 / 没有落成的部分 |

四份文档均为 **UTF-8 无 BOM + LF**（已用字节级检查确认）。

---

## 5. 全门读数（`xl_build` 0 error + `tsc` exit 0 之后实跑，最终树）

| # | 门 / 探针 | 读数 |
| --- | --- | --- |
| 1 | `typescript/cases/ast-json.mjs` | **6171 / 6171**（47 构造，cj-fail 0） |
| 2 | `typescript/cases/ast-json-diff.mjs` | **6171 / 6171**，结构差 **0** / 位置差 **0** / 字段差 **0** |
| 3 | `typescript/cases/token-ast.mjs --quiet` | total=1716 **ok=1706 crash=0 diff=0**，ts-invalid=10，known-gap=0 |
| 4 | `typescript/cases/real-dts-ast.mjs` | **226 / 226**，崩溃 0、差异 0 |
| 5 | `tests/statement-possible/harness.mjs --all` | **102 pass / 0 fail / known=0 / uncovered=0 / file-fallback=0** |
| 6 | `tests/statement-possible/harness.mjs --double-accept` | **120 / 0**，冲突 0 |
| 7 | `tests/statement-possible/declaration-statement-takeover.mjs` | **33 / 33**，knownGap=0，takeover=27 |
| 8 | `tests/parse/validate.mjs` | **1720 条 / 0 条不合格** |
| 9 | `tests/statement-possible/final-matrix.mjs` | **38 / 38**（shapeAst / xmlEqLegacy / astEqTS 各 38/38，knownGap=1 既有 `clause-nested-known-gap`） |
| 10 | `tests/statement-possible/op-ast-proof.mjs` / `op-proof.mjs` | **94 / 94** / **40 / 40** |
| 11 | `tests/statement-possible/ast-kind-names.mjs` | **PASS**（live 5/5、self-test 4/4、fixtures 47、运算符节点 262、fail=0） |
| 12 | `short-family-boundary` / `control-flow-boundary` | **46 / 46** / **85 / 85**（knownGap=1 既有） |
| 13 | `shape-ast-coverage` | cases=50 **pass=46 known=4 fail=0** |
| 14 | `root-retirement` | **PASS**：默认态全语料 6300 用例 `ScanRoot=0`；false 态 11 用例 `ScanRoot=69`、逐节点一致、永不兜底；fallback 语料 4 |
| 15 | `declaration-shell-boundary` / `cf-body-takeover` / `block-body-takeover` / `decorated-declaration-takeover` | **74 / 74** / **46 / 0** / **21 / 0** / **14 / 14** |
| 16 | `eof-last-token-close` / `export-no-semicolon-eof` / `declaration-shell-call-position` | **13 / 13** / **13 / 13** / **24 / 24** |
| 17 | `import-expression-cases` / `comma-import-fallback` / `tail-residual-cases` | **9 / 9** / **16 / 16** / **24 / 24** |
| 18 | `file-fallback-attribution` / `raw-tail-attribution` | **PASS**（4 ≤ 13 台账内、0 新类别）/ 3 族 4 次，与官方指标一致 |
| 19 | `legacy-retirement.mjs --json` | **PASS**：`0 / 46 / 4 / 2 / 2 / 4`，逐用例与基线一致 |
| 20 | `yield-boundary.mjs`（本轮更新） | **56 / 56**，knownGap=3，正对照按 §4.1 新语义 |
| 21 | `gap-edge2`（`--file=gap-edge2-cases.json`） | **pass=46 fail=0 known=7**（合法组 45/45，含 B 的 3 条） |

`git status --porcelain` 在最终树：只有本轮的 10 个文件（4 docs + 2 tests + 4 `typescript/**`），
`typescript/cases` 产物已 checkout 干净。

---

## 6. 复现命令（cwd = 本目录）

```powershell
# 构建：本仓没有 xl CLI，用 DSH 的 xl_build 工具（cwd=本目录，paths=["core","typescript"]，targets=["ts"]）
#   然后编译：
node node_modules/typescript/bin/tsc -p tsconfig.json      # 必须 exit 0

# 指标（官方基线；任何一项变差都算回归）
node tests/statement-possible/legacy-retirement.mjs --json
node tests/statement-possible/legacy-retirement.mjs --top=40
node tests/statement-possible/root-retirement.mjs
node tests/statement-possible/raw-tail-attribution.mjs
node tests/statement-possible/file-fallback-attribution.mjs

# 全门（本文件 §5 的 30 项由 tmp/gates.mjs 并行跑；等价的逐条命令）
node typescript/cases/ast-json.mjs
node typescript/cases/ast-json-diff.mjs
node typescript/cases/token-ast.mjs --quiet
node typescript/cases/real-dts-ast.mjs
node tests/statement-possible/harness.mjs --all
node tests/statement-possible/harness.mjs --double-accept
node tests/statement-possible/declaration-statement-takeover.mjs
node tests/parse/validate.mjs
node tests/statement-possible/final-matrix.mjs
node tests/statement-possible/op-ast-proof.mjs
node tests/statement-possible/ast-kind-names.mjs
node tests/statement-possible/yield-boundary.mjs
node tests/statement-possible/harness.mjs --group=gap-edge2-legal,gap-edge2-known --file=tests/statement-possible/gap-edge2-cases.json
```

A 的字节一致复现：

```powershell
git show 7cc30e41:typescript/tokens/statements/statement-boundary-util.xl.md > tmp/base-sbu.md
# 取 '## static method IsAsiBoundary' 到其后第一个 ``` 围栏的整段，逐行 -cne + sha256
# 期望：219 行、equal=True、sha256=131DE95BF2F0DC7B5BB12A058BE52B7B6C5669956D94F692834E18547A78A92E
```

回退：`git revert <本 commit>` 即回到 `fa3d32af` 的行为（本轮所有改动都在一个 commit 里，没有开关变更）。

---

## 7. 未完成与风险（诚实清单）

1. **RawTail 4**：`return` 受限产生式后裸块的目录归属 / 裸块尾巴重放 / 装饰器成员 + 条件类型返回类型的方法体 /
   模块体括号没有语句目录——四条都在 `legacy-retirement --json` 的 `perFile` 里，机制与后续修法见
   `HANDOFF-5d9a.md` §4 第 4-7 条。
2. **Declined 2**：`new new A()()`（`KindNew` 整格委派 `ParseNew()`，覆盖区间不足）、箭头参数表带类型标注 +
   返回类型谓词（需要新的 `KindParams`）。
3. **FileFallback 4**：函数 / 构造签名的返回类型字面量 `{` 被块目录先抢（4 类 13 条台账内的 4 条）。
4. **`StatementBuilder` 仍是原子建树者**：目标四按「legacy 派发与根候选退场 + 判界单源」判定为达成，
   「形状树逐节点产出语句 AST」没有做（表达式层已由 `StatementShapeAst` 做到）。这是设计层面的边界，不是本轮遗漏。
5. **`IsAsiBoundary` 的两入口结构**：函数体冻结导致「实例化收尾」只能单列成 `IsInstantiationTailAsiBoundary`。
   它和 `IsAsiBoundary` 的关系是「补充一条 allow 判据 + 复用同一批判据」，不是第二套 ASI；但调用方必须**两处都问**
   （候选层委托与 `StatementEndCode`），这一点写在新方法的文档里，后续改动不要只改一处。
6. **`module` / `namespace` 跨行的修复面**：`DeclinesDeclarationHead` 只覆盖「首代码单元是这三个词」的形态；
   `export module` ⏎ … 之类带修饰词的形态不在本轮范围（TS 侧本来也不是这个规则），未新增用例。
7. **`tmp/` 里是本轮用的临时探针**（`gates.mjs` / `probe*.mjs` / `base-sbu.md` / `head-sbu.md`），已被 `.gitignore`
   忽略，未进 commit；复现命令见 §6。
