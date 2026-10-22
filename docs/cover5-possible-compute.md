# cover5 round5 — possible compute（§6 第 4 类）报告

> 工作区 `C:\Users\Admin\Documents\GitHub\xl-example-set\cover5-possible-compute`，分支 `cover5-possible-compute`，
> 基线 `5362a38bffd3a94d605b321a95ac32f3fd02e34c`。TS 6.0.3。
> 口径：TS `parseDiagnostics.length === 0` 且（本仓 crash / AST 不一致）才算真红；TS diag≠0 一律不计。

## 1. 最终读数（本分支口径）

| 项 | 基线 | 现在 |
|---|---|---|
| `ast-json.mjs` | 5335 / cj-ok 5335 / cj-fail 0（47 构造） | **5396 / cj-ok 5396 / cj-fail 0（47 构造）** |
| `ast-json-diff.mjs` | 5335/5335，结构 0、位置 0、字段 0 | **5396/5396，结构 0、位置 0、字段 0** |
| `possible-compute` 单 stem | 68 条全一致 | **129 条全一致（新增 61）** |
| `token-ast.mjs --quiet` | known-gap 0 / non-known-gap 1704（ok 1694, ts-invalid 10） | **同基线：known-gap 0 / non-known-gap 1704（ok 1694, ts-invalid 10）** |
| `real-dts-ast.mjs` | 226 文件、226 解析成功、0 崩溃、226 全一致 | **226/226/0/226** |
| `tsc -p tsconfig.json` | 退出码 0 | **退出码 0** |

探针（`tmp/probe.mjs`，DSH 未跟踪）在 275+71+92+66 条自造边界用例上逐条对拍 TS 6.0.3 AST；
下面所有真红都用 `git stash` 回到基线实测过「基线 crash / 错树」，修复后全绿（61/61）。

## 2. 问题清单（全部 §6 = **possible compute 不对**）

共同根因：**普通候选 / 终结候选的状态机判据没有对齐 TS 的解析结果，也没有彼此同源**——
`ComputeByIndex` 该 Reject 时没 Reject（把下一条语句吃进来 → 静默错树），或该 Accept 时没 Accept
（等到 EOF 才收 → crash）。全部改动都在 `typescript/tokens/**`（不碰 `core/**`）。

### A. `let` / `using` / `type` 是上下文关键字，却被一律按声明关键字处理（主要失效）

复现（TS diag 全 0）：

```text
let = 1;            TS: ExpressionStatement > BinaryExpression(Identifier "let")   本仓基线: crash「变量声明缺少标识符」
let: 1              TS: LabeledStatement(label=let)                                本仓基线: crash「表达式语句没有读完」
let (a);            TS: CallExpression(Identifier "let")                           本仓基线: crash
using = 1;          TS: ExpressionStatement > BinaryExpression(Identifier "using") 本仓基线: crash
using\nx = y;       TS: ExpressionStatement(using) + ExpressionStatement(x=y)      本仓基线: 静默错树（1 条 VariableStatement）
type = 1\na();      TS: 赋值表达式语句 + 调用语句                                    本仓基线: crash「表达式语句没有读完」
```

- **归类**：possible compute（普通候选 `StatementPossibleShape` / `ExpressionStatementPossibleShape`
  的 `ComputeByIndex` 判错）。
- **根因 file:line**：
  - `typescript/tokens/statements/statement-scanner.xl.md` `ScanRoot` / `ScanBody` 的 `let` / `using` / `await using`
    分支：只认「首词是 let/using 就是声明」，没有 TS 的 `isLetDeclaration` /
    `isUsingDeclaration`（next-token binding-identifier-or-destructuring）前瞻；
  - `typescript/tokens/statements/expression-statement-possible-shape.xl.md` `CanStart` / `ComputeByIndex`：
    `let`/`using`/`type` 在 `IsStatementWord` 里被 `CanStart` 直接拒绝，没有「双角色」状态机；
  - `typescript/tokens/statements/statement-builder.xl.md` `BuildStatement`：扫描器判成标签 / 表达式后，
    建树器仍按 `let`/`using` 走 `BuildVariableStatement`（compute 与 build 读的不是同一个判据）；
  - `typescript/tokens/files/source-file-end-possible-shape.xl.md` `isExportVariable` 分支：
    EOF 收口时 `export let`（空声明列表）走 `BuildStatement`，`let` 被当标识符（回归，已由
    「空列表直接 `BuildVariableStatement`」修掉）。
- **修法**：新增唯一判据 `StatementScanner.StartsBinding` / `StartsUsingDeclaration`（与 TS 的
  `nextTokenIsBindingIdentifierOrStartOfDestructuring[*]` 同口径；`using` 要求同一行且不收 `[`；
  `let` 收 `[`/`{`/非保留字 Common；保留字表 = TS `LastReservedWord` 及以下）。
  `ScanRoot`/`ScanBody` 用它分流；`ExpressionStatementPossibleShape` 加 `DualStage`（1=let、2=using、
  3/4=type 三格判定别名头）；`StatementBuilder.BuildStatement` 调用同一 helper；`source-file-end`
  的空声明列表直接 `BuildVariableStatement`。
- **四问**：
  - 正确的应该什么时候 build：`let`/`using` 后面**能起绑定** → 语句候选在声明列表到齐（`;` / ASI / EOF 兜底）时 build；
    不能起绑定 → 表达式候选在 `;` 或 ASI 边界 `Done` 时 build；`let: x` 由语句候选在标签体到齐那格 build。
  - build 时提取什么：声明 → `VariableStatement`（修饰词 + `VariableDeclarationList`，声明名来自绑定单元）；
    表达式 → `Identifier`+二元/调用树；标签 → label 名 + body。
  - 什么时候 close：`BuildByIndex` 里 `FromUnits` 签范围后 `TryToClose()` 立即关闭（Shape 自身不 ExitOrPre）。
  - close 时提取什么：text/name/区间（`IdentifierShape.EscapedText`、`labeled` 的 label 名、列表 Pos 从关键字算起）。

### B. 换行后的「调用位」判据缺一条：上一条表达式不能当调用者时没有 ASI

复现（TS diag 全 0）：

```text
const x = a as T\n(b);            TS: VariableStatement(a as T) + ExpressionStatement((b))
const x = a as T\n[b];            TS: 同上（换行后的 [ 是新语句）
const x = () => {}\n(b);          TS: 同上（块体箭头不是调用者）
const x = () => 1\n(b);           TS: 一条语句，箭头体是 1(b)（表达式体箭头可续接！）
x = a as T + b\n(c);              TS: 一条语句（`+` 之后的 b 是调用者）
x = a as T | U\n(c);              TS: AsExpression(T|U) 之后 `(c)` 是新语句
type T = A\n(b);                  TS: TypeAliasDeclaration + ExpressionStatement
```

- **归类**：possible compute。基线症状两种：**crash**「CatalogGuide: 终结候选与其它候选同时成立」
  （动词位置：语句候选 `Uncertain`，终结候选已经 `Accept`，两个同时成立）或**静默错树**
  （`(b)` 被并成 `a as T(b)` / `() => {}(b)` 调用）。
- **根因 file:line**：
  - `typescript/tokens/statements/statement-scanner.xl.md` `EndsAtLineBreak` / `ScanToSemicolon`：
    `ContinuesAcrossLine` 把 `(`/`[`/模板一律当「接得上」，没有「上一条表达式能不能当调用者」
    （TS 的 CallExpression / TaggedTemplate 宿主必须是 LeftHandSideExpression）这一条；
  - `typescript/tokens/statements/expression-statement-possible-shape.xl.md` `IsAsiBoundary` 的同一条
    （原 `IsNonCallableExpressionTail` 用括号深度回扫：块体箭头的 `}` 反而把 `=>` 埋进 depth，**块体判不出、表达式体误判断**）；
  - `expression-statement-possible-shape.xl.md` 早期在语句起点判据**之前**就返回 `true`，绕过了
    「本条是不是表达式语句」的规则 → 声明语句的换行格上终结候选与语句候选同时 Accept（crash）；
  - `typescript/tokens/declarations/type-alias-declaration-possible-shape.xl.md` `IsAsiBoundary`
    是「语句关键字白名单」，漏了「标识符 / 模板开新语句」「`(` 开新语句」「泛型函数类型 `<T>` ⏎ `(…)` 不算」。
- **修法（判据只有一份）**：`StatementScanner.IsCallPositionBlocked(code, last)`：
  平扫（括号单元整体跳过）回溯——命中 `as`/`satisfies`（类型位）→ 断；块体箭头（`=>` 后紧跟 `{…}`）→ 断；
  后缀 `++`/`--` → 断；命中表达式运算符（含 `in`/`instanceof`）→ 不断；`<` `>` `>>` `>>>` `|` `&` `?` `:` `.` `?.`
  透明继续回溯；`=>`（表达式体）→ 不断。`StatementScanner.EndsAtLineBreak` 与
  `ExpressionStatementPossibleShape.IsNonCallableExpressionTail` **共用它**；`IsAsiBoundary` 把调用位判据
  移到语句起点判据之后（声明语句的换行交给语句候选）；类型别名 `IsAsiBoundary` 改成
  「不是类型续接符」+ `IsTypeParameterListTail`（`<` 紧跟 `=` 的泛型函数类型参数表例外）+ `CanEndTypeAt`
  排除前缀类型关键字与负数前缀 `-`。
- **四问**：
  - 正确的应该什么时候 build：语句候选在「换行 + 上一格收得住 + 当前格接不上（或调用位不可调用）」那一格
    `Accept`，`End` 落在上一格；终结候选在同一格必须 `Reject`（否则 CatalogGuide 抛「同时成立」）。
  - build 时提取什么：变量语句只切到边界前一个代码单元（不吞 `(b)`）；表达式语句 `FromUnits(..., false)`
    建到边界为止；类型别名 `AsiEnd` 时切到 `tokenIndex-1`。
  - 什么时候 close：`BuildByIndex` 里签范围后 `TryToClose()`；边界 token 留在 `host.Data` 由下一条重新处理。
  - close 时提取什么：shape 的 `SourceRange` / `Pos`（含前导 trivia 口径）与 children；AST 换算只在 `ParseFromShape`。
- **cache 复用（IMPORTANCE §3.4 / §7）**：所有 `ComputeByIndex` 仍只用 `PossibleShapeCache.GetState/SetState`
  自己的具名状态（`StatementScan.Checked/End`、`ExpressionStatementScan.Checked/DualStage`、
  `TypeAliasDeclarationScan.Checked/AsiEnd`、`ImportClauseScan.Checked`），**每轮只扫新增单元**；
  新增的 `StartsBinding` / `StartsUsingDeclaration` 只做 1~2 格前瞻，`IsCallPositionBlocked` 只在
  「调用位 + 换行」这一格触发并只回溯当前条目的 basic 单元（不重扫整段）；`BuildByIndex` 仍从
  同一份 cache 读 `Start`（缓存为 null 才回退 `ItemUtil.ItemStart`），建与判读同一份状态。

### C. `import type from "m"`：`type` 的双角色（Lead 转来的 missing-possible 线索，确认属本类）

复现：`import type from 'm';` / `import type\nfrom 'm';` / `import type, { A } from 'm';`（TS 全合法）。
TS：`type` 是**默认导入名**（`ImportClause.name="type"`）；本仓基线：漏掉整个 `ImportClause`（静默错树）
或 crash「未识别的单元（Bracket）」。

- **归类**：possible compute（`ImportClausePossibleShape.BuildByIndex` 的判定；不是「没有候选」）。
- **根因 file:line**：`typescript/tokens/declarations/import-clause-possible-shape.xl.md`
  `BuildByIndex`（`type` 一律 `typeOnly = true`）；`import-declaration-shape.xl.md` `FromUnits` 同款。
- **修法**：新增 `ImportClausePossibleShape.IsTypePhaseModifier(unit)`，按 TS
  `parseImportDeclarationOrImportEqualsDeclaration` 的 lookahead 原文判定：后接 `{`/`*` → 修饰符；
  后接标识符 → 修饰符；后接 `from` → 只有 `from` 之后还是 `from` / `=` 才是修饰符，否则 `type` 是默认导入名；
  其它（`,`/字符串/`;`/EOF）→ 默认导入名。两处 build 入口都改用同一函数。
- **四问**：clause 在「默认名 / `type` 修饰符 + 绑定到齐」那一格 build（`IsBuildable` 仍要求 `*`/`defer` 未到齐时等）；
  build 提取 `IsTypeOnly` / `Name` / `NamedBindings`（具名/命名空间）；clause 进 `MountedUnit` 不 close，
  由 shell 收 `from` 后关闭；close 时提取子句区间。

### D. 语句体表达式缺换行 ASI（`if (a) b` ⏎ `c();` 等）

复现（TS 全合法）：`if (a) b\nc();`、`while (a) b\nc();`、`l: x\ny();` → 基线 crash「语句没有读完」/
「终结候选与其它候选同时成立」。

- **归类**：possible compute（`StatementScanner.ScanExpressionBody` 只认 `;`/EOF，不认换行边界，
  把下一条语句吞进体里）；根因 `statement-scanner.xl.md` `ScanExpressionBody`。
- **修法**：加一条与 `StatementBuilder.BuildExpressionStatement` / `ExpressionStatementShape.ExpressionEnd`
  同源的 `EndsAtLineBreak` 检查（`Node`：`ScanIf` / `ScanDo` 的 `stopAtWhile` 仍优先）。
- **四问**：体在「换行 + 上一格收得住 + 当前格接不上」处 `Complete`；build 时 `IfStatement` 等只消费到
  body End，剩下的留给下一条语句；close 即刻。

## 3. 修复文件（全部 `typescript/tokens/**`，未改 `core/**`、未改 IMPORTANCE.md）

1. `typescript/tokens/statements/statement-scanner.xl.md`
   - `IsReservedWord` / `StartsBinding` / `StartsUsingDeclaration`（let / using / await using 双角色，唯一判据）；
   - `IsCallishUnit` / `IsCallPositionBlocked`（调用位 ASI 的唯一判据，表达式候选共用）；
   - `ScanRoot` / `ScanBody` 分流 `let` / `using` / `await using`；
   - `EndsAtLineBreak` 改签名 `(code, previousIndex, nextIndex)`：调用位 + 类型实参收尾 `>`；
   - `ScanExpressionBody` 补换行 ASI。
2. `typescript/tokens/statements/expression-statement-possible-shape.xl.md`
   - `ExpressionStatementScan.DualStage/DualAt/AwaitUsingAt`（`let`/`using`/`type`/`await using` 双角色）；
   - `CanStart` 不再单格拒绝双角色词；`CanEndExpressionAt` 补双角色（`using` ⏎ `x = y` 可断）；
   - `IsAsiBoundary`：语句起点判据前移、标签语句守卫、调用位判据用 `IsCallPositionBlocked`、
     `async` 头（后跟 `function` 除外）与 `type` 头（`TypeAliasDeclarationShape.IsTypeAliasHead`）双角色；
   - `IsNonCallableExpressionTail` 改为委托 `StatementScanner.IsCallPositionBlocked`（判据只有一份）。
3. `typescript/tokens/statements/statement-builder.xl.md`
   - `BuildStatement` 的 `let` / `using` / `await using` 与 scanner 读同一 helper（compute 与 build 一致）；
   - 空声明列表的 `export let` 由 `source-file-end` 直接 `BuildVariableStatement`（见 4）。
4. `typescript/tokens/files/source-file-end-possible-shape.xl.md`
   - `isExportVariable`：空声明列表直接 `BuildVariableStatement`（`export let` = 空 VariableDeclarationList，回归修复）。
5. `typescript/tokens/declarations/type-alias-declaration-possible-shape.xl.md`
   - `IsAsiBoundary(units,last,at)`：改成「不是类型续接符」；`IsTypeParameterListTail` 例外；
   - `CanEndTypeAt`：前缀类型关键字 / 负号 `-` 不算收得住。
6. `typescript/tokens/declarations/import-clause-possible-shape.xl.md`
   - `IsTypePhaseModifier`（TS lookahead 原文判定）+ `BuildByIndex` 接入。
7. `typescript/tokens/declarations/import-declaration-shape.xl.md`
   - `FromUnits` 的 `type` 判定接入同一函数。

## 4. 新增用例（`typescript/cases/possible-compute.ts`，68 → 129，+61）

按 §5：base 在前、变体（换行 / trivia / 重复形）在后。分 7 组：
`let/using` 双角色（20）、`let/using/type` 语句体 ASI（2）、as/satisfies 调用位（11）、
表达式语句根的调用位（12）、类型别名换行边界（9）、`import type`（4）、语句体换行 ASI（3）。
全部在基线（`git stash` 后重建）实测为 crash / 静默错树、TS diag=0；修复后 129/129 全一致。
两份快照 `possible-compute.{ts,cj}-ast.json` 已同步重写（跟踪文件）。

## 5. 需裁定 / 遗留（本分支未修，均不在新增用例里）

1. **`let\nlet = 1`（类别 7 · end build）**：TS = `VariableStatement(let let = 1)`，本仓 = 两条 ExpressionStatement。
   根因 `source-file-end-possible-shape.xl.md` `BuildTrailingDeclaration` 的多语句分界：下一行以声明关键字开头
   就切断，没有「前一段能不能收住一条完整语句」的检查（`let` 是 `IsStatementWord`，不能收住）。
   命令：`node tmp/probe.mjs <case>` 或直接 `node -e` 走 `SourceFileRunner.Parse`。
2. **块体 / 函数体内部的同一条 ASI（类别 5 · possible build）**：
   `function f() { const x = a as T\n(b); }`、`{ const x = () => {}\n(1); }`、`{ type T = A\n(b); }`
   —— `StatementBuilder.EndsAtLineBreak` 是**另一份**判据（未共享 `IsCallPositionBlocked`），且块体不走候选，
   所以 compute 修不到。建议把 `StatementBuilder.EndsAtLineBreak` 改成调 `StatementScanner.IsCallPositionBlocked`。
3. **顶层 `yield\n(1)` / `await\n(1)`（类别 5 · build）**：TS 顶层 script 里 `yield`/`await` 可当标识符
   （`yield(1)` / `await(1)` 是 CallExpression），本仓 `ExpressionBuilder` 一律当 Yield/Await 表达式。
4. **export 家族的调用位 ASI（类别 4，未修）**：`export default a as T\n(b)`、`export = a as T\n(b)`、
   `export const x = a as T\n(b)`、`export let x = a as T\n(b)`。
   根因：`ExpressionStatementPossibleShape.IsStatementBoundaryAfterExpression` 没有调用位判据；
   `export-declaration-possible-shape` / `export-assignment-possible-shape` 的 Build 也没有 AsiEnd 切片。
   建议与 `IsCallPositionBlocked` 同源接线（本轮收敛未做）。
5. **`const x = a as T\n<b>c;`（类别 5 · build）**：TS 解析成比较 `(a as T) < b > c`（**续接**），
   本仓表达式建树停早（`ExpressionBuilder` 的 `as` 类型后不回到二元层）。

## 6. 复现 / 验证命令（本分支）

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set\cover5-possible-compute
# 重建：xl_build(cwd=上面, paths=["typescript", ...改动文件], targets=["ts"], out="dist")
.\node_modules\.bin\tsc.cmd -p tsconfig.json
node typescript/cases/ast-json.mjs possible-compute    # 129 cj-ok
node typescript/cases/ast-json-diff.mjs possible-compute
node typescript/cases/ast-json.mjs                     # 5396 / cj-ok 5396
node typescript/cases/ast-json-diff.mjs                # 5396/5396，0/0/0
node typescript/cases/token-ast.mjs --quiet            # known-gap 0；non-known-gap 1704（ok 1694）
node typescript/cases/real-dts-ast.mjs                 # 226/226
# 探针（tmp 未跟踪）：node tmp/probe.mjs tmp/final-cases.json
```
