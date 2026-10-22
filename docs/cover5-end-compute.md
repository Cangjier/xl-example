# cover5 round5：end compute 不对（语句 / 类型的「终点格」判错）

本文件记录本轮（分支 `cover5-end-compute`，基点 `5362a38`）的读数、问题清单、根因定位、修复、
新增用例与遗留项。改动只在 `typescript/` 层，未碰 `core/**`、未碰 `typescript/IMPORTANCE.md`。

## 1. 基线 / 最终读数

| 项 | 基线 | 本轮结束 |
|---|---|---|
| `node typescript/cases/ast-json.mjs` | 5335 / 5335 cj-ok（47 构造） | **5431 / 5431 cj-ok**（47 构造） |
| `node typescript/cases/ast-json-diff.mjs` | 5335/5335；结构 0 / 位置 0 / 字段 0 | **5431/5431；结构 0 / 位置 0 / 字段 0** |
| `node typescript/cases/token-ast.mjs --quiet` | ok 1694 / ts-invalid 10（crash 0 / diff 0） | **ok 1694 / ts-invalid 10（crash 0 / diff 0）** |
| `node typescript/cases/real-dts-ast.mjs` | 226 文件、226 解析成功、226 全一致 | **226 / 226 / 226** |
| `tsc -p tsconfig.json` | 0 error | **0 error** |
| TypeScript | 6.0.3 | 6.0.3 |

新增用例 96 条（`end-compute` 166 → 262）。

## 2. 探针方法与判定口径

- `tmp/probe.mjs`：输入 `{cases:[...]}`，逐条跑 TS `ts.createSourceFile`（取
  `parseDiagnostics` 与 `tsAst`）与本仓 `SourceFileRunner.Parse`（`cjAst`），三栏比较
  （结构 / 位置 / 字段）口径与 `typescript/cases/ast-json-diff.mjs` 完全一致。
- **只有 `parseDiagnostics.length === 0` 且（crash 或 AST 不一致）记为真红**；TS 自身
  有诊断的形态（尺子不测）单列，不作为用例。
- 探针批：`g1`（200 条：表达式续接 / 受限产生式 / 声明换行 / 成员 / 控制流 / 分号 / 块 vs 对象 /
  EOF / trivia / 块体内部）、`g2`（127：yield / type alias / 类成员模板 / 箭头体 / 块级后缀）、
  `g3`（140：根级 ASI 共存 / 各受限产生式 / 类型别名细化 / 成员细化 / 箭头两方向）、
  `g4`（107：类型续接对照 / 类型别名 ASI / 块级 type alias / 成员 / 块级语句端点）、
  `g5`（55：Lead 转来的 type alias 普通标识符、export ⏎ type、装饰器尾随声明、U+2028/2029）。
  原始读数在 `tmp/cases-g*.report.json`（tmp 不进 git）。
- trace 手段：临时给 `build/ts/.../statement-builder.js` / `source-file-end-possible-shape.js`
  打日志定位「表达式没有读完 / 类型别名声明的类型没有读完」的抛出点（随后由重建覆盖还原）。

## 3. 问题清单（真红 → 现象 → 归类 → 根因）

全部真红的**首要失效都是「终点格算错」**（§6 第 6 类 end compute）；下面按同一套根因归族。

### 族 1：表达式尾是「非调用位」（箭头块体 / `as` / `satisfies`）

| 复现 | 本仓现象 | TS |
|---|---|---|
| `x = () => {}` ⏎ `(y)` | 并成 `CallExpression`（晚 Accept，吞掉下一语句） | 2 条语句 |
| `const f = () => {}` ⏎ `(y)` / `[0]` / `` `t` `` | 同左（`const f = …⏎[0]` 还会 crash「表达式语句没有读完」） | 2 条语句 |
| `x = () => 1` ⏎ `(y)` | 在 `1` 后提前 Accept，箭头体被切断（早 Accept） | 箭头体是 `1(y)`（一条） |
| `x = () => a + b` ⏎ `(y)` / `x = () => ({a:1})` ⏎ `(y)` | 早 Accept / 应续接 | 续接 |
| `{ x = () => {}` ⏎ `(y) }`（块级） | 同左 | 2 条语句 |

**根因**：`expression-statement-possible-shape.xl.md:316 IsAsiBoundary`
1. 条件 2 只问 `CanEndExpressionAt`，闭合的 `{}`（对象字面量 / 箭头块体）不算「能收住表达式」，
   所以 `… => {}` 之后根本没有 ASI 判定机会；
2. `IsNonCallableExpressionTail`（`:506`）用「往回同一括号层找 `=>`」判非调用位：`() => {}` 的
   参数括号 `()` 被当成嵌套深度，`=>` 反而找不到；且它把 **concise body** 也当非调用位
   （`() => 1` 后的 `(y)` 其实可以续接）。

**修法**：条件 2 增加「闭合 `{…}` 括号单元」；`IsNonCallableExpressionTail` 改为
「尾单元是块体 `{…}` 且紧邻 `=>`」才成立；往回扫到 `=>` 不再直接返回（concise body 可续接）。
另外把 `IsAsiBoundary` 的「条件 5（语句起点）」**移到两个确定性早退之前**：否则
`const f = () => {}` ⏎ `(y)` 在 `(` 处终结候选 Accept，而变量语句候选仍活着 →
`CatalogGuide: 终结候选与其它候选同时成立`。`limit?` 形参让块级调用把「语句段首」传进来。

### 族 2：块体里的表达式语句与根级「不同源」

| 复现 | 本仓现象 | TS |
|---|---|---|
| `{ x++` ⏎ `++y }` / `--y` / `!y` / `~y` | crash「表达式没有读完」 | 2 条语句 |
| `{ x++` ⏎ `(y) }` / `[y]` / `` `t` `` | 并成 `CallExpression` / `ElementAccess` / 标签模板 | 2 条语句 |
| `{ x!` ⏎ `++y }` / `{ x as T` ⏎ `(y) }` | crash | 2 条语句（+`x!` 是后缀非空断言） |
| `{ const z = 1; x++` ⏎ `++y }` | crash（上一条语句在前时） | 2 条语句 |
| `function f(){ x++` ⏎ `++y }` / `if/while/for/switch/try/label` 同样 | crash | 2 条语句 |

**根因**：块体走 `StatementBuilder` 的**另一份**判据 `EndsAtLineBreak` / `ContinuesAcrossLine`
（`statement-builder.xl.md:551 BuildExpressionStatement` 旧实现），它把 `++`/`--`/`!`/`~` 都当
「可以续接」、且完全不认 `as`/箭头块的调用位规则；文档说「与根级同源」实际上不是同一份。

**修法**：`BuildExpressionStatement` 的换行边界改成
`EndsAtLineBreak || IsAsiBoundary(units, at, first)`（并集：老判据覆盖 `declare` ⏎ `const` 这类
上下文关键字的 ASI，新判据覆盖后缀 / 非调用位）。`IsAsiBoundary` 的换行判据改为按**源位置**找
`\n` / `\r`：块体 / 体里的 `Units` 不带 trivia 单元（探针实测 `{ x++⏎++y }` 的块数据只有 4 个代码单元），
只扫 trivia 单元会永远判「没有换行」。

### 族 3：`yield` 受限产生式在块级不收口

| 复现 | 本仓现象 | TS |
|---|---|---|
| `function* g(){ yield` ⏎ `(x) }` / `[x]` / `` `t` `` / `/y/` / `!x` / `-x` | crash「表达式没有读完」/ 把 `-x` 并进 yield | `yield` 语句 + 下一语句 |
| `function* g(){ yield/*c*/` ⏎ `(x) }` | 同左（块注释里换行也算行终止符） | 同上 |
| `function* g(){ yield 1` ⏎ `yield* other() }` | crash（`yield 1` 与下一条 yield 并成一条） | 2 条 YieldExpression |

**根因**：`ParseYield`（cover4 已补 [no LineTerminator here]）能造出零操作数 yield，但
`BuildExpressionStatement` 的语句范围仍把下一行 `(x)` 算进来 → 表达式读完有剩余。
块级没有终结候选，没有第二个判据点。

**修法**：`BuildExpressionStatement` 增受限产生式分支：首单元是 `yield` 且与下一个代码单元之间
有换行 ⇒ 语句在 `yield` 处收口。同时 `IsAsiBoundary` 的「语句起点词」守卫对 `yield` 例外
（`yield 1` ⏎ `yield* other()` 的换行是 ASI 边界；yield 候选不在 root 候选表里，不会撞共存）。

### 族 4：`type` alias 的 AsiEnd 太保守 / 太激进

| 复现 | 本仓现象 | TS |
|---|---|---|
| `type T = A` ⏎ `(b)` / `f` / `1` / `-1` / `+B` / `"s"` / `` `t` `` | crash「类型别名声明的类型没有读完」 | TypeAlias + 下一语句 |
| `type T = A` ⏎ `z;`、`export type T = A` ⏎ `z;`（Lead 转来） | 同上（普通标识符开头不收口） | 同上 |
| `type T = A /* c */` ⏎ `(b)`、`// c` ⏎ `(b)`、空行 | 同上 | 同上 |
| `{ type T = A` ⏎ `(b) }`、`function f(){ type T = A` ⏎ `(b) }` | 块级同左 | 同上 |
| `type T = A<B>` ⏎ `(b)`、`type T = A[]` ⏎ `(b)`、`type T = A |` ⏎ `B` ⏎ `(c)` | 同上（`>` / `[]` / 联合尾都不认） | 同上 |

**根因**：`type-alias-declaration-possible-shape.xl.md:283 IsAsiBoundary` 只认「`[` + 语句关键字」
白名单，普通标识符 / `(` / `{` / 字面量 / 前缀运算符都不收口；`CanEndTypeAt`（`:328`）对
`keyof` / `typeof` / `-` 这类「还等操作数」的单元也返回 true。块级 `BuildTypeAliasDeclaration`
（`statement-builder.xl.md:482`）则完全没有 ASI（只找 `;` 或读到段末）。

**修法**：
- `IsAsiBoundary`：`[`/`(`/`{` 括号、字符串 / 正则字面量、能起始表达式的标点、普通关键字 / 标识符
  都收口；只有「只能在类型内部出现的续接词」（`extends` / `is` / `asserts` / `keyof` / `typeof` /
  `readonly` / `unique` / `infer` / `new` / `import` / `in` / `of` / `as` / `satisfies`）与
  类型续接标点（`| & . < > ? : => , = ...`）不收口。
- `CanEndTypeAt`：补「等操作数的类型运算符词」（`keyof` / `typeof` / `readonly` / `unique` / `infer` /
  `new` / `import` / `asserts` / `is` / `extends` / `in` / `of` / `as` / `satisfies`）与前缀运算符
  （`-` `+` `!` `~` `*`）。
- 新助手 `ClosesFunctionTypeParameters`（`:356`）：「`>` 闭合的是函数类型的类型参数表（`= <U>`）」时
  后面那个换行 `(` 是参数表，不是新语句（`type T = <U>` ⏎ `(a: U) => U` 是一条别名）。
- `HasLineBreakBetween`（`:253`）改成按源位置找换行（块级 units 无 trivia）。
- `BuildTypeAliasDeclaration` 用同一套 `HasLineBreakBetween × CanEndTypeAt × IsAsiBoundary` 求 AsiEnd。

### 族 5：export 声明的延续词表把 `type` 当延续（Lead 转来）

| 复现 | 本仓现象 | TS |
|---|---|---|
| `export { a } from "m"` ⏎ `type T = A` | export 吞掉下一行 type alias（少一条 Statement） | 2 条语句 |
| `export * from "m"` ⏎ `type T = A`、`export type { A } from "m"` ⏎ `type T = A` | 同上 | 同上 |

**根因**：`export-declaration-end-possible-shape.xl.md:161 CanEndAt` 的延续词表含 `type`
（import 侧早已剔除）。

**修法**：删掉 `type`（保留 `with` / `assert` / `from` / `as`）。

### 族 6：class 成员不切分时，模板被当成新成员名

| 复现 | 本仓现象 | TS |
|---|---|---|
| `class C { a = 1` ⏎ `` `t` `` }` | 切成两个成员（多 `PropertyDeclaration` + `StringLiteral`） | 一个成员，初始化器是 `1`t``（标签模板） |
| `class C { a = b` ⏎ `` `t` `` }` / `a = 1 + 2` ⏎ `` `t` `` / 后接 `b = 2` | 同上 | 同上 |

**根因**：`types/member-boundary.xl.md:98 LooksLikeMemberStart` 对**所有** `String` 都答「是成员名」；
反引号模板不是合法的成员名，它只能续在上一条初始化器后当标签模板。

**修法**：反引号模板（`StringChar === "`"`）返回 false；引号串仍是成员名（对照组
`class C { a = 1` ⏎ `"s"` }` 保持两成员）。

### 族 7：变量语句 / `return` 操作数的端点

| 复现 | 本仓现象 | TS |
|---|---|---|
| `const a = x++` ⏎ `++y` | 吞成一条（`x++ ++y`）→ crash | 2 条语句 |
| `function f(){ return x++` ⏎ `++y }` | crash「表达式没有读完」 | Return + 下一语句 |
| `const f = () => {}` ⏎ `(y)` / `[0]` | crash（变量候选把 `(y)` 算进初始化器） | 2 条语句 |

**根因**：两处各自用 `EndsAtLineBreak` / `ScanToSemicolon` 的保守表，不认后缀 / 非调用位；
但**不能**直接换成 `IsStatementBoundaryAfterExpression`——那里把 `{` 一律当「接不上」，
会把 `const k = function (): number` ⏎ `{ … }` 的函数体切断（token-ast 实测 7 crash + 1 diff）。

**修法**：新增窄判据 `IsUncontinuableTailBoundary`（`:651`）+ `IsPostfixOperatorAt`（`:708`），
只认「后缀 `++`/`--` 或 `=> {}` / `as` / `satisfies` 之后是调用位」「后缀 `++`/`--`/`!` 之后是
`++`/`--`/`!`/`~`」这两种**确定**收口；`BuildVariableStatement`（`:718`）、
`BuildReturnOrThrow`（`:1184`）、`StatementScanner.ScanToSemicolon`（`:339`）用它，
其余继续走老判据。

## 4. 五个问题的答案

- **正确的应该什么时候 build**：
  - `type`/`export` 声明：结构已完整（`IsCompleteAt` / 类型已完整）× 换行 × 下一个单元接不上 →
    候选自己在**边界前一个代码单元**收口（`AsiEnd`），边界 token 留给下一条语句；
  - 表达式语句 / 变量语句 / `return` 操作数：`;` / 块层末尾 / **确定性边界**（后缀 / 非调用位 /
    受限产生式）；块级与根级读同一份判据（并集），不再各写一套；
  - 根终结候选只在「候选已全灭」（`Candidates == 0`）的格上 Accept，且语句起点是声明词时不 Accept。
- **build 时应该提取哪些信息**：End 只取最后一个**非 trivia 代码单元**（ASI 收口时是边界前那一格），
  `;` 不进表达式只进语句 End；type alias 走 `FromUnits` 的 AsiEnd 分支。
- **什么时候 close**：`;`（老路）/ 行末 ASI 边界 / EOF 三条；块级没有终结候选，由 StatementBuilder
  在边界处切段并各自 `TryToClose`。
- **close 时应该提取哪些信息**：End = 最后一个非 trivia 子单元；跨行换行判断一律按**源位置**
  （块体 units 不带 trivia 单元）；模板 trivia 不算「换行」（模板内部的行终止符属于字面量）。

## 5. 改动文件

| 文件 | 改动 |
|---|---|
| `typescript/tokens/statements/expression-statement-possible-shape.xl.md` | `IsAsiBoundary`：闭合 `{}` 算表达式尾、条件 5 前置、`limit?`、`yield` 例外、换行按源位置；`IsNonCallableExpressionTail` 重写（块体才算非调用位）；`HasLineBreakBefore` 按源位置；新增 `IsUncontinuableTailBoundary` / `IsPostfixOperatorAt`；`IsStatementBoundaryAfterExpression` 保持原口径 |
| `typescript/tokens/statements/statement-builder.xl.md` | `BuildExpressionStatement` 并集边界 + yield 受限产生式；`BuildVariableStatement` / `BuildReturnOrThrow` 接窄判据；`BuildTypeAliasDeclaration` 加 AsiEnd |
| `typescript/tokens/statements/statement-scanner.xl.md` | `ScanToSemicolon` 接窄判据（只加一条 OR，其余不动，减少与其它类别的合并冲突） |
| `typescript/tokens/declarations/type-alias-declaration-possible-shape.xl.md` | `IsAsiBoundary` / `CanEndTypeAt` / `HasLineBreakBetween`；新增 `ClosesFunctionTypeParameters`；ComputeByIndex 的 ASI 条件加函数类型参数表守卫 |
| `typescript/tokens/declarations/export-declaration-end-possible-shape.xl.md` | `CanEndAt` 延续词表删 `type` |
| `typescript/tokens/types/member-boundary.xl.md` | `LooksLikeMemberStart`：反引号模板不是成员名 |
| `typescript/cases/end-compute.ts`（+ 两份快照） | 新增 96 条：E1 非调用位 / E2 块级端点 / E3 yield / E4 type alias / E5 export ⏎ type / E6 类成员模板 / E7 变量与 return，含 base 与对照组 |

未改：`core/**`、`IMPORTANCE.md`、其它类别 case 文件。

## 6. 新增用例（`end-compute` 166 → 262，+96）

按 IMPORTANCE §5 每族先 base 再变体，对照组在后：
E1 非调用位（22 条：箭头块体 / as / 异步箭头 / 块级 / concise body 与括号表达式对照组）；
E2 块级端点（21 条：`++`/`--`/`!`/`~`、调用位、`as`、各种宿主语句）；
E3 yield（12 条：`(` `[` 模板 正则 `!` `-`、注释、`yield*`、两条连排）；
E4 type alias（22 条：普通标识符 / 括号 / 字面量 / 前缀运算 / 注释 / 块级 / 类型内部续接对照组）；
E5 export ⏎ type（8 条）；E6 类成员模板（7 条）；E7 变量 / return（7 条）。

## 7. 遗留 / 需裁定（未进用例，已定位）

1. **`type T = A` ⏎ `return` / `debugger` / `{a:1}` 仍抛「终结候选与其它候选同时成立」**
   （`SourceFileShape`，边界下标 3）：type alias 候选在边界 Accept 时，`return` / `debugger` /
   块语句候选同时起动。属「候选共存」协调（type alias 候选应 Reject 还是根终结候选该让位），
   需要与 possible/end build 侧一起定，不在本轮改。
2. **非 generator 上下文的 `yield`**：`function f(){ yield` ⏎ `(x) }` / `{ yield` ⏎ `(x) }`——TS 把
   `yield` 当标识符、整条是 `CallExpression`；本仓块级受限产生式分支现在会切两句（crash 已消失，
   但仍是 diff）。要修得先让块级知道「是否在 generator 体内」（`ExpressionBuilder.IsInsideGeneratorBody`
   是实例方法，StatementBuilder 拿不到）。归「上下文关键字」类别。
3. **顶层 `return`**：`return` ⏎ `x` / `return /* c */` ⏎ `x` 在文件根本层 crash「语句没有读完」
   （TS parseDiagnostics=0，但 `return` 在函数外是语义错误；AST 是 ReturnStatement + ExpressionStatement）。
   顶层没有块级语句扫描，属根级受限产生式，暂缓。
4. **`await` ⏎ `x`**：TS 在非 async 上下文把 `await` 当标识符（`ExpressionStatement(await)` + `Identifier`），
   本仓造 `AwaitExpression`；属上下文关键字（可能 compute）类别，不属 end compute。
5. **装饰器尾随声明在无体函数声明之后**（Lead 转来，经 possible-build 交叉验证的精确归因）：
   形态 `declare function gf(): void` ⏎ `@dec class C {}`、`function f(): void` ⏎ `@dec class C {}` 等
   **18 条**（TS parseDiagnostics 全 0；探针读数 ok=2 / crash=6 / diff=10）。
   红 16 条的 AST 表现：函数多一个 `Block`，下一条 Class/Interface/Enum/Namespace/TypeAlias 消失或位置差
   （`Identifier -2 / ClassDeclaration -1 / Decorator -1 / Block +1`）。
   - **首要半边（本类别，未做）**：`@` 为首的声明不被当作「下一条语句起点」，
     `FunctionDeclarationPossibleShape` 到 EOF 才收口，交给 `BuildByIndex` 的 code 段把下一条声明包进来。
     修法方向：边界判据里把 `@`（装饰器前缀）开始的声明识别为新语句起点，与 end-build 已合入主仓的
     `LeadingDeclarationKeyword`（`source-file-end-possible-shape`）保持同一口径。
     **本分支（基点 `5362a38`）没有该助手**，且本轮已改 `statement-scanner`（与 missing-end 分支
     同文件），再动 `source-file-end-possible-shape` 会与 end-build 的合入冲突；按 Lead 指示
     本轮只为它留位、不牺牲 ASI/type-alias 主项。位置：
     `function-declaration-possible-shape.xl.md:186-212 (Stage 3)`、`:213-273 (Stage 4)`
     （两处 ASI Reject 只认 `IsStatementWord`，`@` 是 Symbol 不走）。
   - **次要半边（不要做，属 possible-build，已冻结）**：
     `function-declaration-shape.xl.md:169 (bodyIsLast)`、`:199-211 (tailIndex 回退后未重判 body)`，
     记为下一批遗留。
6. **U+2028 / U+2029 不是换行断句点**（Lead 转来）：本分支（基点 `5362a38`）的 basic token 还没有
   主仓已合入的「LS/PS 归 trivia」修复，`function f(){ return\u20281; }` 在本分支的失败原因首先是
   U+2028 根本不是 trivia（token 流就不同），**在合并 basic-token 修复前无法在本分支验证换行判据**；
   按 Lead 要求不提交别人的修复、不入用例。待合并后需把
   `expression-statement-possible-shape.HasLineBreak` / `HasLineBreakBefore`（已按源位置，天然覆盖）、
   `statement-builder.HasLineBreakAfter`、`function-declaration-possible-shape.LineBreakBefore` /
   `NoNewlineBefore`、`expression-builder.ParseYield` / `IsInsideGeneratorBody`、`statement-scanner`、
   `member-boundary.HasLineBreakBetween`、`typescript-template` 的行终止符判据统一到一个
   「ECMAScript LineTerminator（`\n` `\r` `\u2028` `\u2029`）」助手上。
7. **块级 `type` alias 的 `;` 后 trivia / 多段**：本轮的 `BuildTypeAliasDeclaration` 只处理
   AsiEnd 与段末，块级 units 实测不带 trivia；若将来块数据带 trivia，需要再核 `this.At` 的推进。
8. **`IsStatementBoundaryAfterExpression`** 仍是老口径（export = / export default 在用），
   本轮没有把窄判据并进去——两处职责不同（一个「结构完整的声明后」，一个「表达式尾」），
   若要统一需同时核 export 两个候选，属下一轮。

## 8. 构建 / 复现

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set\cover5-end-compute
# 1) 改 *.xl.md 后重建（只给改过的文件，xl 自动带依赖）
#    xl_build(cwd=..., paths=[改过的 .xl.md], targets=["ts"], out="dist")
.\node_modules\.bin\tsc.cmd -p tsconfig.json
node typescript/cases/ast-json.mjs
node typescript/cases/ast-json-diff.mjs
node typescript/cases/token-ast.mjs --quiet
node typescript/cases/real-dts-ast.mjs
```

`xl_build` 摘要：0 error（仅既有 W3102/W3103 文档类 warning 与 3 个既有 E2004 孤儿产物 warning）。
