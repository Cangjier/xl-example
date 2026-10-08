# xl-example

用 xl 写成的一套语言前端：**`*.xl.md` 是唯一的事实来源**，同一份规范可以生成多种目标语言。

它解析 TypeScript 风格的源码——把字符流啃成一棵 token 树，再把树打印成 XML。
产物里带一个命令行入口 `cjcli`，可以直接拿一个源文件跑出这棵树。

## 目录结构

规范按「**与语言无关**」和「**某种语言的 token 层**」分成两棵并列的树——多语言的落点就在这里：
新增一门语言就是新增一个与 `typescript/` 平级的目录，`core/` 一行都不用动。

```
core/                    与语言无关的语法层骨架（多语言共用）
  common-util.xl.md        全局工具：XmlDecode / FormatXml
  exceptions/              SyntaxException / SourceException / RuntimeException
  extensions/              列表辅助函数（SkipNext / ReplaceAt …）
  syntax/                  Token / Branch / Reorganization / Source / Document …
    templates/              跳转与重组模板（Template / Sequence / SymbolTemplate …）
  syntax/messages/         插队消息

typescript/              TypeScript 的 token 层（本语言专有）
  text-document.xl.md      值来自字符串的 Document 实现
  text-context.xl.md       解析入口：装配流水线并驱动根单元
  parse-pipeline.xl.md     ★ 跳转优先级与重组优先级（顺序即语义）
  text-common-util.xl.md   跳过软换行的取值器
  list-extensions.xl.md    跳过透明单元的相邻查找
  tokens/                  逐构造的 token：
    identifier.xl.md         <Identifier>  标识符 / 数字 / 布尔字面量的文本块
    symbol-token.xl.md       <SymbolToken> 符号块
    line-wrap.xl.md          <LineWrap>    软换行（不是符号）
    bracket.xl.md            <Bracket>     三种括号共用一个类
    keyword.xl.md            <Keyword>     关键字兜底身份
    class/ function/ if/ for/ foreach/ while/ …   各构造族各占一个目录
    json/                    <ObjectLiteral> / <ArrayLiteral>（值位的两种字面量）
    string/                  <String> / <ConstString> 与四个转义向导

runtime/                 ★ 与语言无关的执行层（多语言共用）——值模型 / 对象表与 GC / 帧 / IR / 内建库 / 宿主 ABI
typescript-exec/         ★ TypeScript 的降级层（本语言专有）——AST → runtime 的 IR

cjcli.xl.md              命令行入口（不属于语法层本体）
```

执行侧的两棵树（`runtime/` ↔ `typescript-exec/`）是上面这两棵的镜像：`runtime/` 与语言无关，
`typescript-exec/` 是 TS 专有的降级层——**新增一门语言就是新增 `xxx/` + `xxx-exec/`，
`core/` 与 `runtime/` 一行都不用动**。
**这两棵树已经在跑**，判据是七道门（见「构建链路」那一节）：

- **执行侧**：值模型 / 堆与 GC / 帧 / IR / 装载验证 / 执行器 / 宿主 ABI；类与继承、集合
  （`Map` / `Set` / `WeakMap` / `Date`）、生成器与 `async`、解构与展开 / 剩余、可选链与空值合并、
  位运算与逻辑赋值、错误家族、`Promise` 与微任务。直接执行 `.ts` 的入口是 `tsrun`，
  判据是**与 `node <文件.ts>` 逐字节相同**。
- **标准库**：`Array` / `String` / `Object` / `Number` / `Math` / `JSON` / `Map` / `Set` / `Date` /
  `Symbol` 等内建族的常用面；`console.log` 的渲染走 `util.inspect` 那一份形状。
- **token 层与投影**：TypeScript 的全套语法构造都能读成 token 树，并且能**逐节点**
  投成 `ts.createSourceFile` 的形状（kind / 区间 / 字段名都对得上）。
- **另一条产物线**：同一份规范也能转成 C++（见 [docs/xl-to-cpp.md](docs/xl-to-cpp.md)），
  `docs/runtime-design-notes.md` 记着那一边的取舍——`runtime/` 转成 C++ 就能嵌进客户的程序，
  不必依赖 wasm、也不必依赖 JS 引擎。

逐轮的变更史**不写在这里**：它在 git 历史里。两份长期文档只留**结论**——
[docs/typescript-parsing-gaps.md](docs/typescript-parsing-gaps.md)（口径边界、审计方法、不再试的改法）
与 [docs/member-layer-plan.md](docs/member-layer-plan.md)（成员层的结论）。

**目录名不是命名空间**：`# namespace` 仍然是扁平的单个 `cangjie`，子层级只用目录表达——
所以 `typescript/tokens/class/class.xl.md` 里的类就叫 `Class`，不带 `Typescript.Tokens.Class` 这样的前缀。

## 构建链路

```
*.xl.md  --xl build-->  dist/ts/**/*.ts  --tsc-->  build/ts/**/*.js  --node-->  运行
```

```bash
npm install          # 只需要 @types/node 与 typescript
xl build             # 规范 → dist/ts/**/*.ts（增量；无改动时 skipped）
npm run compile      # dist/ts/**/*.ts → build/ts/**/*.js（tsc，strict）
npm run samples      # 三个样本与各自 *.expected.tsast.json 逐字节对照（命令行 = 库 API）
node build/ts/cjcli.js samples/hello.ts
node build/ts/tsrun.js tests/runtime/cases/01-values-and-operators.ts   # **直接执行 .ts**
```

**第二个命令行是 `tsrun`**：它把一份 `.ts` 装进执行侧那条真链路
（真解析器 → 降级 → IR → VM）跑一遍，**stdout 与 `node <文件.ts>` 逐字节相同**——
判据 `npm run runtime:cli` 就是这么比的（裁判是真 Node，语料在 `tests/runtime/cases/`）。
用法与约定见 [tsrun.xl.md](tsrun.xl.md) 的 `RunUsage`。

`npm run build` 是前两步的串联（`xl build && tsc`）。

**产物路径镜像规范路径**：`typescript/tokens/class/class.xl.md` → `dist/ts/typescript/tokens/class/class.ts`。
token 层的**跳转优先级**与**重组优先级**都在 [typescript/parse-pipeline.xl.md](typescript/parse-pipeline.xl.md)
（`CreateGeneralQueue` / `GeneralReorganize` / `Install`）——要看「这个语言的解析优先级是什么」，
读这一个文件就够了，新增 token 的改动点也在这里。队首是声明层、队尾是关键字兜底，
**顺序本身就是语义**：

```text
Decorator → Class → Function → Enum → MethodDeclaration → Label → Let → Field → New → Method → …
… → TypeAssign → Lamda → TypeDefine → Ternary → Try → Switch → IfSet → For → Foreach → While → …
… → LineWrap → CompoundAssignment → NotNull → Keyword
```

**打印出来的 XML 是缩进形态**：`cjcli` 走 `CommonUtil.FormatXml`——每个元素一行、按嵌套缩进两格，
只有文本没有子元素的**叶子**留在同一行（否则每个标识符都要占三行，反而更难读）。
缩进只动空白、不动任何标签或属性值；`Root.ToString()` 仍然返回**紧凑单行**形态，
测试与差分脚本用它。`samples/check.mjs` 比对前会把标签之间的空白去掉，所以两边的缩进怎么排都不影响判定。

**第二个出口是 AST JSON**（`cjcli <文件> --ast-json`）：形状照上游 Cangjie 的
`Token.ToDictionary` / `ToList`——顶层是数组、每个节点 `{ type, … , children? }`，
用 `ToList()` 装出来的节点（根那一层、以及 `For` / `Switch` 那些段数组里的）带 `[起始, 结束]` 的 `range`；
叶子写 `value`、有分段的节点（`For` / `Try` / `IfSegment` …）按段名给数组。
键名与值**一律以 XML 属性为准**（同名同值），所以两个出口说的一定是同一棵树；
规格与逐 token 字段表见 [docs/ast-json.md](docs/ast-json.md)。

**第三个出口是 TS 形状**（`cjcli <文件> --ts-ast`）：把同一棵树投成 **`ts.createSourceFile` 的形状**——
`kind` 用**名字**（`"VariableStatement"` / `"Block"`…）、每个节点带 `pos` / `end`、字段名按 TS 的叫法
（`statements` / `members` / `parameters`…），顶层就是那个 `SourceFile` 节点，可以直接和
`ts.createSourceFile` 的转储对拍 / `diff`。规格见 [docs/ts-ast.md](docs/ts-ast.md)；
`unmapped`（投影没覆盖、原样透传的产物标签）走 **stderr**，所以 stdout 里只有形状本身。

**三个出口同源**：`CjcliParse` 造出根单元之后才分叉，XML / AST JSON / TS 形状看的是同一棵树，
结构上没有第二条解析路径。

测试集只留 AST 与执行侧这几道（用户口径，见「判据与缺口」的七道门）：
XML 出口与 token 树质量的那些旧尺子都不在判据里，`coverage` 是**尺子不是门**
（它红只在「比昨天差」）。

`tsconfig.json` 的 `include` 是 `dist/**/*.ts`、`rootDir` 是 `dist`，所以 `dist/ts/cjcli.ts` 落在
`build/ts/cjcli.js`——产物路径里的 `ts/` 来自**目标语言目录**，不是 `rootDir` 多出来的一层。
`exclude: ["dist/cpp"]` 是必要的：`dist/cpp/build/CMakeFiles/**/compiler_depend.ts` 是 CMake 的时间戳文件、
不是 TypeScript，`tsc` 一读它就报 `TS1127`。

生成物：`dist/ts/` 与 `build/ts/`，都在 `.gitignore` 里。

### 多目标

同一份规范同时面向多个目标语言，分工是：

| 目标 | 通道 | 谁生成 |
| --- | --- | --- |
| `ts` | 直出 | xl 的打印器，离线、确定性、字节稳定 |
| 其它（cpp / csharp / …） | 计划 | 生成器按 `xl_plan` / `xl_context` 给出的路径与结构契约产出，`xl_emit` 负责校验、盖产物头、归档旧版 |

- [docs/xl-to-cpp.md](docs/xl-to-cpp.md)：C++ 目标的生成规范（映射规则、部件划分、必读的编译陷阱）。
- [docs/cpp-design-notes.md](docs/cpp-design-notes.md)：C++ 目标上那些「只能这么写」的结构性取舍。
- [docs/ast-json.md](docs/ast-json.md)：AST JSON 出口的规格（形状 / 逐 token 字段表 / 与上游 Cangjie 的差异）。
- [docs/ts-ast.md](docs/ts-ast.md)：TS 形状出口的规格（kind 与字段名的对照表）。

## 类型约定

规范里的签名只用**中立类型**：`int` / `string` / `bool` / `void` / `Array<T>` / `Map<K, V>` / `T | null` /
函数类型（`(item:T)=>bool`）/ 类类型 / 泛型参数。不放任何目标语言专有的写法——签名是要喂给多个打印器的。

两条具体的克制：

- **`# type` 的等号右侧是原文**，会被原样搬进产物。所以它只用来写**函数类型别名**
  （`# type ItemModifier = (item:any)=>void`）。不要用它写对象字面量或字符串字面量联合——
  那种写法等于把某个目标语言的语法钉进规范里。
- **`any` 是唯一的例外**，只出现在「宿主环境的动态值」这一类位置：异常的内层异常、
  `RuntimeObject` 的值、`SyntaxContext` 的变量表、`cjcli` 里取 Node 内建模块的返回值。
  语言层的结构一律用具体类型或 `T | null`。
- **后两个出口（AST JSON / TS 形状）的代价是同一个**：它们跑在
  `Map<string, any>` / `Array<any>` / `any` 上，对多语言目标是负担（C++ / C# 侧要么用
  `std::any` / `object`，要么就是「另一个目标的活儿」——比如 TS 形状里 `NUMERIC_LITERAL`
  的 `RegExp` 那一格）。换来的是**三个出口同源**：形状各自只是「同一棵树的另一种拼法」。
  两个出口的形状见「构建链路」那一节，规格各自的文档在「多目标」那张表里。
- **「值 + 它在哪」一律装进 `TokenField<T>`**（`core/syntax/token-field.xl.md`）：
  `Value` 说是什么、`Range` 说在哪，`Set` 一次写两样 ⇒ **区间在 ⟺ 记过**（`IsSet`）。
  需要「开括号在哪、整对括号到哪」这类**成对位置**的 token 都走这一格
  （`Try` 的 `TryBrace`、`IfSegment` 的 `BodyBrace`，以及 `For` / `Foreach` / `While` /
  `DoWhile` 的 `BodyBrace`——第 641 轮收齐）——投影那一侧**直读字段**，
  不再回原文 `indexOf` + `MatchingBrace` 重扫一遍（那种二次搜刮遇到块里的字符串或注释里的
  假括号就会给错位置）。同一条线上的还有 `Namespace` 的字符串模块名区间
  （`NameAt` / `NameEnd`，第 641 轮）与声明名的 `NameStart` / `NameEnd`。
  这是「token 直出 AST」那条线的落点：**判据只算一次，投影不做第二次近似**。

## 支持的语法构造

产物是 XML，**标签名就是 token 的类名**（`ToXmlString` 取 `this.constructor.name`），属性名一律 lowerCamelCase，
且与规范里那个 class 属性**同名**。

| 构造 | 产物 | 属性 |
| --- | --- | --- |
| `class A<T = {}> extends B implements C, D { … }` | `<Class>` + `<ClassBody>` | `name` `extends` `implements` `modifiers` |
| `interface I<T = {}> extends A, B { … }` | `<Interface>` + `<InterfaceBody>` | `name` `extends` `export` |
| `namespace N { … }` / `module M { … }` / `declare global { … }` | `<Namespace>` + `<NamespaceBody>` | `namespace` `modifiers`（`export` / `declare`） |
| `function f<T>(x: T): U { … }` / `declare function f(): void` | `<Function>` + `<FunctionBody>` | `name` `modifiers` |
| 类/对象成员 `m<T>(x): U { … }` | `<MethodDeclaration>` + `<MethodBody>` | `name` `modifiers` |
| `class A { m<T>(x): U { … } }` / 接口与类里的成员签名 `m?(x): U;` | `<MethodDeclaration>`（**签名没有 `<MethodBody>`**） | `name` `modifiers` |
| 成员字段 `private n = 1` / `readonly name: string` / `count?: T[]` | `<Field>` | `name` `modifiers` |
| 返回类型段（`function` / 方法 / 箭头函数） | `<ReturnType>` | — |
| `enum Color { … }` / `const enum Flag { … }` | `<Enum>` + `<EnumBody>` | `name` `modifiers` |
| `switch (x) { case 1: … default: … }` | `<Switch>` `<SwitchCompare>` `<SwitchSegment key>` `<SwitchCase>` `<SwitchStatement>` | — |
| `@Component({…})` | `<Decorator>` | `name` |
| `outer:` | `<Label>`（自闭合） | `label` |
| `let` / `const` / `var`（含解构，绑定名**递归**收集） | `<Let>`（自闭合） | `fieldName` / `arrayPattern` / `objectPattern` |
| `if` / `for` / `foreach` / `while` / `do…while` / `try` | `<IfSet>` `<For>` `<Foreach>` `<While>` `<DoWhile>` `<Try>` 及各自的分段 | 见各自文件 |
| `name(...)`（调用）/ `name: Type`（类型标注） | `<Method>` / `<TypeDefine>` | `name` |
| `expr as T` / `expr satisfies T`（同级左结合的两种类型运算） | `<As>` / `<Satisfies>`（运算符后面的类型装在里面，运算符词本身不进产物——与 `<As>` 既有口径一致） | — |
| **函数类型**（类型位的 `(a: A) => B` / `new () => A` / `abstract new () => A` / `<T>(a: A) => B`） | `<FunctionType>`（形参括号 + `=>` + 返回类型；`new` / `abstract new` 也装在里面） | — |
| **条件类型**（`T extends U ? A : B`） | `<ConditionalType>`（条件、`extends`、真分支、`?`、假分支、`:` 全在里面；**类型位**的它不会落成 `<TernaryOperator>`） | — |
| **联合 / 交叉类型**（`A \| B`、`A & B`，含前导 `\|` 的多行写法） | `<UnionType>` / `<IntersectionType>`（`&` 比 `\|` 紧：`A & B \| C` 收成 `UnionType(IntersectionType(A & B) \| C)`） | — |
| **数组 / 元组 / 下标访问类型**（`T[]`、`[A, B]`、`T[K]`） | `<ArrayType>` / `<TupleType>` / `<IndexedAccessType>`（那对方括号本身不进产物，与 `ObjectLiteral` / `ArrayLiteral` 同一口径） | — |
| **类型运算符**（类型位的 `keyof T` / `readonly T[]` / `unique symbol`） | `<TypeOperator>`（运算符词与它的操作数都在里面，与 `UnionType` 里那个 `\|` 符号同一口径） | — |
| **类型参数**（`<T extends X = Y>`、映射键 `[K in T]`、`infer X` 里的那个名字） | `<TypeParameter>`（名字 + `extends` 约束 + `=` 默认值都在里面；泛型段的外层仍是 `<GenericType>`） | — |
| **推断类型**（条件类型里的 `infer X` / `infer X extends Y`） | `<InferType>`（里面配一个 `<TypeParameter>`——与 TS 的 `InferType > TypeParameter` 一对一） | — |
| **类型谓词**（`x is T` / `this is T` / `asserts x is T` / `asserts x`） | `<TypePredicate>`（`asserts`、参数名、`is`、类型都在里面；谓词里的类型照常成形） | — |
| **元组成员**（`[A?, ...B, name: D?, ...rest: E[]]`） | 可选元素 `<OptionalType>` / 变长元素 `<RestType>` / 具名元素 `<NamedTupleMember>`（**普通元素不给节点**——与 TS 一致） | — |
| **枚举成员**（`enum E { A = 1, B }`） | `<EnumMember>`（名字与初始化式都在里面；逗号留在外面、属于枚举声明） | — |
| **索引签名**（`{ [k: string]: T }` / `readonly [k: symbol]: T`） | `<IndexSignature>`（参数名、参数类型、值类型都在里面；方括号按 `ArrayType` 的先例消费掉，参数那一截收成一个 `<Parameter>`） | — |
| **形参**（`function f(a: A)` / `m(a: A)` / `(a: A) => B` / `(a: A): T` / `new (a: A): I` / 箭头函数的 `(a, b)`） | `<Parameter>`（与 TS 一致：形参一律同一个标签，不分函数 / 方法 / 箭头 / 签名；索引签名里的参数也是它） | — |
| **继承段**（`class C extends B implements I, J` / `interface K extends L<M>, N`） | `<HeritageClause>` + `<ExpressionWithTypeArguments>`（子句词、逗号与每个实体名都在里面；类表达式与括号化继承表达式同样收） | — |
| **解构绑定**（`const { a, b: c, d = 1 } = x` / `[x, , y, ...rest]` / `f({ p, q })` / `catch ({ message })`） | 元素各一个 `<BindingElement>`（模式本身是 `<ObjectLiteral>` / `<ArrayLiteral>`——TS 的 `ObjectBindingPattern` / `ArrayBindingPattern` 同形；`b: c` 是重命名、不产 `TypeDefine`） | — |
| **括号类型**（类型位的 `(A \| B)` / `((a: A) => B)`） | `<ParenthesizedType>`（括号本身属于这个节点，与 TS 一致；值位的括号不受影响） | — |
| **类型查询**（类型位的 `typeof x`） | `<TypeQuery>`（值位的 `typeof x` 仍是 `<UnaryOperator op="typeof">`；已经折成一元运算的那种壳会被换掉） | — |
| **字面量类型**（`"a"` / `1` / `0x10` / `true` / `null` / `-1`） | `<LiteralType>`（字面量本身作为子单元；带符号数字把 `-` 与数字一起收进来。十进制 / 十六进制 / 二进制 / 八进制 / 指数 / 数字分隔符 / `BigInt` 都认） | — |
| **模板字面量类型**（`` `a${X}b` ``） | `<String interpolation="true">` + `<InterpolationString>`（插值段的类型文本照常成形：联合 / 交叉 / 下标访问……） | — |
| **映射类型**（`{ [K in T]: X }`，含 `readonly` / `-readonly` / `+?` 修饰与 `as` 键重映射） | `<MappedType>`（内容直接装在节点下：`[K in T]` 与值类型各成形；索引签名 `{ [k: string]: X }` 仍是 `<TypeLiteral>`） | — |
| `type X = { a: number }` / `let x: { m(): void }`（**类型位**的对象类型） | `<TypeLiteral>` + `<TypeLiteralBody>`（成员是 `Field` / `MethodDeclaration` / `Signature`） | — |
| `interface I { (a: number): string }` / `new (a: number): I` / `abstract new (a: number): I` | `<Signature kind="call">` / `<Signature kind="construct">`（`abstract` 作为签名的第一个子单元收进来） | `kind` |
| `import('./m').A` / `typeof import('./m')`（类型位） | `<ImportType>`（`typeof` 与限定名尾巴都在里面——与 TS 的 `ImportType` 一对一；**值位**的动态 `import()` 仍是 `<Method name="import">`） | — |
| 泛型实参段与类型参数段（`Array<T>` / `<T extends X = Y>`） | `<GenericType>`（**实参段**；**参数表**在它里面再收成 `<TypeParameter>`） | `startBracket` `endBracket` |
| 字符串（常量 / 内插 / 逐字 / 原始 / 模板） | `<String>` + `<ConstString>` / `<InterpolationString>` | `interpolation` `verbatim` `raw` `interpolationCount` `rawQuoteCount` |
| `async` / `await` / `return` / `throw` / `readonly` … | `<Keyword>` | — |
| `class C { static { … } }`（类静态块） | `<StaticBlock>`（体内的语句；花括号本身不进树，与 `FunctionBody` 同款） | — |
| `export as namespace Foo` | `<NamespaceExport>`（自闭合，与 `Label` / `Let` 同款） | `name` |

`modifiers` 是声明前面那一串修饰词按源码顺序 `join(",")`（`export` / `declare` / `default` / `abstract` /
`async` / `public` / `private` / `protected` / `static` / `readonly` / `override` / `accessor` / `get` / `set` / `const`）。

### 叶子标签的名字

三个「字面量块」原先叫 `Common` / `Symbol` / `WrapSymbol`——名字说的是**实现**（通用字符块、符号块、包装符号），
不是**语义**。现在按它到底是什么命名，下游（差分脚本、多语言目标）读产物时不必先查表：

| 标签 | 是什么 |
| --- | --- |
| `<Identifier>` | 标识符与数字、布尔字面量的文本块（`<Identifier>0</Identifier>` 就是数字 `0`） |
| `<SymbolToken>` | 符号块：运算符、标点、括号字符 |
| `<LineWrap>` | 软换行，**不是符号**：它不吐文本，只是相邻判定的透明单元 |
| `<ObjectLiteral>` | 值位的对象字面量 `{ … }` |
| `<ArrayLiteral>` | 值位的数组字面量 `[ … ]` |

`Bracket`（`( )` / `{ }` / `[ ]` 三种括号共用）与 `Keyword`（关键字兜底身份）的名字就是自己的语义。

[samples/declarations.ts](samples/declarations.ts) 把上表逐项走了一遍，TS 形状的夹具是
[samples/declarations.expected.tsast.json](samples/declarations.expected.tsast.json)。

## 设计约定

写新 token 或改解析顺序时要守的几条（都是这个项目自己的约定，不是风格偏好）：

- **节点名就是 XML 标签名**：`ToXmlString` 覆写里取的是 `this.constructor.name`，
  所以 `Class` / `Enum` / `IfSegment` 这些类名不能随便改；反过来，重组规则类（`*Reorganization`）不进树、不进 XML，
  名字随便取。
- **嵌套类必须写在外层类之前**：外层类的静态字段（`JumpIn` / `AppendIn` / `Instance`）在类定义时就
  `new` 那个嵌套类，写反了会命中暂时性死区（TDZ）。
- **软换行是独立单元**（`LineWrap`，产物里的 `<LineWrap />`），靠「跳过它」与「最后摘掉它」两步处理：
  相邻判定一律走 `SkipNextWrapSymbol` / `SkipPreviousWrapSymbol`——这两个**函数名**里的 `WrapSymbol`
  是历史包袱（那个类现在叫 `LineWrap`），函数名本身没跟着改，因为它牵动两百多处调用点、且不影响产物。
- **声明头先认领、`Keyword` 兜底**：`class` / `function` / `switch` 这些词要先被各自的上下文规则吃掉，
  剩下的散词才升级成 `Keyword`（所以 `Keyword` 排在重组队列的最后）。
- **`{ }` 括号不跑重组队列**：类体 / 函数体 / 循环体里的内容，是各段 token（`ClassBody` / `FunctionBody` /
  `ForBody`…）在构造时挂上语句队列之后才成形的。
- **一行的边界要显式收**：声明规则的范围**只到自己最后一个单元为止**，尾随软换行留在父单元里——
  那道换行就是语句边界（`SearchFrontIndexed` 往回找语句头时的「墙」），
  收进声明范围会让下一行被并进同一条语句。空 `<Statement>` 由语句重组自己的早退挡掉
  （见 [typescript/tokens/declaration-common.xl.md](typescript/tokens/declaration-common.xl.md) 里
  「一个已经删掉的收尾口径」那一节）。

## 判据与缺口

**主判据是七道门**（`npm run gates` 一次跑完，墙钟 ~25s）：

| 门 | 口径 |
| --- | --- |
| `cases:tsast` | 逐节点对 `ts.createSourceFile` 比 **kind / 区间 / 字段名**，外加未映射 / 缺 range / 区间越界——**七条全 0 才退出码 0** |
| `cases:tsast:cli` | **发布路径**：真开 `cjcli <文件> --ts-ast` 进程，拿 stdout 的 JSON 对拍（全语料，按需跑） |
| `samples` | 三份样本的 `*.expected.tsast.json` **逐字节**比（键序 / 坐标 / 序列化），并断言「命令行 = 库 API」 |
| `cases:check` | 用例文件本身合不合格（文件名 / area / id 唯一 / 指令语法 / 标签名 / TS 合法性） |
| `cases:tags` | **用例自带的期望**：`xl:expect`（存在，或 `Tag:N` 计数）与 `xl:absent` 逐条对产物核实，外加标签表体检 |
| `runtime:check` / `runtime:cli` | 执行侧的机制与端到端（见「构建链路」那一节） |
| `coverage` | 场景覆盖度——**尺子不是门**：它红只在「比昨天差」 |

语料 = `node_modules` 下的 `@types` / `typescript/lib` / `undici-types` + 本项目 `dist/ts/**` +
`samples` + `tests/parse/cases/**`（`tests/parse/ts-ast.mjs` 的 `corpus()`）。

### 当前状态（第 641 轮实测）

| 判据 | 结果 |
| --- | --- |
| `cases:tsast` | **1504 / 1504 逐文件完全一致**，四方向 0、未映射 0、缺 range 0、区间越界 0 |
| `cases:tsast:cli` | 发布路径（慢，按需跑）：开 `cjcli … --ts-ast` 进程逐文件对拍，与库路径同一条口径 |
| `samples` | hello / declarations / generic 三份 TS 形状夹具**逐字节**一致，且「命令行 = 库 API」 |
| `cases:check` | **1102** 条用例，0 条不合格 |
| `cases:tags` | **1102 条全部带期望**（2804 条断言），0 条不一致；标签表 **117** 种全被产出过，幽灵标签 **12** 种一个都没漏进产物 |
| `runtime:check` | **243 / 243** |
| `runtime:cli` | 直接执行 `.ts`：**79 / 79** 份与 `node` 逐字节相同 |
| `coverage` | **1825 / 1826**：runtime / exec / stdlib 三层各 **100%**，e2e **185 / 186**；台账上 1 条（differ） |
| `npm run gates` | 上面七道一次跑完（实测墙钟 **~28s**） |

### 口径与已知缺口

**明确不做**（不是缺陷）：`JSX / TSX`（独立于 TypeScript 的语法扩展）、
`RegExp` / `BigInt` / `Proxy` / `Intl`（`docs/runtime-architecture.md` §15 那张表）、
装饰器的运行期语义、多文件模块加载（`tsrun` 是单文件口径）。
整张清单与理由见 [docs/typescript-parsing-gaps.md](docs/typescript-parsing-gaps.md)。

**开着的缺口**（只剩这些）：

- **`Label` 只是标记节点**，不包含它标的那条语句（产物形如 `<Label label="outer" /><While>…</While>`）：
  标签规则必须排在 `TypeDefine` 之前，那时后面那条语句还没成形，认不出边界。
- **ASI 是按形状预判的**：判据在 [typescript/tokens/statement.xl.md](typescript/tokens/statement.xl.md) 的
  `Statement.IsLineBreakBoundary`（前一个单元不再要操作数、后一个单元也不能续接 ⇒ 断句，
  加上 `return` / `throw` / `break` / `continue` / `yield` 与后缀 `++` / `--` 的受限产生式）。
  规范里 ASI 还有一条「**语法不允许时**才插分号」，本工程不看完整文法、只看形状，
  所以个别极端排版仍可能与 TS 不同——这类情况由 `cases:tsast` 巡检。
- **嵌套解构的绑定名进的是同一张逗号分隔表**（`arrayPattern`），丢的是**结构**而不是名字：
  `const [[a, b], [, c = 0]] = m` 记成 `a,b,c,0`。
- **语言配置带来的两处差异**（不是解析器缺陷，是这套语言这么定义）：
  `\a` 解成响铃字符而不是字母 `a`；`@'…'` / `@"…"` 是逐字字符串前缀、不是装饰器。
- **非空断言的成员链后面再接两个以上的 `+` 与字符串**（第 638 轮缩过一次）：
  `o.a!.toString() + "x" + "y"` 里**第一个 `+`** 折不出来，后面那个 `"y"` 于是被当成成员链收走。
  `o.a.toString() + "x" + "y"`（没有 `!`）、`o.a! + "x"`、`f() + "x" + "y"` 三种**都是好的**——
  触发条件是「`!` 断言的成员链 + 一次调用，再接两个以上的 `+`」。
  同族的两条已经修掉（`!` 后面跟 `.` 被误判成明确赋值断言、调用结果接字符串被误当成模板标签），
  用例在 [`ex-nonnull-member-chain.ts`](tests/parse/cases/expressions/ex-nonnull-member-chain.ts) 与
  [`ex-call-plus-string-chain.ts`](tests/parse/cases/expressions/ex-call-plus-string-chain.ts)；
  剩下这一档还没定位到是哪条收尾规则抢跑，细节见
  [docs/typescript-parsing-gaps.md](docs/typescript-parsing-gaps.md)。
- **块与表达式之间没有分隔符时**（`{ A }a += 1`：块紧跟着表达式，中间既没有 `;` 也没有换行），
  产物里块与后一条语句仍然**并进同一个 `<Statement>`**（与 TypeScript 的「两条语句」不一致）——
  这一条在 token 树（XML）上仍然是缺口，但**投影到 TS 形状时按 TS 的划分出节点**，
  所以 `cases:tsast` 是绿的（形状那一层已经对了，token 树那一层没动）。
  **被否决的改法**：把块当语句边界——切断了复合赋值的展开，**整段内容丢失**，比边界不合严重；
  不要再试。两条形状已经收进用例语料。
- **对象字面量里三个「语句关键字」当成员名**（`{ if(): T {…} }` / `{ function(): T {…} }` /
  `{ import(): T {…} }`）：其余三十来个保留字（`return` / `throw` / `delete` / `new` / `typeof` …）
  第 640 轮已经修好并进了语料（[`expr-object-keyword-method-names.ts`](tests/parse/cases/expressions/expr-object-keyword-method-names.ts)），
  这三个被更早的规则 / 解析期向导抢走，细节与「试过什么」见
  [docs/typescript-parsing-gaps.md](docs/typescript-parsing-gaps.md)。

TypeScript 自带的那份 8MB **打包 JS**（`typescript.js`）会在个别 JavaScript 专有形状上抛内部错误
——那是 JS 而不是 TypeScript，不在当前范围内。

## cjcli

[cjcli.xl.md](cjcli.xl.md) → `dist/ts/cjcli.ts` → `build/ts/cjcli.js`。它是命令行入口，不属于语法层本体。

**产物是自执行的**：`cjcli.xl.md` 末尾的 `# statement` 段把 `Main(process.argv.slice(2))` 原样写进产物，
所以 `node build/ts/cjcli.js` 直接就是命令行工具——没有加载器、没有包装进程、没有第三方运行时。

```
cjcli <文件>              解析源文件，缩进 XML 打到标准输出
cjcli <文件> -o <文件>    解析后写入指定文件（同一份缩进文本）
cjcli <文件> --ast-json   解析后把 AST JSON（紧凑单行）打到标准输出
cjcli <文件> --ts-ast     解析后把 TS 形状 JSON（紧凑单行）打到标准输出
cjcli                    从标准输入读源码
cjcli -h, --help         打印本说明
cjcli -v, --version      打印版本
```

退出码：`0` 成功；`1` 表示用法错误 / 读不到文件 / 解析抛错。

```bash
node build/ts/cjcli.js samples/hello.ts
echo "let x = 1" | node build/ts/cjcli.js
node build/ts/cjcli.js samples/hello.ts -o out.xml
node build/ts/cjcli.js samples/hello.ts --ast-json -o out.json
node build/ts/cjcli.js samples/hello.ts --ts-ast > out.tsast.json
node build/ts/cjcli.js samples/hello.ts --ts-ast | node -e "..."   # 直接喂给 diff / 对拍脚本
```

`--ast-json` / `--ts-ast` 换的是**出口**不是解析：`CjcliParse` 造出根单元之后才分叉，
三个出口看的是同一棵树（`CjcliParseXml` 取 `ToXmlString()`、`CjcliParseAstJson` 取 `ToJsonString()`、
`CjcliParseTsAst` 取 `ToJsonText(projectRoot(Root.ToList(), 原文))`）。
两个 JSON 出口都不经过 `CommonUtil.FormatXml`——那个函数只认 XML。
两个开关同时给时以 `--ts-ast` 优先（同一个位置的两种形状，不是可以叠加的东西）。

## 样本验收

[samples/check.mjs](samples/check.mjs)：`samples/*.ts` 与同名 `*.expected.tsast.json` **逐字节**对照
（只留 TS 形状这一个出口；XML 与 AST JSON 两份夹具随测试集收窄删除）。

```bash
npm run samples                 # 比对，全部一致时退出码 0
node samples/check.mjs --update # 用当前产物重写夹具
```

**逐字节比、不做归一化**：夹具是紧凑单行，键序由规范里的 `result.set(...)` 顺序决定、
`pos` / `end` 由源码下标决定，都是确定性的——归一化只会把「键序变了」这类漂移盖掉。
两端都在文件层读写、不经过控制台编码，中文注释不会在比对里被搅坏。

**同一份比对还顺带钉住了「入口」**：脚本除了跑 `cjcli` 进程，也用库 API 解析同一份源码
（`new TextContext(...).Process(...)` → `ToJsonText(projectRoot(...))`），断言两条路**逐字节相同**
（`ENTRY` 那一行就是这条断言）。少了它，「库对了、命令行打歪了」没有任何尺子看得见。
TS 形状那一支尤其要这一条：`ToJsonText` 是 `cjcli` 与这个脚本**共用**的同一个函数。

## 为什么留了一个 `bin/cjcli.js`

整条链路上 xl 表达不了的只有 **shebang** 一行：

- `# statement` 能把执行语句写进产物，但插不进 shebang——产物前三行永远是 xl 的产物头，
  而 `tsc` 只认**文件第 1 行**的 `#!`（放别处直接 `error TS18026`，tsc 还会把它编译成垃圾）。
- `package.json` 的 `bin` 需要第 1 行是可执行解释器行，所以它落在 [bin/cjcli.js](bin/cjcli.js)：
  `#!/usr/bin/env node` + `require("../build/ts/cjcli.js")`。它不含任何逻辑。

不需要 shebang 的话（例如只用 `node build/ts/cjcli.js`），把 `bin` 直接指到 `build/ts/cjcli.js` 也行。
检出时必须保持 LF：仓库根的 `.gitattributes` 用 `* text=auto eol=lf` 钉死了。

## 改这个项目

- 规范是 `*.xl.md`：`# dependencies` 写依赖、`# namespace` 之后是声明。
  **散文解释「为什么」**，代码块就是产物本身，标题行（`# class` / `## method` / `## field`）就是签名契约——
  改标题等于改 API。
- **XML 属性名就是从 class 属性名来的**：`Class` 上那个 `name` 属性的值，就是产物里 `name="…"` 的值。
  所以想改产物上的属性名，就改规范里的字段名与 `ToXmlString` 里那处拼串，两处必须一起动——
  只在拼串里改名，会留下 `this.FieldName` 与 `name="…"` 对不上的产物。
- 改完跑这几步（第 200 轮收窄后的全部判据）：

  ```bash
  xl check                     # 结构与规则检查（应该是 0 error / 0 warning）
  npm run build                # xl build && tsc
  npm run samples              # TS 形状夹具逐字节对照；产物本该变化时用 -- --update 重写夹具
  npm run cases:check          # 用例体检
  npm run cases:tags           # 用例自带的期望（`xl:expect` / `xl:absent`）对产物核实
  npm run cases:tsast          # **主判据**：与 ts.createSourceFile 逐节点对拍（七条全 0）
  npm run cases:tsast:cli      # 发布路径那一把（慢，改到 cjcli / 序列化时才需要）
  ```

  动了**投影的键序或坐标**时，`samples` 是唯一看得见的那把尺子（`cases:tsast` 只比
  kind / 区间 / 字段名）；动了 token 层时反过来，`cases:tsast` 会告诉你形状还对不对。

- **一轮一提交**：一轮的改动跑完尺子之后 `git commit`，提交信息按轮次写
  （`第 N 轮：…（coverage X -> **Y / Z**）`，正文写根因 / 修法 / 数字）。
  攒着不提交的话，「哪一轮把哪个数字动了」在 `git log` 里就查不到了。

- **临时脚本与它们的输出不进仓库**：排查用的一次性脚本、`tmp-*` 输出、
  `dist/` / `build/` / `.xl` 都不提交（后者由 `.gitignore` 挡着）。
  仓库根目录历史上堆过 47 个临时脚本，所以这条是硬规矩：**能复现的才进仓库**
  （进仓库的形态是尺子或用例，不是某次排查的脚本）。

- **改「谁吃掉换行」之前先读 `declaration-common.xl.md` 里那一节**：
  本工程的 `LineWrap` 不只是排版，它还是语句边界本身。历史上 `DeclarationEnd`
  就是因为「吃掉它」而制造了一整类语句合并缺口。

- 产物头里的 `xl:sha256` 是源指纹：规范一变，产物就会重新生成。
