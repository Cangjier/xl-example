# HANDOFF — Stage 4ab：声明壳「下一条语句已到」收口边界（打开态两条 gap 修复）

分支 `feature/possible-statement-s4ab`，基线 `feature/possible-statement` @ **b625e941**。
工作目录 `C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-s4ab`。

## 1. 结论先行（不伪造绿）

- **S4z-r2 的「第二个声明壳」假设被实测证伪**。打开态两条 gap 的 `decl=2/3` 里，第二次计数**不是**
  在下一条语句首格建出的声明壳，而是：声明壳在自己的 ASI 边界上**根本收不了口** → 把下一条语句一起吞进壳 →
  `BuildFromShell` 读到两条语句抛错 → `DetachShell` 整段退回 raw；随后根目录在残余的 `;` 上按
  `ItemStart`（`interface` 仍是条目头）再次判成 `ShellDeclarationFamily`，建出一个只含 `;` 的壳并
  收成 `EmptyStatementShape` —— 这才是 `decl=2` 与首节点 `Common` 的完整链条。
- **根因只有一条**：`StatementBoundaryUtil.IsAsiBoundary` 的条件 5 —— 以声明关键字开头的条目，
  换行一律不算 ASI 边界（`class C` ⏎ `{}` 的 `{` 是声明头的一部分，这条对 legacy 是对的）。
  声明壳也吃这一条，于是 `interface I { }` ⏎ `const`、`type T = A` ⏎ `return`、
  `enum E { A }` ⏎ `export { … }` 全部判不出边界。
- **修法**：不动 `IsAsiBoundary` 函数体（硬规则），新增一条**只属于声明壳**的判据
  `StatementBoundaryUtil.IsDeclarationFollowBoundary`：当前代码单元是**能起一条新语句的单词**、
  换行之前那段已经完整（闭合 `{…}` 或 `CanEndExpressionAt`）。`StatementEndPossibleShape.ExpressionEndCode`
  增加 `declarationShell?:bool` 参数，声明族的终结候选传 `true`；表达式族传 `false`（默认值），行为逐位不变。
- **两条 gap 打开态变绿**（§4 逐条读数）。开关**仍未在源码打开**（`EnableDeclarationShell=false`），
  本轮没有拿到「27/27 + --all 101/0 + token-ast 4 条 + real-dts 226/226」的全绿证据，按纪律保持安全默认。

## 2. 实测根因（打开态，日志摘录）

```
=== "interface I { }\nconst a = 1;"
  BUILD host=SourceFileShape ti=2 tok="I" itemStart=0
  DETACH kind=7 data=14
  BUILD host=SourceFileShape ti=13 tok=";" itemStart=0
  FINISH kind=7 built=EmptyStatementShape
decl=2
```

读法：壳在 `I` 那一格才建（`interface` 首格 `DecideDeclaration` 要等第二个代码单元 → `None`），
此后 `const a = 1;` 全部流进壳；`} ⏎ `const` 与 `;` 都判不出收口 → EOF 收口时建造器读到两条语句 →
`DETACH`；根目录随后在 `;` 上再建一个声明壳（`decl` 第二次计数）并收成空语句。`type T = A` ⏎ `return;`、
`enum E { A }` ⏎ `export` 是同一形态。

## 3. 改动（2 个 .xl.md）

| 文件 | 改动 |
|---|---|
| `typescript/tokens/statements/statement-boundary-util.xl.md` | 新增 `IsDeclarationFollowBoundary(units, tokenIndex)`：单词起点（`IsLegacyKeyword` + `let/const/var`）+ 与 `IsAsiBoundary` 同一份 `HasLineBreakBefore` / `CanEndExpressionAt`，闭合 `{…}` 按「已收尾」计入；`IsAsiBoundary` 函数体一字未改 |
| `typescript/tokens/statements/statement-end-possible-shape.xl.md` | `ExpressionEndCode` 增加可选参数 `declarationShell?:bool`，在 `IsAsiBoundary` 之后补一条声明壳边界分支；`ComputeByIndex` / `BuildByIndex` 两处调用点按 `StatementKind == ShellDeclarationFamily` 传入 |

为什么不是「晚建格 Accept 前排除已有声明壳」（S4z-r2 建议的判据）：实测根目录在壳挂载期间**不会**被问到下一格，
第二个壳是 `DetachShell` 之后在残余 `;` 上建的；按建议加判据只会挡住那个空壳，**两条 gap 的 raw 依旧**。

## 4. 本轮读数

`
tsc exit=0; takeover(open) exit=0; harness --all exit=0
`

### 4.1 打开态（运行期 `EnableDeclarationShell=true`，不改源码）

`
PASS "export { a };"  decl=1
PASS "export * from \"m\";"  decl=1
PASS "using x = y;"  decl=1
PASS "interface I { }\nconst a = 1;"  decl=1
PASS "import x from \"y\";\nexport { x };"  decl=2
PASS "type T = 1;\nenum E { A }\nexport { T, E };"  decl=3
PASS "function f(): void { }"  decl=0
PASS "class A { m() { } }"  decl=0
PASS "abstract class A {}"  decl=0
PASS "import(\"m\");"  decl=0
PASS "module.exports = 1;"  decl=0
PASS "const a = 1;"  decl=0

[declaration-statement-takeover] mode=open actualDefault=false expectedTakeover=true cases=27 pass=27 knownGap=0 failed=0 takeover=21 totalShell=24
`

### 4.2 默认态全表（开关 false）

`
SKIP  group stage4 —— 根目录未注册 IfStatementPossibleShape（Stage 4 未实现）
SKIP  group stage5 —— 语句壳 CatalogGuide 的体候选为空（Stage 5 未实现）
[statement-possible] 互斥仪器: cells=714 candidateCalls=4791 endCalls=711 acceptCells=170 waitingNoCandidate=242
[statement-possible] double-accept 冲突: 0
[statement-possible] groups run=8 skipped=3 | cases pass=101 fail=0 skip=0 known=1 uncovered=0
[statement-possible] file-fallback total=0 distinct=0
`

### 4.3 双建冲突 / token-ast / real-dts

`
[statement-possible] 互斥仪器: cells=825 candidateCalls=5511 endCalls=822 acceptCells=191 waitingNoCandidate=284
[statement-possible] double-accept 冲突: 0
[statement-possible] double-accept: cases=120 failed=0

OK         tests/cases/token/types/typeof-import-newline.ts

summary: total=1716 ok=1706 crash=0 diff=0 ts-invalid=10 gap-now-passing=0
known-gap:     0 file(s) (none)
non-known-gap: 1716 file(s) (ok 1706, ts-invalid 10)

real-dts: 文件 226（跳过 TS 非法 0）：解析成功 226、崩溃 0；AST 完全一致 226、有差异 0
真实 .d.ts 全量解析成功且 AST 逐节点一致
`

### 4.4 三条主症状直接读数

`
=== "interface I { }\nconst a = 1;"
  BUILD host=SourceFileShape ti=2 tok="I" itemStart=0
  FINISH kind=7 built=InterfaceDeclarationShape
  FINISH kind=0 built=VariableStatementShape
decl=1 cf=0 mounted=null
<SourceFileShape><InterfaceDeclarationShape><IdentifierShape></IdentifierShape></InterfaceDeclarationShape><VariableStatementShape><VariableDeclarationListShape><VariableDeclarationShape><IdentifierShape></IdentifierShape><NumericLiteralShape></NumericLiteralShape></VariableDeclarationShape></VariableDeclarationListShape></VariableStatementShape></SourceFileShape>

=== "type T = 1;\nenum E { A }\nexport { T, E };"
  BUILD host=SourceFileShape ti=2 tok="T" itemStart=0
  FINISH kind=7 built=TypeAliasDeclarationShape
  BUILD host=SourceFileShape ti=4 tok="E" itemStart=1
  FINISH kind=7 built=EnumDeclarationShape
  BUILD host=SourceFileShape ti=5 tok="{" itemStart=2
  FINISH kind=7 built=ExportDeclarationShape
decl=3 cf=0 mounted=null
<SourceFileShape><TypeAliasDeclarationShape><IdentifierShape></IdentifierShape><LiteralTypeShape><NumericLiteralShape></NumericLiteralShape></LiteralTypeShape></TypeAliasDeclarationShape><EnumDeclarationShape><IdentifierShape></IdentifierShape><EnumMemberShape><IdentifierShape></IdentifierShape></EnumMemberShape></EnumDeclarationShape><ExportDeclarationShape><NamedExportsShape><ExportSpecifierShape><IdentifierShape></IdentifierShape></ExportSpecifierShape><ExportSpecifierShape><IdentifierShape></IdentifierShape></ExportSpecifierShape></NamedExportsShape></ExportDeclarationShape></SourceFileShape>

=== "type T = A\nreturn;"
  BUILD host=SourceFileShape ti=2 tok="T" itemStart=0
  FINISH kind=7 built=TypeAliasDeclarationShape
  BUILD host=SourceFileShape ti=2 tok="return" itemStart=1
  FINISH kind=4 built=ReturnStatementShape
decl=1 cf=1 mounted=null
<SourceFileShape><TypeAliasDeclarationShape><IdentifierShape></IdentifierShape><TypeReferenceShape><IdentifierShape></IdentifierShape></TypeReferenceShape></TypeAliasDeclarationShape><ReturnStatementShape></ReturnStatementShape></SourceFileShape>
`

## 5. 开关与分支状态

- `StatementRouteUtil.EnableDeclarationShell` = **false**（未改）。
- 本轮 1 个源码 commit（2 个 .xl.md + dist），未 push、未 merge、未改主仓库。
- `StatementBoundaryUtil.IsAsiBoundary` 函数体未改。

## 6. 未完成 / 未覆盖

- **未打开开关**：还剩 `asi/asi-type-then-return`（`--all` 唯一 fail）与 token-ast 4 条
  （`modules/mod-import-defer.ts` 的 `defer`；3 条 expr-generic 的「第二条语句被跳过」）未验证是否被本轮修掉。
  本轮预算只够做到「两条 gap 根因 + 修法 + 默认态不回归」。
- `real-dts` 1 条（`undici-types/global-origin.d.ts` structural=9）未定位。
- `--group=stage4q` 到 harness groups 的映射仍未接（第 6 项任务）。
- 未覆盖语法形态（无逐条断言）：`abstract class` / `declare global` / `declare module "m"` /
  `using`（仅组合用例间接）/ `export =` / `import x = require()`。

## 7. 风险

| id | 风险 | 现状 |
|---|---|---|
| R1 | 新判据只用于声明壳（`declarationShell===true`），表达式族 / 变量族 / 控制流族不受影响 | 默认态全表读数见 §4.2 |
| R2 | 声明壳内部换行（`interface I` ⏎ `{`、`type T =` ⏎ `A`、`enum E` ⏎ `{`）不会被误判为边界 | 判据只认「能起新语句的单词」，`{` / `=` / `A` 都不命中 |
| R3 | 打开态其它失败（`asi-type-then-return` / 3 条 expr-generic）未复测 | 开关保持 false，默认态不受影响 |
| R4 | 周期依赖：`statement-boundary-util` 新 import `statement-route-util` | `xl_build` 0 error、`tsc` exit 0 已过；运行期读数见 §4 |