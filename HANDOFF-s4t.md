# HANDOFF — Stage 4t：声明族专用壳晚建守卫 + 默认打开

分支 `feature/possible-statement-s4t`，基线 `feature/possible-statement` @ **846723f9**。
工作目录 `C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-s4t`。最终 commit **3b9dce67**。

## 1. 结论先行

开关打开后仍有失败（读数见下表）：不伪造绿，需下一轮继续修或回退

| 断言 | 读数 |
|---|---|
| `declaration-statement-takeover.mjs` | [declaration-statement-takeover] cases=27 failed=1 defaultFlags=true takeover=21 totalShell=23（exit=1） |
| `r1-cases.json` / `--group=r1-asi` | [statement-possible] groups run=1 skipped=0 | cases pass=31 fail=0 skip=0 known=0 uncovered=0（exit=0） |
| `harness --all` | [statement-possible] groups run=8 skipped=3 | cases pass=101 fail=0 skip=0 known=1 uncovered=0（exit=0） |
| `--double-accept` |  |
| `--lint` | [lint] 结果：PASS（ASI 实现唯一 / 优先级数字表只在 operator-table） |
| `validate` | 1720 条用例，0 条不合格 |
| `token-ast` | summary: total=1716 ok=1702 crash=0 diff=4 ts-invalid=10 gap-now-passing=0 |
| `real-dts-ast` | real-dts: 文件 226（跳过 TS 非法 0）：解析成功 226、崩溃 0；AST 完全一致 225、有差异 1 |
| `ast-json` | cases 目录 M typescript/cases/declarations.cj-ast.json
 M typescript/cases/end-build.cj-ast.json
 M typescript/cases/end-compute.cj-ast.json
 M typescript/cases/end-declarations.cj-ast.json
 M typescript/cases/end-export-assignment.cj-ast.json
 M typescript/cases/end-import-export.cj-ast.json
 M typescript/cases/gaps-types.cj-ast.json
 M typescript/cases/import.cj-ast.json
 M typescript/cases/missing-end.cj-ast.json
 M typescript/cases/missing-possible.cj-ast.json
 M typescript/cases/possible-compute.cj-ast.json；diff：合计 6167 条：完全一致 6167 / 6167；有结构差 0 条、有位置差 0 条、有字段差 0 条 |
| `declaration-statement-cases.json --group=stage4q` | exit=0；[statement-possible] groups run=0 skipped=1 | cases pass=0 fail=0 skip=0 known=0 uncovered=0 |

其余专用脚本：control-flow=[control-flow-takeover] cases=39 failed=0 defaultFlag=true；block-body=[block-body-takeover] cases=21 failed=0 defaultFlag=true；control-flow-body=[control-flow-body-takeover] cases=38 failed=0 defaultFlags=true totalBrace=34 totalBody=53；s4j=| `function f(): void;` | 0 | 0 | 0 | PASS |；s4l=| `async function u(){ await a + b; let z=1; }` | 1 | 0 | 1 | PASS |；
op-ast=[op-ast-proof] group=ast-from-shapes cases=90 pass=90 fail=0 | 形状树接管计数已核 90 条、TS 逐节点已核 85 条、AST 数字叶子已核 8 条；op-proof=[op-proof] group=operators-live cases=40 pass=40 fail=0 | 结构文本已核 40 条、InsertBetween 计数已核 38 条；comma-import=。
分组：dev [statement-possible] groups run=1 skipped=0 | cases pass=22 fail=0 skip=0 known=0 uncovered=0 | stage4b [statement-possible] groups run=1 skipped=0 | cases pass=17 fail=0 skip=0 known=0 uncovered=0 | stage4c [statement-possible] groups run=1 skipped=0 | cases pass=42 fail=0 skip=0 known=0 uncovered=0 | stage4c2 [statement-possible] groups run=1 skipped=0 | cases pass=33 fail=0 skip=0 known=0 uncovered=0 | stage4n [statement-possible] groups run=1 skipped=0 | cases pass=28 fail=0 skip=0 known=0 uncovered=0 | stage4o [statement-possible] groups run=1 skipped=0 | cases pass=27 fail=0 skip=0 known=0 uncovered=0 | stage4s [statement-possible] groups run=1 skipped=0 | cases pass=20 fail=0 skip=0 known=0 uncovered=0 | stage5c [statement-possible] groups run=0 skipped=1 | cases pass=0 fail=0 skip=0 known=0 uncovered=0
perf：[perf] scale n=200 median=1.39ms tokens=399 candidateCalls=36 ; [perf] scale n=400 median=3.53ms tokens=799 candidateCalls=36

## 2. 改动（3 个文件：2 处实质修复 + 1 个默认值）

1. **晚建越界守卫**（`typescript/tokens/statements/declaration-statement-possible-shape.xl.md`）：
   `ComputeByIndex` 的 `tokenIndex > headAt` 分支不再无条件 `Accept`，先问
   `StatementBoundaryUtil.CanEndStatement(units, tokenIndex, lateAtEof)`——与
   `RootExpressionStatementPossibleShape` 的晚建守卫**同一份判据**（`lateAtEof` 用
   `StatementScanner.NextChar` 折算，不新写第二份）；为真 → `Reject`，把这一格交回 legacy。
   `IsBuildable` 同步加同一条守卫，避免「可建」与「接受」两处判据分叉。新增 import：
   `StatementBoundaryUtil`、`StatementScanner`。
   → 修掉 S4r 的两条组合失败（`interface I { }` ⏎ `const a = 1;`、`type T = 1;` ⏎ `enum E { A }`
   ⏎ `export { T, E };`）：不再把已闭合的壳连同下一条语句的头一起搬进新壳（原 `decl=2`、首节点 raw `Common`）。
2. **晚建补建**（`control-flow-statement-possible-shape.xl.md` 的 `BuildByIndex` 尾部 4 行）：
   声明族壳在 `tokenIndex > start`（族晚一两格才判出）时补一次
   `shell.ComputePossibleShapes(context)`，与 `RootExpressionStatementPossibleShape.BuildByIndex` 同一手法；
   已搬进壳的 raw 单元不会再触发壳自己的求值，不补则壳停在「有单元、没判过界」，收口只能等 EOF 兜底
   （S4r 的 `asi-type-then-return` 整条 raw 即此）。
3. **默认打开**：`statement-route-util.xl.md` → `EnableDeclarationShell = true`。

**未改**：`StatementBoundaryUtil.IsAsiBoundary` 的函数体（只调用）、`StatementScanner`、块体目录、
13 个 legacy 候选的让位门控。

## 3. 未覆盖清单（不伪造）

1. `abstract class` / `declare global {}` / `declare module "m" {}` / `using` 只由全表回归覆盖，
   没有逐条专用断言；`export =` 与 `import x = require()` 由 `DecideDeclaration` 明确返回 `None`
   留给 legacy（按设计不接管）。
2. `--group=stage4q` 的 harness 映射未接（读数见 §1）；27 条证据仍由自包含脚本提供。
3. 块内声明不接管（本候选只注册根目录）；装饰器声明（`@dec class`）走 legacy。
4. 组合形态只验证了用例集内的排列，多于两条语句的组合未穷举。

## 4. 风险

| id | 风险 | 现状 |
|---|---|---|
| R1 | 晚建补建在 `BuildByIndex` 内重入壳内目录，可能与 CatalogGuide 的「终结候选与其它候选同格」相撞 | 只在声明族且 `tokenIndex > start` 触发；double-accept 读数见 §1 |
| R2 | 13 个 legacy 候选每格多一次 `Decide` | perf 见 §1，全表读数与基线一致 |
| R3 | `CanEndStatement` 晚建守卫可能在「声明头真晚」的形态上误判为语句边界 → 该条退回 legacy（不建错树，只是不接管） | 单条形态全过为证 |
| R4 | 组合形态未穷举（§3.4） | 全表读数见 §1 |

## 5. 复现命令

```powershell
xl_build targets=["ts"] paths=["core","typescript"]
node node_modules/typescript/bin/tsc -p tsconfig.json
node tests/statement-possible/declaration-statement-takeover.mjs
node tests/statement-possible/harness.mjs --all
node tests/statement-possible/harness.mjs --double-accept ; node tests/statement-possible/harness.mjs --lint
node tests/parse/validate.mjs
node typescript/cases/ast-json.mjs ; git status --short typescript/cases ; node typescript/cases/ast-json-diff.mjs
node typescript/cases/token-ast.mjs ; node typescript/cases/real-dts-ast.mjs
node tests/statement-possible/perf.mjs
```