# HANDOFF 5d-4：退场指标收尾（declare 变量分派 / raw 尾巴 / 形状拒绝）

分支 `feature/possible-statement-5d4`，本轮两个 commit：

| commit | 内容 |
| --- | --- |
| `628a6f8c` | 源码 + 文档：A（`declare` 变量分派）+ B（`yield` 语句壳）+ `docs/possible-statement-5d-plan.md §8` |
| `73594dea` | **基线单独 commit**：`tests/statement-possible/legacy-baseline.json`（body 里写了前后四项指标） |

起点 `9794534a`（= 5d-1a 指标仪器 + 5d-2a 短族判界 + 5d-2b 带体/链式控制流判界 + 5d-1b 建树所有权迁到 possible 层），
工作树干净，`EnableDeclarationShell=true`。

## 1. 结论先行

| 指标 | 起点 | 终点 | 达标？ |
| --- | --- | --- | --- |
| `LegacyStatementDispatchCount` | 78 | **0** | ✅ **A 必做项真归零** |
| `ScanRootCallCount` | 19243 | 19427 | ⚠️ **+184**（B 的已知代价，见 §4；不是测试回归） |
| `RawTailBuildCount` | 292 | **218** | ✅ −74（未归零，剩余清单见 §5） |
| `ShapeAstDeclinedCount` | 328 | 328 | ❌ 本轮**未动**（剩余三类清单见 §6） |
| `FileFallbackCount`（交叉校验） | 50 | 50 | ✅ 没有靠「整文件重新解析」换数字 |
| 全门 | — | **零回归**（读数见 §7） | ✅ |

A 是硬要求，**真归零**：壳收口路径上再也没有任何形态退回 `StatementBuilder.BuildStatement()` 的整段 raw 分派。
B 做了一族（`yield`），数字降了但没归零；C **没有做**（预算用完），剩余清单与原因在 §6 如实列出，无假绿。

## 2. A：`LegacyStatementDispatchCount 78 → 0`

### 2.1 残余是什么

78 条 100% 是 `declare const|let|var|using` 的 **ambient 变量语句**。`StatementFamilyDispatch` 原先对它们
返回 `null`，理由是那段建树要在建造器内部做三件事：

1. 记住 `declare` 的下标与 `Pos`（TS 的 `VariableStatement.pos` 含修饰词）；
2. `At++` 跳过 `declare` 再 `BuildVariableStatement()`；
3. 把语句 `Pos` 倒回 `declare`，并把 `DeclareKeywordShape` **插到 `Data` 最前**、补 `Parent`。

### 2.2 修法（不是新判据，是把调用点搬个位置）

- `statement-builder.xl.md`：新增独立方法 **`BuildDeclareVariableStatement()`**，方法体是原 `BuildStatement`
  declare 分支里那段代码的**逐字搬迁**（同一个 `this` / `At` / `Positions` / `Pos`，同一批 shape 工厂）；
  `BuildStatement` 的同一格改成 `return this.BuildDeclareVariableStatement();`（判据留原处，不新写）。
- `statement-family-dispatch.xl.md`：`declare` 分支在 `DeclareIsAmbientVariable(builder)` 成立时直接
  `return builder.BuildDeclareVariableStatement();`（原来 `return null`）。判据 `DeclareIsAmbientVariable`
  一字未改——它本来就和 `BuildStatement` 的 ambient 分支同源（`IsVariableKeyword` + `NoLineBreakBetween` +
  `const` 第三格不是 `enum`）。
- 类 / 方法文档同步（`statement-shape.xl.md` 的 fallback 注释也一并改口径）。

**为什么 AST 不可能变**：两条路现在调的是**同一个方法**、同一个 `builder`、同一段 `consumed`、同一个 `Pos`。

### 2.3 证据

- 指标：`LegacyStatementDispatchCount = 0`（语料 6300 用例，crash 0）。
- 专项对拍（tmp，未入库）：`tmp/declare-probe.mjs` **23/23 AST+Pos 一致**，覆盖
  `declare const x: T;` / `declare let a: number, b: string;` / `declare var` / `declare using` /
  `declare const a: { x: number };` / 无类型 / 函数类型 / 数组 / 带初始化 / `declare const enum`（不走本支）/
  `declare class|function|namespace` / **块内**四种 / **函数体内** / 块注释 / `declare` ⏎ `const`（ASI，不合并）/
  同文件两条 / 无分号 EOF。
- 全门：`typescript/cases/ast-json.mjs` 6171/6171 + `ast-json-diff.mjs` 结构差 0 / 位置差 0 / 字段差 0。

## 3. B：`RawTailBuildCount 292 → 218`

### 3.1 先定位（用数据，不猜）

写了 `tmp/rawtail-probe.mjs`：包装 `StatementBuilder.prototype.BuildStatement`，**只**在直接调用方是
`BuildBlock` / `CollectBodyStatements` 时记录（这正好是 `RawTailBuildCount` 的三个自增点），
语料构造与探针完全一致。读数 **292 = 官方探针的 292**，归因：

| 类别 | 条数（约） | 说明 |
| --- | --- | --- |
| `yield` 各种形态 | ~66 | 生成器体里 `yield 1;` / `yield;` / `yield* h();` / `yield a;` … |
| `break` / `continue` + 标签体 | ~24 | 标签语句的**体 `{` 根本没挂块体目录**（结构性） |
| 块内函数 / `async function` 声明段 | ~20 | 块体目录不含声明族候选 |
| 其余零散 | ~180 | 各类「体里第一条语句没被任何候选接住 ⇒ 整个 `{` 走整段 raw 递归」 |

结论：**全部 292 条都来自 `BuildBlock` 的整段 raw 递归**（`HasBuiltBodyStatements == false`），
`CollectBodyStatements` 的 raw 段一条都没有——所以「给体挂目录 / 让候选接住第一条」是唯一有效的方向。

### 3.2 修法：新增 `YieldStatementPossibleShape`（最大一族）

`block-possible-shape.xl.md`：

- 新类 **`YieldStatementPossibleShape`**，与 Stage 4l 的 `AwaitStatementPossibleShape` **逐字同构**：
  `IsYieldHead` / `IsBlockHost` / `ComputeByIndex` / `IsBuildable` / `BuildByIndex`；只对
  「块体 `{` 括号宿主 + 首代码单元 `yield`」`Accept`，`Kind` 与终结候选都取
  `StatementRoute.ShellStatementFamily`（判界走 legacy 同一份 `ScanRoot`、建树走同一段 raw 单元）。
- `CreateBodyPossibleShapes` 把它加进块体目录（所有体目录共用这一份工厂）。
- `statement-route-util.xl.md`：新增门控 **`EnableYieldStatement`**（默认 `true`）与计数 **`YieldShellCount`**（与 `AwaitShellCount` 分开计量，便于逐族验收）。
- 类文档写清判据、互斥（与 `ControlFlow` / `RootExpression` / `Variable` / `Block` / `Declaration` 候选永不同格）、
  以及 §4 的代价与下一阶段入口。

效果：`yield` 语句被壳接住 → 生成器体的 `HasBuiltBodyStatements` 变真 → `CollectBodyStatements` 按序收，
raw 段只剩它旁边仍未接管的语句。

### 3.3 证据

- 指标：`RawTailBuildCount 292 → 218`（−74）。
- 专项对拍（tmp，未入库）：`tmp/yield-probe.mjs` **20/20 AST+Pos 一致、`YieldShellCount=19`、
  `FileFallbackCount` 增量 0**。用例含受限产生式与双角色：
  `yield⏎(x)`、`yield⏎x`、`yield⏎[1]`、`yield 1` ⏎ `yield* other()`、`yield;`、`yield* h()`、
  方法/类里的生成器、`yield: 1`（标签）、`yield = 1`（标识符）、块注释里的换行、switch/case 内、if 内、
  非生成器函数内、`yield\`t\``、多语句混合。
- 全门零回归（§7），`FileFallbackCount` 保持 50（**没有新增任何文件级 fallback**）。

## 4. B 的已知代价：`ScanRoot 19243 → 19427`（+184）

`yield` 壳的判界沿用 `ScanRoot`（与 legacy 根候选同一份）——这是「AST 由构造保证」的前提，
代价是这一族每格 +1 `ScanRoot`。

**试过更省的那条路，不采用**：把壳改成表达式族（`Kind = ShellPlainExpression`、
终结 `StatementKind = ShellPlainExpression` → 判界 `StatementBoundaryUtil.CanEndStatement`，**不调 ScanRoot**）。
实测：`ScanRoot` 不再涨（19243）、`RawTail` 更少（212），但 `CanEndStatement` 到不了 `yield` 的
**受限产生式**那一格——`yield⏎(x)` 会被收进同一个壳，而建造器只建 `yield`，`BuildFromShell` 随即抛
「语句没有读完」→ **文件级重解析**：专项 20 条探针里 **4 条 fallback**。
那是把一条语句从「raw 尾巴」变成「整文件兜底」，比 +184 更坏，所以**回退到 `ShellStatementFamily`**。

**真正的归零办法**（下一阶段）：像 5d-2a/5d-2b 那样在 boundary 层补 `yield` 族判界
（`IsYieldFamilyCode` + `YieldFamilyEndCode` / 专用终结形状，新增一个 `StatementKind`），
让「收口位置」本身变成 possible 层的事实，而不是再问 `ScanRoot`。需要新增终结形状 + 一处
`StatementEndPossibleShape` 分支 + 一轮全门，**超出本轮 9 轮预算**（本轮已用 9 轮：A + 2 次 B 方案试错 + 全门 ×2）。

## 5. B 剩余清单（218 条，未归零，按类别）

`tmp/rawtail-probe.mjs` 现读数（= 官方 218）：

| 类别 | 条数 | 为什么没做 |
| --- | --- | --- |
| `break` / `continue`（几乎全在标签体里） | ~24 | 标签语句的**体 `{` 不挂块体目录**（`LabeledStatement` 建树路径不经过任何体挂载点）。要让它们被壳收，得先给「标签体」补挂载机制——结构性改动，且 `break`/`continue` 在块体目录里连候选都没有。 |
| 块内函数 / `async function` 声明 | ~20 | 块体目录只在 `EnableDeclarationShell` 下补**声明族候选**，而 `function` / `async function` 到今天仍由 legacy 声明族建树（声明壳 + 函数体挂载要一起动）。 |
| 其它「体首语句没候选」的零散形态 | ~174 | 每个 `{` 只要**第一条**语句没被接住，整段体就走 `BuildBlock` 的 raw 递归，于是体内每条都计一次。归零需要「体目录候选覆盖所有语句起点」（声明族 + `await` 之外的 `yield` 已补），属 5d-5 的位移。 |

**为什么不选「把 raw 尾巴改走 `StatementFamilyDispatch`」那条路**：任务里给的①只是所有权一致，
`RawTailBuildCount` 仍会自增（它计的是「走 raw 段建树」这件事），数字不降；
而改 `BuildBlock` 的 raw 递归会让「整段 raw」与「逐条 possible」混在一处，风险大于收益。

## 6. C：`ShapeAstDeclinedCount 328 → 328`（本轮未做，清单如下）

不是「没找到」，是**预算用完了**（A 必做 + B 试了两个方案）。按 `--json` 的 `perFile` 聚类
（194 个文件有读数，Top 30 已看）：

| 类别 | 代表 | 计数 |
| --- | --- | --- |
| 带 `as` / `!` / `[0]` 尾巴的标签模板（非常规被标宿主：`a!\`t\``、`(a)\`t\``、`new C()\`t\``） | `expr-r1225-template-as.ts` 20、`expr-r1221-new-tagged-template.ts` 12、`expr-r1213-optional-chain-member-as.ts` 7、`expr-optional-chain-as.ts` 5 | ~44 |
| 非标识符宿主的标签模板（`[a,b]\`t\``、`/re/g\`t\``、`import.meta\`t\``、`new.target\`t\``） | `expr-r1229-regex-meta-tag.ts` 21、`expr-r1228-array-tag.ts` 18、`ex-tagged-template.ts` 3 | ~42 |
| 类型实参 + 可选调用链 + 标签模板（`a<b>?.(1)\`t\`` / `as` / `satisfies`） | `expr-r1222-instantiation-optional.ts` 16、`expr-r1227-opt-tagged-template.ts` 14、`expr-r1223-instantiation-optional-twice.ts` 8、`expr-r1220-instantiation-as.ts` 5 | ~43 |
| `super` / `new.target` 成员族 | `decl-class-super.ts` 2、`expr-call-super.ts` 2、`cls-super-newtarget.ts` 1、`ex-super-call.ts` 1 | ~6 |
| 其它零散 | `angle.ts` 7、`string.ts` 2、`am-keyword-call.ts` 2 … | 余下 |

共同点：**标签模板的被标表达式**只覆盖简单标识符 / 成员链；`!` / `as` / `satisfies` / 数组字面量 / 正则 /
`import.meta` / `new.target` / 类型实参 + `?.()` 这些「先当被标宿主」的形态仍被形状树拒绝、退回 legacy
表达式重解析。补一类要动 `expression-statement-possible-shape` 的被标宿主判据（逐个放行 + 逐类对拍），
本轮没有时间做。

## 7. 默认全门读数（`xl_build` 0 error + `tsc` exit 0 之后实跑，最终树）

| 门 | 读数 |
| --- | --- |
| `typescript/cases/ast-json.mjs` | **6171 / 6171**（47 构造，cj-fail 0） |
| `typescript/cases/ast-json-diff.mjs` | **6171 / 6171**，结构差 0 / 位置差 0 / 字段差 0；`git status --porcelain typescript/cases` 空 |
| `typescript/cases/token-ast.mjs --quiet` | total=1716 **ok=1706 crash=0 diff=0**，ts-invalid=10，known-gap=0 |
| `typescript/cases/real-dts-ast.mjs` | **226 / 226**，崩溃 0、差异 0 |
| `tests/statement-possible/harness.mjs --all` | **102 pass / 0 fail / known=0 / uncovered=0 / file-fallback=0** |
| `tests/statement-possible/harness.mjs --double-accept` | **120 / 0**，冲突 0 |
| `tests/statement-possible/declaration-statement-takeover.mjs` | **33 / 33**，knownGap=0，takeover=27 |
| `tests/parse/validate.mjs` | **1720 条 / 0 条不合格** |
| `tests/statement-possible/final-matrix.mjs` | **38 / 38**（shapeAst / xmlEqLegacy / astEqTS 各 38/38，knownGap=1 是既有的 `clause-nested-known-gap`） |
| `tests/statement-possible/op-ast-proof.mjs` | **94 / 94** |
| `tests/statement-possible/op-proof.mjs` | **40 / 40** |
| `tests/statement-possible/ast-kind-names.mjs` | **PASS**（live 5/5、self-test 4/4、fixtures 47、运算符节点 262、fail=0） |
| `tests/statement-possible/short-family-boundary.mjs` | **46 / 46**（不退化） |
| `tests/statement-possible/control-flow-boundary.mjs` | **85 / 85**，knownGap=1（不退化） |
| `tests/statement-possible/legacy-retirement.mjs` | **PASS**（基线已更新为 0 / 19427 / 218 / 328 / 328 / 50） |

## 8. 风险与注意

1. **`ScanRoot +184` 是本轮唯一的「反向」数字**（§4）。它不代表行为变差（`0/0/0` 与 `1706/0` 证明 AST 没变），
   但它是「判界还没迁」的直接证据：下一阶段做 `yield` 族 boundary 时，这个数应当回到 19243 甚至更低。
   **评审时请不要只看 RawTail 的 −74 而忽略这 +184。**
2. **`EnableYieldStatement` 是新开关**（默认 `true`）。关掉它 = 行为逐位回到本轮之前（`yield` 语句回到 raw 段），
   可用于快速定位「是不是这一族引入的」。
3. **`BuildDeclareVariableStatement()` 与 `BuildStatement` 的 declare 分支现在是两份调用、一份实现**：
   判据仍在两处（`DeclareIsAmbientVariable` 与 `BuildStatement` 的 inline 条件），但它们本来就同源。
   下一阶段如果删 `BuildStatement` 的 declare 分支，必须确认「根层 legacy 候选不经过 ambient 变量语句」。
4. **`tmp/declare-probe.mjs` / `tmp/rawtail-probe.mjs` / `tmp/yield-probe.mjs` 是调查用，未入库**。
   它们依赖 `build/ts`，复现前必须先 `xl_build` + `tsc`。
5. **`RawTail` 的剩余 218 条结构性原因**是「体首语句没候选 ⇒ 整段体 raw」（§5），
   不是「差几条没接住」；归零的杠杆在「体目录候选要覆盖所有语句起点」，不是逐个补洞。

## 9. 复现与回退

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-5d4

# 生成 + 编译（改了 .xl.md 之后必须按这个顺序；xl_build 用工具，cwd=本目录）
#   xl_build: paths=["typescript/tokens/statements"]（或 ["core","typescript"]）, targets=["ts"]
node node_modules/typescript/bin/tsc -p tsconfig.json

# 指标（前后四项 + 交叉校验）
node tests/statement-possible/legacy-retirement.mjs            # 与基线比对，应 PASS
node tests/statement-possible/legacy-retirement.mjs --quiet    # 只看总计
node tests/statement-possible/legacy-retirement.mjs --json     # 机器可读（逐用例）
node tests/statement-possible/legacy-retirement.mjs --snippets # 42 条逐构造读数

# 本轮专项探针（tmp，未入库；先 build + tsc）
node tmp/declare-probe.mjs   # 23/23 AST+Pos
node tmp/yield-probe.mjs     # 20/20 AST+Pos，YieldShellCount=19，fileFallback 增量 0
node tmp/rawtail-probe.mjs   # raw 尾巴归因（应报告 218）

# 全门
node typescript/cases/ast-json.mjs
node typescript/cases/ast-json-diff.mjs ; git checkout -- typescript/cases
node typescript/cases/token-ast.mjs --quiet
node typescript/cases/real-dts-ast.mjs
node tests/statement-possible/harness.mjs --all
node tests/statement-possible/harness.mjs --double-accept
node tests/statement-possible/declaration-statement-takeover.mjs
node tests/parse/validate.mjs
node tests/statement-possible/final-matrix.mjs
node tests/statement-possible/op-ast-proof.mjs
node tests/statement-possible/op-proof.mjs
node tests/statement-possible/ast-kind-names.mjs
node tests/statement-possible/short-family-boundary.mjs
node tests/statement-possible/control-flow-boundary.mjs

# 回退
git revert --no-edit 73594dea   # 先撤基线（否则指标与源码不一致）
git revert --no-edit 628a6f8c   # 再撤源码
# 或整体：git reset --hard 9794534a （会丢掉两个 commit，谨慎）
```

**只回退 B、保留 A**：把 `block-possible-shape.xl.md` 的 `CreateBodyPossibleShapes` 里
`new YieldStatementPossibleShape()` 删掉即可（`EnableYieldStatement=false` 是等价的安全回退，不必改源码），
然后 `xl_build` + `tsc` + `legacy-retirement.mjs --write-baseline`。
