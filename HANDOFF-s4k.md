# HANDOFF — Stage 4k：返回类型函数体 / 类成员体 / 嵌套块深度 ≥2

分支 `feature/possible-statement-s4k`，基线 `origin/feature/possible-statement` @ `114b1467`（s4j 合并后）。
工作目录 `xl-example-set/feature/possible-statement-s4k`（node_modules 为 junction）。

## 1. 结论（先说结果）

本轮把 s4j §5/§6 的四个缺口推进到**已接管**：带返回类型的函数体、类方法 / 构造器 / 访问器体、
嵌套块深度 ≥2（含函数体内的嵌套块）。两条安全边界保持不变：
**挂目录不改任何 AST 决定**、**未覆盖构造一律不挂目录**（对象方法体、箭头块体、控制流体、`await` 语句）。
未伪造绿：`async` 体首句 `await` 仍是 `body=0`，在 §6 明确列为未覆盖。

| 项 | s4j 基线 | 本分支 |
|---|---|---|
| `xl_build`（core+typescript → ts） | 887 / 0 error | 887 / 0 error |
| `tsc -p tsconfig.json` | exit 0 | exit 0 |
| `s4j-function-body` | 10 cases | **26 cases / 0 failed**（新增 16 条接管面 + 陷阱） |
| `harness --all` | 101 / 0 / known1 | 101 / 0 / known1（fallback 0） |
| `--double-accept` | 120 / 0 | 120 / 0 |
| `--lint` | PASS | PASS |
| `control-flow-takeover` | 39 / 39 | 39 / 39 |
| `block-body-takeover` | 21 / 21 | 21 / 21（5 条深层块计数期望按新接管面更新） |
| `validate` | 1720 / 0 | 1720 / 0 |
| `ast-json` | 6167 / 6167 | 6167 / 6167；`git status --short typescript/cases` **为空** |
| `ast-json-diff` | 6167 / 6167 | **6167 / 6167；结构差 0、位置差 0、字段差 0** |
| `token-ast` | 1716 / 1706 / 0 / 0 / 10 | 同左（known-gap 0） |
| `real-dts` | 226 / 226 | **226 / 226** |
| stage4b / block / 4c / 4c2 / dev / ops | 17 / 12 / 42 / 33 / 22 / 40 | 同左，全 0 fail |
| `op-ast-proof` / `op-proof` / `comma-import` | 90 / 40 / 11 | 90 / 40 / 11 |
| `feas-operator` + `insert-between` | 6 + 9 | 6 + 9 |
| `perf` | 2.24 / 2.06 | 2.11 / 2.18（线性，无退化） |

## 2. 带返回类型的函数体（目标 1）

判据落在 `BlockPossibleShape.IsReturnTypeBrace`（`block-possible-shape.xl.md`），`TryMountFunctionBody`
从「前一个单元是已闭合 `(`」扩展为「已闭合 `(` **或** 返回类型收住后紧跟 `{`」。

- 从 `{` 往回扫**平铺单元**：`{` 前一个单元必须能收住一个类型（口径与 `TypeBuilder.IsBodyBrace` 逐字相同，
  `CanEndTypeUnit`）；继续往回扫到的第一个可见 `:` 就是返回类型的冒号（类型内部的对象 / 函数 / 元组类型
  都是**单个括号单元**，里面的 `:` 不可见）；冒号前必须是已闭合的参数表 `(`。
- 往回扫遇到 `;` / `=` / `=>` 停；遇到**语句 / 声明起点关键字**（`export/enum/class/function/const/...`）也停。
  后者是实测补的：`declare function f(): void ⏎ export enum E { A }` 里枚举体的 `{` 会跨过 ASI 去认前一条
  声明的返回类型冒号，造成 10 条 ast-json 结构差 + 3 个 real-dts 差异；加这条后归零。
- `{}` 类型与体括号的歧义：`function h(): { a: number } { … }` 的第一个 `{` 前面是 `:`，`CanEndTypeUnit`
  直接排掉（不挂）；第二个 `{` 前面是已闭合的类型字面量括号，扫描命中冒号 → 挂载。实测 mount=1、body=1。

## 3. 类方法 / 构造器 / 访问器体（目标 2）

方法/构造器体括号的**父单元是类体括号**（成员候选目录的宿主），不是 `ClassDeclarationShape`，所以 s4j 在
类壳上试的钩子不可达。本轮在 core 加了一个**通用子括号事件**：

- `core/syntax/basic-tokens/bracket.xl.md`：新增接口类 `BracketChildCreatedHook` + 静态字段
  `Bracket.ChildBracketCreatedHook` + `Bracket.OnBracketCreatedEvent`。`Bracket.Transit` 原本就通知父单元，
  父单元是括号时现在会走到这里。
- 处理顺序：① 转调监听（typescript 侧 `BlockBodyChildBracketHook` → `BlockPossibleShape.OnChildBracketCreated`）；
  ② **仅当**本括号目录有终结候选（`EndPossible !== null`）**且**新括号是 `{` 时就地判一格。
- 类体门控：`OnChildBracketCreated` 只在宿主括号的成员目录里含 `MethodDeclarationPossibleShape` 时挂目录
  （类体目录唯一标识）。对象字面量方法体、箭头块体因此**不会被挂**——它们的建树不经过
  `StatementBuilder.BuildBlock`，挂了只会泄漏形状。
- 收口通道未变：`ClassDeclarationShape.BuildMemberFromCode` 对方法体走
  `new StatementBuilder(...).Load([bodyUnit]).BuildStatement()` → `BuildBlock()` →
  `HasBuiltBodyStatements` / `CollectBodyStatements`，与函数体同一条。

## 4. 嵌套块深度 ≥2（目标 6）

同一个 `Bracket.OnBracketCreatedEvent` 的②：**有终结候选的宿主**（块体 / 函数体目录，终结候选是
`BlockBodyWaitingPossibleShape`）在子 `{` 刚建出来时就判一格，于是内层块壳在外层块体目录里**立刻**建出、
并把块体目录挂到内层括号上；深度 3、4 不再退化。

**为什么安全**：S4i 方案 A 的抛错出口是 `Candidates.size === 0 && EndPossible === null`；这里只对
`EndPossible !== null` 的宿主重算，候选全灭时返回 `Waiting`。类体 / 接口体 / 枚举体成员目录
（无终结候选）**一律不重算**，S4i 的抛错路径没有被打开。

## 5. 接管证据（实测，s4j-function-body 26 条）

| 源码 | mount | body | shells |
|---|---|---|---|
| `function f(){ let x=1; if(x) f(); }` | 1 | 2 | 0 |
| `function g(a: number): number { let y=a; while(y) f(); return y; }` | 1 | 3 | 0 |
| `function h(): { a: number } { let x=1; return {a:1}; }` | 1 | 1 | 0 |
| `function f(a: T): U { a; }` | 1 | 1 | 0 |
| `function f<T>(a: T): T { return a; }` | 1 | 1 | 0 |
| `class C{ m(){ let y=2; while(y) f(); } constructor(){ this.x=1; } }` | 2 | 6 | 0 |
| `class C{ m(): number { let y=2; return y; } }` | 1 | 2 | 0 |
| `class C{ get x(): number { let y=1; return y; } }` | 1 | 1 | 0 |
| `{ { { a; } } }` / `{ { { let x=1; } } }` | 0 | 3 | 3 |
| `{ { { { let x=1; } } } }` | 0 | 4 | 4 |
| `{ { a; } { b; } }` | 0 | 4 | 3 |
| `function f(){ { { let x=1; } } }` | 1 | 3 | 2 |
| `const o = { m(){ let z=1; } };` / `const f = () => { … }` | 0 | 0 | 0 |
| `if (a) { let x = 1; }` | 0 | 0 | 0 |
| `async function h(): Promise<void> { await f(); }` | 1 | **0** | 0 |

每条都断言：接管档不抛错、fallback 0、**XML == legacy**、两次接管档 XML 相同、无 `StatementShape` 泄漏。
陷阱组（`let o: {a:number} = {a:1}` / `type T = {a:1}` / `interface I { m(): {a:number} }` /
`switch(x){case 1: {…}}` / `label: {…}` / `({ m(){…} })` / `function f(): void;`）全部 mount=0、XML==legacy。

## 6. 未覆盖清单（按优先级）

| 构造 | 现状（实测） | 缺什么 |
|---|---|---|
| `async function a(){ await f(); }` 体首句 `await` | mount=1、**body=0**，`await` 语句原样 raw | `await` 在 `StatementRouteUtil.IsLegacyKeyword` / `Decide` 里是**双角色**起点（冻结的路由），块体目录没有 await 起点候选；要做需一个自己的壳 + 结束判据，本轮不冒险 |
| 对象字面量方法体 `({ m(){…} })` | mount=0（门控排除） | 建树走 `ExpressionBuilder` 的成员解析，不走 `StatementBuilder.BuildBlock`；挂目录会泄漏形状，需先给它一条收集通道 |
| 箭头块体 `x => { … }` | mount=0 | 同上；且 `=>` 判据会与「表达式壳已把箭头体收成 raw」冲突，先修收集再接管 |
| `if/while/for/try/catch` 体块 | mount=0 | 括号被控制流壳接走，需控制流壳自己的括号事件（与类体同型，但宿主是 `StatementShape`，本轮未做） |
| 函数体里的函数声明 `function f(){ function g(){…} }` | mount=1（f 体）、g 体 raw | 块体目录没有 `FunctionDeclarationPossibleShape` 候选；声明族整体未接管 |
| 声明族 / import-export | 全 legacy | 后续 Stage |

## 7. 风险

| id | 风险 | 兜底 |
|---|---|---|
| R1 | `IsReturnTypeBrace` 是词法启发式（往回扫到 `:`） | 三条停条件（`;`/`=`/`=>`、语句关键字、标记单元）+ 陷阱组 7 条；全表 ast-json 6167/6167 与 real-dts 226/226 是实测证据 |
| R2 | `Bracket` 早判一格可能提前消耗候选 | 只对**有终结候选**的宿主、只对 `{`；候选全灭 → `Waiting`（不抛错）；类/接口/枚举目录不重算 |
| R3 | 监听是进程级静态字段、懒安装（第一次根层括号事件） | 只有类体括号里的方法体依赖它；类体括号本身就发生在第一次根层事件之后或同一文件内；legacy 对拍档 `EnableShellExpressions=false` 时 `SourceFileShape` 不装、`Bracket` 也不挂（`TryMountFunctionBody` 空转） |
| R4 | 类体门控用 `constructor.name === "MethodDeclarationPossibleShape"` | 只在未混淆的 tsc 产物里运行；类型名是仓库自己的类，改名会当场退化为「不接管」而不是错树 |
| R5 | `block-body-takeover` 的 5 条深层块计数期望被改大 | 计数是接管面读数、不是正确性断言；正确性由 XML==legacy + ast-json 6167/6167 + real-dts 226/226 守 |
| R6 | `dev` 组仍有 1 条 fallback（distinct=1，total=2） | 与 S4j R4 同一条基线行为，不在函数体路径上；`harness --all` 的 file-fallback 仍为 0 |

## 8. 文件 / diff

- `core/syntax/basic-tokens/bracket.xl.md`：+`BracketChildCreatedHook`、+`Bracket.ChildBracketCreatedHook`、
  +`Bracket.OnBracketCreatedEvent`（**core 改动单独 commit** `64b87df4`）。
- `typescript/tokens/statements/block-possible-shape.xl.md`：+`CanEndTypeUnit`、+`IsReturnTypeBrace`、
  +`OnChildBracketCreated`、+`BlockBodyChildBracketHook`；`TryMountFunctionBody` 判据扩展。
- `typescript/tokens/files/source-file-shape.xl.md`：安装括号监听（懒、一次）。
- `tests/statement-possible/s4j-function-body.mjs`：10 → 26 条（新接管面 + 陷阱组）。
- `tests/statement-possible/block-body-takeover.mjs`：5 条深层块计数期望更新（深度 ≥2 已接管）。
- `dist/` 未手改，全部由 `xl_build` 生成；`StatementBoundaryUtil.IsAsiBoundary` 未改。

## 9. 复现

```powershell
xl_build targets=["ts"] paths=["core","typescript"]   # 887 written / 0 error
node node_modules/typescript/bin/tsc -p tsconfig.json # exit 0
node tests/statement-possible/s4j-function-body.mjs   # 26/26
node tests/statement-possible/block-body-takeover.mjs # 21/21
node tests/statement-possible/harness.mjs --all       # 101/0/known1
node typescript/cases/ast-json.mjs ; git status --short typescript/cases  # 空
node typescript/cases/ast-json-diff.mjs               # 6167/6167
node typescript/cases/real-dts-ast.mjs                # 226/226
```
