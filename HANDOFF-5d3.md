# HANDOFF-5d3：根层 function / class / 装饰器声明的语句壳化

分支 `feature/possible-statement-5d3`，基线 `49209483`（5d-1a 指标 + 5d-2a 短族判界）。
本文是 **Stage 5d-3** 的交付说明：结论 → 路由与判界设计 → 逐形态迁移清单 → 指标前后 →
全门读数 → 未迁清单与风险 → 复现与回退命令。

---

## 0. 结论先行

1. **根层 `function` / `class` / 装饰器声明现在由 possible 语句壳驱动**：`Decide` 在**首代码单元**
   判出族 → 通用起点候选建 `StatementShape` 壳 → 壳的终结候选按「体括号已闭合 / `;` / 声明跟随边界 /
   EOF」收口（**不调 `StatementScanner.ScanRoot`**）→ `StatementShape.BuildFromShell` **直接调**
   `StatementBuilder.BuildFunctionDeclaration()` / `BuildClassDeclaration()` / `BuildDecoratedStatement()`
   （**不经过** `BuildStatement()` 的整段 raw 分派）。
2. **族作用域内的 ScanRoot 归零（主路径）**：整文件模式（1763 个文件各整篇解析，不含逐行用例）里，首代码单元属于本族（`function` /
   `class` / `@`，或 `async`+`function`、`abstract`+`class`）的 `ScanRoot` 调用
   **427 → 0**；全量语料（文件 + 逐行）`ScanRootCallCount` **22467 → 21164（−1303）**。
3. **legacy 根候选不再处理这两族**：`FunctionDeclarationPossibleShape` / `ClassDeclarationPossibleShape`
   的 `BuildByIndex` 在 shell 模式的主路径上 **477 → 3**（−99.4%）。剩下 3 次是 stale-host / EOF 尾巴
   形态（`async` / `abstract` 开头的 ASI 拆分残留），**如实保留 legacy**，不是假绿（见 §4.3）。
4. **树零变化**：全门 `ast-json` **6171/6171**、`ast-json-diff` **0/0/0**、`token-ast` **1706/0**、
   `real-dts` **226/226**、`harness --all` **102/0/known=0**、`double-accept` **120/0**、
   `final-matrix` **38/38**、`validate` **1720/0**、`op-ast-proof` **94/94**、
   `declaration-statement-takeover` **33/33**；新探针 `declaration-shell-boundary` **74/74**。
5. **未迁（如实）**：`declare function/class`、`export function/class`、`export default`、
   块内 `function` / 装饰器声明（块体目录没有本族候选）、`async` ⏎ `function` / `abstract` ⏎ `class`
   这类 **TS 会 ASI 拆成两条语句**的前缀形态。全部在 §5 列清，计数断言为 0 的用例也在新探针里。

---

## 1. 路由：三个新族码，只收紧根层

`StatementRoute` 新增（全部默认开，新开关 `EnableRootDeclarationShell = true`）：

| 族码 | 起点判据（`Decide` 首格） | 建壳候选 | 收口判据 | 建树入口 |
| --- | --- | --- | --- | --- |
| `ShellFunctionDeclaration = 8` | `function`（含 `function*` / 泛型）；**同一行**的 `async function` | `ControlFlowStatementPossibleShape`（既有根候选） | `DeclarationShellEndCode` | `BuildFunctionDeclaration()` |
| `ShellClassDeclaration = 9` | `class`；**同一行**的 `abstract class` | 同上 | 同上 | `BuildClassDeclaration()` |
| `ShellDecoratedDeclaration = 10` | 语句首 `@` | 同上 | 同上（装饰器族不认 ASI） | `BuildDecoratedStatement()` |

**只收紧根层**：`Decide` 的三个分支都带 `!(head.Parent instanceof Bracket)` 门控。
根层 token 的 `Parent` 是 `SourceFileShape`；块体语句的 `Parent` 是块体 `{` 括号。因此：

- 根层 `class` → 本族；**块内 `class` 仍走 `ShellStatementFamily`**（gap-SW 的块内 class 壳，一字不动）；
- 根层 `function` / 装饰器声明 → 本族；**块内仍判 `Legacy`**（块体目录里没有对应候选，路由一改就是
  「零候选」等待，那是未迁，不是接管）；
- 三个分支都额外要求 `EnableShellExpressions`：**legacy 对拍档 / 文件级 fallback 档里 `Decide` 逐位回到
  5d-2a**（否则 fallback 重解析会拿到无人接管的族码）。

**为什么复用既有候选**：`ControlFlowStatementPossibleShape` 已经注册在根目录、已经承担控制流族 /
声明族的建壳，且它只在首格 `Accept`。复用它 = **不新增候选、不改候选顺序、没有抢单风险**；
`DeclarationStatementPossibleShape`（声明族的专用候选）只认 `ShellDeclarationFamily`，不受影响。

**让位门控**：`ShouldYieldToDeclarationShell` 从「只认 `ShellDeclarationFamily`」扩成
「`ShellDeclarationFamily` **或** 三个新族码」（单调，只看 route）。13 个 legacy 声明候选 +
表达式候选 + 变量候选都会因此让位——否则 legacy 的 class / function 候选是**提前挂载**的，会与语句壳同格双建。

**两格晚建窗口**：`async function` / `abstract class` 的族要到第二个代码单元（`function` / `class`）才判得出来，
所以候选允许在 `tokenIndex == NextCode(headAt+1)` 这一格补建壳（与 `DeclarationStatementPossibleShape` 的晚建
同一手法），并在 `BuildByIndex` 里补一次 `ComputePossibleShapes` 让壳内终结状态从这一格起算。

**文档级前瞻（`IsSameLineWordAhead`）**：`async` / `abstract` 在**首格**时第二个代码单元还没 token 化，
`Decide` 原本只能返回 `None` → 根 legacy 候选会在这一格问一次 `ScanRoot`，族要到第二格才判出来。
新增的文档级前瞻（与 `IsLabelColonAhead` 同一手法：只看 `SourceRange.Document` 的字符）在首格回答
「同一行下一个词是不是 `function` / `class`」，是就当场判族。行终止符（含块注释里的换行）一律判 false
——`async` ⏎ `function` 是 TS 的两条语句，那条拆分仍归 legacy。**效果**：这两个族的首格 `ScanRoot` 归零，
候选取到族也不再需要等第二格。前瞻为 false 时行为与 5d-2a 逐位相同（等待 → legacy 兜底）。

---

## 2. 判界：唯一实现点 `StatementBoundaryUtil.DeclarationShellEndCode`

```ts
DeclarationShellEndCode(units, codeAt, atEof, decorated?) => 宿主 Data 下标 | -1
  1. 末代码单元是 `{…}` 括号且 TypeBuilder.IsBodyBrace 认它是**声明体** → 收在它身上
  2. 末代码单元是 `;` → 收在它身上（ambient / 重载签名）
  3. decorated === true → 只认 1/2，其余留到 EOF（`@dec` ⏎ `class` 的换行不是 ASI）
  4. 其余 → StatementBoundaryUtil.StatementEndCode(units, codeAt, atEof, true)
     （声明跟随边界 `IsDeclarationFollowBoundary` → EOF，与声明族同一份）
```

- **判据只有一份**：终结候选的 `ComputeByIndex` / `BuildByIndex`（EOF 与普通两个分支）与
  `StatementShape.TryToClose`（EOF 兜底）都读它，不可能「接受」和「兜底」收到不同位置。
- **`TypeBuilder.IsBodyBrace` 是必要的**：`class C<T extends {}> {}` / `function f(): { a: A }` 里的
  `{}` 是类型字面量，不是声明体；只看「末单元是 `{` 括号」会在类型字面量闭合那一格提前收口。
  本方法读的是同一份 `IsBodyBrace`（`BuildFunctionDeclaration` / `BuildClassDeclaration` 用的就是它）。
- **没有第二套 ASI**：`IsAsiBoundary` 的条件 5 对以声明关键字开头的条目本来就 `false`，
  这里真正会切断的是 `IsDeclarationFollowBoundary`；函数族 / 类族直接复用 `StatementEndCode` 的第 4 条。
- **装饰器族不认 ASI 的原因**：语句首是 `@`（Symbol），`IsAsiBoundary` 的条件 5 看不到声明头，
  `@dec` ⏎ `class C {}` 会在 `@dec` 处判出假 ASI 边界（把装饰器切成一条表达式语句）。本族只认
  体括号 / `;` / EOF，代价是「装饰器 + 变量声明 + 无分号 + 下一条语句」这种形态会落到文件级 fallback
  （语料里没有这种形态，见 §5）。

**建树**：`StatementShape.BuildFromShell` 在表达式族 / 变量族分支之后新增：

```ts
if (shell.Kind == ShellFunctionDeclaration) built = builder.BuildFunctionDeclaration();
else if (shell.Kind == ShellClassDeclaration) built = builder.BuildClassDeclaration();
else if (shell.Kind == ShellDecoratedDeclaration) built = builder.BuildDecoratedStatement();
```

三个都是**同一段 `consumed` + 同一批 `FromUnits` / 声明建造器**，所以节点 / Pos / End 与 legacy 逐位相同；
`builder.At == builder.Units.length` 的断言照旧（`BuildFromShell` 末尾），本轮没有一条用例触发它。
装饰器族的判型**不新写**：`BuildDecoratedStatement` 内部就是 `ScanDecoratedHead`（`@` 分支的同一个判型点）。

---

## 3. 顺带修掉的两处真实缺陷

1. **`class<T> {}` / `class<T> extends B {}`（TS 的无名字类恢复形）**。
   `ClassDeclarationShape.HasNoName` 原来只认「`class` 后面直接是类体 / `extends` / `implements`」，
   `class` 后面是 `<` 时判「有名字」→ `FromUnits` 抛「名字不是标识符」→ 根层 class 壳收口失败 →
   这两行只能靠文件级 fallback（`dts-recovery.ts` L21/L22 的 `fileFallbacks` 0→1）。
   `HasNoName` 现在多认第一格 `<`（它不可能是名字、也不可能是 heritage，只能是类型参数表开头）。
   修复后 `fileFallbacks` 回到 **50 = 基线**。
2. **`@dec async function f() {}`**。`ScanDecoratedHead` 认识 `export` / `declare` / `default` / `abstract`
   修饰词，但不认 `async`：`@dec` 起点认出的关键字是 `async`，`BuildDecoratedStatement` 没有这条分派 →
   返回 null → 表达式兜底抛错 → 文件级 fallback（新探针里 `dec-async-function` 一开始就是 fail）。
   现在 `ScanDecoratedHead` 在 `async` 后面**同一行**是 `function` 时也跳过它，认出的关键字是 `function`
   → `BuildFunctionDeclaration`（各 `FromUnits` 自己重扫装饰器）。与 legacy 建的是同一个形状。

### 3.1 一处计数器搬家（能力未变）

根层函数体 `{` 的宿主从根单元换成了 `StatementShape` 壳，挂载点从
`BlockPossibleShape.TryMountFunctionBody`（计数 `FunctionBodyMountCount`）改走
`OnShellBracketCreated` 的 `IsFunctionDeclarationBody` 分支（计数 `BlockFunctionBodyMountCount`）。
挂的是同一个 `{`、同一个块体目录、同一条 `BuildBlock` 收集通道：`BlockBodyStatementCount` 读数不变
（`function f() { let x = 1; }` 仍是 1，`async function a() { await f(); }` 的 `AwaitShellCount` 仍是 1）。
`final-matrix.mjs` 里三个用例断言的计数器随之从 `FunctionBodyMountCount` 换成
`BlockFunctionBodyMountCount`（注释写在 `COUNTERS` 上方，能力断言没有放松）。

---

## 4. 指标前后

语料与探针口径与 `tests/statement-possible/legacy-retirement.mjs` 完全一致
（1763 文件 / 6300 用例；`--json` 的 totals 为准）。

### 4.1 总量

| 指标 | 5d-2a 基线（HEAD `49209483`） | 5d-3 | 变化 |
| --- | --- | --- | --- |
| `ScanRootCallCount` | **22467** | **21164** | **−1303（−5.8%）** |
| `LegacyStatementDispatchCount` | 4471 | 4470 | −1 |
| `RawTailBuildCount` | 292 | **288** | −4 |
| `ShapeAstDeclinedCount` | 328 | 328 | 0 |
| `TotalDeclined`（交叉校验） | 328 | 328 | 0 |
| `FileFallbackCount` | 50 | **50** | 0 |
| crash | 0 | 0 | 0 |

`LegacyStatementDispatchCount` 只 −1 是**符合预期的**：根层 function / class 以前也不走
`BuildStatement()`（它们由各自的 legacy 候选原子建），所以这个指标本来就不该因本阶段大幅下降。
它量的是「整段 raw 分派」，本阶段真正消掉的是 **ScanRoot** 与 **legacy 根候选的接管次数**（§4.2 / §4.3）。

### 4.2 逐构造（`--snippets`，7 条变化）

| 构造 | legacy | scanRoot | 说明 |
| --- | --- | --- | --- |
| function-decl | 0 → 0 | **2 → 1** | 剩 1 是每条用例 EOF 列上根 legacy 候选的固有调用（全语料每用例都有） |
| class-decl | 1 → 1 | **2 → 1** | 同上；class 里的 `return` 是短族，不计 |
| class-fields | 0 → 0 | **2 → 1** | 同上 |
| decorated-class | 0 → 0 | **2 → 1** | 同上 |
| async-function-decl | 1 → 1 | **5 → 4** | 首格前瞻消掉 1 次；剩 4 = `await` 体语句（未迁）+ EOF 列 |
| return | 1 → 1 | **2 → 1** | `function f() { return 1; }`：函数体挂载路径变了，EOF 列不再问 ScanRoot |
| multi-statement-body | 3 → 3 | **10 → 9** | 同上（函数壳收口后 EOF 列少一次） |

其余 35 条逐构造读数**逐位不变**（`fileFallback` 全部 0）。
逐用例读数有 **1203 / 6300** 条变化，全部是 ScanRoot 计数下降（`legacy` 字段只有 1 条变化）。

### 4.3 族作用域归因（整文件模式：1763 个文件各整篇解析，不含逐行用例；探针 `tests/statement-possible/family-legacy-attrib.mjs`）

| 量 | 5d-2a 路径（`EnableRootDeclarationShell=false`） | 5d-3 | 说明 |
| --- | --- | --- | --- |
| 族作用域 `ScanRoot`（首单元属本族 · 根层 · shell 模式） | **427** | **0** | `function` / `class` / `@` / `async function` / `abstract class` |
| `async` / `abstract` 首格 `ScanRoot` | 84 | 22 | 22 次全是**非本族**起点（`async` 箭头 / `async` 标识符表达式的首格）；真正的 `async function` / `abstract class` 在首格前瞻后就判族，不再问 ScanRoot |
| legacy 根候选 `BuildByIndex`（shell 模式主路径） | **477** | **3** | 见下 |
| 整文件模式 `ScanRootCallCount` | 14601 | 14063 | −538 |
| 整文件模式 `FileFallbackCount` | 54 | 54 | 不变 |

**剩下 3 次 legacy 根候选接管**（如实记录）：探针抓到它们的 `host.Data` 是「一串 `LineAnnotation` + `async` /
`abstract`」的 **stale-host / EOF 尾巴**形态——即 TS 会把 `async` ⏎ `function` / `abstract` ⏎ `class`
拆成两条语句，前缀那条由 legacy 建、声明本身由根终结候选在 EOF 兜底。这三条**没有**被本族接管，
是 §5 的未迁项，不是漏计。

---

## 5. 逐形态迁移清单（谁仍 legacy）

### 5.1 已迁（新探针 74 条用例逐条 XML==legacy、AST==TS、族壳计数正确、族 ScanRoot=0）

- `function`：普通 / 带返回类型 / 生成器 `function*` / `async function` / `async function*` /
  泛型（含 `>>` 收尾）/ 返回类型对象字面量 / ambient 无体（`;` 与 EOF 两种）/ 重载签名 /
  `function /*c*/ f()` / `function` ⏎ `f()`（名字前换行）/ 参数默认值是箭头 / 嵌套函数 /
  体内 class / 尾注释 / 体后 `;`（下一条空语句）/ 重载链（3 条签名一次成壳）；
- `class`：普通 / 方法 / 字段 / `class C<T extends {}>`（类型字面量约束）/ 泛型 / heritage
  `extends A<B> implements I, J` / `abstract class` / `abstract class<T> extends B` /
  `class {}` / `class<T> {}` / `class<T> extends B {}`（TS 恢复形）/ static 块 / `class C` ⏎ `{}` /
  `class /*c*/ C` / 类体方法里的嵌套 function；
- 装饰器：`@dec class` / `@dec function` / `@a @b class` / `@ns.dec(1) class` / `@dec({a:1}) class` /
  `@dec` ⏎ `class`（装饰器与声明之间换行）/ `@dec /*c*/ class` / `@dec abstract class` /
  `@dec async function` / `@dec class<T> extends B`；`@dec interface` 这类非 class/function 声明也走本族
  壳（收口后交 `BuildDecoratedStatement` 的同一分派），计数与树都正确；
- 相邻 / ASI 组合：function→class→let、const→function、type→function、interface→class、enum→function、
  function→@dec class、@dec class→function、class→const、class→`[1,2].forEach(f)`、function→`(a)`、
  `class C {};` → class、overload 链、function→interface。

### 5.2 未迁（**仍 legacy，计数断言为 0**）

| 形态 | 现在由谁建 | 为什么不在本轮 |
| --- | --- | --- |
| `declare function` / `declare class` / `declare abstract class` / `declare async function` | 声明族壳（`ShellDeclarationFamily`，`BuildStatement` → 对应声明 builder） | 它们本来就走声明族壳（路由 7），换壳只会改族码不改路径；`declare` 的 ASI / `;` 判界与 `BuildStatement` 的声明分派都已验证 |
| `export function` / `export class` / `export default class` / `export default function` | 声明 / 导出族壳（`ExportDeclarationPossibleShape` 等） | 同上：export 前缀在壳里由 `BuildExportedStatement` 摘掉再分派，现路径已绿 |
| 块内 `function` / 装饰器声明 | 块体 raw 递归（`BuildBlock` → `BuildStatement`） | 块体目录里**没有** function / 装饰器候选；路由一改就是「零候选」等待。要迁必须先补块体候选（另一个阶段） |
| 块内 `class` | `ShellStatementFamily` 壳（`EnableBlockClassShell`） | gap-SW 的既有块内 class 壳，判界仍走 `ScanRoot`（`DeclarationBodyEndCode` 兜底）；本阶段不动它 |
| `async` ⏎ `function` / `abstract` ⏎ `class` | legacy（`async`/`abstract` 表达式语句 + 后一条声明） | TS 的 ASI 拆分，两条语句各有其主；本族只认同一行的修饰词 |
| 装饰器 + 变量声明 + 无分号 + 下一条语句 | 装饰器族壳（`;` / EOF 收口） | 本族不认 ASI（见 §2），这种形态会落到文件级 fallback；语料里没有该形态，风险已登记 |

---

## 6. 全门读数（默认档，5d-3 最终代码）

| 门 | 读数 |
| --- | --- |
| `typescript/cases/ast-json.mjs` | **6171 / 6171**（47 构造） |
| `typescript/cases/ast-json-diff.mjs` | **6171 / 6171**，结构差 **0** / 位置差 **0** / 字段差 **0** |
| `typescript/cases/token-ast.mjs --quiet` | total=1716 **ok=1706 crash=0 diff=0** ts-invalid=10 |
| `typescript/cases/real-dts-ast.mjs` | **226 / 226**，崩溃 0、差异 0 |
| `tests/statement-possible/harness.mjs --all` | **102 / 0 / known=0**，file-fallback 0 |
| `tests/statement-possible/harness.mjs --double-accept` | **120 / 0** |
| `tests/statement-possible/declaration-statement-takeover.mjs` | **33 / 33**，knownGap=0，takeover=27 |
| `tests/statement-possible/final-matrix.mjs` | **38 / 38**（shapeAst / xmlEqLegacy / astEqTS 全 38/38，knownGap=1 既有） |
| `tests/parse/validate.mjs` | **1720 / 0** |
| `tests/statement-possible/op-ast-proof.mjs` | **94 / 94** |
| `tests/statement-possible/ast-kind-names.mjs` | live 5/5、self 4/4、fixtures 47、fail 0 |
| `tests/statement-possible/short-family-boundary.mjs` | **44 / 44**（迁出族 31 / 对照 13） |
| `tests/statement-possible/block-body-takeover.mjs` | **21 / 0** |
| `tests/statement-possible/control-flow-takeover.mjs` | **39 / 0** |
| `tests/statement-possible/control-flow-body-takeover.mjs` | 46 条、**2 条失败**——见下面「既有红」 |
| **新** `tests/statement-possible/declaration-shell-boundary.mjs` | **74 / 74**，migrated=55、counterfactualSensitive=55 |
| `git status typescript/cases` | 空（跑完 `git checkout -- typescript/cases`） |

**既有红（不是本轮引入）**：`control-flow-body-takeover.mjs` 的
`{ enum E { A } }` / `{ declare const x: number; }` 两条期望 `BlockBodyStatementCount=0`、实测 1。
本轮把 6 个源码文件 `git stash` 回 HEAD、重建后**复现同样两条失败**（读数完全一致），所以它是
5d-2a 基线上已有的红（块内声明族壳 + `EnableBlockDeclarationCatalog` 的组合），与本阶段无关；
按纪律不在这里「顺手改绿」。

---

## 7. 反事实敏感性（写进新探针）

`declaration-shell-boundary.mjs` 每条 `migrated: true` 的用例都做一次反事实：

1. 默认档解析 → 断言 `FunctionDeclarationShellCount` / `ClassDeclarationShellCount` /
   `DecoratedDeclarationShellCount` 增量正确、族 ScanRoot=0、legacy 根候选 `BuildByIndex`=0；
2. 把 `EnableRootDeclarationShell` 临时置 false 再解析同一份源码 → **legacy 根候选必须被调用至少一次**
   （否则「0 次」可能只是探针没插上）。

结果：**migrated=55，counterfactualSensitive=55**（100%）。另有 4 条 `migrated: false` 的用例
（EOF 末尾 ambient 签名 / 重载链）：它们 5d-3 之前由**根终结候选的 `BuildTrailingDeclaration`** 建，
不是由 function/class 候选建，反事实对它们天然不敏感——接管证据由族壳计数（fn=1 / fn=3）承担，
文件里写明了原因。

---

## 8. 风险与已知边界

1. **装饰器族的 ASI 禁用**（§2 / §5.2）：`@dec const x = 1` ⏎ `foo();`（无分号）会把 `foo();` 吞进壳，
   收口时 `BuildDecoratedStatement` 只建第一条 → 抛错 → 文件级 fallback。语料里没有该形态；
   若以后要覆盖，应在装饰器族补「声明关键字之后才允许 ASI」的第二判据（不能直接复用 `IsAsiBoundary`，
   它按语句首分类）。
2. **`class<T> {}` 的恢复形**依赖 `HasNoName` 新认的 `<`。`class <T> ...`（空格）同一格也命中，
   TS 同样按无名字类恢复，行为一致。
3. **`async function` / `abstract class` 的首格前瞻**只回答「同一行下一个词是什么」；若源码中间夹了
   行终止符（含块注释里的换行），前瞻判 false，路由回到 5d-2a（等待 → legacy 拆分）。这是**刻意**的：
   TS 在这两种前缀后面换行时会 ASI 拆语句。
4. **`ScanRootCallCount` 仍有 21164**，绝大部分来自控制流 / 分支族、块内 class 壳、`await` 语句、
   变量族与 EOF 列——这些是 5d-4 / 5d-5 的目标，本阶段只保证**本族归零**。

---

## 9. 复现与回退

```powershell
# 构建（只重建改过的 7 个 .xl.md 即可；全量重建也行）
#   改动文件：
#     typescript/tokens/statements/statement-route-util.xl.md
#     typescript/tokens/statements/statement-boundary-util.xl.md
#     typescript/tokens/statements/statement-end-possible-shape.xl.md
#     typescript/tokens/statements/statement-shape.xl.md
#     typescript/tokens/statements/control-flow-statement-possible-shape.xl.md
#     typescript/tokens/statements/statement-builder.xl.md
#     typescript/tokens/declarations/class-declaration-shape.xl.md
#   xl_build(paths=<上面 7 个>, targets=["ts"])
node node_modules/typescript/bin/tsc -p tsconfig.json          # 必须 exit 0

# 本阶段探针
node tests/statement-possible/declaration-shell-boundary.mjs            # 74/74
node tests/statement-possible/declaration-shell-boundary.mjs --verbose  # 逐条计数器
node tests/statement-possible/declaration-shell-boundary.mjs --json     # 机器可读

# 退场指标（阶段收口后已用 --write-baseline 重写，见 commit body）
node tests/statement-possible/legacy-retirement.mjs            # PASS
node tests/statement-possible/legacy-retirement.mjs --snippets # 42 条逐构造
node tests/statement-possible/legacy-retirement.mjs --legacy-only
node tests/statement-possible/family-legacy-attrib.mjs         # 族作用域归因（两档 JSON）

# 全门
node typescript/cases/ast-json.mjs
node typescript/cases/ast-json-diff.mjs
node typescript/cases/token-ast.mjs --quiet
node typescript/cases/real-dts-ast.mjs
node tests/statement-possible/harness.mjs --all
node tests/statement-possible/harness.mjs --double-accept
node tests/statement-possible/declaration-statement-takeover.mjs
node tests/statement-possible/final-matrix.mjs
node tests/parse/validate.mjs
node tests/statement-possible/op-ast-proof.mjs
node tests/statement-possible/ast-kind-names.mjs
node tests/statement-possible/short-family-boundary.mjs
git checkout -- typescript/cases
```

**回退**：本阶段只新增一个默认开的开关 `StatementRouteUtil.EnableRootDeclarationShell`，运行期置 false
即逐位回到 5d-2a（新探针的 `migrated` 用例全部回落到 legacy 根候选，counterfactual 那一档就是这条路径）。
源码级回退按文件 revert：

1. `typescript/tokens/statements/statement-route-util.xl.md`（三个族码 / 开关 / `Decide` / 让位 / 前瞻）；
2. `typescript/tokens/statements/statement-boundary-util.xl.md`（`DeclarationShellEndCode` + TypeBuilder 依赖）；
3. `typescript/tokens/statements/statement-end-possible-shape.xl.md`（族分支）；
4. `typescript/tokens/statements/statement-shape.xl.md`（`BuildFromShell` 分派 + `TryToClose` 分支）；
5. `typescript/tokens/statements/control-flow-statement-possible-shape.xl.md`（族接受 / 晚建窗口 / 计数）；
6. `typescript/tokens/statements/statement-builder.xl.md`（`ScanDecoratedHead` 跳过同一行 `async function`）；
7. `typescript/tokens/declarations/class-declaration-shape.xl.md`（`HasNoName` 认 `<`）；
8. `tests/statement-possible/final-matrix.mjs`（三处计数器搬家）；
9. `tests/statement-possible/declaration-shell-boundary.mjs`（新探针，可整文件删）；
10. `tests/statement-possible/legacy-baseline.json`（指标基线，随 §4 读数一致）。

回退源码后重跑：`xl_build` → `tsc` → `legacy-retirement`（会因基线已重写而 FAIL，需
`--write-baseline` 回到 5d-2a 的 22467/4471/292）→ 全门。
