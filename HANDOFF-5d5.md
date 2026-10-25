# HANDOFF 5d-5：根 legacy 语句候选退场（ScanRoot → 0，fallback 保留）

分支 `feature/possible-statement-5d5`，起点 `09ce8d8e`（5d-1a/2a/2b/1b/3/4 全部合并）。本轮两个 commit：

| commit | 内容 |
| --- | --- |
| `d79fbd92` | 源码 + 探针 + 文档：根候选退场门控、三处判界迁移、`root-retirement.mjs`、两条正对照修正、`docs/possible-statement-5d-plan.md §10` |
| `e3c04e7c` | **基线单独 commit**：`tests/statement-possible/legacy-baseline.json`（body 里写了前后五项） |

## 1. 结论先行

| 指标 | 起点 | 终点 | 达标？ |
| --- | --- | --- | --- |
| `ScanRootCallCount`（默认解析总计） | 18124 | **388** | ✅ **−17736**；388 **全部**是文件级 fallback 的 legacy 重解析 |
| ├ 默认态（`EnableShellExpressions === true`） | 18124 | **0** | ✅ **根扫描退场完成**（专用探针分桶读数） |
| └ fallback 态（`=== false`） | 388 | **388** | ✅ 逐位不变（本阶段允许保留） |
| `LegacyStatementDispatchCount` | 0 | **0** | ✅ 保持 |
| `RawTailBuildCount` | 215 | **215** | 本轮未动 |
| `ShapeAstDeclinedCount` | 328 | **328** | 本轮未动 |
| `FileFallbackCount`（交叉校验） | 50 | **50** | ✅ **一个没增**（没有用兜底换数字） |
| 全门 | — | **零回归**（§6） | ✅ |

一句话：**默认解析里根 legacy 语句候选退场了，`ScanRoot` 在默认态归零；剩下的 388 次只在文件级 fallback
的 legacy 重解析里出现。** 没有新增任何 fallback，AST / XML 全部逐位一致，九道门读数与 5d-4 相同。

## 2. 门控点与设计

### 2.1 根候选从**默认目录**里退出（两份缓存，按态取）

`SourceFileShape.CreatePossibleShapes()` 现在按 `StatementRouteUtil.EnableShellExpressions` 返回**两份**目录之一：

| 缓存 | 何时用 | 内容 |
| --- | --- | --- |
| `CreatePossibleShapesCache` | `true`（默认解析） | **17** 个候选，`StatementPossibleShape` **不在里面** |
| `CreateLegacyPossibleShapesCache` | `false`（文件级 fallback / harness 的 legacy 对拍） | 上面那份 + 在原第 4 位（0 基下标 **3**）插回 `StatementPossibleShape` = **18** 个 |

**为什么必须两份，而不是就地增删一份**：`CatalogGuide.PossibleShapes` 在构造时收下这个数组、此后一个字都不改
（`catalog-guide.xl.md`），而**同一个进程里两种态会交替出现**——默认解析抛错时 `SourceFileRunner.Parse` 会用
`shell=false` 再装配一遍整条文件。若只有一份缓存、按调用时的开关决定放不放根候选，「先跑过一次默认解析」
就会把 false 态的目录永久钉成壳目录（反之亦然），false 态的读数与 AST 立刻变。

false 态那份是 `slice()` 后 `splice(3, 0, new StatementPossibleShape())`：**同一批候选、同一个顺序**，
只有根候选这一个差别。下标 3 不是随手写的——5d-5 之前它正好排在第 4 位（声明 / 导入 / 导出三个专用壳之后），
保原位才能说「false 态逐位等价」，而不是「应该等价」。

`StatementPossibleShape` 的 `ComputeByIndex` / `BuildByIndex` **一字未改**（只改了类文档）：false 态走的就是这两条。

### 2.2 为什么可以退场：它在默认解析里是**死**的

门控**实现之前**先用运行时 monkey-patch 预演过（`tmp/rootgate-sim.mjs`，6300 用例两遍）：

| 预演读数 | 值 |
| --- | --- |
| 门控后 AST 不同的用例 | **0** |
| 门控后文件级 fallback 增量 | **0**（50 → 50） |
| 门控后 crash | **0** |
| 根候选**实际建树**次数（shell=true） | **7**（`await using u3` / `let : 1` / `using : 1` / `await using x` / `using-declarations.ts` ×3） |
| 根候选实际建树次数（legacy 回退） | 32（这 32 条正是 false 态还要它的理由） |

那 7 条本来就是 `StatementRoute.Legacy` 里还没壳化的形态，默认解析里由 `SourceFileEndPossibleShape` 的收尾路径
用**同一个** `StatementBuilder` 建出来——门控前后 AST 逐节点相同（`cjAst` 投影，含 pos/end/text）。
也就是说：默认解析里它**只花 `ScanRoot` 的钱、不建树**（17129 次 = 当时残余的 94.5%）。

## 3. 判界残余：三处调用点一并迁到 boundary 层

根候选退场后，`ScanRoot` 还剩三处调用点（`tmp/scanroot-probe.mjs` 按调用栈归因，全语料）：

| 调用方 | 次数 | 迁到哪里 | 等价性证据（`tmp/scanroot-plan.mjs`，逐调用比对） |
| --- | --- | --- | --- |
| `StatementPossibleShape.ComputeByIndex` | 17129 | 随根候选退场 → **0**（只剩 fallback 态 388） | 见 §2.2 |
| `StatementShape.TryToClose`（EOF 兜底） | 522 | 首格 `;` → `IsSemicolon`（= `Complete(0)` 同一条判据）；短语句族 → `ShortFamilyEndCode(code, true)` | **522 / 522 给出同一个 `End`，0 不一致** |
| `StatementEndPossibleShape.ComputeByIndex` | 440 | `class`/`function` → `DeclarationBodyEndCode`；`await` → 新增 `AwaitUsingEndCode`；`yield` → 不收口 | `yield` 184 次 **0 次 Accept**；`await` 211 次里 11 次 Accept **全部**是 `await using x = …;`；`class` 42 + `function` 3 次 `ScanRoot` 一律 `Mismatch` |
| `StatementEndPossibleShape.BuildByIndex` | 33 | 同上（两处 `else` 分支） | 同上 |

**新增 `StatementBoundaryUtil.AwaitUsingEndCode`**：`ScanRoot` 的 `await` 分支逐字搬迁——只有
`await using <binding>`（同一行能起绑定）按声明列表 `ScanToSemicolonIncremental(code, 3, false, atEof)` 收口，
其余 `await` 形态一律 `-1`（`ScanRoot` 对它们本来就是 `Mismatch` / `NeedMore`，对「到齐没有」是同一个答案）。
`await using` 的接管因此**一个字没变**。

**`yield` 为什么不迁**：`yield` 的受限产生式（`yield⏎(x)`）在 boundary 层没有实现，而 `ScanRoot` 对这一族给的
本来就是「永不 Accept」（它没有 `yield` 分支；`yield:` 标签形态在族分派里已被 `IsControlFlowFamilyCode` →
`IsLabelHead` 接走）。所以这一格保持原样：`End` 恒为 `-1`，壳在体 `}` 处 `DetachShell` 退回 raw，由 legacy 的
`BuildBlock` 递归建树——与迁移前逐位相同（184 次调用、0 次 Accept，不是猜的）。

**三处都留了一条不可达的兜底**（未知族起点仍走 `ScanRoot`）：语料 **0 次**。留着是刻意的——若某天有族没归位，
指标会直接看到 `ScanRoot > 0`，而不是悄悄换一条收口规则。

## 4. `FileFallbackCount = 50` 的根因分类（本轮一个没增）

两遍归因（`tmp/fallback-attrib.mjs`：A 段找出真的触发 fallback 的用例，B 段关掉 `EnableFileFallback`
让异常抛出来，按**最内层**消息聚类）：

| 类别 | 条数 | 最内层消息 / 抛出点 |
| --- | --- | --- |
| 壳收口位置多吞了**下一条语句** | **26** | `语句没有读完` @ `StatementShape.BuildFromShell`（如 `declarations.ts` 6 条、`end-compute.ts` 5 条、`export.ts` 5 条、`end-declarations.ts` 3 条） |
| 建形状时 `SourceRange` 还没设置 | 5 | `SourceRange is not set: SourceRange.Start < 0 \|\| SourceRange.End < 0`（`missing-possible.ts` 5 条） |
| 对象类型成员形状不覆盖 | 4 | `不支持的对象类型成员` @ `TypeBuilder.ParseTypeMember` |
| 表达式范围没读完 | 3 | `表达式没有读完` @ `StatementBuilder.BuildExpressionRange` |
| 模块声明缺体 | 3 | `模块声明缺少模块体` @ `StatementBuilder.BuildModuleDeclaration` |
| 根目录双 Accept | 3 | `CatalogGuide: 终结候选与其它候选同时成立（宿主 SourceFileShape，下标 2）` |
| 类型意外结束 | 2 | `类型意外结束` @ `TypeBuilder.ParsePrimaryType` |
| 单例 | 4 | `表达式语句没有读完` / `表达式意外结束` / `import equals 声明缺少等号` / `函数声明不完整` |

**这 50 条都是 5d-5 之前就存在的**（逐用例比对：`legacy-baseline.json` 的 `fileFallbacks` 列在迁移前后
**一个用例都没变**，集合逐一相同，§5.2）。它们不是本轮引入的，也没有一条被本轮「顺手修好」——如实记着：
**能靠 fallback 走通的形态仍然走 fallback**，这就是 §4.5 第 3 项（删文件级兜底）的前置条件还不满足的直接证据。

## 5. 指标证据（前后 + 逐用例）

### 5.1 四项 + 交叉校验（`legacy-retirement.mjs`，语料 6300 用例、1763 文件不变）

| 指标 | 起点 `09ce8d8e` | 终点 `e3c04e7c` | 差 |
| --- | --- | --- | --- |
| `LegacyStatementDispatchCount` | 0 | 0 | 0 |
| `ScanRootCallCount` | 18124 | **388** | **−17736** |
| `RawTailBuildCount` | 215 | 215 | 0 |
| `ShapeAstDeclinedCount` | 328 | 328 | 0 |
| （交叉）`StatementShapeAst.TotalDeclined` | 328 | 328 | 0 |
| （交叉）`FileFallbackCount` | 50 | 50 | 0 |

逐构造（`--snippets`，42 条）：**42 条全部 `ScanRoot = 0`**（迁移前 1～13，`multi-statement-body` 13、
`arrow-block-body` 11、`object-method-body` 9、`try` 8、`break-continue` 8、`let/const/var-decl` 各 3…）。
`RawTail` 只剩 `label` 1 与 `block-function` 1（与迁移前相同），其余列全 0。

### 5.2 逐用例：只有 `ScanRoot` 这一列变了（`tmp/baseline-diff.mjs`）

| 检查 | 读数 |
| --- | --- |
| 非 `ScanRoot` 列发生变化的用例 | **0** |
| 整行归零而消失的用例（迁移前只有 `ScanRoot` 非零） | 5892 |
| `ScanRoot` 列变化的用例 | 399（全部下降） |
| fallback 用例集合（逐用例比对，不是只比总数） | before 50 / after 50，**只在 before：0、只在 after：0** |

### 5.3 专用探针 `tests/statement-possible/root-retirement.mjs`（新增，PASS）

```
A 根目录：默认 17 个候选，含 StatementPossibleShape = false；关闭态 18 个，根候选下标 = 3
B 全语料 6300 用例（crash 0）：默认态 ScanRoot = 0，文件级 fallback 的 legacy 重解析里 ScanRoot = 388
   默认态根 legacy 候选：ComputeByIndex × 0、BuildByIndex × 0
   触发文件级 fallback 的用例 = 50
C false 态：19 个用例（fallback 语料 12 + 合成 7）逐节点 AST 与默认态一致、ScanRoot 调用 315 次、永不兜底
verdict: PASS —— 默认解析根候选 0 次 ScanRoot（6300 用例），false 态逐位仍工作
```

它同时断言：关闭态目录**逐位**等于「默认目录 + 第 4 位插回根候选」（名字表逐项比，不是只比长度）。

## 6. 默认全门读数（`xl_build` 0 error + `tsc` exit 0 之后实跑，最终树）

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
| `tests/statement-possible/short-family-boundary.mjs` | **46 / 46**（正对照口径见 §7.1） |
| `tests/statement-possible/control-flow-boundary.mjs` | **85 / 85**，knownGap=1（既有） |
| `tests/statement-possible/legacy-retirement.mjs` | **PASS**（基线已更新为 0 / 388 / 215 / 328 / 328 / 50） |
| `tests/statement-possible/root-retirement.mjs`（新） | **PASS**（默认态 0 / false 态仍工作） |

## 7. 未覆盖形态与风险（诚实清单）

1. **两条边界探针的「正对照」改了口径**（`short-family-boundary.mjs` / `control-flow-boundary.mjs`）。
   它们原来断言「块内 `class` 声明体壳在终结候选路径上 `ScanRoot > 0`」，用来证明计数器不空转。
   5d-5 把这一族也迁走了，所以默认态不可能再 `> 0`。改法不是删掉断言，而是**把灵敏度证明搬到 legacy 态**：
   默认态必须 0 次、legacy 态必须 > 0 次（两边一起才算「迁移范围精确」）。读数 46/46、85/85（knownGap 1 既有）。
2. **三处不可达的 `ScanRoot` 兜底**（§3）：语料 0 次，但它们意味着「族覆盖」这件事仍由代码结构保证、不是类型保证。
   若将来有新的 `ShellStatementFamily` 起点没归位，`ScanRoot` 会悄悄变回 > 0（指标可见，测试不一定红）。
3. **`yield` 壳仍然从不接管**（5d-4 的既有形态，本轮只把它的判界从 `ScanRoot` 换成「不收口」）：它在体 `}` 处
   `DetachShell`，由 legacy 的 `BuildBlock` 递归建树。AST 正确、`RawTail` 不受影响，但「`yield` 语句被壳接管」
   这件事今天**还没有真的发生**（`YieldShellCount` 计的是建壳数）。要真接管仍是 5d-4 §4 说的那条路：
   boundary 层补 `IsYieldFamilyCode` + 专用终结形状。
4. **根候选退场 ≠ 这些形态壳化**：`await using`（根层 `using` 声明）、`let:` / `using:` 标签、`async` 非箭头、
   块内 `@` 装饰器声明仍然由 `SourceFileEndPossibleShape` 的收尾路径 / legacy 递归建树（**未改动的代码路径**）。
   默认态 AST 与迁移前逐节点相同，但它们没有自己的壳候选——下一阶段若要继续收口，入口在这里。
5. **`FileFallbackCount = 50` 没有下降**（§4）：这是 §4.5 第 2–4 项（删 `ScanRoot` / 删兜底 / 删指标类）的
   **前置条件没满足**，不是本轮漏做。兜底是那 50 条形态唯一的正确出树路径。
6. **`RawTail 215` / `Declined 328` 本轮没有动**（不在本轮范围）。
7. 没有改 `core/**`、没有改 `IsAsiBoundary` 函数体语义、没有切任何开关的默认值、没有改 `dist/` `build/`。

## 8. 复现与回退

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-5d5

# 生成 + 编译（改了 .xl.md 之后必须按这个顺序；xl_build 用工具，cwd=本目录）
#   xl_build: paths=["typescript/tokens/files","typescript/tokens/statements"], targets=["ts"]
node node_modules/typescript/bin/tsc -p tsconfig.json      # 必须 exit 0 再跑测试

# 指标
node tests/statement-possible/legacy-retirement.mjs            # 与基线比对 → PASS
node tests/statement-possible/legacy-retirement.mjs --quiet    # 只看总计（388）
node tests/statement-possible/legacy-retirement.mjs --snippets # 42 条逐构造（ScanRoot 全 0）
node tests/statement-possible/legacy-retirement.mjs --legacy-only --quiet  # 纯 legacy 底座（scanRoot=23871，仅记录、不比对）

# 本阶段专用探针（已入库）
node tests/statement-possible/root-retirement.mjs              # 默认态 0 / false 态仍工作 → PASS

# 全门（§6 的读数就是按这个顺序跑出来的）
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

# 调查用探针（tmp，未入库；先 build + tsc）
node tmp/scanroot-probe.mjs        # ScanRoot 归因（默认态 0 / fallback 388）
node tmp/scanroot-plan.mjs         # 三处判界迁移的逐调用等价性（0 mismatch）
node tmp/rootgate-sim.mjs          # 门控预演（AST 0 差 / fallback 0 增 / 根候选建树 7）
node tmp/fallback-attrib.mjs       # 50 条 fallback 的根因聚类
node tmp/baseline-diff.mjs         # 新旧基线逐列比对（非 ScanRoot 列 0 变化）
node tmp/await-yield-detach.mjs    # await/yield 壳「收口 or 拆壳」实证

# 回退
git revert --no-edit e3c04e7c   # 先撤基线（否则指标与源码不一致）
git revert --no-edit d79fbd92   # 再撤源码
# 或整体：git reset --hard 09ce8d8e（会丢掉两个 commit，谨慎）

# 只做「根候选回到默认目录」的回退（保留三处判界迁移）：
#   把 source-file-shape.xl.md 的 CreatePossibleShapes 末尾改成总是返回
#   CreateLegacyPossibleShapesCache（等价于删掉那份门控），再 xl_build + tsc +
#   legacy-retirement.mjs --write-baseline（ScanRoot 会回到 1383，其余三项不变）
```

**回退的最小安全点**：`EnableShellExpressions = false`（`--legacy-only` 或 harness 的 legacy 档）永远是
「5d-5 之前」的行为——它不是回退开关，但它证明了 false 态没被本轮碰过（§5.3 的 C 段）。
