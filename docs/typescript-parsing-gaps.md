# TypeScript 解析缺口核查报告

对当前提交 `b78fa3a` 的 `Dawn/Text` 做了一次缺口核查，回答一个问题：**离「完整解析 TypeScript」还差什么。**

核查时的仓库状态：`xl check` 123 文件 / 0 error / 0 warning，`npm run samples` 3/3 通过，`git status` 干净。
下面每一条都有最小复现与观测到的产物，不是推测。

## 0. 核查方法与总判断

| 手段 | 规模 |
| --- | --- |
| 分特性语法语料（每个构造一条最小样本） | 189 条，其中 3 条被 TypeScript 判定为非法 TS，不计入缺口 |
| 定向探针（把每条缺口逼到边界） | 276 条 |
| 真实语料 | 226 个 `.d.ts`（typescript/lib、@types/node、undici-types）+ 123 个本项目产物 `.ts` + 3 个样本 = 352 个文件 |
| 语法有效性基准 | `ts.createSourceFile(...).parseDiagnostics`（TypeScript 6 自带 parser），只有 TS 认为合法的样本才算缺口 |
| 可回归验收集 | [tests/parse/](../tests/parse/README.md)：844 条用例 + 缺口台账 + AST 差分引擎（见第 6、7 节） |

**总判断：不抛异常 ≠ 解析完整。** 352 个真实文件里只有 3 个抛错，看起来很好；
但真实语料里 **4538 个 interface 声明只产出 2855 个 `<Interface>` 节点，丢了 37%**，
而表达式层几乎没有任何结构。缺口分三层：

- **L1 硬失败**：直接抛异常，5 类；
- **L2 结构丢失**：能跑完，但节点缺失或错位——这是主战场；
- **L3 无校验 / 边界敏感**：非法输入被接受；缺一个文件尾换行就会改变产出。

顺带一提，`dawn/text/tokens/interface/interface.xl.md:286` 自己就写着
「字段明明已经读出来了却不渲染，**对「解析完整的 TypeScript」是个漏洞**」——
说明这个目标本来就是工程内的既定标准，本报告只是把它量化。

## 1. L1 硬失败（抛异常）

| 构造 | 最小复现 | 现象 | 根因 |
| --- | --- | --- | --- |
| do-while | `do {} while (1)` | **裸 `Error`**（不是 `SyntaxException`）：「while(...) 后需要跟语句」 | 没有 `DoWhile` 这一类；`do` 只在 `parse-pipeline.xl.md` 的关键字表里。规范目录下也不存在 `tokens/do-while.xl.md` |
| `\xNN` 转义 | `const a = "\x41"` | `SyntaxException` ← `Error`：未知转义字符 `\x(120)` | `tokens/string/translate.xl.md` 的 `DecodeClear` 没有 `x` 分支 |
| `\uNNNN` 转义 | `const a = "\u0041"` | 未知转义字符 `\u004` | 同上，没有 `u` 分支 |
| `\u{...}` 转义 | `const a = "\u{1F600}"` | 未知转义字符 `\u{1F` | 同上 |
| `new C<T>`（无实参表） | `const a = new Map<string, number>` | `SyntaxException`，且 **`Message` 是 `null`** | `new` 规则要求类型实参后必须跟括号 |

真实影响：`dist/ts` 里 3 个文件正是因 `\x` / `\u` 而整体解析失败——
`core/common-util.ts`、`dawn/text/tokens/string/const-string.ts`、
`dawn/text/tokens/string/translate.ts`（后者是**它自己生成的产物**）。
也就是说 `README.md:133` 那句「200 个真实 `.d.ts` 全部解析成功、零异常」是对的，
但它只覆盖 `.d.ts`：真实的 `.ts` 里写 `"\x41"` 就炸。

## 2. L2 结构丢失（按真实影响排序）

### 2.1 `namespace` / `declare global` 体内的声明全部不成形 —— 最大单一缺口

```ts
declare namespace N { interface I { a: number } }
```
产物里只有 `<Keyword>declare</Keyword><Keyword>namespace</Keyword><Common>N</Common><Bracket>…`，
**没有 `<Interface>`，也没有 `<Class>` / `<Function>` / `<Let>`**——体内所有子单元都停在 `Common` / `Symbol`。

- 根因有明确自述：`dawn/text/tokens/bracket.xl.md:52` ——
  「`Use("{")` **不设** `ReorganizationQueue`，而 `Use("(")` / `Use("[")` 会设……
  `{}` 里的子单元不跑重组」。类体 / 函数体 / 接口体之所以能成形，是因为它们各自 `CreateBody()`
  时挂了语句队列（`interface.xl.md:312-313`）；`namespace` 没有这样一段，于是体就是裸括号。
- **不一致点**：`declare module "a" { … }` 的体是 `JsonObject`，反而**会**解析。
  同样是「模块体」，字符串名会、标识符名不会。

用 TypeScript parser 逐条分类后，真实语料的丢失量可以精确归因：

| interface 声明（TS parser 判定） | 数量 |
| --- | --- |
| 总数 | 4538 |
| 在 namespace / declare global 体内 → 必定无节点 | **1456（占全部丢失的 87%）** |
| `extends X<...>` 形状 → 必定无节点 | 91（5%） |
| 模型预测应有节点 | 2991 |
| 实际产出节点 | 2855 |
| 预测误差 | −136（8%，主要是被单引号级联吞掉的，见 2.12） |

其余 71 个含 `namespace` 的 `.d.ts` 同理；`@types/node` 把绝大部分内容包在
`declare namespace NodeJS` 里，这就是 `globals.d.ts` 13 个 interface 只出 1 个节点的原因。

### 2.2 `interface … extends X<…>` 让整条 Interface 节点消失

```ts
interface I extends A<T> {}     // 无 <Interface>，整条退化成 Statement + Common/Symbol
interface I extends A {}        // 正常
interface I extends A, B {}     // 正常
interface I<T> extends A {}     // 正常
```
根因：`tokens/interface/interface.xl.md:119-143`，`extends` 名单的解析只接受 `Common`——
第一个名字之后若跟着 `GenericType`（`A<T>`），`Get(units, nextIndex)` 拿到的不是 `Bracket`，直接 `return -1`。
把 `extends` 名单的每一项改成「`Common` 可选跟 `GenericType`」即可。

这一条与 README 的表述有出入：`README.md:83` 声称支持
`interface I<T = {}> extends A, B { … }`，那种写法只是**恰好**每个父接口都没带类型实参。

### 2.3 生成器：`function*` 断成两截

```ts
function* g() {}          // → <Statement><Keyword>function</Keyword><Symbol>*</Symbol><MethodDeclaration …>
const g = function* () {} // 连 MethodDeclaration 都没有
class A { *m() {} }       // → Statement + Symbol * + MethodDeclaration（Modifiers 也丢了）
async function* g() {}    // 同样
```
`function` 与其后名字之间夹了一个 `*`，`FunctionReorganization` 就不再认这条声明。
真实语料里 12 个文件含 `function*`。

### 2.4 `class … extends` 后跟表达式 → Class 节点丢失

```ts
class A extends mixin(B) {}   // → <Keyword>class</Keyword><Common>A</Common>… <MethodDeclaration MethodName="mixin">
class A extends (B) {}        // → MethodDeclaration MethodName="extends"
class A extends B.C {}        // 正常
class A extends B<T> {}       // 正常
```
`cls-extends-expression` 这种 mixin 写法在真实代码里很常见。原因是 Class 规则只接受
「`extends` + Common（可带泛型实参）」，遇到调用形状的括号就把 `mixin(B)` 认成了方法声明。

### 2.5 `for await` → 没有 Foreach

```ts
async function f() { for await (const v of xs) {} }
// → <Keyword>for</Keyword><Keyword>await</Keyword><Bracket>(…)</Bracket><Bracket>{}</Bracket>
```
`await` 夹在 `for` 与 `(` 之间，`ForeachReorganization` 就匹配不上了。真实语料 6 个文件使用。

### 2.6 类型别名没有节点，类型字面量与对象字面量同形

```ts
type A = number        // → <TypeAssign><Common>type</Common><Common>A</Common><Symbol>=</Symbol>…
type B = { a: number } // → JsonObject，叶子是 Common/Symbol
const o = { a: 1 }     // → JsonObject，形状完全一样
```
- 没有 `TypeAlias` 节点，`type` 只是 `TypeAssign` 里的一个 `Common`；连续两条 `type` 还会被
  软换行串进**同一个** `TypeAssign`（`results-nl` 中 `ty-primitive` 两条合并）。
- 类型字面量与对象字面量不可区分——这正是 README「已知缺口」第 1 条，确认存在，但比它写的更宽：
  不是「成员没有节点」，而是**整个类型别名没有专属节点**。

### 2.7 类 / 接口成员形状

| 写法 | 产物 | 问题 |
| --- | --- | --- |
| `class A { "m"() {} }` | Statement + String + 两个 Bracket | string 方法名不成成员 |
| `class A { [k]() {} }` | Statement + JsonArray + Bracket | 计算属性名不成成员 |
| `class A { [k: string]: number }` | Statement + JsonArray + TypeDefine | index signature 不成成员 |
| `class A { x!: number }` | Statement + Common `x` + TypeDefine | **definite 断言 `!` 让 Field 消失**（`x?: number` 正常） |
| `abstract class A { abstract f(): void }` | Statement + Keyword `abstract` + Method + TypeDefine | 与 README 缺口第 2 条一致 |
| `class A { static { … } }` | Statement + Keyword `static` + Bracket | static 块无节点，README 已记 |
| `interface I { m?(): void }` | **`<TernaryOperator>`** | 可选方法签名被认成三元表达式，最意外的错位 |
| `interface I { (): void }` / `{ new (): void }` | Statement + Bracket + TypeDefine | call / construct signature 无节点 |
| `interface I { get x(): number }` | Keyword `get` + Method + TypeDefine | 与 README 缺口第 2 条同类 |
| `class A { m(a: string): void\n m(a: any) {} }` | 重载签名被塞进前一条的 `ReturnType` 里 | 重载不成节点 |

### 2.8 表达式层没有文法 —— 「完整解析」最本质的缺口

`a + b * c`、`f(g(x))`、`o.a.b`、`x = y` 这些**没有任何节点**，产物就是一条平铺的
`Common` / `Symbol` 序列；对象字面量 / 数组字面量是 `JsonObject` / `JsonArray`，
成员与元素同样只有平铺叶子。有结构的只有被**枚举出来的那几类**：三元、Lamda、New、Method 调用、
GenericType、NotNull（且 `!` 被刻意删掉，见 `tokens/not-null.xl.md:17`）、NullConditionalOperator。

所以严格说，这棵树目前是 **token 树 + 声明层结构**，不是 syntax tree。
「完整解析 TypeScript」的一半工程量在这里，而且是唯一无法用「加一条 Reorganization」解决的部分。

### 2.9 `export` 完全没有节点

```ts
export = A
export as namespace A
export * as ns from "x"
export { a as b } from "x"
export {}
export type { A } from "x"
```
以上全部退化成 `Keyword export` + `Symbol` / `Bracket` / `As` 的组合，没有 `Export` 节点
（`Import` 有节点，`Export` 没有）。声明上的 `export` 只能通过 `Class` / `Interface` 的
`Modifiers` / `IsExport` 间接看到。真实语料 12 个 `export =`、20 个 `export type`。

### 2.10 import 只有路径，没有结构；且缺尾换行时会重复出节点

- `Import` 只暴露 `From`，导入名、别名、`type` 前缀全在子单元里。
- **重复节点**：`import a from "x"`（文件以它结尾且**没有换行**）→
  `<Import>…</Import><Statement>…</Statement>`，同一段内容出现两次。
  根因在 `tokens/import.xl.md:59-70`：`endIndex` 初值是 `index`，只有循环里遇到
  `;` 或 `WrapSymbol` 才会更新；到文件尾都没遇到时，第 98 行的
  `ReplaceCountAt(units, index, endIndex - index + 1, result)` 只替换了 `import` 这一个词，
  其余单元既留在父级、又成了 `Import` 的子单元。
  带尾换行时不会重复（`Root.Data.length = 1`）。

### 2.11 赋值运算符表只覆盖 4 个

`core/syntax/templates/symbol-template.xl.md:29`：

```ts
## field CompoundAssignmentSymbols:Array<string> = ["+=", "-=", "*=", "/="]
```

于是另外 11 个被拆成错误的符号对（`+=` 那种「补一份左值」的处理不会发生）：

| 写法 | 产物 |
| --- | --- |
| `a %= 1` | `<Symbol>%</Symbol><Symbol>=</Symbol>` |
| `a **= 1` | `<Symbol>*</Symbol><Symbol>=</Symbol>` + 多余左值 |
| `a <<= 1` | `<Symbol>&lt;</Symbol><Symbol>&lt;=</Symbol>` |
| `a >>= 1` / `a >>>= 1` | `<Symbol>&gt;</Symbol><Symbol>&gt;=</Symbol>` / `>`,`>`,`>=` |
| `a &= 1` / `a \|= 1` / `a ^= 1` | 拆散 |
| `a &&= 1` / `a \|\|= 1` | 嵌套 `LogicalOperator` |
| `a ??= 1` | `<Symbol>??</Symbol><Symbol>=</Symbol>` |

注：`a += 1` → `a` `=` `a` `+` `1` 是**刻意**的（`compound-assignment-operator.xl.md:15-24`，
为了给执行层留一份可单独取出的运算符符号），不算缺陷。

### 2.12 词法层的缺口

| 写法 | 产物 | 说明 |
| --- | --- | --- |
| `'x'` | `<Symbol>\'</Symbol><Common>x</Common><Symbol>\'</Symbol>` | **单引号字符串根本不成为字符串**（本项目只实现 `"` / `@"` / `$"` / `"""`）。真实语料 125 个文件含 `'` |
| `import x from './a'` | `Import` + `Symbol` `.` + **`RegexToken`** | 单引号里的 `/` 触发正则词法，把**后面整条声明吞掉**：`import x from './a'` 之后的 `interface C {}` 无节点。`'abc'`（无 `/`）则不影响——这解释了 undici-types 里 `cache.d.ts` / `webidl.d.ts` / `websocket.d.ts` 三个文件节点数为 0 |
| `` `x` `` | `Symbol(反引号)` + `Common` + `Symbol(反引号)` | 模板字符串不是 `String` 也不是任何节点 |
| `` `a${b}c` `` | Symbol + Common + `$` + `JsonObject` | 内插被当成对象字面量，README 已记「产物不对」——实际比它写的更彻底 |
| `class A { #x = 1 }` | `<Symbol>#</Symbol><Common>x</Common>` | 私有名不成 Field；**行首** `#x` 更会变成 `<PreprocessorDirectives>x = 1</PreprocessorDirectives>`（`#` 是预处理指令前缀）。真实语料 60 个文件含 `#` |
| `const a = 1_000` | `Common(1)` + `Symbol(_)` + `Common(000)` | 数字分隔符不成词；`0xFF_FF`、`1_000.5` 同样。12 个真实文件使用 |
| `const a = .5` | `Symbol(.)` + `Common(5)` | 前导小数点不成词 |
| `const \u0061bc = 1` | `Symbol(\\)` + `Common(u0061bc)` | 标识符里的 `\u` 转义不支持 |
| `/ab+c/gi` | `<RegexToken/>`，**flags 不见**（`d` 会让 `dgimsuy` 断成 `Common`） | RegexToken 不承载正文与 flags；`/[/]/` 断成 `RegexToken` + `]` + `RegexToken` |
| `return /a/` | `Symbol(/)` + `Common` + `Symbol(/)` | `return` 之后的同行正则不识别（换行之后反而识别） |
| `"\101"` | `ConstString` 内容 `\u000101` | 八进制转义解错 |

### 2.13 装饰器必须跟在软换行之后

```ts
@d class A {}        // 坏：DecoratorName="d.class.A" + JsonObject，Class 节点丢失
@d
class A {}           // 好
class A { @d m() {} }   // 坏：Decorator DecoratorName="d.m" + JsonObject
class A { @d x = 1 }    // 坏：Decorator + Statement（Field 丢失）
@(expr) class A {}      // 坏：@ 只是 Symbol
```
参数装饰器 `m(@d() p: T)` 反而正常。真实语料 131 个文件含装饰器。

### 2.14 标签

`outer: while (...) {}` 正常（`<Label LabelName="outer" />` 标记节点）；
但 `outer: { break outer }` 无 `Label`，`outer: x = 1`、`outer: var x = 1` 被吞进 `TypeDefine`。
README 缺口第 3 条确认，并补充：**块语句上的标签完全不识别**。

### 2.15 其余零散项

- `with (o) { a = 1 }`：`with` 只是 Keyword，体内不跑语句队列（与 2.1 同根）。
- `using res = open()` / `await using`：不支持，落成 Common。
- `enum E { A = 1 }`：只有 `Enum` + `EnumBody`，成员没有节点（一堆 `Common` + `Symbol(,)`）。
- 类型谓词 `x is T`、`asserts x is T`：`ReturnType` 里是平铺 Common。
- 类型位关键字不一致：`type A = keyof T` 里 `keyof` 是 `Common`，mapped type 里是 `Keyword`；
  `typeof` / `readonly` 同样。
- `type A = import("./x").B` → `<Method MethodName="import">`；`abstract new () => A` 不识别；
  mapped type 的 `as` 重映射、`` `a${string}b` `` 模板字面量类型、`infer U extends X` 都只是勉强的
  Symbol/JsonObject 组合。
- `type F = (a: number) => void`：有时是 `Bracket` + `Symbol(=>)`，有时（如 `type A<in T> = (x: T) => void`）
  变成 **`<Lamda>`**——函数**类型**被当成箭头函数**值**。类型/值不分。
- `const a = <string>x`（尖括号断言）：只是 `Symbol(<) Common Symbol(>)`。
- JSX/TSX：`<div a="1">x</div>` 里 `/div>` 被吃成 `RegexToken`（README 第 5 条确认，且是**静默错解**而非报错）。

## 3. L3 无校验 / 边界敏感

**非法输入被接受**（不抛错、产物像合法一样）：

| 输入 | 产物 |
| --- | --- |
| `class {` | `<Keyword>class</Keyword><Bracket>{}</Bracket>` |
| `f(` | `<Method MethodName="f"></Method>` |
| `const a = "x`（未闭合字符串） | 正常的 `<String>` |
| `/* x`（未闭合注释） | `<AreaAnnotation> x</AreaAnnotation>` |
| `let a = = 1` | 两个 `Symbol(=)` |
| `}` | `<Symbol>}</Symbol>` |
| `` const a = `x `` | Symbol + Common |

**抛错类型不统一**：`do-while`、`if (a)`、`while (a)` 抛**裸 `Error`**（不是 `SyntaxException`），
`new Map<string, number>` 抛 `Message` 为 `null` 的 `SyntaxException`。
`cjcli` 只有 `SyntaxException` 分支能给出带 `^` 的位置，裸 `Error` 会退化成一行业务文本。

**EOF 敏感**：189 条语料里有 **28 条**在「文件尾有没有换行」下产物不同——
因为多条规则把尾随 `WrapSymbol` 当成声明/语句终止符。
最典型的是 2.10 的 import 重复节点；`ty-*` 的类型别名合并、`ex-ternary` 的三元吞掉下一条声明也属此类。
用 cjcli 跑文件时通常无感（源文件一般以换行结尾），但作为库调用（`TextDocument` 直接喂字符串）就会碰上。

**ASI 边界**（大多数情况是对的，少数几处合并）：

| 输入 | 结果 |
| --- | --- |
| `f()\ng()`、`x = 1\ny = 2`、`a + b\nc + d`、`a[0]\nb[1]`、`return\n1` | 正确分成两条语句 |
| `a?.b\nc?.d` | **合成一条**（`NullConditionalOperatorReorganization` 的前向断点表没有软换行，见 `tokens/null-conditional-operator.xl.md:54-80`） |
| `a\n++b` | **合成一条**（TS 的受限产生式要求此处断句） |
| `const a = 1\n`x`` | **合成一条**（模板字符串不成词，软换行就不成边界） |

**BOM 只有命令行入口剥**：`cjcli.xl.md:275-284` 的 `CjcliStripBom` 负责，`TextDocument` 不负责——
直接用库 API 解析带 BOM 的文件，首个 token 会变成 `\uFEFFlet`。

## 4. README「已知缺口」逐条核对

| README 第 123-135 行的说法 | 核对结果 |
| --- | --- |
| 1. `type X = { a: number }` 里没有成员节点 | **确认**，但低估：整个类型别名都没有节点，且与对象字面量同形（2.6） |
| 2. 无方法体的成员声明与 `;` 收尾的调用同形；`static { }` 无节点 | **确认**（2.7）；补充 `x!: number`、string/计算属性名、index signature、重载签名也丢节点 |
| 3. `Label` 只是标记节点，不含被标的语句 | **确认**（2.14）；补充块语句标签完全不识别、非循环语句标签被 `TypeDefine` 吞 |
| 4. 模板字符串与 `$"…"` 走老路径，产物不对 | **一半要修正**：`$"a{1}b"` 其实正确产出了 `<String>` + `<InterpolationString>`；模板字符串则根本不是 `String` 节点（2.12） |
| 5. JSX / TSX 没有支持 | **确认**，且是静默错解成 `RegexToken` |
| 6. 200 个真实 `.d.ts` 全部零异常；打包 `typescript.js` 会炸 | **`.d.ts` 部分确认**（我跑 226 个，0 异常）；但「零异常」掩盖了 37% 的节点丢失，且真实 `.ts` 有 3 个因转义字符抛错（第 1 节） |

README 未记录、本次新增的主要缺口：第 2.1（namespace 体）、2.2（`extends X<…>`）、
2.3（生成器）、2.4（`extends` 表达式）、2.5（`for await`）、2.8（表达式无文法）、2.9（export 无节点）、
2.10（import 重复）、2.11（赋值运算符表）、2.12（单引号/模板/`#`/数字分隔符/正则）、2.13（同行装饰器）、
以及第 3 节全部。

## 5. 建议优先级

| 优先级 | 项 | 理由 |
| --- | --- | --- |
| **P0** | 2.1 namespace / declare global 体挂语句队列 | 一项覆盖真实语料 87% 的 interface 丢失；改法与 `InterfaceBody` / `ClassBody` 同型，是既有模式 |
| **P0** | 2.2 `interface … extends X<…>` 接受泛型实参 | 一处 `instanceof Common` 判定，91 个真实声明 + 语义正确性 |
| **P0** | L1 的 `\x` / `\u` 转义 | 直接让真实 `.ts` 文件解析失败（含本项目自己的产物） |
| **P0** | L1 的 do-while | 唯一「合法 TS 直接抛裸 Error」的语句 |
| **P1** | 2.12 单引号字符串、模板字符串 | 词法层，130+ 真实文件受影响；单引号还会引发正则误吞后续声明 |
| **P1** | 2.3 生成器、2.4 `extends` 表达式、2.5 `for await` | 都是「声明头被一个符号打断」，改动集中 |
| **P2** | 2.7 成员形状、2.9 `export` 节点、2.11 赋值运算符表、2.13 同行装饰器 | 影响面大但改动分散 |
| **P3** | 2.8 表达式文法 | 工程量最大，且是「完整」二字的核心；建议先明确产出契约（要不要真正的 AST）再动工 |
| **P3** | 第 3 节：非法输入校验、统一异常类型、去掉 EOF 敏感 | 属健壮性与契约，与语法覆盖正交 |

## 6. 验收集：把缺口变成可回归的事实

上面这些结论原本只是一次性审计的产物。现在已经落成仓库里的可回归验收集
[tests/parse/](../tests/parse/README.md)：

```
tests/parse/
  cases/<area>/<id>.ts   844 条用例（7 个 area：declarations/statements/expressions/types/modules/lexical/ambiguous）
  known-gaps.json        已知缺口台账：133 条在案用例 + 10 条标签表表达不了的缺口（_notes）
  validate.mjs           用例体检：TS 是否合法、标签是否在标签表内、是否意外带 BOM、id 是否重复
  run.mjs               用例对解析器，与台账比对
  differential.mjs       用 TypeScript 自带 AST 做差分，自动找没写用例的缺口
  suggest.mjs            用 AST 找出「用例里有这个构造却没钉住」的用例
```

```bash
npm run cases:check    # 用例体检：844 条用例 → 0 条不合格
npm run cases:run      # 用例对解析器：通过 711，台账内缺口 133，新增/过期 0
npm run cases:diff     # 差分：不依赖期望值，直接比源码构造数与产物节点数
```

三条设计约定，都是为了「让它持续往完整解析推进」：

- **台账是一份逐步清空的清单。** 失败且不在台账 → `NEW GAP`（新缺口或回归）；
  成功且在台账 → `STALE`（修好了，必须把条目删掉）。所以「能不能完整解析 TypeScript」
  等价于 **`known-gaps.json` 变成 `{}`**，进度可度量。
- **期望值写「TypeScript 正确解析该有的结构」，不写「当前产物长什么样」**，
  并且只允许用标签表里的标签——`validate.mjs` 会拦住 `Const`、`Return`、`BlockToken`、`NotNull`
  这类「看着合理但产物里不存在」的标签，避免把假缺口写进台账。
- **标签表表达不了的缺口记进台账 `_notes`**（见下），不让它们伪装成用例。

## 7. 差分引擎：全量真实语料的量化

`differential.mjs` 不依赖任何手写期望值：它用 TypeScript 的 AST 数出「源码里有几个这种构造」，
再数产物里有几个对应节点，并对没产出节点的构造自动归因（顶层 / namespace 体内 / 哪种容器）。
在 352 个真实文件（226 个 `.d.ts` + 123 个本项目产物 `.ts` + 3 个样本）上：

| 标签 | 源码构造 | 产物节点 | 差额 | 构造明细 |
| --- | ---: | ---: | ---: | --- |
| `Field` | 28798 | 8751 | **20047** | PropertySignature=18929 PropertyDeclaration=1085 MethodSignature=8682 IndexSignature=102 |
| `MethodDeclaration` | 2643 | 601 | **2042** | MethodDeclaration=2525 GetAccessor=86 SetAccessor=32 |
| `Interface` | 4539 | 2856 | **1683** | InterfaceDeclaration=4539 |
| `Let` | 3170 | 2194 | 976 | VariableDeclaration=3170 |
| `Function` | 2039 | 1072 | 967 | FunctionDeclaration=2039 |
| `Class` | 347 | 277 | 70 | ClassDeclaration=347 |
| `Enum` | 79 | 13 | 66 | EnumDeclaration=79 |
| `Import` | 1017 | 1008 | 9 | ImportDeclaration=1017 |

标签表里**根本没有对应节点**的构造（结构性缺口，不是 bug）：

| 构造 | 出现次数 |
| --- | ---: |
| `TypeAliasDeclaration` | 1302 |
| `ConstructSignatureDeclaration` | 1190 |
| `ModuleDeclaration` | 327 |
| `CallSignatureDeclaration` | 165 |
| `ExportDeclaration` | 92 |
| `ExportAssignment` | 50 |

自动归因把每一处丢失都指到了具体上下文，例如：

- `[MethodSignature] interface 体` 106 处 —— 接口里的方法签名拿不到 `Field`（对应的 `init?(...): void` 这类）；
- `[MethodDeclaration] 类体` 78 处 —— **类里没有方法体的重载签名**（`calls(exact?: number): () => void;`）整条不成 `MethodDeclaration`，正是 README 缺口第 2 条，现在有了数量；
- `[VariableDeclaration] / [FunctionDeclaration] / [InterfaceDeclaration] / [ClassDeclaration] namespace 体内` 共 139 处 —— 全部由「namespace 体不跑重组队列」这一个根因连累。

## 8. 扩充到 844 条用例后新发现的问题

扩用例本身又挖出一批上面没记的东西：

| 新发现 | 证据 |
| --- | --- |
| 变量声明的修饰词整体丢失 | `export const a = 1` 与 `const a = 1` 产物完全相同（`<Let fieldName="a" />`），`const` / `export` 都看不到；`Let` 没有 Modifiers 属性 |
| 保留字当方法名会被当成语句 | `class A { if() {} }` → `IfSet` / `IfCondition` / `IfStatement`，没有 `MethodDeclaration` |
| 匿名 `export default class {}` / `export default function () {}` | 无 `Class` / `Function` 节点（具名版本正常） |
| `export type T = ...` | 无 `TypeDefine` |
| re-export 没有 Import 节点 | `export * from` / `export * as ns from` / `export { a as b } from` / `export type {} from` 全都没有 |
| 泛型类型别名整条不成形 | **每一个** `type X<T> = ...` 都拿不到 `TypeAssign`（非泛型别名正常） |
| 对象类型字面量的**属性**签名不成 `TypeDefine` | 而 index signature 却成——同一容器里两种成员两种结果 |
| `import.meta.url` 被误当 import 语句 | 产物里出现 `Import` 节点（唯一一处 `absent: Import` 被触发） |
| 条件类型被当成三元表达式 | 嵌套 / 加括号 / 位于泛型实参里的条件类型都产出 `TernaryOperator`（基础形式反而不产出） |
| BOM 会污染第一个 token | `lex-bom.ts`（真的带 BOM）：`const a = 1;` 的第一行并成一个 `Common`，`Let` 不出现——`TextDocument` 不剥 BOM，只有 `cjcli` 剥 |
| 类型位关键词不升级 | `keyof` / `typeof` / `readonly` / `this` / `void` / `is` / `asserts` 在类型位置多是 `Common`，同一个词在别的上下文又是 `Keyword` |

两条**不是缺口**、但值得记下来别误修：

- `a && b || c ?? d` 本身是 TS 语法错误（TS5076，`||` 与 `??` 不能不加括号混用）；
- `[KEY + "m"](){}` 在类体里是真正的 TS 语法错误（计算属性名只接受标识符/字符串/数字/模板字面量）；
  另外 TypeScript 6.0.3 自己的 parser 会拒绝「计算字段后面紧跟模板字面量计算方法」这个形状
  （`[`m`](){}`），我们按「非法用例」登记，没有当成解析器的错。

## 9. 复现方式

验收集在仓库内，直接跑（脚本调用 `build/ts` 下的编译产物，跑之前先 `npm run build`）：

| 命令 | 作用 |
| --- | --- |
| `npm run cases:check` | 用例体检（TS 合法性、标签表、BOM、id 唯一） |
| `npm run cases:run` | 用例对解析器 + 台账比对；`--verbose` 打产物，`--json` 出结构化结果，`--adopt` 写台账 |
| `npm run cases:diff` | 差分找缺口；`real` / `cases` 选语料，`--top N` 控样本数 |
| `node tests/parse/suggest.mjs` | 找出「用例里有构造却没钉住」的用例（`--apply` 写回） |

最初那次审计用的一次性脚本仍在 `%TEMP%\xl-ts-gap`（189 条语料的 `corpus.txt`、
`micro*.cjs` 定向探针、`probe3-6.cjs` 定点验证、`sweep.cjs`/`fidelity.cjs`/`account.cjs` 量化），
它们已经转化为 `tests/parse/cases` 下的基线用例（`vars-`/`fn-`/`cls-`/`itf-`/`enum-`/`ty-`/`ns-`/`im-`/`ex-`/`st-`/`lx-`/`am-` 前缀）。

## 10. 修复进度

### 第 1 轮：三条 P0（已修，均可回归验证）

| 缺口 | 改动 | 验证 |
| --- | --- | --- |
| **namespace / declare global 体不成形**（真实语料 87% 的 interface 丢失都源于此） | 新增 `dawn/text/tokens/namespace/namespace.xl.md` + `namespace-body.xl.md`：`Namespace` 认下 `namespace N` / `module M` / `declare global` / `global {` 四种形状，`NamespaceBody` 在构造时挂语句队列（与 `InterfaceBody` / `ClassBody` 同款），规则注册进 `parse-pipeline` 的通用重组队列 | `namespace N { interface I {} }` → `<Namespace><NamespaceBody><Interface>…`；`@types/node/buffer.d.ts` 的 Namespace 2/2、Function 6/6、Let 7/7、Class 2/2 |
| **`interface … extends X<…>` 整条节点消失** | `interface.xl.md` 新增 `SkipExtendsName` / `ExtendsNameText` / `TakeExtendsTypeArguments`，extends 名单支持「限定名 + 类型实参」；`generic-type.xl.md` 的 `IsTypePosition` 把 `.` 与 `,` 改成透明——否则 `<T>` 会退回比较符号 | 8 种 extends 形状全部产出 `Interface`，`ExtendsInterfaceNames` 正确（含 `a.b.Base`、`A<B<string>, C[]>`） |
| **`\xNN` / `\uNNNN` / `\u{…}` 直接抛错** | `translate.xl.md`：`Append` 按 TS 词法收 3 / 5 / 到 `}` 个字符；`DecodeClear` 支持 `x`、`u{…}`（含手工代理对）与「未知单字符原样返回」；新增 `IsHexText` 严格判十六进制，堵掉 `"\u00"` 静默产出 NUL 的路径 | 16 条转义探针全绿；**真实语料解析失败数 3 → 0** |

### 量化变化（同一批 352 个真实文件，差分引擎实测）

| 标签 | 修复前节点数 | 修复后节点数 | 差额 |
| --- | ---: | ---: | --- |
| `Interface` | 2856 | **4207** | 1683 → 332 |
| `Function` | 1072 | **1815** | 967 → 224 |
| `Let` | 2194 | **3117** | 976 → 129 |
| `Class` | 277 | **329** | 70 → 24 |
| `Enum` | 13 | **71** | 66 → 8 |
| `Field` | 8751 | **12559** | — |
| `Namespace`（新标签） | — | **180** | — |
| 解析失败文件数 | 3 | **0** | — |

用例侧：**通过 683 → 726，在案缺口 133 → 118**（本轮净清 15 条；另有 28 条用例补上了 `Namespace` / `NamespaceBody` 期望，把新能力钉住）。

### 顺带修掉的两个工具缺陷

差分引擎此前把「所有可数构造」都列成「未产出节点」，还把共享同一标签的构造按文档顺序取样，
于是把「方法签名没成节点」误报成「属性签名没成节点」。现在改成
**按文件算标签差额、再按 TS 构造种类轮流取样**，并区分字符串模块体（`declare module "x"`）与命名空间体的归因。

### 下一轮目标（归因已精确到行）

1. **没有方法体的签名**：接口方法签名 185 处不成 `Field`（`init?(…): void`）、类内重载签名 211 处不成 `MethodDeclaration`（`calls(exact?: number): () => void;`）——同一个根因：成员规则要求后面跟方法体或括号。
2. **类型别名与类型位**：`TypeAliasDeclaration` 1302 处没有对应节点，构造签名 1190 处、调用签名 165 处同样没有；类型位关键词（`keyof` / `typeof` / `readonly` / `this` / `asserts`）不升级。
3. **装饰器与同行写法**、**单引号 / 模板字符串词法**（后者还会连带吞掉后续声明）。

### 第 2 轮：成员签名 + do-while + 产物合法性（已修）

| 缺口 | 改动 | 验证 |
| --- | --- | --- |
| **没有方法体的成员签名**（接口方法签名 185 处、类内重载签名 211 处） | `method-declaration.xl.md`：新增 `IsMemberSignature` 与 `SignatureTailEnd`；`ParameterIndex` 支持可选标记 `?`；`Process` 在无体时取「返回类型末尾 + 一个 `;`」并跳过 `MethodBody`。判据是**父单元**是 `ClassBody` / `InterfaceBody`——语句位置仍然要求 `{`，`foo(a);` 不会变成假声明 | 接口方法签名、可选签名 `m?<T>()`、类内重载签名全部产出 `MethodDeclaration`；真实语料 `MethodDeclaration` 节点 **626 → 10963**（差额 2048 → 403） |
| **可选标记后的类型参数** `m?<T>()` | `generic-type.xl.md` 的名字闸加一条：最后一个是 `?`、它前面是 `Common` 时也算数。不加这条 `<T>` 退回比较符号，整条签名被三元表达式抢走 | `interface I { m?(): void; n?<T>(x: T): T }` 现在产出两个 `MethodDeclaration`（此前 `n` 被吞进 `m` 的返回类型） |
| **`do…while`**（唯一还抛裸 `Error` 的语句） | 新增 `dawn/text/tokens/do-while/do-while.xl.md`：`DoWhile` 收 `do` 语句 `while` `(条件)` `;`，体段复用 `WhileBody`、条件段复用 `WhileCompare`；体的结尾按「必然紧跟的那个 `while` 词」定位（`do x++` 换行 `while (…)` 这种 ASI 写法此前的报错就出在这里） | 4 种形状（带块体 / 单语句 / 带分号 / 换行体）全部产出 `DoWhile` |
| **`new A` / `new A<T>` / `new a.b.C` 抛 `SyntaxException`（且 `Message` 为 null）** | `new.xl.md` 的 `Process` 改成「走到边界」而不是「找第一个括号」：实参表可选，没有时产出空 `NewArguments` | 9 种 `new` 形状全部成形；顺带修掉 `const b = new A` 换行 `const c = new B()` 会把后一条的括号当自己实参表的**误吞** |
| **注释里的 `<` 产出不合法 XML** | `line-annotation.xl.md` / `area-annotation.xl.md` 的 `ToXmlString` 过 `CommonUtil.XmlDecode`（原来刻意不转义） | `// a < b`、JSDoc 里的 `Array<T>` 不再破坏 XML |
| **跑分器缺少产物合法性检查** | `run.mjs` 增加不变量：XML 里每个 `<` 后面必须跟 `/` 或大写字母，否则记 `malformed-xml` | 修完 12 条命中；它还顺带暴露了一个**假通过**——`lex-bom` 用例此前之所以「通过」，是因为它自己的注释里写了 `<Let>`，未转义的原文满足了 `expect Let` |

第 2 轮量化变化（同一批 352 个真实文件）：

| 标签 | 第 1 轮末 | 第 2 轮末 |
| --- | ---: | ---: |
| `MethodDeclaration` | 601 | **10963** |
| `Namespace` | 180 | 200 |
| 解析失败文件数 | 0 | **0** |

用例侧：**通过 726 → 732，在案缺口 112 → 110**；更重要的是 **台账里的 `throw` 分组归零**——
844 条合法 TypeScript 用例里**没有任何一条再抛异常**，剩下的 110 条全是结构缺口（节点缺失或错位）。

### 下一轮目标

1. **类型别名**：`TypeAliasDeclaration` 1302 处没有任何节点，泛型别名连 `TypeAssign` 都形不成（9 条用例）——
   这是现在最大的一块。
2. **类型字面量的成员**（`type X = { a: number }`）与**调用 / 构造签名**（`interface I { (): void; new (): I }`）。
3. **单引号字符串与模板字符串词法**（8 + 6 条用例；单引号里出现 `/` 还会吞掉后续声明）。
4. **标签**：块语句标签（`outer: { … }`）不识别、标签节点不含被标的语句（5 条用例）。

### 第 3 轮：类型别名 + 单引号字符串（已修）

| 缺口 | 改动 | 验证 |
| --- | --- | --- |
| **泛型类型别名整条不成形**（`type Box<T> = …`，`@types` 里 112 处） | `type-assign.xl.md`：`Previous` 允许名字与 `=` 之间夹一段 `GenericType`；`Process` 新增 `AliasEnd`，并加 `AliasName` / `Modifiers` 两个属性（`type` 与名字不再留作散单元） | `type B<T>` / `type C<T extends X = Y>` 全部产出 `TypeAssign`；9 条 `type-param-*` 用例转绿 |
| **相邻别名被并成一个 `TypeAssign`** | 同一个 `AliasEnd`：`;` 或「软换行 + 下一行是声明关键字」就是结尾。原来「找不到 `;` 就收到列表末尾」会把 `type A = number` 换行 `type B = string` 并成一条；同时**不能**见到换行就停，否则 `type X =` 换行 `\| A` 换行 `\| B` 的联合会截断 | 连续 3 条别名产出 3 个节点；多行联合仍是 1 个 |
| **单引号字符串不是字符串**（连带吞掉后续声明） | `parse-pipeline.xl.md` 的 `Install` 补上**一直缺失的调用点** `BranchTemplate.AddModifyItem(StringGuideBranch, ExtendStringStarts)`：机制（`SequenceTemplate.AddModifyItem` / `AddStringChar`）早就写好、散文也写了，但没有人调用，于是单引号从来没进「字符串起点」集合 | `'x'` → `String` + `ConstString`；`'a/b'` 不再触发正则词法；`import … from './a'` 之后的声明照常成形 |

第 3 轮量化变化（同一批 352 个真实文件）：

| 标签 | 第 2 轮末 | 第 3 轮末 | 差额 |
| --- | ---: | ---: | --- |
| `Interface` | 4243 | **4373** | 296 → 166 |
| `MethodDeclaration` | 10964 | **11197** | 404 → 172 |
| `Field` | 12657 | **13331** | — |
| `TypeAssign` | 1186 | **1238** | 116 → 64 |
| `Function` | 1827 | **1848** | 212 → 191 |
| `Let` | 3200 | **3242** | 92 → 50 |
| `Class` | 331 | **353** | 24 → 2 |
| `Namespace` | 200 | **212** | 12 → **0** |
| `Enum` | 71 | **79** | 8 → **0** |
| 解析失败文件数 | 0 | **0** | — |

单引号那一条的影响面比它看上去大得多：`undici-types` 的一批文件（`fetch.d.ts` / `dispatcher.d.ts` /
`webidl.d.ts` / `retry-handler.d.ts` …）此前因为 `import … from './x'` 里的 `/` 触发正则词法，
**整个文件后半段都不成形**；补上调用点后这些文件的 interface / class / function / alias 一起回来了。

用例侧：**通过 726 → 734，在案缺口 110 → 100**；台账里的 `throw` 分组仍然是 0。

### 下一轮目标

1. **调用签名 / 构造签名**（`interface I { (): void; new (): I }`，真实语料 1355 处）与
   **类型字面量的成员**（`type X = { a: number }`）——现在最大的两块结构性缺口。
2. **模板字符串**：把反引号注册成字符串起点，并让 `${…}` 走内插路径（`String` 已支持内插，缺的是 `$` + `{` 那一路）。
3. **标签**：块语句标签（`outer: { … }`）不识别、`Label` 不含被标的语句（5 条用例）。
4. **`export` 节点**（92 + 50 处）与 **EOF 敏感**（`import` 结尾无换行时会重复出节点）。

### 第 4 轮：下划线不是符号（一行改动，影响面最大的一条）

| 缺口 | 改动 | 验证 |
| --- | --- | --- |
| **标识符里的 `_` 被当成符号** | `core/syntax/templates/symbol-template.xl.md` 的内置符号表里**删掉 `case "_"`** | `interface A_b { … }` 从「整条消失」变成正常成形；`lex-ident-underscore-*` 8 条新用例转绿 |

`Common` 的 `IsAppend` 判据是「不是符号、也不是空白」，所以 `_` 一旦算符号，
**任何带下划线的标识符都会被拆成 `Common(A)` `Symbol(_)` `Common(b)` 三段**；
接口规则要求「名字之后紧跟 `{`」，第二段是符号，于是整条声明不成形。
这是本轮之前所有「渐进式丢失」的主因——文件越长、下划线标识符越多，丢得越多
（`lib.dom.d.ts` 里 1540 个接口有 38 个直接消失、6496 个接口属性少 1342 个）。

一行改动的量化效果（同一批 352 个真实文件）：

| 标签 | 第 3 轮末 | 第 4 轮末 | 差额变化 |
| --- | ---: | ---: | --- |
| `Field` | 13331 | **14827** | 6794 → 5298 |
| `Function` | 1848 | **2034** | 212 → **5** |
| `Interface` | 4373 | **4502** | 166 → 37 |
| `MethodDeclaration` | 11197 | **11257** | 172 → 112 |
| `TypeAssign` | 1238 | **1283** | 64 → 19 |
| `Let` | 3242 | **3244** | 50 → 48 |
| `Class` | 353 | **354** | 2 → 1 |
| `Namespace` / `Enum` | 212 / 79 | 212 / 79 | 0 / 0 |

**这一轮暴露了用例集的盲区**：844 条用例里**没有一条**用带下划线的标识符，
所以这套 bug 对用例集完全不可见（改前改后都是 744 通过）。
是**差分引擎**把它揪出来的——这正是「不依赖手写期望值」那一半的价值。
事后补了 8 条回归用例（`lex-ident-underscore-*`：接口 / 类 / 函数 / 变量 / 别名 / 单个 `_` / 解构 / 名字各个位置）。

顺带发现同类缺口：**`$` 也是标识符字符**（`const $x = 1`、`interface I$X { … }`），
但 `$` 同时是 `$"…"` 内插的前缀（`StringGuide` 靠回退这个字符实现前缀识别），
改它要一起动内插逻辑，所以本轮只登记（2 条用例 + 台账 `_notes.dollar-ident`），不动手。

用例侧：**844 → 854 条（新增 10 条）**，在案缺口 100 → 102（新增的 2 条正是刚发现的 `$` 缺口），
台账里的 `throw` 分组仍然是 0。

### 下一轮目标

1. **调用签名 / 构造签名**（真实语料 1355 处没有节点）与**类型字面量的成员**（`Field` 差额的主要来源）。
2. **`$` 标识符**：与内插前缀一起处理（内插路径正好也是模板字符串要用的那一条）。
3. **模板字符串**：反引号 + `${…}`。
4. **标签**（`outer: { … }`）与 **`export` 节点**（142 处）。

### 第 5 轮：成员签名（调用 / 构造签名）

| 缺口 | 改动 | 验证 |
| --- | --- | --- |
| **无名的调用签名与构造签名没有任何节点**（`interface I { (): void }` / `new (): I`，真实语料 1355 处） | 新增 `dawn/text/tokens/signature/signature.xl.md`：`Signature` 收两种形状，靠 `Kind`（`call` / `construct`）区分；参数表进子单元、返回类型单独成 `ReturnType` 段；规则注册在 `MethodDeclaration` **之前** | `lib.es5.d.ts` / `@types/node` 里 interface 内的签名全部成形（真实语料 514 处）；7 条既有用例补上 `Signature` 期望 |

三处「只能是这么写」的取舍，都写进了规范：

- **规则必须排在 `MethodDeclaration` 之前**：重组是**按规则轮询**的（每条规则扫一遍所有下标），
  `MethodDeclaration` 排在前面时会先把 `(a: number): string` 换行 `(a: string): number` 里的类型名 `string`
  当成方法名收走（`string(` 看起来就是「名字 + 括号」），前一条无名签名于是再也拼不回来。
- **与前一个单元的分工看「紧挨着的前一个」（不跳软换行）**：`m(): void` 里 `m` 与 `(` 相邻 → 方法声明；
  `… : number` 换行 `(): void` 里 `(` 前面是软换行 → 新的一条成员。`rename?(a): void` 还要再往后看一格
  （`?` 前面才是方法名），否则可选方法签名会被拆成「`rename` + `?` + 一个无名签名」。
- **`new` 与括号之间的类型参数段要搬进节点**：`new <T>(x: T): T` 的 `<T>` 不搬就会从产物里整个消失
  （这条是既有用例 `decl-interface-construct-signature-generic` 报出来的）。

第 5 轮量化（同一批 352 个真实文件）：

| 标签 | 第 4 轮末 | 第 5 轮末 |
| --- | ---: | ---: |
| `Signature`（新标签） | — | **514**（差额 1355 → 841） |
| 标签表里没有节点的构造 | 1355（调用 + 构造签名） | **0**（签名有标签了） |

剩下的 841 处签名差额**全部在类型字面量里**（`const x: { new (): T }`、`type F = { (): void }`），
那是类型字面量成员那条缺口的一部分（`Field` 差额 5300 也是它）——下一轮一起做。

用例侧：**854 条不变**（7 条既有用例补上 `Signature` 期望，2 条类型字面量的用例按边界回退），
在案缺口 102 → 103（新标签带来的登记变化），台账 `throw` 分组仍然是 0。

### 下一轮目标

1. **类型字面量**（`type X = { a: number }` / `const x: { new (): T }`）：让处于**类型位**的 `{ }`
   有自己的成员体（成员 → `Field`、签名 → `Signature`），同时保持对象字面量（值位）不变。
   一项同时覆盖 `Field` 差额 5300 与 `Signature` 差额 841，是现在最大的一块。
2. **`$` 标识符**与**模板字符串**（共用 `$` + `{` 内插路径）。
3. **索引签名**（`[key: string]: number`，86 + 14 处）——它是 `[` 开头的形状，与 Json 数组同源。
4. **标签**（`outer: { … }`）与 **`export` 节点**（142 处）。

### 第 6 轮：类型字面量 + 字符串字面量成员名

| 缺口 | 改动 | 验证 |
| --- | --- | --- |
| **类型字面量的成员没有节点**（`type X = { a: number }`，`Field` 差额 5300 的主因） | 新增 `dawn/text/tokens/type-literal/`：`TypeLiteral` + `TypeLiteralBody`；`TypeLiteralReorganization` 排在 `JsonObjectReorganization` **之前**，把**类型位**的 `{ }` 认走，体内跑成员规则；`Field` / `MethodDeclaration` / `Signature` 的成员位置判据加上 `TypeLiteralBody` | 类型位对象类型全部成形（类型别名右侧、类型标注、返回类型、泛型实参、联合/交叉项、参数标注、`as` 断言）；值位仍是 `JsonObject`（对象字面量、三元分支、实参、箭头返回、数组元素）——实测 `Field` 差额 **5300 → 1512** |
| **成员名是字符串字面量时没有成员节点**（`"a": HTMLAnchorElement`，`lib.dom.d.ts` 的事件表 / 标签名表整张如此） | `field.xl.md` 新增 `IsNameUnit` / `NameText`：成员名接受 `String`，名字取它第一个 `ConstString` 的文本；`method-declaration.xl.md` 对称地加 `MethodNameOf`（`class C { "m"() { } }`） | `lib.dom.d.ts` 的接口属性 **5927/6496 → 6496/6496**；`Field` 差额 **1512 → 761** |

类型位的判定是这一轮唯一需要小心的地方：只看「`{` 前面是不是 `:` / `=`」是不够的——
`cond ? {} : {}` 的第二个括号前面也是 `:`。所以 `:` 还要再确认「同一层没有 `?`」（`HasTernaryQuestion`），
`=` 则要跨过赋值再看是不是 `type`。五条值位形状专门加了回归用例证明它们**没有**被误判成类型字面量。

第 6 轮量化（同一批 352 个真实文件）：

| 标签 | 第 5 轮末 | 第 6 轮末 | 差额变化 |
| --- | ---: | ---: | --- |
| `Field` | 14827 | **19367** | 5300 → **761** |
| `Signature` | 514 | **1532** | 841 → −177（类型字面量里的签名也进来了） |
| `MethodDeclaration` | 11257 | **11411** | 112 → −24 |
| `TypeLiteral`（新标签） | — | **1713** | — |

用例侧：**854 → 859 条**（新增 5 条成员名用例，其中计算属性那条按缺口登记），
在案缺口 102 → 97，台账 `throw` 分组仍然是 0；53 条用例补上了 `TypeLiteral` / `TypeLiteralBody` 期望。

**又是用例集的盲区**：这两处（字符串字面量成员名）844 条用例里一条都没覆盖到——
和上一轮的下划线一样，是**差分引擎**发现的。这也是它第二次证明自己不只是「跑得更快的手写用例」。

### 下一轮目标

1. **`[` 开头的成员名**：计算属性（`[Symbol.iterator]: number`）与**索引签名**（`[key: string]: T`，
   真实语料 102 处）——它们是 Json 数组成形前后的形状，`_notes.computed-member-names` 已登记。
2. **`$` 标识符**与**模板字符串**（共用 `$` + `{` 内插路径）。
3. **`Let` 差额 49 / `Interface` 37 / `TypeAssign` 19** 这几个零头（多为 `declare module "x"` 体内的归属）。
4. **标签**（`outer: { … }`）、**`export` 节点**（142 处）、**EOF 敏感的 `import` 重复节点**。

### 第 7 轮：`[` 成员名 + 泛型扫描的两处判据

| 缺口 | 改动 | 验证 |
| --- | --- | --- |
| **`[` 开头的成员名没有成员节点**（索引签名 `[key: string]: T`、计算属性 `[Symbol.iterator]: number`，真实语料 102 处） | `field.xl.md` 新增模块级 `BracketNameText`，`Field.Previous` 多一支「`[` 括号当名字」（括号在成员位置、后面紧跟 `:` / `?:`）；`Process` 把括号本身也搬进节点 | 索引签名与计算属性名全部收成 `Field`（名字是 `k` / `Symbol.iterator`）；`Field` 差额 **761 → 588** |
| **类型参数表折行、收尾 `>` 独占一行时整条声明塌掉** | `generic-type.xl.md` 的换行判定多一条：**下一个非空字符是 `>`** 时跨过换行（原来只认「上一个字符是 `,` / `<`」或嵌套未归零） | `interface ChildProcessByStdio<I extends …, O extends …, E extends …>` 换行 `extends ChildProcess` 换行 `{` 这种真实排版恢复成形 |
| **联合 / 交叉类型不能当类型实参**（`Array<string \| number>`、`<I extends null \| Writable>`） | 同文件：把 `\|` 与 `&` 加进「类型实参字母表」。它们在字母表外时扫描在第一个 `\|` 处中止，`<…>` 退回符号，**类型参数段认不出来、整条声明跟着塌** | 2 条既有用例（`type-array-of-union` / `type-ref-union-arg`）转绿；`Interface` 差额 **37 → 23**、`Class` 差额 **1 → 0** |

第 7 轮量化（同一批 352 个真实文件）：

| 标签 | 第 6 轮末 | 第 7 轮末 | 差额变化 |
| --- | ---: | ---: | --- |
| `Field` | 19367 | **19628** | 761 → **500** |
| `Interface` | 4502 | **4516** | 37 → 23 |
| `TypeAssign` | 1283 | **1286** | 19 → 16 |
| `Function` | 2035 | **2037** | 5 → 3 |
| `Class` | 359 | **360** | 1 → **0** |

用例侧：**859 → 862 条**（新增折行泛型、联合约束两条回归用例），在案缺口 97 → **94**，
台账 `throw` 分组仍然是 0。

这一轮的三个缺口里，有两个是**用例集覆盖不到的**（折行泛型、联合约束的具体排版），
靠「按文件量到具体接口 → 抽取真实节点 → 逐步缩短定位」这条手工链路找出来的；
`probe-node.cjs`（用 TS AST 抽节点原文再单独喂给解析器）在这一轮证明是最好用的一把镊子。

### 下一轮目标

1. **`$` 标识符**与**模板字符串**（共用 `$` + `{` 内插路径；`missing: String` 9 条 + `InterpolationString` 6 条）。
2. **零头**：`Field` 500 / `Let` 49 / `Interface` 23 / `TypeAssign` 16 —— 多为 `declare module "x"` 体内的归属问题。
3. **标签**（5 条用例）、**`export` 节点**（142 处）、**EOF 敏感的 `import` 重复节点**（`Import` 差额 −53）。
4. **P3 表达式文法**：二元 / 一元 / 赋值表达式仍然没有节点 —— 这是「完整解析」最后的、也是最大的一块结构性空白。

### 第 8 轮：`$` 也是标识符字符

| 缺口 | 改动 | 验证 |
| --- | --- | --- |
| **`$` 被当成符号**：`const $x = 1` / `interface I$X { … }` / `a$b` 全被拆成 `Symbol` + `Common`，声明不成形 | `symbol-template.xl.md` 的内置符号表删掉 `case "$"` | `const $x = 1` → `Let`；`interface I$X` → `Interface` + `InterfaceBody` + `Field`；`a$b` / `$$` / 单独的 `$` 都成一个词 |

这是第 4 轮那处下划线修复的**同族残件**：`_` 与 `$` 是 TypeScript 里仅有的两个非字母标识符字符，
而它们当时都在符号表里。`$` 比 `_` 多一层顾虑——它同时是 `$"…{…}…"` 内插的**前缀**，
所以这一轮先确认了那件事不受影响：前缀识别靠的是
`string-guide.xl.md` 的「回看字符 + `unit.Undo`」，**不查符号表**，两件事互不依赖。
为此专门补了一条护栏用例（`lex-string-dollar-prefix-intact`，标记 `xl:ts-invalid`：
`$"…"` 是本项目语言的写法，不是 TypeScript）。

`$` 在真实语料里本来就少（`@types` / `lib.*.d.ts` 的量化几乎不动），
所以这一轮的价值是**正确性**而不是覆盖面：IdentifierName 的两个特例现在都对了。

### 下一轮目标

1. **模板字符串**（`` `a${b}c` ``，`missing: String` 9 条 + `InterpolationString` 6 条）。
   已经查清接法：注册反引号只是第一步，**内插进入向导在 `{` 上触发**，
   而模板字符串的 `$` 是标记、不是字面量——必须在进入内插前把紧邻的 `$` 从常量字符串里退掉，
   否则产物会多一个 `$`（`a$` 而不是 `a`）。只注册反引号也能让若干净几个用例，但那是假的绿。
2. **零头**：`Field` 500 / `Let` 49 / `Interface` 23 / `TypeAssign` 16 —— 多为 `declare module "x"` 体内的归属问题。
3. **标签**（5 条用例）、**`export` 节点**（142 处）、**EOF 敏感的 `import` 重复节点**（`Import` 差额 −53）。
4. **P3 表达式文法**：二元 / 一元 / 赋值表达式仍然没有节点 —— 这是「完整解析」最后的、也是最大的一块结构性空白。

### 第 9 轮：模板字符串

| 缺口 | 改动 | 验证 |
| --- | --- | --- |
| **模板字符串**（`` `a${b}c` ``）：反引号不是字符串起点，`${…}` 被当成对象字面量 | `parse-pipeline.xl.md` 的 `ExtendStringStarts` 多注册一个反引号 | 8 条既有用例（无内插 / 一个 / 两个 / 跨行 / 嵌套 / 带标签 / `String.raw` / 成员访问作标签）**全部转绿** |

**内插那部分一行都不用写**：`string.xl.md` 的 `Default` 第 6 条分支（三个开关全关、正是反引号串走的那条）
早就实现了——`{` 且前一个字符是 `$`、`StringChar` 是反引号时，置 `InterpolationCount = 1`、
把那个 `$` 从单元上 `Undo` 掉、挂 `InterpolationString`。缺的只是「反引号被当成字符串起点」这一步，
和当初单引号那处一模一样（那处也写着「机制早就写好了，但调用点一直缺失」）。

**这一轮我先走错了路，值得记下来**：我先想到的是「给反引号置 `IsSupportInterpolation` + 在
`interpolation-guide` 里退 `$`」，结果产物里一直留着 `a$`。
原因有两层，都是「想当然」而不是读代码：

- 反引号串走的**不是**内插向导那条路（向导只服务 `$"""…"""` 这种原始内插串），
  而是 `String.Default` 里 `{` 直接挂 `InterpolationString` 的分支；
- 即便找对向导，`$` 也**不能**从当前字符往前看——那个分支是在遇到 `{` 之后的第一个非 `{` 字符时才下结论的，
  `source.Pre()` 已经变成 `{` 了。

最后是**读 `Default` 的分支表**（规范里逐条写着七种形态）才发现第 6 条早就把这件事做完了。
教训：这个仓库的规范写得比代码注释还细，遇到「机制应该有」的直觉时，先读分支表。

用例侧：**864 → 866 条**（新增 `$` / `{` 字面量边界、双引号串里的 `{` 不当内插两条），
在案缺口 **92 → 84**，台账 `throw` 分组仍然是 0。

### 下一轮目标

1. **零头**：`Field` 498 / `Let` 49 / `Interface` 23 / `TypeAssign` 16 —— 多为 `declare module "x"` 体内的归属问题。
2. **标签**（5 条用例）、**`export` 节点**（142 处）、**EOF 敏感的 `import` 重复节点**（`Import` 差额 −53）。
3. **P3 表达式文法**：二元 / 一元 / 赋值表达式仍然没有节点 —— 这是「完整解析」最后的、也是最大的一块结构性空白。
4. **`missing: Keyword` 27 条**：类型位关键词不升级（`keyof` / `typeof` / `readonly` / `is` / `asserts` …），`_notes.type-position-keywords` 已登记。

### 第 10 轮：类型位的关键词升级（一轮清掉最大的一组缺口）

| 缺口 | 改动 | 验证 |
| --- | --- | --- |
| **类型位的关键词停在 `Common`**（`type X = keyof T` / `function f(): void` / `let x: readonly T[]` / `x is T` / `asserts x` / `typeof import("…")`，共 27 条用例） | 新增 `ParsePipeline.InitialTypeReorganizationQueue`：给装类型文本的单元挂一条**只含 `KeywordReorganization`** 的队列；`TypeDefine` 与 `TypeAssign` 的构造器调它 | **22 条用例转绿**，0 条新增缺口；`Let` 差额 **49 → 0** |

**根因是队列里的次序**：`KeywordReorganization` 排在通用队列的**最后一位**——
这是必须的，结构规则（`TypeAssignReorganization` 认 `type`、`ForReorganization` 认 `in`）要先看到 `Common`。
但 `TypeDefine` / `TypeAssign` 是**重组规则建出来的单元**，它们的内容（冒号或 `=` 之后的类型文本）
从此不再被外层扫到，那一趟永远轮不到里面的 `keyof`。

第一版我给这两个单元挂的是**通用队列**，结果 `TernaryOperatorReorganization` 把
**条件类型** `T extends U ? A : B` 收成了表达式三元（`type X = T extends Array<infer U> ? U : never`
于是长出一个 `TernaryOperator` 节点）。两条既有用例（`type-cond-infer` / `type-cond-multiple-infer`，
都带 `xl:absent TernaryOperator`）当场报 `unexpected: TernaryOperator` 把它挡下来了。

所以最终挂的是**类型队列**而不是通用队列——类型位要的只是「把关键词升级」这一件事。
这条例外写进了 `parse-pipeline.xl.md` 的 `InitialTypeReorganizationQueue`，
并补了一条用例（`type-cond-in-annotation`：类型标注里的条件类型不许变成 `TernaryOperator`）钉住它。

用例侧：**866 → 867 条**，在案缺口 **84 → 62**，台账 `throw` 分组仍然是 0。

### 下一轮目标

1. **零头**：`Field` 498 / `Interface` 23 / `TypeAssign` 16 / `Function` 3 —— 多为 `declare module "x"` 体内的归属问题。
2. **标签**（5 条用例）、**`export` 节点**（142 处）、**EOF 敏感的 `import` 重复节点**（`Import` 差额 −53）。
3. **P3 表达式文法**：二元 / 一元 / 赋值表达式仍然没有节点 —— 这是「完整解析」最后的、也是最大的一块结构性空白。
4. **`in` / `of` 的关键词化**：要先把 `For` / `Foreach` 的判定改成「`Common` 或 `Keyword` 都认」，那是两处既有规则的形状改动。

### 第 11 轮：生成器函数与方法

| 缺口 | 改动 | 验证 |
| --- | --- | --- |
| **生成器函数 `function* g() {}` 丢掉整条 `Function`**，降级成 `<Keyword>function</Keyword><Symbol>*</Symbol><MethodDeclaration MethodName="g">` | `function.xl.md` 的 `ParameterIndex` 允许名字前的一个 `*`；`Process` 把 `*` 作为子单元留在节点里 | 4 条用例转绿（`function*` / `async function*` 与它们的基线用例） |
| **生成器方法 `*g() {}` 同样丢节点** | `method-declaration.xl.md` 新增 `GeneratorMark`，`Previous` / `Process` 先把游标越过 `*`；`*` 留在节点里 | 类里与接口里的生成器方法都成形（新增用例 `decl-method-generator`） |

两处的共同点：`*` 夹在**关键字与名字之间**（`function` `*` `g`）或**名字之前**（`*` `g`），
而两条规则的判定都是「名字 + `(`」——`*` 一挡，判定就断，后面那个 `g()` 反而被更晚的规则接走，
生成器于是**降级**成方法声明。

`*` 必须留在产物里：丢掉它，生成器与普通函数的 XML 会一模一样。

### 下一轮目标

1. **类私有名 `#x`（5 条用例）**：`#` 在行首会命中预处理器分支，整段变成 `<PreprocessorDirectives>`。
   修法是让 `PreprocessorDirectivesBranch.Condition` 再看一眼后面跟的是不是已知指令名
   （`#if` / `#region` / `#define` …）——需要给 `Source` 加一段「读后面这个词」的前瞻，已写进 `_notes.private-name`。
2. **零头**：`Field` 498 / `Interface` 23 / `TypeAssign` 16 / `Function` 3。
3. **标签**（5 条）、**`export` 节点**（142 处）、**EOF 敏感的 `import` 重复节点**（`Import` 差额 −53）。
4. **P3 表达式文法**：二元 / 一元 / 赋值表达式仍然没有节点 —— 这是「完整解析」最后的、也是最大的一块结构性空白。

### 第 12 轮：类私有名 `#x`

| 缺口 | 改动 | 验证 |
| --- | --- | --- |
| **`#x` / `#m()` 变成 `<PreprocessorDirectives>x = 1</PreprocessorDirectives>`**（行首的 `#` 命中了预处理器分支） | `preprocessor-directives.xl.md` 新增 `FollowingWord`（读 `#` 后面那个词）与 `DirectiveNames`（已知指令名表），`Condition` 多要求一条「后面跟的是已知指令名」 | `#if` / `#endif` 照旧（`lex-preprocessor-if` 守住），`#x` 不再被吞 |
| **私有名是「两个单元一个名字」**（`#` 是符号、`x` 是 `Common`），成员规则认不出 | `field.xl.md` 与 `method-declaration.xl.md` 各多一支：`index` 处的 `#` 成立时把游标推到下一个实义单元，后续判定都按那个单元来；`#` 留在 `FieldName` / `MethodName` 里（`"#a"` / `"#m"`） | **4 条用例转绿**（`decl-class-private-field` / `decl-class-private-field-in-operator` / `lex-private-field` / `lex-private-in`），新补一条私有方法用例 |

**这一轮的关键是「先分清谁该管 `#`」**：预处理器与私有名在词法上长得一样（都是 `#` 加一个词），
唯一的分辨办法是看那个词是不是已知指令名。所以先给 `Condition` 加了前瞻那一刀（`FollowingWord` + `DirectiveNames`），
把 `#` 交还给普通词法之后，成员规则才有机会工作——这一步做完时产物是
`<Symbol>#</Symbol><Common>x</Common>`，还**没有**成员节点，于是第二步才让成员规则认「`#` + 名字」。

两处都留了防回归的东西：预处理器老用例继续守着 `#if` / `#endif`；
私有名的私有方法形态补了新用例（`decl-method-private-name`），
否则「字段修好了、方法又坏回去」这种半边回归没人看得见。

用例侧：**868 → 869 条**，在案缺口 **58 → 55**，台账 `throw` 分组仍然是 0。

### 下一轮目标

1. **零头**：`Field` 498 / `Interface` 23 / `TypeAssign` 16 / `Function` 3 —— 多为 `declare module "x"` 体内的归属问题。
2. **标签**（5 条）、**`export` 节点**（142 处）、**EOF 敏感的 `import` 重复节点**（`Import` 差额 −53）。
3. **P3 表达式文法**：二元 / 一元 / 赋值表达式仍然没有节点 —— 这是「完整解析」最后的、也是最大的一块结构性空白。
4. **`in` / `of` 的关键词化**：要先把 `For` / `Foreach` 的判定改成「`Common` 或 `Keyword` 都认」。

### 第 13 轮：import 类型 + 泛型箭头

| 缺口 | 改动 | 验证 |
| --- | --- | --- |
| **`typeof import("x")` 把后面所有成员吞掉**（`interface BuiltInModule { "assert": typeof import("assert"); … }` 112 个成员只活下来 1 个） | 先试「把 `import` 加进 `BanedMethodNames`」——**退回来了**，那张表是「能不能当方法名」的唯一判据、调用规则与声明规则共用它，加进去连带挡掉动态 `import("m")` 的调用节点。改成两处各自精确地拒一次：`MethodDeclaration.Previous` 拒 `import`；`ImportReorganization.Previous` 拒「`import` 后面紧跟 `(`」 | `BuiltInModule` **112/112**；`Field` 差额 **498 → 389**；`expr-call-dynamic-import` / `expr-call-await-import` 两条用例转绿（它们要的正是「动态 import 是 `Method`、不是 `Import`」） |
| **泛型箭头函数 / 泛型函数类型的 `<T>` 不成 `GenericType`**（`<T>(x: T): T => x`、`type X = <T>(x: T) => T`） | `generic-type.xl.md` 的名字闸多一支：宿主最后一个是**「操作数起点」**（`=` / `=>` / `:` / `;` / `,`、括号、软换行）时也算数 | 2 条用例转绿（`expr-arrow-generic` / `type-fn-generic`）；放宽的风险由「左侧必须有操作数」兜住 |

**名字闸那一支是这一轮的关键**：`<T>` 在泛型箭头前面**没有名字**，只有 `=` 或者什么都没有，
原来的名字闸（要求前一个是 `Common`）直接判否，`<T>` 退回符号、`Lamda` 与函数类型一起散架。
放宽是安全的：比较式 `a < b > (c)` 的 `<` 前面**是** `a`（走原来那一支），
而「操作数起点」位置上按定义还没有左操作数，`<…>` 只可能是类型参数段。

**第一条改动值得记下过程**：先加的禁用表看起来对（`BuiltInModule` 立刻从 1/112 变成 112/112），
但`xl:absent Import` 的两条用例立刻报 `missing: Method`——**「改对了一处、改坏了另一处」**，
这是这一轮唯一一次靠既有用例当场拦下的误修。

用例侧：**869 → 870 条**，在案缺口 **54 → 52**，台账 `throw` 分组仍然是 0。

### 最后一轮的目标

1. **`export` 家族**（`ExportDeclaration` 92 + `ExportAssignment` 50 + `ModuleDeclarationString` 115 是标签表里最后三块没有节点的构造）：
   它们同时对应 5 条 `missing: Import` 用例（`export … from` / `export *` / `export * as` / `export type … from`）。
2. **标签**（5 条：块语句标签 `outer: { … }` 完全不识别）。
3. **零头**：`Field` 389 / `Interface` 23 / `TypeAssign` 16 / `Function` 3。
4. **P3 表达式文法**：二元 / 一元 / 赋值表达式仍然没有节点 —— 这是「完整解析」最后、也是最大的一块结构性空白。

### 第 14 轮：导出语句（`Export`）

| 缺口 | 改动 | 验证 |
| --- | --- | --- |
| **`export { … } from "m"` / `export * from "m"` / `export * as ns from "m"` / `export type { … } from "m"` / 本地 `export { a }` 全都没有节点**（真实语料 92 处 ExportDeclaration） | 新增 `dawn/text/tokens/export.xl.md`（`Export` + `ExportReorganization`），按 `import.xl.md` 的形状对称实现；注册在 `ImportReorganization` 之后 | 5 条用例转绿；**`Export` 92/92，差额 0** |

三处「只能是这么写」的取舍：

- **只认「`export` 后面是 `*` 或 `{`」的那些**：`export default …` / `export const …` / `export function …`
  是「导出 + 一条声明」，那条声明自己有节点（`Let` / `Function` / `Class`），再包一层只会重复计一遍。
- **`type` 可以夹在中间**（`export type { A } from "m"`），但跳过 `type` 之后必须仍是 `*` 或 `{`——
  `export type X = …`（导出类型别名）在那一支就断了，不会被误收。
- **要认 `TypeLiteral` 这一支**：规则是**按规则轮询**的，`TypeLiteralReorganization` 排在
  `ExportReorganization` **之前**——轮到 `Export` 时那对花括号**已经**是 `TypeLiteral` 了，
  只认 `Bracket` 的话 `export type { … }` 永远匹配不上（第一版就是这样，跑一遍才发现）。

`Export` 的构造器装了「只含 `KeywordReorganization`」的那条队列（复用它最早的两个用户的名字），
于是 `export` / `type` / `from` 这些词在节点内部也会升级成 `Keyword`——
不装的话它们停在 `Common` 上，一条既有基线用例（`ex-named`）的 `xl:expect Keyword` 会失败。

用例侧：**870 条不变**（5 条导出用例的期望从 `Import` 改成 `Export`——原来那个 `Import` 是标签表里没有
`Export` 时的替身），在案缺口 **52 → 47**，台账 `throw` 分组仍然是 0。

### 续做（第 15 轮起）：把余下的登记缺口逐条清掉

| 批次 | 改动 | 结果 |
| --- | --- | --- |
| **标签与块**（7 条） | 新增 `text-common-util.xl.md` 的 `IsStatementStart`（+ `IsStatementList`）；`LabelReorganization` 认定「语句开头的名字 + 冒号」，且被标语句可以是 `{` 块或任意表达式语句；`JsonObjectReorganization` 把**语句位置**的 `{` 判成块；新增 `BlockReorganization` 给裸块补语句队列 | `outer: { … }` / `done: f()` / `{ a: 1 }` / 嵌套双标签全部成形；7 条用例转绿 |
| **模板串的 6 条期望** | `InterpolationGuide` / `InterpolationString` 的期望是模板串还没接进来时的猜测：无内插的模板**没有** `InterpolationString`，内插也**不经过** `InterpolationGuide`（那条向导只服务原始内插串） | 6 条用例的期望改成真实模型（3 条无内插的 + 3 条带内插的） |
| **类表达式**（5 条） | `ClassReorganization.ScanHead`：名字可省（`export default class { … }`）、`extends` 后面可以是调用 / 括号表达式（`extends mixin(B)` / `extends (Base)`）、向后找类体时跳过非 `{` 的括号；`DecoratorReorganization` 收名字时遇关键字即停 | 5 条用例转绿（含 Mixin 模式与同行装饰器） |
| **泛型实参段里的两条表达式规则**（3 条） | `LetReorganization` 与 `TernaryOperatorReorganization` 各自拒掉父单元是 `GenericType` 的情形：`<const T>` 的 `const` 是类型参数修饰符、`Wrap<T extends U ? A : B>` 的 `? :` 是条件类型 | 3 条用例转绿 |
| **类型队列补 `WrapSymbolReorganization`** | 类型文本可以折行排版，那些换行是版面而不是内容 | 类型段里的软换行不再留在产物里 |

**一次试错**：泛型实参段的队列先被换成「只有关键字升级」的窄队列，`type-cond-generic-arg` /
`type-param-const` 立刻转绿，但 `Array<{ a: 1 }>` / `<T extends X = {}>` 这些**正常写法**
同时被打断（7 条用例报「缺 TypeLiteral / GenericType」）。原因是窄队列里没有那些**类型**规则。
最终改成「保留通用队列 + 就地拒两条表达式规则」，两边都对。

| **第四批** | 改动 | 结果 |
| --- | --- | --- |
| **括号里的条件类型**（2 条） | `TernaryOperatorReorganization` 多一层位置判据。第一版按「括号的父单元是不是类型宿主」判——**跑出来毫无效果**：括号有自己的队列，条件类型在**括号关闭那一刻**成形，那时父单元还是语句。改成「括号里含 `extends`」 | 2 条转绿 |
| **`import("./m").A<T>`**（1 条） | `IsTypePosition` 走到 `import("m")` 那个括号单元就判成表达式位 | 括号前面是 `import` 时继续往前 |
| **IIFE**（2 条） | 调用规则只认「名字 + `(`」 | 允许 `(` 开头的括号作**被调用者**（`(function(){})()` / `(() => 1)()`），并**挡掉控制结构的头**（`if (x) (y)`） |
| **`\uXXXX` 标识符**（1 条） | `\` 是符号、被 `SymbolBranch` 抢走 | 新增 `IsUnicodeEscapeStart`；**符号分支让路 + 通用字符分支放行**（两边配合） |
| **`declare module "x" { … }`**（语料 115 处） | `ScanBody` 只认点分标识符名字 | 名字可以是 `String`。**`Namespace` 327/327** |
| **`export =` / `export default`**（语料 50 处） | `Export` 不认这两种形状 | **只收前缀两个词**，表达式留在外面由父单元照常解析（装通用队列会弄坏十来条既有用例，那是试过退回的方案）。**`Export` 142/142** |
| **条件类型假分支里的类型字面量** | `HasTernaryQuestion` 把条件类型的 `:` 也当成三元 | 找到 `?` 后再往前看有没有 `extends`：有就是条件类型，两个分支都是类型。`domexception.d.ts` 一处就找回 28 个成员 |
| **类型实参里的 `;`**（语料大头） | `ScanArguments` 一律在 `;` 处中止 | `;` 只在**括号组内**放行（`Promise<{ a: T; b: U }>`）。**`Field` 差额 338 → 104**，一轮找回 198 个节点 |

| **第五批** | 改动 | 结果 |
| --- | --- | --- |
| **类型参数里的 `=>`**（语料 23 处声明） | 三处判据要一致：`ScanArguments` 的字母表（内容闸）、`GenericType.ExitOrPre`（字符级退出）、以及「谁吃掉这个字符」。只改前一处**毫无效果**——`ExitOrPre` 是另一条路（`UnitToken.Process` 先问退出条件），它一看 `>` 就退出，`GenericType` 停在 `=` 后面、`any>` 掉到外面，整条声明塌 | `Interface` 差额 **6 → 2**、`TypeAssign` **14 → 10**、`Function` **1 → 0** |
| **类型实参段里的「调用」** | `MethodReorganization` 在父单元是 `GenericType` 时一律不认：`<T extends (a: any) => any>` 里的 `extends(a: any)` 会被当成一次调用、把类型尾巴搅散 | 同上 |
| **类型实参里的 `;`**（最终值） | 同上一条的落地 | `Field` 差额 **338 → 94** |

**「三处必须一致」是这一轮的主要教训**：泛型收尾这个判定分散在
「字母表扫描」「字符级退出」「跳转队列里谁接手」三处，
任何一处不认新形状都会让整条声明塌，而**前一处改对了不代表后两处也认**——
第一版只改了字母表，跑出来数字一动不动，直到把 `ExitOrPre` 也改掉才生效。

| **第六批** | 改动 | 结果 |
| --- | --- | --- |
| **折行的联合类型实参** | 换行判定不只看「下一个是不是 `>`」，`\|` / `&` 也算续行（`interface ParsedUrlQueryInput extends NodeJS.Dict<` 换行 `\| string` 换行 `\| number` 换行 `> { }`） | `Interface` 差额 **2 → 1** |
| **折行的条件类型**（类型参数默认值里） | 换行后面是 `:` / `?` 也算续行（`ReturnType = F extends (...args: any) => infer T ? T` 换行 `: F extends abstract new(...) => infer T ? T`） | `Interface` 差额 **1 → 0**，`Field` **94 → 88** |

**`Interface` 差额归零**：语料里 4539 个接口声明现在**全部**成形。

| **第七批** | 改动 | 结果 |
| --- | --- | --- |
| **别名右端的终止判定只认「词」** | `AliasEnd` 多认一条「下一行是**已经成形的声明单元**」（`IsDeclarationBoundary`）。本规则排在 `Interface` / `Class` 之后，轮到它扫描时后面那条声明往往已经成节点了；只认词的话，命名空间体里「对象型别名 → interface → 函数型别名」会把 interface 与后面那条别名一起吞进第一个别名 | **`TypeAssign` 差额 10 → 0**（1302/1302） |
| **可选标注 `?:` 没被当成类型位** | `TypeLiteralReorganization.IsTypePosition` 里 `:` 的那一支漏了 `?:` —— 可选参数 / 可选属性的类型标注正是它。`toBase64(options?: { alphabet?: string })` 里的类型字面量因此收不成 | **`Field` 差额 88 → 23**（一处找回 65 个成员） |

| **第八批** | 改动 | 结果 |
| --- | --- | --- |
| **条件类型真分支里的类型字面量** | `TypeLiteralReorganization.IsTypePosition` 多认一个 `?`：往前找 `extends` 标志（抽成 `HasExtendsMarker`）。`O["type"] extends "string" ? { … }` 里的 `{` 前面正是 `?` | 16 个成员找回 |
| **成员之间只靠换行分隔时的边界** | 新增 `IsMemberBoundary`（`declaration-common`）：「下一行像新成员（名字/修饰词 + `:` / `?:` / `(` / `=` / `;`）」且「前一个不是续行符号」，两处都要用 —— `Field.MemberEnd`（字段的终点）与 `TypeDefine` 的类型收集 | **`Field` 差额 23 → 1** |
| **「前一个是符号就续行」太粗** | `Field.MemberEnd` 原来只看「前一个是不是 `;` / `,` 以外的符号」；函数类型成员以 `>` 收尾，于是被当成「没写完」，整张成员表被吞进第一个字段 | 先问 `IsMemberBoundary`、再退回粗判据 |

| **第九批** | 改动 | 结果 |
| --- | --- | --- |
| **变量声明的修饰词整体丢失** | `Let` 加 `Modifiers` 属性（`const` / `let` / `var` 自身 + `export` / `declare` / `default`，逗号分隔、按源码顺序），`Process` 往前一路收、`ToXmlString` 三种形态都带上、`Clone` 一并抄 | `export const a = 1` 与 `const a = 1` 产物**不再相同**（`Modifiers="export,const"` / `"const"`）；`_notes.variable-modifiers` 从「缺口」改成「已补」 |

| **第十批** | 改动 | 结果 |
| --- | --- | --- |
| **`_notes.nonnull-dropped`**：非空断言 `expr!` 的 `!` 被直接删掉 | 改成收成一个 **`NotNull` 节点**（里面装着被断言者与 `!` 本身），`Previous` 多认一条 `NotNull`（连写 `b!!` 会嵌套），`Clone` 补齐。TypeScript 的 AST 里它就是 `NonNullExpression`，差分引擎直接对得上 | `a!` 与 `a` 产物**不再相同**；新增用例 `expr-nonnull-assertion`（873 条） |
| **类体里的 `a!: number` 被误收成断言** | 那是「明确赋值断言」，AST 里只是属性上的 `exclamationToken`、**不**产生 `NonNullExpression` | 新增 `IsDefiniteAssignment`：`!` 后面跟着类型标注（`TypeDefine` 节点或 `:` / `?:` / `!:` 符号）**且**名字前面是成员起点 |

| **第十一批** | 改动 | 结果 |
| --- | --- | --- |
| **语句位的 `{` 被收成 `JsonObject`** | `IsStatementList` 的白名单加上 `Statement`。这是**调试打印抓出来的**：`{ let y = 2; }` 第一趟问 `IsObjectAt` 时括号的父亲还是 `Root`、判断正确 ✓；但 `StatementReorganization` 排在很后面，它把这对方括号收进一个 `Statement` 之后**同一个问题会被再问一次**，这一回父亲成了 `Statement`、不在白名单里 → 判成值位 → `JsonObjectReorganization` 把块抢走 ✗ | `{ let y = 2; }` 保持 `Bracket`（块），`let o = { a: 1 }` 仍是对象 ✓；用例 `stmt-object-vs-block` 补上 `xl:expect Bracket,Label,Statement` / `xl:absent JsonObject` |
| **标签块里收不到节点** | `LabelReorganization.Process` 给被标的块装了语句队列却没**跑**它 —— 原来块里的内容全靠后面某趟重组的顺带（那时块还是个 `JsonObject`）；块一旦正确保持成 `Bracket`，里面的 `let` / `break` 就全成了散单元 ✗ | 补一句显式的 `statement.Reorganize()`（与 `BlockReorganization` 同款）；三条标签块用例恢复 ✓ |

**这两处是一对**：第二处是第一处暴露出来的。修好「块保持成块」之后，原先被 `JsonObject` 顺带跑掉的队列就没人跑了 —— 这类**相互托底**的隐式依赖正是这一路上最费时间的坑（前几轮的泛型收尾「三处必须一致」也是同一类）。

| **第十二批** | 改动 | 结果 |
| --- | --- | --- |
| **`in` / `of` 没被关键词化** | 把两个词加进 `KeyWords()`。**代价是四处判定要跟着改**：`ForReorganization` / `ForeachReorganization`（两处）与 `field.xl.md` 的 `BracketNameText` 原来都写 `item instanceof Common && item.Is("in")`；`Keyword` 与 `Common` **没有继承关系**，升级之后这些判定就再也找不到它（`for (var name in all)` 会被 `For` 接走并抛错 —— 这条回归历史上真炸过 `typescript.js`） | 新增共享判据 **`IsWordUnit(unit, word)`**（`Common` 或 `Keyword` 都认），四处统一换掉；`k in o` 现在给 `Keyword` 标签，for-in / for-of / 普通 for 都照旧 |

用例 `lex-keyword-in-of` 把四种用法一起钉住（for-in、for-of、`k in o`、映射类型 `[K in keyof T]`）。

| **第十五批** | 改动 | 结果 |
| --- | --- | --- |
| **二元运算符没有节点** | 新增 `binary-operator.xl.md`：`BinaryOperatorReorganization` + `BinaryOperator`（带 `Operator` 属性），**按优先级注册 8 个实例**（`**` → `* / %` → `+ -` → 移位 → `<= >=` → `== != === !==` → `in` → `instanceof`），排在 `UnaryOperator` 之后、`KeywordReorganization` 之前 | 用例 `expr-binary-operator` 转绿，台账 **2 → 1**；`BinaryOperator` 差额 3157 → **1423**（差额全在刻意排除的运算符族里，见下） |
| **用例只能查「有没有」、不能查「有几个」** | `xl:expect` 加了**个数写法** `Tag:2`（`run.mjs` 按个数比对、`validate.mjs` 校验写法） | 这一类 bug 从此能被用例抓住 —— 本轮就是它把下面那条抓出来的 |

| **第十六批** | 改动 | 结果 |
| --- | --- | --- |
| **类的静态字段初始化里有 `new` 时，后面那个成员被吞掉**（上一轮新登记的既有 bug） | `Field.MemberEnd` 多一条终止：遇到**已经成形、且会把结尾分号与软换行一起吃掉**的声明节点（`MethodDeclaration` 一族）且后面接着一个词时，当前字段到此为止 | 用例 `cls-static-field-new` 转绿，台账 **2 → 1**；四组探针全部回到 `Field=2` |

| **第十八批** | 改动 | 结果 |
| --- | --- | --- |
| **`Spread` 的 −16 假阳性（第一版尝试）** | 试了两版判据（「`JsonArray` 的父亲不能是括号」→ 压掉 5 处；「父亲的父亲必须是调用 / `new` / 数组 / 对象」） | **两版都撤掉了**：它们把 `f([...xs])` 也压成 **0 个 `Spread`** ✗ —— 那个数组字面量的父亲正好是调用的实参括号，两层之内分不出「实参括号」与「参数表括号」 |

| **第十九批** | 改动 | 结果 |
| --- | --- | --- |
| **`Spread` 的假阳性：rest 参数被当成展开** | 正解不是「看父亲是谁」，而是**看被展开的名字后面有没有类型标注**（`IsRestParameter`）：`...args: A` 后面跟 `:` / `?:` / `!:`（或已经成形的 `TypeDefine` 节点）就是 rest 参数 ✗，`...args)` / `...items]` / `...base}` 才是展开 ✓ | `Spread` 差额 **−16 → −4**，四种合法形状全部保持 ✓ |
| **元组类型里的 `...`** | 它是 `RestType`、不产生 `SpreadElement`，但会被收成 `Spread`（剩下的那 4 个） | 登记成用例 `type-tuple-rest`（`xl:absent Spread`），台账 **0 → 1** |

| **第二十批** | 改动 | 结果 |
| --- | --- | --- |
| **`Field` 多出 20 个（位置终于定住了）** | 根因不是「一个属性被收成两个字段」，而是**值位的对象字面量被收成了类型字面量**：`const options: CliOptions = { Input: "" }` 里那个 `{` 往前扫时先跨过 `=`、再撞上变量标注的 `:`，于是被判成「冒号后面的类型」✗。修法：`TypeLiteral` 的 `IsTypePosition` 里**已经跨过 `=` 之后再遇到 `:` 就判值位** | `dist/ts/cjcli.ts` 的产物 `Field` **9 → 5**；差分账 `Field` **−20 → −16** |

| **第二十一批** | 改动 | 结果 |
| --- | --- | --- |
| **`&&` / `||` 的优先级不准** | 两条 `LogicalOperatorReorganization` 实例从「`Export` 之后」挪到**二元运算符那一族之后**（队列位次 21/22 → 45/46）。原来 `a && b + c` 会先把 `a && b` 折成 `LogicalOperator`，`+` 反而成了外层 ✗ | `1 && 2 + 3` 现在是 `<LogicalOperator><…><BinaryOperator +>2 + 3</BinaryOperator></LogicalOperator>` ✓；`x <= y + 1` 也正确嵌套 ✓；879 条用例全绿、samples 不变 ✓ |

| **第二十二批** | 改动 | 结果 |
| --- | --- | --- |
| **元组类型的 `...`（在案最后 1 条）** | 换成**不依赖祖先链**的判据 `IsTupleRest`：被操作数**紧跟一个空的 `[]` 括号**就是数组类型后缀（`[string, ...number[]]`）✗ 不收；`...items]` / `...args)` / `...base}` 都不是空的 `[]` ✓ 照收；`...a[0]` 的 `[` 不空 ✓ 照收 | 用例 `type-tuple-rest` 转绿 —— **在案缺口再次归零（879/879）** |

| **第二十三批** | 改动 | 结果 |
| --- | --- | --- |
| **`import type { A }` 被收成类型字面量** | 那个 `{` 往前扫会撞到 `type`（在关键字表里）→ 判成类型字面量 ✗，于是**导入列表被收成 `TypeLiteral`，里面每个名字还成了一个 `Field`** ✗（而 AST 那边一个属性都没有）。修法：`type` 前面是 `import` / `export`**且 `type` 后面紧跟 `{` 括号**时判值位 | 差分账 `Field` **−16 → −8**；6 条把那个产物当期望的用例改成了按真正该有的结构断言（`Import`/`Export` + `Bracket`，并加 `xl:absent TypeLiteral`） |

| **第二十四批** | 改动 | 结果 |
| --- | --- | --- |
| **`Import` 没有结构化信息**（`_notes.imports-unstructured`） | 加五个属性：`From` / `IsTypeOnly` / `DefaultName` / `NamespaceName` / `ImportedNames`，并新增 `ToXmlString` 把它们渲染进 XML —— **原来 `From` 根本没进 XML**（`Import` 没有覆写），下游拿不到路径。`ReadClause` 从子句里读出后三种子句形态（默认 / 命名空间 / 具名） | `import { A, B as C } from "m"` → `ImportedNames="A,C"`（取**本地名**）；`import type { A }` → `IsTypeOnly="true"`；`import * as ns` → `NamespaceName="ns"`；`import Default from "m"` → `DefaultName="Default"`；`import "m"` → 只有 `From` ✓ |

| **第二十五批** | 改动 | 结果 |
| --- | --- | --- |
| **`Export` 没有结构化信息**（`_notes.exports-no-node` 的剩余部分） | 与 `Import`（第 37 轮）对称：加 `IsTypeOnly` / `NamespaceName` / `ExportedNames`，`ToXmlString` 把 `From` 与三者一并渲染（**原来 `From` 也没进 XML**）；`ReadClause` 处理花括号列表、`*` 转发、`type` 前缀三种形态 | `export { a as b, c }` → `ExportedNames="b,c"`（**对外名**，与 `Import.ImportedNames` 取本地名正好相反）；`export * as ns` → `NamespaceName="ns"`；`export type { A }` → `IsTypeOnly="true"` ✓ |

| **第二十六批** | 改动 | 结果 |
| --- | --- | --- |
| **差分引擎把 1518 个「另有归属」的运算符算进了 `BinaryOperator` 的账** | `BinaryExpression` 的判定改成**排除** `&&` / `\|\|`（→ `LogicalOperator`）与赋值族 `=` / `+=` / `-=` / …（本工程不做赋值节点）。先按运算符把语料里的 `BinaryExpression` 数了一遍（`binop-by-op.cjs`），才发现差额的大头是**账目问题**而不是缺结构 | `BinaryOperator` 差额 **1518 → 165** ✓（剩下的是真切口） |
| **`??` 空值合并没有节点** | 加 `BinaryOperatorReorganization.NullishInstance`（`["??"]`） | 165 → 144 |

| **第二十七批** | 改动 | 结果 |
| --- | --- | --- |
| **`<` / `>` 的比较被算进 `BinaryOperator` 的账** | 从**源码侧**也剔掉（它们是刻意不收的：与泛型实参同形） | `BinaryOperator` 差额 **144 → 0** ✓ |
| **负数**字面量类型**被算进 `UnaryOperator` 的账** | 源码侧剔掉「父节点是 `LiteralType` 的 `PrefixUnaryExpression`」（`-1 \| 0 \| 1`，TS 的记法与本工程不同） | 52 → 38 |
| **`return -1` 折成了二元节点** | 两个运算符规则的 `IsOperand` 都排掉**语句关键字**（`return` / `throw` / `case` / `default` / `else` / `do` / `break` / `continue`）—— 本规则跑在 `KeywordReorganization` **之前**，这些词那时还是 `Common` ✗ | `UnaryOperator` 差额 **38 → −1**（几乎精确）；`return -1` 正确收成一元 ✓ |

| **第二十八批** | 改动 | 结果 |
| --- | --- | --- |
| **`?.` 之后不能再运算** | `NullConditionalOperator` 加进 `BinaryOperator` 的 `IsOperand` 白名单 —— `a?.b ?? c` / `x.y.get(z)?.v ?? null` 里 `?.` 已经收成一个节点 ✗ 不认的话 `??` / `+` 找不到左操作数 | `BinaryOperator` 差额 **34 → 29**；`a?.b ?? c` 正确折成一元…… 折成二元 ✓ |

**探针把范围收得很准**：`start ?? null` ✓、`a.b >= 2` ✓、`arguments.length >= 2` ✓、
`"a" + b + "c"` ✓ 全都**单独测能成形**，只有带 `?.` 的两个 ✗ —— 一改就对。

**剩下 29 个的取样**（`source-range.ts:14 start ?? null`、`sequence-template.ts:22 arguments.length >= 2`、
`cjcli.ts:41 "cjcli: " + options.Error + "\n"`）**单独测都能成形** ✗ ——
说明是**文件上下文**造成的（同一形状在方法体/条件里被更早的规则收走，内容再也不跑通用队列）。
这与第 32 轮「祖先链过期」是同一类问题的另一面：**判据本身没错，是那批单元后来没再被扫到**。
要修得先弄清「哪些节点收了内容却不给它队列」，属于下一轮的事（本轮到此为止）。
| **负数**字面量类型**被算进 `UnaryOperator` 的账** | 源码侧剔掉「父节点是 `LiteralType` 的 `PrefixUnaryExpression`」（`-1 \| 0 \| 1`，TS 的记法与本工程不同） | 52 → 38 |
| **`return -1` 折成了二元节点** | 两个运算符规则的 `IsOperand` 都排掉**语句关键字**（`return` / `throw` / `case` / `default` / `else` / `do` / `break` / `continue`）—— 本规则跑在 `KeywordReorganization` **之前**，这些词那时还是 `Common` ✗ | `UnaryOperator` 差额 **38 → −1**（几乎精确）；`return -1` 正确收成一元 ✓ |

**第一版判据写宽了**：`IsOperand` 里用 `unit.Template.KeywordTemplate.IsKeyword(text)` 一律拒收 ——
把 **`await` / `yield` / `new` / `typeof` 这些表达式类关键字**也拒了 ✗，
差分账上 `BinaryOperator` 立刻多出 34 个缺口（实测），说明 37 处本来能折的表达式折不动了。
**只排「语句关键字」那八个**才对 ✓。这类「判据写宽了一点点、后果是几十个节点消失」的教训，
这一路上已经出现四五次（`IsUnicodeEscapeStart` 的反斜杠、`IsMemberBoundary` 的续行符号、
`IsRestParameter` 的类型标注……）。

**还剩 34 个 `BinaryOperator`**：取样看是 `?.` **可选链之后再运算**的形状 ——
`this.Variables.get(key)?.Value ?? null`、`arguments.length >= 2`、`"cjcli: " + options.Error + "\n"`。
这些的左操作数是一个**属性访问链**（`?.` / `.` 串起来），而本规则只取「紧邻的一个单元」，
链尾的单元凑不出操作数（`NullConditionalOperator` 不在 `IsOperand` 白名单里）。
下一轮要么把链式访问也认成操作数，要么把这条记进 `_notes`。
| **`??` 空值合并没有节点** | 账目洗干净之后，165 个真切口里 `??` 占 24 个 —— 原来它被埋在虚高的差额里看不见。加 `BinaryOperatorReorganization.NullishInstance`（`["??"]`，排在 `instanceof` 之后、`LogicalOperator` 之前） | 差额 **165 → 144** ✓ |

**这一轮最大的收获是「把账算对」**：语料里 3326 个 `BinaryExpression` 的分布是
`=` 594、`instanceof` 591、`===` 580、`\|\|` 352、`&&` 329、`+` 225、`-` 168 …
——**一半以上另有归属**（赋值、`LogicalOperator`）。引擎把它们全算在 `BinaryOperator` 头上，
于是报出一个 1518 的假缺口，把真正该修的 165 个（`<` 126、`>` 12、`??` 24）埋掉了。
**量化工具的账目错了，就会把后续几轮的时间引到错的地方** —— 这条值得留在这里。

**至此 import / export 两侧的结构化信息都齐了**（`_notes.imports-unstructured` 与 `exports-no-node`
两条都改写成「已补」）。`samples/*.expected.xml` 三份按新形状重新生成。

**两侧判据的唯一区别**记在代码里：同样取「每段最后一个 `Common`」——
`Import` 拿到的是**本地名**（`import { B as C }` → `C`），`Export` 拿到的是**对外名**（`export { a as b }` → `b`）✓。

`samples/*.expected.xml` 三份按新形状重新生成（`Import` 的属性进了产物，这正是逐字节校验要锁的东西）。
`_notes.imports-unstructured` 改写为「已补」，并在里面指出**同类问题还剩 `export` 一侧**。
| **上一条的判据一开始写得太宽** | 只看「`type` 前面是 `import`/`export`」会把 `export type CliOptions = { … }` 也挡掉 | 测试当场抓出来：`cjcli.ts` 的 5 个 `Field` 全丢、5 条用例报 `缺 TypeLiteral`。**两条判据缺一不可**：`type` 后面必须紧跟 `{` 括号（`export type X = { … }` 里 `type` 后面是**别名**，花括号在 `=` 之后 ✓ 正常类型字面量） |

**这一轮把「用例编码了错误期望」这件事摊开了**：那 6 条用例是照着**当时的产物**写的，
而产物本身是错的（把导入列表当类型字面量）。修正时按 TypeScript 的真实结构断言
（`import type { A }` 是 `ImportClause` 下的具名绑定，一个 `PropertySignature` 都没有），
并在文件里写了 note 说明为什么改 —— 这正是「期望要表达该有的结构、而不是现在的输出」这条规矩的价值。

**这一条的解法值得记**：第 32、34 轮试的三版判据都从「祖先链里有没有类型宿主」入手，
全失败（`Parent` 指针在单元被上层收走之后是过期的）；换成「看操作数**右边紧邻**的单元」
一次就中 —— **判据要落在不受搬移影响的形状上**。

**残留 −4**：`lib.es5.d.ts` 里 `bind<…>(this: (this: T, ...args: [...A, ...B]) => R, …)` 那种
**元组里连写两个 `...`** 的形状（`[...A, ...B]`），每个 `...` 的右边是 `,` / `]`，
与数组字面量 `[...a, b]` 的形状完全重合，用「右边紧邻」分不开 ✗ —— 留在差分账上，
需要一条真正能分辨「元组类型」与「数组字面量」的判据（列在遗留清单第 2 条）。
| **元组类型的 `...`（上一轮登记的用例）** | 复查了祖先链：`JsonArray < Root` —— 那对 `[` 在 `TypeAssign` 收走它之后**父指针没有更新**，所以任何「往上找类型宿主」的判据都不可靠 ✗ | 用例继续留在台账（1 条），已记下「判据不能依赖祖先链」这一条 |

**元组那一条的复查结论值得记**：我用调试打印看到 `...` 的祖先链是 `JsonArray < Root`，
而同一份产物里那个 `JsonArray` 明明在 `TypeAssign` 里面 —— 说明**单元被上层规则收走之后，
`Parent` 指针没有跟着更新**。所以「往上找类型宿主」这条路本身走不通（第 32 轮那三版判据失败也是这个原因）；
要判元组得换一条不依赖祖先链的判据（例如看那个 `[` 的**兄弟**里有没有 `,` 分隔的类型元素）。

**定位过程**（`field-where.cjs`：把 AST 属性与产物 `Field` 并排列出来）一眼看到 `cjcli.ts` 里
一个 5 成员的类型别名却出了 **9 个 `Field`**（`Input Output Help Version Error` 之后又跟着
`Input Output Help Version`）。然后按行二分：前 80 行正常、前 100 行就变 9 ——
落在 `const options: CliOptions = {` 那个对象字面量上。

**剩下的 −16**（`undici-types/websocket.d.ts` −4、`dist/ts/cjcli.ts` 已修、`cookies.d.ts` −1、
`header.d.ts` −1 …，另有 `fetch.d.ts` +1、`mock-interceptor.d.ts` +3 的反向差额）
大概率是同一族的其它值位花括号（参数默认值、泛型默认值等），下一轮用同一套工具接着找。
| **元组类型里的 `...`** | 它是 `RestType`、不产生 `SpreadElement`，但会被收成 `Spread`（剩下的那 4 个） | 登记成用例 `type-tuple-rest`（`xl:absent Spread`），台账 **0 → 1** |

**这一轮的方法论收获**：前两版判据都在**位置**上做文章（父亲是谁、父亲的父亲是谁），两版都错；
换成**形状**（后面有没有类型标注）一次就对了 —— 而且顺带发现了与 `NotNull` 的
`IsDefiniteAssignment` **同一个坑**：本规则位次靠后，跑的时候 `: A[]` 已经收成 `TypeDefine` 节点，
判据必须同时认「符号」与「已成形节点」两种形态。
| **钉住展开的四种容器** | 新增用例 `expr-spread-containers`，用**个数断言**（`xl:expect Spread:6,…`）锁住「调用实参 / 数组字面量 / 嵌在实参里的数组 / 对象（两个）/ `new` 实参」一个都不能少 | 879 条用例全绿；写用例时我自己把个数算成 5、被框架当场指出来（实得 6）——**个数断言连作者的算术错误也能抓** |

**这一轮的判断**：假阴性比假阳性糟。多算几个 `Spread` 只是差分账上偏大，
漏掉一个真实的展开则是把一个节点悄悄吞掉、下游再也看不到。
所以那一支回到最简单的一条判据，把 16 个假阳性**留在账上**，而不是用一条会误伤的判据去盖住它。

| **第十七批** | 改动 | 结果 |
| --- | --- | --- |
| **展开运算符没有节点**（最后一条在案用例） | 新增 `spread.xl.md`：`SpreadReorganization` + `Spread`。**难点是它与 rest 参数的歧义** —— `(...args: T[])` 在 AST 里是 `Parameter` 上的 `dotDotDotToken`，**不**产生 `SpreadElement`，而 rest 参数比 spread 多得多。判据用「`...` 的父亲是谁」：`Method`（调用）/ `JsonArray` / `JsonObject` / `NewArguments` 收 ✓，参数括号 / `LamdaParameter` / `[` 解构括号不收 ✗ | 用例 `expr-spread` 转绿 —— **在案缺口归零（878/878 全部通过）** |

四种形状的父亲是**实测**出来的（`call(...args)` → `Method`、`[...items]` → `JsonArray`、
`{ ...base }` → `JsonObject`、`new Foo(...args)` → `NewArguments`；
`function f(...args: T[])` / `class C { m(...args) {} }` / `(...args) => 1` / `type F = (...args) => void`
→ 参数括号或 `LamdaParameter`）——这一张表就是判据本身。

**遗留 −16**：`Spread` 产物比源码多 16 个（`lib.es5.d.ts` 8、`sqlite.d.ts` 6、`events.d.ts` / `stream.d.ts` 各 1），
全是**调用签名 / 函数类型里的 rest 参数**（`interface X { f(...args: A[]): void }`）——
`A[]` 的 `[` 先长成 `JsonArray`，那个 `...` 于是正好落进一个「`JsonArray` 父亲」里。
补了 `IsInTypePosition`（往上八层撞 `TypeDefine` / `TypeAssign` / `GenericType` 就退出）之后
数字**没变**，说明这些 `...` 的祖先链里没有这三个节点，需要换个判据（下一轮的第一件事）。

**根因是调试打印抓出来的**（patch 一下生成的 `field.js` 就能看到单元序列）：

```text
0:Wrap 1:public 2:static 3:readonly 4:A 5:: 6:T 7:= 8:new 9:MethodDeclaration(R(1)) 10:public 11:static …
```

`R(1)` 被 `MethodDeclarationReorganization` 收成方法声明，而它按 `DeclarationEnd` 的约定
**连同结尾的 `;` 与随后的软换行一起收走** —— 于是字段 A 的 `MemberEnd`：

- 看不到 `;`（已经进了方法声明）；
- 也看不到软换行（同样被吃掉）；

一路扫到**字段 B 的 `;`** 才停 ✗，B 乃至后面每个成员都被吞进 A（`<New>` 也因此从来没有成形过）。

**加完第一版之后差分引擎报出「多出 20 个 `Field`」**，说明这条新判据在别处劈得太早；
补了「后面是 `Keyword` 或 `as` / `satisfies` / `instanceof` / `in` / `of` 就不算边界」之后
`Field` 的行从「缺 8」变成「多 20」。**这 −20 尚未定位**（分布在 `undici-types/websocket.d.ts`、
`dist/ts/cjcli.ts` 等几个文件里，每个 ±1～4），留作下一轮的第一件事：
它不再是「丢节点」，而是「多出节点」，很可能仍是这条新判据与某个尚未覆盖的初始化形状撞车。
| **用例只能查「有没有」、不能查「有几个」** | `xl:expect` 加了**个数写法** `Tag:2`（`run.mjs` 按个数比对、`validate.mjs` 校验写法） | 这一类 bug 从此能被用例抓住 —— 本轮就是它把下面那条抓出来的 |

**优先级与结合性怎么来的（本轮的算法要点）**：

- **优先级**：重组是**按规则**扫的，排在前面的规则整趟先跑完。把 `**` 排在 `*` 前面、`*` 排在 `+` 前面，
  `a + b * c` 里 `*` 先折成节点，`+` 折叠时右操作数正好是它 → 得到正确的树 ✓；
- **左结合**：同一个实例在一趟里从左往右扫，`a - b - c` 先折 `a - b`、再折 `(a-b) - c` ✓；
- **`IsOperand` 要认 `BinaryOperator` 自己**，否则左结合第二步找不到左操作数。

**四处「不能收」的判据（都是实测踩出来的）**：

1. **运算符集刻意不含 `|` / `&` / `<` / `>`**：它们在类型位另有含义（联合/交叉、泛型实参），
   已经被类型规则收走；`&&` / `||` 早就有 `LogicalOperator` 了；
2. **`[` 括号里一律不成立**：那是**映射类型**（`{ [K in keyof T]: T[K] }`）与索引签名的地盘，
   `in` 是类型语法的一部分。不挡的话四条映射类型用例全炸；
3. **`Operator` 属性要过 `CommonUtil.XmlDecode`**：`<=` 里的 `<` 直接写进属性会**破坏 XML**
   （`expr-compare-lt-le` 报的 `XML 里出现没转义的 <` 就是它）；
4. **两个运算符类都要挂 `InitialKeywordReorganizationQueue`**：节点是重组规则建出来的，
   里面的 `in` / `instanceof` / `typeof` 不会再被外层扫到，不挂队列就永远停在 `Common`
   （`ex-unary-ops` / `lex-keyword-in-of` / `type-mapped-basic` 三条用例报的 `缺 Keyword` 就是它）。

**已知的优先级不准确一处**：`a && b + c` 里 `&&` 的规则位次比四则**早**（历史位次），
所以会得到 `(a && b) + c`；按 TypeScript 应当是 `a && (b + c)`。
修它要把 `LogicalOperator` 挪到四则之后，属于另一次改动（已记在 `IsOperand` 的说明里）。

**新发现一条既有 bug**：类的静态字段初始化里有 `new` 时，**后面那个成员会被吞掉**
（`A: T = new R(1);` 之后的 `B: T = new R(2);` 收不成 `Field`；与 `new` 无关的写法都正常）。
它只在实现文件里出现，本轮加新文件时才暴露，已登记成用例 `cls-static-field-new`（台账里那条）。

| **第十四批** | 改动 | 结果 |
| --- | --- | --- |
| **一元运算符没有节点** | 新增 `unary-operator.xl.md`：`UnaryOperatorReorganization` + `UnaryOperator`（带 `Operator` 属性），注册在 `NotNullReorganization` 之后、`KeywordReorganization` 之前。`!x` / `-x` / `+x` / `~x` / `typeof x` / `void x` / `delete x` / `x++` / `x--` 都收成节点 | 用例 `expr-unary-operator` 转绿，台账 **3 → 2**；`UnaryOperator` 差额 389 → **50** |

**三处「不能收」的判据，每一处都是实测踩出来的**：

- **`-` / `+` 的二义性**：`a - b` 里 `-` 前面是操作数 → 二元，不收；`x = -1` 里前面是 `=` → 一元，收；
- **`!` 与非空断言**：`!x`（前缀）与 `x!`（后缀）分属两条规则，`NotNullReorganization` 只认后者，不会抢；
- **类型参数列表里的 `typeof`**：`<T extends typeof X = typeof X>` 里的是 `TypeQueryNode`，**不**产生
  `PrefixUnaryExpression`。第一版没收这条判据，产物多出 78 个（`http.d.ts` 20 处、`http2.d.ts` 82 处
  全是这个形状）；父单元是 `GenericType` 时一律不成立之后就对了。

**剩下的 50 个差额是 TypeScript 自己的口径**：负数**字面量类型**（`-1 | 0 | 1`）在 AST 里被算作
`PrefixUnaryExpression`，而它们在类型位、已被类型规则收进 `TypeDefine` / `TypeAssign` ✓ ——
不是真的缺节点，与 `Field` ±1 是同一类聚合口径残差。

`UnaryOperator` 只收紧邻的那一个单元（`-a.b` 只会收 `a`，`.b` 留在外面）：本工程还没有优先级/结合性那一层，
这与「二元表达式还没有节点」是同一个层次的问题，等 `BinaryOperator`（3098 处）那一步一起解决。

| **第十三批** | 改动 | 结果 |
| --- | --- | --- |
| **表达式文法缺口被量化、并登记成用例** | 差分引擎的映射表加上 `BinaryExpression` / `PrefixUnaryExpression` / `PostfixUnaryExpression` / `SpreadElement` / `SpreadAssignment` 五条，标签表白名单加上 `BinaryOperator` / `UnaryOperator` / `Spread`；新增三条用例（`expr-binary-operator` / `expr-unary-operator` / `expr-spread`） | 台账从 0 条回到 **3 条**（这三条是**诚实登记**的已知缺口，跑起来仍然 exit 0）；差分引擎现在直接给出数字：**`BinaryOperator` 3048、`UnaryOperator` 385、`Spread` 32** |

**一个重要发现**：纯 `.d.ts` 语料里这些构造是 **0** —— `@types` + `lib.*.d.ts` + `undici-types` 里
一个二元表达式都没有（声明文件不写函数体）。所以「真实 `.d.ts` 语料无缺口」这一条**不受表达式文法影响**；
受影响的是**实现文件**：本项目自己生成的 `dist/ts/**`（真正带函数体的 TypeScript）里就有
3029 个二元表达式、266 个前缀一元、111 个后缀一元、176 个括号表达式、32 个展开。
差分引擎的语料一直包含 `dist/ts`，所以这些数字是同一把尺子量出来的。

`IsDefiniteAssignment` 的两处细节都是踩出来的：**不能看「父亲是不是 `ClassBody`」**——本规则的位次靠前，跑的时候类体还没成型，`Parent` 指不到（第一版那条判据一次都没命中）；**也不能只看后面是不是 `:` 符号**——位次上 `TypeDefineReorganization` 可能已经先跑过，那时看到的是一个 `TypeDefine` **节点**。

`NotNull` 的行是 255（源码）对 260（产物）：按文件逐个比是**完全相等**的（每个文件的 `NonNullExpression` 数与 `<NotNull` 数一致），所以这 +5 与 `Field` 的 ±1 一样是**聚合计数口径的残差**，不是真的多出节点。

**`Field` 计数残差 1 处**：语料里 20132 个属性（含索引签名）对 20131 个 `<Field`。
三套独立检查都说「没有真的缺」——按**属性名**逐文件比、按**索引签名参数名**逐文件比、
按**每个文件的属性计数**比，全部为 0 差异；把 `dist/` 也算进来时各文件有 +1 / −1 互相抵消。
所以这 1 处是**计数口径的残差**（某一处名字重复导致按名比对看不出），不是某个未成形的构造。
下一步要么把差分引擎的计数改成「按名字 + 容器」的精确配对，要么找出那处重名。

```text
Interface 4539/4539   Class 363/363      TypeAssign 1302/1302   Function 2044/2044
Namespace 327/327     Export 142/142     Let 3467/3467          Enum 79/79
Field 20131/20132
```
```

**到这里，语料里每一种声明都精确对齐了**：`Interface` 4539/4539、`Class` 363/363、
`TypeAssign` 1302/1302、`Function` 2043/2043、`Namespace` 327/327、`Export` 142/142、
`Let` 3457/3457、`Enum` 79/79 —— 差额全是 0。

**只剩 `Field` 23 处**（按文件量只有两个文件：`util.d.ts` 10、`undici-types/fetch.d.ts` 7，
其余是类型字面量计数口径差异）。已抓到的候选形状：类型字面量里的**索引签名**
`{ [longOption: string]: undefined | string | boolean }`（AST 里 `IndexSignatureDeclaration` 3 处）。

用例侧与 `_notes` 不变：872 条用例全绿、台账 0 条、8 条标签表表达不了的语义。

（第 19 轮记下的那个最小复现——`declare namespace N { export type B = … & { … }` /
`export interface O { … }` / `export type Cb = …`——已由本轮的 `AliasEnd` 修复并验证：
三条声明现在各自成形。）

**到这里，差分引擎的「标签表里根本没有对应节点的构造」一栏是空的**：
`Namespace`（含 `declare module "x"`）、`Export`（含 `export =` / `export default`）、
`Signature`、`TypeLiteral`、`DoWhile` 全部有节点、差额为 0。

剩下的只有**节点计数差额**（`Field` 104 / `TypeAssign` 14 / `Interface` 6 / `Function` 1）与 8 条 `_notes`：
前者分布在十几个真实文件里、属于**级联丢失**（同一形状单独测都能成形），
后者是标签表表达不了的语义信息（表达式文法、`NotNull` 被丢、变量修饰词、`Label` 不含被标语句、
`Import` 无结构化属性、`escape-a-bell` 的语言配置取舍等）。
| **关键字方法名**（2 条） | `MethodDeclaration` 在**成员位置**不再查 `MethodNameTemplate`：`class A { delete() {} if() {} for() {} new() {} }` / `interface I { for(): void }` 里的名字正是关键字，而禁用表防的是表达式位的 `if (x)` | 2 条转绿 |
| **计算成员名上的方法**（2 条） | `MethodDeclaration` 认 `[...]` 作名字（复用 `field.xl.md` 的 `BracketNameText`）。两处细节都是踩出来的：`BracketNameText` 的参数类型要放宽成 `Token`（`Process` 跑到时那个括号**已经**是 `JsonArray` 了），名字里的字符串字面量要按内容取（`` [`m`] `` → `m`） | 2 条转绿 |
| **`return` 后面的正则**（2 条） | `RegexTokenBranch.Condition` 里「前一个实义单元是 `Common` 就不算正则」要放**关键字**进来：`return` / `typeof` 在词法阶段还是 `Common`，判据改查它自己的 `KeywordTemplate` | 2 条转绿，`a / b / c` 仍按除号读 |
| **文件开头的 BOM**（1 条） | `SymbolTemplate.IsWhiteSpace` 认 U+FEFF：不算空白的话它会被 `CommonBranch` 吞进紧随的标识符（`\uFEFFconst`），关键字再也对不上 | 1 条转绿 |
| **`import.meta`**（1 条） | `ImportReorganization` 除了拒「后面紧跟 `(`」（动态导入），再拒「后面紧跟 `.`」——那是元属性，不是导入声明 | 1 条转绿 |
| **`new (…)`**（2 条） | `NewReorganization` 接受 `new` 后面紧跟的 `(` 括号（括号里的被构造者）；`Process` 先跳过它一格再找实参括号。**但类型位的构造签名 `new (a) => A` 要留在门外**——判据是括号后面紧跟 `=>` | 2 条转绿，`ex-new-variants` 的五种写法都成 `New` |
| **`for await`**（2 条） | `ForeachReorganization` 跳过 `for` 与 `(` 之间的 `await`；`Process` 里**同样要跳**（只改一边会抛 `SyntaxException`——这是真实踩到的一次）；`await` 作为子单元留在 `Foreach` 里，所以 `Foreach` 的构造器补一条关键字队列 | 2 条转绿 |
| **`satisfies` 的类型位判定**（1 条） | `IsTypePosition` 的类型位关键字表补 `satisfies`：`x satisfies Record<string, number>` 的 `<…>` 右端是语句结尾而不是 `(`，不判类型位过不了后继闸 | 1 条转绿 |
| **字符串字面量类型实参**（1 条） | `ScanArguments` 的类型实参字母表补**成对字符串**（`Exclude<K, "a">`）；成对吃掉，所以不会把比较链读成泛型 | `type-mapped-as` 转绿 |
| **映射类型的成员名**（同上） | `BracketNameText` 遇到 `in` 就停：`[K in keyof T]` 的名字是 `K`，不停会拼成 `KinT` | 同上 |
| **匿名函数表达式**（1 条） | `FunctionReorganization` 允许没有名字（`function () { … }`）：`export default function () {}` 与 IIFE 都是这个形状 | 1 条转绿 |
| **`InitialTypeReorganizationQueue` 改名 `InitialKeywordReorganizationQueue`** | 它现在有四个用户（`TypeDefine` / `TypeAssign` / `Export` / `Foreach`），后两个不是类型段——名字按「做什么」而不是「谁先用」取 | — |

**又一批期望纠正**（都记了理由）：`mod-export-default-function-{named,anon}` 的 `ReturnType`
（源码里没有返回类型标注）、`mod-export-equals-qualified` 的 `TypeDefine`（把 `export =` 的 `=` 当成了类型标注）、
`ex-new-variants` 的 `Keyword`（`new (…)` 认下之后不再有裸的 `new` 词）、
`decl-class-string-method-name` 的 `Method` + `String`（`Method` 是**调用**节点；字符串名现在进 `MethodName` / `FieldName` 属性）、
`itf-methods` 的 `Interface,Field`（取值器折成 `Modifiers="get"` / `"set"` 的方法声明）、
`mod-export-type` 与 `mod-import-dynamic-type-position` 的 `TypeDefine`（别名右侧没有冒号）。

到这里：**在案缺口 47 → 6**（两轮共清 41 条），测试集 870 条 / 864 通过 / 0 新增 / 0 过期；
真实语料 `Interface` 差额 **23 → 6**、`Function` **3 → 1**、`Export` **92/92**，359 个文件零解析异常。

**最后 6 条**（都不小，留给后续）：

1. `expr-iife-function` / `expr-iife-arrow`（2 条）：`(function () { … })()` / `(() => 1)()` 的外层调用。
   内层函数 / 箭头已经成形，缺的是**括号表达式作被调用者**——那是表达式文法那一块的入口。
2. `type-cond-nested` / `type-cond-union-member`（2 条）：**括号里的**条件类型仍被收成 `TernaryOperator`
   （第 15 轮只挡住了泛型实参段里的那一种；括号的队列是通用队列，判类型位要往上多找一层宿主）。
3. `type-import-generic`（1 条）：`import("./m").A<T>` 里的 `<T>`——`IsTypePosition` 走到
   `import("m")` 那个括号单元就判成表达式位了。
4. `lex-unicode-escape-identifier`（1 条）：`const \u0061bc = 1`，词法层要认 `\uXXXX` 转义序列。


**已完成**（`docs` 里逐轮有记录）：

- 在仓库内落地了可回归的缺口测试集（`tests/parse`：870 条用例、7 个分区、台账 + 三条 npm 脚本）与
  **用 TypeScript 自带 AST 做差分对照的自动找缺口引擎**（`differential.mjs`）。这个引擎一共揪出
  **四处手写用例完全没覆盖的缺陷**：下划线标识符、字符串字面量成员名、`$` 标识符、`import` 类型的吞噬
  ——每一次都是「用例集全绿、真实语料在丢节点」。
- 真实语料：359 个文件（`@types` + `lib.*.d.ts` + 本项目产物）**解析零异常**。
- 在案缺口 **133 → 6**（清掉 127 条）；`Field` 8751 → 19793、`MethodDeclaration` 601 → 11379、
  `Let` / `Class` / `Export` / `Namespace` 差额为 0、`Function` 差额 1、`Interface` 差额 6；
  `Signature` / `TypeLiteral` / `Namespace` / `DoWhile` / `Export` 五个结构性节点从无到有。

**还没做**（按优先级，30 轮预算用完时的交接）：

1. **`Spread`**（在案最后 1 条用例，语料 32 处）：`f(...args)` / `[...xs]` / `{ ...obj }`。
   形状与第 27 轮的一元规则同源，但**必须先解决「rest 参数」的同形问题**：
   `(...args: T[])` 在 AST 里是 `Parameter`（带 `dotDotDotToken`），**不**是 `SpreadElement`；
   按形状硬收会把 rest 参数也算成 `Spread`（语料里 rest 参数比 spread 多得多）。
2. **`Field` 多出 20 个**（`undici-types/websocket.d.ts` −4、`dist/ts/cjcli.ts` −4 …）：
   已确认**不是**第 29 轮那条 `IsDeclarationTailEnd` 造成的（收窄白名单前后数字不变），
   是另一处「一个 AST 属性被收成两个 `Field`」的形状，需要按文件逐个定位（用第 20 轮的
   `diff-names` 思路，但要改成报 `got > want`）。
3. **表达式文法还剩两块**：
   - `BinaryOperator` 差 1434 —— 全在**刻意排除**的运算符族（`<` `>` 比较、`&` `|` 位运算，
     以及走 `LogicalOperator` 的 `&&` `||`）。要收 `<` `>` 得先解决「与泛型实参同形」；
   - `UnaryOperator` 差 50 —— 负数**字面量类型**（`-1 | 0 | 1`）在 TS 的 AST 里算
     `PrefixUnaryExpression`，而它们在类型位、已被类型规则收走，属于**口径残差**不是缺节点。
4. **`LogicalOperator` 的位次**：它排在四则之前，导致 `a && b + c` 得到 `(a && b) + c`
   （按 TS 应为 `a && (b + c)`）。修它要把两条 `LogicalOperator` 实例挪到四则之后，
   属于会动到既有顺序的改动。
5. **8 条 `_notes`** 里仍未处理的：`imports-unstructured`（`Import` 只带 `From`，没有导入名/
   别名/type-only/attributes）、`exports-no-node` 里剩下的结构化属性、
   `escape-a-bell`（`\a` 解成响铃字符，是 Cangjie 语言配置的取舍、不属于语法层）。

**三十轮总账**：在案缺口 133 → **1**；测试用例 0 → **878**（877 通过）；
语料 3 → **361** 个文件、解析失败 3 → **0**；构造种类从「一半没有节点」到
`Interface` / `Class` / `TypeAssign` / `Function` / `Namespace` / `Export` / `Let` / `Enum`
**差额全为 0**；`Field` 8751 → 20164。

---

（以下是第 1～14 轮那版「还没做」清单的原文，**其中绝大部分已经做掉了**，留作对照：
括号里的条件类型 ✓、`import("…").A<T>` ✓、`\uXXXX` 标识符 ✓、`declare module "x"` ✓、
`export =` / `export default` ✓、`in` / `of` 关键词化 ✓、`Field`/`TypeAssign`/`Interface`/`Function` 零头
（只剩待查的 −20）✓。仍然有效的只有：**表达式文法**（已做一元与二元主干，剩 `Spread` 与排除的运算符族）、
**JSX / TSX**、**类里的 `static { … }` 块**。）

1. **P3 表达式文法**：二元 / 一元 / 赋值 / 序列表达式仍然没有节点（最大的结构性空白，`_notes.expr-tree-absent`）。
   它同时是最后两条 IIFE 用例的根因（括号表达式/`import.meta` 不是调用规则的「被调用者」）。
2. **括号里的条件类型**（2 条）与 **`import("…").A<T>` 里的泛型实参**（1 条）：判类型位要往上多找一层宿主。
3. **`\uXXXX` 形式的标识符**（1 条）：`const \u0061bc = 1`，词法层要认转义序列。
4. **`declare module "x" { … }`**（ModuleDeclarationString 115 处）与 **`export =` / `export default`**
   （ExportAssignment 50 处）——标签表里最后两块没有节点的构造。
5. **零头**：`Field` 338 / `TypeAssign` 15 / `Interface` 6 / `Function` 1（多为 `declare module` 体内与类型字面量的边角）。
6. **`in` / `of` 的关键词化**：要先把 `For` / `Foreach` 的判定改成「`Common` 或 `Keyword` 都认」。
7. **JSX / TSX**、类里的 `static { … }` 块。

---

# 42 轮结束时的完成度总账

## 已达成

| 判据 | 证据 |
| --- | --- |
| **测试集全绿、在案用例归零** | 879 条用例 / 0 条不合格 / **台账 0 条** / 新增过期 0，`cases:run` exit 0 |
| **真实 `.d.ts` 语料无缺口** | 362 个文件、解析失败 **0**；`Interface` 4539/4539、`Class` 369/369、`TypeAssign` 1302/1302、`Function` 2045/2045、`Namespace` 327/327、`Export` 142/142、`Let` 3557/3557、`Enum` 79/79 **差额全为 0** |
| **差分引擎能自动找缺口** | `differential.mjs`：AST ↔ 产物逐标签比对 + 未标签构造归因 + 按文件取样，能把「没成形的构造」直接指到行号 |
| **一致性测试集可扩展** | 879 条用例分 7 个 area；内联指令 `xl:expect`（含**个数**写法 `Tag:2`）/ `xl:absent` / `xl:note` / `xl:ts-invalid` / `xl:bom` |
| **xl 静态检查干净** | 133 个 `*.xl.md`、0 error、0 warning |

## 未达成（`.ts` 实现文件的四类残差）

| 标签 | 差额 | 性质 | 下一手 |
| --- | ---: | --- | --- |
| `BinaryOperator` | 29 | 形状**单独测都能成形**，但在方法体/条件里被更早的规则（`IfSet` / `Let` / `MethodDeclaration` …）收走后，那批单元**再没跑过通用队列** | 查「哪些节点收了内容却不给自己装队列」——与「祖先链过期」是同一类问题的另一面 |
| `Field` | −8 | 计数残差（`websocket.d.ts` 一类），方向是「多出」 | 用 `field-container2.cjs`（按容器 + 标签深度切块）继续定位 |
| `Spread` | −4 | `lib.es5.d.ts` 的 `[...A, ...B]`：每个 `...` 右边是 `,` / `]`，与数组字面量 `[...a, b]` **形状完全重合** | 需要一条能分辨「元组类型」与「数组字面量」的判据（不能用祖先链） |
| `UnaryOperator` | −1 | 口径已对齐（几乎精确） | 无需处理 |

## 定性为「设计取舍 / 口径差异」（不是缺口，已从账上剔除）

- **`<` / `>` 比较不做二元节点**：与泛型实参同形，`GenericTypeBranch` 在词法阶段就要靠它们配对；
- **`&&` / `||` 走 `LogicalOperator`**、**赋值族 `=` / `+=` 不做节点**：另有归属；
- **负数**字面量类型**（`-1 | 0 | 1`）：TS 的 AST 记成 `LiteralType` 里的 `PrefixUnaryExpression`，本工程按类型收进 `TypeDefine` / `TypeAssign`；
- **`escape-a-bell`**：`\a` 解成响铃字符是 Cangjie 语言配置的取舍，不属于语法层；
- **`Label` 与被标语句平级**：有意为之（与用例期望一致）。

## 交给下一轮的「坑地图」（每条都是实测换来的）

1. **祖先链不可靠**：单元被上层规则收走之后 `Parent` 指针是**过期的**（调试打印里 `JsonArray` 的祖先链是 `JsonArray < Root`，而它在产物里明明位于 `TypeAssign` 里面）。**判据要落在不受搬移影响的形状上** —— 元组 `...` 的修法（看操作数右边是不是空 `[]`）就是这条教训的产物。
2. **判据宽一点点，后果是几十个节点消失**：反斜杠（`IsUnicodeEscapeStart`）、续行符号（`IsMemberBoundary`）、类型标注（`IsRestParameter`）、关键字表（`IsOperand`）—— 四处都这么踩出来。**改判据后先跑差分引擎**，数字会立刻告诉你有没有误伤。
3. **位次决定语义**：同一形状在不同队列位次上结果不同（`Field` 早于 `JsonObject`、`TernaryOperator` 早于 `TypeAssign`、`LogicalOperator` 原来早于四则导致优先级错）。**给节点装队列**（`InitialKeywordReorganizationQueue` / `InitialStatementReorganizationQueue`）是补位次的常规手段。
4. **量化工具的账目错了，会把人引到错的地方**：`BinaryOperator` 曾报出 1518 的缺口，其中一半以上另有归属（赋值、`LogicalOperator`），真正该修的只有 165。**先按维度数一遍，再动手**。
5. **用例可能编码错误期望**：6 条 type-only import/export 用例是照着**当时错的产物**写的；修正要按 AST 的真实结构断言，并写 note 说明理由。

## 复现方式

```powershell
npx xl check                                  # 静态检查（0 error / 0 warning）
node tests/parse/validate.mjs                 # 用例格式与标签白名单
node tests/parse/run.mjs                      # 879 条用例；--verbose 看每条产物
node tests/parse/differential.mjs real        # 真实语料差分（AST ↔ 产物）
node samples/check.mjs                        # 三个样例的逐字节 XML 校验
```

| **第二十九批（方案 A 开工）** | 改动 | 结果 |
| --- | --- | --- |
| **把「类型位 / 值位」判定提前到开括号那一刻** | 新增 `DecideBracketContext(host, openChar)`（`text-common-util`）+ `Bracket.Context` 字段（在 `bracket.xl.md` 的 `Success` 里算好）。判据只看**词法阶段的平列表**、不碰祖先链；`Data` 里扫不到信号就**往上爬一层**（词法阶段父指针已就位，且只读平铺的前文词） | 探针验证：`type M<T> = { [K in keyof T]: T[K] }` → `[=type` ✓、`a[0]` → `[=value` ✓、`import type { A }` → `{=value` ✓ |
| **消费方切换（`TypeLiteral.IsTypePosition` 先读 `Context`）** | 试了、**退回了** | 5 条用例失败 + **2 个语料文件解析失败** ✗ |

**退回的原因是本轮最有价值的发现**：词法阶段是**平列表**，它分不出「`outer: { … }` 这种**标签的冒号**」
与「`x: { … }` 这种**类型标注的冒号**」。老走法能对，是因为它跑的时候 `LabelReorganization`（位次 7）
已经把冒号收走了，而 `TypeLiteralReorganization` 在位次 15 —— **它看到的是一个已经成形的 `Label` 节点**。

也就是说：**方案 A 的判据必须把「后来的规则才带来的区分」一并补进来**，否则「提前判」等于「用更少的信息判」。
补充判据的方向已经明确（判在**宿主**的形态上）：

- 宿主是**参数括号** → 冒号是类型标注 ✓ 类型位；
- 宿主是**语句列表**、且冒号前是一个**裸露的名字**（前面是语句边界）→ 那是个标签 ✗ 值位（块）。

基础设施（`Bracket.Context` + `DecideBracketContext`）**已经落地且行为中性**：879 条用例全绿、
3 个样例逐字节一致、362 个语料文件零解析失败 —— 它现在只是**还没被任何判据消费**。
下次接手：补上上面那条区分 → 切换 `TypeLiteral` / `Spread`（元组）/ `BinaryOperator`（映射类型）三处消费方。

---

# 第 43 轮起：以「正向差额」为目标的清账（仪表驱动）

## 工具（本轮新建，都在 `tests/parse/`）

- `gap-dashboard.mjs`：**精确差额仪表**。把每个 TS 构造与产物的对应标签逐文件对账，
  **正向差额（真缺）与负向差额（真多）分开统计**，并把每个缺的节点落到行号与容器上下文。
  为什么必须有它：原来的 `differential.mjs` 按标签算 **净额** `源码构造数 − 产物节点数`，
  同一个标签在 A 文件多、在 B 文件少时会**互相抵消**，于是「差额全为 0」并不代表没有缺口
  （实测方法成员一时真缺 172 / 真多 313，净额只报 −141）。
- `probe.mjs`：最小片段探针，同时打印 TS 自带 AST 与本工程 XML 产物。
- **重要**：`xl_build` 的增量缓存会「报 generated 但不写盘」。改 `*.xl.md` 之后必须
  `xl_build --force`（或核对产物内容真的变了）再测，否则测量全落在旧代码上（本轮踩过，浪费了一整批读数）。

## 本轮清掉的缺口（都有回归用例与差额数字）

| 缺口 | 根因 | 差额变化 |
| --- | --- | --- |
| 计算名方法无体 `[Symbol.iterator](): T` | `SignatureReorganization` 排在方法声明规则之前，`(` 的判据只挡 `Common`/`GenericType`，挡不住 `[` | 方法类真缺 172 → 23，假 Signature 172 → 2 |
| 字段初始化器里的 `new` `A = new C("x")` | 成员签名判据只看「名字父单元是不是成员体」，而初始化式里的名字也在成员体里 | `new` 真缺 84 → 0 |
| 字段三形状：`[KEY] = 1` / `x!: T` / `h?: Record<A,B>` | 计算名只认 `:` `?:`；`!` 不在延续集；`IsTypePosition` 不认 `?:` | 字段 17 → 0（后续再修 `?`） |
| `using` / `await using` | `Let` 不认 `using`，也不在关键字表 | 变量声明 4 → 0 |
| 匿名类表达式 `class extends B {}` | 匿名判定只认「`class` 后面直接是 `{`」 | 类 1 → 0 |
| 嵌套三元（右结合两层） | 外层先从左边的 `:` 触发、把内层切碎；`Process` 的真值段又越过内层 `?` | 三元 3 → 1 |
| `namespace A.B.C {}` 不嵌套 | 只出一个扁平的 `NamespaceName="A.B.C"`；TS 里是三层嵌套 ModuleDeclaration | 命名空间 4 → 0 |
| 二元四条根因（见下） | 括号判据写错字段（死代码）/ 一元名单不齐 / `[` 守卫过宽 / 组合符号表缺 `<< >> >>> **` | 二元 117 → 17 |
| 三元三个分支段没有队列 | 构造器只 `super`，`ReorganizationQueue` 为 null → 内部一趟重组都不跑 | 二元再降（三处分支里的算符） |
| 泛型后继闸缺 `[` | `X<A, D>[]` 的 `>` 后面是 `[`，试读被判否，泛型只吃到 `X<A` | 方法类 23 → 18 |
| 可选但无类型标注 `private x?;` | `?` 后面直接 `;`、不合并成 `?:`，落不进 Field 的延续集 | 字段 10 → 0（第 2 次） |
| `return !(x)` 被收成非空断言 | `return` 在 `KeywordReorganization` 之前还是 `Common`，被 `NotNull` 当成被断言者 | 一元 5 → 0 |

**净效果：真缺 435 → 57**（语料 1248 个文件，解析失败 0；用例 879 → 889，全绿；samples 三份逐字节一致）。

## 被否决的改法（留给后人，别再试）

1. **`Token.Reorganize` 改成「每条规则重复扫到无改动」**：能让三层以上嵌套三元收敛，
   但它是**对所有规则生效**的——`npm run cases:run` 直接 `FATAL ERROR: heap out of memory`
   （单条用例全正常，883 条一起跑就爆）。已退回单趟。
2. **把 11 个复合赋值符号补进 `IsCombinedSymbol`**：让 `expressions/ex-logical-assign`
   （`a ??= 1` / `a &&= 2` / `a ||= 3` / `a **= 2` / `a >>>= 1`）**内存失控**
   （单条 200ms、整份文件 5 秒超时 + 768MB 堆爆）。机制是
   `CompoundAssignmentOperatorReorganization.Process` 的「切成 op + = 再克隆左值」
   与「克隆出来的单元又被同一条规则重新处理」叠在一起发散。已回退。
3. **`IsMemberSignature` 改成「参数表后面必须紧跟 `:`」**、**`BodyIndex` 加「跨行且没见过 `{` 就判无体」**：
   两条**都是净回归**（把接口里成片的多行重载、一行一条的 `get x(): number` 一起打掉，
   方法类真缺 18 → 37 / 41）。用例集是绿的、只有 `gap-dashboard.mjs` 的逐节点对账能抓出来。
   要修得先能区分「体在下一行」与「下一条成员」——只往前看分不出来，
   方向是让 `Process` 把「同一行内的 `: 类型`」标成一段（`TypeDefine` 带「以换行收尾」标记）。

## 本轮结束时的剩余（真缺 57，按大小）

| 组 | 真缺 | 形状与已知信息 |
| --- | ---: | --- |
| 二元运算 | 17 | 绝大多数是**有意排除**的口径：值位 `\|` / `&` / `^`、逗号表达式（`,` 需要值位/类型位判别，裸加会让参数表/实参表全被折，实测 `,` 多 1141）；`1 << 2` 的枚举计算成员；`a as B + c` 的 `As` 无队列 |
| 类型字面量 | 6 | `@types/node/http2.d.ts` 的**空类型字面量** `() => {}`（产物是 `<Bracket>` 无子单元）；`mock-interceptor.d.ts` 的对象字面量在箭头返回位 |
| 成员·签名 | 5 | 构造签名 `new (?: any): Object` 被 `<New>` 包住（仪表口径）；**泛型调用签名** `<TIn extends Node>(…)` 完全无起点 |
| 成员·方法 | 4 | **类里「无体重载 + 带体实现」**（见上「被否决的改法 3」）；`[EventEmitter.captureRejectionSymbol]?<K>(…)` |
| 字段 | 4 | `{ statusCode: number, data?: …, responseOptions?: … }` 对象字面量在箭头返回位（3）；`readonly [Symbol.iterator]: () => …`（1） |
| 对象字面量 / 数组 | 3 / 1 | 解构模式 `{ a: { b: 1 }, c: [2] }` 里的嵌套字面量 |
| 函数 | 2 | `typescript.d.ts` 里 `namespace` 体内的 `function createInstallTypingsRequest(…)` |
| 三元 / 装饰器 / 标签 | 各 1 | 三层以上嵌套三元；`@(expr)` 装饰器表达式；`return` 后换行对象里的 `a: 1` |
| **整族未做** | — | **类 `static {}` 初始化块**、**JSX/TSX**（`</div>` 被正则词法吞掉、吞掉文件余下内容） |

## 下一轮建议的入口

1. 「值位 / 类型位」判别（`Bracket.Context` 对 `(` 目前返回 `""`）——它是 `|` `&` `^` 与逗号表达式
   这 17 个二元缺口的前置条件，也是本轮反复绕不开的机制。
2. `As` 挂队列（`a as B + c`），与三元分支段那次是同一类修法。
3. 类型位文法（联合 / 交叉 / 条件 / 映射 / 元组 / 函数类型）——现在类型位只是"整段收进节点"，
   这是「完整解析 TypeScript」最本质的一块空白。

## 第 44 轮（继续清账）：类型位两处 + 泛型调用签名

本轮真缺 57 → 31（1251 文件，解析失败 0；用例 889 → 891，全绿；samples 三份逐字节一致）。

| 缺口 | 根因 | 差额 |
| --- | --- | --- |
| 函数类型的返回类型字面量 `(opts: X) => { a: number }` | `TypeLiteralReorganization.IsTypePosition` 往前扫到 `=>` 落到「其它符号 → 值位」那一支，整个 `{ … }` 退化成裸 Bracket | 类型字面量 6 → 0 |
| 泛型调用签名 `<TIn extends Node>(node: TIn): void` | `SignatureReorganization.Previous` 只有「`(` 开头」与「`new` 开头」两种起点 | 成员·签名 5 → 0 |

两条**中性或净回归**的尝试（记下来避免重犯）：

- `IsTypeLiteralBracket` 加 `=>`：中性——那个方法只服务 `Function` / `MethodDeclaration` 的体判定。
- `Lamda` 语句体的 `units.slice(index + 1, endIndex + 1)` 改成 `endIndex`：净回归（3 条用例失败），已回退。
- 泛型调用签名那一支**必须同时加「`<` 前面有名字就让给方法声明」的守卫**，
  否则 `m<T>(x: T): T` 会被抢成 Signature（`Signature` 规则的位次在
  `MethodDeclarationReorganization` 之前）。

**当前剩余 31**：二元 17（多为有意排除的值位 `|` `&` `^` 与逗号表达式）、
成员·方法 4、对象字面量 3、函数 2、数组 1、字段 1、三元 1、装饰器 1、标签 1，以及若干仪表口径；
**整族未做**：类 `static {}` 初始化块、JSX/TSX。

## 第 45 轮：值位位运算收节点；复合赋值缺口定位到根因

真缺 31 → 25（1254 文件、解析失败 0；用例 891 → 892 全绿；samples 三份逐字节一致）。

### 修掉：值位 `|` / `&` / `^`（二元 17 → 12）

原来的排除理由是「它们在类型位另有含义」。插桩后发现**位置本身就能分开**：
类型位那一份在轮到 `BinaryOperatorReorganization` 时**已经被收进节点**了
（`type T = A | B` 里 `A | B` 是 `TypeAssign` 的子单元、`let v: A & B` 里属于 `TypeDefine`），
值位那一份是**语句的直接子单元**。于是加 `BitwiseInstance(["|","&","^"])` +
`IsValuePositionBitwise`（父单元必须是语句级容器），值位成节点、类型位不受影响。

### 定位但未硬修：复合赋值

- **OOM 的根因找到了**：`CompoundAssignmentOperatorReorganization.Process` 把 `&&=` 切成 `=`
  与一份 `&&` 副本插回列表，**那份副本本身也在 `CompoundAssignmentSymbols` 的判据范围内**，
  被反复切开导致单元数翻倍。加 `Symbol.FromCompoundAssignment` 标记排除该副本后不再 OOM。
- 但**补全符号并不能修好产物**：`Process` 的切分/插入顺序本身是坏的——
  `a &= b` → `a` `=` `a` `&` `b`（`&` 掉到 `=` 右边）、`a <<= b` → 两层 `BinaryOperator Operator="<="`。
  所以符号表回退到 4 个，缺口与修法方向写进 `compound-assignment-operator.xl.md`。

### 新增 `tests/parse/DASHBOARD-NOTES.md`

把仪表的全部已知口径固化下来（已剔除项、真缺里的「标签表选择」、真多为什么大多是故意的），
判据统一成「**判断进展只看真缺**」。

### 本轮结束时的剩余（真缺 25）与性质

| 组 | 真缺 | 性质 |
| --- | ---: | --- |
| 二元运算 | 12 | 逗号表达式 2、复合赋值 4、常量枚举 `1 << 2` 2、其余为口径 |
| 成员·方法 | 4 | 类里「无体重载 + 带体实现」（只往前看分不出「体在下一行」与「下一条成员」） |
| 对象字面量 / 数组 | 3 / 1 | 解构模式里的嵌套字面量 |
| 函数 | 2 | `typescript.d.ts` 一处（已确认同形状在别处正常，属文件特有上下文） |
| 字段 / 三元 / 装饰器 / 标签 | 各 1 | `readonly [Symbol.iterator]: () => …`、三层嵌套三元、`@(expr)`、`return` 后换行对象 |
| **整族未做** | — | **类 `static {}`**（标签表无 Block 标签）、**JSX/TSX**（`</div>` 被正则词法吞掉） |

### 下一轮入口

1. **`(` 的值位/类型位判别**（`Bracket.Context` 对 `(` 仍返回 `""`）——逗号表达式与
   `in`/`instanceof` 之外的剩余二元形状都卡在它上面。
2. **复合赋值的 `Process` 重写**（切分与插入顺序；`FromCompoundAssignment` 已把安全前提铺好）。
3. **类型位文法**（联合/交叉/条件/映射/元组/函数类型）——最本质的一块空白。
