# HANDOFF — Stage 4q：根层声明族与 import/export 语句壳（机制落地，接管未生效）

分支 `feature/possible-statement-s4q`，基线 `feature/possible-statement` @ **877f7e93**。
**core 一行未改**；改的是三个 `typescript/tokens/statements/*.xl.md`，新增一组专用 cases + 独立证明脚本。

---

## 1. 结论先行（不伪造绿）

**壳机制已落地并全表零回归，但本阶段「接管没有真正发生」**：`DeclarationShellCount` 在所有
27 条专用用例上的增量都是 **0**。原因已定位（§4），且已用读数钉住：

| 断言 | 读数 |
|---|---|
| 专用用例 XML == legacy（`EnableShellExpressions=false`） | **27/27 逐字节相等** |
| 专用用例 AST == `ts.createSourceFile`（kind/pos/end/text/name/isTypeOnly） | **27/27 逐节点相等** |
| 文件级 fallback | **0** |
| 确定性（同源码两次解析 XML 相同） | **27/27** |
| 形状泄漏（`StatementShape` / `PossibleShape` / `CatalogGuide`） | **0** |
| `DeclarationShellCount` 增量 | **0（期望 1/1/2/3 全不成立）** |
| `BlockBodyStatementCount` 增量 | **0**（声明族没有注册进块体目录，无双挂载） |

即：**行为逐位与基线相同（安全回退），但「谁建这条语句」没有改变**——声明与导入导出仍是
legacy 候选建的。这不是绿，是「机制就位、接管未生效」，按纪律写清。

---

## 2. 落地的改动（3 个 .xl.md）

### 2.1 `statement-route-util.xl.md`（+103）

- 新家族码 `StatementRoute.ShellDeclarationFamily = 7`（与 `ShellStatementFamily` / `ShellLabel`
  分开取值，计数分开）。文档写明：**只挂根目录、不挂块体目录**；**不覆盖 `function` / `class`**。
- `EnableDeclarationShell:bool = true`（单开关安全回退：false → 这些起点重新判 `Legacy`）。
- `DeclarationShellCount:int = 0`（只增计数，与 `ControlFlowShellCount` / `LabelShellCount` 分列）。
- `IsDeclarationHead(text)`：`interface / enum / type / namespace / module / declare / import / export / using`
  九个关键字，**不含** `function / class / abstract / async`。
- `DecideDeclaration(units, headAt, text)`：三条硬约束——
  ① 只认上表；② 上下文关键字必须看下一格（下一格是符号则 `None`，`export *` 的 `*` 例外），
  因此 `type = 1` / `module.exports` / `type;` 仍走原路径；③ `import` 的表达式位
  （`import(` / `import.meta`）**只返回 `None`**，判据仍只有 `DecideCommon` 一份。
- `Decide` 里在 `DecideCommon` **之前**插 6 行（唯一调用点，独立于 `DecideCommon` 的方法体，
  便于与并行成员合并）：`None` → 落回 `DecideCommon` 的既有判据。

### 2.2 `control-flow-statement-possible-shape.xl.md`（+20）

通用起点候选兼任声明族入口（任务书允许的「扩展控制流候选的关键字表」）：

- `ComputeByIndex` / `IsBuildable`：`ShellStatementFamily` **或** `ShellDeclarationFamily` 才 Accept，
  且仍只在首代码单元那一格；
- `BuildByIndex`：终结候选自称 `ShellDeclarationFamily`（其余两族仍自称 `ShellStatementFamily`）；
- 计数分流：`ShellLabel → LabelShellCount`、`ShellDeclarationFamily → DeclarationShellCount`、
  其余 → `ControlFlowShellCount`。

### 2.3 `statement-end-possible-shape.xl.md`（+14 / -7）

声明族的收口**不新写第二套边界**：`ShellDeclarationFamily` 与 `ShellPlainExpression` **共用同一档**
`StatementKind` 分支（`StatementBoundaryUtil` 的 `;` / EOF / ASI 三条，`ExpressionEndCode` 原样复用），
`BuildByIndex` 的 EOF 分支同样不再走 `ScanRoot`。理由是合法声明的收口点与表达式语句一致
（`type T = 1;` 收在 `;`；`interface I {}` ⏎ `const a` 收在 `}`＝ASI 边界）。

---

## 3. 专用 cases（组 `stage4q`，27 条）

- `tests/statement-possible/declaration-statement-cases.json`：27 条，字段
  `{ name, source, declarationShells, note }`。
  覆盖：`interface I { }`、`interface I { m(): void; }`、`enum E { A }`、`enum E { A, B }`、
  `type T = 1;`、`type T = { a: 1 };`、`namespace N { }`、`module M { }`、
  `declare const x: number;`、`declare function f(): void;`、`import x from "y";`、
  `import {a} from "m";`、`import "m";`、`export const a=1;`、`export default 1;`、
  `export { a };`、`export * from "m";`、`using x = y;`，以及三条组合（含三条连续声明）
  与六条**对照**（`function` / `class` / `abstract class` / `import("m")` / `module.exports = 1` /
  `const a = 1`，期望 shell 增量 0）。
- `tests/statement-possible/declaration-statement-takeover.mjs`：自包含证明脚本（不依赖 harness 的
  group 语义），逐条断言 §1 的七项 + `BlockBodyStatementCount` 必须为 0。
  复现：`node tests/statement-possible/declaration-statement-takeover.mjs`
  当前读数：`cases=27 failed=21 defaultFlags=true takeover=0 totalShell=0`
  （21 条失败**全部**是「`DeclarationShellCount` 增量 0」，没有一条 XML/AST/fallback 失败）。

---

## 4. 接管为什么没生效（已定位的根因）

`SourceFileShape.CreatePossibleShapes()` 的根目录候选**顺序**是：

```
ImportDeclarationPossibleShape, ExportDeclarationPossibleShape, StatementPossibleShape,
ImportEqualsDeclarationPossibleShape, ClassDeclarationPossibleShape, InterfaceDeclarationPossibleShape,
ExportAssignmentPossibleShape, NamespaceExportDeclarationPossibleShape, FunctionDeclarationPossibleShape,
EnumDeclarationPossibleShape, ModuleDeclarationPossibleShape, TypeAliasDeclarationPossibleShape,
VariableStatementPossibleShape, ControlFlowStatementPossibleShape, RootExpressionStatementPossibleShape,
BlockPossibleShape, …
```

`ControlFlowStatementPossibleShape` 排在**第 14 位**，而声明 / 导入导出的 legacy 候选排在**第 1-12 位**。
`CatalogGuide` 在这些起点上先遇到 legacy 声明候选并 `Accept`，条目随即归它，通用壳候选 **没有机会运行**
（因此也不会出现「同格双 Accept」的冲突——`--double-accept` 冲突仍是 0，XML/AST 全相等）。

`Decide` 本身**已经**对这些起点返回 `ShellDeclarationFamily`（dist 里可见 `DecideDeclaration` 与
`Decide` 的调用点，`xl_build` 890/0、`tsc` 0 证明代码就位），只是候选在顺序上轮不到。

**下一步（本阶段未做，需单独一轮验证）** 二选一：

1. 把 `ControlFlowStatementPossibleShape` 移到 `CreatePossibleShapes()` 数组**最前**（1 行 + 注释）。
   风险：`CatalogGuide` 的「同格多 Accept」行为需实测（`--double-accept` 与全表）；
2. 给 9 个 legacy 声明候选各加一行 `Decide != ShellDeclarationFamily` 的让位门控（触碰 8-9 个文件，
   与并行成员的 switch / 块内声明工作不冲突，但改动面大）。

我曾尝试方案 1（用 `[System.IO.File]::WriteAllText` 在数组首行插入），但**该调用用的是进程 CWD
（主仓库 `C:\Users\Admin\Documents\GitHub\xl-example`）、而不是 PowerShell 的 `cd` 位置**，
所以那次写入落到了**主仓库**的同名文件上，本分支文件没有变化（`xl_build` 890 skipped、`git status`
无该文件改动正是这个原因）。**该误写已立即用 `git -C <主仓库> checkout --` 还原，主仓库 `git status` 回到空**；
本分支工作树/提交里**不含**这次尝试。交付状态是干净的「机制就位、顺序未调」。

> 纪律说明：本阶段唯一的越界操作就是这一次误写（主仓库只读要求）。发现后同一轮内还原并复核：
> `git -C C:\Users\Admin\Documents\GitHub\xl-example status --short` 为空、`source-file-shape.xl.md`
> 不含 `Stage 4q` 字样、主仓库 HEAD 未变。

---

## 5. 全表读数（本轮，工作树状态）

| 表 | 读数 |
|---|---|
| `xl_build` targets=["ts"] paths=["core","typescript"] | **890 written / 0 error**（2522 warning，与基线同量级） |
| `tsc -p tsconfig.json` | **exit 0** |
| `tests/parse/validate.mjs` | **1720 / 0** |
| `harness --all` | **101 pass / 0 fail / known 1**，groups run=8 skipped=3，file-fallback **0** |
| `harness --double-accept` | **120 cases / 0 failed**，冲突 **0** |
| `harness --lint` | **PASS** |
| `ast-json` | **6167 / 6167**，`git status --short typescript/cases` **空** |
| `ast-json-diff` | 结构差 0 / 位置差 0 / 字段差 0 |
| `token-ast` | ok **1706** / diff 0 / ts-invalid 10 |
| `real-dts-ast` | **226 / 226**，崩溃 0 |
| `control-flow-body-takeover` | **28 / 0**（brace 33、body **40**；40 是 S4o 后的基线，S4n handoff 的 38 是 S4o 之前） |
| `control-flow-takeover` | **39 / 0** |
| `block-body-takeover` | **21 / 0** |
| `op-ast-proof` / `op-proof` | **90 / 0**、**40 / 0** |
| `comma-import-fallback` | **11 / 0** |
| `perf` | scale n=400 median 3.42ms；ratio(200/100)=2.08、ratio(400/200)=2.66（**既有 WARN**，与基线同） |
| **`stage4q` 新组** | **27 条：XML/AST/fallback/确定性/泄漏 全过；`DeclarationShellCount` 全 0（未生效）** |

> `validate` / `--all` / `ast-json` / `token-ast` / `real-dts` / 各 takeover 脚本的所有读数与基线
> **逐项相同**，与「声明族仍由 legacy 建」一致：本轮的三个 .xl.md 改动在行为上是**空操作**
> （`Decide` 多返回一个值，但没有任何候选在该值上 Accept 得到条目）。

---

## 6. 未覆盖清单（本阶段结束时的真实状态）

1. **声明 / 导入导出族的实际接管** —— 机制就位，因候选顺序未生效（§4）。**这是本阶段最大的未完成项。**
2. **`abstract class`** —— 按设计**排除**：`abstract` 不在 `IsDeclarationHead` 里。判据是
   「安全可判才收」：`abstract class A {}` 的类体括号需要沿用既有类体目录门控
   （`BlockPossibleShape.OnChildBracketCreated` 里 `parent instanceof StatementShape` 分支只做箭头体挂载，
   见 `block-possible-shape.xl.md`），把它做成语句壳会改变体括号的宿主，与既有挂载路径有双挂载风险。
   读数：shell=0，XML/AST 与 legacy 一致（用例 `control-abstract-class`）。
3. **`function` / `class` 语句壳** —— 按任务书要求**不接管**（体语句已由 `TryMountFunctionBody` /
   类体门控负责，见 `HANDOFF-s4n.md` §2、`HANDOFF-s4o.md`）。
4. **块内声明** —— 不注册进 `BlockPossibleShape.CreateBodyPossibleShapes`（并行成员负责，避免双挂载）。
5. **`import x = require("m")` / `export = x` / `export as namespace N`** —— `DecideDeclaration` 对
   `import` + 非 `(`/`.` 一律判声明族（含 `import x = require(...)`），但 `export =` 的下一格是 `Symbol =`
   被判 `None`，仍走 legacy（`ExportAssignmentPossibleShape`）。前者在接管生效后需要逐条对拍。
6. **`declare global {}` / `declare module "m" {}`** —— 下一格是 `Common`/字符串，判声明族；
   接管生效后需补用例。
7. **块内 switch / case** —— 并行成员范畴，本轮未触碰。

---

## 7. 风险

| id | 风险 | 现状 |
|---|---|---|
| R1 | 三个 .xl.md 与并行成员的 `statement-route-util`（switch / 块内声明）改动同文件 | `Decide` 的插入是**独立 6 行 + 独立方法** `DecideDeclaration`，未改 `DecideCommon` / `IsControlFlowHead` / `IsLegacyKeyword`；合并时按方法边界核对即可 |
| R2 | `control-flow-statement-possible-shape` 同时承担控制流与声明两族，`BuildByIndex` 的 `endKind` 分流 | 全表 0 回归；`ControlFlowShellCount` / `LabelShellCount` 读数未变（control-flow-takeover 39/0） |
| R3 | 声明族复用表达式族的收口判据（`ExpressionEndCode`） | 27 条用例 XML/AST 全相等、fallback 0，说明判界对这批形态成立；接管生效后需扩大样本（`declare module "m" {}`、`export * as ns from "m"`） |
| R4 | 若按 §4 方案 1 调整候选顺序，可能与 `--double-accept` 的契约冲突 | 未做；动手前先跑 `--double-accept` + `--all`，冲突非 0 即回退 |
| R5 | 本阶段「接管 0」容易被误读成「坏了」 | 计数与 `--all` / `ast-json` 读数都在：行为与基线逐位相同，是有意的安全回退 |

---

## 8. 复现命令

```powershell
xl_build targets=["ts"] paths=["core","typescript"]        # 890 / 0
node node_modules/typescript/bin/tsc -p tsconfig.json      # 0
node tests/statement-possible/declaration-statement-takeover.mjs   # cases=27 failed=21 takeover=0 totalShell=0
node tests/parse/validate.mjs                              # 1720 / 0
node tests/statement-possible/harness.mjs --all            # 101 / 0 / known 1
node tests/statement-possible/harness.mjs --double-accept ; node tests/statement-possible/harness.mjs --lint
node typescript/cases/ast-json.mjs ; git status --short typescript/cases ; node typescript/cases/ast-json-diff.mjs
node typescript/cases/token-ast.mjs ; node typescript/cases/real-dts-ast.mjs
```
