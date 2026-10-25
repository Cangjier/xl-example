# HANDOFF — Stage 4r：声明 / 导入导出族接管（专用候选 + 让位门控，实测后默认关）

分支 `feature/possible-statement-s4r`，基线 `feature/possible-statement` @ **64cb87ef**。
工作目录 `C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-s4r`。

## 1. 结论先行（不伪造绿）

S4q 的根因（通用候选排第 14 位、legacy 声明候选同格 Accept）已经修掉，接管**真的发生了**：
打开开关时 27 条专用用例 **25 条单条形态全过**（`DeclarationShellCount=1`、XML==legacy、AST==TS、
fallback 0、确定性 27/27），`takeover` 计数从 0 变 **21/27**。但仍有 **2 条多语句组合**与
**1 条 ASI 用例**不绿，所以按纪律**默认关**（`EnableDeclarationShell:bool = false`），
行为逐位回到 Stage 4q 的安全回退。机制与证据都留在代码里，下一阶段只需修这两类形态再翻默认值。

## 2. 落地的改动（打开时生效；默认关时全部惰性）

1. **新候选 `typescript/tokens/statements/declaration-statement-possible-shape.xl.md`**
   `DeclarationStatementPossibleShape extends ControlFlowStatementPossibleShape`，只重写
   `ComputeByIndex` / `IsBuildable`：只认 `StatementRoute.ShellDeclarationFamily`；route 还没判出（`None`）时
   `Uncertain`（不 Reject，Reject 在 `CatalogGuide` 里是永久的）；route 判成声明族后（含晚一两格的补建）Accept。
   建壳 / 收口 / 建树 / 计数**全部继承**同一个 `BuildByIndex`（`ShellDeclarationFamily` 的分支 S4q 已有）。
   只注册进根目录（`SourceFileShape.CreatePossibleShapes` 第 1 位）；块体目录一个字未改。
2. **13 个 legacy 候选让位门控**（`ComputeByIndex` 顶部 4 行）：`Decide === ShellDeclarationFamily` → `Reject`。
   11 个声明 / 导入导出候选（Import / Export / ImportEquals / ExportAssignment / NamespaceExport / Class /
   Interface / Function / Enum / Module / TypeAlias）+ `expression-statement` + `variable-statement`。
   `EnableDeclarationShell=false` 时 `Decide` 返回 `Legacy`，门控整体失效。
3. **`statement-route-util.xl.md`**：
   - `DecideDeclaration` 增加开关联锁（`EnableShellExpressions` / `EnableControlFlowShell`）；
   - 下一个代码单元是 **EOF** 时返回 `None`（裸 `type` / `interface` 不抢 legacy）；
   - `import x = require("m")`（`import` + Common 且再下一格 `=`）与 `export as namespace N` 返回 `None`，留给 legacy；
   - 新增 `IsDeclarationPending`，`Decide` 在「第二个代码单元还没到」时返回 `None`（否则 `declare` / `type`
     会先落回 `DecideCommon` 的 `Legacy`，专用候选在首格被永久 Reject——这是 S4q 之外新发现的一处死锁）。
4. `source-file-shape.xl.md`：导入 + 第 1 位 `new DeclarationStatementPossibleShape()`（带注释）。

## 3. 打开时的实测（flag=true，本轮读数）

| 断言 | 读数 |
|---|---|
| `declaration-statement-takeover.mjs` | **cases=27 failed=2 takeover=21 totalShell=25** |
| 单条形态（interface/enum/type/namespace/module/declare const/declare function/import 4 种/export 6 种/using） | **25/25 全过**，每条 `DeclarationShellCount=1`、XML==legacy、AST==TS、fallback 0 |
| `harness --all` | 100 pass / **1 fail**（`asi/asi-type-then-return`）/ known 1 |
| `harness --double-accept` | 120 cases / 0 failed，冲突 0 |
| `harness --lint` | PASS |
| `validate` | 1720 / 0 |
| `xl_build` `tsc` | 890/0（16 written, 875 skipped）、exit 0 |

**两条失败**：
- `interface I { }` ⏎ `const a = 1;` → `XML != legacy`、AST `#0 TS=InterfaceDeclaration CJ=Common`、`decl=2`；
- `type T = 1;` ⏎ `enum E { A }` ⏎ `export { T, E };` → `XML != legacy`、AST `#4 TS=EnumDeclaration CJ=Common`。
- 全表回归 `asi/asi-type-then-return`（`type T = A` ⏎ `return;`）：声明壳在 ASI 边界收口后既没建树也没重放，
  整条退化成 root 下的 raw。

## 4. 根因（已定位到判据，不再猜）

1. **组合用例双建壳**：专用候选在 `tokenIndex > headAt` 时**无条件** Accept（为了晚判的 `type T` / `declare const`）。
   上一条语句已经收口、下一条语句刚开始的那一格（`}` ⏎ `const`、`;` ⏎ `enum`），`ItemStart` 仍指向前一条语句，
   route 仍是声明族 → 专用候选把「已闭合的壳 + 下一条语句的头」一起搬进新壳 → `decl=2`、首节点变 raw Common。
   **修法（下一步）**：照抄 `RootExpressionStatementPossibleShape` 的晚建守卫——
   `tokenIndex > headAt` 时先问 `StatementBoundaryUtil.CanEndStatement(units, tokenIndex, atEof)`，为真就 `Reject`；
   只在语句中间补建。
2. **ASI 收口**：`ShellDeclarationFamily` 的终结候选 S4q 复用了表达式族的 `;` / EOF / ASI 判界。`type T = A` ⏎ `return;`
   在 ASI 边界把壳收在 `A`，但收口后 `FinishShell` 的 leftover 重放没有把 `return;` 交回根目录（或建树失败后
   `DetachShell` 把 raw 留在了 root），XML 里整条是 `<Common>type</Common>…<Common>return</Common>;`。
   下一步二选一：① 声明族收口改走 legacy `StatementScanner.ScanRoot`（与标签 / 控制流同一条），
   ② 保留 ASI 判界但在 `FinishShell` 后强制把 leftover 按原位重放一次（`LeftoverReplayCount` 已有通道）。

## 5. 未覆盖清单

1. `abstract class` —— 按设计排除（`abstract` 不在 `IsDeclarationHead`；类体挂载走既有门控）。
2. `function` / `class` 语句 —— 不接管（体语句已由 `TryMountFunctionBody` / 类体门控负责）；`const enum` 仍走 legacy。
3. `export = x`、`export as namespace N`、`import x = require("m")` —— `DecideDeclaration` 明确返回 `None`，留给 legacy。
4. `declare global {}` / `declare module "m" {}` —— 判据会判成声明族，但**没有专用用例**验证建造器；
   打开默认值前必须补。
5. 装饰器声明（`@dec interface I` / `@dec class A`）—— 头是 `Symbol @`，`Decide` 返回 `None`，走 legacy。
6. 块内声明 —— 不注册进块体目录（并行成员范畴），`BlockBodyStatementCount` 增量 0。
7. 多语句组合与 ASI 收口 —— 本轮未修，是默认关的直接原因（见 §4）。
8. `--group=stage4q` harness 映射 —— 未做；专用证据仍由自包含脚本 `declaration-statement-takeover.mjs` 提供。

## 6. 风险

| id | 风险 | 现状 |
|---|---|---|
| R1 | 13 个 legacy 候选各加 4 行门控，与并行成员的 statement-route-util / 块内声明改动同文件 | 门控只在方法首 4 行，`Decide` 的改动按方法边界插入，合并时按方法核对 |
| R2 | 默认关时多 13 次 `Decide` 调用 / 格 | 全表读数与基线一致；perf 见下 |
| R3 | 新候选继承 `BuildByIndex`，打开时会把晚判的声明头一起搬进壳 | 25/27 证明单条形态成立；组合形态见 §4 |
| R4 | `IsDeclarationPending` 让 `declare` / `type` 在首格返回 `None` | 关闭开关时它先返回 false，行为逐位回到 S4q |

## 7. 本次收尾运行读数（flag=false 安全回退）
- token: ===== TOKEN ===== OK         tests/cases/token/types/type-union-two.ts OK         tests/cases/token/types/type-union-undefined.ts OK         tests/cases/token/types/type-unique-symbol.ts OK         tests/cases/token/types/typeof-import-newline.ts  summary: total=1716 ok=1706 crash=0 diff=0 ts-invalid=10 gap-now-passing=0 known-gap:     0 file(s) (none) non-known-gap: 1716 file(s) (ok 1706, ts-invalid 10) TOKEN EXIT=0  | summary: total=1716 ok=1706 crash=0 diff=0 ts-invalid=10 gap-now-passing=0 | known-gap:     0 file(s) (none) | non-known-gap: 1716 file(s) (ok 1706, ts-invalid 10)
- cfbody: ===== CFBODY ===== PASS "switch (x) { case 1: { if (a) { b; } } }"  brace=0 body=1 cf=1 PASS "if (a) b;"  brace=0 body=0 cf=1 PASS "if (a) b\n{}"  brace=0 body=0 cf=1 PASS "({ m() { let z = 1; } });"  brace=0 body=1 cf=0 PASS "const f = x => { let z = 1; };"  brace=0 body=1 cf=0 PASS "{ function f() { let x = 1; } }"  brace=0 body=0 cf=0  [control-flow-body-takeover] cases=31 failed=0 defaultFlags=true totalBrace=33 totalBody=41 CFBODY EXIT=0 PASS "const f = x => { let z = 1; };"  brace=0 body=1 cf=0 | PASS "{ function f() { let x = 1; } }"  brace=0 body=0 cf=0 |  | [control-flow-body-takeover] cases=31 failed=0 defaultFlags=true totalBrace=33 totalBody=41
- astjson: see above
- cf: ===== CONTROLFLOW ===== PASS "l1: l2: f();"  cf=0 body=0 label=1 PASS "en: { a; b; }"  cf=0 body=0 label=1 PASS "en: while (a) b;"  cf=0 body=0 label=1 PASS "{ en: a; g(); }"  cf=0 body=2 label=1 PASS "en: a;\nb;"  cf=0 body=0 label=1 PASS "en /* c */ : a;"  cf=0 body=0 label=1  [control-flow-takeover] cases=39 failed=0 defaultFlag=true CONTROLFLOW EXIT=0 PASS "en: a;\nb;"  cf=0 body=0 label=1 | PASS "en /* c */ : a;"  cf=0 body=0 label=1 |  | [control-flow-takeover] cases=39 failed=0 defaultFlag=true
- takeover: ===== TAKEOVER ===== PASS "function f(): void { }"  decl=0 PASS "class A { m() { } }"  decl=0 PASS "abstract class A {}"  decl=0 PASS "import(\"m\");"  decl=0 PASS "module.exports = 1;"  decl=0 PASS "const a = 1;"  decl=0  [declaration-statement-takeover] cases=27 failed=22 defaultFlags=false takeover=0 totalShell=0 TAKEOVER EXIT=1 PASS "module.exports = 1;"  decl=0 | PASS "const a = 1;"  decl=0 |  | [declaration-statement-takeover] cases=27 failed=22 defaultFlags=false takeover=0 totalShell=0
- s4l: ===== S4L ===== | `const o = { m(){ await f(); } };` | 1 | 1 | 1 | PASS | | `const p = async () => { await f(); };` | 1 | 1 | 1 | PASS | | `async function q(){ if (a) { await f(); } }` | 1 | 2 | 1 | PASS | | `async function r(){ for await (const x of y) { await x; } }` | 1 | 1 | 0 | PASS | | `await f();` | 0 | 0 | 0 | PASS | | `const t = { await: 1 };` | 0 | 0 | 0 | PASS | | `function s(){ await f(); }` | 1 | 1 | 1 | PASS | | `async function u(){ await a + b; let z=1; }` | 1 | 0 | 1 | PASS | S4L EXIT=0 | `await f();` | 0 | 0 | 0 | PASS | | | `const t = { await: 1 };` | 0 | 0 | 0 | PASS | | | `function s(){ await f(); }` | 1 | 1 | 1 | PASS | | | `async function u(){ await a + b; let z=1; }` | 1 | 0 | 1 | PASS |
- perf: ===== PERF ===== [perf] long n=300 median=3.44ms tokens=599 candidateCalls=36 callsPerToken=0.06 [perf] many statements=2000 median=29.89ms tokens=2000 candidateCalls=36018 callsPerToken=18.01 [perf] scale n=100 median=0.71ms tokens=199 candidateCalls=36 [perf] scale n=200 median=1.33ms tokens=399 candidateCalls=36 [perf] scale n=400 median=3.52ms tokens=799 candidateCalls=36 [perf] scale ratio(200/100)=1.88 ratio(400/200)=2.64（线性≈2.0；>2.5 视为退化告警，不判失败） [perf] WARN 耗时增长超过 2.5 倍，疑似二次退化（设计 §8.3.3） [perf] done PERF EXIT=0 [perf] scale n=400 median=3.52ms tokens=799 candidateCalls=36 | [perf] scale ratio(200/100)=1.88 ratio(400/200)=2.64（线性≈2.0；>2.5 视为退化告警，不判失败） | [perf] WARN 耗时增长超过 2.5 倍，疑似二次退化（设计 §8.3.3） | [perf] done
- block: ===== BLOCKBODY ===== PASS "{ f() }"  shells=1 body=1 PASS "{ let x = 1; f() }"  shells=1 body=2 PASS "{ /*c*/ a; }"  shells=1 body=1 PASS "{ a /*c*/ }"  shells=1 body=1 PASS "{ if (a) b; while (c) d; }"  shells=1 body=2 PASS "{ a; if (b) c; d; }"  shells=1 body=3  [block-body-takeover] cases=21 failed=0 defaultFlag=true BLOCKBODY EXIT=0 PASS "{ if (a) b; while (c) d; }"  shells=1 body=2 | PASS "{ a; if (b) c; d; }"  shells=1 body=3 |  | [block-body-takeover] cases=21 failed=0 defaultFlag=true
- opast: ===== OPAST ===== PASS  s3m-class-extends-static  shapeAst=1 declined=0 texts=["(class)"] PASS  s3m-param-object  shapeAst=1 declined=0 texts=["arrow((object))"] PASS  s3m-param-array  shapeAst=1 declined=0 texts=["arrow((array))"] PASS  s3m-param-default  shapeAst=1 declined=0 texts=["arrow((a=1))"] PASS  s3m-param-rest  shapeAst=1 declined=0 texts=["arrow(params)"] PASS  s3m-declined-async-arrow-type  shapeAst=0 declined=1 texts=["params"]  [op-ast-proof] group=ast-from-shapes cases=90 pass=90 fail=0 | 形状树接管计数已核 90 条、TS 逐节点已核 85 条、AST 数字叶子已核 8 条 OPAST EXIT=0 PASS  s3m-param-rest  shapeAst=1 declined=0 texts=["arrow(params)"] | PASS  s3m-declined-async-arrow-type  shapeAst=0 declined=1 texts=["params"] |  | [op-ast-proof] group=ast-from-shapes cases=90 pass=90 fail=0 | 形状树接管计数已核 90 条、TS 逐节点已核 85 条、AST 数字叶子已核 8 条
- lint: ===== LINT ===== [lint] ASI 判据定义点   impl      typescript/tokens/declarations/type-alias-declaration-possible-shape.js:237 (units, last, at) body=1571B   impl      typescript/tokens/statements/statement-boundary-util.js:16 (units, tokenIndex, limit) body=8116B   delegate  typescript/tokens/statements/expression-statement-possible-shape.js:286 (units, tokenIndex, limit) [lint] 优先级来源   Precedence 定义 typescript/tokens/expressions/operator-table.js [lint] OperatorTable 数字优先级条目=12 [lint] 结果：PASS（ASI 实现唯一 / 优先级数字表只在 operator-table） LINT EXIT=0 [lint] 优先级来源 |   Precedence 定义 typescript/tokens/expressions/operator-table.js | [lint] OperatorTable 数字优先级条目=12 | [lint] 结果：PASS（ASI 实现唯一 / 优先级数字表只在 operator-table）
- validate: ===== VALIDATE =====  1720 条用例，0 条不合格 VALIDATE EXIT=0  | 1720 条用例，0 条不合格
- double: ===== DOUBLE ===== [statement-possible] 互斥仪器: cells=821 candidateCalls=5436 endCalls=818 acceptCells=190 waitingNoCandidate=284 [statement-possible] double-accept 冲突: 0 [statement-possible] double-accept: cases=120 failed=0 DOUBLE EXIT=0 [statement-possible] 互斥仪器: cells=821 candidateCalls=5436 endCalls=818 acceptCells=190 waitingNoCandidate=284 | [statement-possible] double-accept 冲突: 0 | [statement-possible] double-accept: cases=120 failed=0
- comma: ===== COMMA =====   import-meta  source="import.meta;"  shapeAst=1 declined=0       declineReason=""  tsExpression=MetaProperty       shapeNodes=["MetaPropertyShape"]  shapeTexts=["member(import,meta)"]   import-dynamic  source="import(\"x\");"  shapeAst=1 declined=0       declineReason=""  tsExpression=CallExpression       shapeNodes=["CallExpressionShape","ImportKeywordShape"]  shapeTexts=["call(import)"]  [comma-import-fallback] cases=11 pass=11 fail=0（契约：XML==legacy、无 fallback、无形状泄漏、控制组仍被接管） COMMA EXIT=0       declineReason=""  tsExpression=CallExpression |       shapeNodes=["CallExpressionShape","ImportKeywordShape"]  shapeTexts=["call(import)"] |  | [comma-import-fallback] cases=11 pass=11 fail=0（契约：XML==legacy、无 fallback、无形状泄漏、控制组仍被接管）
- all: ===== ALL ===== [group] satisfies: pass=8 fail=0 skip=0 uncovered=0 [group] operators: pass=18 fail=0 skip=0 uncovered=0 SKIP  group stage4 —— 根目录未注册 IfStatementPossibleShape（Stage 4 未实现） SKIP  group stage5 —— 语句壳 CatalogGuide 的体候选为空（Stage 5 未实现） [statement-possible] 互斥仪器: cells=714 candidateCalls=4725 endCalls=711 acceptCells=170 waitingNoCandidate=242 [statement-possible] double-accept 冲突: 0 [statement-possible] groups run=8 skipped=3 | cases pass=101 fail=0 skip=0 known=1 uncovered=0 [statement-possible] file-fallback total=0 distinct=0 ALL EXIT=0 [statement-possible] 互斥仪器: cells=714 candidateCalls=4725 endCalls=711 acceptCells=170 waitingNoCandidate=242 | [statement-possible] double-accept 冲突: 0 | [statement-possible] groups run=8 skipped=3 | cases pass=101 fail=0 skip=0 known=1 uncovered=0 | [statement-possible] file-fallback total=0 distinct=0
- op: ===== OP ===== PASS  op-unsupported-postfix  texts=["post(a)"] inserts=1 bodies=1 PASS  op-unsupported-string  texts=["+(string,a)"] inserts=1 bodies=1 PASS  s3g-op-object-member  texts=["+(member((object),a),1)"] inserts=2 bodies=1 PASS  s3g-op-template-interp  texts=["+(template,z)"] inserts=1 bodies=1 PASS  s3g-op-new-chain  texts=["member(new(X),y)"] inserts=1 bodies=1 PASS  s3g-op-optional-chain  texts=["member(member(a,b),c)"] inserts=2 bodies=1  [op-proof] group=operators-live cases=40 pass=40 fail=0 | 结构文本已核 40 条、InsertBetween 计数已核 38 条 OP EXIT=0 PASS  s3g-op-new-chain  texts=["member(new(X),y)"] inserts=1 bodies=1 | PASS  s3g-op-optional-chain  texts=["member(member(a,b),c)"] inserts=2 bodies=1 |  | [op-proof] group=operators-live cases=40 pass=40 fail=0 | 结构文本已核 40 条、InsertBetween 计数已核 38 条
- dts: ===== DTS ===== real-dts: 文件 226（跳过 TS 非法 0）：解析成功 226、崩溃 0；AST 完全一致 226、有差异 0 真实 .d.ts 全量解析成功且 AST 逐节点一致 DTS EXIT=0 real-dts: 文件 226（跳过 TS 非法 0）：解析成功 226、崩溃 0；AST 完全一致 226、有差异 0 | 真实 .d.ts 全量解析成功且 AST 逐节点一致
- s4j: ===== S4J ===== | `if (a) { let x = 1; }` | 0 | 1 | 0 | PASS | | `let o: { a: number } = {a:1};` | 0 | 0 | 0 | PASS | | `type T = { a: 1 };` | 0 | 0 | 0 | PASS | | `interface I { m(): { a: number }; }` | 0 | 0 | 0 | PASS | | `switch(x){ case 1: { let y=1; } }` | 0 | 0 | 0 | PASS | | `label: { a; }` | 0 | 0 | 0 | PASS | | `({ m(){ let z=1; } });` | 1 | 1 | 0 | PASS | | `function f(): void;` | 0 | 0 | 0 | PASS | S4J EXIT=0 | `switch(x){ case 1: { let y=1; } }` | 0 | 0 | 0 | PASS | | | `label: { a; }` | 0 | 0 | 0 | PASS | | | `({ m(){ let z=1; } });` | 1 | 1 | 0 | PASS | | | `function f(): void;` | 0 | 0 | 0 | PASS |

## 8. 复现命令

```powershell
xb xl_build targets=["ts"] paths=["core","typescript"]   # 890/0
node node_modules/typescript/bin/tsc -p tsconfig.json
node tests/statement-possible/declaration-statement-takeover.mjs   # flag=false: 21 条声明用例按预期 FAIL（接管关闭的证据）
node tests/statement-possible/harness.mjs --all
node tests/statement-possible/harness.mjs --double-accept ; node tests/statement-possible/harness.mjs --lint
node tests/parse/validate.mjs
node typescript/cases/ast-json.mjs ; git status --short typescript/cases ; node typescript/cases/ast-json-diff.mjs
node typescript/cases/token-ast.mjs ; node typescript/cases/real-dts-ast.mjs
```
