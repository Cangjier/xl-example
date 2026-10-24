# HANDOFF — Stage 4o：箭头块体 / 对象字面量方法体接管

分支 `feature/possible-statement-s4o`，基线 `feature/possible-statement` @ **92b00efe**。
工作目录 `xl-example-set/feature/possible-statement-s4o`（node_modules 为 junction）。

## 1. 结论

目标 1（箭头块体）与目标 2（对象字面量方法体）**都已接管**，且没有新增第二条建树路径：
两种构造的体括号在**创建时**挂上与函数体**同一份**块体语句目录（`CreateBodyPossibleShapes`），
体里的语句由 possible 增量建成 `StatementShape`，收口时仍然落到 `StatementBuilder.BuildBlock()` 的
`HasBuiltBodyStatements` / `CollectBodyStatements` 收集通道。

## 2. 关键发现（推翻了 S4j/S4l/S4m 的三条「不可行」论断）

HANDOFF-s4k §6 / s4l §3 把这两个缺口的原因写成「体由 `ExpressionBuilder` 原子建树，`BuildBlock` 不参与，
挂目录只会泄漏形状」。实测读代码后**这个前提不成立**：

- 箭头块体：`ExpressionBuilder.ParseArrowBody` → `ParseBlock` → `new StatementBuilder(...).BuildBlock()`；
- 对象方法体：`ExpressionBuilder.ParseObjectLiteral` → `new StatementBuilder(...).BuildStatement()`，
  首个单元是 `{` 括号 → `BuildStatement` 的块分派 → `BuildBlock()`。

两条路**本来就走** `BuildBlock`，所以收集通道（S4b 建的）已经存在，缺的只有**挂载点**。因此本轮没有写任何
新的收集代码，只补挂载判据 —— 这也是全表 ast-json 6167/6167 一条未变的原因。

## 3. 修法（三个文件）

### 3.1 core：`bracket.xl.md` 给**非括号宿主**补发子括号事件（单独 commit）

`Bracket.Transit` 原本只在宿主是括号时经 `Bracket.OnBracketCreatedEvent` 转调监听。
箭头块的 `{` 的宿主是**语句壳**（根层 `const f = () => {` 的 `{` 甚至不在任何括号里），事件到不了。
在 `unit.OnBracketCreatedEvent` 之后补一次：

```ts
if (!(unit instanceof Bracket) && Bracket.ChildBracketCreatedHook !== null) {
  Bracket.ChildBracketCreatedHook.OnChildBracketCreated(unit, mounted, context);
}
```

顺序保持「`OnBracketCreatedEvent` 先、监听后」：类体成员目录 / 嵌套块的早判一格都先跑，
监听到时 `CatalogGuide` 已就位，`TryMountFunctionBody` 的 `CatalogGuide !== null` 幂等检查照旧生效。

### 3.2 `block-possible-shape.xl.md`：判据 + 门控

新增 `IsArrowUnit` / `PreviousCodeUnit` / `EnsureChildBracketHook`；`TryMountFunctionBody` 增加
`arrowOnly?:bool` 与 `=>` 分支；`OnChildBracketCreated` 的门控从「只认类体」扩为三条
（**互斥、按宿主分派**）：

| 宿主 | 判据 | 覆盖 |
|---|---|---|
| `StatementShape`（语句壳） | 只认 `{` 前一个是 `=>` | `const f = x => { … }`、`x => { … }` |
| `Bracket` 且 `{` 前一个是 `=>` | 同上 | `f(x => { … })`、块内箭头 |
| `Bracket` 且 `CatalogGuide === null` | 前一个是已闭合 `(` 或返回类型的 `{` | 对象字面量方法 / get / set / async |
| `Bracket` 且目录含 `MethodDeclarationPossibleShape` | 既有类体门控（未改） | 类方法 / 构造器 / 访问器 |

**为什么 `CatalogGuide === null` 是安全的宿主判据**：块体括号建壳时就挂了目录（`BuildByIndex` /
`TryMountFunctionBody`），所以「没有目录的 `{`」只能是对象字面量 / 数组 / 调用参数 —— 都不是块体。
控制流体块（`if (a) {` 在根层宿主是控制流壳 → 走 `arrowOnly`，在块内宿主是有目录的块体括号 → 落到类体门控）
因此**一次都不会被挂**，陷阱组实测 `if (a) { let x = 1; }` mount=0。

### 3.3 `statement-route-util.xl.md`：两个独立开关

`EnableArrowBodyCatalog = true` / `EnableObjectMethodBodyCatalog = true`。任一置 false → 行为逐位回到 Stage 4n
（安全回退，不靠候选先后）。

## 4. 接管证据（实测）

`node tests/statement-possible/s4j-function-body.mjs`（26 条，0 failed）里三条 S4j 时期的「未覆盖」用例已改为期望挂载：

| 源码 | mount | body | shells |
|---|---|---|---|
| `const o = { m(){ let z=1; } };` | **1** | **1** | 0 |
| `const f = () => { let y=1; return y; };` | **1** | **2** | 0 |
| `({ m(){ let z=1; } });` | **1** | **1** | 0 |
| `if (a) { let x = 1; }`（陷阱，必须 0） | 0 | 0 | 0 |

专用 cases：`tests/statement-possible/arrow-object-cases.json`（group `stage4o`，27 条）→ [statement-possible] groups run=1 skipped=0 | cases pass=27 fail=0 skip=0 known=0 uncovered=0
每条断言 XML == legacy（`EnableShellExpressions=false`）、XML 两次相同、AST 逐节点 == TS、无 `StatementShape` 泄漏；
组级 `file-fallback total=0 distinct=0`。

## 5. 全表读数（本轮实测）

| 表 | 读数 |
|---|---|
| `xl_build` | **890 written / 0 error** |
| `tsc -p tsconfig.json` | exit 0 |
| `harness --all` | exit 0，file-fallback 0 / 0 |
| `harness --double-accept` | cases=120 failed=0 |
| `harness --lint` | PASS |
| `arrow-object-cases` (stage4o) | 见 §4，0 fail |
| `block-body-takeover` | 21 / 0 failed |
| `control-flow-takeover` | 39 / 0 failed |
| `s4j-function-body` | 26 / 0 failed（3 条期望更新） |
| `s4l-await-body` | 19 条全 PASS；进程 exit=1 为**基线既有**（HANDOFF-s4l §2 同样记 exit=1 且用例全 PASS） |
| stage4b / 4c / 4c2 / 5c / r1-asi / dev / op | 全 exit 0 |
| `op-ast-proof` / `op-proof` | 90 / 90、40 / 40 |
| `comma-import-fallback` | 11 / 11 |
| `validate` | 1720 条 / 0 不合格 |
| `ast-json` | 6167 / 6167，`git status --short typescript/cases` **空** |
| `ast-json-diff` | 6167 / 6167；结构差 0、位置差 0、字段差 0 |
| `token-ast` | total=1716 ok=1706 diff=0 ts-invalid=10 |
| `real-dts` | 226 / 226 |
| `feas-operator` + `insert-between` | 6 + 9 |
| `perf` | exit 0（无退化告警） |

## 6. 未覆盖清单（按优先级）

| 构造 | 现状 | 缺什么 |
|---|---|---|
| 块内函数声明 `{ function f(){ let x=1; } f(); }` | 函数体本身被接管（`TryMountFunctionBody`），但块体目录没有 `FunctionDeclarationPossibleShape` 候选 | 要把声明候选加进 `CreateBodyPossibleShapes` 并确认块壳判界能收住 `function` 起点的语句；本轮未动（目标 3 未做） |
| 控制流体块 `if/while/for/try` 体 | 仍 raw（m**有意**不挂，见 §3.2 陷阱） | 由并行成员负责；本轮未改其任何文件 |
| `switch` 体 / `case` 块 | 仍 raw | `BuildCaseBlock` 是原子递归，需要自己的收集分支 |
| 声明族 / import-export | 仍 legacy | 后续 Stage |
| `await` 在箭头体里（`async x => { await f(); }`） | 块体目录已挂，但 `await` 仍走 raw 段（S4l 的已知限制原样继承） | 同 S4l §5：`await` 壳收口失败时 detach 回 raw；XML/AST 不受影响 |

## 7. 风险

| id | 风险 | 兜底 |
|---|---|---|
| R1 | `CatalogGuide === null` 作为「非块体宿主」判据是**结构启发式** | 块体括号建壳即挂目录是既有不变量；另有 `EnableObjectMethodBodyCatalog=false` 一键回退；陷阱组 9 条 + 全表 ast-json 6167/6167 + real-dts 226/226 是实测证据 |
| R2 | core 改 `Bracket.Transit`：多一条对所有非括号宿主的回调 | 监听为空/null 时是纯判空；监听内部先查两个开关；顺序放在 `OnBracketCreatedEvent` 之后，类体 / 嵌套块的既有早判一格不变（block-body 21、control-flow 39 全绿） |
| R3 | 箭头体的 `Pos` / 首句 `pos` 口径 | 与 S4b D1 同一处修正（`CollectBodyStatements` 的 `rawBase = StartIndex + 1`）；27 条专用用例 XML 逐字节 == legacy 是证据 |
| R4 | 监听懒安装可能晚于第一个箭头体 | `BlockPossibleShape.ComputeByIndex` 与 `SourceFileShape.OnBracketCreatedEvent` 双点安装；实测根层 `const f = () => {` 为第一条语句时 mount=1 |

## 8. 文件 / diff

- `core/syntax/basic-tokens/bracket.xl.md`：+ 非括号宿主的子括号转发（**core 改动单独 commit**）。
- `typescript/tokens/statements/block-possible-shape.xl.md`：+`IsArrowUnit` / `PreviousCodeUnit` / `EnsureChildBracketHook` / `ArrowBodyMountCount`；`TryMountFunctionBody` 增加 `arrowOnly` 与 `=>` 分支；`OnChildBracketCreated` 四路分派。
- `typescript/tokens/statements/statement-route-util.xl.md`：+`EnableArrowBodyCatalog` / `EnableObjectMethodBodyCatalog`。
- `tests/statement-possible/arrow-object-cases.json`：新增 27 条（group `stage4o`）。
- `tests/statement-possible/s4j-function-body.mjs`：3 条 S4j「未覆盖」用例改为期望挂载（1/1、1/2、1/1）。
- `dist/` 全部由 `xl_build` 生成，未手改；`StatementBoundaryUtil.IsAsiBoundary` 未改。

## 9. 复现

```powershell
xl_build cwd=<repo> paths=["core","typescript"] targets=["ts"]   # 890 written / 0 error
node node_modules/typescript/bin/tsc -p tsconfig.json               # exit 0
node tests/statement-possible/harness.mjs --file=tests/statement-possible/arrow-object-cases.json --group=stage4o
node tests/statement-possible/s4j-function-body.mjs                 # 26 / 0
node typescript/cases/ast-json.mjs ; git status --short typescript/cases   # 空
node typescript/cases/ast-json-diff.mjs                              # 6167 / 6167
node typescript/cases/real-dts-ast.mjs                               # 226 / 226
```
