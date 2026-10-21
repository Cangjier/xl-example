# expressions + types 两个目录的 AST 崩溃归因（47 份）

本文件只读分析，不改任何 `.xl.md`、不改语料、不改 `core/**`。回答两件事：
**`tests/cases/token/expressions/**`（31 份）与 `tests/cases/token/types/**`（16 份）里的 47 份崩溃，
按根因并成几组、每组落在 IMPORTANCE §6 的七类里的哪一类、根在 `typescript/**/*.xl.md` 的哪个方法**，
以及按「何时 build / build 提什么 / 何时 close / close 提什么」的修法。diff 行不在本文范围。

## 1. 基线读数

在分支 `cover-token-an-type`（克隆 `C:\Users\Admin\Documents\GitHub\xl-example-set\cover-token-an-type`）上：

```text
xl_build paths=["core","typescript"]  → 859 written, 0 error(s)（2444 条 W3102/W3103 既有噪音）
node node_modules/typescript/bin/tsc  → exit 0
node tmp/probe47.mjs                  → 47 / 47 全部复现崩溃（消息与 Lead 的 token-ast-baseline.json 逐条一致）
```

探针口径：`SourceFileRunner.Parse(src, "a.ts")`，取 `e.Message / e.InnerException` 链的首条消息；
另外对每份文件做了「最小崩溃前缀」定位（逐行加入、第一次抛错的行号）与「单行独立解析」两栏读数，
见 `tmp/probe47.json`。**下面每一组的复现片段都是在克隆里实际跑过的读数**，改前读数即崩溃消息。

47 份按 Lead 基线消息分布（与实测一致）：

| 消息 | 份数 | 消息 | 份数 |
| --- | --- | --- | --- |
| 表达式没有读完 | 9 | 类型别名声明的类型没有读完 | 2 |
| 尖括号断言/泛型箭头缺少配对的 > | 7 | 类型别名声明不完整 | 2 |
| 泛型实参缺少 > | 5 | 表达式语句没有读完 | 2 |
| 变量声明里有无法识别的单元 | 5 | 函数表达式缺少参数括号 | 2 |
| 类型注解没有读完 | 2 | computed 成员名没有读完 | 2 |
| 不支持的类型起点 | 2 | 表达式意外结束 / 括号内没有类型 / 不支持的表达式起点 /
对象字面量成员缺少函数体 / 调用签名缺少返回类型 / mapped type 没有读完 / 类成员之间缺少分隔符 | 各 1 |

## 2. 归组总览（12 组，47/47 有归属）

| 组 | 根因一句话 | 份数 | §6 主类（次类） |
| --- | --- | --- | --- |
| **G1a** | 变量声明/初始化器的**范围切分把 `<…>` 里的 `,` 当声明分隔符** | 15 | possible build 不对（end compute 不对） |
| **G1b** | **无分号（ASI）边界缺失**：范围一路吞到下一行/下一语句 | 6 | end compute 不对（end build / possible build 不对） |
| **G2** | `>>` 合符号在表达式侧没有拆（`MatchAngleClose` 直接放弃） | 1 | possible build 不对（basic token 场景，见 §4） |
| **G3** | 表达式层没有 `async function` / `async (…):T =>` 形态 | 3 | possible build 不对（缺少 possible） |
| **G4** | 类型位尾随 `!`（JSDocNonNullableType）没人承接 | 3 | possible build 不对（缺少 possible） |
| **G5** | type-builder 语法缺口：无返回类型调用签名 / mapped 值后成员 / 未具名可选元组 / 箭头返回函数类型 | 5 | possible build 不对 |
| **G6** | 类体成员切分与成员名判据：`[k: T]` 落到 computed 名、嵌套泛型把成员切开 | 3 | 缺少 possible（possible compute / build 不对） |
| **G7** | 表达式层零散形态缺口：`{ new(…) }` / `await;` / `a<b> as T` / `a.class` 换行块 | 4 | possible build 不对（2）／possible compute 不对（2） |
| **G8** | **basic token**：控制头之后以 `/` 开头，`/` 没判成 RegexToken | 1 | basic token 存在问题（交用户决定） |
| **G9** | `let d!: T` 的 definite assignment `!` 没进变量声明 | 1 | possible build 不对（缺少 possible） |
| **G11** | 函数表达式前缀：`function*` / `function<T>` 没被跳过 | 2 | possible build 不对 |
| **G10** | 待确认（语句边界错位 / lambda 范围），机制已收敛到具体 throw 点 | 3 | 待确认 |

> 说明：47 份崩溃**全部由 build 期 builder 抛错**（`StatementBuilder` / `ExpressionBuilder` / `TypeBuilder` /
> `ClassDeclarationShape.BuildMembers` / `TypeAliasDeclarationShape.FromUnits`）。按 §6 的口径，抛错点本身不是根因：
> 根因在**上游把哪些单元交给 build、以及 build 的边界在哪**（possible build / end compute），
> 少数在**候选本身就不该存在**（缺少 possible / possible compute）。

## 3. 逐组证据链

### G1a 泛型 `,` 被当成声明分隔符（15 份，最大组）

**症状**（改前 → 对照，均为克隆实测）：

```text
"const f = <T,>(x: T) => x;"              → CRASH 尖括号断言/泛型箭头缺少配对的 >
"const f = <T,U>(x: T) => x;"             → CRASH 尖括号断言/泛型箭头缺少配对的 >
"const f = <T>(x: T, y: U) => x;"         → OK   （形参表里的逗号无损）
"const x = 1 as Foo<A>;"                  → OK
"const x = 1 as Foo<A, B>;"               → CRASH 泛型实参缺少 >
const e = new Map<string, number>();      → CRASH 变量声明里有无法识别的单元
const a = f<A, B>`t`;                     → CRASH 变量声明里有无法识别的单元
```

**根因**：`typescript/tokens/statements/statement-builder.xl.md` 的
`BuildVariableDeclarationList`（:490）在 build 期自己重扫声明范围，两处扫描都是「顶层 `,`/`=`/`;`」判据，
**不数 `<`/`>` 深度**：

- 类型注解扫描 :525-547 —— `while (… != "=" && != ",")` 找注解终点（:528）；
- 初始化器扫描 :548-575 —— `while (… != ",")` 找初始化器终点（:565-567）；
- 于是 `const f = <T,>…` 的初始化器只拿到 `<T`，`const x = 1 as Foo<A, B>` 只拿到 `1 as Foo<A`，
  `new Map<string, number>()` 只拿到 `new Map<string`。
- 下游必然崩：`<T` 交给 `ExpressionBuilder.ParseAngleStart`（`expression-builder.xl.md:1802`）→
  `MatchAngleClose`（:1731）找不到配对 `>` → :1812 抛「尖括号断言/泛型箭头缺少配对的 >」；
  `Record<string` 交给 `TypeBuilder.ParseTypeArguments`（`type-builder.xl.md:1649`）→ 读到单元尾 :1665 抛
  「泛型实参缺少 >」；剩下的 `>` / `U>(x)` 留在声明层 → :582 抛「变量声明里有无法识别的单元」。

**代表性文件**（全部 15 份见清单）：

1. `expressions/expr-arrow-generic.ts` —— `const g = <T,>(x: T) => x;`（崩溃前缀第 4 行）
2. `expressions/gap-r907-arrow-generic-comment-before-close.ts` —— `<T,/*c*/>(a: T) => a`
3. `expressions/gap-r907-arrow-generic-newline-before-comma.ts` —— `<T` 换行 `,>(a: T) => a`
4. `expressions/expr-as-then-value-operator.ts` —— `const indexed = a as Record<string, number>;`（第 22 行）
5. `expressions/expr-satisfies-object.ts` —— `{ a: 1 } satisfies Record<string, number>`
6. `types/type-param-const-comma.ts` —— `const f = <const T,>(x: T) => x`

**完整清单（15）**：
`expressions/expr-arrow-generic.ts`、`expressions/expr-generic-arrow-return-newline.ts`、
`expressions/expr-as-then-value-operator.ts`、`expressions/expr-satisfies-object.ts`、
`expressions/gap-r907-arrow-generic-comment-before-close.ts`、
`expressions/gap-r907-arrow-generic-newline-before-comma.ts`、
`expressions/gap-r922-satisfies-trailing-comment.ts`、`expressions/expr-generic-call-newline-before-comma.ts`、
`expressions/expr-inst-tagged.ts`、`expressions/gap-r977-inst-tagged-two-args.ts`、
`expressions/gap-r979-new-inst-tagged.ts`、`types/ty-satisfies.ts`、`types/type-generic-signature.ts`、
`types/type-op-satisfies.ts`、`types/type-param-const-comma.ts`

**§6 归类：possible build 不对**（build 拿到的是被切碎的单元集；次类 **end compute 不对**——声明收口没有把 `<…>` 当一个整体）。

**用户五问（本组）**：
- 什么时候 build：仍应在顶层 `;`（或 ASI 收口）那一格 build；**在 build 之前不得按裸 `,` 切声明**。
- build 时提取哪些信息：只提取「这条声明覆盖到哪个顶层单元」；`<`/`>` 深度是这一层的必要信息。
- 什么时候 close：同组维持现状，close 在 `;` 之后；不需要新增 close 时机。
- close 时提取哪些信息：声明末尾单元（`;` 或 ASI 断点）与整条声明的 `SourceRange`。

**修复建议**：`typescript/` 层可解。`BuildVariableDeclarationList` 两处扫描加 `<`/`>` 深度（或复用
`TypeBuilder.ParseTypeArguments` 的配对扫描 / `expression-builder.CanStartTypeArguments` 的判据），深度 >0 时不认 `,` 与 `=`。

---

### G1b 无分号 / ASI 边界缺失（6 份）

**症状**：

```text
"type B = number" 换行 "export type { B }"            → CRASH 类型别名声明不完整
"declare const a: any" 换行 "declare type K = \"k\"" 换行 "type A = typeof a.b[K];"
                                                      → CRASH 类型注解没有读完
"declare const o: { m: (...args: any[]) => any }" 换行 "o.m /* ( */ ()"
                                                      → CRASH 类型注解没有读完
const r = /ab+c/gi 换行 if (/x/.test(s)) { … }         → CRASH 表达式没有读完
f(...args) / const a = [1, ...xs] 后接 new A(...args)  → CRASH 表达式没有读完（前缀行定位在 new A(...args)）
```

对照：同一构造**带上分号**时全部 OK（`type T = number;`、`const r = /ab+c/gi;`、`/x/.test(s)` 单行 OK）。

**根因（两条互补路径，同一类问题）**：

1. **范围扫描不认行尾**：`statement-builder.xl.md:528`（类型注解终点）与 :565-567（初始化器终点）
   只认 `=` / `,`，没有「行尾即 ASI 断点」的判据，于是 `declare const o: {…}` 的注解把下一行
   `o.m /* ( */ ()` 一起吞进 `typeUnits`，`TypeBuilder` 读完 `{…}` 后剩单元 → :542 抛「类型注解没有读完」；
   初始化器同理把下一行吞进来 → :173 抛「表达式没有读完」。
2. **类型别名按 `;` 收口、但收口时可以没有 `;`**：`type B = number` 换行后下一行是
   `export type { B }`，终结候选在换行处把别名收口，`TypeAliasDeclarationShape.FromUnits`
   （`type-alias-declaration-shape.xl.md:82`）拿到的 `code` 只有 `type/B/=/number` 四格，
   :93 `if (code.length < 5) throw "类型别名声明不完整"` 当场抛（这份文件从此整份投不出来）。
   `FromUnits` 的方法注释 :84 写的是「`tokenIndex` 必须落在 `;` 上」，说明它默认「有分号」；
   `type-alias-declaration-possible-shape.xl.md:140` 的 `IsBuildable` 也只在 `;` 格为真——
   两者之间的契约被 ASI 收口打破。

**代表性文件**：

1. `types/ty-export-type.ts` / `types/type-export-type.ts` —— `type B = number` 无分号 + `export type { B }`
2. `expressions/ex-call-comment-before-args.ts` —— `declare const o: {…}` 无分号 + `o.m /* ( */ ()`
3. `types/type-typeof-qualified-index.ts` —— `declare const a: any` / `declare type K = "k"` 都无分号
4. `expressions/ex-regex.ts`、`expressions/ex-spread.ts` —— 无分号语句后接下一语句

**完整清单（6）**：`expressions/ex-call-comment-before-args.ts`、`expressions/ex-regex.ts`、
`expressions/ex-spread.ts`、`types/ty-export-type.ts`、`types/type-export-type.ts`、
`types/type-typeof-qualified-index.ts`

**§6 归类：end compute 不对**（终结候选/语句收口没有 ASI 判据）＋ **end build 不对**
（收口后 `FromUnits` 仍按「必须以 `;` 结尾」提取字段）。次类 possible build 不对。

**用户五问（本组）**：
- 什么时候 build：只在**边界单元确定**时 build —— `;`，或「行尾 + 下一单元不能续接当前语句」的 ASI 断点。
- build 时提取哪些信息：本条语句的**首单元与尾单元**（含尾单元是否 `;`），以及尾单元之后一格的内容（判续接）。
- 什么时候 close：与 build 同一格 close；close 不得把下一语句的首单元算进范围。
- close 时提取哪些信息：`SourceRange` 的尾（`;` 含入 / ASI 不含下一行 trivia 之后的内容）、
  `Last()` 不取到下一语句；类型别名要能记「无 `;` 收口」这一事实。

**修复建议**：`typescript/` 层可解，两处：① `statement-builder` 两处扫描加「行尾」判据；
② `TypeAliasDeclarationShape.FromUnits` 放宽 :93/:107 的长度门槛与 :137 的「必须 `;`」——`tokenIndex` 不是 `;` 时
按「末单元即类型尾」处理，或让 `IsBuildable` 只在 `;` 格 build、ASI 走终结候选的另一条 build 路径。

---

### G2 `>>` 合符号在表达式侧没有拆（1 份）

**症状**：

```text
"const d = <Array<number>>y"   → CRASH 尖括号断言/泛型箭头缺少配对的 >
"const d = <Array<number> >y"  → OK
```

**根因**：`expression-builder.xl.md` 的 `MatchAngleClose`（:1731）在扫到 `>>` / `>>>` 时直接
`return -1`（:1759-1761，注释口径是「拆 `>>` 需要 basic token 决策」），于是 `ParseAngleStart`（:1802）
在 :1812 抛错；`CanStartTypeArgumentCall` :483 也写明「`>>` 这种组合符号直接判否（拆 `>>` 需要 basic token 决策）」。
对照：types 侧已经有 `type-builder.xl.md:1717 IsSplitClose` 在做同类拆分（`ParseTypeParameterList`/`ParseTypeArguments` 走它），
所以**同一份 basic token 数据在类型位能拆、在表达式位不拆**。

**代表性文件**：`expressions/ex-angle-cast.ts`（唯一一份，但它是 `>>` 族的代表形态；`Map<string, Array<T>>` 这类
在 G1a 组里以「截断」形式出现）。

**§6 归类：possible build 不对**（次类 **basic token 场景**：`>>`/`>>>` 是否在 basic token 层拆，见 §4「交用户决定」）。

**用户五问（本组）**：
- 什么时候 build：配对扫描阶段（possible 的 `ComputeByIndex`）就应把 `>>` 视为两格 `>`，不必等到 build。
- build 时提取哪些信息：角度嵌套深度与「合符号里有几个 `>`」。
- 什么时候 close：不变。
- close 时提取哪些信息：不变。

**修复建议**：`typescript/` 层可解——表达式侧复用 `IsSplitClose` 的判定；若决定在 basic token 层拆 `>>`，
则属于 core 的改动 → **需用户决定**（见 §4）。

---

### G3 表达式层没有 `async function` / `async (…): T =>` 形态（3 份）

**症状**：

```text
"const f = async function () {};"              → CRASH 表达式没有读完
"const f = async (): Promise<void> => {};"     → CRASH 表达式没有读完
"const f = async () => {};"                    → OK
"const f = async/*c*/(): Promise<void> => {};" → CRASH 表达式没有读完
```

**根因**：`statement-builder.xl.md` 的 `BuildExpressionRange`（:157）把初始化器整段交给
`ExpressionBuilder.ParseExpression`（:323），后者对 `async` 只按普通标识符起头：

- `expression-builder.xl.md:1571 ParseFunctionExpression` 只在 `function` 之后认名字/`(`，
  没有 `async` 前缀分支，也没有 `*` / `<T>` 跳过（见 G11）；
- `expression-builder.xl.md:1405 ParseArrowFromBracket` 的调用方没有一处从 `async` 前缀进入
  （`async` 被 `ParsePrimary` 读成 Identifier，后面 `()` / `: T` / `=>` 留在外面）；
- 于是 `+` 残留单元 → `BuildExpressionRange` :173 抛「表达式没有读完」。

**代表性文件**：
`expressions/expr-func-expr-async.ts`（`async function () {}`）、
`expressions/expr-async-arrow-adjacent-comment.ts`（`async/*c*/()`）、
`expressions/expr-async-arrow-return-newline.ts`（`async ():` 换行 `Promise<void> => {}`）

**完整清单（3）**：以上 3 份。

**§6 归类：possible build 不对**（次类 **缺少 possible**：表达式层没有对应「async 前缀」的形态；
`expr-async-arrow-return-newline` 里 `Statement.IsValueArrowReturnColon` 只认「`)` 左边是 `=`/`async`」的判据
（见用例注释）也参与，属于同一族）。

**用户五问（本组）**：
- 什么时候 build：语句收口后（`;`/ASI）一次 build。
- build 时提取哪些信息：`async` 修饰词要与后面的 `function`/`(` 绑定成一个节点，不能当独立标识符；
  返回类型标注的 `:` 与 `=>` 之间的类型段要整段交给 TypeBuilder。
- 什么时候 close：同现状。
- close 时提取哪些信息：`async` 关键字 token、参数表、返回类型、体。

**修复建议**：`typescript/` 层可解（expression-builder 加 async 前缀判定 + `ParseArrowFromBracket` 接受
`async` 与返回类型；无需动 core）。

---

### G4 类型位尾随 `!`（JSDocNonNullableType）没人承接（3 份）

**症状**：

```text
"type T = a!;"        → CRASH 类型别名声明的类型没有读完
"type U = (a!);"      → CRASH 括号内的类型没有读完
"type V = Box<a!>;"   → CRASH 不支持的类型起点
"const q = f() as T!;"   → CRASH 表达式没有读完
"const q = f() as T![];" → CRASH 表达式没有读完
```

**根因**：`type-builder.xl.md` 的 `ParsePostfixType`（:466）没有 `!` 这一档；`ParsePrimaryType`（:532）
读到 `!` 时落到 :703 抛「不支持的类型起点」。`!` 在 TS 里是 JSDoc 时代的 `JSDocNonNullableType`，
仍是合法的类型后缀。`types/gap-r985-jsdoc-nonnull-in-type-position.ts` 的注释说「第 1203 轮在投影层
`projectTypeExpression` 收掉了 `!`」，但**解析层（TypeBuilder）并没有把 `!` 读进类型**，于是：
类型别名 `a!` 剩一格 → `FromUnits` :165 抛「类型没有读完」；`as T!` 剩一格 → 表达式层
`BuildExpressionRange` :173 抛「表达式没有读完」。

**代表性文件**：`types/gap-r985-jsdoc-nonnull-in-type-position.ts`、
`expressions/expr-as-type-nonnull-tail.ts`、`expressions/gap-as-bang-array-type.ts`（后者是 `as T![]`，
根同一处：`T!` 之后空下标被当空元组/剩余单元）。

**完整清单（3）**：以上 3 份。

**§6 归类：possible build 不对**（次类 **缺少 possible**：类型位多一格 `!` 时没有候选/后缀承接它）。

**用户五问（本组）**：
- 什么时候 build：类型收口那一格（`;`/`)`/`>`/`,`）build。
- build 时提取哪些信息：后缀单元列表里 `!` 的个数与位置（`!` 不投影，但必须被吃掉）。
- 什么时候 close：不变。
- close 时提取哪些信息：类型尾（含被吃掉的 `!`）。

**修复建议**：`typescript/` 层可解：`ParsePostfixType` 增加 `!`（可重复，`T!!` 也合法），
与 `[]`/`[K]` 同级处理；不需要动 core。

---

### G5 type-builder 语法缺口（5 份）

四种独立形态，同一层（`typescript/tokens/types/type-builder.xl.md`）：

| 形态 | 改前读数 | 根因 |
| --- | --- | --- |
| `type T = { (a: string) };` | CRASH 调用签名缺少返回类型 | `ParseTypeMember`（:869）的 `(` 分支（:1013-1032）把 `:` 当必需，:1020 抛；`<T>` 泛型那支 :993 同样。TS 的 AST 里无返回类型的调用签名仍成节点 |
| `type C = { [K in keyof U]:U;` 换行 `[K] };` | CRASH mapped type 没有读完 | `ParseMappedType`（:2396）读完值类型就返回，没有像 TS `parseMappedType` 那样再 `parseTypeMembers()`（:2488 抛） |
| `type T = [A?, ...B, C, name: D?, ...rest: E[]];` | CRASH 不支持的类型起点 | `ParseTupleType`（:738）只认「具名 `name?:` / `...name:`」与裸类型/`...`，不认**未具名可选元素** `A?`（`OptionalType`），`?` 落到 `ParsePrimaryType` :703 |
| `const f = (): () => void => { return; };` | CRASH 括号内没有类型 | 箭头返回类型段在**第一个 `=>`** 处被切断（`ParseArrowFromBracket` :1405 的返回类型范围），`()` 落进 `ParseParenthesizedType`（:706）→ 空括号 :718 抛；函数类型本该走 `ParseFunctionType`（:1392） |

代表文件：`types/gap-r900-call-signature-no-return-type.ts`、`types/mapped-member-after-value.ts`、
`types/type-tuple-members.ts`、`types/type-new-nodes-adversarial.ts`、
`expressions/expr-arrow-return-function-type.ts`。

对照读数：`type T = { (a: string): void };` → OK；`type T = [name: D];` → OK；`type T = [...rest: E[]];` → OK；
`type T = () => void;` → OK。说明是**组合/缺省档**没接，不是整类没做。

**完整清单（5）**：以上 5 份。**§6 归类：possible build 不对**（build 期类型文法提取不全）。

**用户五问（本组）**：
- 什么时候 build：类型单元到齐（`;`/`}`/`)`/逗号边界）后 build。
- build 时提取哪些信息：成员签名允许缺返回类型（仍产出 ReturnType 格）、mapped 值后的成员、元组的
  `?`/`...`/具名三档、箭头返回类型的**嵌套 `=>` 配对**。
- 什么时候 close：不变。
- close 时提取哪些信息：类型节点区间按最后一个实义单元（见 `print-ast-common` 的既有口径）。

**修复建议**：`typescript/` 层可解（全部在 type-builder；不需要 core）。

---

### G6 类体成员切分与成员名判据（3 份）

**症状**：

```text
class C { readonly [k: symbol]: string }        → CRASH computed 成员名没有读完（前缀行定位在 class 行）
class C { [k: string]: number }                 → CRASH throw by line 0 --->  （同上）
interface I { [k: string]: number }             → OK        ← 只在 class 宿主坏
@dec() private readonly m = new Map<string, Array<{ [K in keyof T]: T[K] }>>();
                                                → CRASH 类成员之间缺少分隔符
```

**根因**：

1. `class-declaration-shape.xl.md` 的 `BuildMembers`（:513）成员名分支（:679-693）把**任何 `[` 开头的成员名**
   当 computed property name，并把它交给 `ExpressionBuilder` 解析 `k: symbol` → 必然失败，
   :692 抛「computed 成员名没有读完」。类宿主的成员候选里没有把 `[name: T]` 路由给 `IndexSignature`
   （接口/类型字面量宿主走的是 `TypeBuilder.ParseTypeMember` 的 `[` 分支，所以那边是好的）。
2. `BuildMembers` 的成员切分（:1084 抛「类成员之间缺少分隔符」）用「成员级分隔符」判定，
   对初始化器里的 `Map<string, Array<{…}>>`（`<…>` 内的 `,`、`{}` 括号、`>>`）没有角度深度，
   把成员的初始化器切开，剩下 `Array<{…}>>();` 之类的碎片 → :1084 抛错。与 G1a 同一种「角度盲切分」，
   只是发生在类体成员这一层。

**代表性文件**：`types/type-index-signature.ts`、`types/type-member-index-signature.ts`、
`types/type-combination-adversarial.ts`。**完整清单（3）**：以上 3 份。

**§6 归类**：`[k: T]` 两份 → **缺少 possible**（class 宿主没有 IndexSignature 候选），次类 possible compute 不对；
装饰器嵌套泛型那份 → **possible build 不对**（成员切分角度盲）。

**用户五问（本组）**：
- 什么时候 build：类体成员各自到齐（`;`/换行 ASI/`}`）时分别 build；`[k: T]` 应在**成员名判定那一格**就分给
  IndexSignature 候选，而不是先当 computed name build。
- build 时提取哪些信息：成员名前缀（`readonly` 等修饰词）、`[` 之后是否是「名字 + `:`」形态；
  成员切分时的 `<>` 深度与括号单元（本项目里 `{}`/`()`/`[]` 已是整块 Bracket，唯独 `<>` 不是）。
- 什么时候 close：成员 close 在 `;`/ASI/`}` 之前；类体 close 在 `}`。
- close 时提取哪些信息：成员的修饰词、名字、参数/类型/初始化器；类体成员表。

**修复建议**：`typescript/` 层可解（class-declaration-shape 的成员名分派 + 成员切分的角度深度）。

---

### G7 表达式层零散形态缺口（4 份）

| 文件 | 改前读数 | 根因 | §6 主类 |
| --- | --- | --- | --- |
| `expressions/gap-r949-object-member-new-signature.ts` | 对象字面量成员缺少函数体（`const v = { new (a: number): I };`） | `expression-builder.xl.md:1145 ParseObjectLiteral` 的无体成员白名单没有 `ObjectLiteral`，:1252/:1292 抛 | possible build 不对 |
| `expressions/gap-r955-yield-await-outside-context.ts` | 表达式意外结束（`const w = await;`） | `ParsePrimary`（:1833）里 `await` 无条件按一元运算符处理，没有「操作数缺失时退化为 Identifier」的判据（TS 在这一格是 Identifier），:1839 抛 | possible compute 不对（次 possible build） |
| `expressions/expr-r1220-instantiation-as.ts` | 表达式语句没有读完（`a<b> as T;`） | instantiation expression 后接 `as` 时，`As` 节点的基名被留在节点外（用例注释：`As` 只装 `as` 右边那一段），`ExpressionBuilder.ParseBinary`（:399）/`ParseFollowingType`（:463）与投影的 `As` 范围不一致，:71（`expression-statement-shape.xl.md`）抛 | possible build 不对 |
| `expressions/cls-member-name-brace-newline.ts` | 表达式语句没有读完（`a.class` 换行 `{}`） | `class` 前有 `.` 时它是**成员名**、不是类头；`ClassBranch.IsPendingHead` 的位置闸缺这一档，类分支把 `{}` 收成类体，`a.class {}` 并成一条 → 表达式语句收不完（:71 抛） | possible compute 不对 |

**完整清单（4）**：以上 4 份。

**用户五问（本组）**：
- 什么时候 build：语句收口格；`await;` 这一格应在「关键字是否处于 await 上下文 + 有操作数」都满足时才生成 Await，
  否则按 Identifier build。
- build 时提取哪些信息：对象字面量成员的「有体/无体」两档；`as`/instantiation 的基名范围；`class` 的前置单元（`.`/`?.`）。
- 什么时候 close：不变。
- close 时提取哪些信息：节点区间（`As` 要含基名；对象成员方法声明要有自己的 End）。

**修复建议**：`typescript/` 层可解（expression-builder 对象成员/await/As；class 分支的 pending head 位置闸
在 `typescript/tokens/statements` 或 class 候选里）。

---

### G8 basic token 场景：控制头之后以 `/` 开头（1 份）【交用户决定】

**症状**：

```text
"for (;;) /re/g;"   → CRASH 不支持的表达式起点
"if (/x/.test(s)) { y(); }"  → OK（`(` 之后的 `/` 能判成正则）
```

**根因**：`/` 是 `RegexToken` 还是 `Symbol("/")` 是 **basic token 层的判定**（IMPORTANCE 3.1：basic token
只能由用户发起修改）。`typescript/run/typescript-template.xl.md:44` 记录了同一症状：「少这一项时 `/` 会被
当成除号（`export default /re/;` 抛『不支持的表达式起点』）」。控制头 `)` 之后、语句起点处的 `/` 现在
被当成除号，`ParsePrimary` 结尾分支（`expression-builder.xl.md:2023`）抛「不支持的表达式起点」。

**代表性文件**：`expressions/expr-r1233-control-head-regex.ts`（唯一一份；文件里还有
`/re/g;` 紧跟在 `for (;;)` / `while (a)` / 裸块之后的多档，崩溃前缀定位到第 25 行 `/re/g;`）。

**§6 归类：basic token 存在问题**。

**用户五问（本组）**：build / close 的时机与提取内容都无争议（不在 shape 层）；争议只在
**basic token 的 `/` 分类判据**：句法位置（控制头 `)` 之后、语句起点、`(`/`,`/`=`/`:` 之后、`=>` 之后…）是否
都算「正则起点」。→ **交用户决定**：给定 basic token 判据表后，typescript 层按 `IsRegexStart` 消费即可。

**修复建议**：判据若落在 basic token 层 → **需用户决定**（core 改动）；若只补 typescript 层的
「语句起点/控制头之后 `/` 当正则」白名单，则 typescript 层可解，但要与 basic token 口径一致，建议一并由用户裁定。

---

### G9 `let d!: T` 的 definite assignment `!`（1 份）

**症状**：`let d!: number;` → CRASH 变量声明里有无法识别的单元。

**根因**：`statement-builder.xl.md:490 BuildVariableDeclarationList` 在名字之后只认 `:`（:525）与 `=`（:548），
不认 `!`（definite assignment assertion），于是 `!` 留在声明里，:582 抛「变量声明里有无法识别的单元」。
该文件（`expressions/expr-this-tagged-template.ts`）崩溃前缀定位在第 25 行 `let d!: number;`，
与文件主标题的 `this` 标签模板无关（那条在这一格之前已经通关）。

**§6 归类：possible build 不对**（次类 缺少 possible）。

**五问**：build 时机不变；build 时要提取「名字之后的可选 `!`」并吃掉（不投影）；close 与 close 提取不变。

**修复建议**：`typescript/` 层可解（一行分支）。

---

### G11 函数表达式前缀 `function*` / `function<T>`（2 份）

**症状**：

```text
"const g = function* () { yield 1 };"          → CRASH 函数表达式缺少参数括号
"(function <T>(x: T) { return x; })(1)"        → CRASH 函数表达式缺少参数括号
"const g = function () {};"                    → OK
```

**根因**：`expression-builder.xl.md:1571 ParseFunctionExpression` 在 `function` 之后要么读名字、要么要求
紧跟 `(`；没有跳过生成器 `*`、也没有跳过类型参数段 `<T>`，于是 :1591 抛「函数表达式缺少参数括号」。
（`function*` 的 `*` 与 `function<T>` 的 `<…>` 都是缺省档，裸 `function ()` 是好的。）

**代表性文件**：`expressions/expr-func-expr-generator.ts`、`expressions/expr-function-generic-anonymous.ts`。
**完整清单（2）**：以上 2 份。**§6 归类：possible build 不对**。

**五问**：build 时机不变；build 时要提取「`*` 跳过、`<…>` 走 ParseTypeParameterList、名字可选、随后必须是 `(`」；
close 不变。

**修复建议**：`typescript/` 层可解。

---

### G10 待确认（3 份；根因已收敛到 throw 点，机制待定）

| 文件 | 改前读数 | 已确认事实 | 待确认 |
| --- | --- | --- | --- |
| `types/type-parameter-list.ts` | 类型别名声明的类型没有读完（前缀行 6：`type F = <V>(a: V) => V;`） | 该行**单独解析 OK**（`type F = <V>(a: V) => V;` → TypeAliasDeclarationShape）；崩溃只在文件上下文（前面有 `class C<T, U extends X<T>> {}`、`interface I {…}`，且全文只在第 3 行有一个 `;`） | 哪一步的语句边界把第 4/5 行的残留单元并进了第 6 行别名；嫌疑：`>>` 合符号、无 `;` 语句的 ASI 边界、`type-alias` 候选的 `start` 计算。**§6 暂记 end compute / possible build 不对** |
| `expressions/expr-lambda-then-compound-assign.ts` | 表达式没有读完（前缀行 11：`a += 1`） | 用例注释写明根因是 `LamdaReorganization.Process` 造出 `Lamda` 后本体范围 `null`，`Lamda.Clone` 的 `Sign(this)` 抛 `SourceException`（用例里记的是这个，实测首条消息是外层「表达式没有读完」） | `Lamda` 范围未签 vs 复合赋值在语句尾的交互；**§6 暂记 possible build 不对（close 时未签范围）** |
| `expressions/ex-await-yield.ts` | 表达式没有读完（前缀行 5：`const b = await (h())`） | 单独 `async function f() { const b = await (h()); }` → OK；崩溃只在文件上下文（第 3-4 行 `async function f() {`、`const a = await g()` 无分号） | 是 `await` + 括号操作数的上下文，还是 G1b 的无分号边界；**§6 暂记 end compute / possible build 不对** |

## 4. basic token 场景（交用户决定）

本任务范围内只有 **1 处**（G8）：**`/` 在语句起点（控制头 `)` 之后）应判成 `RegexToken` 而不是 `Symbol("/")`**。
证据：`expressions/expr-r1233-control-head-regex.ts`、`typescript/run/typescript-template.xl.md:44`；
`if (/x/…)` 这类 `(` 之后的 `/` 已经能判对，说明缺的是「控制头之后 / 语句起点」这一档位置判据。

另有一处**口径待用户裁定**（G2）：`>>` / `>>>` 是否要在 basic token 层就拆成两格/三格 `>`。
现状：types 侧已有 `type-builder.xl.md:1717 IsSplitClose` 在类型位绕过；`expression-builder.xl.md:483` 与
`MatchAngleClose`（:1759-1761）明确写着「拆 `>>` 需要 basic token 决策」。
→ **交用户决定**：若在 basic token 层拆，属于 core 改动；若只在 typescript 层拆，则不需要用户改 core。

## 5. 目录 / 条数 / 类别汇总表

| 目录 | 份数 | 主要 §6 类别（主类 → 份数） | 根因落点（文件:方法） |
| --- | --- | --- | --- |
| expressions（31） | 31 | possible build 不对 23；end compute 不对 3；possible compute 不对 2；basic token 1；待确认 2 | statement-builder.BuildVariableDeclarationList / BuildExpressionRange；expression-builder.MatchAngleClose / ParseFunctionExpression / ParseObjectLiteral / ParseArrowFromBracket / ParsePrimary；class-declaration-shape.BuildMembers |
| types（16） | 16 | possible build 不对 10；end compute 不对 3；缺少 possible 2；待确认 1 | type-builder.ParsePostfixType / ParseTupleType / ParseTypeMember / ParseMappedType；type-alias-declaration-shape.FromUnits；class-declaration-shape.BuildMembers |
| **合计** | **47** | **possible build 不对 33；end compute 不对 6；possible compute 不对 2；缺少 possible 2；basic token 1；待确认 3** | — |

按组：G1a 15、G1b 6、G2 1、G3 3、G4 3、G5 5、G6 3、G7 4、G8 1、G9 1、G11 2、G10 3 = **47**。

## 6. 一句话结论与下一步

- **47/47 已归因**：33 份落在 **possible build 不对**（build 前/中提取的单元集或文法不对），6 份 **end compute 不对**
  （无分号 ASI 边界），2 份 **possible compute 不对**，2 份 **缺少 possible**，1 份 **basic token**（`/` 正则判据），3 份待确认。
- 最大单点收益：`statement-builder.BuildVariableDeclarationList` 的**角度深度**（15 份，占 1/3）；
  其次是 **ASI 边界**（6 份）与 **type-builder 的四个文法缺口**（5 份）。三处修完 = 26/47。
- 全部修复建议都落在 `typescript/**` 层；**只有 G8（`/` 的 basic token 判据）与 G2 的「`>>` 是否在 basic token 层拆」
  需要用户裁定**，不动 `core/**` 的前提下可以先把 typescript 层的绕过补齐。
- 待确认的 3 份（`type-parameter-list`、`expr-lambda-then-compound-assign`、`ex-await-yield`）下一步建议：
  用 `tmp/probe47.mjs` 的行级最小化继续二分（每份都已知首崩行），把上下文前置语句逐行删到最小后再定位到候选/close 时机。
