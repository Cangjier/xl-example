# HANDOFF — Stage 4w（possible-statement：块内泛型函数体 / 块内声明族注册 / case 子句）

分支 `feature/possible-statement-s4w`，基线 `feature/possible-statement` @ `f392e4f2`。
工作目录 `C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-s4w`（node_modules 为 junction）。

## 0. 结论先行

| 目标 | 状态 |
| --- | --- |
| 1. 块内泛型函数体收集 | **完成**：`{ function f<T>(a: T) { let x = a; } }` mount=1 / body=1；`{ function g<T>(){ a; b; } }` body=2；XML/AST 零差异、fallback=0 |
| 2. 块内 class/enum/declare 壳化 | **部分完成**：候选注册已落地（新门控 `EnableBlockDeclarationCatalog`，默认 true 但今日惰性）；用 `EnableDeclarationShell=true` 实测 `enum` / `declare` 壳化（`DeclarationShellCount=1`、`BlockBodyStatementCount=1`），**`class` 不壳化（仍 0）**，见 §3 |
| 3. case 子句级语句 | **未实现**（按优先级让位），方案与风险见 §5 |
| 4. 专用 cases | **完成**：`switch-case-cases.json` 新组 `stage4w` 15 条；`control-flow-body-takeover.mjs` 追加 10 条计数断言 |
| 5. 集成收敛 | **全表绿**（读数见 §4），无伪造 |
| 6. 预算内未做完的项 | 见 §5「未覆盖清单」 |

## 1. 块内泛型函数体：三打印定位的真实结论（与 s4u 假设不同）

`HANDOFF-s4u.md` 的假设是「`IsFunctionDeclarationBody` 从代码看应命中（类型参数按 Bracket 跳过），缺口在收口侧
（mount +1 / body +0）」。**实测不是**：mount 也是 0，根因在判据侧，不在 `HasBuiltBodyStatements` 或
`BuildBlock` 收口侧。

证据链（不靠猜）：

1. `FunctionDeclarationShape.FromUnits`（`typescript/tokens/declarations/function-declaration-shape.xl.md:167`）判
   泛型头用的是 `code[paramIndex] instanceof Symbol && Is("<")`——**函数声明的 `<…>` 在宿主 `Data` 里是平铺的
   `Symbol` 单元**（`<` / `T` / `>`），不是 `Bracket`。
2. 旧 `IsFunctionDeclarationBody` 只跳过 `Bracket` 且 `StartBracketChar === "<"` 的形态。从体 `{` 往回退：
   `)`（参数表，命中）→ 下一格是 `>`（`Symbol`）→ 落到「必须是 `Common` 才是函数名」→ `return false`。
   于是**体括号根本没挂目录**（`BlockFunctionBodyMountCount` 增量 0），体内语句全留 raw，`BlockBodyStatementCount` 0。
3. 修复后同一源码 `BlockFunctionBodyMountCount=1`、`BlockBodyStatementCount=1`，并且 `BlockShellCount=1`（外层块）。

### 修法（`typescript/tokens/statements/block-possible-shape.xl.md`）

- 新增 `static method IsAllCloseAngle(text)`：`>>` / `>>>` 合并单元按字符个数计深度。
- `IsFunctionDeclarationBody` 在 Bracket 分支之后补 **Symbol 形态的类型参数反向跳过**：从 `>`（可多字符）起
  `>` 计 +1、`<` 计 -1，归零处的 `<` 再退一格就是函数名；之后仍严格要求「函数名（`Common`）→ 可选 `*` →
  `function`」，判据没有放松，只是把 s4u 漏掉的形态补上。
- **同时补一条收窄守卫**：`{` 前一个非 trivia 单元必须 `CanEndTypeUnit` 为真。没有它，`function k<T>(): { a: T }`
  的**返回类型对象字面量括号**也会被当成函数体挂目录（`{` 前面是 `:`，往回扫同样能落回 `function`），
  体内 `a: T` 被建壳，返回类型解析读到已建形状抛错 → 整条文件 fallback。S4w 专用 case 把它打了出来
  （`{ function k<T>(): { a: T } { return null; } }` 修复前 fallback=1，修复后 fallback=0、body=1）。
  这条守卫对 `function h(): { a: number } { … }` 这类**非泛型**返回类型对象字面量同样生效，是既有漏洞的顺带修复。

泛型变体覆盖（`stage4w` 组 + takeover 计数）：`f<T>(a: T)`、`g<T>(){ a; b; }`、
`h<T extends A<B>>(x: T)`（嵌套 `<…>`，反向计深度）、`k<T>(): { a: T }`（返回类型对象字面量）、
泛型函数在 `if` 体 / `switch case` 体里、对象字面量泛型方法 `const o = { m<T>(a: T){…} }`（走 Stage 4o
对象方法体通道，body=1，不是本判据误挂）。

## 2. 块内声明族：只注册，不改候选文件

`BlockPossibleShape.CreateBodyPossibleShapes()` 原目录只注册
Variable / RootExpression / ControlFlow / Block / Await。S4w 在工厂里**仅追加一行注册**：

```ts
if (BlockPossibleShape.EnableBlockDeclarationCatalog) {
  shapes.push(new DeclarationStatementPossibleShape());
}
```

- 新门控 `BlockPossibleShape.EnableBlockDeclarationCatalog`，默认 `true`。
- **默认是惰性的**：`DeclarationStatementPossibleShape` 只认 `StatementRoute.ShellDeclarationFamily`，而
  `StatementRouteUtil.Decide` 在 `EnableDeclarationShell=false`（Stage 4t 回退后的现行默认）时对声明头返回
  `Legacy`，所以候选在块体目录一格也不接。默认全表读数逐项不变（§4），`{ class C {} }` / `{ enum E { A } }` /
  `{ declare const x: number; }` 的 `BlockBodyStatementCount` 增量都是 0（`stage4w` 与 takeover 都断言）。
- **不改 `declaration-statement-possible-shape.xl.md`**：判定 / 晚建守卫 / 建壳 / 计数全部复用那一份。
- `false` = 连注册都不做，块体目录逐位回到 Stage 4s。

## 3. 声明族门控打开时的实测（诚实记录，不是绿）

用独立进程（`R.EnableDeclarationShell = true`）对 4 条源码做计数探头（`tmp-s4w-probe.cjs`，未提交）：

| 源码 | 结果 |
| --- | --- |
| `{ class C {} }` | `BlockShellCount+1`，**`DeclarationShellCount+0`、`BlockBodyStatementCount+0`** —— class 未走声明族壳 |
| `{ enum E { A } }` | `DeclarationShellCount+1`、`BlockBodyStatementCount+1` |
| `{ declare const x: number; }` | `DeclarationShellCount+1`、`BlockBodyStatementCount+1` |
| `{ function f(){ let x = 1; } }` | mount=1、body=1（回归对照） |

四条都没有抛错。**但这一组只验了计数与「不抛错」，没有在 `EnableDeclarationShell=true` 下逐字节比 XML、
逐节点比 AST**；默认门控下才有全表 XML/AST 证据（§4）。`class` 为什么不壳化（`Decide` 对块内 `class` 的
路由，或 class 声明壳的收口条件）没有继续查——那是并行成员「声明族开档」的地盘，S4w 不改判据文件，
把它留成明确缺口而不是猜一个补丁。

## 4. 全表读数（本分支实测，2026-10-25）

四步：`xl build`（core + typescript, targets=["ts"]）→ `tsc -p tsconfig.json` → 各测试。

| 项 | 读数 |
| --- | --- |
| xl_build | **891 written / 0 error**（2524 warning，均为既有 W3102/W3103 描述缺失） |
| tsc | **0 error** |
| harness `--all` | cases **101 pass / 0 fail / 0 skip / known 1 / uncovered 0**，groups run 8 skipped 3，fallback 0 |
| harness `--double-accept` | cases 120 failed **0**，冲突 **0** |
| harness `--lint` | **PASS**（ASI 唯一 / 优先级数字表只在 operator-table） |
| stage4s | 20 / 0 |
| stage4p | 25 / 0 |
| stage4n | 28 / 0 |
| stage4o | 27 / 0 |
| **stage4w（新）** | **15 pass / 0 fail / 0 uncovered，fallback 0** |
| r1-asi | 31 / 0 |
| stage4b | 17 / 0 |
| stage4c | 42 / 0 |
| stage4c2 | 33 / 0 |
| dev | 22 / 0（fallback 2 条为既有 dev 用例，非本分支引入） |
| operators-live | 40 / 0 |
| op-ast-proof | 90 / 90（形状树 90、TS 逐节点 85、AST 数字叶子 8） |
| op-proof | 40 / 40（InsertBetween 38） |
| comma-import-fallback | 11 / 11 |
| control-flow-takeover | 39 / 0 |
| block-body-takeover | 21 / 0 |
| s4j-function-body / s4l-await-body | PASS / PASS |
| control-flow-body-takeover | **46 cases / 0 fail**（含 S4w 新增 10 条计数断言） |
| validate | **1720 条 / 0 不合格** |
| ast-json | **6167 / 6167**（47 构造；types 450、using 29），`git status --short typescript/cases` **空** |
| ast-json-diff | 完全一致 **6167 / 6167**，结构差 0、位置差 0、字段差 0 |
| token-ast | total 1716、ok 1706、crash 0、**diff 0**、ts-invalid 10、known-gap 0 |
| real-dts | 226 文件 / 成功 226、崩溃 0、**AST 完全一致 226 / 差异 0** |
| feas-operator / insert-between | 6 / 6、9 / 9 |
| perf | n=400 median **3.18ms**；ratio(200/100)=2.33、ratio(400/200)=2.15（线性≈2.0，无退化告警） |

## 5. 未覆盖清单 / 剩余风险

1. **case 子句级语句（目标 3）未做**：`switch(x){ case 1: f(); case 2: { g(); } }` 里 `case 1: f();` 的子句体
   仍是独立 `StatementBuilder`、无 CatalogGuide 宿主，整段 raw。方案 A（给子句 units 区间造**只在 possible 层
   存在、不进树**的伪 Bracket 宿主 + `CreateBodyPossibleShapes` + `BlockBodyWaitingPossibleShape`，形状 `Parent`
   指回 clause）没有实现：它要动 `CaseClauseShape` / `BuildCaseBlock` 的宿主假设，而这两处正是 Stage 4s
   修过「挂错括号必抛 `SourceRange is not set`」的高风险区，预算内无法给出全表证据，故不做（现状：树正确，
   仅未接管）。
2. **块内 `class` 壳化未打通**（§3）：声明族门控打开时 `class` 仍留 raw。`enum` / `declare` 计数上已壳化，
   但**没有**在门控打开态做 XML/AST 全量/专用比对，不能声称零差异。
3. `EnableBlockDeclarationCatalog` 默认 true 今天惰性；若并行成员把 `EnableDeclarationShell` 打开，
   **块内声明会开始壳化**，届时必须重跑全表并核 `class` 缺口——这是本门控的已知耦合。
4. 新守卫 `CanEndTypeUnit` 在 `IsFunctionDeclarationBody` 入口，是每个子 `{` 都会走的热路径；只读宿主
   `Data`，不做任何 `ComputePossibleShapes*`，perf 未见退化（§4），但语义上它比原判据更严：如果将来出现
   「函数体 `{` 前面是 `:` / `|` / `&`」的合法形态（当前 TS 语法没有），会被判成非体。
5. 判据仍只认「`function` 关键字 + 名字 + 可选 `*` + 可选 `<…>` + 参数表 + 可选返回类型」：`async function`
   泛型、`declare function` 泛型共享同一路径但**没有逐条**专用 case（只有 `{ declare function f(): void; }`
   非泛型条目），属于覆盖不足而非回归。
