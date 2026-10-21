# declarations 目录 41 份 AST 崩溃归因

本文件回答：`tests/cases/token/declarations/**` 里 41 份**崩溃**（`result = crash`）用例，
按 IMPORTANCE §6 的七类该怎么归因、根因在 `typescript/**/*.xl.md` 的哪个方法的哪一步，
以及「何时 build / build 提什么 / 何时 close / close 提什么」。
它只记录只读分析与探针读数，**不改任何 `*.xl.md`、`tests/cases/**` 与 `core/**`**。

范围：只做 crash 行。`diff` 行（29 条）由另一任务负责，本文不涉及。

## 1. 基线读数

```text
Lead 基线 tmp/token-ast-baseline.json：1703 行
  ok 1501 / crash 162 / diff 29 / ts-invalid 10 / gap-now-passing 1
本任务范围：file 含 /token/declarations/ 且 result=crash → 41 份（目录下共 337 个 .ts）
```

克隆：`C:\Users\Admin\Documents\GitHub\xl-example-set\cover-token-an-decl`，分支 `cover-token-an-decl`。

构建（本克隆上）：

```text
xl_build core,typescript  → 859 written, 0 error(s), 2444 warning(s)（既有 W3102/W3103 噪音）
node node_modules/typescript/bin/tsc → exit 0
```

## 2. 探针方法

与 `typescript/cases/ast-json.mjs` 同一入口：`SourceFileRunner.Parse(src, "a.ts")`，catch 后展开
`InnerException` 链。脚本（不提交）：

- `tmp/probe-decl.mjs`——对 41 份文件逐个跑「全文 / 逐行最小崩溃前缀 / 每行单独」；
- `tmp/micro.mjs`、`tmp/micro2.mjs`、`tmp/micro3.mjs`、`tmp/micro4.mjs`——把每组的机制抽成最小片段，
  用「改前 vs 加一个 `;` / 去掉下一行」这类单变量对照确认判据。

关键读数在下面各组的「症状」里逐条贴出（都是本克隆实测）。

## 3. 分组总览与 §6 归类

| 组 | 根因一句话 | 条数 | §6 主类 | 代表 `.xl.md` |
| --- | --- | --- | --- | --- |
| G1 | 形参只接受裸 Identifier；绑定模式与 `= 默认值` 都不被收 | **9** | possible build 不对 | `function-declaration-shape.xl.md`、`class-declaration-shape.xl.md` |
| G2a | 根级 ASI 判据只把「语句关键字开头」当边界，`console`/`foo` 开头的下一条接不上 | **10** | end compute 不对 | `source-file-end-possible-shape.xl.md`、`expression-statement-possible-shape.xl.md` |
| G2b | 函数体 / 构造器体里根本没有「换行处结束」的终结候选 | **2** | 缺少 end | `source-file-end-possible-shape.xl.md`（对照）、`statement-builder.xl.md` |
| G2c | namespace 体（ModuleBlock）里 import= / export= 只认 `;` 收口 | **3** | 缺少 end | `module-block-shape.xl.md`、`import-equals-declaration-shape.xl.md` |
| G3a | 类型注解的区间扫描只找 `=` / `,`，不以语句结尾为界 | **1** | possible build 不对 | `statement-builder.xl.md` |
| G3b | 声明内切分把 `<...>` 里的 `,` 当声明分隔符 | **1** | possible build 不对 | `statement-builder.xl.md` |
| G4 | 继承子句的 `ExpressionWithTypeArguments` 只认名字，`?.` / 模板串不交给表达式 | **3** | possible build 不对 | `heritage-clause-shape.xl.md` |
| G5 | 类的 `[...]` 成员名一律当 computed property，索引签名读不完 | **2** | possible build 不对 | `class-declaration-shape.xl.md` |
| G6 | interface 的 `a?` 无类型被当成「属性签名缺少类型」 | **1** | possible build 不对 | `type-builder.xl.md` |
| G7 | 对象绑定模式里的计算键 `["k"]` 被当数组模式 | **1** | possible build 不对 | `binding-element-shape.xl.md` |
| G8 | 泛型箭头 `<T,>` 的尾随逗号读不到 `>` | **1** | possible build 不对 | `expression-builder.xl.md` |
| G9 | 实例化表达式 `>` 后接 `??` / `\|\|` / `&&` 时被当成新表达式起点 | **1** | possible build 不对（次 possible compute） | `expression-builder.xl.md` |
| G10 | 带装饰器的 type alias / interface / namespace 没有「从 `@` 起」的候选 | **3** | 缺少 possible | 三个 `*-declaration-possible-shape.xl.md` |
| G11 | `using` 声明没有语句候选（只有表达式语句候选接住它） | **1** | 缺少 possible（次 end compute） | `statement-builder.xl.md`、`source-file-end-possible-shape.xl.md` |
| G12 | 孤立的 `declare` / `abstract` 被当关键字，表达式语句收不了 | **1** | possible compute 不对（次 basic token，交用户决定） | `statement-builder.xl.md`、`expression-statement-shape.xl.md` |
| G13 | 变量声明的 `!` 确定赋值断言没有提取点 | **1** | possible build 不对 | `statement-builder.xl.md` |

合计 9+10+2+3+1+1+3+2+1+1+1+1+3+1+1+1 = **41**。

类别汇总（主类）：缺少 possible 4 / 缺少 end 5 / possible compute 不对 1 / possible build 不对 21 / end compute 不对 10 / end build 不对 0 / basic token 0（G12 次类，交用户决定）。

一条总体结论：**41 条里 31 条落在「end 收口」与「possible build 提取」两族；`end build` 一条都没有；
唯一的 basic token 疑点在 G12（孤立上下文关键字）。**

---

## 4. 各组证据链

### G1 形参：绑定模式与默认值（9 条，possible build 不对）

**症状**（实测）：

```text
function f({ a, b }) {}                 → 函数参数不是标识符
function f(a = 1) {}                    → 函数参数不是标识符
function f(a?: string, b: number = 2) {}→ 函数参数不是标识符
function g([c]) {}                      → 函数参数不是标识符
function f(a: number) {}                → OK        ← 只有类型能过
function f(a?: string) {}               → OK        ← 可选也能过
function f(a: number, b: string) {}     → OK
class C { m(a: number) {} }             → OK
```

即：**裸 Identifier / 纯类型 / 可选 `?` 都能过；一旦形参是 `{…}` / `[…]` 或带 `= 默认值` 就炸。**
`decl-method-function-return.ts` 是同一个洞在类成员参数一侧的表现（消息换成「类成员参数不是标识符」）。

**根因** `typescript/tokens/declarations/function-declaration-shape.xl.md:304-382`
`static BuildParameters(host, bracket, context)`：

- 它自己按 `,` 切组，然后只给两种组机会走 `TypeBuilder.ParseParameter()`（`typed || headIsRest`，第 339 行）；
- `typed` 只由「名字后面紧跟 `:` / `?` / `?:`」判定（第 327-336 行），**`=` 不在其中**；
- 其余组落到第 355-358 行：`if (!(nameUnit instanceof Common)) throw new Error("函数参数不是标识符")`。
  于是 ① 形参名是 `{` / `[` 括号单元 → 直接 throw；② `a = 1` 被拆成「`a` 建 Identifier + 下一轮看到 `= 1`」，
  `=` 不是 Common → 同一个 throw。
- 类成员参数是同一段逻辑的复制：`class-declaration-shape.xl.md:496` 抛「类成员参数不是标识符」。
- `typescript/tokens/types/parameter-shape.xl.md` / `parameter-possible-shape.xl.md` 本身是能收
  ParameterName（含 pattern）与 Initializer 的；这里的问题不是它，而是 **build 没有把这两类组路由进去**。

**代表文件**：`decl-func-destructured-params.ts`、`decl-func-default-params.ts`、
`decl-func-destructured-params-typed.ts`、`decl-param-obj-pattern-comment.ts`、`fn-params.ts`、
`decl-method-function-return.ts`。

**完整清单（9）**：`decl-func-default-params.ts`、`decl-func-destructured-params-typed.ts`、
`decl-func-destructured-params.ts`、`decl-func-optional-params.ts`、`decl-param-arr-pattern-comment.ts`、
`decl-param-obj-pattern-comment.ts`、`fn-destructured-params.ts`、`fn-params.ts`、`decl-method-function-return.ts`。

**用户五问**：

- **正确的应该什么时候 build**：形参表 `)` 这个括号单元**闭合**的那一刻，由
  `FunctionDeclarationPossibleShape.BuildByIndex` / `ClassMember` 的 build 建 `ParameterShape`（现在就是这时候，时点没错）。
- **build 时提取哪些信息**：每个形参组的 `DotDotDot`、名字（`Identifier` 或嵌套 `Array/ObjectBindingPattern`）、
  可选 `?`、类型（`TypeBuilder.ParseParameter`）、默认值 initializer（`= Expr` 属 `ParameterShape.Initializer`）。
  即 `typed || headIsRest` 要扩成「`typed || headIsRest || headIsBracketPattern || groupHasEquals`」，
  并把 `= …` 的表达式段交给表达式构建器。
- **什么时候 close**：每个 `ParameterShape` 在自己那一段单元结束处 close（现有 `parameter.TryToClose`），
  参数表闭合并进 `FunctionDeclarationShape` 之后不能再往里塞。
- **close 时提取哪些信息**：区间（首单元到默认值/类型末单元）、`Pos`（含前导 trivia）、Parent；
  `Data` 只剩 AST 子节点（DotDotDot / PropertyName / BindingName / Initializer）。

**修复建议**：`typescript/` 层可解（`function-declaration-shape.xl.md` + `class-declaration-shape.xl.md`
两处 build 的参数分派）。不需要动 `core/`。

---

### G2a 根级 ASI 判据只认语句关键字（10 条，end compute 不对）

**症状**（实测，撞的是 `statement-builder.xl.md:173`「表达式没有读完」）：

```text
let a = 1\nlet b = 2              → OK      ← 下一句以 let 开头
let a = 1\nconsole.log(a)         → 表达式没有读完
const a = 1\nconsole.log(a)       → 表达式没有读完
const [a] = [1]\nlet b = 2        → OK
const [a] = [1]\nconsole.log(a)   → 表达式没有读完
let { a } = o\nconsole.log(a)     → 表达式没有读完
const [a] = [1];\nconsole.log(a)  → OK      ← 有分号就没事
```

结论：**跟「解构」无关**，判据是「无分号时下一句的第一个代码单元是不是语句关键字」。
第二句是 `console`（`Common`）时，ASI 边界不成立，上一条语句的单元段一路吞到下一条 ——
`StatementBuilder` 按 `;` 找段末，于是初值/表达式段多出 `console.log(a)`，表达式读完还剩单元 → 抛错。

**根因** `typescript/tokens/files/source-file-end-possible-shape.xl.md:53-72`
`SourceFileEndPossibleShape.ComputeByIndex` 的 ASI 分支只问
`ExpressionStatementPossibleShape.IsAsiBoundary(units, tokenIndex)`（第 63 行），而该判据把
「换行后到来的代码单元**接不上**前一条表达式」实现成了「是不是语句关键字开头」这一种情况
（`typescript/tokens/statements/expression-statement-possible-shape.xl.md` 的 `IsAsiBoundary`）。
`console` / `foo` / `document` 这类 `Common` 起头的语句永远判不成分界，
终结候选 Reject → 没有人在换行处收口。
（`source-file-end-possible-shape.xl.md:512` 的注释也印证：无分号到 EOF 会落进 ExpressionStatement 报错。）

**代表文件**：`decl-arr-destructure-holes.ts`、`decl-arr-destructure-rest.ts`、
`decl-obj-destructure-rename.ts`、`decl-destructure-type-annotation.ts`、`decl-destructure-comment-hosts.ts`。

**完整清单（10）**：`decl-arr-destructure-defaults.ts`、`decl-arr-destructure-holes.ts`、
`decl-arr-destructure-nested.ts`、`decl-arr-destructure-rest.ts`、`decl-obj-destructure-defaults.ts`、
`decl-obj-destructure-nested.ts`、`decl-obj-destructure-rename.ts`、`decl-obj-destructure-rest.ts`、
`decl-destructure-type-annotation.ts`、`decl-destructure-comment-hosts.ts`。

**用户五问**：

- **正确的应该什么时候 build**：换行后到来的新代码单元被判为「接不上上一条表达式」的那一刻 build 上一条
  （ASI），由终结候选 `BuildByIndex` 收尾；`;` 与 EOF 是另外两种同一层的终结。
- **build 时提取哪些信息**：上一条语句的完整单元段（非 trivia），不含 `;`；首单元 → `Pos`，末单元 → 区间。
- **什么时候 close**：build 后立即 close（`ExpressionStatementShape.FromUnits(..., requireSemicolon=false)`
  已在 close 里 `TryToClose`），然后根继续吃后面的单元。
- **close 时提取哪些信息**：只剩表达式子节点；`Data` 等价 AST children；`End` 取表达式的末单元、不能取 trivia。

**修复建议**：`typescript/` 层可解——扩 `IsAsiBoundary`：换行后首单元若是 `Common` 且
「前一条表达式已完整、两个单元之间不可能续接成同一表达式」（例如上一条以 `)` / `]` / `}` / 字面量 /
标识符结尾、下一单元是另一行的标识符且不是成员访问 `.` / 调用 `(` / 模板）就判边界。
需要在 `expression-statement-possible-shape.xl.md` 与 `source-file-end-possible-shape.xl.md` 用**同一个函数**
（现有契约已要求两处同一判据），不动 `core/`。

---

### G2b 函数体 / 构造器体里没有 ASI（2 条，缺少 end）

**症状**（实测）：

```text
function g() {\n foo()\n bar()\n}            → 表达式没有读完
function g() {\n foo();\n bar();\n}          → OK
function* g() {\n yield 1\n yield* other()\n}→ 表达式没有读完
class A { m() {\n foo()\n bar()\n} }         → 表达式没有读完
if (a) {\n foo()\n bar()\n}                  → 表达式没有读完
namespace N {\n const a = 1\n const b = 2\n} → OK     ← 关键字开头，块内能切开
```

即：**根级之外，块体的语句只用 `;` 断句**；关键字开头的下一条在块里能过（`namespace` 例子），
`Common` 开头的下一条过不去。`fn-generator.ts`（`yield 1` 换行 `yield* other()`）与
`cls-super-newtarget.ts`（`super()` 换行 `if (…)`）都是这一族：文件里没有任何分号。

**根因**：ASI 只实现在 `SourceFileEndPossibleShape`（根单元的终结候选）一处。
块体由 `statement-builder.xl.md` 的 `BuildStatement` / `BuildExpressionStatement` 顺序解析，
段末判据是「找到 `;`」（`statement-builder.xl.md:460-488` 的 `BuildVariable` 扫描与
`BuildExpressionStatement` 的扫描），块体没有等价的终结候选，换行不构成边界。

**代表文件**：`fn-generator.ts`、`cls-super-newtarget.ts`。

**完整清单（2）**：`fn-generator.ts`、`cls-super-newtarget.ts`。

**用户五问**：

- **正确的应该什么时候 build**：块体里相邻两条语句之间，需要和根级同样的「ASI 边界」判定：
  新单元接不上上一条表达式 → 上一条在那里 build。
- **build 时提取哪些信息**：上一条语句的单元段（到换行边界为止，不含 `;`）。
- **什么时候 close**：build 完立即 close（语句 `Finish` 已做），块继续吃。
- **close 时提取哪些信息**：语句 AST children、区间到表达式末单元（不含尾随 trivia）。

**修复建议**：`typescript/` 层可解：把根级的 ASI 判据抽成公共函数，块体（函数体 / `if` 块 /
类方法体 / 循环体）在「下一句无法续接」时也按边界收口；也可给块体加一个轻量终结候选。
不动 `core/`。

---

### G2c namespace 体（ModuleBlock）里 import= / export= 只认 `;`（3 条，缺少 end）

**症状**（实测）：

```text
namespace N { import A = B.C; }        → OK
namespace N { import A = B.C }         → 表达式没有读完
namespace N { import x = require("m"); }→ OK
namespace N { import x = require("m") } → 表达式没有读完
namespace N { const a = 1; export = a; }→ OK（但被当表达式语句兜底，AST 是错的）
namespace N { const a = 1; export = a } → 不支持的表达式起点
```

即：**同一份内容加一个 `;` 就过**，说明不是「没有候选」，而是终结判据只认 `;`。

**根因** `typescript/tokens/declarations/module-block-shape.xl.md:95-111`
`ModuleBlockShape.BuildMember` 第 3 步把 import-equals 交 `ImportEqualsDeclarationShape.FromUnits`：
该 `FromUnits` 的段末只按 `;` 收口（`import-equals-declaration-shape.xl.md` 的 `FromUnits`/`Close`），
块体里没有 ASI/`}` 边界，于是单元段一直吃到块尾 → 表达式侧抛「表达式没有读完」。
`export = a` 同理（`module-block-shape.xl.md` 的 `export=` 分支）：有 `;` 时被表达式语句兜底过掉，
没有 `;` 时表达式起点看到 `export` 之后的单元 → 「不支持的表达式起点」。

**代表文件**：`decl-namespace-import-equals-require.ts`、`decl-namespace-import-equals-alias.ts`、
`decl-namespace-export-equals.ts`。

**完整清单（3）**：`decl-namespace-import-equals-alias.ts`、`decl-namespace-import-equals-require.ts`、
`decl-namespace-export-equals.ts`。

**用户五问**：

- **正确的应该什么时候 build**：`import x = require("m")` / `import A = B.C` / `export = expr` 这条成员
  在**块体里遇到 `;` 或块尾 `}` 或换行边界**时 build（现在只认 `;`）。
- **build 时提取哪些信息**：`import` 名、`=`、`require(...)` 的外部模块引用或实体名（qualified name）；
  `export =` 提取右侧表达式。
- **什么时候 close**：build 出 `ImportEqualsDeclarationShape` / `ExportAssignmentShape` 后立即 close。
- **close 时提取哪些信息**：children 只剩 AST 子节点（Identifier / ExternalModuleReference / 表达式），
  区间到表达式末单元、不含尾随 trivia。

**修复建议**：`typescript/` 层可解：`ModuleBlockShape.BuildMember` 里为 import-equals / export=
  用「`;` / 块尾 / 换行边界」三选一的段末判据；`export =` 应直接建 `ExportAssignmentShape` 而不是
  退回表达式语句。不动 `core/`。

---

### G3a 类型注解区间扫描不以语句结尾为界（1 条，possible build 不对）

**症状**（实测）：

```text
const o: any;          \n const b = 1;   → OK
const o: any            \n const b = 1;  → 类型注解没有读完
```

**根因** `typescript/tokens/statements/statement-builder.xl.md:525-547`
`BuildVariableDeclarationList` 里类型注解段的终点扫描只找 `=` 与 `,`
（`while (typeEnd < endExclusive && !IsSymbol("=") && !IsSymbol(","))`），**不把语句结尾（`;` / 换行）当界**：
声明没有 `;` 时 `endExclusive` 已经是整段语句列表末尾，类型段把下一行语句也吞进去，
`TypeBuilder.ParseType()` 读完 `any` 还剩 `const …` → 第 542 行抛「类型注解没有读完」。
`destr-object-newline-after-keyword.ts` 的 `declare const o: any` 换行 `const {…}` 正是这条。

**代表文件 / 完整清单（1）**：`destr-object-newline-after-keyword.ts`。

**用户五问**：

- **正确的应该什么时候 build**：变量声明在「名字 + 可选 `: 类型` + 可选 `= 初值`」整段到齐
  （`;` / 换行边界 / 语句末）时 build。
- **build 时提取哪些信息**：`!`、名字（Identifier / pattern）、`?`… 以及**类型段必须限定在声明自己那一段**，
  不能跨语句。
- **什么时候 close**：声明整段到齐后 close（`Finish` 里 `TryToClose`）。
- **close 时提取哪些信息**：名字 / 类型 / 初值三个子节点 + 区间 + `Pos`。

**修复建议**：`typescript/` 层可解：类型段终点判据加入「语句边界」（`;`、下一语句起始、换行）；
和 G3b 一起改。

---

### G3b 声明内切分把 `<...>` 里的 `,` 当分隔符（1 条，possible build 不对）

**症状**（实测）：

```text
let x: Record<string, number> = y;          → 泛型实参缺少 >
const { [k]: v } = { a: 1 } as Record<string, number>;  → 泛型实参缺少 >
const { [k]: v } = ({ a: 1 } as Record<string, number>) → OK   ← 括号把逗号挡住
```

**根因** `typescript/tokens/statements/statement-builder.xl.md`
`BuildVariableDeclarationList` 的两处段末扫描都按**裸顶层单元**找 `,`：

- 类型段 `:525-547`（`typeEnd` 遇 `,` 停）；
- 初值段 `:548-575`（`initializerEnd` 遇 `,` 停）。

`<string, number>` 的 `<` `,` `>` 都是 `Symbol`（不是 `Bracket`），所以 `,` 被当成
`VariableDeclaration` 之间的分隔符，切出来的是 `Record<string` → `TypeBuilder.ParseTypeArguments`
（`type-builder.xl.md:1649-1678`）读不到 `>` → 第 1665 行「泛型实参缺少 >」。
`typescript/tokens/expressions/expression-with-type-arguments-*` 的既有实现说明「`<>` 是符号不是括号」是
全仓的既定表示，因此只能靠扫描时维护 `<>` 深度。

**代表文件 / 完整清单（1）**：`decl-obj-destructure-computed-key.ts`。

**用户五问**：

- **正确的应该什么时候 build**：同 G3a（声明整段到齐）。
- **build 时提取哪些信息**：切分需要带「`<>` 深度 / 括号单元」的层次，不能只看单元类型。
- **什么时候 close**：声明整段到齐后 close。
- **close 时提取哪些信息**：同 G3a。

**修复建议**：`typescript/` 层可解：给 `BuildVariableDeclarationList` 的 `,` 扫描加 `<>` 深度
（进入 `<` +1、`>` -1，深度 0 才是分隔符），类型段同样加深度与语句边界。不动 `core/`。

---

### G4 继承子句只认名字（3 条，possible build 不对）

**症状**（实测）：

```text
class D extends B {}          → OK
class D extends a.b {}        → OK
class D extends a?.b {}       → 缺少标识符
class D extends `t` {}        → 缺少标识符
class D extends tag`t` {}     → 缺少标识符
class D extends tag`a${X}b`{} → 缺少标识符
```

**根因** `typescript/tokens/members/heritage-clause-shape.xl.md:145-158`
`BuildClauses` 的「表达式承载」判据 `startsWithAccess` 只看三种：`headUnit` 是括号单元、
第二单元是 `.`、第二单元是 `(`。**`?.`（Symbol）与以反引号开头的 `String`（模板串）都不在其中**。

- `a?.b`：走 else 分支 `builder.ParseName()`（第 177 行）读掉 `a`，循环下一轮 `headUnit` 是 `?.` 这个
  `Symbol`，又走 else → `TypeBuilder.ParseName()`（`type-builder.xl.md:1680-1694`）看到非 `Common` →
  第 1687 行「缺少标识符」。
- ``tag`t` `` / `` `t` ``：`headUnit` 是 `Common`/`String`、第二单元是 `String`，不满足三种之一 →
  else 读名字后再轮到 `String` 单元 → 同一个「缺少标识符」。

**代表文件**：`decl-heritage-tagged-template.ts`、`gap-r985-heritage-optional-chain.ts`、
`gap-r985-heritage-template-expression.ts`。

**完整清单（3）**：`decl-heritage-tagged-template.ts`、`gap-r985-heritage-optional-chain.ts`、
`gap-r985-heritage-template-expression.ts`。

**用户五问**：

- **正确的应该什么时候 build**：`extends` / `implements` 后的一项整段到齐（名字 + `?.`链 / 模板串 /
  `<…>` 类型实参）时 build `ExpressionWithTypeArguments`。
- **build 时提取哪些信息**：表达式（Identifier / PropertyAccess / TaggedTemplate / 模板串）与类型实参；
  `?.` 与反引号开头的 `String` 必须交给 `ExpressionBuilder`（`print-ast-common.xl.md` 的
  `projectExpression` 是折链的唯一算式），不能自己再拼名字。
- **什么时候 close**：该项整段到齐后 close，再收 HeritageClause（`extends A, B` 的 `,` 是列表分隔）。
- **close 时提取哪些信息**：`expression` 子节点 + 类型实参子节点；区间到表达式末单元（含 `>`）。

**修复建议**：`typescript/` 层可解：`startsWithAccess` 增加「`?.`」「`headUnit`/第二单元是 `String`」，
并把 `ExpressionWithTypeArgumentsShape.FromParts` 的 name 扩成 Token（已有 `parsed` 变量位）。
不动 `core/`。

---

### G5 类的索引签名被当 computed 成员名（2 条，possible build 不对）

**症状**（实测）：

```text
interface I { [key: string]: number }   → OK
class C { [key: string]: number }       → computed 成员名没有读完
class C { [key: string]: number; }      → computed 成员名没有读完
```

**根因** `typescript/tokens/declarations/class-declaration-shape.xl.md:676-705`
`BuildMembers` 里：成员名只要以 `[` 括号开头，一律当 `ComputedPropertyName`，
把括号 `Data` 交给 `ExpressionBuilder.ParseExpression()`（第 690 行）。索引签名的括号里是
`key : string`（`key` 之后还有 `:` 与类型），表达式读完 `key` 还剩 `: string` →
第 692 行「computed 成员名没有读完」。interface 一侧走 `TypeBuilder` 的索引签名分支
（`type-builder.xl.md` 的 `ParseIndexSignature` 一带，`计算属性签名缺少类型` 在 1124 行），
所以差别只在类的成员名分派。

**代表文件**：`decl-class-index-signature.ts`、`cls-index-signature.ts`。

**完整清单（2）**：`cls-index-signature.ts`、`decl-class-index-signature.ts`。

**用户五问**：

- **正确的应该什么时候 build**：类的 `[` 成员名在「括号闭合 + 后面紧跟 `: T`」时先试索引签名
  （参数名 + 类型），否则才当 computed property name。
- **build 时提取哪些信息**：索引签名 = `[` 参数名 `:` 参数类型 `]` `:` 返回类型（含 `?` / `readonly`），
  与 interface 侧同一套 `IndexSignature` 提取。
- **什么时候 close**：成员（索引签名/属性）整段到齐后 close。
- **close 时提取哪些信息**：children 顺序按 TS（`Parameter` / `Type` / 修饰词），
  区间到返回类型末单元（不含 `;`）。

**修复建议**：`typescript/` 层可解：`BuildMembers` 的 `[` 分支先判索引签名（括号内是否 `名 : 类型`），
命中则复用 `type-builder` 的索引签名提取，而不是走表达式。不动 `core/`。

---

### G6 interface 的可选无类型成员（1 条，possible build 不对）

**症状**（实测）：

```text
interface I { a?: number }   → OK
interface I { a? }           → 属性签名缺少类型
interface I { a?; }          → 属性签名缺少类型
class C { private x?; }      → OK
```

**根因** `typescript/tokens/types/type-builder.xl.md:1296`
`ParsePropertySignature` 在 `?` 之后强制要求 `: 类型`，没有类型就抛「属性签名缺少类型」。
类字段一侧（`class-declaration-shape.xl.md`）没有这个要求，所以 `private x?;` 能过；
TS 的 `PropertySignature.type` 是可选的，`a?;` 合法。

**代表文件 / 完整清单（1）**：`decl-optional-member-no-type.ts`。

**用户五问**：

- **正确的应该 build 时点**：成员到 `;` / `}` / 换行边界时 build；
- **build 提取**：名字、可选 `?`、类型（可缺）、修饰词（`readonly` / 访问性）；
- **close 时点**：成员整段到齐（`;` / 块尾）后 close；
- **close 提取**：`QuestionToken` / 类型子节点（可为空）+ 区间（End 到 `?` 或类型末单元，不含 `;`）。

**修复建议**：`typescript/` 层可解：`ParsePropertySignature` 的 `questionToken` 后允许紧跟 `;` / `}` / 换行
（类型缺省）。不动 `core/`。

---

### G7 对象绑定模式里的计算键（1 条，possible build 不对）

**症状**（实测）：

```text
const { [k]: v } = o        → OK（但按嵌套数组模式建，AST 是错的，靠后续修正）
let { ["k"]: kk } = obj     → 绑定元素缺少名字
```

**根因** `typescript/tokens/bindings/binding-element-shape.xl.md:58-83`
`BindingElementShape.ParseName` 只收两种名字：`Bracket`（一律当嵌套 `Array/ObjectBindingPattern`）与
`Common`。对象模式里的**计算键** `[expr]` 本该是 `PropertyName`（表达式），这里被当嵌套数组模式：
`["k"]` 里第一个单元是 `String` 基本 token，`ParseName` 既不认 `String` 也不认它后面的东西 →
第 82 行「绑定元素缺少名字」。`[k]` 之所以不炸，是因为 `k` 恰好是 `Common`，被当成了数组模式的第一个绑定元素
（AST 错误但没抛）。

**代表文件 / 完整清单（1）**：`vars-destructure-object.ts`。

**用户五问**：

- **正确的应该什么时候 build**：对象模式里一个元素在「名字 / 计算键 + 可选 `: 名字` + 可选 `= 初值`」到齐时 build。
- **build 时提取哪些信息**：先判「`[` … `]` 后面跟 `:`」= 计算键（`ComputedPropertyName`，左值交表达式构建器）；
  否则 `[` = 嵌套数组模式；`a: b` = PropertyName + BindingName。
- **什么时候 close**：元素到齐后 close，再收 `}`。
- **close 时提取**：`PropertyName` / `BindingName` / `Initializer` 三者顺序按 TS。

**修复建议**：`typescript/` 层可解：`BindingElementShape.ParseName` 与
`ObjectBindingPattern*` 的元素分派加「`[...]` + `:` → ComputedPropertyName」判据。不动 `core/`。

---

### G8 泛型箭头 `<T,>` 的尾随逗号（1 条，possible build 不对）

**症状**（实测）：

```text
const f = <T>(a: T): T => a    → OK
const f = <T,>(a: T): T => a   → 尖括号断言/泛型箭头缺少配对的 >
```

**根因** `typescript/tokens/expressions/expression-builder.xl.md:1769-1812`
`ParseAngleStart`（尖括号断言 / 泛型箭头二选一）在解析类型参数表时只接受
「类型参数 / `,` / `>`」的形状，`<T,>` 的尾随逗号之后直接是 `>`，
解析器没有把「`,` 后紧跟 `>`」当成合法结尾（`TypeBuilder.ParseTypeParameters` 同一处判据），
最后走到第 1812 行「尖括号断言/泛型箭头缺少配对的 >」。

**代表文件 / 完整清单（1）**：`fn-arrow-generic.ts`。

**用户五问**：

- **正确的应该什么时候 build**：`<` 起始的整段到齐（`<` 类型参数表 `>` `(` 形参 `)` `:` 返回类型 `=>`）时 build 箭头；
- **build 时提取**：类型参数表（允许尾随 `,`）、形参表、返回类型、箭头体；
- **close**：箭头函数表达式 build 完即 close；
- **close 提取**：`typeParameters` / `parameters` / `type` / `body` 序列，区间到函数体末单元。

**修复建议**：`typescript/` 层可解：类型参数表解析允许「`,` 后直接 `>`」（尾随逗号），
`ParseAngleStart` 的箭头判定随之成立。不动 `core/`。

---

### G9 实例化表达式 `>` 后接 `??` / `||` / `&&`（1 条，possible build 不对，次 possible compute 不对）

**症状**（实测）：

```text
const a = f ?? 1            → OK
const a = f || 1            → OK
const a = f && 1            → OK
const a = f<number>         → OK（作为 `[f<number>]` / `f<number> ? 1 : 2` 也都 OK）
const a = f<number> ?? 1    → 不支持的表达式起点
const a = f<number> || 1    → 不支持的表达式起点
const a = f<number> && 1    → 不支持的表达式起点
const a = f<number> ?: 1    → 不支持的表达式起点
```

即：**`<…>` 类型实参段读完 `>` 之后，紧跟的 `??` / `||` / `&&` / `?:` 没有被当成二元运算符继续折叠**，
而是被当成「新表达式的起点」；`? 1 : 2`（三元）与 `[` `]` 则正常。
`decl-instantiation-followers.ts` 的注释也把「`>` 后接 `]` / `?` / `:` / `||` / `&&` 仍属类型实参段」
记为待收的缺口。

**根因** `typescript/tokens/expressions/expression-builder.xl.md`
`ParseAngleStart`（第 2019-2022 行）在 `f` 之后见到 `<` 时把 `f<number>` 建成
`ExpressionWithTypeArgumentsShape`（第 713-715 行同一形态）；返回后二元折叠没有把
`??` / `||` / `&&` / `?:` 收进运算符表（或把 `>` 之后的第一个 `?` 当成了三元），
于是下一轮 `ParsePrimary` 落到 `expression-builder.xl.md:2023`「不支持的表达式起点」。

**代表文件 / 完整清单（1）**：`decl-instantiation-followers.ts`。

**用户五问**：

- **正确的应该什么时候 build**：整个表达式到语句边界时 build；实例化表达式只是左值。
- **build 时提取哪些信息**：`<…>` 实参段与其后紧邻的运算符之间的边界；`??` / `||` / `&&` / `?:`
  属于外层二元 / 三元折叠，不属于类型实参段。
- **什么时候 close**：表达式语句到齐后 close。
- **close 时提取**：二元 / 三元 / 实例化的 children 顺序按 TS。

**修复建议**：`typescript/` 层可解：`ParseAngleStart` 之后把 `??` / `||` / `&&` / `?:` 交给二元/三元折叠
（同时检查 possible 侧同判据）。不动 `core/`。

---

### G10 带装饰器的 type alias / interface / namespace（3 条，缺少 possible）

**症状**（实测）：

```text
@dec class C {}                        → OK
@dec export type T = number            → 不支持的表达式起点
@dec export declare interface I {}     → 不支持的表达式起点
@dec export declare namespace N {}     → 不支持的表达式起点
declare function dec(t:any):any;\n@dec → 不支持的表达式起点（装饰器后面什么都没有）
```

即：只有 class 有「从 `@` 起」的候选；type alias / interface / namespace 的候选都不吃 `@`，
散着的 `@` 落到表达式语句候选，`@` 是 `Symbol` 不是表达式起点 →
`expression-builder.xl.md:2023`「不支持的表达式起点」。

**根因**：`typescript/tokens/statements/statement-builder.xl.md:220-310` `BuildStatement`
的声明分派只认 `function` / `class` / `declare` / 变量 / 控制流；`@` 一律落到
`BuildExpressionStatement`。声明侧的解析入口在
`typescript/tokens/declarations/type-alias-declaration-possible-shape.xl.md`、
`interface-declaration-possible-shape.xl.md`、`module-declaration-possible-shape.xl.md`：
它们的 `ComputeByIndex` 只从声明关键字起算，没有 class 侧那种「装饰器前缀 → DeclarationStart」
（`class-declaration-possible-shape.xl.md` 已有）。

**代表文件**：`decl-type-alias-decorator.ts`、`decl-interface-decorator-modifiers.ts`、
`decl-namespace-decorator-modifiers.ts`。

**完整清单（3）**：`decl-interface-decorator-modifiers.ts`、`decl-namespace-decorator-modifiers.ts`、
`decl-type-alias-decorator.ts`。

**五问**：

- **正确的应该什么时候 build**：`@dec …` 前缀之后的声明关键字到齐、且声明体闭合时 build 整条声明
  （与 class 现有做法一致）。
- **build 时提取**：装饰器列表（`@` 到表达式末）、`export` / `declare` / `abstract` 等修饰词、
  声明关键字、名字、剩余部分。
- **什么时候 close**：声明整条到齐后 close（装饰器是其 `modifiers` 的第一个子节点，`Pos` 从 `@` 起）。
- **close 时提取**：`modifiers`（Decorator / ExportKeyword / DeclareKeyword…）顺序按 TS。

**修复建议**：`typescript/` 层可解：三个 possible 加「`@` 起头」分支（复用 class 的装饰器前缀提取），
`BuildStatement` 的 `@` 分派也补上。不动 `core/`。

---

### G11 `using` 声明没有语句候选（1 条，缺少 possible，次 end compute 不对）

**症状**（实测）：

```text
using res = open();                    → OK（但被当表达式语句兜底，AST 不对）
using res = open()                     → CatalogGuide: 终结候选与其它候选同时成立（宿主 SourceFileShape，下标 8）
const res = open()                     → OK
using res = open()\nlet b = 1          → 表达式没有读完
using res = open()\nconsole.log(res)   → CatalogGuide: 终结候选与其它候选同时成立（下标 13）
```

**根因**：`using` 的语句分支只在 `StatementBuilder.BuildStatement` 里
（`statement-builder.xl.md:296-298`：`text === "using"` → `BuildVariableStatement`），
但**根单元的普通候选里没有「`using` 变量语句」这一项**：根候选仍按「import/export/表达式语句」计算，
`using` 以 `Common` 开头被表达式语句候选接住；EOF 时终结候选 Accept、表达式语句候选还活着 →
`core/syntax/catalog-guide.xl.md` 的契约抛「终结候选与其它候选同时成立」。
`statement-builder.xl.md:129-137` 的 `IsVariableKeyword` 已把 `using` 算进去，
说明「`using` 是变量语句」这个事实在 build 层有了，possible 层没有。

**代表文件 / 完整清单（1）**：`decl-using-basic.ts`。

**五问**：

- **正确的应该什么时候 build**：`using` / `await using` 的声明列表到齐（`;` / EOF / 换行边界）时
  由变量语句候选 build。
- **build 时提取**：`using` 关键字、名字、`= 初值`（与 `let` 同形，只是关键字不同）。
- **什么时候 close**：声明列表到齐后 close。
- **close 时提取**：`VariableDeclarationList` 子节点、区间到初值末单元。

**修复建议**：`typescript/` 层可解：把 `using` / `await using` 纳入根级变量语句候选
（`variable-statement-possible-shape.xl.md` 的起始判据 + `source-file` 的候选表），
与 `IsVariableKeyword` 对齐。不动 `core/`。

---

### G12 孤立的 `declare` / `abstract`（1 条，possible compute 不对；次 basic token —— **交用户决定**）

**症状**（实测）：

```text
foo;          → OK
foo();        → OK
declare;      → 表达式语句没有读完
abstract;     → 表达式语句没有读完
declare x;    → 表达式语句没有读完
```

**根因**：`declare` / `abstract` 是上下文关键字，只有后面跟「被修饰的声明」时才是关键字。
现在它们被无条件升级成关键字形态，于是 `declare;` 这种「孤立上下文关键字」既不是声明
（`statement-builder.xl.md:238-256` 的 declare 分支要求后面是变量关键字），也不是标识符表达式；
表达式语句 `ExpressionStatementShape.FromUnits` 在 EOF 路径（`requireSemicolon = false`）下
把 `declare` 当关键字读完、剩下 `;` → `expression-statement-shape.xl.md:70-72`
「表达式语句没有读完」。用例注释写明了期望：「孤立的上下文关键字后面没有要被修饰的东西时**不升级成 Keyword**」。

**代表文件 / 完整清单（1）**：`decl-standalone-declare-abstract.ts`。

**basic token 场景（需用户决定）**：这条的主类可以放在 `typescript/` 层
（表达式语句候选 / 语句分派在「没有后续声明」时不把它当关键字，按 `Identifier` 收），
但用例注释要求的是 **token 层就不升级**。按 IMPORTANCE 3.1「basic token 只能由用户发起修改」，
这里单独列出，**交用户决定**：
**`declare` / `abstract` 这类上下文关键字，在「后面接不上声明」时，basic token 是否应该保持 `Common`
（从而让标识符候选自然接住）？** 若答案是「是」，本组必须动 `core/syntax/basic-tokens/`，
否则只能在表达式/语句层做兜底（AST 的 `pos` 可能与 TS 有细微差异）。

**五问**：

- **正确的应该什么时候 build**：单条语句到 `;` / EOF 时 build（现在也是）；
- **build 时提取**：若前有声明关键字则按声明；否则按 `Identifier` 表达式；
- **close**：语句到齐后 close；
- **close 时提取**：`ExpressionStatement(Identifier)`，区间到标识符末单元（`;` 不投影）。

---

### G13 变量声明的 `!` 确定赋值断言（1 条，possible build 不对）

**症状**（实测）：

```text
let x: number = 1   → OK
let x!: number      → 变量声明里有无法识别的单元
```

**根因** `typescript/tokens/statements/statement-builder.xl.md:490-597`
`BuildVariableDeclarationList`：名字之后只认 `:`（类型）、`=`（初值）、`,`（下一个声明），
第 579-583 行其余单元一律抛「变量声明里有无法识别的单元」。`!`（DefiniteAssignmentAssertion，
TS 在 `VariableDeclaration` 上的 `exclamationToken`）没有被提取。

**代表文件 / 完整清单（1）**：`decl-var-definite-assignment.ts`。

**五问**：

- **正确的应该什么时候 build**：变量声明到齐（名字 + 可选 `!` + 可选 `: 类型` + 可选 `= 初值`）时；
- **build 时提取**：`!` → `ExclamationToken` 子节点（TS 里是 `VariableDeclaration` 的 children 之一）；
- **close**：声明到齐后 close；
- **close 时提取**：`Identifier` → `ExclamationToken` → 类型 → 初值，区间到末单元。

**修复建议**：`typescript/` 层可解：在名字分支后加 `!` 的提取（`ExclamationTokenShape` 一类）。
不动 `core/`。

---

## 5. 汇总表（目录 / 条数 / 类别）

| 组 | 条数 | 主类 | 代表 `.xl.md` | 可 `typescript/` 层解 |
| --- | --- | --- | --- | --- |
| G1 形参模式/默认值 | 9 | possible build 不对 | `function-declaration-shape.xl.md:304-382`、`class-declaration-shape.xl.md:496` | 是 |
| G2a 根级 ASI 判据 | 10 | end compute 不对 | `source-file-end-possible-shape.xl.md:53-72`、`expression-statement-possible-shape.xl.md` | 是 |
| G2b 块体无 ASI | 2 | 缺少 end | `statement-builder.xl.md:460-488`、对照 `source-file-end-possible-shape.xl.md` | 是 |
| G2c ModuleBlock 只认 `;` | 3 | 缺少 end | `module-block-shape.xl.md:95-111`、`import-equals-declaration-shape.xl.md` | 是 |
| G3a 类型注解跨语句 | 1 | possible build 不对 | `statement-builder.xl.md:525-547` | 是 |
| G3b `<>` 内逗号 | 1 | possible build 不对 | `statement-builder.xl.md:548-575` | 是 |
| G4 继承子句只认名字 | 3 | possible build 不对 | `heritage-clause-shape.xl.md:145-185` | 是 |
| G5 类索引签名 | 2 | possible build 不对 | `class-declaration-shape.xl.md:676-705` | 是 |
| G6 interface `a?` | 1 | possible build 不对 | `type-builder.xl.md:1296` | 是 |
| G7 对象模式计算键 | 1 | possible build 不对 | `binding-element-shape.xl.md:58-83` | 是 |
| G8 `<T,>` | 1 | possible build 不对 | `expression-builder.xl.md:1769-1812` | 是 |
| G9 实例化表达式后继 | 1 | possible build 不对（次 possible compute） | `expression-builder.xl.md:2019-2023` | 是 |
| G10 装饰器声明 | 3 | 缺少 possible | `*-declaration-possible-shape.xl.md` ×3、`statement-builder.xl.md:220-310` | 是 |
| G11 `using` | 1 | 缺少 possible（次 end compute） | `statement-builder.xl.md:296-298`、`variable-statement-possible-shape.xl.md` | 是 |
| G12 孤立 `declare`/`abstract` | 1 | possible compute 不对（次 **basic token，交用户决定**） | `expression-statement-shape.xl.md:70-72`、`statement-builder.xl.md:238-256` | 需用户决定（若要求 token 层不升级） |
| G13 `!` 断言 | 1 | possible build 不对 | `statement-builder.xl.md:490-597` | 是 |
| **合计** | **41** | | | 40 可 `typescript/` 层解；1 需用户决定 |

**类别合计**：缺少 possible 4 / 缺少 end 5 / possible compute 不对 1 / possible build 不对 21 /
end compute 不对 10 / end build 不对 0 / basic token 0（G12 次类，交用户决定）。

## 6. 建议的修复顺序（供 Lead 排期）

1. **先修 build 提取族**（G1 / G3a / G3b / G4 / G5 / G6 / G7 / G8 / G9 / G13，21 条）：改动集中在
   `statement-builder`、`function-declaration-shape`、`class-declaration-shape`、`heritage-clause-shape`、
   `binding-element-shape`、`expression-builder`、`type-builder`，彼此独立、可并行。
2. **再修 end 收口族**（G2a / G2b / G2c，15 条）：`IsAsiBoundary` 的判据与「块体也有终结点」是同一件事，
   建议一次设计、三处落地，避免根级与块级两套判据分叉。
3. **候选族**（G10 / G11，4 条）：装饰器前缀与 `using` 候选是纯 possible 层增量，风险最低。
4. **G12 等用户答复**：`declare` / `abstract` 孤立出现时是否要在 basic token 层就不升级。

**未归因清单**：无——41 份全部有归属。唯一不是「已定结论」的是 G12 的**归层**（possible 层兜底 vs basic token
层不升级），按硬规则交用户决定。
