# HANDOFF-gap-edge2 —— TS 合法但 CJ AST 仍错 / 抛错的边缘形态收尾

- 分支：`feature/possible-statement-gap-edge2`
- 起点 HEAD：`029aeeac`（= 转正 + gap 清零 + 5d-1a…5d-7 全部合并），工作树干净
- 工作副本：`C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-gap-edge2`
- 本轮提交：`fix(statements): 边缘形态 AST 收尾（TS 合法形态，gap-edge2）`（源码 + cases + 基线，单一提交）
- 允许范围：只改 `typescript/tokens/**` 与 `tests/statement-possible/**`；**`core/` 一字未动**，`IsAsiBoundary` / `EndsAtLineBreak` 的**既有分支语义未改**（只新增分支），没有新开/切换任何开关。

---

## 1. 结论先行

**4 类主缺陷（Lead 实测确认）+ 2 类扫描中发现的同类缺陷，全部修到「tsc `parseDiagnostics = 0` ⇒ AST 逐节点 == TS」；非法恢复形只记录、不为它们改语义；默认全门零回归；退场指标不降反升。**

| # | 形态（tsc 诊断数） | 修复前 | 修复后 | 根因（唯一实现点） |
| --- | --- | --- | --- | --- |
| A | `a < b >` ⏎ `c`（0） | DIFF：一条 `BinaryExpression[0,9]` 吞掉 `c` | **MATCH**：`ExpressionWithTypeArguments[0,7]` + `ExpressionStatement(c)` | `AngleJudge.FollowerAllows` 把 `>` 后的 **trivia 单元**当 follower；且收尾 `>` 不在 ASI 判据里 |
| B | `const g = () => 1` ⏎ `{ }`（0） | THROW「表达式语句没有读完」（`{};` 形态退化成裸 token 树） | **MATCH**：`VariableStatement` + `Block`（+ `EmptyStatement`） | `ExpressionStatementPossibleShape.ExpectsBodyBefore` 回扫撞见 `=>` 就判「箭头还欠体」 |
| C | `namespace N { export default async () => {} }`（0） | DIFF：`ExpressionStatement`（children 是裸 `ExportKeyword` / `DefaultKeyword`） | **MATCH**：`ExportAssignment(ArrowFunction)` | `ModuleBlockShape.BuildMember` 把 `default` 后**一格** `async` 就当声明修饰词 |
| D | `namespace N { export default function () {} }`（0） | THROW「函数声明的名字不是标识符」 | **MATCH**：`FunctionDeclaration`（无名字 child） | `ModuleBlockShape` 建函数成员时没给 `FromUnits` 传 `allowAnonymous`（根层一直是对的） |
| E | `function* g(){ a; yield* b; }`（0） | DIFF：`BinaryExpression(yield * b)` | **MATCH**：`YieldExpression(AsteriskToken, b)` | `ExpressionBuilder.EnclosingFunctionFlags` 往回扫原文撞见**同一层的 `;`** 就 `return 0`（判成函数外上下文） |
| F | `async function f(){ a; await (b); }`（0） | DIFF：`CallExpression(await, b)` | **MATCH**：`AwaitExpression(ParenthesizedExpression)` | 与 E 同一根因（`await` 走同一个 `EnclosingFunctionFlags`） |

C/D 是「相邻形态系统扫描」里发现的：两者都不在 Lead 给的清单里，但同样是 `parseDiagnostics = 0` 的合法形态，且都在 `namespace`/`module` 体这一层，一并修掉。

---

## 2. 逐条根因与修法（最小改动，全部落在 `typescript/tokens/`）

### A. `a < b >` ⏎ `c` —— 实例化表达式收尾（`AngleJudge` + 边界接线）

**TS 的事实**（`node_modules/typescript/lib/typescript.js` 的 `canFollowTypeArgumentsInExpression`）：
`>` 之后如果是 `(` / 模板 ⇒ 类型实参（调用）；如果是 `<` `>` `+` `-` ⇒ **一律不是**类型实参；
其余情况按 `hasPrecedingLineBreak() || isBinaryOperator() || !isStartOfExpression()` 判。
所以 `a < b >` ⏎ `c` 在 TS 里是**两条**语句（第一条是 `ExpressionWithTypeArguments`），
而 `a < b > c`（同一行）仍是一条比较链。

**CJ 的错**：`AngleJudge.FollowerAllows` 直接读 `units[close + 1]`——`host.Data` 里 `>` 与下一格之间
夹着空白 / 换行 trivia，于是它读到的是**那个 trivia 单元**（既不是 Symbol 也不是 Bracket）⇒
「接不上」⇒ 整段被当比较链继续吃，`c` 被吞进同一条语句。

**修法（4 处、各处一个理由）**：
1. `typescript/tokens/types/angle-judge.xl.md`
   - `FollowerAllows`：先把 `close + 1` 之后的 **trivia 跳过**再取 follower（换行只作为
     `hasPrecedingLineBreak` 参与判断，与 TS 同口径）。
   - `FollowerAllows`：在换行规则**之前**加 TS 的四类排除（`<` / `>` / `>>` / `>>>` / `+` / `-`）。
     没有这一格会把 `a < b >` ⏎ `+c`（TS 是比较链 `(a<b) > (+c)`）误判成两条语句。
   - 新增 `IsInstantiationClose(units, index)`：「`>` / `>>` / `>>>` 收的是**表达式位**的类型实参表」
     的唯一判据 = 配对 `<`（`FindClose`）+ 前驱可当被调用者（`PredecessorAllows`）+ follower 允许
     （`FollowerAllows`）+ follower 不是 `(` / 反引号模板（那两种是带类型实参的调用 / 标签模板）
     + **opener 的前驱不能是比较运算符 `>` / `>>` / `>>>`**（`a < b > < c >` ⏎ `d` 里第二个 `<`
     前面是运算符，整条是 `(a<b) > (<c>d)`，不能在这里收句）。
2. `typescript/tokens/statements/statement-scanner.xl.md`：加 `IsInstantiationClose` 薄委托
   （与既有 `IsTypeArgumentClose` 同一种写法，避免 boundary-util 反向 import angle-judge 成环）。
3. `typescript/tokens/statements/statement-boundary-util.xl.md`
   - `EndsAtLineBreak`（扫描器层）：`previous` 是 `>` 类且 `IsInstantiationClose` ⇒ 是 ASI 边界。
   - `IsAsiBoundary`（候选层）：`CanEndExpressionAt` 不认 `>`，这里单独放行实例化收尾。
   - 两条既有分支（「类型位 `>` 收尾」与「调用位被挡」）**未改一字**，新增分支排在它们之后。

### B. `const g = () => 1` ⏎ `{ }` —— 箭头体已给，`{` 只能是新块语句

`ExpressionStatementPossibleShape.ExpectsBodyBefore` 从收尾单元往回扫「谁还在等体」。
它在回扫里撞见 `=>` 就 `return true`，可箭头的体**只有一个 AssignmentExpression**，就是紧贴 `=>`
的那一段；既然 `=>` 与当前 `{` 之间已经有过收尾单元（`tail`），那个体早就写完了。
「箭头还欠体」的唯一形态是 `=>` **自己就是收尾单元**——那一条已经由 `tail instanceof Symbol` 分支
返回 true。所以回扫里的 `=>` 改为 `return false`（注释写明口径）。
修复前 `const g = () => 1` ⏎ `{};` 更严重：整条退化成裸 token 形状树（`Common` / `Symbol` / `Bracket`
直接当语句子节点）。

### C. `namespace N { export default async () => {} }` —— `default` 后要看**两格**

`ModuleBlockShape.BuildMember` 判「`default` 后面跟的是不是声明词」时只看了 `async` 一格就消费成
`DefaultKeywordShape`，于是成员头变成 `async`，落进 `StatementBuilder` 建出 `ExpressionStatement`。
修法：`async` 必须再看一格是 `function`、`abstract` 必须再看一格是 `class` 才算修饰词
（`class` / `function` / `interface` / `enum` 仍直接算）。`export default async () => {}` 因此回到
ExportAssignment 分支；`export default async function f() {}` 的 AST 不变（已有用例对拍）。

### D. `namespace N { export default [async] function () {} }` —— 匿名默认导出函数

`FunctionDeclarationShape.FromUnits(host, start, end, context, ambient, allowAnonymous)` 早就支持
`allowAnonymous`（根层 `export default function () {}` 走的就是它），但模块体这条路径没传。
修法：模块体建函数成员时传 `allowAnonymous = (defaultModifier !== null)`——**闸门是 `export default`**：
没有 `default` 的 `namespace N { function () {} }`（TS `parseDiagnostics = 1`）仍按原样抛错，
不移到 known 之外的语义。同时补了 `export default async function …` 的头判定（`async` + `function`
走同一条函数成员路，才能让匿名形态拿到 `allowAnonymous`）。

### E/F. 非首句 `yield*` / `await (…)` —— `;` 不是函数边界

`ExpressionBuilder.EnclosingFunctionFlags` 从 `yield` / `await` 的**原文位置**往回扫，找包住它的函数。
它撞见 `;` 就 `return 0`（判成函数外上下文）。于是 `function* g(){ a; yield* b; }` 的 `yield` 落成
Identifier + 二元 `*`（`yield b` 只是靠 lookahead 侥幸正确），`async function f(){ a; await (b) }` 落成
调用 `await(b)`；**首句**（往回先撞 `{`）一直是对的——这正是「非首句」这个现象的来源。
`;` 只是同一花括号层里的语句分界，真正的函数边界是那个还没闭合的 `{`（该方法本来就有这一支，
已闭合的 `)` / `]` / `}` 会成对跳过）。修法：`;` 分支改成「跳过继续回扫」。
反例仍成立：`function* g(){ function f(){ x; yield* y; } }` 里内层非 generator 的 `yield` 仍是 Identifier
（用例 `edge2-yield-nested-nongenerator` 常驻）；函数外的 `a; yield* b;` 仍是 Identifier。

---

## 3. 合法 vs 非法分类（判据 = `ts.createSourceFile(...).parseDiagnostics`）

### 3.1 TS 合法（0 诊断）⇒ 已修到 AST == TS：42 例，全部在 `tests/statement-possible/gap-edge2-cases.json` 的 `gap-edge2-legal` 组

| 类 | 用例（节选） |
| --- | --- |
| 实例化表达式 / 类型实参 | `a < b >`、`a < b >` ⏎ `c`、`{ a < b >` ⏎ `c }`、`function f() { a < b >` ⏎ `c }`、`a < b >;`、`a < b > (c)`（**必须是调用**）、`a < b > c`（**必须是比较链**）、`x = a < b >`、`(a < b >)`、`f(a < b >)`、`g<number> /* c */ (1);` |
| 箭头体 / 换行块 | `const g = () => 1` ⏎ `{ }`、`const g = () => 1` ⏎ `{};`、`()=>1` ⏎ `{}`、`x = 1` ⏎ `{}`、`if (a) b` ⏎ `{}` |
| 模块体 `export default` | `namespace N { export default async () => {} }`、`…async () => {}; }`、`module N { … }`、`…export default` ⏎ `async () => {} }`、`…export default function () {} }`、`…export default async function () {} }`、`…export default function* () {} }`、`…export default function f() {} }`、`…export default async function f() {} }`、`…export default class C {} }`、`…export default abstract class C {} }` |
| `yield*` / `yield` / `await` | `function* g(){ a; yield* b; }`、`a; b; yield* c;`、`var x; yield* b;`、`yield* b; yield* c;`、`{ a; yield* b; }`、`a; yield;`、`; yield* b;`、`a; yield* b + 1;`、`const f = function*(){ a; yield* b; };`、`function* g(){ function f(){ x; yield* y; } }`（防误判）、`async function f(){ a; await (b); }`、`a; await b;` |

合法判据不只看诊断数：harness 同时断言
① AST 逐节点（`kind` / `pos` / `end` / `text` / `name`）== TS；② 同源码两次 `Parse` 的 XML 逐字节相同；
③ 壳路径 XML == legacy 路径（`EnableShellExpressions = false`）XML；④ 合法组 `file-fallback = 0`。

### 3.2 TS 非法（`parseDiagnostics > 0`）⇒ 只记录，**不为它们改语义**：8 例，`gap-edge2-known` 组

| 用例 | TS 诊断数 | 证据 |
| --- | --- | --- |
| `do b` ⏎ `{ c; }` | 3 | `'while' expected` / `',' expected` / `')' expected` |
| `export let = 1;` | 2 | `Variable declaration expected` ×2 |
| `export default async` ⏎ `function(){}` | 1 | `Identifier expected` |
| `function () {}` | 1 | `Identifier expected`（TS 的恢复 AST 带零宽 `Identifier`） |
| `namespace N { function () {} }` | 1 | `Identifier expected`——这是 D 的**闸门**用例：`default` 为空时仍须抛错 |
| `async function f(){ a; await; }` | 1 | `Expression expected` |
| `a < b >` ⏎ `.c` | 1 | `An instantiation expression cannot be followed by a property access` |
| `a < b > !` | 1 | `Expression expected` |

harness 对这些用例显式 `allowTsDiagnostics: true` + `knownBaselineFail: true`，读数记 `known`
（不记 pass、也不记 skip/fail）。`tests/statement-possible/harness.mjs` 为此加了一个**只对显式声明者生效**
的窄分支：CJ 抛错且 TS 诊断 > 0 时记 `known` 而不是 `skip`（默认语料不受影响：`--all` 仍是 known=0）。

---

## 4. 前后读数

### 4.1 四个主形态（探针：`ts.createSourceFile` 逐节点对拍，脚本见 §7）

| 形态 | 修复前 | 修复后 |
| --- | --- | --- |
| `a < b >` ⏎ `c` | DIFF（cj 1 条语句 / ts 2 条） | MATCH |
| `const g = () => 1` ⏎ `{ }` | THROW「表达式语句没有读完」 | MATCH |
| `namespace N { export default async () => {} }` | DIFF（ExpressionStatement vs ExportAssignment） | MATCH |
| `function* g(){ a; yield* b; }` | DIFF（BinaryExpression vs YieldExpression） | MATCH |
| `async function f(){ a; await (b); }` | DIFF（CallExpression vs AwaitExpression） | MATCH |
| `namespace N { export default function () {} }` | THROW「函数声明的名字不是标识符」 | MATCH |

### 4.2 反事实（stash，证明用例有判别力）

做法（本轮实测过一轮）：`git stash push -- typescript/tokens` → `xl_build(core,typescript,ts)` → `tsc` →
跑同一份 `gap-edge2-cases.json` → `git stash pop` → 重新 build。

|  | 合法组 | 非法组 |
| --- | --- | --- |
| 修复前源码（stash） | **pass=20 / fail=22**（42 例里 22 例红） | pass=1 / **known=7**（读数与修复后一致） |
| 修复后（本轮） | **pass=42 / fail=0 / skip=0** | pass=1 / known=7 |

修复前 22 条红例正好覆盖 A/B/C/D/E/F 六类，说明这组用例不是「恰好全过」，而是有判别力。

### 4.3 退场指标（`tests/statement-possible/legacy-retirement.mjs`，语料 6300 用例不变）

| 指标 | 基线（`029aeeac`） | 本轮 | 变化 |
| --- | --- | --- | --- |
| `LegacyStatementDispatch` | 0 | **0** | 0 |
| `ScanRootCallCount` | 388 | **388** | 0 |
| `RawTailBuildCount` | 139 | **139** | 0 |
| `ShapeAstDeclinedCount` / `TotalDeclined` | 42 / 42 | **40 / 40** | **−2（更好）** |
| `FileFallbackCount` | 50 | **50** | 0 |
| `filesWithAnyLegacy` | 190 | **188** | −2 |

两处下降都归因到同一根因（`FollowerAllows` 读 trivia）：
- `tests/cases/token/expressions/gap-r676-call-comment-before-args-generic.ts`：`g<number> /* c */ (1);`
  ——`>` 与调用实参之间夹块注释，修复前判「接不上」被形状层拒绝。
- `typescript/cases/expression.ts:L381` = `f < g > (a);`——`>` 与 `(` 之间夹空格，同上。
两条的 AST 本来就与 TS 一致（`ast-json-diff` 0/0/0 证明），本轮只是把「形状树接管」补上，
所以是**拒绝数下降、不是语义变化**。基线文件 `tests/statement-possible/legacy-baseline.json` 已用
`--write-baseline` 重写（这是唯一改基线的动作，判定口径与语料未动）。

### 4.4 相邻形态系统扫描（70 条，`tmp/sweep.json` 口径：tsc 诊断数逐条记录）

覆盖 ASI / 恢复形：`a < b >` ⏎ 各类 follower（`c` / `[d]` / `` `t` `` / `!c` / `+c` / `.c` / `(a)`）、
`a < b > < c >` ⏎ `d`、箭头 + 换行块、`namespace/module/declare namespace` + `export default` 的
`async () =>` / `function ()` / `function* ()` / `class` / `abstract class`、`yield` / `yield*` 在
`if` / `try` / `switch` / `for` / 嵌套块 / 嵌套函数 / 函数表达式 / 类体 / 对象方法里的位置、`await` 各形态、
`interface I { }` ⏎ `{ }`、`type T = A` ⏎ `{ }`、`let a = 1` ⏎ `{ }`、`while/for/label/return/throw/class` + 换行 `{`。
结论：**tsc=0 的 69 条里只剩 0 条不匹配**；唯一的 `DIFF` 是 `s33`（TS 自身 `parseDiagnostics = 1`，
`namespace N { export default async` ⏎ `() => {} }`），按约定只记录。
其中 `a < b >` ⏎ `[d]` 与 `a < b >` ⏎ `!c` 修复前也是错的，本轮一并修好。

---

## 5. 全门读数（`xl_build` 0 error + `tsc -p tsconfig.json` exit 0 之后实跑）

| 门 | 读数 | 与基线 |
| --- | --- | --- |
| `typescript/cases/ast-json.mjs` | **6171 / 6171**（47 构造，cj-fail 0） | 一致 |
| `typescript/cases/ast-json-diff.mjs` | **6171 / 6171**，结构 0 / 位置 0 / 字段 0 | 一致 |
| `git status --porcelain typescript/cases` | **空**（跑完 checkout） | 一致 |
| `typescript/cases/token-ast.mjs --quiet` | total=1716 **ok=1706 crash=0 diff=0** ts-invalid=10 known-gap=0 | 一致 |
| `typescript/cases/real-dts-ast.mjs` | **226 / 226**，崩溃 0、差异 0 | 一致 |
| `tests/statement-possible/harness.mjs --all` | **102 pass / 0 fail / known=0 / uncovered=0 / file-fallback=0** | 一致 |
| `tests/statement-possible/harness.mjs --double-accept` | **120 / 0**，冲突 0 | 一致 |
| `tests/statement-possible/declaration-statement-takeover.mjs` | **33 / 33**，knownGap=0，takeover=27 | 一致 |
| `tests/parse/validate.mjs` | **1720 条 / 0 条不合格** | 一致 |
| `tests/statement-possible/final-matrix.mjs` | **38 / 38**（shapeAst / xmlEqLegacy / astEqTS 各 38/38，knownGap=1 既有） | 一致 |
| `tests/statement-possible/op-ast-proof.mjs` | **94 / 94** | 一致 |
| `tests/statement-possible/op-proof.mjs` | **40 / 40** | 一致 |
| `tests/statement-possible/ast-kind-names.mjs` | **PASS**（live 5/5、self-test 4/4、fixtures 47、运算符节点 262、fail=0） | 一致 |
| `tests/statement-possible/short-family-boundary.mjs` | **46 / 46** | 一致 |
| `tests/statement-possible/control-flow-boundary.mjs` | **85 / 85**，knownGap=1（不退化） | 一致 |
| `tests/statement-possible/shape-ast-coverage.mjs` | cases=50 pass=46 known=4 fail=0 | 一致 |
| `tests/statement-possible/legacy-retirement.mjs` | **PASS**（新基线 0 / 388 / 139 / 40 / 40 / 50） | 变好 |
| `tests/statement-possible/gap-edge2-cases.json`（**新**） | **pass=43 fail=0 skip=0 known=7**（合法组 42/42） | 新增 |

---

## 6. 剩余清单（如实）

1. `namespace N { export default async` ⏎ `() => {} }`：TS `parseDiagnostics = 1`（`Identifier expected` 一类），
   属恢复形，按约定**不修**；CJ 与 TS 的恢复 AST 不同。已进 `gap-edge2-known`（本轮扫描到的唯一 tsc=0 之外的形态）。
2. §3.2 的 7 条非法恢复形与前一条同性质，均记 `known`（含 `do b` ⏎ `{ c; }`、`export let = 1;`、
   `export default async` ⏎ `function(){}`、`function () {}`、`namespace N { function () {} }`、
   `async function f(){ a; await; }`、`a < b >` ⏎ `.c`、`a < b > !`）。
3. 本轮**没有**处理的既有合法形态缺口（不在清单内、也不在本轮扫描命中）没有新增证据；
   70 条扫描 + 42 条专用用例覆盖的范围内，tsc=0 的形态已全部 AST == TS。范围之外不能声称清零。
4. 性能：`FollowerAllows` 多了一次 trivia 跳过（代码单元级）；`EnclosingFunctionFlags` 不再在 `;` 早退，
   最坏情况回扫变长（只对 `yield` / `await` 且前面有 `;` 的条目生效）。`tests/statement-possible/perf.mjs`
   未纳入本轮门槛，本轮未测；全量 `ast-json`（6171 例）与 `real-dts`（226 文件）的墙钟时间与基线同量级。

---

## 7. 复现与回退

**构建（每次改完源码必须走）**
```powershell
# cwd = feature\possible-statement-gap-edge2
xl_build(cwd=".", paths=["core","typescript"], targets=["ts"])   # 0 error
node node_modules/typescript/bin/tsc -p tsconfig.json             # exit 0
```

**本轮新增用例组**
```powershell
node tests/statement-possible/harness.mjs --group=gap-edge2-legal,gap-edge2-known --file=tests/statement-possible/gap-edge2-cases.json
# 期望：cases pass=43 fail=0 skip=0 known=7；合法组 pass=42 fail=0；file-fallback 0
```

**全门**
```powershell
node typescript/cases/ast-json.mjs
node typescript/cases/ast-json-diff.mjs
git status --porcelain typescript/cases        # 必须为空
node typescript/cases/token-ast.mjs --quiet
node typescript/cases/real-dts-ast.mjs
node tests/statement-possible/harness.mjs --all
node tests/statement-possible/harness.mjs --double-accept
node tests/statement-possible/declaration-statement-takeover.mjs
node tests/parse/validate.mjs
node tests/statement-possible/final-matrix.mjs
node tests/statement-possible/op-ast-proof.mjs
node tests/statement-possible/op-proof.mjs
node tests/statement-possible/ast-kind-names.mjs
node tests/statement-possible/short-family-boundary.mjs
node tests/statement-possible/control-flow-boundary.mjs
node tests/statement-possible/shape-ast-coverage.mjs
node tests/statement-possible/legacy-retirement.mjs
```

**反事实（证明用例有判别力）**
```powershell
git stash push -- typescript/tokens
#   xl_build(core,typescript,ts) + tsc
node tests/statement-possible/harness.mjs --group=gap-edge2-legal,gap-edge2-known --file=tests/statement-possible/gap-edge2-cases.json
#   期望：合法组 pass=20 fail=22（22 条红）；非法组 known=7 / pass=1
git stash pop
#   重新 xl_build + tsc，再跑一遍 → pass=42 fail=0
```

**本轮改动的文件**
| 文件 | 改动 |
| --- | --- |
| `typescript/tokens/types/angle-judge.xl.md` | `FollowerAllows` 跳过 trivia + TS 四类排除；新增 `IsInstantiationClose`（含 opener 前驱闸） |
| `typescript/tokens/statements/statement-scanner.xl.md` | 新增 `IsInstantiationClose` 薄委托 |
| `typescript/tokens/statements/statement-boundary-util.xl.md` | `EndsAtLineBreak` / `IsAsiBoundary` 各加「实例化收尾」分支（既有分支未改） |
| `typescript/tokens/statements/expression-statement-possible-shape.xl.md` | `ExpectsBodyBefore` 回扫里的 `=>` 改判「箭头已有体」 |
| `typescript/tokens/expressions/expression-builder.xl.md` | `EnclosingFunctionFlags` 的 `;` 不再是函数边界 |
| `typescript/tokens/declarations/module-block-shape.xl.md` | `default` 后看两格（`async function` / `abstract class`）；`export default [async] function` 允许匿名；`async function` 头走函数成员路 |
| `tests/statement-possible/harness.mjs` | `knownBaselineFail` 用例在「CJ 抛错 + TS 诊断 > 0」时记 `known`（只对显式声明者生效） |
| `tests/statement-possible/gap-edge2-cases.json` | **新增** 42 条合法 + 8 条非法恢复形用例 |
| `tests/statement-possible/legacy-baseline.json` | `--write-baseline` 重写（declined 42 → 40，filesWithAnyLegacy 190 → 188） |

**回退**：`git revert <本轮提交>`（单一提交，源码 + 用例 + 基线一起回退），然后 `xl_build` + `tsc` 即可。
开关状态：本轮**没有新增或切换任何开关**（`StatementRouteUtil` / `BlockPossibleShape` 的默认值一律未动）。
