# statements 分区笔记

> 分区：`statements`（expression statement、block/empty、if、for/for-in/for-of/foreach、while/do-while、
> switch、try/catch/finally、return/throw/break/continue、labeled、debugger、ASI 语句边界、语句位置歧义）。
> 只写 `cases/{throw,atomic,partial,incremental}/statements/`；判定口径与目录约定见 [README.md](../README.md)。
> 判定器与口径**只读**，未做任何修改。

## 1. 计数与验收

| 分类 | 条数 |
| --- | --- |
| throw | 9 |
| atomic | 65 |
| partial | 3 |
| incremental | 3 |
| 合计 | **80** |

```powershell
node typescript/cases/tts/run.mjs --filter statements
# [tts] 80 条 case：throw 期望 9 / 实测 9 · atomic 期望 65 / 实测 65 · partial 期望 3 / 实测 3 · incremental 期望 3 / 实测 3
# [tts] PASS 80 / FAIL 0 / 80
```

- 80 条逐条实测 = 目录标注，全部 PASS；`tsValid` 全为 `true`（runner 已强制 TS 语法体检）；
  除下面 4.3 的一条 `residualBasicLines = +1` 外，其余 `residualBasicLines` 全为 0。
- 全部 case：LF、以换行结尾、无注释、一文件一个构造。
- atomic case 内没有嵌「`let x = 数字` / `let x = … * +`」这类已支持形态（否则内层增量会把分类带偏）。
  仅有的两处声明语句是**实测 atomic** 的路由例外（`for-head-let-atomic.ts`、`switch-case-let-atomic.ts`），见 2.3。

## 2. 结论先行：statements 区的增量边界

`StatementRouteUtil.EnableIncrementalVariableShapes` 只挂在**变量语句**这一条语句产生式上
（`VariableStatementPossibleShape.BuildByIndex`），所以 statements 区的结论可以压成四条：

### 2.1 控制流 / 表达式语句全部 atomic

`if`/`for`/`for-in`/`for-of`/`while`/`do-while`/`switch`/`try`/`block`/`empty`/`labeled`/`debugger`/
`return`/`throw`/`break`/`continue` 以及各种 expression statement，两遍逐字符树的 shape 节点
首次出现步号完全相同 —— 开关对它们没有任何影响，整条语句收口时原子建树。

### 2.2 宿主语句不改变分类，只改变「能不能走到」

同一形态塞进不同宿主语句，分类不变：

- 嵌套在 if/while/for/do/try/label/函数体里的 `let` 声明，一律在**外层语句的收口符**（`}` / `;`）上
  撞到 C10 显式拒绝 → throw（9 条 throw case 即这条结论的矩阵，见 3）；
- 裸变量语句（语句 = VariableStatement）放在文件根层、以 EOF/换行收口，才可能走到 incremental/partial。
- **不存在「因为外面套了 if/while 所以变成 partial/incremental」的形态**：块体里的声明语句要么 throw，
  要么根本不进增量路由（见 2.3）。

### 2.3 两条语句路由例外（实测 atomic，已收 case）

- `for (let i = 0; i < 3; i++) { }` —— for 头里的 `let` 不经过 `VariableStatementPossibleShape`
  ⇒ **atomic**（对照 `incremental/controls` 里同形态的裸声明是 incremental）。
- `switch (a) { case 1: let y = 1; }` —— case 子句里的声明语句由 case-clause 的原子建造负责，
  即使写成分号收口也**不抛错**，实测 **atomic**（同一写法放进 block 里必 throw）。

也就是说：**语句位置不产生新的增量支持，只决定增量路由是否被触发**。

### 2.4 partial / incremental 在本区只能是「裸变量语句」

因为只有变量语句走增量路径，本区的 partial/incremental 正对照只能以裸变量语句出现在语句边界上：

| case | 源码 | 分类 | 说明 |
| --- | --- | --- | --- |
| `partial/statements/let-identifier-init.ts` | `let x = a` | partial | 骨架（三层 + 绑定名）提前，初始化器仍是原子建树 |
| `partial/statements/const-identifier-init.ts` | `const x = a` | partial | 同上，`const` 同路由 |
| `partial/statements/let-continuation-identifier.ts` | `let x = a`⏎`+ b` | partial | 跨行续接：换行不断句，骨架提前、初始化器原子 |
| `incremental/statements/let-number-statement.ts` | `let x = 1` | incremental | 语句级正对照基线 |
| `incremental/statements/let-newline-before-init.ts` | `let x =`⏎`1` | incremental | `=` 后换行不断句，数字形状照样逐字符长出 |
| `incremental/statements/let-continuation-number.ts` | `let x = 1`⏎`+ 2` | incremental | 跨行续接的二元表达式增量（`BinaryExpressionShape`/`PlusTokenShape` 提前出现） |

> 声明级矩阵（分号/类型注解/解构/多声明/各类初始化器）属于 `declarations` 区，已在其 notes 覆盖；
> 本区这 6 条只锚定「语句位置 / 语句边界（EOF、换行、跨行续接）」上的同一批结论，与
> `incremental/controls` 的 5 条基准**不是同一批样本**（controls 是 area=controls 的口径基准）。

## 3. throw 文案样本（9 条）

九条 throw 分别落在不同宿主语句 / 不同未支持点上，文案只由**失败点**决定，与宿主语句无关
（例如 `}` 这条文案在 while / function 两个宿主上完全一致）：

| case | 源码 | 增量模式抛出的文案 |
| --- | --- | --- |
| `throw/statements/if-block-let-semicolon.ts` | `if (a) { let y = 1; }` | `增量变量形状未支持：declaration 符号 ;` |
| `throw/statements/while-block-let-close-brace.ts` | `while (a) { let y = 1 }` | `增量变量形状未支持：declaration 符号 }` |
| `throw/statements/function-body-let-close-brace.ts` | `function f() { let y = 1 }` | `增量变量形状未支持：declaration 符号 }` |
| `throw/statements/try-block-let-type-annotation.ts` | `try { let y: number = 1 } catch { }` | `增量变量形状未支持：declaration 符号 :` |
| `throw/statements/if-block-let-destructuring.ts` | `if (a) { let { a } = o }` | `增量变量形状未支持：declaration 解构绑定` |
| `throw/statements/label-block-let-unary-init.ts` | `l: { let y = -1 }` | `增量变量形状未支持：expression 运算符 -` |
| `throw/statements/do-while-let-call-init.ts` | `do { let y = f() } while (a)` | `增量变量形状未支持：declaration 括号` |
| `throw/statements/if-block-let-member-init.ts` | `if (a) { let y = b.c }` | `增量变量形状未支持：declaration 符号 .` |
| `throw/statements/asi-two-declarations.ts` | `let x = a`⏎`b`（ASI 断句成两条语句） | `增量变量形状未支持：declaration 初始化器未读完` |

补充口径：

- 「`;` / `}` 收口」这一条是**结构性**的：只要增量声明语句出现在块体/函数体里，外层收口符就必然撞上
  `VariableDeclarationEndPossibleShape` 的 C10 拒绝分支，所以「合法 TS 里的嵌套 `let`」基本全是 throw；
- 该 throw 与「初始化器是否受支持」无关：`if (a) { let y = 1; }` 里 `1` 本来是受支持的初始化器，
  仍然 throw（失败点是 `;`），这正是「全有或全无」的直接体现。

## 4. divergent / invalid / 残留 basic 观察（未收 case）

### 4.1 divergent：增量声明之后只要还有第二条语句，增量 EOF 树会丢掉后续语句

最小复现（三条都实测 divergent，**因此按纪律未收进 case**）：

```text
let x = 1⏎let y = 2        → divergent（丢掉第二条 VariableStatement）
let x = 1⏎debugger         → divergent（丢掉 DebuggerStatement）
let x = 1⏎let y = a        → divergent（丢掉第二条 VariableStatement）
```

`--show` 的 diff 形态固定：legacy 的 EOF 树里第二条语句的 `VariableStatementShape` / `DebuggerStatementShape`
及其子树齐全，incremental 对应行是 `undefined` —— 即**增量路径只把第一条语句挂成根的孩子，
后续语句没有回到根上**。这是实现缺陷（不属于「覆盖边界」），按 README 的规则只能记录、不能收 case；
建议 Lead 归于「增量实现缺陷」清单，和 README 已列的两条并列。

另外两条同源、但以 throw 收场而不是 divergent（可以收）：

```text
let x = a⏎let y = b    → throw：declaration 初始化器未读完
let x = a⏎b            → throw：declaration 初始化器未读完（已收 throw/statements/asi-two-declarations.ts）
```

（两条 partial 骨架声明连写时，第二条的初始化器会并进第一条的 `Data`，`ExpressionBuilder` 读不完整 ⇒ 抛错。）

### 4.2 invalid：无

本区没有任何候选出现 `legacy 解析即抛错`；所有形态 legacy 正常，两种模式的 EOF 树除 4.1 外结构一致。
TS 语法体检：80 条全部合法（含 `with (o) { }`、顶层 `await f();`、`let = 1;`、`{ a: 1 }` 这类
容易踩语法的形态，均无 parse diagnostic）。

### 4.3 残留 basic 行（README 已知缺陷 1 的新触发点）

`incremental/statements/let-continuation-number.ts`（`let x = 1`⏎`+ 2`）：
`residualBasicLines = +1` —— 残留的是 `+` 前面的**换行 WrapSymbol**（README 缺陷 1 说的是 `2 * 3`
里的空格 WrapSymbol；本例说明该残留对「运算符前的换行 trivia」同样成立）。
不改变分类（判据忽略 basic 行），已按 INDEX 备注口径记录。

### 4.4 顺带确认的「不是缺口」形态

- `for await (const v of xs) { }`、`for (const v of xs) { }`、`for ({ ... } of xs)` 这类 head 声明：
  atomic（for 头不路由）；
- `switch` 的 case/default/fallthrough/多 case、`try` 的 catch 无绑定、`do-while` 的无括号体：
  均 atomic，无独立观察价值，收在 5.1 的清单里（未为每个变体单独开 case，避免同义堆量）。

## 5. 覆盖清单（构造 → 分类）

### 5.1 atomic（65）

| 语法族 | 构造 | case |
| --- | --- | --- |
| expression statement | 算术 `+` / 比较 `<` / 逻辑 `&&` / 位运算 `\|` | `expr-binary-{arithmetic,comparison,logical,bitwise}.ts` |
| expression statement | 赋值 / 三元 / 逗号 / 一元 `!` / 后缀更新 | `expr-{assign,ternary,comma,unary,update-postfix}.ts` |
| expression statement | await / yield（在 generator 里） | `expr-{await,yield}.ts` |
| expression statement | 箭头 / 函数表达式 / 类表达式 | `expr-{arrow,function-expr,class-expr}.ts` |
| expression statement | new / call / member / index | `expr-{new,call,member,index}.ts` |
| expression statement | 可选链 / 非空 / spread / 模板 / regex / 字面量 | `expr-{optional-chain,nonnull,spread-array,template,regex,literal}.ts` |
| block / empty | 空块 / 语句块 / 空语句 `;` | `block-{empty,statements}.ts`、`empty-statement.ts` |
| if | 无花括号 / else 块 / else-if 链 | `if-{no-block,else-block,else-if-chain}.ts` |
| for（经典三段） | 全缺省 / 完整三段 / 头部 `let`（路由例外） | `for-{empty-clauses,classic,head-let-atomic}.ts` |
| for-in / for-of | `k in o` / `v of xs` / `const v of xs` | `for-{in,of,of-const}.ts` |
| foreach | `xs.forEach((v) => f(v));` | `foreach-call.ts` |
| while / do-while | 块体 / 无花括号体 / do-while | `while-{block,no-block}.ts`、`do-while.ts` |
| switch | 单 case / fallthrough + 多 case + default / case 内声明（路由例外） | `switch-{single-case,fallthrough,case-let-atomic}.ts` |
| try | catch（有绑定 / 无绑定）/ finally | `try-{catch,catch-nobind,finally}.ts` |
| return / throw | 带值 / 不带值 / `throw new Error("x")` | `return-{value,no-value}.ts`、`throw-new.ts` |
| break / continue | 裸 / 带 label | `break.ts`、`continue.ts`、`break-label.ts` |
| labeled | label + 块 / 嵌套 label | `label-{block,nested}.ts` |
| debugger | `debugger;` | `debugger.ts` |
| ASI | 同行两条 / 换行分句 / return 换行 / 后缀 `++` 换行 | `asi-{same-line,newline,return-newline,postfix-newline}.ts` |
| 语句位置歧义 | 语句首对象字面量（带 / 不带括号）/ 语句首数组字面量 | `stmt-{object-literal-paren,object-vs-block,array-literal-start}.ts` |
| 语句位置歧义 | `let` 作标识符 / async 函数声明 / `with` 语句 | `stmt-{let-as-identifier,async-function,with}.ts` |

### 5.2 throw（9）

见第 3 节表格；覆盖的宿主语句：if / while / do-while / function / try / label / 根层 ASI 序列，
覆盖的失败点：`;`、`}`、`:`、`.`、`(`、解构绑定、非 `*`/`+` 运算符、初始化器未读完。

### 5.3 partial（3）/ incremental（3）

见 2.4 表格。

## 6. 与其它分区的边界

- **declarations**：变量声明族的矩阵（分号、类型注解、`!`、多声明、解构、各初始化器）在该区；
  本区的 3 条 partial / 3 条 incremental 只作为「语句位置 / 语句边界」的锚点，**有意与 controls 的
  基准样本错开**（`=` 后换行、跨行 `+ 2` 续接是 declarations/controls 都没有的写法）。
- **lexical**：`with` 语句属于语句族，因此 `stmt-with.ts` 放在本区（不是 lexical 的 token 形态）。
- **expressions**：表达式语句（`a + b;` 这种 statement 形态）在本区；纯表达式建树边界在 expressions 区。
- **controls**：`cases/incremental/controls/` 不属于任何 area 子目录，本区未改动它。

## 7. 复算

```powershell
# 本区全量判定（目录名 = 期望分类）
node typescript/cases/tts/run.mjs --filter statements

# 单条证据（分类依据 / throw 文案 / 提前的 shape 节点）
node typescript/cases/tts/run.mjs --show throw/statements/if-block-let-semicolon
node typescript/cases/tts/run.mjs --show incremental/statements/let-continuation-number

# 逐字符 AST（atomic：形状在语句收口时一次出现；incremental：形状逐字符长出）
node build/ts/cjcli.js typescript/cases/tts/cases/atomic/statements/expr-binary-logical.ts
node build/ts/cjcli.js typescript/cases/tts/cases/incremental/statements/let-number-statement.ts
```

> 注：`--filter statements` 只命中 `*/statements/` 路径，不会命中其它分区的 case。
> 判定器本轮更新后 identity 用 `(类名, pos)`、EOF 树比较忽略 src 区间，本区结论按新口径复验通过。
