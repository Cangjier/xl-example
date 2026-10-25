# HANDOFF — Stage 4x：让位门控与壳晚建守卫统一（开关仍默认关）

分支 `feature/possible-statement-s4x`，基线 `feature/possible-statement` @ **5cc01c06**（S4v 的定位在本轮开工时已同步）。
工作目录 `C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-s4x`。

## 1. 结论先行（不伪造绿）

**本轮落地了「门控统一」的实现，但它不是完整修法**：`ShouldYieldToDeclarationShell` 已实现、
13 处 legacy 让位门控已统一改调（一份判据，无第二份复制）；壳的晚建守卫也抽成
`StatementBoundaryUtil.CanEndStatementAt`（原先 `ComputeByIndex` / `IsBuildable` 各抄一遍，现在一处）。
组合用例的**文件级 fallback 消失了**（S4v 的 R-A 链条第一半被切断），但声明壳计数停在 2（期望 3），
并且打开态**新增 1 条回归**（`interface I { }\nconst a = 1;`）与 **1 处 double-accept 冲突**。

因此按纪律：`StatementRouteUtil.EnableDeclarationShell` **仍为 `false`**（生产默认安全），
`build/ts` 的运行期 patch 已还原，`git status` 只剩 `.xl.md` 改动与本文件。

## 2. 改动（4 个文件类型 / 16 个 `.xl.md`）

| 文件 | 改动 |
|---|---|
| `typescript/tokens/statements/statement-boundary-util.xl.md` | 新增 `IsLateAtEof` + `CanEndStatementAt`（「这一格之前能不能收口」的唯一入口） |
| `typescript/tokens/statements/statement-route-util.xl.md` | 新增 `ShouldYieldToDeclarationShell(units, tokenIndex)`：`route 命中 && !CanEndStatementAt`，**唯一**让位判据 |
| `typescript/tokens/statements/declaration-statement-possible-shape.xl.md` | 两处晚建守卫改调 `CanEndStatementAt`，删掉重复的 `lateAtEof` 计算与不再使用的 `StatementScanner` import |
| 13 个 legacy 候选（Import / Export / ImportEquals / ExportAssignment / NamespaceExport / Class / Interface / Function / Enum / Module / TypeAlias + `expression-statement` + `variable-statement`） | 顶部 `Decide(...) === ShellDeclarationFamily` 改调 `ShouldYieldToDeclarationShell`，注释同步 |

证据（`xl_check`）：`891 file(s), 0 error(s)`；`xl_build`：`891 written, 0 error`；`tsc -p`：exit 0。

## 3. 打开态读数（flag=true，仅运行期 patch `build/ts/.../statement-route-util.js`，测完已还原）

| 断言 | 本轮 | 基线（S4v/S4t） |
|---|---|---|
| `declaration-statement-takeover` | `cases=27 failed=2 takeover=21 totalShell=23` | 26/27 |
| `type T = 1;\nenum E { A }\nexport { T, E };` | **失败原因变为 `DeclarationShellCount 增量=2 期望=3`，不再报「文件级 fallback」** | 文件级 fallback |
| `interface I { }\nconst a = 1;` | **新增 FAIL** | PASS（decl=2） |
| `token-ast` | `total=1716 ok=1702 crash=0 diff=4 ts-invalid=10` | 同（4 条未动） |
| `real-dts` | `AST 一致 225 / 226`，`undici-types/global-origin.d.ts structural=9 moved=0 fields=0` | 同 |
| `harness --all` | `pass=101 fail=0 known=1`，但 **double-accept 冲突 1**（`SourceFileShape token#10 ""`：`TypeAliasDeclarationPossibleShape` vs `SourceFileEndPossibleShape`，来自 `type T = A\nreturn;`），file-fallback 1（同一条） | 冲突 0、fallback 1 |
| `harness --double-accept` | `冲突: 0 / cases=120 failed=1` | 冲突 0 |
| `--lint` | PASS | PASS |

默认态（flag=false）**未在本轮末重跑全表**；等价性由构造保证：`ShouldYieldToDeclarationShell` 第一行即
`!EnableDeclarationShell → false`（旧门控在 flag=false 时也恒不命中），`CanEndStatementAt` 与原内联代码逐字同值。
下一轮开工**必须先重跑默认态全表**确认，再继续。

## 4. 为什么「门控统一」还不是修法（下一轮的关键结论）

`CatalogGuide` 的 `Reject` 是**永久删除**，所以一个候选的「让位判据」必须是**单调**的：
一旦不再让位，就不能在后续格子又需要让位。`!CanEndStatementAt` **不是单调的**——它随格子值在
false/true 之间跳（边界格为 true，下一个格又为 false）。后果正是本轮的两处新红：

- `interface I { }\nconst a = 1;`：壳在首格已建 `interface`，到边界格/下一格时门控短暂放开，
  legacy 候选也在同一格 `Accept` → 与壳/终结候选同格成立 → 冲突或文件级 fallback。
- `type T = A\nreturn;`：ASI 边界格放开让 legacy `TypeAlias` 接受，EOF 格又与
  `SourceFileEndPossibleShape` 同格成立 → `--all` 的 double-accept 冲突。

**建议的下一步（二选一，都不新写第二份判据）**：

1. **让壳接管边界格，门控保持恒让位（推荐）**：`DeclarationStatementPossibleShape` 的晚建守卫在
   `tokenIndex > headAt && CanEndStatementAt` 时不再 `Reject`，而是 **Accept 并把搬单元的起点收到
   `tokenIndex`**（只搬边界 token 起的这一段，不碰上一条已闭合的语句）。这样 13 处门控回到
   「route 命中就恒让位」（单调），`export { T, E };` 由壳建（`decl=3`），
   `interface I { }\nconst a = 1;` 也不会再出现 legacy 同格接受。
   注意 `BuildByIndex` 的 `start..tokenIndex` 口径要同步（现在取 `ItemStart`）。
2. 或者保留门控的 cell 判据，但把它做成**单调**：一旦在某一格选择让位，就把该选择**记在候选状态里**
   （`PossibleShapeCache`），后续格子不再翻转。需要新增状态位，改动面比 1 大。

两个方向都要立刻用 `declaration-statement-takeover`（27）+ `--double-accept` + `--all` 三处守。

## 5. 三条 token-ast / real-dts 的现状（未修，证据已收窄）

- `mod-import-defer.ts`：`ImportClause[148,162] name: ts=undefined cj="defer"`；`defer` 是相位修饰词，
  壳走通用声明建树时把 `defer` 落到 clause 的 name 槽。修法仍是「`ImportClausePossibleShape` 识别
  `defer` 修饰符」（legacy 与壳同时受益），本轮未动。
- 三条 `expr-generic-inst*`：形态是 `declare function f<T>(): T` ⏎ `const a = f<string>;`（无分号）——
  **丢的是第二条语句整体**（`VariableStatement`/`VariableDeclarationList`/`VariableDeclaration`/2×`Identifier`
  + 泛型实参节点），不是「声明族抢走泛型实例化」。下一步应直接看「声明壳在 ASI 边界收口后，
  下一条语句是否被跳过」，入口 `tests/cases/token/.../expr-generic-inst-let.ts` + `token-ast` 单文件过滤。
- `real-dts`：`undici-types/global-origin.d.ts structural=9 moved=0 fields=0`（纯结构差），
  与 R-A 同族（`export {}` / `declare global` + 前语句已收口），本轮未拿到节点级 diff。

## 6. 未覆盖清单

1. `EnableDeclarationShell=true` 的全表（ast-json 6167、real-dts 226、token-ast 0）未达成。
2. `tests/statement-possible/declaration-statement-cases.json` 与 `--group=stage4q` 的 harness 映射**仍未接**
   （`run=0 skipped=1`）；`abstract class` / `declare global` / `declare module "m"` / `using` / `export =` /
   `import x = require()` 仍无逐条专用断言。
3. `perf.mjs` 未跑；默认态全表未在本轮末重跑。
4. 只做了 1 个 commit（纪律允许 3–6，预算用尽）。

## 7. 风险

| id | 风险 | 现状 |
|---|---|---|
| W1 | 门控判据非单调（见 §4），打开态会与 legacy 同格接受 | 已实测出 1 条回归 + 1 冲突；开关保持 false |
| W2 | 下一轮若直接改壳的晚建守卫为 Accept，必须同步 `BuildByIndex` 的起点，否则会把上一条已闭合语句搬进新壳（S4r 的 `decl=2` 复发） | 未动，留给下一轮 |
| W3 | 默认态等价性是构造论证，不是实测 | 下一轮第一件事：`xl_build` + `tsc` + `harness --all`（flag=false） |

## 8. 复现命令

```powershell
xl_build targets=["ts"] paths=["core","typescript"]          # 891/0
node <root>\node_modules\typescript\bin\tsc -p <root>\tsconfig.json
# 运行期 patch（绝对路径）：build/ts/typescript/tokens/statements/statement-route-util.js
#   EnableDeclarationShell = false → true；测完 copy 回 .bak
node tests/statement-possible/declaration-statement-takeover.mjs
node typescript/cases/token-ast.mjs --fail-only
node typescript/cases/real-dts-ast.mjs
node tests/statement-possible/harness.mjs --all
```
