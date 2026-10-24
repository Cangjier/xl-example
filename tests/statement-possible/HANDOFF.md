# T1c HANDOFF — 语句 possible 测试仪器

- 分支：`feature/possible-statement-s1c`（从 `feature/possible-statement` 切，基线 `e335f1fb` / 分支 tip `efaa4a10` 仅 docs）
- 交付：只新增 `tests/statement-possible/` 三个文件（`harness.mjs` / `cases.json` / `perf.mjs`）+ 本文件；**未改 `typescript/` 任何源码**。
- 工作副本：`C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-s1c`（`node_modules` 用 junction 指向主仓库）

## 1. 用法

```powershell
# 前置：build/ts 必须存在且是当前源码的产物
#   xl_build(cwd, paths=["core","typescript"], targets=["ts"]) + node node_modules/typescript/bin/tsc -p tsconfig.json
node tests/statement-possible/harness.mjs                 # 默认只跑 stage1 组（设计 §7.1 口径）
node tests/statement-possible/harness.mjs --all           # 全部分组；未实现阶段整组 skip 并打印原因
node tests/statement-possible/harness.mjs --group=asi,trivia
node tests/statement-possible/harness.mjs --only=let,1*2+3
node tests/statement-possible/harness.mjs --file=cases.json
node tests/statement-possible/harness.mjs --double-accept  # 只跑互斥仪器
node tests/statement-possible/harness.mjs --lint           # ASI 单源 / 优先级单表探测
node tests/statement-possible/harness.mjs --verbose
node tests/statement-possible/perf.mjs [--reps=5 --long=300 --many=2000 --verbose]
```

退出码：失败用例 / 互斥冲突 / 「0 存活候选且无终结候选」/ lint 失败 → 1；否则 0。

## 2. 三件套

1. **AST 逐节点对拍**：`SourceFileRunner.Parse(source,"case.ts")` + `ast-compare.cjAst` vs `ts.createSourceFile` + `tsAst`，逐节点 `kind/pos/end/text/name/isTypeOnly/children`（与 `tests/member-possible` 同口径，复用同一份 `typescript/cases/ast-compare.mjs`）。
2. **形状对拍**（`ToXmlString()` 逐字节）：
   - a) 同源码两次 Parse 的 XML 必须逐字节相同（确定性）；
   - b) 形状树不得出现 `<StatementShape>` / `<PossibleShape>` / `<CatalogGuide>`（设计 I1：壳不进 AST）；
   - c) 若 `StatementRouteUtil` 存在，把 `EnableShellExpressions=false` 再解析一次，壳路径与 legacy 路径 XML 必须逐字节相同（T1d 起成为真正对拍门；基线打 note 说明暂缺）；
   - d) 若 `tests/statement-possible/golden/<group>/<case>.xml` 存在则与其逐字节比（基线不落 golden，留给 T1d/Stage 3 集成 owner）。
3. **互斥仪器**：运行期 monkeypatch `CatalogGuide.prototype.ComputePossibleShapesByIndex`，在每次判定内临时包住 `PossibleShapes[*].ComputeByIndex` 与 `EndPossible.ComputeByIndex`（逐格只调用一次，不重复判定、不改源码，退出即还原）。逐格记录 Accept 集合：
   - `EndPossible` + 任一普通候选同格 Accept → FAIL，打印 `宿主类[span) token#idx[span) "文本"`、accepts 列表、EndPossible 类名；core 自己抛「终结候选与其它候选同时成立」也会被捕获；
   - 0 存活候选（全部 Reject）且 `EndPossible===null` → 记录（对应原型 A 的 28 crash 根因）；
   - 0 存活候选但 EndPossible 存在且未 Accept → 只计数 `waitingNoCandidate`（正常等待，不失败）。

`--all` 默认也带互斥仪器跑（每个 case 只解析一次，仪器与 AST/XML 共用同一次解析）。

## 3. 分组与 skip 原因（基线实测）

| 组 | 状态 | 原因 |
|---|---|---|
| stage1 | **SKIP** | 根目录未注册 `RootExpressionStatementPossibleShape`（T1d 未合并） |
| asi | 12/12 pass | 基线可跑 |
| trivia | 8/8 pass | 基线可跑 |
| route | **SKIP** | `build/ts` 无 `statement-route-util.js`（T1d 未合并） |
| satisfies | 8/8 pass + 1 known | 基线可跑 |
| operators | 18/18 pass | 基线以 legacy 路径对拍；Stage 3 起成为硬门 |
| stage4 | **SKIP** | 根目录未注册 `IfStatementPossibleShape`（`source-file-shape.xl.md` 仍注释） |
| stage5 | **SKIP** | 探测到语句壳 `CatalogGuide.PossibleShapes.length===0`（体候选为空） |

skip 由 `needs` 声明 + 运行期能力探测（根候选名单 / 模块是否存在 / 解析探针）决定，T1a/T1b/T1d/Stage 4/5 合并后**自动启用**，不需要改 harness。

## 4. 基线读数（本机，2026-10-24）

```
node tests/statement-possible/harness.mjs --all
  groups run=4 skipped=4 | cases pass=46 fail=0 skip=0 known=1
  互斥仪器: cells=300 candidateCalls=1395 endCalls=300 acceptCells=30 waitingNoCandidate=69
  double-accept 冲突: 0                                     exit=0

node tests/statement-possible/harness.mjs --double-accept
  double-accept: cases=91 failed=0                            exit=0
  互斥仪器: cells=542 candidateCalls=2785 endCalls=542 acceptCells=74 waitingNoCandidate=107

node tests/statement-possible/harness.mjs --lint
  结果：PASS（ASI 实现唯一 / 优先级数字表只在 operator-table） exit=0

node tests/statement-possible/perf.mjs                      exit=0
  见 §6
```

现有 10 道门（同一工作副本、同一构建产物）**逐位不变**：

| 门 | 读数 |
|---|---|
| xl_build（core+typescript→ts） | 881 written / **0 error** / 2481 warning（既有 W3102/W3103） |
| xl_check | 881 file(s) / **0 error(s)** / 2481 warning |
| tsc -p tsconfig.json | exit 0 |
| tests/parse/validate.mjs | **1720 条 / 0 不合格** |
| typescript/cases/ast-json.mjs | **6167 / 6167**（47 构造，cj-fail=0） |
| typescript/cases/ast-json-diff.mjs | **0 结构 / 0 位置 / 0 字段**（6167/6167） |
| typescript/cases/token-ast.mjs | **1716 文件**（ok 1706 / ts-invalid 10 / crash 0 / diff 0） |
| typescript/cases/real-dts-ast.mjs | **226/226**，崩溃 0 |
| tests/feas-operator/harness.mjs | **6/6** |
| tests/feas-operator/insert-between.test.mjs | **9/9** |

## 5. lint 规则与基线校准

- **L1 ASI 单源**：扫描 `build/ts/**/*.js` 里所有 `IsAsiBoundary(units, …) { … }` 方法定义，括号匹配取函数体；体是单行 `return X.Y.IsAsiBoundary(...)` 判为**委托**，否则判为**实现**。
  - 必须恰好有实现（0 个 → FAIL）；
  - 实现只允许出现在 `expression-statement-possible-shape.js` / `type-alias-declaration-possible-shape.js` / `statement-boundary-util.js`；
  - **一旦 `statement-boundary-util.js` 出现实现，其余两处必须已改成委托**（T1a 的验收：漏改就 FAIL）；
  - 委托体 >400B 视为疑似第二份实现。
  - **校准发现（与设计 §2.1 不一致，需 Lead 知悉）**：基线实际有 **2 个**实现点 —— `expression-statement-possible-shape.js:284`（7191B，判据本体）与 `type-alias-declaration-possible-shape.js:231`（1571B）。设计 §2.1 写的「唯一真正判据」只对表达式那份成立；type-alias 那份是类型别名自己的 ASI 判据。因此 allowlist 按实测校准为两处，T1a 只改表达式那处即可通过（util 出现后 type-alias 若未改会被判 FAIL —— 若 T1a 范围不含 type-alias，需要 Lead 决定把它并入 T1a 或加入 allowlist）。
- **L2 优先级单表**：全仓只允许 `operator-table.js` 定义 `static Precedence(...)`；其它文件出现定义 → FAIL。
- **L3 优先级数字**：除 operator-table 外，`const/let/var precedence = <1..15>` 一律 FAIL。基线唯一已知噪声 `expression-builder.js:311 const precedence = 11`（`as` 的固定优先级，设计 §4.3 要求 Stage 3 迁入 `OperatorTable.AsPrecedence`）被**单独打印为 KNOWN**，不算失败；出现新的数字才是 FAIL。
- 另校验 `operator-table.js` 仍有 ≥10 条数字优先级（实测 12 条），防止表被搬走。

## 6. perf 读数（不设硬阈值）

```
reps=5 long=300 many=2000
long n=300        median=4.22ms  tokens=599  candidateCalls=627   callsPerToken=1.05
many statements=2000 median=20.75ms tokens=2000 candidateCalls=30014 callsPerToken=15.01
scale n=100 0.52ms / n=200 0.59ms / n=400 1.07ms
ratio(200/100)=1.15  ratio(400/200)=1.80（线性≈2.0；>2.5 只告警）
```

解读（重要）：
- **长语句**每次 basic token 的候选调用约 1.05，说明表达式内部几乎不经过根目录（legacy 原子扫描），Stage 3 接操作符候选后这个数会上升，是预期；
- **多语句** `callsPerToken≈15` 与当前根候选数 14 + 1 个 EndPossible 吻合（每个 basic token 问一遍根目录），这是 Stage 2/4 要压的目标；
- n=100 的 0.52ms 已接近计时噪声，比值只作趋势；Stage 间比较请用同机同命令的**比值**，不要引用绝对 ms。

## 7. 已知限制 / 口径

1. `satisfies-decl-instantiation-no-semicolon`（`let a: Foo<Bar>` ⏎ `let b = 1;`）在基线就是 **CJ=`Common` vs TS=`VariableStatement`** 的真实差异，用 `knownBaselineFail: true` 标为 **KNOWN**：不算 PASS、不算 FAIL，打印差异；变好会打印 PASS 但不额外报警。带分号的同形态 `let a: Foo<Bar>;` 是正常 PASS 用例。
2. 顶层 `debugger` ⏎ `{a:1}` 在基线解析失败（根目录未启用 `DebuggerStatementPossibleShape`，属 Stage 4 范围）；该 ASI 用例改为块内 `function f(){ debugger\n{a:1} }`（基线 PASS），Stage 4 可再加回顶层形态。
3. TS 有语法诊断的用例（`using` / `let = 1` / 顶层 `return` 等）默认 **skip AST 对拍**（打印原因），但仍跑互斥仪器；`allowTsDiagnostics: true` 的用例（如 `a<b>;`）强制对拍。
4. `--file` 同时兼容对象分组格式与 `tests/member-possible` 的字符串数组格式。
5. golden 目录只读不写；要落 golden 由集成 owner 在 T1d/Stage 3 生成并提交（harness 会自动比对）。
6. `--group`/默认组的语义按设计：**默认只跑 stage1**，因此基线默认输出只有一行 SKIP；完整验收请用 `--all`。
7. 仪器依赖 `CatalogGuide` / 候选的 `ComputeByIndex` 是原型方法（当前成立）；若将来改成实例箭头字段，包实例仍有效；若对象被冻结会跳过该格记录（判定本身不变）。
8. 只量 `build/ts` 产物，不读 `dist/`；`build/` 不存在时直接报错退出 1。

## 8. 对接建议

- **T1a**：合并后跑 `--lint`，应仍 PASS（util 实现 + 表达式/type-alias 委托）。若 type-alias 未改，按 §5 的提示决定归属。
- **T1d**：`stage1`/`route` 组自动启用；`--all` 会新增「壳路径 XML == legacy XML」对拍与路由分流覆盖；`--double-accept` 必须保持 0。
- **Stage 3**：给 `operators` 组补 golden（`tests/statement-possible/golden/operators/*.xml`），perf 的 `callsPerToken` 作为回归读数。
- **Stage 4/5**：`stage4`/`stage5` 组按 `needs` 自动启用；Stage 5 的探针就是「壳体候选非空」，实现后无需改 harness。
