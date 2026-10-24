# HANDOFF — Stage 4n：控制流体块接管**落地**

分支 `feature/possible-statement-s4n`，基线 `feature/possible-statement` @ **92b00efe**（主仓库已同步）。
本轮把 S4m 的「三步补丁计划」真正落地，并新增专用用例组 `stage4n` + 独立接管证明脚本。
**core 一行未改，`statement-builder` / 任何 builder 一行未改**；改的只有三个 `.xl.md`（两个 tokens 文件 + 一个计数文件）。

---

## 1. 落地内容（零 builder 改动）

| 文件 | 改动 | 行数 |
|---|---|---|
| `typescript/tokens/statements/statement-shape.xl.md` | 新增 `## method OnBracketCreatedEvent:(bracket:Token, context:SyntaxContext)=>void`（转调 `BlockPossibleShape.OnShellBracketCreated`）+ 一条 `import { BlockPossibleShape }` | +24 |
| `typescript/tokens/statements/block-possible-shape.xl.md` | 新增 `## static method OnShellBracketCreated` 与 `## static method TryMountControlFlowBody` | +120 |
| `typescript/tokens/statements/statement-route-util.xl.md` | 新增 `## static field ControlFlowBodyBraceCount:int = 0` | +12 |

三步与 S4m §3 的计划**逐字对应**，唯一差别是 `TryMountControlFlowBody` 里把 `const data = shell.Data;`
写成了 `const data:Array<Token> = shell.Data;`（xl→ts 生成器对 `Array` 类型标注更稳，语义不变）。

**为什么不改 builder**：`BuildIf` / `BuildWhile` / `BuildDo` / `BuildFor` / `BuildForInOrOf` / `BuildTry` /
`BuildCatchClause` / `BuildWith` 全部走 `this.BuildStatement()`，而 `BuildBlock` 首行就是
`HasBuiltBodyStatements → CollectBodyStatements`。挂上目录只改「谁来建体里的语句」，树的形状仍由同一批
builder 从同一段 raw 单元产出，所以 XML / AST 天然相等 —— 本轮全表读数证实了这一点（§4、§5）。

---

## 2. 判据（`TryMountControlFlowBody`，两段）

① **壳是控制流构造**：`Kind === StatementRoute.ShellStatementFamily` 且**首代码单元**的文本属于
`if` / `while` / `do` / `for` / `with` / `try`（`else` / `catch` / `finally` 不可能起一个壳，故不在集合里）。

② **这个 `{` 处在体位置**：前一个非 trivia 单元是 `do` / `else` / `try` / `finally` / `catch`，
或前一个单元是**已闭合的 `(` 括号**且再往前一格的文本是 `if` / `while` / `for` / `with` / `catch`。

本语法 `(` `)` 是同一个 `Bracket` 单元，`if (a) {` 与 `catch (e) {` 的前一个单元**完全相同**，
所以必须再往前看一格才能区分 —— 这一格正是把 `catch` 体收进来、把 `switch` 体挡在外面的关键。

---

## 3. 接管证据（`tests/statement-possible/control-flow-body-takeover.mjs`，28 条）

`cases=28 failed=0 totalBrace=33 totalBody=38`：

| 源码 | brace | body | cf |
|---|---|---|---|
| `if (a) { let x = 1; }` | 1 | 1 | 1 |
| `if (a) { b; } else { c; }` | 2 | 2 | 1 |
| `while (a) { b; }` | 1 | 1 | 1 |
| `do { b; } while (a);` | 1 | 1 | 1 |
| `for (;;) { c; }` | 1 | 1 | 1 |
| `for (const v of y) { d; }` | 1 | 1 | 1 |
| `for (const k in y) { d; }` | 1 | 1 | 1 |
| `try { d; } catch (e) { e; } finally { f; }` | 3 | 3 | 1 |
| `try { d; } finally { f; }` | 2 | 2 | 1 |
| `with (a) { b; }` | 1 | 1 | 1 |
| `if (a) {}` | 1 | 0 | 1 |
| `if (a) { b + c; d = 1; }` | 1 | 2 | 1 |
| `if (a) { var v = 1; const c = 2; }` | 1 | 2 | 1 |
| `if (a) { /*c*/ let x = 1; }` | 1 | 1 | 1 |
| `if (a) { { let y = 1; } }` | 1 | 2 | 1 |
| `if (a) { while (b) { c; } }` | 2 | 2 | 2 |
| `try { if (x) { y; } } catch (e) { z; }` | 3 | 3 | 2 |
| `if (a) { if (b) { if (c) { d; } } }` | 3 | 3 | 3 |
| `if (a) { b; } else if (c) { d; } else { e; }` | 3 | 3 | 1 |
| `function f() { if (a) { let x = 1; } }` | 1 | 2 | 1 |
| `{ if (a) { let x = 1; } }` | 1 | 2 | 1 |
| `async function f() { if (a) { await g(); } }` | 1 | 2 | 1 |
| **对照 / 未覆盖组（必须为 0）** | | | |
| `if (a) b;` | 0 | 0 | 1 |
| `if (a) b` ⏎ `{}` | 0 | 0 | 1 |
| `switch (x) { case 1: { g; } }` | 0 | 0 | 1 |
| `({ m() { let z = 1; } });` | 0 | 0 | 0 |
| `const f = x => { let z = 1; };` | 0 | 0 | 0 |
| `{ function f() { let x = 1; } }` | 0 | 0 | 0 |

**每条同时断言**：接管档 XML == legacy 档（`EnableShellExpressions=false`）逐字节、AST 逐节点 ==
`ts.createSourceFile`、两次解析 XML 相同（确定性）、XML 无 `StatementShape` / `PossibleShape` /
`CatalogGuide` 泄漏、文件级 fallback = 0。`failed=0` 即这些全部成立。

**复用同一机制**：内层控制流体（`if` 体里的 `while`、`try` 体里的 `if`）**也接管**（上表 brace=2/3 的行），
因为内层 `if/while` 的壳在体目录里建成后，它的体括号同样触发 `OnBracketCreatedEvent` —— 同一个机制，
无第二套判据。

### 3.1 三条既有读数上移（`control-flow-takeover.mjs` 期望值更新，非放宽）

| 源码 | 旧 | 新 | 原因 |
|---|---|---|---|
| `if (a) { while (b) { c; } }` | cf 1 | cf **2** | 内层 `while` 现在在体的块体目录里建壳 |
| `{ if (a) { b; } }` | body 1 | body **2** | `b;` 也被 if 体目录接管 |
| `{ while (a) { b; } let x = 1; }` | body 2 | body **3** | `while` 体里的 `b;` 同样被接管 |

XML / AST 断言一字未改，且仍是 `failed=0`；这三条是**接管变深**的正确读数，不是「为绿改期望」：
把它们改回旧值反而会与 `ControlFlowBodyBraceCount=33` 的挂载事实矛盾。

---

## 4. 全表读数（本轮）

| 表 | 读数 |
|---|---|
| `xl_build` targets=["ts"] paths=["core","typescript"] | **890 written / 0 error**（2522 warning，与基线同量级） |
| `tsc -p tsconfig.json` | **exit 0** |
| `tests/parse/validate.mjs` | **1720 / 0 不合格** |
| `harness --all` | **101 pass / 0 fail / known 1**，groups run=8 skipped=3，file-fallback 0 |
| `harness --double-accept` | **120 cases / 0 failed**，冲突 0 |
| `harness --lint` | **PASS**（ASI 实现唯一 / 优先级数字表只在 operator-table） |
| `ast-json` | **6167 / 6167**，`git status --short typescript/cases` **空** |
| `ast-json-diff` | 结构差 0 / 位置差 0 / 字段差 0 |
| `token-ast` | total 1716：**ok 1706 / diff 0 / crash 0 / ts-invalid 10** |
| `real-dts-ast` | **226 / 226**，崩溃 0 |
| **`stage4n` 新组** | **28 pass / 0 fail / skip 0 / uncovered 0**，fallback 0，double-accept 0 |
| `control-flow-body-takeover` | **28 / 0**（brace 33、body 38） |
| `control-flow-takeover` | **39 / 0**（3 条读数更新见 §3.1） |
| `block-body-takeover` | **21 / 0** |
| `s4j-function-body` | **26 / 0** |
| `s4l-await-body` | **19 / 0** |
| `stage4b` / `stage4c` / `stage4c2` | **17 / 0**、**42 / 0**、**33 / 0** |
| `stage5c` / `r1-asi` / `dev` | **21 / 0**（见下）、**31 / 0**、**22 / 0** |
| `operators-live` / `op-ast-proof` / `op-proof` | **40 / 0**、**90 / 0**、**40 / 0** |
| `comma-import-fallback` | **11 / 0**（契约：XML==legacy、无 fallback、无泄漏、控制组仍被接管） |
| `feas-operator` / `insert-between` | **6 / 0**、**9 / 0** |
| `perf` | long n=300 3.70ms；2000 语句 26.47ms；scale ratio(200/100)=2.01、ratio(400/200)=2.71（**既有 WARN**，>2.5 阈值，与基线同） |

`dev` 组的 `file-fallback total=2 distinct=1` 是 dev 探针自身的 `--` 用例（`let a = 1; a++; --\na;…`），
**pass=22 / fail=0**，与本轮改动无关（dev 组本来就允许该探针走 fallback）。

---

## 5. 未覆盖清单（本轮结束时的真实状态）

1. **`switch` 体 / `case` 块** —— 判据里故意不含 `switch`：体括号位置判据其实成立（`)` 前是 `switch`），
   但 `SwitchStatementShape → CaseBlockShape` 的建树路径本轮没读完，挂上有形状泄漏风险。读数：brace=0、body=0（安全回退）。
2. **块内函数声明** `{ function f() { let x = 1; } }` —— 体括号宿主是块括号，走 `OnChildBracketCreated` 的类体门控；
   块体目录也没有声明族候选。读数 brace=0、body=0。
3. **箭头块体** `x => { … }` / **对象方法体** `({ m(){ … } })` —— 建树走 `ExpressionBuilder`，不经过 `BuildBlock`；
   挂目录只会泄形状。读数 brace=0、body=0。
4. **声明族 / import-export** —— 仍是 `Legacy`（与 S4l/S4m 相同）。
5. **`if (a) b;`（无块体）**——控制流体是单语句，不存在体括号，天然不挂（brace=0，安全回退）。

---

## 6. 风险与处置

| id | 风险 | 实际结果 |
|---|---|---|
| R1 | `statement-shape ↔ block-possible-shape` 双向 import | **未触发**：`xl_build` 0 error、`tsc` exit 0、全表运行时无 TDZ / 循环初始化错。所以采用「直接转调」版本，**没有**启用 `ShellBracketCreatedHook` 静态钩子兜底 |
| R2 | 体位置判据是「语法就近」启发式（靠再往前一格区分 `if` 与 `catch`） | 28 条专用用例逐条对拍通过；`switch` / 对象方法 / 箭头体三者实测 brace=0，启发式没有误挂 |
| R3 | `CollectBodyStatements` 的 `Pos` 纠正（`{`+1）在 `if` 体上是否同样生效 | 生效：28 条 AST 逐节点一致（含 `if (a) { let x = 1; }` 的 `VariableDeclarationList` 位置） |
| R4 | `BodyKind` 未设置 | 与 `TryMountFunctionBody` 一致，不影响建树；全表未出现差异 |
| R5 | `else` / `try` 体的 `cf` 读数（=1，不是 2/3） | 它们是**同一个壳**里的体括号，不是新壳；控制流壳计数按语句算，符合既有语义（写进 §3 表） |

---

## 7. 复现命令

```powershell
xl_build targets=["ts"] paths=["core","typescript"]        # 890 / 0
node node_modules/typescript/bin/tsc -p tsconfig.json      # 0
node tests/statement-possible/harness.mjs --file=tests/statement-possible/control-flow-body-cases.json --group=stage4n
node tests/statement-possible/control-flow-body-takeover.mjs
node tests/statement-possible/harness.mjs --all
node tests/statement-possible/harness.mjs --double-accept ; node tests/statement-possible/harness.mjs --lint
node tests/parse/validate.mjs
node typescript/cases/ast-json.mjs ; git status --short typescript/cases ; node typescript/cases/ast-json-diff.mjs
node typescript/cases/token-ast.mjs ; node typescript/cases/real-dts-ast.mjs
```
