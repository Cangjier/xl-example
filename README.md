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
  parse-pipeline.xl.md     跳转优先级与重组优先级（顺序即语义）
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

runtime/                 与语言无关的执行层（多语言共用）——值模型 / 对象表与 GC / 帧 / IR / 内建库 / 宿主 ABI
typescript-exec/         TypeScript 的降级层（本语言专有）——AST → runtime 的 IR

cjcli.xl.md              命令行入口（不属于语法层本体）
```

执行侧的两棵树（`runtime/` ↔ `typescript-exec/`）是上面这两棵的镜像：`runtime/` 与语言无关，
`typescript-exec/` 是 TS 专有的降级层——**新增一门语言就是新增 `xxx/` + `xxx-exec/`，
`core/` 与 `runtime/` 一行都不用动**。
**这两棵树已经在跑**，判据是 `npm run gates` 那一串门（见「构建链路」那一节）：

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
[tests/parse/typescript-parsing-gaps.md](tests/parse/typescript-parsing-gaps.md)（口径边界、审计方法、不再试的改法）
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

测试集只留 AST 与执行侧这几道（用户口径，见「判据与缺口」）：
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
  `DoWhile` 的 `BodyBrace`）——投影那一侧**直读字段**，
  不再回原文 `indexOf` + `MatchingBrace` 重扫一遍（那种二次搜刮遇到块里的字符串或注释里的
  假括号就会给错位置）。同一条线上的还有**声明名那一格**：`NameAt` / `NameEnd` / `NameRange`
  或 `NameStart` / `NameEnd`，投影只按那一格自己推文本区间（开头是引号 ⇒ 取引号之间），
  字符串名与点号模块名都不再回原文猜（点号名的全名在原文里根本不连续，那里**不能再有第二份答案**）。
  这是「token 直出 AST」那条线的落点：**判据只算一次，投影不做第二次近似**——
  全语料里投影回原文猜名字的次数从 **1324 处降到 0 处**（见
  [print-ast-common.xl.md](typescript/print-ast-common.xl.md) 的 `synthName`）。
  **最后一块回原文重新做词法的地方也拆掉了**：具名导入 / 导出的每一项
  （`{ a as b, c, type D }`）不再按原文正则切段，而是按文档顺序展开括号里的 token 子单元
  （单行是平铺的一串，跨行会被逗号运算符折成 `BinaryOperator(op=",")` 树，两种走同一条路）——
  照原文切在 `import { a /* c */ as b }` 上会把注释算进 `propertyName`、
  在 `import { "a-b" as c }` 上会把字符串名投成 `Identifier`，两处都是真缺口，
  用例在 [im-specifier-comment.ts](tests/cases/token/modules/im-specifier-comment.ts) 一族里。

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

标签按**语义**命名，不按实现——下游（差分脚本、多语言目标）读产物时不必先查表：

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

**主判据是 `npm run gates` 一次跑完的那几道门**（墙钟 ~32s；门名单只有 `tests/gates/run.mjs` 的 `GATES` 一处）：

| 门 | 口径 |
| --- | --- |
| `cases:tsast` | 逐节点对 `ts.createSourceFile` 比 **kind / 区间 / 字段名**，外加未映射 / 缺 range / 区间越界 / 抛异常——**八条全 0 才退出码 0**；语料里带 `xl:known-gap` 的那些用例走**另一条账**（见下） |
| `cases:astjson` | **出口 2（AST JSON）的尺子**（第 884 轮加）：逐节点比「标签名 === `type`」「XML 的每个属性在 JSON 里**同名同值**」「每个节点都有合法 `range`」「JSON 多出来的键在 [docs/ast-json.md](docs/ast-json.md) 第 2–4 节**登记过**」，外加「命令行 === 库 API」与「不抛异常」——**六项全 0 才退出码 0** |
| `cases:tsast:cli` | **发布路径**：真开 `cjcli <文件> --ts-ast` 进程，拿 stdout 的 JSON 对拍（全语料，按需跑） |
| `samples` | 三份样本的 `*.expected.tsast.json` **逐字节**比（键序 / 坐标 / 序列化），并断言「命令行 = 库 API」 |
| `cases:check` | 用例文件本身合不合格（文件名 / area / id 唯一 / 指令语法 / 标签名 / TS 合法性） |
| `cases:tags` | **用例自带的期望**：`xl:expect`（存在，或 `Tag:N` 计数）与 `xl:absent` 逐条对产物核实，外加标签表体检 |
| `cases:shapes` | **用例覆盖了哪些形状**：外部语料里出现过的「kind + 有子节点的字段名」签名，用例里必须至少有一条 |
| `runtime:check` / `runtime:cli` | 执行侧的机制与端到端（见「构建链路」那一节） |
| `coverage` | 场景覆盖度——**尺子不是门**：它红只在「比昨天差」 |

语料 = `node_modules` 下的 `@types` / `typescript/lib` / `undici-types` + 本项目 `dist/ts/**` +
`samples` + `tests/cases/token/**`（`tests/parse/ts-ast.mjs` 的 `corpus()`）。
`cases:shapes` 用的是它去掉 `dist/ts` 的那一份（产物自己写出来的形状不算「必须有用例」）。

**用例语料住在 `tests/cases/<类别>/<功能域>/`**（第 685 轮起）：五类同一形状
——**一条用例 = 一个 `.ts` 文件**，元数据写在文件头（`// xl:…`，以 `// xl:end` 收尾）。
布局、文件头文法、分母口径见 [tests/cases/README.md](tests/cases/README.md)。

**`xl:known-gap`：已知缺口也进语料**（第 670 轮）。凡是量出来的缺口形状，**用例照样写进
`tests/cases/token/`**（一条一个排版，根因写在指令后面），只是它的差额走**另一条账**：
`cases:tsast` 每趟逐条真跑一遍，**还对不上**就记 `KNOWN`（不进那八项，门可以是绿的），
**已经对上了**就报「收掉了」并**红**——逼你去把那行指令删掉。
这样缺口清单长在语料里、与用例同生共死（不再只活在 `tmp/` 的探针池里），
而「新坏了」与「本来就还没做」仍然是两件事：前者红，后者进那张表。
规矩与 `coverage` 的台账同源（登记过的照样每次真跑，收掉了提示删行）。

### 第 975 轮：第 974 轮登记的那 13 格**全部收掉**——再把「最里面那一格」收成一份实现；换 48 条更深的底样普查，量出的 6 格**同轮也全部收掉**（清单第十六、十七次清空）

**一句话**：第 974 轮普查出来的 13 格缺口，这一轮**一条不剩**全部收掉；收的过程中发现
「空名字 `Method` 套好几层」那一族在**五处**各写了一遍、而且**写得都不一样深**，
于是把「最里面那一格的被调用者怎么建」收成一个方法（`innermostCallee`），
五处共用；清单清空之后再按规矩换了一批**更深**的底样（48 条）普查，量出 6 格、逐条登记。

- **收掉的 13 格**（`xl:known-gap` 按规矩撤掉、改成 `xl:note`，用例留着当守卫；
  第 974 轮那张表的读数全部归零）：

  | 写法 | 原来 | 现在 |
  | --- | --- | --- |
  | `a!()()()()` / `a!()()()().c` / `a.b!()()()()` | 漂 2 | 全 0 |
  | `a!()!()!()` | 漂 1 | 全 0 |
  | `a!()()!()` | 缺 3 漂 1 | 全 0 |
  | `a.b()()().c` | 漂 3 多 2 | 全 0 |
  | `a?.b!()()()` / `a?.b!()()().c` | 漂 1 / 缺 3 | 全 0 |
  | `a?.[b]()()()` | 漂 1 | 全 0 |
  | `a?.b![0]![1].c` | 缺 5 漂 2 | 全 0 |
  | `a?.b![0]().c` | 缺 1 | 全 0 |
  | `a?.b()![0]` / `a?.b()![0].c` | 缺 1 漂 2 多 2 | 全 0 |

- **六处修法**（都在 [typescript/print-ast-common.xl.md](typescript/print-ast-common.xl.md)）：
  1. **新立 `innermostCallee`**（`innermostMethod` 的搭档、`graftCallee` 的输入）：把
     「最里面那一格 `Method` 的被调用者」按**核**分三档一次建对——
     名字 ⇒ 接一格属性访问；**实参括号** ⇒ 先把「括号那一次」建成最里面那一格
     （判据就是 `endOf(括号) < endOf(这一格)`，第 966 轮那句话）；都不是 ⇒ 就是 `left`。
     这一份原来在**五处**各写一遍（`projectExpression` 的链循环、链循环的「点号 + `Method`」
     那一支、`chainWithOptional` 的两处、`chainOnto` 的两处），
     而且**前几处只认「名字」那一档** ⇒ 凡「括号 + 再调」的层数一到三层就少一层。
  2. **链循环里的「最里面那一格」改成递归问**（第 972 轮那一版只对「头一格是实参括号」补一层）：
     走 `innermostMethod` 到最里面、`graftCallee` 整串壳套上去。
  3. **`isCallFirstUnit` 的 `NotNull` 那一支递归问**：断言的核自己也是一次调用时
     （`NotNull(Method(…), !)`）同样是「以一次调用开头」。
  4. **`assertedMember` 多认两档核**：核是**一格 `Method`**（`a?.b()!`）与核是**实参括号**
     （`a?.()!`）——都是「先调用、再断言」，`?.` 挂在新接出来那一层上。
  5. **链循环的 `NotNull` 那一支与 `chainOnto` 多一支「这一格自己是一个非空断言」**：
     「先调用、再断言」（`a!()!()!()`）与「先下标、再断言」（`a?.b![0]![1].c`）；
  6. **`chainOnto` 的子链成员循环补两支**：**整格调用**（`Method`）与**平级的圆括号**
     （`a?.b![0]().c` 那一档）——原来只有「名字」「下标」两支，落到末尾那句空转的 `j += 1`。
- **登记进语料的 6 格**（第 975 轮普查，48 条里 6 条对不上）——**这一批 6 格同轮全部收掉**，
  清单**第十七次清空**（用例留着当守卫，`xl:known-gap` 按规矩撤成 `xl:note`）：

  | 用例 | 写法 | 读数 | 收法 |
  | --- | --- | --- | --- |
  | `gap-r975-nonnull-call-assert-call-twice` | `a!()()!()` | 漂 2 | 链循环的 `NotNull` 补「核是 `Method`」那一档 |
  | `gap-r975-opt-call-assert-call-twice` | `a?.()!()` | 漂 1 多 2 | `assertedMember` 补「核是实参括号」那一档 |
  | `gap-r975-nonnull-call-assert-index` | `a!()![0]` | 缺 3 漂 1 | 入口判据认「`PropertyAccess` 头一格是 `NotNull` 盖着调用」+ 摊成两格 |
  | `gap-r975-nonnull-call-thrice-assert-member` | `a!()()()!.c` | 缺 5 漂 1 | 同上（断言的核换成三层调用链） |
  | `gap-r975-nonnull-index-assert-call` | `a!()[0]!()` | 缺 2 漂 2 | 入口判据认「核是下标括号」+ 兜底整投 |
  | `gap-r975-nonnull-call-thrice-operator` | `a!()()() + 1` | 漂 1 | 摊平那一趟**不摊整格 `Method`**（那一格说的是三次调用，摊成孩子就少一层） |

  **这一批只有 6 格**（上一批 48 条里 13 格）——第 975 轮那几处修法**不是只对着 13 条用例**
  补的：同名形状在更深一层（四层调用、五层调用、断言与调用交替）上**一并转绿**，
  这正是「把五处副本收成一份」的收益。
- **数字**：`cases:tsast` 已知缺口 **13 → 0 条还开着**（清单**第十六次清空**），
  随后普查登记 **0 → 6 条**、**同轮全部收掉** ⇒ **0 条还开着**（清单**第十七次清空**）；
  `cases:astjson` 六项全 0（1607 → **1626** 份、41211 → **41709** 个节点）；
  `cases:check` **1636 条用例、0 条不合格**；
  `cases:tags` 5326 条断言 0 条不一致；`cases:shapes` 未覆盖 0；
  `coverage 4242 / 4402`（分母 +6 就是新登记那六条）、`blocked 25 → 25`、
  `differ 135` 一处没动、加权 **95.7%**；九道门全绿（墙钟 31.6s）。
- **可复用的判据**：**「同一个问句有几处副本」这件事，靠换更深的底样量、不靠读代码数**——
  第 972 / 973 / 974 三轮各补过「最里面那一格」，而它其实在**五处**；
  这一轮把五处收成一份之后，下一层的形状（四层调用）**一次全绿**。
  另一条：**先登记、不猜**——普查量出来的 6 格只有读数与入手处，根因没量到就不写。

### 第 985 轮：换**第十批底样**（换个轴：**嵌套宿主**——把 24 个客人放进 24 个宿主、再在接缝处插 trivia，1452 条合法片段）——量出 **86 条 / 8 族**，当轮收掉最大的一族（**返回类型是复合类型时体换行**，26 条），其余 5 族按规矩登记进语料

**一句话**：第 984 轮那一批量的是「**一个构造 × 每个相邻位置**」；这一轮换了一根轴——**宿主 × 客人**
（客人 = 值位 / 类型位两族的 24 个构造，宿主 = 声明头 / 签名 / 成员 / 表达式 / 语句五处的 24 个落点，
接缝处再插 `/*c*/` / 换行 / 行注释）。`tmp/r985/gen.mjs` 一共 **2304 条、其中 1452 条合法**
（852 条 TS 自己就非法——这跟轴的选法有关：类型位的客人放进值位的宿主大多不合法）。
**量出 86 条对不上、按族归并是 8 族**，最大的一族当轮收掉，其余 5 族（7 个判定点）登记进语料。

- **收掉的那一族**（26 条，13 个返回类型 × 换行 / 行注释）：**`function f(): <复合类型>` 换行 `{`**——
  `keyof T` / `typeof x` / `readonly T[]` / `[A, ...B]` / `import("m").A` / `{ [k: string]: T }` /
  `abstract new () => A` / `A extends infer U extends string ? U : never` / `A extends B ? C : D` /
  `{ [K in keyof U]?: U[K] }` / `(a: A) => B` / `` `a${X}b` `` / `[...a]`。
  **根因**：`IsHeaderBodyBrace` 是「从末尾往回走、**数名字**找头那个词」，而**返回类型可以有任意多实义单元**
  ——`keyof T` 里 `T` 与 `keyof` 各占一格名字预算，走到 `f` 就超了 ⇒ 答否 ⇒ 壳在换行处关掉 ⇒
  体落成裸 `Block`（`FunctionDeclaration` 只到返回类型）。
  **修法**：新增 `Statement.IsFunctionHeadAwaitingBody`——**判据只问形状、不问返回类型自己的形状**：
  段首（跳过修饰词与标签头）是 `function`、且它后面**出现过形参括号**。
  拿名字预算去量一个可以有任意长度的槽位，量到的是「这个类型有几个词」，不是「这是不是头」。
  **边界一起量过**（14 条）：`declare function f(): void` 换行 `{}` 与 `function f(): keyof T` 换行 `{}`
  在 TS 那边**都是同一条** `FunctionDeclaration`（b1 / b4 实测），函数表达式那一档（`const g = function (): keyof T` 换行 `{}`）
  走的是老判据、照旧绿。
- **登记进语料的 5 族**（7 个判定点，都带 `xl:known-gap` 与入手处；这一栏自第 981 轮以来第一次不为空）：

  | 用例 | 症状（实测差额） | 入手处 |
  | --- | --- | --- |
  | `types/gap-r985-jsdoc-nonnull-in-type-position` | 类型位里的 `!`：TS 是 `JSDocNonNullableType`（`type T = a!` 缺 1；`(a!)` 缺 2 多 1——那一格我们收成了 `NonNullExpression`） | 类型位的 `!` 没有自己的节点，投影也没有 `JSDocNonNullableType` 这一档 |
  | `expressions/gap-r985-paren-object-inside-object-value` | 对象字面量属性值里的 `({ … })`：TS 是 `ObjectLiteralExpression`，我们是 `TypeLiteral`（`{ k: ({ a: 1 }) }` 缺 2 多 3） | `type-literal.xl.md`「括号里的第一个 `{`」那一支拿 `IsTypePosition` 判，而括号前面那个 `:` 是**属性分隔冒号**（同一族在 `DecideBracketContext` 里早就用 `EnclosingBraceContext` 修过） |
  | `declarations/gap-r985-heritage-optional-chain` | `class D extends a?.b` 缺 3（TS 是带 `?.` 的属性访问） | 继承子句的投影只认 Identifier / PropertyAccess / GenericType，`NullConditionalOperator` 没接上 |
  | `declarations/gap-r985-heritage-tagged-template` | `class D extends tag`t`` 缺 2（TS 是 `TaggedTemplateExpression`） | 这一格没有「名字后面紧跟模板串」那一档 |
  | `declarations/gap-r985-heritage-template-expression` | `class D extends `a${X}b` {}` **整条类没成形**（缺 9 多 2） | 类头扫描（`ClassBranch.ScanHead`）在继承子句里遇到 `String` 就停了 |

- **实测**：九道门全绿（墙钟 33.4s）——`cases:tsast` **已知缺口 5 条还开着、0 条已经收掉**、
  `cases:astjson` **1640 份 / 42516 个节点**六项全 0、`cases:check` **1655** 条 0 不合格、
  `cases:tags` **1527** 条带期望（**5367** 条断言）0 条不一致、`cases:shapes` 未覆盖 0
  （外部语料 229 份 / 用例 1642 份）；`coverage` **4257 / 4421**（守卫用例分子 +1、登记用例分母 +5）、
  `blocked 25 → 30`、`differ 134` 一处没动、加权 **95.7%**。
- **可复用的判据**：**换轴要换在「谁放进谁」上，不要只在同一个构造上继续加深**——前九批把
  「一个构造 × 相邻位置」挖得很干净（第 984 轮 908 条只剩 4 条），而换成「宿主 × 客人」之后
  第一次跑就出 86 条：**宿主那一侧的名字预算 / 判据边界才是薄弱处**（返回类型那一族就是
  一个「可以有任意长度」的槽位被当成「最多两个名字」量的）。

### 第 984 轮：清单空着 ⇒ **换第九批底样再量一遍**（`using` / type-only 子句 / 条件类型与推断 / 签名与成员 / `super` / 可选 `catch`，908 条合法片段）——量出**三格同根**（全在 `import … = …` 那一族）、**当轮全部收掉**，一条都没进 `xl:known-gap`

**一句话**：第 983 轮不动清单（那一轮量的是执行侧的 `JSON.rawJSON`，两次尝试都按实测撤回），
这一轮按「**清单空着就换一批底样**」的规矩换**第九批**（前几批量的是调用 / 可选链 / 下标、
值位的 `as` / `satisfies` / 实例化表达式、前缀单元与展开的操作数）——
批量的是**声明头与类型位那一侧**：`using` / `await using`、`import type` 与 `export type` 子句、
`export * as ns`、匿名默认导出、条件类型与 `infer` 的约束、映射类型的 `as` 子句、
模板字面量类型、构造 / 调用签名、`abstract` 成员、`accessor` 与 `declare` 字段、
对象与接口里的访问器、`this` 形参、`super` 与 `new (expr)`、`#x in o`、数组洞、
可选 `catch`、标签 `continue`、`debugger`、继承表达式、枚举成员（`tmp/r984/gen.mjs`，
**908 条合法片段、28 条 TS 自己就非法**）。**量出 4 条对不上，全部落在 `import … = …` 这一族**，
三条根因当轮收掉；同族复量 908 → **0 条**。

- **收掉的三格**（都在 `import` 那一族，各自一条守卫用例，都进 `tests/cases/token/modules/`）：

  | 症状（第 984 轮普查量出来的） | 根因 | 改法 |
  | --- | --- | --- |
  | `import` 换行 `type A = require("m")`：缺 `Identifier A`、多 `Identifier type` | `Process` 的收集循环**自己把那个软换行塞进了 `items`**（第 940 轮为了右值链开着的排版），而 `headIsType` 与 `ReadClause` 都按 `items[0]` 认头部 ⇒ `typeOnly` 判否、`type` 词既没被吃掉也没记成 `typeOnly` | 头部改成**第一个非 trivia 单元**（`SkipNextTrivia(items, -1)`），这一个下标同时递给 `ReadClause`（签名多了 `headIndex`）与 `children` 的切片 |
  | `import type A = require` 换行 `("m")`：漂 1、缺 `ExternalModuleReference`、多 4（整条断成两条语句） | `HasTypeColonBefore` 撞上 `=` 时问 `IsTypeAliasAssignment`，而它往回扫到 `type` 就答「这是类型别名」——**`import type A = …` 里那个 `type` 是导入子句的修饰词** | `IsTypeAliasAssignment` 在 `type` 那一格多问一句：**前一个实义单元是不是 `import`**（跨注释与软换行，`import /*c*/ type A` 同族）⇒ 是就答否 |
  | `import A = foo` 换行 `("m");`：漂 1、缺 3、多 2（TS 那边是**两条**语句） | 解析期那张续接表把 `(` 一律答成「接着写」（第 582 轮那两道护栏），而 **import-equals 的右值在 TS 的文法里只能是 `require(…)` 或一条限定名**，不是一次调用 | 新增 `Statement.IsImportEqualsWithoutRequire`（段首是 `import`／`export import`、段内有 `=`、末了那个实义单元**不是 `require`** ⇒ 换行就是边界），挂在 `(` 那一支上；`require` 那一格照旧续接 |

- **一处顺手量出来的**：`typeOnly` 这个属性与树要一起对——第一版只改了 `children` 的切片，
  XML 里于是出现「`typeOnly="false"` 而那个 `type` 词又不在树上」的自相矛盾形态
  （`cases:astjson` 那一项「同名同值」量的是 XML 与 JSON，量不到这一层），
  所以 `ReadClause` 与 `Process` 用的是**同一个 `headIndex`**。
- **实测**：九道门全绿（墙钟 34.0s）——`cases:tsast` 缺口清单照旧是空的（这一轮一条都没登记）、
  `cases:astjson` **1639 份 / 42444 个节点**六项全 0、`cases:check` **1649** 条 0 不合格、
  `cases:tags` **1526** 条带期望（**5360** 条断言）0 条不一致、
  `cases:shapes` 未覆盖 0（外部语料 229 份 / 用例 1636 份）；
  `coverage` **4256 / 4415**（分子 +3、分母 +3，就是那三条守卫用例）、`blocked 25` / `differ 134` / `bad 0` 一处没动、
  加权 **95.7%**。
- **可复用的判据**：**「头部」这件事在同一个 token 里被读了两遍，就必须只有一份答案**——
  这一轮三格里有格的根因就是「收集循环的产物」与「认头部的那一句」各写了一遍
  （`items[0]`），而循环自己会往 `items` 里塞 trivia；
  另一条：**TS 的续接表宽 ≠ 每一处的续接表都该宽**——`import … = …` 的右值是文法定死的两种读法，
  拿通用表达式的「`(` 能接着写」去套它，多出来的不是排版差异而是一条语法错误。

### 第 981 轮：清单空着 ⇒ **换一批底样再量一遍**（前缀单元 / 展开的操作数后面紧跟模板串或类型实参段，62 条片段）——量出**五格**、**当轮全部收掉**，一条都没登记进 `xl:known-gap`

**一句话**：第 980 轮把清单清空（第十八次）之后，按本仓「**清单空着就换一批底样再量一遍**」的规矩
换了**第七批**底样：前几批量的是「调用 / 可选链 / 非空断言 / 下标」与「值位的 `as` / `satisfies` /
实例化表达式 / 泛型箭头 / 类表达式」，这一批量的是**「某个前缀单元 / 展开运算符的操作数后面又跟了
模板串或类型实参段」**这一族（`typeof` / `void` / `!` / `-` 与 `...`，每个各配 `tag`t`` / `f<T>` /
`f<T>()` / `tag`t``()` / `tag`t`.b` / `a?.b`）——`tmp-r979/snippets-r981.json`（42 条）与
`snippets-r981b.json`（20 条），**62 条合法片段量出 5 格**（第一批量出 3 格、收掉之后再量邻近形状又出 2 格）。

**（一）量出来的五格**（三处根因、两个文件）：
- **`typeof f<T>`**：一元那一支只吃**一个**单元 ⇒ `UnaryOperator` 里只有 `typeof` 与 `f`，
  `<T>` 留在外面（产物 `TypeOfExpression` 只到 `[10,18)`、缺 `ExpressionWithTypeArguments` +
  `TypeReference`）。它是同一张桌子上第 322 轮那条老账（`typeof t`z`` 的模板）**旁边**的一格。
- **`f(...tag`t`)` / `g(...f<T>)`**：展开那一支同样只吃**一个**单元 ⇒ `Spread` 只盖到 `tag` / `f`
  （缺 2、漂 1、多 1）。
- **`f(...tag`t`())` / `f(...a?.b)`**（收掉前三格之后再量邻近形状才现出来的）：
  展开那一支还要吸收**紧跟的调用括号**与 **`?.` 单元**——不吸收时那次调用 / 那条可选链会套在
  `SpreadElement` **外面**（`f(...a?.b)` 于是变成「`(...a)?.b`」，**语义反了**：实测
  `SpreadElement` 只到 `...a`、`PropertyAccessExpression` 从 `...` 起算）。

**（二）修法（两处，判据同一句话）**：
- **`unary-operator.xl.md`**：把 `GenericType` 那一档补进**取操作数的那个循环**里
  （与 `ArrayLiteral` 那一档并列）。**写在循环里而不是像模板那样写在循环后面**是有原因的：
  `typeof f<T>()` 的调用括号排在实参段**后面**，写在循环外就轮不到它。
- **`spread.xl.md`**：`Spread.Process` 从「只吃 `afterIndex` 一格」改成**一个循环**——
  `GenericType` / `StartsWithTemplate`（模板开头）/ `(` 调用括号 / `NullConditionalOperator`
  四档依次吸收，终点 `operandEnd` 才是 `SignOut` 与 `ReplaceCountAt` 的边界。
  模板那一问与一元那一支**同一把判据**（`StartsWithTemplate`），实参段那一问是 `GenericType`。

**（三）读数**：62 条片段**修前 5 条对不上、修后 0 条**（两批各自 0 条）。
这一轮**没有登记任何缺口**——五格都是当轮量出、当轮收掉的，按规矩收成的是一条**13 条守卫**的普通用例
`expr-operand-template-generic.ts`（`typeof f<T>` / `typeof f<T>()` / `void f<T>` / `!f<T>` /
`typeof tag`t`.b` / `typeof f<T>`t`()` / `...tag`t`` / `...f<T>` / `...f<T>()` / `...tag`t`()` /
`...a?.b` / `...tag`t`.b` / `...g(...h<T>)`）。

**（四）实测**：九道门全绿（墙钟 32.6s）——`cases:tsast` **「语料里一条都没有——缺口清单是空的」**
（第 980 轮第十八次清空之后**不动清单**）、`cases:astjson` 六项全 0（**1632 份 / 42146 个节点**）、
`cases:check` **1642 / 1642**、`cases:tags` **1642 条**（1519 条带期望 / 5326 条断言）0 条不一致、
`cases:shapes` 未覆盖 0（用例 1629 份）、`coverage` **4249 / 4408**（分子 +1、分母 +1、
`blocked 25` 与 `differ 134` 一处没动、加权 95.7%）。
`runtime:check` **243 / 243** 与 `runtime:cli` **79 / 79** 不动——这一轮动的是 token 层取操作数那两处，它们是守卫。

**（五）可复用的判据**：
- **「取操作数」这件事每个前缀单元各写了一遍**：一元那一支早就为模板串补过一格（第 322 轮），
  而展开那一支**同一句话一格都没有**；反过来，一元那一支没有「调用括号排在实参段后面」的那一格。
  量这种族要**两样一起摆**（前缀 × 后缀），一格一格试会漏掉「顺序」那一维。
- **收掉一格之后要立刻量它旁边那两格**：`...tag`t`` 收掉之后，`...tag`t`()` 与 `...a?.b`
  才现出来——**三格是同一句话**，一次收完比分三轮便宜。
- **静默错值比缺节点更值钱**：`f(...a?.b)` 的四方向读数（缺 1 漂 1 多 2）看着与「形状不对」同级，
  可它把「展开 `a?.b`」算成了「`(...a)?.b`」——读数之外还要问一句「这一格算的是同一个值吗」。

### 第 980 轮：最后那一格 `` new f<T>`t` `` 收掉——根因不在**表达式位**的后继闸（第 977 轮已收下反引号），而在**类型位**那一张表 + `New.PrintAst` 里「`<…>` 归谁」一问；缺口清单**第十八次清空**

**一句话**：第 979 轮把 `f<T>`t`` 那一族的尾巴收干净之后，只剩 `` new f<T>`t` `` 一条。这一轮按
「先复量、再动手」把它拆成两半，**两半都不在上一轮记下的那一处**：不是表达式位的后继闸，
而是（一）`IsTypePosition` 把 `new f<T>` 判成了**类型位**（`new` 在那张类型词表里，为的是构造签名），
于是走**类型位**的后继表——那张表里没有反引号；（二）就算 `<…>` 成形了，
`New.PrintAst` 还会把那个 `GenericType` 收成**外层** `NewExpression` 的 `typeArguments`。

**（一）根因量到底**：`new f<T>(1)`（后继 `(`）与 `new f<T>` 换行 `(x)` 都是成的、`new f<T>.g` 是
**TS 自己就非法**的（探针里 `tsInvalid` 跳过，不算缺口）——所以差别只可能落在**后继字符**上。
顺着 `IsAllowedFollower` 往下读：表达式位那张表第 977 轮已经收下反引号，**类型位那张表没有**，
而 `new` 恰好是 `IsTypePosition` 里的类型词（`new (a: number) => A`）⇒ 这一格走的是类型位那一支。
拿真 TS 复量过节点与字段名（`tmp-r979/ts-newfields.cjs`）：`` new f<T>`t` `` / `` new f<T>`t`.b `` /
`` new f<T>`t`(1) `` 三条的外层 `NewExpression` **都只有 `expression`**，`typeArguments` 挂在里面那层。

**（二）两处修法**：
- **`generic-type.xl.md` 的 `IsAllowedFollower`**：类型位那张 `switch` 补一格 `case "\`"`。
  **为什么不会把类型读法改坏**：类型位里反引号本来接不上任何东西（`type X = F<T>`t`` 不是合法类型），
  而能走到这一格的合法形状（`` new f<T>`t` `` / `` x as F<T>`t` `` / `` x satisfies F<T>`t` ``）
  在 TS 里**都是标签模板**——`<…>` 本来就是那条表达式的类型实参段。与表达式位第 977 轮补的那一格
  是**同一句话**，只是两张表各缺一格。
- **`new.xl.md` 的 `New.PrintAst`**：「`<…>` 归谁」补一问——**紧跟 `GenericType` 的那一格是
  反引号模板**时，这一段连同它后面的一起归**被构造者**（交给 `ctx.Expression`，`projectExpression`
  的 0a-1 那一支把它们合成 `TaggedTemplateExpression{ tag, typeArguments, template }`）；
  只有 `GenericType` 是 `name` 段**最后一个实义单元**时才是 `New` 自己的实参段。
  判据与 0b / 0c / 0d 同源：`IsTemplateString` 问的是**原文那个引号**。
  这一问**只管标签模板那一档**（`new Map<string, number>()` / `new a.b.C<T>()` 一字未动）。

**（三）读数**：同族探针（`tmp-r979/snippets.json` / `snippets-extra.json` / `snippets-new.json`，
共 35 条合法片段）**修前 12 条对不上、修后 0 条**；`new f<T>`t`` 那一份按规矩把 `xl:known-gap`
撤掉、改成 `xl:note`，并把同族四条（`` new f<T>`t`.b `` / `` new f<T>`t`(1) `` / `new f<T>;` /
`new Map<string, number>();` / `new f<T>();`）一起收成守卫。

**（四）实测**：九道门全绿（墙钟 31.8s）——`cases:tsast` **「语料里一条都没有——缺口清单是空的」**
（**第十八次清空**）、`cases:astjson` 六项全 0（**1631 份 / 42018 个节点**，那一份用例从
`known-gap` 那条账回到正账上）、`cases:check` **1641 / 1641**、`cases:tags` **1641 条**
（1519 条带期望 / 5326 条断言）0 条不一致、`cases:shapes` 未覆盖 0（用例 1628 份）、
`coverage` **4248 / 4407**（分子 +1、`blocked 26 → 25`、`differ 134` 一处没动、加权 95.7%）。
`runtime:check` **243 / 243** 与 `runtime:cli` **79 / 79** 不动——这一轮动的是 token 层与 `new` 的投影，它们是守卫。

**（五）可复用的判据**：
- **同一句判据在两张表里各写一份，就会各缺一格**：表达式位第 977 轮收下反引号时，
  类型位那张表**看起来无关**（类型位里哪来的模板串），可 `new` / `as` / `satisfies` 这些
  「表达式位的类型词」会把表达式位的形状送进类型位那一支 ⇒ 两张表要一起改。
- **“到不了那里”要先证**：上一轮记下的入手处（`new` 那条路的入口）**不是**根因；
  把「后继是 `(` 成 / 后继是反引号不成」这一对摆在一起，根因自己就现出来了。
- **字段名也是判据**：这一格第二轮量下来「缺 0 漂 0 多 0、**字段 2**」——节点形状已经对了，
  错的是 `typeArguments` 挂在哪一层；只看四方向会以为它已经收掉。

### 第 979 轮：第 978 轮登记的那一族**三条一次全绿**——根因不在 0b 的链词表（第 977 轮那两格补对了），而在 **0a 那一支先响**；同一族的尾巴几档（`+ 1` / `.c` / 第二个模板 / 包在 `PropertyAccess` 里的模板）也一起收；另量出一格 `` new f<T>`t` `` 登记进语料

**一句话**：第 978 轮把 `` f<T>`t` `` 那一族的前半（表达式位后继闸 + 链词表）收掉、三条登记进
`xl:known-gap`。这一轮按「先复量、再动手」的规矩换**两批更宽的底样**（26 条片段，探针
`tmp-r979/snippets.json` / `snippets-extra.json`）把那一族量到底，**当场发现根因不在 0b**：
`f<T>` 一进 `projectExpression` 就被 **0a 那一支**（泛型实例化表达式）先认走、投成
`ExpressionWithTypeArguments`，剩下的模板串交给 `foldBinaryFrom` 时**整片丢**——
第 978 轮记下的「下一处入手处是 0b 那一段前面那道入口判据」**不是**这一处
（0a 排在 0b 前面，根本轮不到 0b）。

**（一）修法（三处，都在 [typescript/print-ast-common.xl.md](typescript/print-ast-common.xl.md)）**：
- **0a 里补一档「`callee<…>` 后面紧跟模板串 ⇒ `TaggedTemplateExpression`」**：`<…>` 是
  **这条标签模板自己的** `typeArguments`（TS 的 `TaggedTemplateExpression{ tag, typeArguments, template }`，
  与 `f<T>(1)` 那条 `CallExpression{ expression, typeArguments, arguments }` **同一个口径**），
  标签那一格照旧是被实例化的那个表达式（名字 / `PropertyAccess` / 值位括号三档都认，与 0a 原来那一份同源）。
  判据与 0b / 0c 同源（**原文的引号**：反引号才是模板），只是标签那一串以 `GenericType` 收尾；
  `<…>` 能成形本身就说明 token 层那道后继闸已经认过（第 978 轮收下的反引号那一格）。
- **尾巴那几档照 0b / 0c / 0d 的接法**（不另写一份折叠）：模板**直接**是第三格（0b 那一档）、
  **装在 `PropertyAccess` 里**（`` f<T>`t`.c ``，0c 那一档）、**在运算符单元的左脊柱里**
  （`` f<T>`t` + 1 ``，0d 那一档）——三档分别把尾巴交给 `chainOnto` / `foldBinaryFrom`。
- **`chainOnto` 补一格「紧跟一格反引号模板 ⇒ 再标一次」**：`` f<T>`t``u` `` 与 `` tag`a``b` ``
  在 TS 那边是**嵌套两条** `TaggedTemplateExpression`，原来这一格落到循环末尾被跳过 ⇒ 外面那一层整格丢。
  模板后面又是模板时（`` f<T>`a`.b`c` ``）尾巴也走 `chainOnto` 而不是 `foldBinaryFrom`
  （交给二元会把它当成一个操作数）。

**（二）读数（`node tests/parse/ts-ast.mjs --snippets …`）**：第一批 12 条（`tmp-r979/snippets.json`）
修前 **10 条**对不上、修后 **1 条**；第二批 14 条（`tmp-r979/snippets-extra.json`，把尾巴与邻居形状一起摆进去）
中途 **2 条**、收完尾巴那一档之后 **1 条**。两批合起来只剩 `` new f<T>`t` ``（见下）。
**三条登记缺口全部转绿**——`xl:known-gap` 按规矩撤掉、改成 `xl:note`，用例留着当守卫；
另加**一条十条守卫**的普通用例 `expr-inst-tagged.ts`（`` f<T>`t` `` / `` f<A, B>`t` `` /
`` f<T>`${1}` `` / `` f<T>`t`.c `` / `` a.b.c<T>`t` `` / `` (a.b)<T>`t` `` / `` f<T>`t` + 1 `` /
`` f<T>`t``u` `` / `` f<T>`a`.b`c` `` / `` x < y > `t` ``）。

**（三）仍然开着的一格**：`` new f<T>`t` `` **到不了投影那一层**——token 层 `new` 那一趟不认配对 `>`
后面紧跟的反引号，`f<T>` 根本没成形（产物是 `` BinaryExpression(BinaryExpression(New(f), <, T), >, `t`) ``，
TS 那边是 `NewExpression > TaggedTemplateExpression`）。根因量到了一半：`new f<T>(1)` 那一格
（后继是 `(`）是成的 ⇒ 问题在 **`new` 那条路的入口**，不在 `generic-type.xl.md` 的
`IsAllowedFollower`（表达式位第 977 轮已经收下反引号）。按规矩**登记不猜**：
`gap-r979-new-inst-tagged.ts` 进语料、走 `xl:known-gap` 那条账。

**（四）实测**：九道门全绿（墙钟 32.3s）——`cases:tsast` 已知缺口 **3 → 1 条还开着**
（3 条已经收掉、按规矩来撤指令）、`cases:astjson` 六项全 0（**1630 份 / 41919 个节点**）、
`cases:check` **1641 / 1641**、`cases:tags` **1641 条**（1519 条带期望 / 5326 条断言）0 条不一致、
`cases:shapes` 未覆盖 0（用例 1628 份）、`coverage` **4247 / 4407**
（分母 +2（一条守卫 + 一条缺口）、分子 +1、`blocked 25 → 26`、`differ 134` 一处没动、加权 95.7%）。
`runtime:check` **243 / 243** 与 `runtime:cli` **79 / 79** 不动——这一轮动的是**投影层**，它们是守卫。

**（五）可复用的判据**：
- **「登记的下一处入手处」也是要复量的**：上一轮按现场估的那一处（0b 的入口判据）不是根因——
  **0a 排在它前面**，`callee<…>` 先被认走。修法要落在**真正先响的那一支**上。
- **「合成」与「尾巴」是两件事**：合成那一档（0a-1）收掉三条登记缺口，尾巴那几档是同一句话在别处的副本
  （0b / 0c / 0d）——**一次全量**比一格一格试更省，也免得同一条判据在四处各漂一次。
- **`chainOnto` 是「链的续格」的公共出口**：模板串也是链上的一格（`` tag`a``b` `` 是嵌套两条），
  漏了它就只在「后面什么都没有」的形状上对。

### 第 978 轮：缺口清单空着 ⇒ **换一批底样再量一遍**（值位的 `as` / `satisfies` / 实例化表达式 / 泛型箭头 / 类表达式，1430 条片段）——量出**一族三面**、当轮收掉根因的前半，三条登记进语料

**一句话**：第 977 轮（前一轮）把 `xl:known-gap` 清单收空之后，按本仓「**清单空着就换一批底样再量一遍**」
的规矩换了**第六批**底样：前几批量的是「调用 / 可选链 / 非空断言 / 下标」与「声明 / 语句 / 模块」，
这一批量的是**值位的 `as` / `satisfies` / 实例化表达式 `f<T>` / 泛型箭头 / 类表达式 / `typeof` 那些一元词**——
29 个底样 × 每个「相邻两格之间」× 三种 trivia（`/*c*/` / 换行 / 行注释+换行）= **1430 条合法片段**
（另 109 条 TS 自己就非法，跳过），探针是 `tmp/r977-sweep.mjs`。

**（一）读数**：**39 条对不上，而且全部出自同一个底样**——`const a = f<T>`t`;`（标签模板）。
按本仓规矩先问「这一格到底是什么形状」，于是把它收到最小片段再量一次（`tmp/r977-min.mjs`）：
`f<T>;` / `f<T>(1);` / `f<T>.g;` **三条全过**，只有**后面跟模板串**那一条错——
所以这不是「实例化表达式没做」，而是**「模板串那一段的后继闸没认它」**。

**（二）拿真 TS 复量那一格**（`tmp/r977-ts.mjs`，`ts.createSourceFile` 读 `parseDiagnostics` 与节点树）：
`f < T > `t`` / `f<T>`t`` / `f < T > (1)` 三种排版 TS **都**读成一条
`TaggedTemplateExpression`（或 `CallExpression`）带 `TypeReference`；而 `x < y > z` 才是二元。
⇒ 这一族不是「放宽判据」，是**同一句话少了一格**（第 977 轮那条「先问这个片段在 TS 里到底读成什么」的现场版）。

**（三）当轮收掉的前半**（两处，都在解析/投影层）：
- **表达式位的后继闸收下反引号**（`generic-type.xl.md` 的 `IsAllowedFollower`）：
  那一支原来只认 `(` 与「接不上操作数」的那几个字符，而 TS 的
  `canFollowTypeArgumentsInExpression` 把**标签模板**与**泛型调用**当同一条。
  加一格 `item === "`"` 之后，`f<T>` 从「被折成 `BinaryExpression(LessThan, T, GreaterThan)`」
  变成**一格** `ExpressionWithTypeArguments`——读数从「缺 2 多 4」缩到「缺 2 多 1」。
- **投影那道「标签必须是后缀链」的词表收下 `GenericType` / `ExpressionWithTypeArguments`**
  （`print-ast-common.xl.md` 的 `tagIsPostfixChain`）：**两个名字都要认**——
  同一个 token 节点在表达式位投出来是 `ExpressionWithTypeArguments`、在类型位才是 `TypeReference`。
  **第一版只加了 `GenericType`，量下来 39 条一条没动**（这正是「按形状认节点」那条纪律的现场）。

**（四）仍然开着的后半**：`f<T>` 现在是**一格**了，可**投影没有把它与模板串合成
`TaggedTemplateExpression`**——产物是两格平级（模板那一格整格丢），TS 那边是一条
`TaggedTemplateExpression` 包着一个 `NoSubstitutionTemplateLiteral`。
按规矩**登记不猜**，三条进语料（各带一句根因与下一处入手处）：
`gap-r977-inst-tagged` / `gap-r977-inst-tagged-two-args` / `gap-r977-inst-tagged-template-expr`
（第三面量的是**带插值**的模板：整棵 `TemplateExpression` 连里面的 `NumericLiteral` 一起丢）。

**（五）实测**：九道门全绿（墙钟 30.7s）——`cases:tsast` 已知缺口 **0 → 3 条还开着**
（0 条已经收掉）、`cases:astjson` 六项全 0（**1626 份 / 41709 个节点**）、
`cases:check` **1639 / 1639**（+3 就是这一轮登记的）、`cases:tags` **1639 条**（5326 条断言）0 条不一致、
`cases:shapes` 未覆盖 0（用例 1626 份）、`coverage **4243 / 4405**`
（分母 +3、分子一处没动、`blocked 25 → 28`、`differ 134` 一处没动、加权 95.7%）。
`runtime:check` **243 / 243** 与 `runtime:cli` **79 / 79** 不动——这一轮动的是解析层，它们是守卫。

**（六）可复用的判据**：
- **「量出一族」与「量出一格」不是一回事**：39 条对不上听着像大缺口，
  收到最小片段之后是**一个底样的一个后继格**——先缩到最小，再谈修法。
- **同一个 token 节点在两个位上投出来的名字不同**（`GenericType` → `ExpressionWithTypeArguments` /
  `TypeReference`），而**按形状认节点的判据只认投好之后的名字**：词表要按**投出来的**名字写。
- **一轮只走一半也要如实登记**：这一轮把「后继闸」那一半收掉了（读数确实在缩：缺 2 多 4 → 缺 2 多 1），
  但**门里的 39 条仍然对不上**，所以那三条进 `xl:known-gap`、不许把「一半」说成「收掉了」。
### 第 977 轮：绑定函数被 `new` 时 `new.target` 丢了——**照 `HostConstructThis` 那条老办法再开一格**（宿主 ABI 第六格 + 重入那三条开帧路各铺一格；一条台账转绿，九道门全绿）

**一句话**：`new (F.bind(null))()` 里 `F` 体内的 `new.target` 该是**原函数** `F`
（判据 `exec/functions/096-new-target` 第 3 行：Node 给 `target true`、本仓给 `target false`）。
根因量到最后是**两处相加**，而且**每一处都单独不足以解释症状**：

1. **宿主通道上没有地方放「这一次 `new` 的是谁」**——`HostConstructing` 只是一位布尔
   （答「是不是构造」，不答「构造的是谁」），`HostConstructThis` 装的是**实例**（目标要的 `this`）。
   `BoundCall` 最后那句 `call(boundTarget, callSelf, merged)` 只交三格，
   于是目标那一路 `constructTarget > 0` 而 `callee` 是**绑定函数自己**——
   `new.target` 于是永远落不到原函数上。
2. **`CallNative`（重入）那一条开帧路根本不铺 `new.target` 那一格**——
   它是 `Frames.Push(closure.Code, info.SlotCount, NativeReturnSlot)` 之后手写
   `Env` / `This` / `Slots`，而 `DoCallValue` 那两条路里的
   `frame.NewTarget = constructTarget > 0 ? callee : undefined` **一个字都没抄过来**。
   **所以就算第一处给了答案，重入这一趟也读不到它**——而 `bind` 转交构造走的正是重入。

**（一）修法**：照 `HostConstructThis`（第 617 轮）那条「**一格机器状态 + 一层门面**」的老办法
再开一格 `HostConstructNewTarget`——`DoNew` 置上（装的是**被 `new` 的那个函数**）、
`DoCallValue` / `CallNative` 调完立刻还原（存的是上一个值，嵌套靠后进先出）、
进 `SnapshotRoots`（它是可调用值，而窗口里宿主正在跑脚本）。
宿主 ABI 因此多一位第六格（`HostInvoker`），驱动 `tsrun.xl.md` 的 `InstallHost` 同步改一处。
`NativeCall` 那一边是**可选**第四格（类型别名不许写参数默认值——第 977 轮实测 `tsc` 报 `TS2371`），
`Native()` / `CallNative` 两道门面把「少写一格」折成 `null`。

**（二）语言层那半边**：`BoundCall` 不能直接把宿主递进来的那一格转手——
**它装的是调用者身份**（`G`），而规范要的是**最里面那个函数**。所以沿
`__boundTarget` 一路解到底（`f.bind(a).bind(b)` 套两层也解得到 `F`），
解不动或成环就停下（`depth` 兜底；环用户造不出来，这是防御）。
**非构造那一趟照旧交 `undefined`**（JS 里 `G()` 的 `new.target` 就是它）。

**（三）走过的两次弯路**（按顺序记下来，因为它们各自都很像对的）：
- **第一版把「构造」当布尔转交**（让目标按 `constructTarget > 0` 走 `DoCallValue` 那一支）。
  量下来会**多造一个实例**——而 `new (Point.bind(null))(5).x` 那一档靠的正是
  「实例只有一个」（第 617 轮）：`BoundCall` 交下来的**已经是实例**。
  ⇒ 改成**只覆盖 `NewTarget` 那一格**，`ConstructTarget` 照旧是 0。
- **第二版把那一句插到了 `const created = …` 之前**（补丁按行首匹配，撞进了前一处同形代码）。
  `tsc` 当场报 `TS2448 / TS2454`（`created` 用在声明之前）——**这说明「按锚点打补丁」时
  锚点本身也是要复核的读数**：那个句子在同一份文件里出现过**三**次，缩进还一模一样。

**（四）实测**：九道门全绿（墙钟 34.5s）——`cases:tsast` 缺口清单照旧是空的、
`cases:astjson` 六项全 0（**1626 份 / 41709 个节点**）、`cases:check` **1636 / 1636**、
`cases:tags` **5326** 条断言 0 条不一致、`cases:shapes` 未覆盖 0、
`coverage **4243 / 4402**`（**分子 +1**、`blocked 25` 一处没动、`differ 135 → 134`、加权 95.7%）。
`runtime:check` **243 / 243**、`runtime:cli` **79 / 79** 不动——这两道是这一轮**最要紧的守卫**：
改的是宿主调用通道与三条开帧路，它们量的是「值模型 / 帧 / 回收」那一整片。

**（五）可复用的判据**：
- **「一条语义长在两条路上」这句话，在这一轮是字面意义的**：`DoCallValue`（调用路）与
  `CallNative`（重入路）各自手写一遍开帧，**第 977 轮只改一条就是「直接 `new` 对、
  `bind` 转交不对」**——第 307 / 312 / 320 / 977 轮量到的都是同一个形状。
- **「宿主 ABI 加一位」不是免费的**：它要动 `HostInvoker`（公开契约）、驱动那一处、
  以及语言层那条 `NativeCall` 的签名；**所以先问「有没有别的地方能放」**——
  这一轮答的是「没有」（布尔与实例都替代不了它），才动契约。
- **量根因要量到「哪一处不足以解释症状」**：这一轮两处**都是**必要条件，
  而只量到第一处时那个修法（布尔转交）看起来能用——症状会从 `false` 变成
  「多造一个实例」的另一条。

### 第 976 轮：**把「当前状态」那一节按实测订正**——第 974 轮写下的是普查当场的预估值，第 975 轮收干净之后那一栏已经过期（数字一处一处改成门里跑出来的）

**一句话**：这一轮不改解析器，改的是**那份读数本身**——「当前状态（最近一次全量实测）」是
整份 README 里唯一一处**只写数字**的地方，而它此前停在**第 974 轮普查当场的预估**上
（`blocked 38` / `4223 / 4396` / `xl:known-gap 13 条还开着`），第 975 轮把 16 格收干净之后
那三个数**没有一个还对得上**。

**（一）先量，再改**：`npm run gates` 九道全绿（墙钟 34.3s），逐道把读数抄下来——
`cases:tsast` **四方向 0 / 未映射 0 / 缺 range 0 / 区间越界 0 / 抛异常 0**、`xl:known-gap` **0 条**；
`cases:astjson` **1626 份 / 41709 个节点**六项全 0；`cases:check` **1636 / 1636**；
`cases:tags` **1636 条**（1519 条带期望、**5326** 条断言）0 条不一致；
`cases:shapes` 外部语料 229 份 / 用例 **1623** 份、未覆盖 0；`runtime:check` **243 / 243**；
`runtime:cli` **79 / 79**；`coverage` **五类 4242 / 4402**、加权 **95.7%**、
`blocked 25` / `differ 135` / `bad 0` / `regressions 0`
（分类：`token 1623/1623`、`exec 756/792`、`runtime 736/776`、`stdlib 886/966`、`e2e 241/245`）。

**（二）改法**：**一处一处对锚点，命中次数不是 1 就拒绝写盘**——那一节里有几行是「逐轮现场账
一条一条往后接」的长行（`cases:tsast` 那一行 2998 字、`coverage` 那一行更长），
所以只换**能唯一定位的那一小段**，并把过期的现场账换成「订正说明 + 现在的读数」；
另外把「口径与已知缺口」里那条「`xl:known-gap` 那本账：**10 条还开着**」按实测改成 **0 条**
（这一条与「当前状态」那一栏是两处会各自变旧的地方）。

**（三）教训**：**「普查当场写下的数字」与「门里跑出来的数字」是两回事**。
第 974 轮那一节写 `blocked 38` 时，那 13 格确实刚登记进去、确实进 `blocked`；
而第 975 轮把它们收掉之后，**没有任何一处会自动去改「当前状态」那一节**——
它是手写的，也就必须靠一轮实测来对齐。**这一节的内容是一条待复核的读数，不是前提。**

### 第 974 轮：缺口清单空着 ⇒ **换一批更深的底样普查**——30 条里 13 条对不上，逐条登记进语料（缺口 0 → 13）

**一句话**：第 972 / 973 两轮把清单收空之后，按本仓「**清单空着就换一批底样再量一遍**」的规矩
另拿 30 条同族片段（调用 / 可选链 / 非空断言 / 下标；层数比第 971 轮那一批深一到两层，
另把「断言 + 下标」与「断言 + 调用」的组合摆进去）普查了一遍：
`node tests/parse/ts-ast.mjs --snippets tmp/r973-family.mjs`——**30 条里 13 条对不上**。
按规矩**先登记、不猜**：13 格各写一份用例进 `tests/cases/token/expressions/gap-r973-*.ts`
（各带一行 `// xl:known-gap <读数 + 根因>`，`cases:tsast` 每趟逐条真跑）。

- **登记的那 13 格**（文件名即形状，读数写在各自第一行）：
  | 用例 | 写法 | 读数 |
  | --- | --- | --- |
  | `gap-r973-nonnull-call-quad` | `a!()()()()` | 漂 2 |
  | `gap-r973-nonnull-call-quad-member` | `a!()()()().c` | 漂 2 |
  | `gap-r973-nonnull-member-call-quad` | `a.b!()()()()` | 漂 2 |
  | `gap-r973-nonnull-call-assert-call-assert` | `a!()!()!()` | 漂 1 |
  | `gap-r973-nonnull-call-twice-assert` | `a!()()!()` | 缺 3 漂 1 |
  | `gap-r973-member-call-thrice-member` | `a.b()()().c` | 漂 3 多 2 |
  | `gap-r973-opt-assert-call-thrice` | `a?.b!()()()` | 漂 1 |
  | `gap-r973-opt-assert-call-thrice-member` | `a?.b!()()().c` | 缺 3 |
  | `gap-r973-opt-index-call-thrice` | `a?.[b]()()()` | 漂 1 |
  | `gap-r973-opt-assert-index-index-member` | `a?.b![0]![1].c` | 缺 5 漂 2 |
  | `gap-r973-opt-assert-index-call-member` | `a?.b![0]().c` | 缺 1 |
  | `gap-r973-opt-call-assert-index` | `a?.b()![0]` | 缺 1 漂 2 多 2 |
  | `gap-r973-opt-call-assert-index-member` | `a?.b()![0].c` | 缺 1 漂 2 多 2 |
- **三族根因**（都写在各自用例头里，下一轮的入手处就从这里挑）：
  1. **「层数」这一句要递归着问**（前 6 格）：第 972 轮补的那一档只管「最里面那一格的头是
     实参括号」；空名字 `Method` 套到**三格**时，同一个问句要在每一层都问一次。
  2. **同形的那几份副本**（`opt-assert-call-thrice*` / `opt-index-call-thrice`）：
     第 972 轮改的是 `projectExpression` 链循环那一份，`chainWithOptional` 的**子链分支**里
     还住着同形的另一份，它同样少一层。
  3. **断言 + 下标 / 断言 + 调用落在 NCO 尾巴上**（后 4 格）：`![0]` 之后再跟一格、
     或者 `![0]` 后面那一对平级圆括号，链都没有接着往下接。
- **数字**：`cases:tsast` 已知缺口 **0 → 13 条还开着**（各带 `xl:known-gap`，用例留着当守卫）；
  八项照旧全 0（`cases:check` **1630 条用例，0 条不合格**）；`coverage` **4223 / 4396**
  （分母 +13、`blocked 25 → 38`——**这 13 条是这一轮的账、不是回归**）、加权 **95.6%**；九道门全绿。

### 第 973 轮：第 971 轮登记的第二格收掉——**子链那一支抬出 `isDot` 段，下标那一份补进子链循环**（缺口 1 → 0，清单第十五次清空）

**一句话**：`a?.b![0].c` 是**两处各缺一份**——`chainOnto` 的循环在
`if (!isDot(unit, ctx) || i + 1 >= units.length) break` 上收工，而子链那一支住在
`isDot` 那一段**里面**（`unit` 自己就是 `PropertyAccess` 时根本走不到）；
抬出来之后那条子链的第一格是 `Bracket([0])`，而 `chainOnto` 的子链循环里
**没有下标括号那一支**（`chainWithOptional` 的子链分支里早就有）。

- **收掉的那一格**（`xl:known-gap` 按规矩撤掉、用例留着当守卫）：
  [gap-r971-opt-assert-index-member](tests/cases/token/expressions/gap-r971-opt-assert-index-member.ts)
  ——`a?.b![0].c`：**缺 3 漂 1 → 全 0**。
- **两处修法**（都在 [typescript/print-ast-common.xl.md](typescript/print-ast-common.xl.md) 的 `chainOnto`）：
  1. 循环入口改成 `const dotStep = isDot(unit, ctx) && i + 1 < units.length` 与
     `loneSubChain = dotStep === false && unit.get("type") === "PropertyAccess"`，
     末尾那句 `i += 2` 跟着改成 `i += dotStep ? 2 : 1`——抬出来那一档**只跨 1 格**。
  2. `chainOnto` 的子链循环补上 `Bracket startBracket === "["` 那一支，
     判据与折法与 `chainWithOptional` 子链分支里那一支**一字不差**（不写第二份）。
- **数字**：`cases:tsast` 已知缺口 **1 → 0 条还开着**（清单**第十五次清空**），
  八项照旧全 0；九道门全绿。

### 第 972 轮：第 971 轮登记的第一格收掉——**两处判据各缺一句**，中间一版修法按规矩撤回（缺口 2 → 1）

**一句话**：`a!()()().c` 缺的**不是一处**——入口 `isCallFirstUnit` 认不下「头一格又是一格
`Method`」，而放开入口之后**层数还是少一层**：`projectExpression` 的链循环里
「空名字 `Method` 套空名字 `Method`」那一档只投了**一次**里层调用，可那个 `callHead`
自己也是「一格说两次调用」（第 966 轮那句话）。

- **收掉的那一格**（`xl:known-gap` 按规矩撤掉、用例留着当守卫）：
  [gap-r971-nonnull-call-thrice-member](tests/cases/token/expressions/gap-r971-nonnull-call-thrice-member.ts)
  ——`a!()()().c`：**缺 5 / 漂 1 → 全 0**（三次调用的区间 `[0,4) / [0,6) / [0,8)` 各就各位）。
- **两处修法**（都在 [typescript/print-ast-common.xl.md](typescript/print-ast-common.xl.md) 的投影层）：
  1. `isCallFirstUnit` 的 `Method` 那一支补一句 **`if (mHead.get("type") === "Method") return isCallFirstUnit(mHead, ctx);`**
     ——第 971 轮的「下一处入手处」点的就是这一句，实测**缺 5 → 缺 0 漂 1**（链进得去了）。
  2. 链循环里「`bareName === ""` 且 `callHead` 的名字也是空」那一档：**先把「括号那一次」
     建成最里面那一格**，再让 `projectNode(callHead)` 那个壳套上去——判据与同段下面那一支
     **一字不差**（`endOf(头) < endOf(这一格)`），折法也一样。
- **一版被证否的修法，按规矩撤回**：第 972 轮先在 `chainOnto` 的 Method 分支补了同一句判据，
  **插桩实测那一支根本没进**（`deepHead` 的打印一次都没出现）——这个形状走的是
  `projectExpression` 的**链循环**（与 `chainOnto` 同形不同处），于是那一版整段撤掉，
  **没有留下死代码**。教训与第 970 轮同源：**锚点要选那一段独有的字符串**，
  「同形不同处」的副本要先数清有几处再动手。
- **数字**：`cases:tsast` 已知缺口 **2 → 1 条还开着**（收掉的那条删掉 `xl:known-gap`、
  用例留着当守卫），八项照旧全 0（投影节点 39194 个一处没动）；九道门全绿。

### 第 965 轮：NCO 里那一格折完之后**还剩兄弟 / 那一格前面没有点号**——收掉四格（缺口 10 → 6），另一格量到根上（修法被证否）

**一句话**：这一轮补的是**「我折完这一格之后，NCO 里还排着谁」**与
**「轮到我这一格时前面有没有点号」**两个问句——
第 962 / 963 / 964 三轮补的是「轮到之后怎么折」与「能不能轮到」，
而这一轮的形状是**链的最后一格在 NCO 里、续格在 NCO 外面**（或干脆前面没有点号）：
三处折法各自 `return` / `break` 得太早，把那一格**整格丢掉**。
收掉四格、缺口清单 **10 → 6**；九道门全绿。

- **收掉的四格**（同一个问句在三处 `return` / `break` 上的副本）：
  | 用例 | 写法 | 症状 |
  | --- | --- | --- |
  | `gap-r964-opt-index-index-call` | `a?.[b][c]()` | 缺一个 `CallExpression`：**两个下标装在 NCO 那一格 `PropertyAccess` 里**，那次调用是 NCO 的**下一个兄弟**——折完下标就 `return node` ⇒ 调用整格丢 |
  | `gap-r964-opt-member-tagged-call` | `` a?.b`t`() `` | 同上：标签模板那一支交出一个 `TaggedTemplateExpression` 就完了，后面那次调用整格丢 |
  | `gap-r964-opt-index-call-twice` | `a?.[b]()()` | 外层那次调用漂 2：第二格 `Method(name="")[Bracket(())]` 被第 962 轮那条**摊开**规矩摊成了裸括号 ⇒ 外层调用没有节点、区间也短一格 |
  | `gap-r964-opt-assert-member-assert-call-twice` | `a?.b!.c!()()` | 缺两个 `CallExpression`：`chainOnto` 原来只认「点号 + 名字」，**前面没有点号的 `Method`** 一律 `break` |
- **修法三条（都落在同一个函数的两处 `return` 与一处 `break` 上）**：
  1. `chainWithOptional` 的下标那一支与标签模板那一支：**还有兄弟就交给 `chainOnto`**
     （「紧跟一对圆括号 ⇒ 再调一次」那一支正是这一档要的；第 962 轮在 `?.[i]` 那一支里
     已经这么交了，这两处漏抄）；
  2. **裸的一次调用不要摊开**：新立 `isBareCallMethod`（名字为空、头一格是
     `Method` / 实参括号 / `NotNull`）——`Method(name="")[Bracket(())]` 是**一次调用**，
     摊成裸括号之后那次调用就没有节点了；
  3. `chainOnto` 认下**前面没有点号的 `Method`**（三支：`NotNull` / 内层 `Method` / 两层调用），
     判据与 `chainWithOptional` 那一支**同源**（第 962 轮立的两步走加区间判据），
     区别只是**点号没有出现**。
- **同域还有一格同形（本轮没动）**：`a?.b()()()`（`gap-r964-opt-call-triple`）的产物是
  `NCO[Method(name="")[Method(name="")[Method(name="b")]]]`——**中间那一层 `Method` 的名字是空的**
  （它要说的正是「对内层那次调用的结果再调一次」）。试过的修法是给「内层是 `Method`」那一支
  加一个 `repairCallCallee`（把内层投影那条调用链**最左边那个空壳**换掉）：**双层
  （`a?.b()()`）上有效、三层上无效**——中间那一层的投影从最深处长出来的是
  `CallExpression{ CallExpression{ Identifier("b") } }`，**最里面已经不是那个空壳了**。
  改成「也认裸 `Identifier`」时真门量下来缺口与漂移**一处没动**，所以整支撤回。
  下一处入手处：`Method.PrintAst` 的「内层那次调用就是第一个子单元」那一支
  （它把内层的投影原样当被调用者，而内层自己那一层已经带了调用括号）。
- **实测**：九道门全绿（墙钟 34.3s）——`cases:tsast` **已知缺口 10 → 6 条还开着、0 条已经收掉**
  （四条登记用例的 `xl:known-gap` 按规矩撤掉、改成 `xl:note`）；
  `cases:astjson` 六项全 0（1594 → **1598** 份、40599 → **40704** 个节点，涨的是那四条用例）；
  `cases:check` 1614 / 1614、`cases:tags` 5326 条断言 0 条不一致、`cases:shapes` 未覆盖 0；
  `coverage 4210 / 4380 → 4214 / 4380`（四格转绿：`blocked 35 → 31`、`differ 135` 一处没动）。
- **可复用的判据**：**每一支折法都要回答两句**——「轮到我了吗」（入口判据）与
  「**我之后还剩什么**」（折完是 `return` 还是接着交）。第 963 轮答的是前一句，
  这一轮答的是后一句，而两句话的落点都在**同一个函数的每一处 `return` 与 `break`** 上：
  本轮收的四格就是三处 `return` / `break` 太早，**同一句话在下标那一支、模板那一支
  与 `chainOnto` 的点号门槛上各缺一次**。
  另外两条：**「摊开」这一步要按形状分**——「调用 + 后缀」那一外壳（第 692 / 962 轮）
  该摊开，而**裸的一次调用**（名字为空 + 头一格是括号 / `Method` / `NotNull`）摊开就把
  外面那次调用弄丢；以及**修法在短一档的形状上有效、在长一档上无效时，
  先量「那一层在不在产物里」**——`a?.b()()()` 要修的是**中间层**，
  而中间层在投影里**根本没有节点**（它只体现为深一层那个 `CallExpression` 的嵌套），
  所以「换掉最左边那个空壳」这一手够不着它。

### 第 967 轮：NCO 尾巴那一格**按形状分**（点号 / 下标 / 以调用开头 ⇒ 交给 `chainOnto`）——真门量下来**一处没动**，如实记录

**一句话**：`projectExpression` 的外层 NCO 那一支折完 NCO 之后，无条件把剩下那一串交给
`foldBinaryFrom`；而它在**找不到运算符**时**原样返回左操作数** ⇒ 后面那些「链的续格」
整段丢。补了一句形状判据（与链那一支同款）：那三种交给 `chainOnto`。

- **实测：九道门全绿，缺口与漂移一处没动**——`cases:tsast` 已知缺口仍是
  **3 条还开着、0 条已经收掉**（16 片全过）；`cases:astjson` 1601 份 / 40775 个节点六项全 0；
  `coverage 4217 / 4380`（blocked 28、differ 135），与第 966 轮**逐项相同**。
  按本仓的规矩这一条**不算收口**，只记「这一支现在与链那一支口径一致」。
- **为什么没动（量到的，写下来省下一轮）**：`gap-r964-opt-assert-member-member`
  （`a?.b!.c.d`）走的**不是这一段**——它的 NCO 内容是
  `[NotNull(b), ., PropertyAccess([c, ., d])]`，第一格是 `NotNull`，
  于是 `chainWithOptional` 里**先命中 `NotNull` 那一支**：`assertedMember` 折出
  `NonNull(a?.b)`，剩下的 `[., PropertyAccess([c,.,d])]` 在那里就交给 `chainOnto` 了，
  本轮的判据在它**下游**，一次都不会响。
  下一处入手处是 `chainOnto` 的 `PropertyAccess` 子链分支：它接第一格时用的 `left`
  是**外面那一条**（`PropertyAccess(NonNull, d)`），而 `.c` 该接在**断言之后那一条链**上。
- **可复用的判据**：**改一处折法之前先量「这一格到底走的是哪一支」**——
  这一轮的判据按形状看是对的、与链那一支也一致，可它落在了**够不着现场**的位置：
  同一形状在 `chainWithOptional` 里已经有一条更早的 `return`。
  量法：给那一段的每一条 `return` 编号打点（本轮量到 `RET#17` / `RET#29`，两条都在上游）。

### 第 966 轮：**「一个 `Method` 单元里只有一对括号、区间却盖着两个 `)`」**——断言那一档的链收掉三格（缺口 6 → 3）

**一句话**：第 964 轮登记的六格里，有三格是**同一句话**：`Method` 比它那个实参括号**更靠右**，
说明这一格里还裹着**外面那一层调用**——而三处折法都只折了内层。
这句话本仓早就有了（第 962 / 963 / 965 轮在别处用过三次），缺的是**断言那一档**：
`assertedMember` 只认名字，而这几格的核是**实参括号 / 下标括号**。

- **收掉的三格**：

  | 用例 | 写法 | 症状 |
  | --- | --- | --- |
  | `gap-r964-nonnull-call-assert-call` | `a!()!()` | 缺两个 `CallExpression`、`NonNullExpression` 只到 `a!`：`callHead` 是 `NotNull(Bracket(()), !)`，`assertedMember` 认不出名字 ⇒ 整格丢 |
  | `gap-r964-opt-index-assert-call` | `a?.['b']!()` | 同形，核是**下标括号**：缺两个 `CallExpression`、`ElementAccessExpression` 只到 `]` |
  | `gap-r964-opt-index-assert-member` | `a?.['b']!.c` | 缺 `ElementAccessExpression` + `StringLiteral`，多一格名字叫 `['b']` 的属性访问（`assertedMember` 把整对下标括号当成了名字） |

- **修法两处**（都只是「把已有的那句判据补到断言那一档」）：
  1. `assertedMember` 里多认一档**核是下标括号**（`Bracket(startBracket="[")`）⇒ 先建
     `ElementAccessExpression`、再把 `!` 套在外面（次序与 TS 一致：`NonNull(ElementAccess(a, 'b'))`）；
  2. 两处折法的 `callHead === "NotNull"` 那一支后面补一句**区间判据**
     （`Method` 比它的实参括号更靠右 ⇒ 外面还有一层）：先把「括号 + `!`」折成 `NonNull`，
     再把外面那次调用套上去。
- **同域还剩三格（本轮如实留着、根因已量到）**：
  - `a!()().c`（`gap-r964-nonnull-call-twice-member`）：第二格是
    `PropertyAccess(Method(name=""[Bracket(())]), ., c)`——**摊开**（第 692 / 962 轮那条规矩）
    把它拆成 `[Method, ., c]`，而那一格 `Method` 的**区间**（盖着两个 `)`）在摊开时就丢了；
    `projectNode(Method)` 只投得出内层那一次调用 ⇒ 外层调用与 `.c` 一起消失。
    下一处入手处：**摊开那一趟要先把「区间盖着两层」的 `Method` 整格交给 `chainOnto`**，
    而不是摊成平级三格。
  - `a?.b!.c.d`（`gap-r964-opt-assert-member-member`）：NCO 内容是
    `[NotNull(b), ., PropertyAccess([c, ., d])]`——**断言挂在子链的受体上**，
    而子链那一支接第一格用的是 `left`（没有断言的那条链）。
  - `a?.b()()()`（`gap-r964-opt-call-triple`）：第 965 轮那条诊断仍然成立——
    中间那一层在投影里**根本没有节点**。
- **实测**：`cases:tsast` 已知缺口 **6 → 3 条还开着、0 条已经收掉**（三条用例的
  `xl:known-gap` 按规矩撤掉、改成 `xl:note`）；`cases:tsast` 语料 16 片全过（墙钟 13.2s）、
  投影后 100.0% 同 kind 同区间同字段名、缺 range 0、区间越界 0。
- **可复用的判据**：**「外面还有一层」这句话要在每一处「投出一个 `Method`」的地方问一遍**——
  第 962 / 963 / 965 轮各补过几处，而漏掉的总是**核不是名字**的那几档
  （`NotNull` 的核是括号、`Bracket` 的核是实参、下标那档的核是 `[`）。
  量法也固定：`endOf(那一格) < endOf(它的括号)`。

### 第 964 轮：那一族的**第五处副本**补齐 + 换一批底样普查——量出 11 格、**10 格登记进语料**

**一句话**：第 963 轮末尾留的那一格（`o?.m()().v`）是那条折法的**第五处副本**，
这一轮补上（五处同形）；顺手按本仓的老办法**换一批底样**再量一遍——
47 条里 11 条对不上，**10 格按规矩登记进语料**（第 11 格真门量下来当场就是对的，
指令撤掉、用例留着当守卫），`cases:tsast` 的缺口清单于是从「空」变成「**10 条还开着**」。
九道门全绿。

- **收掉的那一格**：`o?.m()().v` 的 NCO 里是
  `PropertyAccess([Method name=""[Method name="m"]], ., v)`——**空名字 `Method` 的第一格是内层那次调用**。
  第五处副本（`chainWithOptional` 里「第一格是 `PropertyAccess`」那一支的成员循环）
  原来只按 `name` 折，空名字时投出一个**名字为空**的属性访问
  （实测 `CallExpression` / `PropertyAccessExpression` / `Identifier` 三处漂）。
  补法与另外四处一字不差：`NotNull` ⇒ `assertedMember`；内层是 `Method` ⇒ 第 366 轮那两步走；
  内层是实参括号且**区间更靠右** ⇒ 外面还有一层调用。
- **普查（换一批底样）**：47 条片段（调用 / 可选链 / 非空断言 / 下标 的组合），
  **11 条对不上**，全部落在同一个域的**下一层**——`print-ast-common.xl.md` 的投影层。
  登记进 `tests/cases/token/expressions/gap-r964-*.ts`（文件名即格名，根因写在文件头）：

  | 格 | 症状 |
  | --- | --- |
  | `opt-call-triple`（`a?.b()()()`） | 三层调用只折了两层：漂 3 / 多 2（多出一格名字为空的属性访问） |
  | `opt-index-call-twice`（`a?.[b]()()`） | 第二次调用没接上：`CallExpression` 漂 2 |
  | `opt-index-index-call`（`a?.[b][c]()`） | 第二次下标之后那次调用整格丢：缺 1 |
  | `nonnull-call-twice-member`（`a!()().c`） | 双层调用后面那个成员整段丢：缺 4 |
  | `nonnull-call-assert-call`（`a!()!()`） | 缺 `CallExpression`、`NonNullExpression` 漂 1 |
  | `opt-assert-member-assert-call-twice`（`a?.b!.c!()()`） | 断言成员后面的双层调用整段丢：缺 2 |
  | `opt-assert-member-member`（`a?.b!.c.d`） | 断言之后那条链只接了一格：漂 2 |
  | `opt-index-assert-member`（`a?.['b']!.c`） | 缺 `ElementAccessExpression` / `StringLiteral`、多一格名字是 `['b']` 的属性访问 |
  | `opt-index-assert-call`（`a?.['b']!()`） | 同上：下标 + 断言之后那次调用整格丢 |
  | `opt-member-tagged-call`（`` a?.b`t`() ``） | 模板串当标签之后那次调用没接上：缺 1 |

  **这 10 条都只写了症状，没写根因**——本轮没量到根上，按本仓一惯的规矩「如实登记，不猜」。
  它们全部由这一批探针（`tmp/r962/probe4.json`）量出来，收的时候一条一条来。
- **另有一条按规矩撤掉指令**：`member-chain-call-twice`（`a.b.c()();`）在**片段探针**里报过漂，
  而**真门**（`cases:tsast` 逐文件那一把尺子）量下来**是对上的**。
  两把尺子的对齐口径不同，本仓的规矩是**以门为准**：`xl:known-gap` 撤掉、用例留着当守卫。
  （这也是本轮的一条教训：**探针与门报的不是同一件事**时，先照门记，别拿探针去改指令。）
- **实测**：九道门全绿（墙钟 31.4s）——`cases:tsast` 16/16 片、四方向仍是 0，
  **已知缺口 0 → 10 条还开着、0 条已经收掉**；`cases:astjson` 六项全 0
  （1593 → **1604** 份、40579 → **40789** 个节点，涨的正是新登记的那批用例）；
  `cases:check` **1614 / 1614**（11 条新用例全合格）、`cases:tags` 0 条不一致、
  `cases:shapes` 未覆盖 0（用例 1590 → **1601** 份）；
  `coverage 4209 / 4369 → 4210 / 4380`——**分母涨了 11 条**（新用例）、分子涨 1 条（撤掉指令那一条），
  `blocked` 25 → **35**（+10 就是这一轮登记的缺口，**这是账、不是回归**）、`differ 135` 一处没动、
  加权 95.7% → **95.6%**。
  片段探针：第 962 / 963 两轮那三批（15 + 16 + 8 条）**全绿**，这一批 47 条里 36 条绿。
- **可复用的判据**：**「还有多少副本」这件事要靠换底样量，不能靠读代码数**——
  第 962 轮数出四处、第 963 轮补的是它们的两道门、这一轮又冒出一处第五处副本；
  而**下一层**的缺口（三层调用、双层调用后面接成员、下标连下标再调用）是**同一批底样换长一点**
  就露出来的。所以「一个族收完了没有」的判据不是「探针绿了」，而是
  **「再换一批底样，还有几条对不上」**——这一点与第 907 / 948 / 953 / 955 轮那几次普查同源。

### 第 963 轮：同一族的**入口判据**与**续接**——`Method` 进不了链那一支、下标那一格后面还有兄弟

**一句话**：第 962 轮补的是折法，这一轮补的是**它前面那两道门**：
「这一格是不是以一次调用开头」不认 `Method`（`o!()()` 整格消失），
「`?.[i]` 那一支」把整格 NCO 当成一个下标就返回（`o?.['m']().v` 里那次调用与后缀整段丢）。
两条补完之后 `o!()` / `o?.['m']()` 那一族的 8 条片段探针**全绿**，
`blocked 25` 没动、`differ 137 → 135`，两条台账按规矩撤掉。

- **缺口形状**（两份登记用例量到的就是它们）：
  | 写法 | token 层给的形状 | 原来 |
  | --- | --- | --- |
  | `o!()()` / `o!()(1)` | `[NotNull(o!), Method name=""[Bracket, …]]` | 链那一支的**入口判据**答 `false` ⇒ 循环 `break` ⇒ 整格消失（只剩一个 `NonNullExpression`） |
  | `o?.['m']()` / `o?.['m']().v` | `NCO[Bracket([), Bracket(())]`、`NCO[Bracket([), PropertyAccess([Bracket(()), ., v])]` | 下标那一支把**整格 NCO** 折成一个下标就返回 ⇒ 后面那次调用与后缀整段丢、区间一路盖到 `)` 后面 |
- **根因**：两条都是**「这一格归谁」的判据只覆盖了登记时见过的那几个形状**——
  - `isCallFirstUnit` 的说明里写着「只认 `PropertyAccess` / `NotNull` 外壳」，而
    `o!()()` 的第二格是**`Method` 本身**（名字为空，正是「把左边那个值再调一次」那个意思）。
    它不在名单里 ⇒ 链那一支的入口判据为假 ⇒ 连第 962 轮补好的折法都**够不着**。
  - `chainWithOptional` 的 `?.[i]` 那一支原来 `end: endOf(unit)` 之后**直接 return**——
    它假设 NCO 里只有那一格。可 `?.` 后面紧跟下标、再跟一次调用时，
    token 层把**两件事装在同一格 NCO 里**（下标括号 + 实参括号 / 下标括号 + 调用与后缀）。
- **修法**：两处都**不动折法**，只动门与交接：
  1. `isCallFirstUnit` 的外壳名单加上 `Method`（**裸的 `(` 兄弟仍然不在名单里**，
     那一档归末尾那条 3b，理由一字未改）；
  2. 下标那一支在**后面还有兄弟**时把区间收在 `endOf(那个下标括号)` 上，
     剩下的兄弟交给 `chainOnto`；而那些「以一次调用开头」的单元**先摊开再交**
     （`PropertyAccess([Bracket(()), ., v])` 摊成 `(` / `.` / `v` 三格）——
     不摊开的话 `chainOnto` 的循环在它上面既不是点号也不是括号 ⇒ `break` ⇒ 整段丢。
     摊开这一句与 `projectExpression` 链那一支里那一份**是同一件事**（第 692 轮立的）。
- **实测**：九道门全绿（墙钟 30.5s）——`cases:tsast` 16/16 且**缺口清单照旧是空的**、
  `cases:astjson` 六项全 0（1593 份 / 40579 个节点，**一个节点都没动**）、
  `cases:check` 1603 / 1603、`cases:tags` 5326 条断言 0 条不一致、`cases:shapes` 未覆盖 0；
  `coverage 4207 / 4369 → 4209 / 4369`（`blocked 25` 没动、`differ` **137 → 135**、加权 95.6% → **95.7%**）。
  两条台账撤掉：`exec/round741/002` 与 `runtime/round741/002`（两份 `-differ` 用例
  实测双方**逐字节相同**了：`1 1` 与 `{ v: 2 } 2 / 2 2`）。
  片段探针：`o!()()` 一族 16 条全过、`o?.['m']()` 一族 8 条里 7 条过。
- **没修的那一条如实留在这里**：`o?.m()().v`（NCO 里是
  `PropertyAccess([Method name=""[Method name="m"]], ., v])`）——它是**第 962 轮那份折法的第五处副本**
  （`chainWithOptional` 里「第一格是 `PropertyAccess`」那一支的成员循环），
  那一支的 `Method` 分叉只按 `name` 折，空名字时仍投出名字为空的属性访问。
  它**不在任何登记用例里**，所以如实留在探针里，不收窄任何门槛去迁就它。
- **可复用的判据**：**补完一处判据之后，要顺着它问两句**——
  「**谁决定轮到我**」（入口判据认不认这个形状）与「**我之后还剩什么**」
  （这一支是 `return` 还是继续接）。第 962 轮与这一轮各答了一句：
  上一轮补的是「轮到之后怎么折」，这一轮补的是「能不能轮到」与「折完还有人排队吗」。
  两句都在形状之外，光看那一段折法的代码是看不出来的。

### 第 962 轮：「名字 + 调用」那一折的**四处同形判据**——两处只认了 `NotNull` 一半，另两处连 `Method` 都不认

**一句话**：`o?.m()()` / `o?.m?.()()` / `o!.m!()` / `o?.m()[0]` 四个形状**全在投影层**
（token 树是对的），而它们各撞上「同一个折法写了四份、只有一份是全的」这件事。
补完之后四条片段探针全绿、**三条台账按规矩撤掉**（`blocked` 26 → 25、`differ` 138 → 137），
九道门全绿，`cases:tsast` 的缺口清单**照旧是空的**（token 语料逐节点一字未动）。

- **缺口形状**（第 729 / 741 两轮登记的家族，这一轮量到根上）：
  - **① 被调用者是内层那次调用**（`o?.m()()`）：产物是
    `NCO[Method name=""[Method name="m"]]`——空名字 `Method` 的第一格是**内层 `Method`**。
  - **② 被调用者是 `left`、而这一格盖着两层调用**（`o?.m?.()(1)`）：`Method name=""[Bracket, 1]`——
    那个 `Bracket` 是**内层**那次调用（`?.()`）的实参表，外层那次调用只体现在 `Method` 自己的区间上。
  - **③ 第一格是「名字 + `!`」**（`o!.m!()`）：`PropertyAccess([NotNull(o!), ., Method name=""[NotNull(m!), Bracket]])`。
  - **④ NCO 里的链成员那一格是下标括号**（`o?.m()[0]`）：`PropertyAccess([Method(m), Bracket([0])])`。
- **根因**：`print-ast-common.xl.md` 的「名字 + 调用」这一折**有四处副本**，它们对
  「名字为空」给出的答案**不一样**：
  | 副本 | 空名字那一支 |
  | --- | --- |
  | 普通链那条路（第 366 轮立） | 两步走（内层是 `Method`）——**全的** |
  | `chainWithOptional`（第 852 轮） | 只认 `NotNull` |
  | `chainOnto`（第 852 轮） | 只认 `NotNull` |
  | 链基那条 `ck` 循环 | **一条都没有**（不是点号来的调用直接 `break`，整格消失） |
  于是同一形状在**先跑到的那一处**说了算：名字为空 ⇒ 投出一个
  **名字为空的 `PropertyAccessExpression`** ⇒ 交出方法本身 ⇒ 降级期
  `cannot call a non-closure value`（整份文件断在这里）；④ 则是 `nameOf(Bracket)`
  把 `[0]` 当成**一个名字**（投出名叫 `"[0]"` 的 `Identifier`），而 `chainOnto` 里
  同一格**早就有** `ElementAccessExpression` 那一支。
- **修法**：四处补齐同两支，判据只有一条——**「外面还有没有一层调用」问的是区间**：
  `endOf(那个实参括号) < endOf(这一格 Method)` ⇒ 外面还有一层（内层用那个 Bracket 的实参、
  外层用 `projectNode(Method)` 自己的实参）；再加上「内层是 `Method` ⇒ 第 366 轮那两步走」
  与「下标括号 ⇒ `ElementAccessExpression`」。**这一条判据是问得出来的**，
  所以 `(f)()` / `q = (f)()` / `return (a)(b)` 那三档（`Method` 与它的 Bracket **同尾**、
  只有一层）在同一条门里**一处没坏**。
- **实测**：九道门全绿（墙钟 31.9s）——`cases:tsast` 16/16 且**缺口清单照旧是空的**、
  `cases:astjson` 六项全 0（1593 份 / 40579 个节点，**一个节点都没动**）、
  `cases:check` 1603 / 1603、`cases:tags` 5326 条断言 0 条不一致、`cases:shapes` 未覆盖 0；
  `coverage 4205 / 4369 → 4207 / 4369`（`blocked` 26 → 25、`differ` 138 → 137）。
  三条台账撤掉：`runtime/round741/009`（blocked）、`runtime/round729/001`（differ），
  以及 `exec/expressions/250-object-member-new-bracket`——**最后这一条本轮之前就已经过了**
  （跑 `coverage` 时它落在「台账该更新了」那一栏里），属于顺手清掉的旧账。
  片段探针从 **6 / 15 条对不上 → 2 / 15 条**（剩下两条 `o?.['m']()` / `o!()()` 是
  **token 层**的形状，见下一段）。
- **没修的那两条如实留在这里**（都在**入口判据**上，不在折法上）：
  `o?.['m']()` 的 NCO 里**两个括号装了同一格**（`NCO[Bracket[,], Bracket(]]`），
  `o!()()` 的 `[NotNull, Method name=""[Bracket]]` 压根**进不了链那一支**
  （入口那句 `isCallFirstUnit` 只认 `PropertyAccess` / `NotNull`，不认 `Method`）。
  两条都仍挂在原用例里当守卫。
- **可复用的判据**：**「这一格成形了吗」要沿着「同一个折法的副本」数一遍，而不是沿着形状数**——
  这一轮四个形状看着是四件事（可选链两次调用、非空断言调用、链上取下标），
  其实是**一份折法的四处副本各缺一半**。上一轮（961）的教训是「三处副本漏了一处词表」，
  这一轮是**三处副本各缺几支**：查到一处判据时，先问「这句话还写在哪儿」。
  另外一条：**能用区间问的就不要用形状猜**——「外面还有没有一层调用」落在
  `endOf` 上，于是 `(f)()` 那一档天然被排除，不必为一个猜出来的形状单独加例外。

### 第 961 轮：`typeof !0` 里那个 `!` 被读成了**非空断言**——`IsAssertableOperand` 漏了那条「前缀词不算操作数」的纪律

**一句话**：`typeof void 0` / `typeof !0` **整份文件进不来**（降级期报
`name is not a local or a capture: typeof`）。第 762 轮把根登记成「token 层的重组深度」
（那道 `Depth >= 8` 的硬界），**这一轮量下来推翻了它**：那条纪律早就写在
`IsOperand` 里，只是**非空断言那条同源判据漏抄了同一句**。九道门全绿。

- **缺口形状**（[`runtime/round762/005-typeof-then-prefix`](tests/cases/runtime/round762/005-typeof-then-prefix.ts)，
  第 762 轮的 `-blocked` 后缀这一轮按规矩去掉）：
  `console.log("2", typeof !0);` 里那个 `!` 被读成**非空断言**，
  于是 `typeof` 与被断言者一起收成一个 `NotNull`
  （`<NotNull><Identifier>typeof</Identifier><SymbolToken>!</SymbolToken></NotNull>`）、
  `0` 掉到外面当**独立操作数** ⇒ `projectUnary` 按 `op` 属性找运算符那一格找不到 `typeof`、
  把它当成操作数投出去 ⇒ 降级层那一句、整份文件一个字节都不跑。
  **`typeof -1` 一直是好的**——分界正是「第二个词是**前缀词**（`!` / `void`）还是**符号**（`-` / `+`）」。
- **根因**：`text-common-util.xl.md` 的 `IsAssertableOperand` 里 `Identifier` 那一支
  **只排了语句关键字**（`return` / `throw` / `case` / …），而它**自己的说明里就写着**
  「这条判据有三处要用，三处必须同源：说得不一样就会出现『一处认、另一处不认』的半成品形状」——
  `tokens/unary-operator.xl.md` 的 `IsOperand`（第 167 轮）与 `binary-operator.xl.md`
  那一份**都排掉了** `typeof` / `void` / `delete`，只有这一处漏了。
  于是**同一个词在两条判据上给出相反的答案**：一元那一趟说「`typeof` 不是操作数」、
  非空断言那一趟说「`typeof` 可以被断言」——而后者跑得更早（`NotNullCloseRule` 排在
  `UnaryOperatorCloseRule` **之前**），先把 `!` 抢走了。
- **修法**：给 `IsAssertableOperand` 的 `Identifier` 那一支补上 `typeof` / `void` / `delete`
  三个词。**`new` / `await` 照旧不排**——`new A()!` 是合法的断言（`New` 本来就在
  可断言者那张表里，第 651 轮补的），把它排掉会真的少收一格；理由与那两处一字不差。
- **为什么不是「重组深度」**：这一次一次语料都不用重跑——判据那一层改一句话，
  `cases:tsast` 的 token 语料逐节点仍然一致（`16/16`、缺口清单仍是空的）。
- **实测**：九道门全绿（墙钟 34.1s）——`cases:tsast` 16/16 且**缺口清单仍是空的**、
  `cases:astjson` 六项全 0（1593 份 / 40579 个节点）、`cases:check` 1603 / 1603、
  `cases:tags` 5326 条断言 0 条不一致、`cases:shapes` 未覆盖 0；
  `coverage 4204 / 4369 → 4205 / 4369`（那一格转绿：`blocked 27 → 26`、`differ 138` 没动）。
- **可复用的判据**：**「同一个问题只有一份实现」这句话要连「那一份的**每一处副本**」一起核**——
  同一个判据写在三处、其中一处漏抄一句词表，症状不是「那处坏」而是**两处给出相反答案**，
  而先跑的那一处说了算。下一处这类落点先去找**同源判据的其它副本**，别先怀疑重组深度。

### 第 960 轮：`yield` / `await` 的「第三态」按**有没有操作数**量到底（缺口 1 → 0，**清单第十四次清空**）

**一句话**：第 955 轮登记的最后那一格收掉——`yield` / `await` **两处上下文都不在**时
本该是普通标识符，而产物一律投成 `YieldExpression` / `AwaitKeyword`。
第 955 轮写下的入手处（「给投影一个『在不在生成器 / `async` 里』的上下文」）**只对了一半**：
真正的分界是**「这个词有没有操作数」与「在不在上下文里」两条一起**。九道门全绿。

- **缺口形状**：`const v = yield;` / `function f() { return (yield); }` / `const w = await;` /
  `function g() { return await; }` 四档，TS 全是 `Identifier`，而产物多投一个
  `YieldExpression` / `AwaitKeyword`、又缺一个 `Identifier`（缺 1 多 1）。
  用例 [`gap-r955-yield-await-outside-context`](tests/cases/token/expressions/gap-r955-yield-await-outside-context.ts)。
- **量到底的表**（这一轮按 TS 逐档量出来的，两种写法**各自两态**）：

  | 写法 | TS |
  | --- | --- |
  | 生成器里 `yield 1` / `yield* g()` | `YieldExpression` |
  | **非生成器**的 `function f() { yield g(); }` | `YieldExpression`（TS 照收，运行期才报） |
  | **裸** `yield`（非生成器） | **`Identifier`** |
  | `async` 函数里 `await 1` | `AwaitExpression` |
  | **非 async** 的 `function h() { await g(); }` | `AwaitExpression`（同上） |
  | **裸** `await`（非 async） | **`Identifier`** |
  | **模块顶层** `await 0;`（不在任何函数体里） | `AwaitExpression` |

- **修法两条一起**：①这一格**只有那个词**（`kids.length === 1`，没有操作数、没有 `*`）；
  ②祖先链上没有生成器 / `async`。判据是**新增的 `functionContextOf`**
  （[`print-ast-common.xl.md`](typescript/print-ast-common.xl.md)）：从那一格的 `__token`
  沿 `Parent` 链找**最近的那一层函数体**（`Function` / `MethodDeclaration` / `Lamda`），
  生成器记号是形参表**之前**的一格 `SymbolToken`、`async` 折进 `modifiers`
  （`Lamda` 另有 `IsAsync` 字段；`async` 箭头那一档 `async` 留在 `Data` 里当一个 `Identifier`）。
- **两个半边都实测红过**（记下来，别再各试一半）：
  - **只看 ②**（「不在生成器 / async 里就投标识符」）⇒ `await 0;` 这种**模块顶层 await**
    一起判掉，`expr-dynamic-import-not-type` / `im-dynamic` / `mod-import-dynamic-await` /
    `mod-top-level-await` / `gap-sweep-*-async-01` **五条守卫当场红**（`blocked 28 → 33`）。
    这就是为什么还要**带操作数那一半**：`await 0;` 的 `await` 有操作数，`const w = await;` 没有。
  - **只按 `headKind === "Keyword"` 放行**（忘了再认一次词）⇒ 产物里 **`this` 同样是 `Keyword`**，
    每一格 `this` 都被投成 `Identifier`（整份文件 `ThisKeyword` 全没、降级期报
    `name is not a local or a capture: this`）⇒ `coverage 4201 → 3814`、`blocked 28 → 314`。
- **上下文的问法是祖先链，不是 `ctx` 标志**：`projectExpression` 收到的每一格都带
  `__token`（`WithRangeOf` 记的），`Parent` 链就是产物树——语句 → 体 → 函数，一两跳就到。
  带 `ctx` 标志要改的是每一处进函数体的投影路径（`Function` / `MethodDeclaration` /
  `Lamda` / 对象字面量成员…），漏一处就退化成「在生成器里也不认」，而祖先链上没有可漏的地方。
- **区间收在词自己身上**：不折时这一格是**一个标识符**，TS 的 `Identifier[9,15)` 就是那个词；
  而 `yield` 那一支原来的 `end` 会拉到操作数末尾，所以这一支**自己造 `Identifier`**、不落下去。
- **两条反向守卫**：`expr-yield-await-context.ts`（生成器 / `async` / 裸 `yield` 在生成器里 /
  `async` 箭头 / 类与对象字面量的 `*m()` / 非生成器里**带操作数**的 `yield g()` 与 `await g()`）、
  `mod-top-level-await-context.ts`（模块顶层 `await 0;` 是 `AwaitExpression`）。
- **实测**：九道门全绿（墙钟 30.5s）——`cases:tsast` **16/16** 且**缺口清单空了**
  （第 954 轮之后**第十四次清空**）、`cases:astjson` 六项全 0（1590 → 1593 份 /
  40349 → 40579 个节点）、`cases:check` 1603 / 1603、`cases:tags` 5326 条断言 0 条不一致、
  `cases:shapes` 未覆盖 0；`coverage 4201 / 4367 → 4204 / 4369`
  （那一格转绿 + 两条守卫：`blocked 28 → 27`、`differ 138` 没动）。
- **可复用的判据**：**「同一个词两态」的清单要按「有没有操作数」再核一遍**——
  第 130 / 739 轮为 `await` / `yield` 写的是「这个词在不在这一格」，
  而 TS 那边真正的分界是**「带操作数 ⇒ 一律是表达式」+「裸词 ⇒ 才看上下文」**。
  登记时写下的「给投影一个上下文」只是一半；**下一处这类落点先问「这个词后面跟没跟东西」**。

### 第 959 轮：谓词那个括号落在**带体的类成员返回类型位**时往回走那一趟认错形参表（缺口 2 → 1）

**一句话**：第 958 轮登记的最后那一格收掉——`class C { m(x: unknown): x is (string) { return true; } }`
整条 `m` 塌成一次调用，根因在 `BodyIndex` **往回走找「本签名自己的形参表」那一趟**上；
修法是让它多认一格（谓词里的类型不是形参表），判据**转发**给第 957 轮已经装好的同一份实现。
九道门全绿。

- **缺口形状**：`class C { m(x: unknown): x is (string) { return true; } }` 里 TS 是一条
  `MethodDeclaration`（形参表 + `TypePredicate > ParenthesizedType` + `Block`），产物却把
  `(string)` 当成 `is` 的形参表、把 `{ return true; }` 当成它的体 ⇒ 缺 `MethodDeclaration` /
  `Parameter` / `TypePredicate` / `ParenthesizedType` / `Block`，多 `CallExpression` / `TypeReference`
  （用例 [`gap-r958-class-method-predicate-paren`](tests/cases/token/types/gap-r958-class-method-predicate-paren.ts)）。
  **不带体的那三档一直是好的**（第 958 轮收在 `gap-r956-predicate-paren-type` 里）——差别只在
  「有没有体」：有体时 `ScanDeclarationBody` 一路扫到那个 `{`，于是「名字 + `(` + 体」这个形状成立。
- **根因在第 598 轮那道边界上**：往回走撞上的**第一对 `(`** 是谓词里那对 `(string)`，
  而它前面是 `is`、**不是一个类型续接符**（`IsTypeContinuationBefore` 只认
  `:` / `?:` / `|` / `&` / `=>` / `(` / `,` / `<` 与构造签名的 `new` / `abstract`），
  于是那一趟拿它跟「本签名自己的形参表」比原文。**关键是 `m` 那一趟往回走得多一格**：
  `(x: unknown)` 与它**逐字相同** ⇒ 中途 `break`、跳过 `is` 与 `(string)` 直接答真
  ⇒ 轮到 `is` 那一趟时它看到的正是「名字 + `(` + 体」⇒ 收成 `MethodDeclaration`。
- **修法**：往回走那一趟**多认一格**——「这一对括号是谓词里的类型」时**接着往回找**
  （与类型续接符那一支同一个去处），由**真正的形参表**决定这一条声明有没有体。
  判据**转发**给谓词那条规则的同一份实现（`TypePredicateCloseRule.Claim`，第 957 轮起装在
  `MethodCloseRule.PredicateShape` 上；这一轮把**同一个箭头函数**也装到
  `MethodDeclarationCloseRule.PredicateShape`）——第 875 轮的规矩：**判据只有一份**。
- **那一份判据有副作用**：答真的同时会**当场把括号收成 `ParenthesizedType`**（第 957 轮的设计），
  所以调用点必须**先把括号取在手上再去问**——问完 `units` 里那一格已经不是 `Bracket` 了。
- **「跳过」而不是「收手」是量出来的**：收手那一版把 `interface I { m(x: unknown): x is (string) }`
  这种**无体**签名也一起判否（那一格第 958 轮已经是好的）；跳过之后由后面那句原文比较分两档——
  `m` 那一趟（当前形参表是 `(x: unknown)`）撞上它 ⇒ 答真；`is` 那一趟（当前形参表是 `(string)`）
  撞上它 ⇒ `-1`。**原文比较一个字都没改**。
- **为什么不是第 958 轮撤回的那一版**：那一版把闸门下在 `Previous` **的入口**（问「这一格整体
  是不是一条方法声明」），一次普通调用 `m(x: unknown)` 也在覆盖之内——实测 18 条普通方法声明
  一起判否（片段 2 → 20 条对不上）；限定「这一格是圆括号」之后再试，
  `const h = (x: unknown): x is (A | B) => true;` 又开始塌。这一轮问的是**往回走的那一对括号**，
  只在「已经认定这一格有一个体」之后才轮到它，两族都不在覆盖之内。
- **实测**：九道门全绿（墙钟 34.4s）——`cases:tsast` 16/16 且**已知缺口 2 → 1**
  （只剩第 955 轮登记的 `yield` / `await` 那一条）、`cases:astjson` 六项全 0
  （1589 → 1590 份 / 40250 → 40349 个节点）、`cases:check` 1601 / 1601、
  `cases:tags` 5326 条断言 0 条不一致、`cases:shapes` 未覆盖 0；
  `coverage 4200 / 4367 → 4201 / 4367`（那一格转绿：`blocked 29 → 28`、`differ 138` 没动）。
- **可复用的判据**：**「往回走那一趟」也要认形状**——第 598 轮那条原文比较是**纯文本**的，
  它分不出「这一对 `(` 是返回类型里的类型」与「是本签名的形参表」；而**类型续接符那张表
  只覆盖了运算符引出的类型**，谓词（`is` / `asserts`）引出的类型不在表里。
  下一处这类落点就长在「某一趟只按原文 / 形状对齐、不认**引出类型的那个词**」上。

### 第 956 轮：近路普查第二轮——**成员最后那一格的括号化类型**收掉（缺口 1 → 2：收一族、登记一族）

**一句话**：照第 955 轮那条结论（近路普查比宽面普查便宜）再铺一批「括号落在只认一种身份的槽位里」
的落点，量出两族：**成员最后那一格的括号化类型**当轮收掉、**谓词里的括号化类型**登记成缺口。
九道门全绿。

- **收掉的那一族**：`type T = { a: (B) }` / `interface I { m(): (B) }` / `type T = { get a(): (B) }` /
  `type T = { a?: (B) }` —— 那对圆括号是 `ParenthesizedType`，产物却收成一条无名
  `<Signature kind="call">`（缺 `ParenthesizedType` + `TypeReference`、多 `CallSignature` + `Parameter`）。
  **根因**：`SignatureCloseRule.Previous` 看见「成员位置上的一对 `(`」就按「无名签名的形参表」收，
  而**后面没有别的成员**时 `HasSignatureTail` 答真（有 `;` / `,` / 下一条成员时它答否
  ⇒ 此前只有**最后一条**中：`type T = { m(): (B); n(): void }` 一直是好的）。
- **修法**：多问一句「上一个**实义**单元是不是 `:` / `?:`（成员的类型标注）」——签名语法里
  形参表前面不会有冒号；软换行与注释都跳（`a:` 换行 `(B)` 与 `a: /*c*/ (B)` 同形）。
  **`?:` 在产物里是一格 `SymbolToken`**（`MethodDeclarationCloseRule.IsTypeContinuationBefore`
  就是这么认它的）——只认 `:` 时 `a?: (B)` 照样红，**这一格是补第二遍才量的**（如实记）。
- **读数**（`tmp/r956/snips{1,2,3}.json`，60 + 33 + 20 条）：三批分别 **4 → 2**、**19 → 7**、**9 → 0**，
  收掉的那一族**一条不剩**（剩下的全是登记的那一条）。守卫用例
  [`ty-member-last-paren-type`](tests/cases/token/types/ty-member-last-paren-type.ts)
  （成员类型 / 返回类型 / getter / 可选成员 `?:` / 类字段 / 嵌两层括号 / 联合 / 映射值 / 冒号后换行）。
- **登记的那一条**（`xl:known-gap`，缺口 1 → 2）：
  [`gap-r956-predicate-paren-type`](tests/cases/token/types/gap-r956-predicate-paren-type.ts)
  ——**类型谓词里那个类型套一层圆括号**时整条谓词不成形（`function f(x): x is (string)`：
  缺 `TypePredicate` / `ParenthesizedType` / 类型自己的关键字）。与收掉的那一族**同形不同路**：
  那一族的判据在「成员位置的 `(`」那条分工线上，谓词走的是另一条投影路径
  （`tokens/type-predicate.xl.md` 的 `PrintAst`）；**不带括号的谓词一直是好的**。
  **入手处**：让谓词的类型那一格走**与成员类型同一条**的投影入口，**别在谓词里另写一份括号判据**。
- **实测**：九道门全绿（墙钟 32.1s）——`cases:tsast` 16/16 且**已知缺口 2 条**
  （第 955 / 956 两轮各一条）、`cases:astjson` 六项全 0（1588 份 / 40140 个节点）、
  `cases:check` 1600 / 1600、`cases:tags` 5326 条断言 0 条不一致、`cases:shapes` 未覆盖 0；
  `coverage 4198 / 4364 → 4199 / 4366`（收掉的那条转绿、登记的那条进 `blocked`：28 → 29；
  `differ 138` 没动）。
- **可复用的判据**：**「谁先把这一格认走」是这类缺口的分水岭**——两族都长在
  「一个槽位只认一种身份 / 一条规则先伸手」上。**问「上一格是什么」比问「这一格是什么」便宜**
  （`:` / `?:` 一句话挡住整族），而那句问话用的词表**要抄现成的**
  （`?:` 是一格、不是两格——现成的 `IsTypeContinuationBefore` 里写着）。

### 第 955 轮：清单空着时的第五次普查——**近路普查**量出两族：接口继承的圆括号收掉、`yield` / `await` 的第三态登记（缺口 0 → 1）

**一句话**：照第 954 轮那条结论（**近路会绕开现成判据**）专门铺了一批「单子单元落点」的片段：
**195 条宽面构造一条没量出来，50 条近路片段量出两格**。当轮把 `interface I extends (J)` 那一族收掉，
把「`yield` / `await` 在没有生成器 / async 上下文时是普通标识符」登记成缺口。九道门全绿。

- **收掉的那一族**：`interface I extends (J) {}` 里那对圆括号**是实体名的一部分**
  （TS：`HeritageClause > ExpressionWithTypeArguments > ParenthesizedExpression > Identifier`），
  而产物里**整条声明退回 `ExpressionStatement`**（缺 6 多 2）。**与类那一侧同形**——
  `class C extends (Base) {}` 一直是好的（`HeritageClause.ClauseEnd` 早写着「`(` 不是边界，
  括号属于那个实体名」）。根因在 `InterfaceBranch.ScanHead`：`extends` 名单里实体名那一格
  **只认 `Identifier`**（走 `TakeDottedName`）⇒ 撞上 `(` 就答否 ⇒ 接口头不成立。
- **修法**：那一格是 `(` 括号时**跨过它**，**名字文本不收**（与类那条路逐字一致：
  `class C extends (a.b) {}` 的 `extends=""`）——括号里是什么由
  `ExpressionWithTypeArguments.PrintAst` 自己投（它早就有括号那一支）。
- **读数**（`tmp/r955/snips{2,3,4}.json`）：这一族**收前 8 条对不上、收后 0 条**，
  另一个探针 15 条（夹注释 / 换行 / `export` / `declare` / 命名空间里 / 模块里 / 嵌两层括号 /
  点号名 / 泛型实参 / 与普通名混排）也 0 条。守卫用例
  [`decl-interface-extends-parenthesized`](tests/cases/token/declarations/decl-interface-extends-parenthesized.ts)。
- **登记的那一条**（`xl:known-gap`，缺口 0 → 1）：
  [`gap-r955-yield-await-outside-context`](tests/cases/token/expressions/gap-r955-yield-await-outside-context.ts)
  ——`yield` / `await` 在**生成器 / async 之外**是普通标识符（`const v = yield;` 在脚本语境里 TS 给
  `Identifier`），产物一律投成 `YieldExpression` / `AwaitKeyword`（缺 1 多 1）。**与括号无关**、
  **名字位是好的**（`const await = 1;` / `{ yield: 1 }` 逐节点一致）——坏的全在表达式位。
  缺的是**第三态**：第 130 / 739 轮的判据问「这一格是不是那个词」，要问的是「**我在不在那个上下文里**」。
  **入手处**：给投影与 token 层一个「当前函数是不是生成器 / async」的上下文，**别写第二个近似判据**。
- **实测**：九道门全绿（墙钟 32.7s）——`cases:tsast` 16/16 且**已知缺口 1 条**（第 955 轮登记的那一条）、
  `cases:astjson` 六项全 0（1587 份 / 40014 个节点）、`cases:check` 1598 / 1598、
  `cases:tags` 5323 条断言 0 条不一致、`cases:shapes` 未覆盖 0；
  `coverage 4197 / 4362 → 4198 / 4364`（收掉的那条转绿、登记的那条进 `blocked`：27 → 28；
  `differ 138` 没动）。
- **可复用的判据**：**「近路普查」比「宽面普查」便宜**——再铺一遍构造面（195 条）不如照着
  已知的近路形状（`kids.length === 1`、「实体名那一格只认 Identifier」、「括号在别处早就是实体名
  的一部分」）**逐个落点问一遍**。第 954 轮量到的是「单子单元直接投」，这一轮量到的是
  「单子单元**只认一种身份**」——同一条结论的两种长相。

### 第 954 轮：第 953 轮登记的那一格收掉——**计算属性名里那对圆括号**（缺口 1 → 0，清单第十三次清空）

**一句话**：第 953 轮登记的那一格按它自己写下的入手处收掉——根因**不在括号判据里**，在
`computedNameExpression` 给**单个子单元**开的那句近路上：单格直接 `projectNode`，
于是「值位括号 → `ParenthesizedExpression`」那条现成判据（`projectExpression` 的 `parenthesizedOf`）
一次都没被问到。九道门全绿。

- **根因**：`print-ast-common` 的 `computedNameExpression` 原来是
  `if (kids.length === 1) return projectNode(kids[0], ctx);`。计算名 `[(x in y)]` 的产物里
  **只有一个** `Bracket` ⇒ 走那句近路 ⇒ 投出一格裸 `Bracket`（未映射）⇒ 缺
  `ParenthesizedExpression` 1、多 `Bracket` 1。**同一形状在别的落点一直是好的**
  （`const v = (x in y);` / `f((x in y));` 逐节点一致），因为那里走的是 `projectExpression`。
- **修法**：那句近路删掉，单子单元也**交给 `projectExpression` 问一次**——
  **判据一条没新写**。单个非括号单元仍落到 `projectExpression` 末尾那句
  `return projectNode(kids[0], ctx)`，逐格同一结果（这也是「不许新写判据」的落法：
  要问的那条判据长在谁身上，就把这一格交给谁）。
- **读数**（片段探针 `tmp/r954/snips.json`，**25 条形状**）：**0 条对不上**——对象字面量 /
  类字段 / 类静态字段 / 类方法 / getter / 嵌两层括号，以及括号里是箭头 · 函数表达式 · `new` ·
  三元 · 逗号 · 赋值 · 模板串 · `as` 表达式 · 属性访问 · `in` 比较，一次全过
  （**这一族一轮收完**，没有留下第二格）。
- **守卫用例**：[`gap-r953-computed-paren-name`](tests/cases/token/expressions/gap-r953-computed-paren-name.ts)
  （`xl:known-gap` 按规矩撤掉、用例留着当守卫；这一轮另加了类字段 / 类方法 / 嵌两层三条排版，
  `xl:expect ObjectLiteral:3,ArrayLiteral:5,Bracket:7,BinaryOperator:6` +
  `xl:absent TypeParameter`）。
- **实测**：九道门全绿（墙钟 30.7s）——`cases:tsast` 16/16、**已知缺口清单空了**（第 954 轮清空，
  投影 39551 / 39551 逐节点同 kind 同区间、字段名不一致 0）、`cases:astjson` 六项全 0
  （1586 份 / 39957 个节点）、`cases:check` 1596 / 1596、`cases:tags` 5318 条断言 0 条不一致、
  `cases:shapes` 未覆盖 0；`coverage 4196 / 4362 → 4197 / 4362`（`blocked 28 → 27`、`differ 138` 没动）。
- **可复用的判据**：**「近路」会把这一层现成的判据整条绕过去**。量到「同一形状在别的落点是好的」时，
  先看那个好落点走的是哪一条函数，再看目标落点是不是在它**前面**就抄近路走掉了——
  这一族的根不在括号判据、不在成员名判据，而在那一句 `kids.length === 1` 上。

### 第 953 轮：缺口清单空着时的第四次普查——**三批 678 条片段**，量出两格：当轮收掉一格、登记一格

**一句话**：手法照第 907 / 946 / 947 / 948 轮（清单空着就换一批构造再量一遍）。这一轮换了**三批**：
①「换地形」55 条——把同一形状 `{ [K in T]: X }` 放进 **27 个值位落点 + 28 个类型位落点**；
②「每个相邻位置插 trivia」**592 条**（16 个底样 × 每个 token 边界 × `/*c*/` / 换行）；
③「成员位」**31 条**（对象 / 类的计算属性名、方法名、getter / setter / 生成器、索引签名、标签块…）。
前两批 **0 条对不上**，第三批量出**两格**。

- **收掉的那一格**（`lbl: { const o = { [K in T]: X }; }`）：里层 `{` 的父亲是**标签块那个 `{`**，
  而它在 `BraceInExpression` 眼里是「表达式里的 `{`」（前面是标签冒号，一个符号）⇒ 位置链爬了进去，
  撞上的却是**标签冒号** ⇒ 答「类型位」⇒ 值位那个 `in` 被当成映射键。**标签是语句**，块里没有
  「这一层处在类型位还是值位」这回事 ⇒ 链到它就断（判据用第 930 轮收成一份的 `IsLabelColon`）。
- **第一版停宽了、当场量回来**（如实记）：只看 `IsLabelColon` 不够——`{ a: { b: { [K in T]: X } } }`
  里 `a:` 也是「名字 + 冒号」的形状，`IsLabelColon` 对它照样答真 ⇒ 链在**成员位**就断了，
  第 952 轮刚收的 `value-nested-2` 当场又红。**加一句「父亲那一格不在花括号里」才分开两者**：
  成员分隔冒号住在花括号的 `Data` 里，标签冒号住在语句列表里。
- **登记的那一格**：[`gap-r953-computed-paren-name`](tests/cases/token/expressions/gap-r953-computed-paren-name.ts)
  ——计算属性名里**套一层圆括号**时括号不成形（`const o = { [(x in y)]: 1 };`：TS 是
  `ComputedPropertyName > ParenthesizedExpression > BinaryExpression`，产物里那对圆括号是**一格裸 `Bracket`**，
  缺 1 多 1，**未映射 `Bracket`**）。与 `in` 无关（`{ [(a + b)]: 1 }` / `{ [(f(x))]: 1 }` 同形）；
  **同一形状在别的落点是好的**（`const v = (x in y);` / `f((x in y));` 逐节点一致）——
  投影那边有现成的「值位括号 → `ParenthesizedExpression`」判据，认不出**计算属性名那一格**。
- **守卫用例**：[`expr-object-computed-in-label-block`](tests/cases/token/expressions/expr-object-computed-in-label-block.ts)
  （`xl:absent TypeParameter`——收掉的那个错形状回来就红）。
- **实测**：九道门全绿（墙钟 31.2s）——`cases:tsast` 16/16 且**已知缺口 1 条**（第 953 轮登记的那一格）、
  `cases:astjson` 六项全 0（1585 份 / 39872 个节点）、`cases:check` 1596 / 1596、
  `cases:tags` 5313 条断言 0 条不一致、`cases:shapes` 未覆盖 0；
  `coverage 4195 / 4360 → 4196 / 4362`（收掉的那条转绿、登记的那条进 `blocked`：27 → 28；`differ 138` 没动）。
- **可复用的判据**：**量「同一个形状换落点」比量「同一个落点换形状」便宜**——第①批 55 条把一个形状
  放进 55 个落点，一条新缺口都没有，说明那一族（花括号位置）已经被第 951 / 952 两轮量干净了；
  真缺口在**第③批**（成员位）——那是**另一条投影路径**。而**收掉的那一格是先停宽了再收窄的**：
  「名字 + 冒号」这个形状在成员位与语句位**词法同形**，判据必须再问一句「它在谁的表里」。

### 第 952 轮：位置要问「**外面那一层**」——值位对象字面量里嵌一层的那一族收掉（第 951 轮如实记下的那条）

**一句话**：第 951 轮修的是**顶层**那一格（`const v = { [K in T]: X }`），同一族里**嵌在另一对花括号里**
的那一格（`const o = { a: { [K in T]: X } }`）当时如实记成「留在门外」；这一轮把那一族一次收掉——
判据沿「**直接嵌着的表达式花括号**」链往上爬到最外面那一格再问位置。九道门全绿。

- **根因**：里层那个 `{` 往回扫撞上的是**属性那个 `:`**，`IsTypePosition` 在它自己那一层只会答
  「类型位」；真正分开类型与值的是**外面那一层**（`const o = {` 还是 `type Q = {`）。
- **修法**（`type-literal.xl.md` 的 `IsMappedKey`）：位置那一问不落在容器自己身上，而是落在
  「它直接嵌在里面的那个花括号」上，链上再套一层就再往上爬一格，**两处停**——
  ① 父亲不是花括号（`(` / `:` 那里类型重新进场：`const o = { a: (x: { [K in T]: X }) => 1 }` 因此
  爬不出去，归它自己那一格问，答「类型位」）；② 父亲不是「**表达式里的** `{`」（`BraceInExpression`）。
- **第②道闸是第一次爬过头量出来的**（如实记）：只写第①条时，`cases:tsast` 当场 **13 / 16 片**——
  `@types/node` 三片各报「多出来」的 `InKeyword` / `KeyOfKeyword` / `PropertyAccessExpression`，
  原形是 `declare module "os" { type SignalConstants = { [key in NodeJS.Signals]: number } }`：
  里层 `{` 的父亲是**模块体**，位置判据对它答「值位」（它前面是模块名那个字符串）⇒ 顺着爬上去把真映射
  类型判掉了。**声明体的 `{` 不是「里面还有一层位置」的花括号**，链到它就断。
- **读数**（片段探针，两批共 **26 条**：`tmp/r951/snips.json` 11 条 + `tmp/r952/snips2.json` 15 条）：
  两批全过 0 条对不上——含嵌一层 / 嵌两层 / 值位里嵌参数标注 `(x: { [K in T]: X }) => 1` /
  映射里再套映射 / 方法返回类型 / 接口成员 / 联合类型里的映射值。
- **守卫用例**：[`expr-object-computed-in-nested-family`](tests/cases/token/expressions/expr-object-computed-in-nested-family.ts)
  （嵌一层 + 嵌两层，值与类型各两条；`xl:expect` 把「2 个 `BinaryOperator` + 2 个 `TypeParameter`」
  这条分界钉住——它们就是同一形状在两种位置上的两种产物）。
- **实测**：九道门全绿（墙钟 33.9s）——`cases:tsast` 16/16 且已知缺口清单仍是空的、
  `cases:astjson` 六项全 0（1584 份 / 39840 个节点）、`cases:check` 1594 / 1594、
  `cases:tags` 5307 条断言 0 条不一致、`cases:shapes` 未覆盖 0；
  `coverage 4194 / 4359 → 4195 / 4360`（`blocked 27` / `differ 138` 一处没动）。
- **可复用的判据**：**「往上问一层」的链要在「类型重新进场」和「不是在表达式里」两处停**。
  前者是语义边界（`(` / `:` 之后是新的一段），后者是这一轮量出来的**实测边界**——
  声明体（模块 / 类 / 接口 / 命名空间的体）根本没有「里面这一层处在类型位还是值位」这回事，
  链爬进去只会把一个不相干的字符串当成信号。

### 第 951 轮：把**位置判据**接到折叠那一刻——值位计算属性名里的 `in` 收掉（缺口 1 → 0，清单再次清空）

**一句话**：第 949 轮登记的那一条（`const v = { [K in T]: X };` 里 `K in T` 被当成映射键、收成
`TypeParameter`）按那一轮自己写下的入手处收掉：**同一份位置判据**（`TypeLiteralCloseRule.IsTypePosition`）
接在折叠那一刻问一次。九道门全绿，已知缺口 1 → 0。

- **两问都不缺，缺的是把两问接在同一刻**：形状那一问一直在（`IsMappedKeyBracket`：括号里有 `in` +
  容器是那个 `{` 或升格后的 `TypeLiteral`），位置那一问也一直在（`TypeLiteralCloseRule.Previous`
  正是用它决定「这个 `{` 是类型字面量还是对象字面量」）——可**折叠发生在键括号关掉那一刻**，
  比括号自己的判决**早一步**，那一刻只有前者被问了，于是值位也被放行。
- **这一轮做的**：`type-literal.xl.md` 新增 `TypeLiteralCloseRule.IsMappedKey(unit)`——形状仍问
  `IsMappedKeyBracket`（那一条一个字节没动），位置则由**容器还是没关闭的那个 `{` 括号**去问
  `IsTypePosition(container.Parent.Data, indexOf(container))`；`type-parameter.xl.md` 的
  `OwnerOf` / `Process` 与 `as.xl.md` 的 `Previous` 三处改问它（`IsTypeContainerUnit` 那一处问的是
  「容器里的内容是不是类型」，与本轮无关，照旧问 `IsMappedKeyBracket`）。
- **位置那一问没有挪到 `text-common-util`**（第 949 轮写的两个选项之一是「挪下去共用」）：
  `IsTypePosition` 自己要用 `Statement.IsLineBreakBoundary`，挪下去会绕出环 —— 所以把
  **合起来的那一问**留在 `type-literal.xl.md`（判据的家里），由 token 层 import 它。
- **为什么 `Bracket.Context` 顶不上**（第 949 轮试过、退回）：它回答的是**另一个时刻**
  （开括号那一刻，前文还是平列表、`<T>` 那种还没升格成 `GenericType` 的形状它认不出来），
  于是 `type M<T> = { … }` 与 `Promise<{ … }>` 上答 `"value"`。**插桩实测**（`tmp/r951/probe2.mjs`）：
  折叠那一刻外层 `{` 还没关闭，但它**已经在宿主自己的平列表里**（`BracketBranch.Success` 的
  `AddToMounted` 挂的），`host.Data.indexOf(container)` 就是它那一格 ⇒ 同一刻问 `IsTypePosition`，
  上面两种排版连同那六条真映射类型**全部答「类型位」**。
- **读数**（片段探针 `tmp/r951/snips.json`，11 条形状）：登记那条从 **缺 11 漂 0 多 4** 变成四方向全 0；
  第 949 轮撤回时坏掉的六条（`ty-mapped` / `ty-mapped-as-remap` / `gap-r869-mapped-modifiers-comment-1` /
  `gap-r922-mapped-modifier-space-before-colon` / `type-mapped-modifier-in-generic` /
  `type-combination-adversarial`）**一条没坏**；10 / 11 条通过。
- **收了的那条用例**：[`gap-r949-object-computed-in-name`](tests/cases/token/expressions/gap-r949-object-computed-in-name.ts)
  按规矩撤掉 `xl:known-gap`、补上 `xl:expect ObjectLiteral:2,ArrayLiteral:2,BinaryOperator:1,As:1`
  与 `xl:absent TypeParameter`（后者是这一格的守卫：错的那个形状回来就红）。
- **一条留在门外、本轮不登记**（**改之前就存在**的差，与本轮这一格无关，如实记）：
  `const o = { a: { [K in T]: X } }`（**值位对象字面量里再嵌一层**）仍会把里层那个 `in` 当映射键
  ——那一刻外层 `{` 还是括号（不是 `ObjectLiteral`），`IsTypePosition` 撞上的是里层属性那个 `:`，
  于是答「类型位」；片段探针里它是唯一一条红的（缺 2 多 2，与本轮修的那条**同一形状、只差嵌套**）。
- **实测**：九道门全绿（墙钟 33.0s）——`cases:tsast` 16/16 且**已知缺口清单空了**、
  `cases:astjson` 六项全 0（1583 份 / 39759 个节点）、`cases:check` 1593 / 1593、
  `cases:tags` 5301 条断言 0 条不一致、`cases:shapes` 未覆盖 0；
  `coverage 4193 / 4359 → 4194 / 4359`（`blocked 28 → 27`、`differ 138` 一处没动）。
- **可复用的判据**：**判据要问在「两边的答案都已经存在」的那一刻**。同一个问题被两处各答一遍时，
  先别急着合并，先问「**哪一处答得准、它为什么准**」——这一轮那两处**都不缺**，
  缺的是「折叠那一刻没人问位置」；而 `Context` 之所以顶不上，不是它不准，是它**答在另一个时刻**。

### 第 950 轮：第 949 轮登记的第二条按**窄判据**收掉——`new (a: number): I` 是一条成员签名（缺口 2 → 1）

**一句话**：第 949 轮把「整档放开 `ObjectLiteral`」那一版撤回时写下的入手处是「要的是**窄判据**」，
这一轮照它做：`IsMemberSignature` 里 `ObjectLiteral` 那一档只认**一条缝**，两条都成立才算成员签名
——①**形参表之后紧跟 `:`**（真的写了返回类型）；②这一格在**成员位**（父单元里它前面那个实义单元
是开头 / `;` / `,`）。九道门全绿，缺口 2 → 1。

- **为什么这两条够用**：第 949 轮那版挂掉的原因是「对象字面量里任何 `name(...)` 形状都成了成员签名」
  （`coverage 4192 → 4155`、`blocked 27 → 56`、e2e 六条挂）。而这一格要修的**语法事实**只有两条：
  TS 那边 `{ new (a: number): I }` 是 `MethodDeclaration`（名字 + 形参表 + **返回类型**），
  而 `{ a: b(c) }` 的 `b` 前面是**属性冒号**、`{ f(x) }` **根本没写返回类型**——两条各自把一类挡在门外。
  类 / 接口 / 类型字面量那三档**不加**这两条：那里本来就是成员位置，判据没有歧义。
- **读数**（片段探针 `tmp/r948/snips4.json`，10 条形状）：`{ new (a: number): I }`、
  `{ a: 1, new (x): I }`、`{ f(x): T }`、`{ m(a: number): void, n(b: string): void }` 四条**新通过**；
  `{ a: b(c) }` / `{ a: new C(1) }` / `{ new (a) { … } }` 一字不动。
- **两条留在门外、本轮不登记**（**改之前就存在**的差，与这一格无关，如实记）：
  `{ f(x) }`（TS 是一条没有返回类型的成员签名，产物是 `ShorthandPropertyAssignment` + `CallExpression`）
  与类体里的 `class K { new (a: number): I }`（TS 是 `ConstructSignature`，产物是 `MethodDeclaration`）。
- **收了的那条用例**：[`gap-r949-object-member-new-signature`](tests/cases/token/expressions/gap-r949-object-member-new-signature.ts)
  按规矩撤掉 `xl:known-gap`、补上 `xl:expect` / `xl:absent`，用例留着当守卫。
- **实测**：九道门全绿（墙钟 31.5s）——`cases:tsast` 16/16 且**已知缺口 1 条**（只剩第 949 轮登记的第一条）、
  `cases:astjson` 六项全 0（1582 份 / 39685 个节点）、`cases:check` 1593 / 1593、`cases:tags` 0 条不一致、
  `cases:shapes` 未覆盖 0；`coverage 4192 / 4359 → 4193 / 4359`（`blocked 29 → 28`、`differ 138` 一处没动）。
- **可复用的判据**：**「整档放开会被门挡回来」时，答案不是「换个地方再放开一次」，而是
  「把那一档收窄到能说清的一格」**。窄判据要写成**语法事实**（紧跟 `:` 返回类型、处在成员位），
  不是写成「名字叫什么」——这一轮那两条对 `new` 这个名字一个字都没提，`{ f(x): T }` 因此**一起**转正。

### 第 949 轮：第 948 轮登记的那一族量到根上——**两版修法都被门挡回来、按规矩撤回**，两条形状登进语料（缺口 0 → 2）

**一句话**：接着上一轮那句「下一轮从表达式位的对象字面量成员下手」，这一轮把那一族拆成两格、
两格的根因都量清了，**两版修法都写出来过、片段探针都当场 0 条对不上，也都被 `coverage` 挡回来**——
于是按本仓的规矩撤回、把形状登进语料（`xl:known-gap`），缺口 0 → 2。

| 形状 | 根因 | 试过的那一版 | 读数 | 为什么撤回 |
| --- | --- | --- | --- | --- |
| `const v = { [K in T]: X };` | `IsMappedKeyBracket` 那条「父单元是一个 `{` 括号、且本单元是它第一个实义单元」把**值位**也放行 ⇒ 值位那个 `in` 被当成映射键的标记、`K in T` 整段收成 `TypeParameter`（TS：`ComputedPropertyName > BinaryExpression{InKeyword}`） | 拿 `Bracket.Context`（**开括号那一刻**算好的位置）当判据，只在它是 `"value"` 时判否 | 片段探针 **4 条 → 0 条**；`coverage` **4192 → 4184**、`blocked 27 → 36`——六条**真**映射类型反过来坏（`ty-mapped` / `ty-mapped-as-remap` / `gap-r869-mapped-modifiers-comment-1` / `gap-r922-mapped-modifier-space-before-colon` / `type-mapped-modifier-in-generic` / `type-combination-adversarial`） | 多行 / 带修饰词 / 泛型实参里那几种排版，`Context` 答的是 `"value"`（第 163 轮那条注释早就记过按它筛吃过亏）——**判据不成立** |
| `const v = { new (a: number): I };` | `MethodDeclarationCloseRule` 的无体成员白名单里没有 `ObjectLiteral`（只有 `ClassBody` / `InterfaceBody` / `TypeLiteralBody`）⇒ 这一格落到 `NewCloseRule` 手里（`new (a: number)` 新表达式 + 尾巴收成属性赋值） | 把 `ObjectLiteral` 加进那份白名单 | 片段探针 **2 条 → 0 条**；`coverage 4192 → 4155`、`blocked 27 → 56`、`differ 138 → 147`、e2e 六条挂（`unimplemented: expression MethodDeclaration`） | 放开的范围比要修的那一格大得多（对象字面量里任何 `name(...)` 形状都成了成员签名）——**要的是窄判据** |

- **登记两条常驻用例**（`xl:known-gap`）：
  [`gap-r949-object-computed-in-name`](tests/cases/token/expressions/gap-r949-object-computed-in-name.ts)（缺 11 多 4）、
  [`gap-r949-object-member-new-signature`](tests/cases/token/expressions/gap-r949-object-member-new-signature.ts)（缺 3 多 3）。
- **下一轮的入手处**：第一条要的是**与 `TypeLiteralCloseRule.IsTypePosition` 同一份**位置判据
  （或者把那一份挪进 `text-common-util` 让两边共用）——**不是第三份近似**；
  第二条要的是**窄判据**（只认「名字是 `new`、而且它在成员位（前一个是 `{` / `,` / `;`）」那一格）。
  插桩还量出一条现成的读数：`NewCloseRule.Previous` 里「父单元是 `ObjectLiteral`」那时**已经看得到**
  ——撤回的那一版挂错了地方（挂在成员体白名单上，而不是挂在那个位置信号上）。
- **实测**：九道门全绿（墙钟 32.7s）——`cases:tsast` 16/16 且**已知缺口 2 条**、
  `cases:astjson` 六项全 0（1581 份 / 39642 个节点）、`cases:check` 1593 / 1593、
  `cases:tags` 0 条不一致、`cases:shapes` 未覆盖 0；
  `coverage 4192 / 4357 → 4192 / 4359`（两条进 `blocked`：`27 → 29`；`differ 138` 一处没动）。
- **可复用的判据**：**「片段探针 0 条」不等于「这一版成立」**。这一轮两版都在片段探针上满分，
  而两版都在真语料上被挡回来——探针量的是**那几条片段**，门量的是**全语料**；
  所以「改完先跑门」在这里不是流程礼节，它是**唯一**能把这一版判死的证据。
  按本仓规矩，判据不成立的那一版**不留**：留下的只有读数与登记。

### 第 948 轮：缺口清单空着时的第三次普查——**类型位**那一侧 1202 条，量出三族、当轮收掉

**一句话**：手法照第 907 / 946 / 947 轮（缺口清单空着就换一批构造再量一遍），这一批换到
**类型位**那一侧：40 个类型底样 × 每个**词的边界** × 三种 trivia = **1202 条 TS 合法片段**
（`tmp/r948/sweep.mjs`，判据仍是真的门那一条 `compareSource` 的四方向）。
读数 **9 条对不上 → 4 条**，其中 5 条是三族真缺口、**当轮收掉**；剩下 4 条是**同一族**
（表达式位的对象字面量成员），登记成下一轮的入口。

| 族 | 片段 | 症状 |
| --- | --- | --- |
| **映射类型的值那一格** | `type T = { [K in T]: //c` 换行 ` X };` | 缺 `TypeReference` 1、多 `PropertyDeclaration` 1 |
| **带符号的数字字面量类型** | `type T = -/*c*/1;` | 缺 `LiteralType` / `PrefixUnaryExpression` / `NumericLiteral` 各 1、多 `MinusToken` 1 |
| **推断类型的尾随注释** | `type T<U> = U extends infer V extends string //c` 换行 ` ? V : never;` | `InferType` 漂 1 多 1（区间跨过那条注释） |

- **映射类型那一格**（`field.xl.md`）：`SkipPreviousTrivia` 跳回的是**冒号自己**，
  而 `HasLineBreakBetween` 在 `:` 与 `X` 之间量得到那个换行（注释把 `:` 与 `X` 夹开）
  ⇒ 判成「值类型之后的成员」⇒ `X` 被收成一条**没有类型的 `Field`**。
  TS 的 `parseMappedType` 里 `:` 之后那一段**只可能是值类型**，成员一律在它**收完之后**
  ⇒ 成员判据补一条：上一格是 `:` / `?:` / `?` 时这一格不是成员名。
  **它与第 934 轮那条「得有换行或 `;`」不是二选一**：那条管「值类型收完之后」，
  这条管「值类型自己那一格」——缺哪一条都会把值类型那一格吞掉。
- **带符号数字那一格**（`literal-type.xl.md`）：`IsSignedNumberStart` 只跳**软换行**
  （`SkipNextWrapSymbol`），夹一条注释就判否 ⇒ `-` 留在外面当 `SymbolToken`。
  改成 `SkipNextTrivia`（「下一个实义单元」的统一口径）；**中间那条注释跟着搬进新节点**——
  `ReplaceCountAt` 是整段替换，只把 `-` 与数字加进来就把注释从树上抹掉了
  （它在 XML / AST JSON 两个出口里是**真实存在的文本**），而软换行照旧不进
  （它是透明单元，与原来一字不差）。子单元顺序就是源码顺序：`-`、注释、数字。
- **推断类型那一格**（`infer-type.xl.md`）：约束段的扫描把 `//c` 当成约束的一格
  ⇒ `SignOut` 取到注释末尾（实测 `TS[19,36) vs 产物[19,39)`）。改成 trivia
  **既不进约束段、也不进区间**：夹在实义单元**中间**的 trivia 跟着约束段走
  （它们在区间里面，不加会被整段替换抹掉），**末尾**那一段留在节点外面；
  「约束段后面是不是 `?`」那一问同时改成跨 trivia 的口径。
- **留下的一族**（登记成第 949 轮的入口，**不进 `xl:known-gap`**——语料里没有这个形状）：
  **表达式位的对象字面量成员**。它由 `type` 换行那一格露出来，可**与 `type` 无关**——
  单独喂 `const v = { [K in T]: X };` 一样对不上：TS 那边 `[K in T]` 是
  `ComputedPropertyName > BinaryExpression{ InKeyword }`，产物读成 `TypeParameter`（缺 2 多 2）；
  `{ new (a: number): I }` 在 TS 那边是一条 `MethodDeclaration`（名字 `new`），
  产物读成 `PropertyAssignment > NewExpression`（缺 3 多 3）。
- **实测**：九道门全绿（墙钟 31.4s）——`cases:tsast` 16/16 且缺口 0 条、`cases:astjson`
  六项全 0（1581 份 / 39642 个节点）、`cases:check` 1591 / 1591、`cases:tags` 5296 条断言
  0 条不一致、`cases:shapes` 未覆盖 0；`coverage 4189 / 4354 → 4192 / 4357`
  （token 1575 → 1578 条全过；`differ 138` / `blocked 27` / `bad 0` 一处没动，加权 95.5%）；
  发布路径那一趟（`cases:tsast:cli`，1986 个文件真开进程）**完全一致 1986 / 1986**。
- **新增三条常驻用例**：
  [`type-mapped-value-comment-newline`](tests/cases/token/types/type-mapped-value-comment-newline.ts)、
  [`type-literal-signed-comment`](tests/cases/token/types/type-literal-signed-comment.ts)、
  [`type-infer-extends-comment-tail`](tests/cases/token/types/type-infer-extends-comment-tail.ts)。
- **可复用的判据**：**「同一格被两条判据管着」时，先问它们管的是不是同一件事**。
  第 934 轮那条「值类型之后才是成员」用的是**位置近似**（上一格与这一格之间有换行），
  它在「值类型自己那一格也被换行隔开」时答错了；补的那一条问的是**语法事实**
  （上一格是不是那个冒号）——两条并排之后，近似那一条的适用范围才被钉死。

### 第 935 轮（二）：`Symbol.prototype` 自己那一张名表——**四格缺三格**（17 / 19 档转绿，两格留下）

**一句话**：接着上一段的普查面往下走，取第 783 轮登记的 `differ`
`stdlib/round783/002`——**`Object.getOwnPropertyNames(Symbol.prototype)` 本仓给空表**，
而 JS 给 `constructor,description,toString,valueOf` 四格。一个根、四个出口。

- **根因一句话**：`protos.Symbol` 是第 754 轮为了**一个标签**造出来的
  （`Object.prototype.toString.call(Symbol.prototype)` 要给 `"[object Symbol]"`），
  造完**一个成员都没挂**——于是四个出口一起错：
  ① 自有名表空、② `hasOwnProperty` 四问全假、③ `Symbol.prototype[Symbol.toStringTag]`
  是 `undefined`、④ `description in Symbol.prototype` 是假。
- **修法**（一处，与 `Object.prototype` / `Error.prototype` 那几族逐字相同的写法）：
  在知名符号表建好之后补上 `constructor`（指回 `Symbol` 那个对象自己）、
  `toString`（宿主引用，走 `ObjectProtoMethod`）、
  `description`（**访问器**，getter 就是 `SymbolDescription` 那个号——
  与 `s.description` 的值特判**同一个号**，两处答案必须一字不差）、
  以及 `Symbol.prototype[Symbol.toStringTag] = "Symbol"`。
  **`valueOf` 一格删除**（理由见下）。
- **转绿的四格**：自有名表（`constructor` / `toString` / `description`）、
  `toString` 是自有、三者 `hasOwnProperty`、
  `Symbol.prototype[Symbol.toStringTag] === "Symbol"`、
  `Symbol.prototype.toString.call(sym)` 给 `Symbol(q)`、
  **`Symbol.prototype.toString.call(5)` 抛 `TypeError`**（同一条判据同时管住值特判与原型方法）。
- **一处「试了但不成立」写在这里**（免得下一轮重走）：`valueOf` 那一格本轮**试过整条线**——
  加了号 `SymbolValueOf = 255`、并进能力表名单、挂上原型。
  **实测它走不到分派那一层**：宿主引用的**能力号确实造对了**
  （`RegisterCapability(255, …)` 成功、`BuiltinHostRef(255)` 读回的就是它），
  可 `Symbol.prototype.valueOf.call(1)` 一路只留下 `340`（`FunctionCall`）→ `220`（`StringCtor`）
  → `301`（`ConsoleLog`）三个号，**255 一次都没到 `InvokeGlobal`**——
  也就是说这条调用**在到达建库分派之前就被人接走了**（不是漏登记，漏登记会抛
  `capability is not registered: 255`，而它一声不响地给 `undefined`）。
  **结论**：先把 `valueOf` 从原型上撤掉（那一格于是落回**继承来的**
  `Object.prototype.valueOf`，而 `valueOf` 对符号接收者**本来就该原样交回**——
  实测 `Symbol.prototype.valueOf.call(Symbol("q"))` 因此**自己就对了**），
  把「255 号为什么到不了分派」登记成**下一轮的入口**。
  这一档的量法已经收在用例第 11 / 12 两行里（`toString` 与 `valueOf` 各一行）。
- **留下的两格**（用例照旧带 `xl:want differ`）：`valueOf` 不是自有、
  `own count` 因此是 3 而不是 4——**第 04 / 01 / 02 三行**。
- **实测**：九道门全绿（墙钟 31.2s）——`runtime:check` 243 / 243、`runtime:cli` 79 / 79、
  `cases:tsast` 缺口 0 条、`cases:astjson` 六项全 0；
  `coverage 4174 / 4342` **一处没动**（那一条仍然是 `differ`——**收了一半的 `differ` 不算过**，
  这也是本项目那条规矩：**用例的账要一整条转绿才撤**）。
- **可复用的判据**：**「装上了但调不了」比缺一个成员更难查**。
  本轮那一格的读法（`Object.getOwnPropertyNames` / `typeof` / `.name` / `.length`）
  **四个出口全对**，只有真去调它才现形——所以遇到「读起来全对、一调就怪」的形状，
  先问「这个值**从哪条路**被调到」，而不是继续查它的属性。

### 第 935 轮：`new` 一个不可构造的值——**值模型补上「可构造」那一位**（第 783 轮登记的缺口收掉，八档全中）

**一句话**：这一轮的普查面是**执行侧那 130 条 `differ` / 38 条 `blocked`**（AST 那一面
第 894 轮量过、缺口清单仍然是空的），第一站取第 769 轮写在明处的那个入口——
**「可调用」比「可构造」宽一格**：本仓的 `new` 只问「这个值可调用吗」，
于是箭头函数 / 对象方法 / `async` / 生成器 / 绑定出来的箭头 / 内建方法（`Math.max`）
**六档全都建得出来**（一个空对象），而 JS 除「绑定过的普通函数」以外**一律抛 `TypeError`**。

- **根因一句话**：`[[Call]]` 与 `[[Construct]]` 是**两格**（规范 §10.2.1），
  而本仓的值模型里**只有第一格**——降级层知道「这个函数值是方法还是函数表达式」，
  可它**一个字都没记下来** ⇒ 到了运行期就问不出来了。
- **修法**（三处，一笔账）：
  1. **降级层多拼一位**：`item.IsMethod` 由 `LowerFunctionValue` 按节点种类定
     （`MethodDeclaration` / `GetAccessor` / `SetAccessor`——**与 `HasRestricted` 共用
     `isMethodLike` 同一份语法事实**），拼进 `new_closure` 第四格的**第六位（值 64）**，
     于是形参个数那一半的**步长 64 → 128**（`EmitClosure` 与 `MakeClosure` 两处同步改，
     见 `HeapClosure.IsMethod`）。**没有另加操作数**：`new_closure` 的五格排满了，
     而这些标记的来处本来就是同一处（第 613 轮的账）。
  2. **引擎收一处判据** `Vm.IsConstructable`：闭包看四位
     （`IsArrow` / `IsMethod` / `IsAsync` / `IsGenerator`——任意一位为真就不可构造；
     **`IsClass` 不在里面**，类恰恰是可构造的那一档），对象看**它自己那一格**。
  3. **两个入口共用它**：`DoNew`（`Op.New` 那条路）与语言层的 `ConstructApply`
     （`Reflect.construct` / `new C(...xs)` 展开那一档**自己造实例**、根本不经过 `DoNew`）。
- **「对象 + 一格可调用载荷」那一档是这一轮真正的坑**（**实测撞到、当场红了 31 条**）：
  第一版写成「对象一律不可构造」，于是 `new Error("x")` / `new Promise(...)` /
  `Map` / `Date` / `Function` **全抛**——因为**宿主的构造函数正是这一档**
  （第 145 轮的 `AttachCallable`）。所以判据改挂在 `AttachCallable` 的**第四个参数**上、
  **默认真**（挂上去的绝大多数就是构造函数），只有四格显式传假
  （生成器的 `next` / `return` / `throw` 与 `Symbol`）；`bind` 那一趟传**目标的答案**
  （`new (f.bind(null))()` 合法、`new ((() => 0).bind(null))()` 不合法——
  而引擎读不到 `__boundTarget`，那个名字是语言层的常数，所以答案必须在 `bind` 那一刻算好）。
- **顺手补一格**（与载荷清空同一条纪律）：`HeapObject.Clear()` 原来**没有复位**
  `Extensible`——复用空格的对象会带着上一次的答案出生。这一轮把 `Extensible` 与新的
  `IsConstructable` 一起复位（两个布尔、不指向任何堆格子，所以「忘了」不会让回收器走错，
  只会给一个**静默的错答案**）。
- **收掉 1 条**：`tests/cases/runtime/round783/001-new-nonconstructor.ts`
  （`xl:want differ` 按规矩撤账、`-differ` 从文件名撤掉，用例留着当守卫，
  十七档（01–08 该抛、11–16 该建、17–21 不限）**与 Node 逐字节一致**）。
- **实测**：九道门全绿（墙钟 29.7s）——`runtime:check` **243 / 243**、
  `runtime:cli` 79 / 79、`cases:tsast` 缺口 0 条、`cases:astjson` 六项全 0、
  `coverage 4173 / 4342 → **4174 / 4342**`（`blocked 39 → **38**`、`differ 130` 不动、
  `bad 0`、`regressions 0`）。
- **那条旧判据**（`tests/runtime/check.mjs` 里「把普通对象当构造函数要给出说清原因的消息」）：
  它原来靠「原话冒到 `error.message` 上」过——而这一轮换了一条抛出的路，
  `CallExport` 那一格**恒为 `the script threw`** ⇒ 断言照原样写必然为假。
  收窄成「**必须响亮地失败**」（这才是那一格能证明的事），
  「说清原因」那一半由上面那族用例自己 `catch (e) { e.message }` 量——
  实测三档原话逐字相同：`this value is not a constructor (it has no [[Construct]])`。
  **可复用的判据**：**一句断言只钉它能看见的那一面**；
  出口变了（谁抛、在哪一层抛）就要重问「这个出口还剩多少信息」。

### 第 897 轮：收掉最后一格 `xl:known-gap`——**`<` / `>` 左边还有没折的 `instanceof` 就先让开**（缺口清单**空了**）

**一句话**：第 896 轮把那一格缩到「只有尖括号那一对会反」，这一轮把**次序量清了**
（不是判据错，是两条规则的**趟序**），收掉之后 `cases:tsast` 的已知缺口表**一条不剩**。

- **根因一句话**：`RelationalInstance` 比 `InstanceofInstance` **早**问到 `<`
  （`parse-pipeline.xl.md` 的 `GeneralCloseRule` 里 `… RelationalInstance, InInstance,
  InstanceofInstance, EqualityInstance …`），于是 `<` 那一趟看到的左边是 `C`、不是
  「折好的 `b instanceof C`」⇒ `b instanceof ((C < D) > d)`（与 TS 逐 token 一致、
  **嵌套方向相反**，正是 `漂 2 / 多 2` 那两个节点）。
  **插桩（`tmp/r897/prev.mjs`，把 `Previous` 的目标切片打出来）**：`<` 在 idx=5 被问到时
  左边是 `Identifier:C`，而 `instanceof` 那一趟问的是**已经折过一次的列表**
  （`list=Let = b instanceof BinaryOperator`）——两次问的**不是同一个状态**。
- **修法**（`binary-operator.xl.md` 的 `YieldsToInstanceof`）：`<` / `>` 在
  `IsValuePositionOperator` 之后多问一句「**我左边同一层里还有一格能折的 `instanceof` 吗**」，
  有就先让开、让排在后面的 `InstanceofInstance` 那一趟先折。
  判据**原样交给 `InstanceofInstance.Previous`**（连同它的位置闸、`?.` 闸、尖括号断言闸）——
  自己再写一张「左右都是操作数」的表就是第二份答案，而漂了的症状正是这一格。
- **为什么只让 `<` / `>`**：`<=` / `>=` 与泛型实参不同形，`GenericTypeBranch` 根本不会试读它们
  （第 896 轮量过：`b instanceof C <= D >= d` 一直是对的）；让开它们只会白改一趟。
- **右边那一格也得是操作数**：本规则折出来的 `BinaryOperator` 正是要递进去当 `instanceof` 的
  右操作数，所以 `b instanceof + e`（`+` 开局）这一支**不响**，照原来的路走。
- **收掉 1 条**：`tests/cases/token/expressions/gap-instanceof-then-add.ts`
  （`xl:known-gap` 按规矩撤掉、用例留着当守卫）⇒ `cases:tsast` 的缺口表**空了**。
- **实测**：九道门全绿（墙钟 31.4s）——`cases:tsast` 16/16 且缺口 0 条、
  `cases:astjson` 六项全 0（1476 份 / 35132 个节点）、`cases:check` 1486 / 1486、
  `cases:tags` 4948 条断言 0 条不一致、`cases:shapes` 未覆盖 0；
  `coverage 4080 / 4252 → 4081 / 4252`（`blocked 39` / `differ 132` / `bad 0` 一处没动，
  加权 95.3%）——**红的只有那一条缺口，而它转绿了**。
- **可复用的判据**：**「这个判据写错了」与「这个判据轮到得太早」是两回事**。
  第 896 轮把嫌疑钉在「尖括号那两格在二元折叠里的次序」上，这一轮证明顺序本身没错
  （后折的 `instanceof` 确实把左边的结果吃进去了）——错的是**谁先被问到**。
  插桩要问的不是「判据返回了什么」，而是「**两次问的是不是同一个列表状态**」。

### 第 896 轮：把那一格缩到**最小片段**——「只有尖括号那一对会反」（九道门全绿、数字照旧一个没动）

**一句话**：第 895 轮收工的读数是「缺口照旧、要收的是同级比较链的结合方向」，
这一轮先把那句话**缩成能一句话说清的最小片段**，再决定下一轮从哪里下手。

| 片段 | 本仓 | TS | |
| --- | --- | --- | --- |
| `const a = b instanceof C < D > d;` | **右嵌套** ✗ | 左嵌套 | 只有尖括号这一对反 |
| `const a = b instanceof C <= D >= d;` | 左嵌套 ✓ | 左嵌套 | 换 `<=` / `>=` 就正常 |
| `const a = b < c > d;` | 左嵌套 ✓ | 左嵌套 | **没有 `instanceof` 时也正常** |

- **判据因此收窄了一半**：反的不是「同级比较链」（那样 `<=` / `>=` 也该反），
  也不是「`instanceof` 那一支」（那样 `b < c > d` 也该反），而是**尖括号那一对**——
  也就是 `GenericTypeBranch` 试读 `C<D>` **失败之后**留下的那两格 `SymbolToken`，
  它们在二元折叠里的次序与别的运算符不同。
- **第 895 轮那条「父单元是折好的 `BinaryOperator`」的猜想在同一轮已经证伪**（插桩：那一档
  根本没被问到），这一轮的最小片段**把它的适用范围也钉死了**：换 `<=` / `>=` 一切正常。
- **下一轮的入手处**：不是 `generic-type.xl.md` 的 `instanceof` 那一支，而是
  「试读失败之后那两格尖括号在 `RelationalInstance` 里的次序」——
  `tmp/r896/triple.mjs` 是现成的尺子（一个片段一个进程，产物 / 投影 / TS 三样并排）。
- **实测**：九道门全绿（`cases:tsast` 16/16 且 `抛异常 0`、`cases:astjson` 六项全 0、
  `coverage 4080 / 4252`、`differ 132`、`blocked 40`、`bad 0`）——**数字一个没动**。
- **可复用的判据**：**「把缺口缩小」本身是产出**。上一轮的结论是「要收结合方向」，
  那一句对下一轮没有任何约束力（同级比较链、`instanceof` 那一支、尖括号那一支
  三种可能它都涵盖）；缩到三行片段之后，下一轮只剩下一种可能。

### 第 895 轮：`instanceof` 那一支「够不着」的**真根因是递归**——量清了，但缺口照旧开着（九道门全绿、数字一个没动）

**一句话**：上一轮把 `IsInstanceOfTypeArgument` 记成「写对了但够不着，因为 `source` 是 `null`」，
并留下一条行动项「把第 4 个实参补上就行」。这一轮照那条行动项做了，**当场栈溢出**——
量清之后发现**上一轮的诊断是错的**：`source` 不是拿不到，是**不能传**。

- **上一轮那句话怎么来的**（如实记）：插桩看到 `IsTypePosition` 收到的 `source` 是空，
  就推成「调用点没带」；可那一次**就是** `IsAllowedFollower` 里那一句 `this.IsTypePosition(unit)`
  ——它按设计只传 `unit`。数据流一句话能说清，难的是**传下去会怎样**。
- **传下去会成环**（第 895 轮实测，`tmp/r896/patch.mjs` + `probe8`）：
  `IsAllowedFollower → IsTypePosition(source) → instanceof 那一支 → IsInstanceOfTypeArgument
  → IsAllowedFollower → IsTypePosition(source) → …`。栈里这两个方法交替出现，
  而第 894 轮把这个栈溢出的第一行读成了 `throw by line 0`。
- **修法**：那一格**就地判据**——配对 `>` 后面那一个字符若是 `<` / `>` / `+` / `-`
  就判否（`IsAllowedFollower` 表达式位里「接不上表达式」的正是这四格），其余放行。
  **不回头问后继闸**，环就断了。
- **接线补上之后缺口照旧开着**：`b instanceof C<D> + e` 的产物与 TS **逐 token 一致**了
  （`((b instanceof C) < D) > (+e)`），可**结合方向相反**——TS 左结合给
  `BinaryOperator(BinaryOperator(b instanceof C, <, D), >, +e)`，本仓给**右嵌套**。
  所以 `cases:tsast` 仍然是 `KNOWN 漂 2 / 多 2`，缺口一行不动。
- **同一轮试过、当场撤掉的一档**：以为右嵌套是 `IsValuePositionOperator` 把
  「父单元是折好的 `BinaryOperator`」判成了非值位，就加了那一档——**实测一个字没动**
  （插桩：`instanceof` 与 `<` / `>` 在同一趟里被问到时，`<` 的父单元仍是 `Statement`，
  因为 `InstanceofInstance` 排在 `RelationalInstance` **后面**，折发生在更晚一趟）。
  按本仓规矩「没被验证过的判断不留」，已撤，把这一次的账写进
  [`binary-operator.xl.md`](typescript/tokens/binary-operator.xl.md) 那一节。
- **实测**：`cases:tsast` 16/16（`抛异常 0`——那两份上一轮会崩的用例现在照跑）、
  `cases:astjson` 六项全 0、`cases:tags` / `cases:shapes` / `samples` / `runtime:*` 全绿、
  `coverage 4080 / 4252`（`differ 132`、`blocked 40`、`bad 0`）——**数字一个没动**。
- **可复用的判据**：**「这一支拿不到数据」与「这一支不能拿数据」是两回事**。
  上一轮从「`source` 是 `null`」直接推到「补上实参就能修」，缺的正是那一趟**传下去到底会怎样**；
  插桩看**入口**（谁没带参数）与插桩看**回路**（带上之后谁又被问了一次）是两个实验。

### 第 894 轮：`instanceof` 右边那个实例化表达式——**「被实例化的那头不在开头」是投影的一格**（缺口清单照旧是空的）

**一句话**：起手仍是第 893 轮那个手法（AST 全绿不等于没缺口，**写一批小片段去问**），
99 条合法片段量出**一处**：`const a = b instanceof C<D>;`。它在**两层**各缺一格，
两处一起收；收完片段探针 **99 条 0 条对不上**、九道门全绿、token 缺口清单照旧空。

- **TS 那边怎么读**（先问的不是本仓的代码，是上游那一句话）：`b instanceof C<D>` 是
  `BinaryExpression(b, InstanceOfKeyword, ExpressionWithTypeArguments(C<D>))`——
  也就是**实例化表达式**（TS 4.7 那一族）。TS 自己还专门留了一条**语法错**来拒它
  （`checkExpressionWithTypeArguments`：`The right hand side of an instanceof expression
  must not be an instantiation expression`）——**那条错误本身就是证据**：
  解析这一层确实照实例化表达式读，只是再从这里把语义拒掉。
- **① token 层**（[`generic-type.xl.md`](typescript/tokens/generic-type.xl.md) 的 `IsTypePosition`）：
  `C` 后面那个 `<` 回扫撞上的是 `C`（一个操作数）⇒ 判表达式位 ⇒ 后继闸在表达式位
  **只放行 `(`** ⇒ `<…>` 退回比较运算符。修法是加一支：**`instanceof` 右边那一格是类型位**
  （`instanceof` 与 `in` 一样是 `Keyword`，而 `KeywordCloseRule` 排在队列最后 ⇒
  **两种身份都要认**，与 `in` 那一支同款）。**判据要求 `instanceof` 与那个名字之间不许隔实义单元**
  ⇒ `a instanceof b.c<D>` 里 `c` 前面是 `.`，这一支不响，与原来一字不差。
- **② 投影层**（[`print-ast-common.xl.md`](typescript/print-ast-common.xl.md) 的 0a2）：
  0a 那一支（泛型实例化表达式）**只看头一格**，而这里被实例化的那头是**第三格**。
  产物落下来的形状是**两格** `[BinaryOperator(b, instanceof, C), GenericType(<D>)]`
  （`instanceof` 那一趟照样折），所以这一支先把那个 `BinaryOperator` 摊开
  （`unwrapNodes`，与 `projectTypeArguments` 同一把尺子）再判，
  **摊开的四格与折好的两格并成一条**——同一句话写两遍就是两处会漂。
- **一处踩出来的内部错误**：第一版把这一格交给 `foldBinaryFrom` 收尾
  （`foldBinaryFrom(left, [op, self, …])`），当场
  `TypeError: opener.get is not a function`——那个函数的 `rest` 是**原始单元**（`Map`，
  它按 `k.get("type")` 问类型），而这里要递进去的是一个**已经投好的节点**。
  修法：这一层二元**自己折**（`pos` 取左操作数、`end` 取右操作数，
  与 `foldBinaryFrom` 的二元那一支同一个形状），**尾巴上还有运算符时才交回** `foldBinaryFrom`。
  **可复用的判据**：「把节点塞进一个只要原始单元的接口」这种事，报的从来不是类型错，
  而是**在远处某一个 `.get` 上崩**——那个位置与出错的原因隔着十几层调用。
- **实测**：片段探针 **99 条合法片段、0 条对不上**（修前 1 条）；
  `cases:tsast` 16 片全过、**缺口清单是空的**；`cases:astjson` 六项全 0
  （1475 份 / 35071 个节点，比上轮多 1 份 37 个节点——就是这条新用例）；
  `cases:check` 1485 / 1485、`cases:tags` 4948 条断言 0 条不一致、`cases:shapes` 未覆盖 0；
  `coverage` **4079 / 4250 → 4080 / 4251**（token 那一侧 1471 → 1472 条，全过；
  `blocked 39` / `differ 132` / `bad 0` 一处没动，加权 95.3%）；`runtime:*` / `samples` 全过
  ⇒ **九道门全绿**（墙钟 30.9s）。
- **新增一条常驻用例**
  [`expr-instanceof-instantiation`](tests/cases/token/expressions/expr-instanceof-instantiation.ts)
  （`xl:expect BinaryOperator,Keyword,GenericType,Identifier`——**期望只能写产物标签**，
  `ExpressionWithTypeArguments` 是投影那一层的 kind、不在 token 的标签表里，
  写上去 `cases:check` 当场红）。探针留在 `tmp/r894/snips.mjs`（未进仓）。

### 第 894 轮（续）：**把普查从「手写片段」换成「从全语料里挖」**——24,645 条 0 条对不上，顺带量出一格登记成缺口

**一句话**：上一节那个手法（手写片段）**受手写的想象力限制**，所以这一轮换了一把更宽的尺子：
**从全语料里挖**——`@types` / `typescript/lib` / `undici-types` 里逐行取，
按形状套一个外壳（`wrap.mjs`），得到 **24,645 条合法片段**、一个进程跑完 ~12 秒。
读数：**0 条对不上**（24,584 条 TS 自己就非法，被探针按规矩跳过）。

- **这把尺子量出来的第一件事是「外壳自己会骗人」**：第一版 `wrap` 把 `type: "A";` 原样喂进去，
  而它在 TS 里**恰好是合法的**（`type:` 是**标签**、后面是字符串表达式语句）——
  于是 19 条「FAIL」全是**外壳的差**、一条都不是产物的问题。
  第二处同类：`(path: string) => boolean` 单行套成 `const v = …` 之后 TS 读成**箭头函数**、
  本仓读成**函数类型**（TS 只在「类型位」认函数类型）——也是外壳的差。
  **规矩**：探针报 FAIL 时先问一句「这个片段**在 TS 里到底读成什么**」，
  再去读产物的树；两处加起来 21 条假缺口，比这一轮真找到的缺口多一个数量级。
- **顺带量出真的一格**：`b instanceof C<D> + e`。TS 那边**不是**实例化表达式——
  `canFollowTypeArgumentsInExpression` 明写「配对 `>` 后面是 `<` / `>` / `+` / `-` 就判否」，
  于是整条读成 `((b instanceof C) < D) > (+e)`；本仓收成 `(b instanceof C<D>) + e`（漂 2 / 多 2）。
- **这一格为什么这一轮没收**（如实记）：判据本身**写好了**（`IsInstanceOfTypeArgument`，
  与 TS 那句原文一对一），可它**够不着**——`IsAllowedFollower` 里那次 `IsTypePosition(unit)`
  没把 `source` 带下来，这一支拿到的 `source` 是 `null`、第一句就答否。
  接线点是**一处**（那次调用补第 4 个实参），而那一趟的真实数据流这一轮没量清
  （插桩实测：`IsGenericStart` 那次调用带的是 `Root` 宿主、`Data` 是 `[Let, =, b, instanceof, C]`，
  而 `IsTypePosition` 收到的 `source` 已是空）。**按规矩登记成 `xl:known-gap`、不猜**：
  新增 [`gap-instanceof-then-add`](tests/cases/token/expressions/gap-instanceof-then-add.ts)，
  方法体留在 `generic-type.xl.md` 里并写明「写对了但够不着」。
- **实测**：挖矿探针 **24,645 条合法片段、0 条对不上**；九道门全绿（墙钟 31.2s）；
  `cases:tsast` **缺口清单 1 条**（本轮登记的那一条，0 条已收掉）；
  `cases:astjson` 六项全 0；`cases:check` 1486 / 1486、`cases:tags` 4948 条断言 0 条不一致、
  `cases:shapes` 未覆盖 0；`coverage` **4080 / 4251 → 4080 / 4252**
  （`blocked 39 → 40`：新登记的那一条进分母，`differ 132` / `bad 0` 没动，加权 95.3%）
  ——**分母里面多一条「本来就还没做」的账，正是这一轮想要的结果**。
- **可复用的判据**：**探针的覆盖面上限是「喂进去的片段」**。手写片段压过的地方就那几处；
  「从全语料里挖」把上限抬到**外部代码真的写过什么**，而它的代价是**外壳要自己量准**
  （这一轮 21 条假缺口全出自外壳）。两把尺子都要：手写片段用来**盯最近改过的那几处**，
  挖矿用来**回答「还有没有别的」**。

#### 第 894 轮（三）：把挖矿的**收成率**抬上去——三把尺子都是 0，AST 这一面这一轮量不出新的

上一节的挖矿探针有一处浪费：**外壳**（单行套成 `const v = …` / `let v: { … }`）
既造出假缺口（21 条）、又把大部分行挡在门外。这一轮换了两种**不套外壳**的粒度，
读数如下（三把都是「0 条对不上」）：

| 粒度 | 收成 | 说明 |
| --- | --- | --- |
| 单行 + 外壳（上一节） | 24,645 条合法 | 假缺口 21 条（外壳的差），真缺口 1 条 |
| **花括号配平的顶层块** | 861 条合法 | 从 226 份语料里切出 961 段（`interface` / `type` / `function` / `class` / `namespace` 自己就是合法 TS，**一条外壳都不用套**） |
| **整份 `.d.ts` 原样** | 213 份（1.9 MB） | 单进程 ~5.6 秒；**外部代码真的长什么样就照原样喂进去**，这是覆盖面最宽的一把 |

**结论如实写在这里**：token 层的 AST 这一面**这一轮量不出新的缺口**——
三把尺子、两万五千个构造、两百多份真实声明文件，0 条对不上；
唯一量出的那一格（`instanceof … + e`）是**一层接线没接上**，已按规矩登记成 `xl:known-gap`。
**这不是「做完了」，是「这一把尺子量到这儿为止」**：三把尺子量的是**同一个出口**（`--ts-ast`），
而 `token` 那一侧的分母（1472 条用例）与外部语料**已经压满了**——
再要找缺口得换出口（执行侧那 132 条 `differ` / 40 条 `blocked`）或换判据，
不是继续把同一把尺子加宽。

### 第 893 轮：新片段普查 149 条——**带走类型标注的 `catch` 形参**与**静态索引签名**（AST 两把尺子照旧全绿）

**一句话**：AST 那两把尺子已经全绿，所以这一轮的起点不是「哪里有红」，而是**写一批
既有语料没压过的小片段**去问一遍（`--snippets` 探针，149 条合法片段、一个进程）。
逮到两处，都收掉了；两处都**进了语料**（token 那两把尺子从此压着它们）。

- **`catch (e: unknown)`**：TS 那边 `VariableDeclaration` 是 `e: unknown` **整段**
  （[15,25)）、`type` 是 `UnknownKeyword[17,25)`，而本仓
  ① 只按名字两端给区间（[15,16) ⇒ 漂一格 + 多一格），
  ② 把类型投成了**那层 `TypeDefine` 壳**（⇒ 缺 `UnknownKeyword` + 字段名少 `type`）。
  修法照**形参那一支**：区间读到那个 `TypeDefine`（它含 `:`）、类型走 `ctx.TypeExpression`
  （「类型位里的原始类型名是关键字节点」这条只在类型位的投影里）。
  **没有类型标注时一个字都不变**（`catch (e)`）。
- **`class C { static [k: string]: number; }`**：TS 那边那个 `IndexSignature` 的
  `modifiers` 是 `[StaticKeyword[10,16)]`，而 `IndexSignature.PrintAst` 那一格
  **只找 `readonly`**。改成**按源码次序收一摞**（`static readonly [k: string]: number`
  在 TS 里是**两个**修饰词）——两处各写一句就会漏掉「两个一起写」的那一格。
- **实测**：片段探针 `149 条合法片段，0 条对不上`；九道门全绿
  （`cases:tsast` 16/16、`cases:astjson` 六项全 0、`coverage 4077 / 4248`、
  `differ 132`、`bad 0`、`regressions 0`）。新增两条常驻用例
  （`token/statements/stmt-catch-define-typed`、`token/statements/stmt-index-signature-static`）。
- **可复用的判据**：AST 全绿之后，**「没有红」不等于「没有缺口」**——
  既有语料是被一轮一轮的探查喂大的，它压过的地方就那几处。
  这一轮的入手式是「**把最近改过的那几个投影（catch / try / 修饰词 / 类型位）
  各写两三条最小片段**」，比读代码找缺口快得多（149 条一次跑完 ~3 秒）。

### 第 892 轮（续）：`for..in` 沿原型链那一趟——**「这一格存在」与「这一格算数」是两份名单**（台账 1 条转绿，`differ 133 → 132`）

**一句话**：第 783 轮量出来的那一格（自有的**不可枚举**属性挡不住原型上同名的可枚举格）
是 `CollectForInKeys`（`builtins/globals.xl.md`）那一趟少了一步——规范
§14.7.5.6 的 `EnumerateObjectProperties` 用的是 `[[GetOwnProperty]]`：自有那一格
**存在**就 `visited` 掉，**与可不可枚举无关**。原来那里只有一句
`seen.push(可枚举的键)` ⇒「自有不可枚举」那一格**什么都没留下**。

- **改法**：新抽一格 `OwnStringKeyTexts`（**自有的全部字符串键**：与
  `OwnEnumerableKeyTexts` 同一套下标判据——`IndexKeyPositions` / `IndexKeyShadowed` /
  `IsIndexKeyText`，**只是不筛 `IsEnumerable`**），`CollectForInKeys` 在**每一层**
  用它往 `seen` 里补一遍。`names`（要交出去的键）与 `seen`（已经出现过的名字）
  **是两份名单**，合成一份就会往另一个方向错（`for..in` 列出不可枚举的键）。
- **一处踩出来的坑**：第一版把这个块写在 `while` **外面**——标记是在原型链走完之后
  才补的，而那些层**已经被收过了** ⇒ **八档输出与改之前逐字相同**（看起来像「改法没用」）。
  它必须在**每一层的循环体里**，而且用**那一层**（`layer`）而不是接收者：
  规范那一句就是「走到哪一层就标记哪一层的自有格」。
- **收掉 1 条**：`runtime/round783/004-forin-nonenum-shadow-differ`（台账撤掉、留作守卫：
  八个方向档全对，十档对照——自有可枚举挡原型不可枚举 / 原型不可枚举不列 /
  `Object.keys` 与 `in` 两问 / `delete` 当前那一格仍出现一次——一个都没动）。
- **实测** `coverage 4076 / 4248 → 4077 / 4248`（`differ 132`、`blocked 39`、`bad 0`、
  `regressions 0`）；九道门全绿。
- **可复用的判据**：「枚举」这种题里**问法不止一个**——「这一格**算不算**键」与
  「这一格**在不在**」是两个问题（`IsEnumerable` 只回答前者）。
  写「同一趟顺手把两件事都做了」之前先数一遍：**规范那一步用的是哪一个问法**。

### 第 892 轮：严格模式下的 `delete`——**严格性在编译期就写死成一个实参**（台账 2 条转绿，`differ 135 → 133`）

**一句话**：第 783 轮量出来的那一格（`"use strict"` 下删一个**不可配置**的属性该抛
`TypeError`，本仓一声不响地删掉）是**四个出口同一个根**——`DeleteProperty`
（`props.xl.md`）**自己就答了真**，严格位根本没参与判定。这一轮把严格性**从降级层带进引擎**：
它本来就是**编译期已知**的（类体 / 函数体自己的指令序言 / 沿词法继承都记在 `InStrict` 里），
所以 `del_prop` 的实参从 2 变 3，第三格就是「这段代码严格吗」。

- **根 ①：`delete` 是唯一一个「两种模式下答案不同」的算子**。规范里两种模式走的是
  同一步 `[[Delete]]`，差别只在**调用方**（`DeletePropertyOrThrow` 答假时严格代码抛）。
  所以引擎那一支收成**一条** `deleteOrThrow`，原始值那一支与对象那一支**都过它**——
  两处各写一遍就是两处会漂的答案（第 307 / 312 / 320 轮各踩过一次）。
- **根 ②：`IsStrict` 从这一轮起多了一个读处**，于是「箭头体里的指令序言」必须置真
  （`(() => { "use strict"; delete o.a })` 里那句 `delete` 在 JS 里抛）。
  第 701 轮**故意**没给箭头这一档（标成严格会连「没有接收者时 `this` 给谁」一起改掉），
  所以这一轮把两件事**拆开**：`IsStrict` 照置（`delete` 读它），
  而 `this` 那一问在**调用点**多问一位 `HeapClosure.IsArrow`（新增字段，
  借 `new_closure` 第四格的第六位、**步长 32 → 64**，降级层同步）。
  **不这么拆的话**：`exec/functions/120-strict-mode-and-module-this` 第 6 档会从
  `"object"` 掉成 `"undefined"`（实测：第 701 轮就是被这一条挡住的）。
- **根 ③：函数的 `prototype` 那一格抄错了一位**（**这一轮顺手量出来的**）。
  JS 从 ES2015 起是 `{ writable: true, enumerable: false, configurable: false }`
  （`MakeConstructor` 的第二步），而本仓走的是 `SetHiddenProperty` 的缺省口径
  （可写 + **可配置**）⇒ 严格模式下 `delete f.prototype` 给真、
  `typeof f.prototype` 从 `"object"` 变 `"undefined"`。判据第 2 / 22 档量的正是它。
- **收掉 2 条**：`runtime/round783/002-strict-delete-nonconfigurable-differ`
  （台账撤掉、留作守卫：五个严格档该抛的抛、七个松散档照旧静默）与
  `runtime/round760/004-bound-function-prototype-differ` 的**第 1 / 2 档**
  （`typeof f.bind(null).prototype` 与 `hasOwnProperty("prototype")` 现在都对；
  那一族剩下的两档——`bind` 出来的函数**不该有**自有 `prototype`——要动
  `CreateInstance`，仍记在台账里）。
- **实测** `coverage 4074 / 4248 → 4076 / 4248`（`differ 135 → 133`、`blocked 39`、`bad 0`、
  `regressions 0`）；九道门全绿（`cases:tsast` 16/16、`cases:astjson` 六项全 0）。
- **可复用的判据**：「同一个表达式在两种模式下答案不同」的东西**不止 `this` 一个**。
  写「严格性只影响一件事」这种句子时，先问一句：**还有谁在规范里读 [[ThisMode]] 这一位**
  ——`delete` 是第二个，而它的**答案在编译期就定得下来**（因为它是语法层面的模式，
  不是运行期的值）⇒ 该带进引擎的是一个**实参**，不是一次运行期判断。

### 第 891 轮：绑定函数那一族——**「记账号」不是属性**（台账 3 条转绿，`differ 138 → 135`）

**一句话**：AST 那两把尺子全绿之后，红账只剩 `coverage` 的台账（`blocked` / `differ`）。
按第 883 轮写下的落点，收掉**绑定函数**那一族：`f.bind(x)` 交出来的那个函数，
自有格应当是 `["length","name"]`，而本仓给
`__boundTarget,__boundThis,__boundArgs,length,prototype,name`——**四格不该存在的东西**。

**根因一句话**：那四格是**引擎自己的载荷**，而它们被写成了**真的属性**。
JS 里 `f.bind(x)` 上既没有 `__boundTarget`（那是本仓的记账）、也没有自有的 `prototype`
（规范 §10.4.1.3 只做 `SetFunctionLength` / `SetFunctionName`）——所以
`"__boundTarget" in bound`、`Object.getOwnPropertyNames(bound)`、`typeof bound.prototype`
三问在 Node 里分别是**假 / `["length","name"]` / `"undefined"`**。

**为什么不能按名字滤**（第 883 轮就把这一条钉住了）：用户自己写
`{ ["__boundTarget"]: 1 }` 是一个**真的**自有属性名（Node 会给它）——按名字滤会把它一起藏掉。
标记必须跟着**那一格**走。于是这一轮给 `Property.Flags` 补上**第 4 位**
`PropertyFlagInternal`（`heap.xl.md`；界说得很死：**它不是一个属性**，
所以读属性 / `in` / 赋值 / 自有名表那几处都要滤掉它），`FunctionBind` 写那四格时置上。

**落在哪几处（都是「什么时候看得见」这件事的出口）**：

| 出口 | 改成什么 | 为什么 |
| --- | --- | --- |
| `FindProperty`（`props.xl.md`） | 多一格 `includeInternal:bool = false`，缺省**滤掉** | 它同时管着 `GetProperty`、`in`、`SetProperty` 的查找——一处收住三问 |
| `GetInternalProperty`（同文件，新） | **只看自有**那一格、只认数据属性 | 引擎自己读载荷的**显式**入口（不给 `GetProperty` 加第 7 个位置参数：那条路上有几十个调用点） |
| `BoundCall`（`globals.xl.md`） | 那三格改走 `GetInternalProperty` | 引擎读自己的记账 |
| `Object.getOwnPropertyNames` | 那一趟按标记 `continue` | 与 `#p` 那一族**同一个坎**（第 737 轮） |
| `SetPropertySearched` 的「接收者自己那一格」那一趟 | 按标记 `continue` | `bound.prototype = 7` 在 JS 里是**新开一格普通属性**；不滤就会**就地改掉记账那一份** |
| `CreateInstance`（`vm.xl.md`） | 用户口径读不到对象时，补一次 `GetInternalProperty` | `new G()` 要用**目标**那一格（规范的 `[[Construct]]` 对绑定函数是转交） |
| `RtInstanceOf`（`rt.xl.md`） | 同上 | `new bound() instanceof F` 与 `x instanceof bound` 走的是同一个原型 |

**「两件事同时成立」是这一格的形状**：JS 里 `G.prototype` 是 `undefined`（**没有自有那一格**）
**而** `new G() instanceof F` 是真。第 753 轮为了让后者成立把目标的 `prototype` 抄了过来，
前者于是挂着（台账 `p753b-03` 第 5 行）。抄**还是**要抄——只是那一格现在是**记账格**：
用户那头一眼都看不见它，引擎走 `GetInternalProperty` 照旧读得到
⇒ ①② 同时成立，**而且不必动「每一次 `new` 都要过」的那条路**（第 750 轮那条取舍的答案）。

**语料当场逮回一处回归**（与第 889 轮同款，但这次逮住它的是红账那一栏）：
`runtime/round767/005-instanceof-forms` 从绿变红（`the right side of instanceof has no
prototype object`）——`instanceof` 读的是**用户口径**的 `prototype`，
那一格看不见之后 `new bound() instanceof F` 就断了。这一处正是上表最后一行，
补上 `RtInstanceOf` 的记账口径读之后回到绿。

**用例**：三条**台账用例**按规矩撤掉 `xl:want differ` 与那几行 `xl:why`、留作守卫
（[`round753/003`](tests/cases/stdlib/round753/003-construct-and-bind-prototype-differ.ts)、
[`round783/003`](tests/cases/stdlib/round783/003-bound-function-own-cells-differ.ts)、
[`round778/001`](tests/cases/runtime/round778/001-function-name-inference-differ.ts)——
第三条的文件头原本就写着「两条要同一轮收」），另新增一条**守卫用例**
[`round890/001`](tests/cases/stdlib/round890/001-internal-flag-not-name-guard.ts)：
用户自己的同名属性仍然是真属性、`bound.prototype = 7` 之后读回 7 而 `new bound()`
照旧用**目标**的原型（六行与 Node 逐字节相同）。

**实测**：`coverage` **4070 / 4247 → 4074 / 4248**（`differ 138 → 135`、`blocked 39` /
`bad 0` 没动，加权 95.2%）；`cases:tsast` 缺口清单照样是空的、16 片全过；
`cases:astjson` 六项全 0；`cases:check` / `cases:tags` / `cases:shapes` 全过；
`runtime:check` 243 条、`runtime:cli` 79 份一致、`samples` 全过 ⇒ **九道门全绿**（墙钟 29.8s）。

**这一轮的经验**：**「什么时候看得见」这件事有多个出口，要一次列齐**。
`PropertyFlagInternal` 这一位本身只是一句 `&`，难的是**出口清单**：
读属性 / `in` / 赋值 / 自有名表 / 造实例 / `instanceof`——漏一个就是一处**静默错值**
（这一轮漏的正是最后一个，被语料当场逮住）。
第二条：**「不能按名字滤」那一条要先用一条用例钉住**——它是这一类修法最容易走岔的地方，
而且走岔之后**用户自己的属性会消失**，比原来的账更坏。

### 第 890 轮：缺口清单上的两条一起收掉——**「行尾」自己是一档，「被断言的那个操作数」只有一格**（已知缺口 2 → 0）

**一句话**：`cases:tsast` 的缺口清单上只剩第 888 / 889 轮登记的那两条，这一轮把两条一起收掉；
收的过程中同族又量出**两处**同根的格子，第三处（断言的类型那一格）也在同一轮里收干净了
——**登记的缺口一条都没有过夜**。

**两条缺口的根因各是一句话**：

1. **行尾是一档放行条件**（[`generic-type.xl.md`](typescript/tokens/generic-type.xl.md) 的 `IsAllowedFollower`，
   用例 `gap-instantiation-line-end`）：TS 的 `canFollowTypeArgumentsInExpression` **第一句**就是
   `scanner2.hasPrecedingLineBreak()`——配对 `>` 后面那一格只要换了行，`<…>` 就是类型实参段，
   与它后面接什么无关。本仓那一格在表达式位答「不是类型位」（返回 `isTypePosition`，而它是假）
   ⇒ `const f = a<b>` 换行 `const g = a.b.c<string>` 整条读成比较式，**两条语句一起塌**。
   改法是把**行尾 / 文件尾 / 注释开头**那三条早退一起改成 `true`（`//` 一定吃到行尾、
   没闭合的 `/*` 吃到文件尾 ⇒ 后继那一格必然带着一个换行）。
   **这一改只动表达式位**：类型位原来就在这一档返回真，行为一字不差。
   它同时保住了「不跨行看」那条老判据——不跨行看的是**下一个非空字符是什么**，
   而这一档根本不去看那个字符（越过换行看到的多半是下一条语句的开头）。

2. **断言的被断言者是「一个一元表达式」**（[`binary-operator.xl.md`](typescript/tokens/binary-operator.xl.md) 的
   `IsAngleAssertionHead`，用例 `gap-angle-assertion-then-compare`）：`<T>x > y` 在 TS 里是
   `(<T>x) > y`——断言是**前缀**那一档（与 `!x` / `typeof x` 同级），只吃**一个一元表达式**。
   本仓的 `<T>` 是操作数位上的 `GenericType`，`x` / `>` / `y` 与它**平级**，二元规则先把 `x > y` 折掉
   ⇒ 投影收到 `[GenericType, BinaryOperator(x > y)]` ⇒ 投出一个**吞掉整个比较**的断言
   （实测缺 `BinaryExpression` / `LessThanToken` / `GreaterThanToken`，断言区间从 `<T>x` 撑到 `y`）。
   改法是**这一层有断言头就不接手**（判据：这一层的第一个实义单元是 `GenericType`），
   把那几格留成**平的**——投影第 379 轮那条「断言只吃一个操作数、剩下交给 `foldBinaryFrom`」正好接住。
   **为什么整层都不接手**：`foldBinaryFrom` 是按优先级与结合性折的（`<T>a + b * c` 会先把 `b * c` 收进去、
   `<T>x > y > z` 会左结合成 `((<T>x) > y) > z`）；只挡紧挨着的那一格反而会折出右嵌套。

**同族普查又量出三处**（`tmp/r890/snips.mjs`，16 条片段，逐条与 `ts.createSourceFile` 对拍）：

| 片段 | 修前 | 修后 |
| --- | --- | --- |
| `<number>a + b` | 缺 1 / 漂 1 / 多 2 | **0** |
| `// c1` 换行 `<T>x;` | `<…>` 退回裸符号（注释壳把断言整族挡在门外） | **0** |
| `<T>(x) > y` | 外层同样错，断言的类型是 `TypeParameter(T)` | **0** |

- **`<number>a + b` 与上面第 2 条同根**：第 379 轮那条理由当时写对了（「断言只吃一个操作数、
  剩下的交给 `foldBinaryFrom`」），可它**暗中假定了「操作数与运算符平级」这一态**——
  第 889 轮把 `<` / `>` 放进关系层之后，`x > y` 会在收尾期先折，那个前提就不再成立。
  同一个理由在**两个阶段**要各说一遍：这一次说的是「本规则不许接手」。
- **语句开头那一条注释**（插桩实测 `host=Root data=[Statement]`）：
  `IsOperandStartUnit` 原来是 `unit.Last()`，拿到的是那个**只装着注释的语句壳**
  ⇒ 名字闸（`hasName`）与位置闸**双双答否**，`<T>x` 退回裸符号。
  判据改成往回跳过纯排版（软换行、注释、**只装着注释的 `Statement`**），并把**别的语句当边界**
  ——与 `IsTypePosition` 第 144 轮那条例外**同一句话**。
  **这一格是被语料当场逮住的**：`expr-angle-assertion.ts` 的 `<T>x;` / `<T[]>xs;` 里，
  第一句把第二条整条带坏（`T[]` 投成 `ElementAccessExpression`，16 片里 **1 片红**）。
  第一版判据写成「跳过注释壳就停手」也不对——`<T>x;` 换行 `<T[]>xs;` 里第二个 `<` 回扫
  只看得见**前一条语句**的壳，停在它上面照样判否。
- **断言的类型那一格**（`<T>(x) > y`）：[`type-parameter.xl.md`](typescript/tokens/type-parameter.xl.md) 的
  `IsParameterList` 有一条判据是「泛型段后面紧跟 `(` 就算参数表」（给 `const g: <T>(x: T) => T`、
  语句开头的 `<T>(x: T) => x` 用的），断言正好撞在**同一形状**上 ⇒ 断言的类型投成 `TypeParameter(T)`。
  **能分辨这件事的只有投影那一层**：定下「参数表」那一刻，后面那对括号还没扫完、`=>` 也还没出现
  （TS 自己也是靠回溯分的），而走到断言那一支时括号已经成形、**第二格不是 `Lamda`**
  ⇒ 这次 `<…>` 不可能是参数表。修法是把那层包装拆掉、按**类型**重投一遍
  （`<T>` 的内容是名字 ⇒ `TypeReference`，正是 TS 的形状）。

**用例**：新增 3 条 token（
[`decl-instantiation-line-end`](tests/cases/token/declarations/decl-instantiation-line-end.ts)（行尾那一档）、
[`expr-angle-assertion-then-operator`](tests/cases/token/expressions/expr-angle-assertion-then-operator.ts)（
`xl:absent BinaryOperator`——断言那一层不再折）、
[`expr-angle-assertion-after-comment`](tests/cases/token/expressions/expr-angle-assertion-after-comment.ts)）；
第三条格子先按规矩登记成缺口（
[`gap-angle-assertion-paren-operand`](tests/cases/token/expressions/gap-angle-assertion-paren-operand.ts)）、
**同一轮里收掉之后当场把那行 `xl:known-gap` 删掉**、留作守卫——
登记的缺口在仓里待的时间越短越好。
两条老缺口用例（`gap-instantiation-line-end` / `gap-angle-assertion-then-compare`）
同样按规矩撤掉 `xl:known-gap`、留作守卫。

**实测**：`cases:tsast` **16 片全过**、全语料 **1879 / 1879 个文件逐位置完全一致**
（缺 0 / 漂 0 / 多 0 / 字段 0），**缺口清单是空的**（2 条老缺口 + 1 条本轮登记的，全部收掉）；
同族探针 `tmp/r890/snips.mjs` **16 条全对上**；
`cases:astjson` 六项全 0（1472 份 / 34952 个节点）；`cases:check` **1482 / 1482**、
`cases:tags` 4941 条断言 0 条不一致、`cases:shapes` 未覆盖 0；
`coverage` **4064 / 4243 → 4070 / 4247**（`blocked 41 → 39`：三条缺口全转绿，
`differ 138` / `bad 0` 没动，加权 95.2%）；`runtime:*` / `samples` 全过 ⇒ **九道门全绿**（墙钟 32.4s）。

**这一轮的经验**：**缺口清单是「轮次之间」的交接面，别让它长过一轮**。
第 888 轮量出行尾那一格时就写下了 TS 那句原文（`hasPrecedingLineBreak() || isBinaryOperator2() ||
!isStartOfExpression()`），第 889 轮又量出「断言没先成形」那一格——两句话都在案上，
收起来各是十行以内。这一轮顺手量出的第三处（断言的类型那一格）**当天就收掉了**：
先按规矩登记成 `xl:known-gap`（那是本仓记缺口的老实做法），收掉之后当场把那行删掉。
**同一份原文分两轮收**本身没错（分阶段说清是对的），
错的是让**已经量到根因**的格子过夜：它们每次都进 `coverage` 的 `blocked` 账，
看久了就当成「本来就还没做」。第二条经验与第 889 轮同款但更狠：
**改一层的判据要立刻跑全语料**——这一轮的回归不在探针池里（16 条全绿），
而在 `expr-angle-assertion.ts` 那条**别的**用例上，是 16 片对拍逮住的。
第三条：**「这一格只有谁能分辨」也要问出口**——`<T>(x)` 到底是参数表还是断言的类型，
词法阶段（括号还没扫完、`=>` 还没出现）根本分辨不了（TS 自己也是靠回溯），
所以那条判据留在**参数表**那一层只会错，正确的落点是**投影那一层**（那里已经知道第二格不是 `Lamda`）。

### 第 889 轮：比较运算符的同级左结合——`<` / `>` 进关系层（9 条收掉，语料当场逮回一处回归）

**一句话**：第 888 轮那份后继字符普查顺带量出 `x < y >= z` / `x < y == z` 这一族
（18 条里 **9** 条对不上，当时记的是「另一族」）。这一轮把它收干净，根因是**一条搬错了阶段的理由**。

**根因**：[`binary-operator.xl.md`](typescript/tokens/binary-operator.xl.md) 的 `RelationalInstance`
原来只收 `<=` / `>=`，文档里给的理由是「单独的 `<` / `>` 与泛型实参同形，`GenericTypeBranch`
在**词法阶段**就要靠它们配对」——**那条理由是对的，但它属于词法阶段**：
真正的泛型段那时已经是 `GenericType` **节点**（`generic-type.xl.md` 是 `Branch`，不是 `CloseRule`），
而本规则跑在**收尾期**。于是同一个比较链里只有 `<=` / `>=` 能被折，`<` / `>` 留成裸符号：

| 源码 | 本仓（修前） | TS |
| --- | --- | --- |
| `x < y >= z` | `x < (y >= z)` | `(x < y) >= z` |
| `x == y < z` | `(x == y) < z` | `x == (y < z)`（`<` 比 `==` 紧，可它等不到自己那一趟） |
| `x < y in z` | `x < (y in z)` | `(x < y) in z` |

**修法**：把 `<` / `>` 加进关系层那一组（同一趟从左到右 ⇒ 左结合），它排在相等比较之前
⇒ `x == y < z` 里 `<` 先折，`==` 再折。**位置判据共用一条**：原来那个
`IsValuePositionBitwise` 改名成 `IsValuePositionOperator`，因为它现在管**两族**「两种位置都有含义」的符号
——`|` / `&` / `^`（类型位：联合 / 交叉）与 `<` / `>`（类型位：泛型实参段）；
判据仍是那句「父单元是不是值位容器（`Statement` / `EnumMember`）」。

**语料当场逮回一处回归**（这就是「先跑全语料再谈收了多少」的价值）：`expr-angle-assertion`
（`<T>x;` / `<T[]>xs;`，语料里**唯一**一条尖括号断言用例）从绿变红——`<T>x` 里 `>` 的左边站着 `T`
（`IsOperand` 放行），于是折成了 `BinaryOperator(T > x)`（实测**缺 4 / 多 1**）。
补的判据是 `IsAngleAssertionCloser`：**往回数配对**——遇到 `>` 记一层、遇到 `<` 消一层，
`depth === 0` 时遇到的那个 `<` 才是这一格配对的那个；它**左边什么都没有 / 不是一个操作数**
（`<T>x`、`a + <T>x`）⇒ 这一格是断言的收尾，本规则不接手。
反过来 `x < y > z` 里配对的那个 `<` 左边站着 `x` ⇒ 照旧折；`<T>x > y` 里**第二个** `>` 往回数
会先把第一个 `>` 消掉 ⇒ 也照旧折（那一格是真比较）。
**第一版判据写错过一次**（往回第一个 `<` 之前先撞上操作数就停手）：`<T>x` 里的 `T` **本身就是操作数**，
于是判据一次都没响——修法是「配没配对只由 `<` 与 `>` 的个数决定，中间的标识符 / 括号 / 逗号一概跳过」。

**实测**：`tmp/r887/snips5.mjs`（18 条比较链）**9 → 0**；全语料逐文件对拍 **16 片里 1 片失败 → 16 片全过**
（`expr-angle-assertion` 回到绿）；新增 1 条 token 用例
（[`expr-comparison-chain-mixed`](tests/cases/token/expressions/expr-comparison-chain-mixed.ts)，
`xl:expect BinaryOperator:10`）与 1 条**登记缺口**
（[`gap-angle-assertion-then-compare`](tests/cases/token/expressions/gap-angle-assertion-then-compare.ts)：
`<T>x > y` 里断言没先成形，投影把 `<T>x` 与 `x > y` 都投了出来，TS 是 `(<T>x) > y` 一层套一层
——实测缺 `BinaryExpression` / `LessThanToken` / `GreaterThanToken`，多出重复的断言与二元节点）。
`coverage` **4063 / 4241 → 4064 / 4243**（`blocked 40 → 41` 是这条新登记的缺口，`differ 138` / `bad 0` 没动）；
`cases:tsast` 八项全 0、**已知缺口 2 条还开着**（行尾那一格 + 这一格）、
`cases:astjson` 六项全 0（1466 份 / 34845 个节点）、`cases:check` 1478/1478、
`cases:tags` 4936 条断言 0 条不一致、`cases:shapes` 未覆盖 0、`runtime:*` / `samples` 全过
⇒ **九道门全绿**（墙钟 31.6s）。

**这一轮的经验**：**先问「这条理由属于哪个阶段」**。`<` / `>` 不收的那条理由（泛型要靠它们配对）
是**词法阶段**的理由，而规则跑在**收尾期**——同一句话搬错了阶段，就会挡住整整一族。
第二件：**改动最险的一处，往往由与它同族的另一条用例当场抓住**——
`expr-angle-assertion` 是语料里唯一一条尖括号断言用例，它不在这一轮的量表里，
却是这一轮唯一亮红的地方：**收完一族要立刻跑全语料**，别拿探针池的 0 当收工。

### 第 888 轮：实例化表达式那一族的四格——**被实例化的那头不止是名字**，后继字符还差五个（大普查 30 → 23）

**一句话**：第 887 轮那份新普查把 `const f = a.b.c<string>;`（TS 4.7 的 instantiation expression）
整族 7 条一次摆了出来。这一轮把它收干净，顺路量出**三处**同族的格子：

1. **被实例化的那头不止是个名字**（[`print-ast-common.xl.md`](typescript/print-ast-common.xl.md) 的规则 0a）：
   第 850 轮那一格只认 `Identifier` ⇒ `a.b.c<string>`（链在 token 层已经折成**一格** `PropertyAccess`）
   落到通用支：头一格投成 `PropertyAccessExpression`、`GenericType` 投成 `TypeReference`
   ⇒ **缺 `ExpressionWithTypeArguments` + 缺实参里的关键字**（实测 `const f = a.b.c<string>;` 缺 2 / 多 0；
   `a[c]<string>` 同形——下标链折出来的也是 `PropertyAccess`）。
   放行的判据**一点没放宽**：`IsAllowedFollower` 那道闸在 token 层，走到这里的两格**就是**实例化表达式；
   比较式（`a.b.c<string> + 1`）在 token 层已经退回裸符号 ⇒ 产物里没有 `GenericType`，这一支一次都不响。
2. **括号那一格要走 `projectExpression`**：`(a.b)<string>` 的头一格是值位括号，TS 那边是
   `ExpressionWithTypeArguments > ParenthesizedExpression`；`projectNode(Bracket, …)` 不认这一层
   （值位括号那一支在 `projectExpression` 里）⇒ 实测「缺 `ParenthesizedExpression` 1 / 多一个未映射的 `Bracket` 1」。
3. **后继闸在表达式位还差五个字符**（[`generic-type.xl.md`](typescript/tokens/generic-type.xl.md) 的
   `IsAllowedFollower`）：`]`、`?`、`:`、`||`、`&&`。它与第 850 轮补的 `;` / `)` / `,` / `??`
   是**同一条判据**——「`>` 后面那一格接不上一个操作数」⇒ `a<b>` 只可能是类型实参段：
   `[a<b>]`、`a<b> ? x : y`、`x ? a<b> : c`、`a<b> || c`、`a<b> && c`。
   **实测**（`tmp/r887/snips4.mjs`，17 条逐字符片段）：修前 **8** 条对不上、修后 **3** 条
   ——其中五格是这一档，另外三条见下（一条故意不收、两条另案）。

**三处待办，这一轮不碰**（都记在案上）：

- **`=` 不放行**（TS 认 `a<b> = c`，实测如此）：`=` 紧跟配对 `>` 时那两格是 **`>=`**
  （`a < b >= c` 是合法比较），而这里判据是**跳过空白之后的那一个字符**，拿不到「紧不紧邻」这条信息
  ⇒ 放行它会当场把 `>=` 读错。要收它得先改判据的形状。
- **行尾那一格是新登记的缺口**：TS 的 `canFollowTypeArgumentsInExpression` 最后一句是
  `return scanner2.hasPrecedingLineBreak() || isBinaryOperator2() || !isStartOfExpression();`
  ——**换行本身就是放行条件**。本仓这一格在表达式位遇到换行直接答「不是类型位」
  ⇒ `const f = a<b>` ⏎ `const g = a.b.c<string>` 整条读成比较式（TS 两边都是
  `ExpressionWithTypeArguments`，实测 TS 的 AST 里第一句到 `>` 就收、`c;` 是**另一条**语句）。
  这一格**登进语料**：[`gap-instantiation-line-end.ts`](tests/cases/token/declarations/gap-instantiation-line-end.ts)
  （`xl:known-gap`）⇒ `cases:tsast` 报「已知缺口 1 条还开着」（门照旧绿）。
  同一句里 `isBinaryOperator` 那一半还告诉我们：**单个 `|` / `&` 也该放行**（TS 那边是二元运算符），
  本仓同样没收——与行尾那一格同一族，留给后面一起量。
- **比较链的结合性**（`x < y >= z` / `x < y == z` 那一族）：`tmp/r887/snips5.mjs` 18 条里 **9** 条对不上
  （`x < y >= z`、`x < y == z`、`x == y < z`、`x != y < z`、`x === y < z`、`x < y in z`、
  `x < y instanceof z` …），症状是**同级左结合被折成了右嵌套**
  （TS 给 `(x<y) >= z`，产物给 `x < (y >= z)`）。它与实例化表达式无关，是另一族。

**用例**：新增 4 条 token（`decl-instantiation-chain` / `decl-instantiation-paren` /
`decl-instantiation-followers` / `decl-instantiation-not-comparison`——最后一条是**守卫**：
`f<number> + 1` 与 `x < y > z` 必须照旧读成比较式，`xl:absent GenericType`）
与 1 条登记缺口（上面那条 `gap-instantiation-line-end`）。
两条坑记在这里：**token 用例不写 `xl:round`**（会按覆盖层判层、要求 `// xl:end`）；
`xl:expect` 里的标签必须是**产物标签**（`PropertyAccess` / `GenericType` / `Bracket`），
写 TS 形状的 kind（`ExpressionWithTypeArguments` / `TypeReference` / `ParenthesizedExpression`）
会被 `cases:check` 当场挡下（不在标签表里）。

**实测**：大普查 993 条 **30 → 23**（收掉的正是实例化表达式链那 7 条，没有一条新的对不上）；
同族探针 `snips3`（17 条）**2 → 0**、`snips4`（17 条）**8 → 3**；
`coverage` **4059 / 4236 → 4063 / 4241**（4 条新 token 用例全过；`blocked 39 → 40` 是那条
**登记的缺口**，`differ 138` / `bad 0` 没动，加权 95.2%）；
`cases:tsast` 八项全 0、**已知缺口 1 条还开着**（就是上面那条）、`cases:astjson`
六项全 0（1465 份 / 34769 个节点）、`cases:check` 1476/1476、`cases:tags` 4935 条断言 0 条不一致、
`cases:shapes` 未覆盖 0、`runtime:*` / `samples` 全过 ⇒ **九道门全绿**（墙钟 32.1s）。

**这一轮的经验**：**「这一格凭什么敢认」这句话要跟着判据一起搬**。第 850 轮那条规则写下了
「`IsAllowedFollower` 只在接不上表达式时才让 `<…>` 成形」，可它把**「接不上」写成了四个字符**——
于是同一个理由在 `]` / `?` / `:` / `||` / `&&` 上要重说一遍，在**行尾**上还要说第三遍。
修法的形状因此是：**先读上游那道闸的原文（TS 的 `canFollowTypeArgumentsInExpression` 是一句
`switch` 加一句 fall-through）**，再决定本仓这一格该长成什么样——而不是一个字符一个字符地试。

### 第 887 轮：绑定模式里「注释算不算内容 / 算不算首位」两格——`IsTriviaUnit` 不只是**跳过**的名单，也是**判空**的名单

**一句话**：`cases:tsast` / `cases:astjson` 两侧全绿 ⇒ **AST 出口上没有「红着」的东西可修**，
所以这一轮按本仓找缺口的老办法**先做一次新普查**：`tmp/r887/gen.mjs` 把 81 个**第 869 轮那张表
之后没扫过、或很少见**的构造摆开（实例化表达式 / 导入属性 / 取值器设值器 / 参数属性 /
`for await` / `yield*` / 泛型函数类型 / 模式里的洞 …），每个词边界各插一遍 `/*c*/`（块注释）
与换行（`\n`）两种变体 ⇒ **993 条**片段（970 条 TS 自己合法，23 条 TS 自己就非法，跳过）。
一上手逮出 **33 条对不上**，其中一族**同一个根因、两种表现**，这一轮把它们收干净。

**根因只有一句话**（两处都在 [`typescript/tokens/binding-element.xl.md`](typescript/tokens/binding-element.xl.md)）：
**「这一段有没有内容 / 这个括号是不是首位」两处判据只把软换行当透明单元**，而注释
（`LineAnnotation` / `AreaAnnotation`）在同一份口径里是**同一件事**（第 817 / 818 轮定下的
`IsTriviaUnit` 那张名单）。两处各自的症状是：

1. **`Previous` 的「形参首位」那一格**（`for (let i = 0; i < index; i++)` 那个循环）：
   原来写的是 `before instanceof LineWrap` ⇒ `function f(a = 1, /*c*/ { b } = {}, [c] = []) {}`
   里那条注释算成「前面有东西」⇒ **模式判否** ⇒ 模式里的 `b` 一个 `BindingElement` 都收不到
   （实测产物 `ObjectBindingPattern` 的 `elements` 空着，TS 那边是一个 `BindingElement`：
   缺 2 / 字段名 1）。换成 `IsTriviaUnit(before)` 之后收对了，而**真正要挡的那一档一点没松**：
   `function f(a = /*c*/ { b }) {}` 里那个 `{ b }` 是**初始化式**——`=` 不在名单里，照旧判否。
2. **`AppendSegment` 的判空（以及 `Previous` 里同一个 `hasContent` 循环）**：
   原来写的是 `!(item instanceof LineWrap)` ⇒ **只装着一条注释的段**被算成「有真东西」⇒
   收成一个**零宽的 `BindingElement`**。实测 `const [a, /*c*/ , b = 2, ...rest] = arr;`：
   产物多一个零宽 `BindingElement`、TS 那边那一格是 `OmittedExpression`（第 135 轮那条
   「洞 = 零宽 `OmittedExpression`」的投影认得的是**空段**，段里多一条注释它就不认了）；
   `const { /*c*/ } = o` 同理（`Previous` 的 `hasContent` 判「有内容」⇒ 进去切段 ⇒ 多 1 个节点）。

**同族普查**（`tmp/r887/snips2.mjs`，29 条手写片段，一个进程里对拍）：修前 **16 条**对不上、
修后 **0 条**——四个宿主（`Parameter` / `BindingElement` 嵌套 / `ForeachDefine` / `CatchDefine`）、
洞在头 / 在中间 / 在尾、行注释与块注释各一档，全收。**值位那几格当守卫留着**：
`const y = /*c*/ { a };` / `f(/*c*/ { a });` / `const { a = /*c*/ { b } } = o;` 修前修后都绿
（它们本来就不该被收成绑定模式）。大普查 993 条：**33 → 30**，减掉的正是这一族三条，
没有一条新的对不上（同一个探针池连跑三次，逐条一致——这一轮的读数不是抖出来的）。

**用例**：新增 5 条 token（`decl-param-obj-pattern-comment` / `decl-param-arr-pattern-comment` /
`decl-arr-destructure-hole-comment` / `decl-obj-destructure-only-comment` /
`decl-destructure-comment-hosts`）与 1 条 runtime（
[`029-fn-param-destructure-comment`](tests/cases/runtime/functions/029-fn-param-destructure-comment.ts)，
`node` 与 `tsrun` 逐字节相同：`6` / `1 3` / `ok`）。token 用例**不写 `xl:round`**——
`case-file.mjs` 按「头里有没有覆盖层那几个键」判层，写了 `round` 就要求 `// xl:end` 收尾
（这一轮踩到过一次，记在这里免得下次再写）。

**实测**：`coverage` **4053 / 4230 → 4059 / 4236**（新增 6 条全过：token 1453 → 1458、
runtime 775 → 776；`blocked 39` / `differ 138` / `bad 0` 一格没动，加权 95.2%）；
用例 **1466 → 1471**（断言 4929 → 4928：矩阵那一条按「至少一个」写，标签计数不同）；
`cases:tsast` 八项全 0、`cases:astjson` 六项全 0（1461 份 / 34648 个节点）、
`cases:check` / `cases:tags` / `cases:shapes` / `runtime:*` / `samples` 全过 ⇒ **九道门全绿**（墙钟 30.7s）。

**这一轮没动的 30 条**（同一份普查里剩下的，家族已分好，留给下一轮）：
导入属性 `with { type: "json" }` 的换行变体 7 条、实例化表达式 `a.b.c<string>` 7 条、
泛型函数类型里 `<` 后面的注释 3 条、`async /*c*/ (x) => x` 与 `= /*c*/ <T,>(x) => x` 2 条、
`readonly` 换行后的索引签名 / `accessor` 换行的私有名 / 第二个 `case` 标签换行 /
`do /*c*/ x++` / `else if /*c*/ (c)` / `void \n 0` / `x satisfies T /*c*/ satisfies U` 各 1 条，
以及三格**行首 `<`** 的 ASI（`const x = a \n < b > c;`——TS 那一侧按类型断言读，本仓按比较读；
这一族是不是「缺口」要先想清楚口径再动手）。

**这一轮的经验**：**「注释与软换行在相邻判定里是同一件事」这条口径，写在 `Skip*` 那一侧写在 817 / 818 轮，
可「判空」的那一侧漏了两处** —— 而 `IsTriviaUnit` 那张名单**本来就是两用的**（第 818 轮的原话：
「不只是『跳过』用的名单，也是**判空**用的名单」）。第二件：**AST 出口全绿不等于没有 AST 缺口**
——缺口在「语料没写到的排版」里，而语料只会被**新构造 + 新排版**的普查加宽；
探针池里不摆新构造，口径再严也永远是绿的。

### 第 886 轮：撤掉一条挂了 45 份读数的过期台账——`coverage` 那句「台账该更新了」终于不再亮着

**一句话**：`coverage` 每次都在提醒「台账该更新了（原来记 blocked、现在过了）：
`exec/statements/084-switch-case-block-blocked`」。这一轮按规矩撤账：删 `xl:want blocked` / `xl:why`、
文件名去掉 `-blocked` 尾巴（用例留着当守卫）。**这条账第 841 轮就修好了**——
逐份读 `report.json` 数出来的：第 840 轮还是 `blocked`，第 841 轮（「switch 分段的两个差一格」）
那份读数里第一次成了 `newlyPassing`，然后**连着 45 份读数（841–885）都没人撤**。

**为什么能挂 45 轮**：`coverage` 是**尺子不是门**（用户口径：它红只在「比昨天差」），
`newlyPassing` 只**打印一行提醒**、不进退出码；而第 872 轮那份记录把立场写明了——
「它**在上一轮提交的 `report.json` 里就已经是 `newlyPassing`**……这一轮如实留着，**不替别人撤账**」。
于是它成了**没人拥有的一格**：改好它的那一轮（841）没有撤，看见它的那几轮都按「不替别人撤账」留着。
这一轮把它收掉。**收掉一格的人当场撤账**本来是规矩——`cases:tsast` 的 `xl:known-gap` 那一侧
就是这么设计的（「已经对上了就报『收掉了』并**红**」，逼你当场删行）；`coverage` 这一侧**没有那道红**，
所以同一句话能在 45 份读数里重复出现而没有任何东西变红。

**顺带补回一格被让掉的覆盖**：同一处账当初还**让掉了一格覆盖**——
[runtime/exceptions/003-exc-finally-return.ts](tests/cases/runtime/exceptions/003-exc-finally-return.ts)
原来写着「『第二个 `case` / `default` 标签』在本仓降级期是另一处已知缺口，写进来会把这条用例
整个带走（实测 `name is not a local or a capture: case`）」，所以那一格只留了 `case 1`、
`f(2)` 走「落空」那一档。这一轮**先量再改**：`tmp/two-labels-probe.ts` 三个形状
（两个 `case` 标签、`case` 后跟裸块、裸块里再嵌一个 `switch`）**`node` 与 `tsrun` 逐字节相同**
⇒ 那两个症状（`unimplemented: statement Identifier` 与 `name is not a local or a capture: case`）
现在都不再出现。于是把 `case 2` 标签补回去（`g(2)` 走的是一条**真的命中分支**），
注释改成「当时为什么让、现在为什么能补」——**让掉覆盖的那个理由消失了，就要把覆盖要回来**，
不然那条注释会一直挡着后人（它说的是一件早就不成立的事）。

**实测**：`newlyPassing` **1 → 0**（`moved` 0、`regressions` 0）；`coverage` **4053 / 4230 不变**
（blocked 39、differ 138、bad 0——撤账不动覆盖度，它动的是「台账说的」与「实测的」对不对得上）；
`cases:check` 1466/1466、`cases:tags` 4920 条断言 0 条不一致、`cases:shapes` 未覆盖 0、
`cases:tsast` 八项全 0、`cases:astjson` 六项全 0、`runtime:*` / `samples` 全过 ⇒ **九道门全绿**（墙钟 34.2s）。

**这一轮的经验**：**「只提醒、不拦」的读数需要有人拥有它**。`coverage` 该不该红是用户口径定的
（它不该红），但**「谁撤账」不能靠自觉**：看见一行已经对上的账，撤掉它就是这一轮的工作——
不必等「改出它的那个人」，因为那条账在 `git` 里已经把出处挂好了（`xl:round 789`，
以及本轮从 `report.json` 历史里数出来的 841）。

### 第 885 轮：`report.json` 里不许出现「跑一次变一次」的东西——那一份读数是**进仓**的（`.work-<pid>` 折成 `<work>`）

**一句话**：`tests/coverage/report.json` 是**进仓**的读数（每一轮都提交），可它里面有 4 行 `detail`
把裁判跑的那个临时路径 `file:///…/tests/coverage/.work-<pid>/src/<下标>.ts` **原样抄了进去**——
于是**同一次运行、两次写出来的读数不是同一份字节**。第 883 → 884 轮之间那一份 diff
**整整 4 行全是 `.work-5500` → `.work-28348`**，没有一行是台账真的动了。

**为什么这不是「无害的噪声」**：这一份文件进仓的全部意义就是**给人看 diff**——
而真正的台账变化（哪条 `blocked` 转 `pass`、哪条新登记）会被那 4 行淹掉。
更根本的是它**违反本仓的确定性口径**：`dist/ts` 那一侧要求「字节稳定」，
读数这一侧却在每次运行都写进一个 pid。

**根子**：那些用例是**故意打印 `Error` 的栈**的（`stdlib/console/011-console-log-error-stack` 一族——
`console.log(new Error("boom"))` 的栈帧**就是被测的那一格**），于是栈里带着裁判跑的那个临时文件路径。
而临时目录**按 pid 分开是故意的**（`workDir = .work-${process.pid}`：并行实例互不干扰、跑完就删）
——**运行口径没错，错在它泄进了读数**。

**修法只有一格**：`summary` 落盘前把每个 `detail` 过一遍 `stableDetail`
（[tests/coverage/run.mjs](tests/coverage/run.mjs)），把工作目录折成占位符 `<work>`。**只动报告，不动运行**：
反斜杠 / 正斜杠都认（`workDir` 是 `…\.work-123`，而 `file://` URL 里是 `…/.work-123`），
再兜一格 `.work-\d+`（换了 pid 来源时仍然稳定）；**诊断力一点没丢**——
文件名与行列号照旧在（`file:///<work>/src/2060.ts:7:13`）。

**实测**：连跑两次 `npm run coverage`，`report.json` **逐字节相同**（SHA-256 `775FAA5C…20C40`）；
与 HEAD 那一份的 diff **正好 4 行**、且每行只差工作目录那一段（台账读数一字未动）；
`coverage` **4053 / 4230 不变**（blocked 39、differ 138、bad 0）；九道门全绿。

**这一轮的经验**：**「进仓的读数」与「给人看的日志」是两种东西**，判据也不同——
日志里**要**出现真实路径（排查时那正是你要的），读数里**一个会变的值都不能有**。
所以这条修法特意**只改落盘那一趟**：控制台上照旧打真路径（`show(...)` 印的是 `r.detail` 本身），
只有写进 `report.json` 的那一份被折叠。

### 第 884 轮：出口 2（AST JSON）**第一次有了尺子**——它自己写着「今天没有专属的尺子」，一上手就逮出 5 格漂移

**一句话**：三个出口里只有 AST JSON 没有判据（[docs/ast-json.md](docs/ast-json.md) 第 5 节原话：
「**这个出口今天没有专属的尺子**」，第 6 节于是要求「改完**自己拿两个出口对一眼**」）。
这一轮把那条**靠人眼**的断言判据化：新增 `cases:astjson`（[tests/parse/ast-json.mjs](tests/parse/ast-json.mjs)），
**门数 8 → 9**；它一上手就逮出**真实存在的 5 格漂移**，一并补齐。

**要判的那句话本来只有一句**：出口 1（XML）与出口 2（JSON）说的必须是同一棵树。
而这两个出口的唯一事实来源是**同一个文件里的两处拼串**（`ToXmlString` 与 `ToDictionary`），
规格自己就写着「改了那处拼串，这里必须一起改」——**一处漂了，从前没有任何东西会响**。

**六项判据**（全 0 才退出码 0）：① 标签名 === `type`；② XML 的每个属性都在 JSON 里**同名同值**
（属性值先按 `CommonUtil.XmlDecode` 的**同一张表**解回来再比，否则 `op="&lt;="` 这种会假红）；
③ 每个节点都有合法 `range`（trivia 越界单记一栏、不进退出码，与 `cases:tsast` 同口径）；
④ **JSON 多出来的键必须在规格第 2–4 节登记过**；⑤ 命令行 === 库 API（`cjcli <文件> --ast-json`
的 stdout 逐字节等于 `Root.ToJsonString()`）；⑥ 不抛异常。

**④ 立刻逮到的那 5 格**，全是「`ToDictionary` 里写了、规格一个字没提」：
`Import.typeWordAt`、`Switch.bodyAt`、`SwitchSegment.colonPos`、`TernaryOperator.questionPos` / `colonPos`、
`StaticBlock.braceAt`。其中 `StaticBlock` **连一行字段表都没有**——它**没有 XML 属性**，那一格只活在
JSON 侧，而第 6 节原第 2 条恰恰写着「没有属性就不必覆写」：**那条规则本身是错的**，这一轮连同字段表一起改掉。
键名表的**唯一一份是规格**：这一门读的就是 `docs/ast-json.md` 第 2–4 节里的反引号名字，
所以「加一格坐标却忘了写规格」会当场红——**判据没有第二份**。

**变异测试证明这把尺子不空转**（`tmp/mutate.mjs` 改的是 `build/` 里的产物，用完 `npm run compile` 还原；
`build/` 在 `.gitignore` 里，没进仓）：JSON 键改名 → ② 报 **814**、值加尾巴 → ② 报 **814**、
XML 属性改名 → ② 报 **814**、基类 `type` 加尾巴 → ① 报 **12839**；**四次全红**。

**语料是「用例 + `samples`」，不是外部语料**：`cases:shapes` 已经证明用例侧是外部语料那 260 种形状签名的
**超集**（444 种），而这一门量的「同一个节点两个出口对不对」与形状种类一一对应；
整份外部语料单进程解析要 **~37s**（`typescript/lib` 那 4.3 MB 占大头），用例那一份只要 **~2s**——
没有理由为同一句话多花 35s 墙钟。**语料清单也不重写一份**：`corpus("cases")` 是从
[ts-ast.mjs](tests/parse/ts-ast.mjs) 导出的**同一个函数**（`tsInvalid` / `.tsx` / `known-gap`
的跳过条件只有那一处），这一轮只给它加了一个 `export`。

**实测**：`cases:astjson` **1456 份 / 34521 个节点**，六项全 0（空跑 **3.6s**、与别的门并行时 14.6s）；
`cases:tsast` 16/16 片、四方向 0、已知缺口 0；`cases:check` 1466/1466、`cases:tags` 4920 条断言 0 条不一致、
`cases:shapes` 未覆盖 0；`runtime:*` / `samples` 全过；`coverage` 4053 / 4230 不变 ⇒ **九道门全绿**
（墙钟 31.1 → **32.9s**：新门没有拖长墙钟，最慢的仍是 `coverage` 的 32.2s）。

**这一轮的经验**：**「靠人眼」写进规格的那一句，就是缺口的地址**。规格里凡是出现
「自己看一眼」「当下没有尺子」「两处必须一起改」这种话，都是**判据还没有落地**的标记——
它比缺口清单更值得先读：缺口清单说的是「哪一格不对」，而这句话说的是「**哪一句没人核**」。
这一轮的两条经验都从这一句来：一是**先找没人核的断言、再找不对的格子**；
二是**判据的输入也只能有一份**（这一门的 ④ 直接读规格、语料直接用 `ts-ast.mjs` 的函数，
两处都没有第二份答案，才不会重演「同一条判据写两份就一定会漂」）。

### 第 883 轮：简单赋值那一格也是命名位置——`NamedEvaluation` 的第四处 `FunctionNameHint`

**一句话**：`let x; x = function () {}` 之后 `x.name` 原来是 `""`（Node 给 `"x"`）——
第 778 轮就登记在 `runtime/round778/001-function-name-inference-differ` 上；
这一轮把那一行收掉，**同一句话在本仓一共要问四处**，这是第四处。

**判据本来就只有一份，缺的是「问的位置」**：JS 的 `NamedEvaluation` 认三处——
变量声明（`LowerVariable`，第 238 轮起就有）、**形参默认值**（第 882 轮补）、
**简单赋值**（这一轮）。三处用的都是同一个 `NamesFunctionValue`（「右边那东西在不在命名位置上」：
`f = cond ? () => 1 : () => 2` 里两个箭头**都不算**），名字也都由调用方给。
`typescript-exec/lowering.xl.md` 的 `LowerBinary` 那条 `=` 分支上，
`leftKind === "Identifier"` 的两条路（`access.InEnv` 与非 `InEnv`）原来直接
`LowerInto(…, Child(node, "right"))`——**没置 `FunctionNameHint`**，于是那个匿名闭包
一直是匿名的。补法与另外两处一字不差：存、置、降完还原。

**反例一条都没动、也钉住了**（新用例 `exec/round883/001-assignment-named-evaluation`，
十行与 `node` 逐字节相同）：`o.m = function () {}` 与 `arr[0] = function () {}` 在规范里
**没有** NamedEvaluation（JS 给空串），它们走的是 `PropertyAccessExpression` /
`ElementAccessExpression` 两条分支；三元那一格也不取名（`t = flag ? f1 : f2` 两个都匿名）；
**自己的名字优先**（`w = function named() {}` 给 `"named"`，不是 `"w"`）。

**这一轮的另一半是「量清楚但不猜」**：`runtime/round778/001` 与
`stdlib/round783/003-bound-function-own-cells-differ` 今天还红的那一格是
**绑定函数的 `prototype`**——`FunctionBind`（`globals.xl.md`）把目标的 `prototype`
抄到了绑定对象**自己**身上（为的是 `new (F.bind(null))() instanceof F`），
于是 `typeof f.bind(null).prototype` 给 `"object"`（Node 给 `"undefined"`）、
`Object.getOwnPropertyNames(bound)` 还多出 `__boundTarget` / `__boundThis` / `__boundArgs` 三格。
**这不是单点**：删掉那一句抄写就会把 `stdlib/round753/003` 顶红（`instanceof` 那一半），
所以两条要**同一轮收**——修法是 `vm.xl.md` 的 `CreateInstance` 认「被构造的是一个绑定对象」时
改从 `[[BoundTargetFunction]]` 取原型（`HostConstructThis` 那一段本来就区分「构造」与「调用」），
而三个内部名的收法与 `#p` 那一格同一个坎（**不能在名表那一趟按名字过滤**：
用户自己写 `{ ["__boundTarget"]: 1 }` 是一个真的自有属性名）——
要收只能给 `heap.xl.md` 的 `Property.Flags`（1/2/4 三位，第 4 位空着）**加一位「内部」标记**。
两条台账各记一份、指向同一处，**这一轮按规矩不动手**。

**实测**：`cases:tsast` 16/16 片、四方向 0、已知缺口 0；`cases:check` 1466/1466、
`cases:tags` 4920 条断言 0 条不一致、`cases:shapes` 未覆盖 0；
`coverage` **4052 → 4053 / 4230**（exec **753/791 → 754/792**、blocked 39、differ 138、
bad 0、加权 95.17%）；`runtime:*` / `samples` 全过 ⇒ **八道门全绿**。

**这一轮的经验**：**「同一个形状问几处」要一次数清**。第 882 轮补形参默认值时记下的
那句教训（「每一条建 `PendingFunction` 的路都要问一遍」）这一轮马上又兑现了一次——
同一条判据在三处落点里漂了两轮。凡是要「把某一格带下去」的改动，
**先把所有落点数一遍再动手**，比修一处、量一处、再修下一处省一轮。

### 第 882 轮：形参默认值那一格——投影走了「取一格当节点」、降级没把它当命名位置（blocked → 全过）

**一句话**：`function withDefault(f: any = function () { return 16; }) { return f.name; }`
第 778 轮量出来时**整份文件进不来**（`unimplemented: expression FunctionDeclaration`）；
这一轮两条根因一起收掉，`tsrun` 与 `node` 逐字节相同。**两条根因是两件事，缺一不可**：

**① 投影**（[lamda-parameter.xl.md](typescript/tokens/lamda/lamda-parameter.xl.md) 的 `PrintAst`）：
默认值那一格走的是「取一格当节点」（`ctx.Project(init)`），**它不置 `ctx.expressionPosition`**
⇒ 那个 `function () { … }` 按产物标签投成了 `FunctionDeclaration`，降级层当然不认。
**分界不是「函数表达式」**：`const f = function () {}` / `(function () {})()` / **当实参**那一格
都是好的（那几处早就走 `projectExpression`）——差的只有**形参默认值**这一格。
修法是与 `projectBindingElement` 的默认值那一支**对齐成同一条口径**：改走 `ctx.Expression(...)`。
两处问的既然是同一件事（「这个默认值是不是表达式」），写两份必然会漂。
顺带把「默认值加个括号」那一格（第 681 轮）也交给同一条路——`projectExpression` 自己认
「单个 `(` 括号 ⇒ `ParenthesizedOf`」，这里不再单列一支。

**② 降级**（[lowering.xl.md](typescript-exec/lowering.xl.md) 的 `LowerParamDefault`）：
①修好之后**名字仍是空的**——JS 的 `NamedEvaluation` 在 `Initializer : = AssignmentExpression`
那一支上要的是**被绑定名字的文本**，所以 `function f(a = function () {}) {}` 里那个匿名函数叫
**`"a"`**。**与字段初始化式那一处共用同一条判据**（`EmitFieldInit` 的 `nameHint`：
「值在不在命名位置上」由 `NamesFunctionValue` 答、名字由调用方给）。
**解构形参不给名**（`function f({ q } = function () {}) {}` 在 JS 里那个函数本来就是匿名的），
而那一档 `name` 传进来正好是空串 ⇒ 落回匿名，不用再判一次。

**实测**（新用例 `exec/round882/001-param-default-named-evaluation`，八种可调用体各一格）：
函数声明 / 箭头 / 对象方法 / 类表达式 / 嵌套箭头 / **加括号的** / **自带名字的**
（`function named(){}` ⇒ `"named"`，自己的名字优先）**全部与 `node` 逐字节相同**，
外加一个**解构反例**（`i({ q } = function () {})` 两边都给 `undefined`——
默认值被忽略、拆的是那个函数对象自己）。
`cases:tsast` 16/16 片、四方向 0、已知缺口 0；`cases:check` 1466/1466、
`cases:tags` 4920 条断言 0 条不一致、`cases:shapes` 未覆盖 0；
`coverage` **4050 → 4052 / 4229**（exec **751/790 → 753/791**、blocked **40 → 39**、
differ 138、bad 0、加权 **95.11% → 95.17%**）；`runtime:*` / `samples` 全过 ⇒ **八道门全绿**。

**这一轮的两条经验**：① **「一个标签、两种语义」的地方，判据只有一份**——
`Function` / `Class` 在声明位与表达式位同名不同 kind，靠的是**谁在投它**（`ctx.expressionPosition`），
所以凡是从产物标签直接 `Project` 的地方都要先问一句「这一格在表达式位吗」；
② **同一条形状的两个落点要一起修**：这一格修好投影只把 `blocked` 变成 `differ`，
名字那一半不补上，用例照样是红的（`coverage` 那一行把这条差额如实印了出来）。

### 第 881 轮：第 869 轮普查的最后两格一起收掉——`import m = ⏎ require("m")` 与 `abstract new /*c*/ () => X`（known-gap 2 → 0）

**一句话**：两条登记的缺口各自收掉，**已知缺口清单第一次清空**。两条的根因都不是
「还差一个词」，而是**同一个问题的两份答案漂了**——一处判据走了 trivia 口径、另一处没走。

**第一条**（[import.xl.md](typescript/tokens/import.xl.md) 的 `ImportCloseRule.Process`）：
`import m =` 换行 `require("m")` 里那个 `=` 的**右操作数还没到手**，可那一趟把
「已经吃到 `=`」当成这条声明写完了（那一档本来是给 `import A = B.C` 留的）⇒ 在换行那一格 `break`
⇒ 收出一个区间只到 `=` 的 `Import`，`require("m");` 另起一条 `ExpressionStatement`
（缺 `ExternalModuleReference`、漂 1、多 4）。语句层那半边第 876 轮已经问对了
（`Statement.IsPendingImportHead` 走 `Statement.LineEndsWithEquals`：**末了那个实义单元是 `=`**），
只是**导入声明的收尾规则跑在语句壳之前**、它一并壳这一段就再也轮不到下一行 —— 所以两边必须同一句话。
修法是在那一趟里按**同一口径**算「写完了没有」：`items` 里那个 `=` 只有**不在末了**时才说明写完了
（`SkipPreviousTrivia` 取末了那个实义单元）。

**第二条**（[lamda.xl.md](typescript/tokens/lamda/lamda.xl.md) 的 `IsLambdaParameters`）：
`abstract new /*c*/ () => X` 整条构造类型不成形。原先记的根因是「`abstract` 在注释收尾那一趟被升级成
`Keyword` 的**时序**」——**不对**。真正的原因是 `IsLambdaParameters` 往左看**只跳软换行、不跳注释**
（`SkipPreviousWrapSymbol`）：`(` 前面紧邻的是那条 `AreaAnnotation` ⇒ 后面每一档
（`:` / `new` / `extends` / `GenericType` / `?` / `=`）都不命中 ⇒ 落到末尾那句 `return true`「这是形参表」
⇒ `FunctionTypeCloseRule` 从 `FindParameters` 拿到 `>= 0`、把这段**函数类型**让给了箭头函数。
而**同一个问题的另外两处早就走 trivia 口径了**——`FindParameters` 的 `previousNonTrivia`
（第 621 轮）与 `FunctionTypeCloseRule.Previous` 的 `SkipPreviousTrivia`（第 817 轮）——
三处只有这一处没跟上。修法两格：往左第一步改成 `SkipPreviousTrivia`；
`new` 那一档顺手从「按 `Identifier` 类认」改成「按词认」（`WordText`，注释 / 换行会让这个词
被问到时已经是 `Keyword`，第 873 轮在 `function-type.xl.md` 的 `Process` 里量到过同一件事）。

**同一个形状不止用例那一格**（片段探针实测，都不在语料里）：
`type T = /*c*/ (a: number) => B` 原先散成裸单元、
`let f: /*c*/ (a: A) => B` 原先被收成 `<Lamda>`（值位标签），修完两条都成形为函数类型。

**实测**：全语料 `cases:tsast` **16 / 16 片**、缺 0 漂 0 多 0 字段 0、
已知缺口 **2 → 0**（两条都报「收掉了」⇒ 各删掉文件头那行 `xl:known-gap`，用例留着当守卫）、
收掉 0；`cases:check` 1466 / 1466、`cases:tags` 4920 条断言 0 条不一致、
`cases:shapes` 未覆盖 0；`coverage` **4048 → 4050 / 4228**（token **1451/1453 → 1453/1453**、
blocked **42 → 40**、differ 138、bad 0、加权 **95.11% → 95.13%**）；`runtime:*` / `samples` 全过 ⇒ **八道门全绿**。

**这一轮的两条经验**（都值得留）：① **「已经吃到 X」不等于「写完了」**——判据要落在
**末了那一格**上，否则 `A = B.C` 与 `A = ⏎ require("m")` 分不开；② **同一句判据写了两份就一定会漂**——
这一轮两条缺口的根都是「一处跳 trivia、另一处只跳软换行」，凡是「往左 / 往右找相邻单元」的判据，
先在这三处之间对齐口径再改。

### 第 880 轮：`declare global` 换行 `{ … }` 那一格——`declare` 进「等着体的声明头」词表，只认段首（known-gap 3 → 2）

**一句话**：`declare global` 换行 `{ interface W { a: number } }` 收掉——那个 `{` 是
**环境模块声明的体**，可「等着体的声明头」那张词表里没有 `declare` ⇒ 换行处收壳。

**根子**（[statement.xl.md](typescript/tokens/statement.xl.md) 的 `IsHeaderBodyBrace`）：
`{` 本身**起得了一条语句**（裸块），所以 `NextLineContinuesExpression` 只能认「上一行的末尾是一个
还差体的声明头」——遍历往回走，碰到 `while` / `for` / `switch` / `function` / `import` /
`export` / `catch` / `finally` 这八个词就答「是」。这八个**全是保留字**，所以可以无条件算头；
`declare` **是上下文关键字**（`foo(declare)` 换行 `{}` 里那个 `declare` 就是个实参，
回扫路上 `)` 是透明的）⇒ 只能认**这一段的段首**那一格。

**踩到的坑（第一版就踩了）**：段首不能用 `SkipNextTrivia(data, -1)` 求。`data` 是**容器**的子单元表，
而语料里这一段的**前面永远有几行 `// xl:…` 注释**——那些注释各是一层 `Statement`，
于是段首算出来是**注释**那一格、`declare` 被判「不是段首」，片段探针（没有注释头的两行版）
全绿而**真用例纹丝不动**。段首只能由**语句边界**划：与同一个方法里 `HasTypeColonBefore` 那一处
用**同一句** `SearchFrontIndexed(… IsStatementBoundary …) + 1`。这条经验值一提：
**片段探针不带注释头，而语料永远带**——凡是「段首 / 上一格是谁」的判据，两边都要跑。

**实测**：`tmp/declare-probe.mjs` 11 条探针（这一条 + 有 / 无注释头两版 + 同行原形 +
行尾注释 + CRLF + `export declare global` + `declare module "m"` + `declare namespace N`
+ 三条**反例**：`declare const x = 1` 换行 `{}`、`foo(declare)` 换行 `{}`、`foo()` 换行 `{}`）
**全绿**，三条反例一条都没被并起来；
全语料 `cases:tsast` **16 / 16 片**、缺 0 漂 0 多 0、已知缺口 **3 → 2**、收掉 0；
`cases:check` 1466 / 1466、`cases:tags` 4920 条断言 0 条不一致（XML 一个字节都没动）；
`coverage` **4047 → 4048 / 4228**（blocked **43 → 42**、differ 138、bad 0）、`gates` 八道全过。

### 第 879 轮：`#x` 换行 `in o` 那一格——解析期的续接词表里没有 `in` / `instanceof`（known-gap 4 → 3）

**一句话**：`return #x` 换行 `in o;` 收掉——那个软换行被**解析期**的 ASI 判成语句边界，
`in o;` 另起一条 `ExpressionStatement`，而 TS 那边是一条 `ReturnStatement` 带一个 `BinaryExpression`。

**根子**（[statement.xl.md](typescript/tokens/statement.xl.md) 的 `NextLineContinuesExpression`）：
这一半的判据落在**原始字符**上（换行那一刻下一个单元还没读进来），所以「下一个词」只能靠
一张**小词表**认——第 668 轮起是 `catch` / `finally`、第 825 轮加了 `extends`。
`in` / `instanceof` 是**保留字**（起不了一条语句、也不是任何一个成员的开头），
一行以它们开头只可能是上一行那个操作数的双目运算符，可它们不在表里 ⇒ 换行处收壳。

**为什么只补这两个词**：`of` / `as` / `is` / `satisfies` **是上下文关键字**、本身就是一个
合法的标识符表达式（`of;` 是一条语句），「一行以它开头」分不出续写与下一条语句。
这一条与第 878 轮那一格是同一句话的两半：**解析期**这一半看字符、**收尾期**那一半看下一个实义单元
（`ContinuesExpression` 那张宽表里 `in` / `instanceof` 一直都在）——两半要一起对齐，
只补一半就会「一个壳里对、另一个壳里错」。

**实测**：`tmp/in-probe.mjs` 6 条探针（这一条 + `instanceof` 同族 + 单行原形 +
映射类型 `[K ⏎ in keyof U]` + `for (const k ⏎ in obj)` + `a in b` 五条对照）**全绿**
（后两条本来就绿：它们各自的括号那一层已经按别的口径兜住了）；
全语料 `cases:tsast` **16 / 16 片**、缺 0 漂 0 多 0、已知缺口 **4 → 3**、收掉 0；
`cases:check` 1466 / 1466、`cases:tags` 4920 条断言 0 条不一致（XML 一个字节都没动）；
`coverage` **4046 → 4047 / 4228**（blocked **44 → 43**、differ 138、bad 0）、`gates` 八道全过。

### 第 878 轮：`infer V` 换行 `extends string` 那一格——收尾期的续接表里没有 `extends`（known-gap 5 → 4）

**一句话**：`U extends infer V` 换行 `extends string ? V : never` 收掉——那个软换行被
**收尾期**的 ASI 判成语句边界，`ConditionalTypeCloseRule.FindStart` 回扫第一步就停在那儿，
条件类型于是从**第二个** `extends` 起算、`InferType` 的约束那一格整段丢掉。

**根子**（[statement.xl.md](typescript/tokens/statement.xl.md) 的 `ContinuesExpression`）：
ASI 有**两半**，各自一份实现——解析期那一半（`NextLineContinuesExpression`，判据落在**原始字符**
上、第 568 轮起）与收尾期那一半（`ContinuesExpression`，判据落在**下一个实义单元**上）。
第 825 轮给解析期那一半补了 `extends`（`function f<T` 换行 `extends U>(…)` 那一族），
**收尾期这一半没跟上**：

    type T<U> = U extends infer V ⏎  extends string ? V : never;

左边 `V` 写完了（`IsLineBreakIncompleteOnLeft` 答否），右边的词 `extends` 又不在续接表里
⇒ `IsLineBreakBoundary` 答「是边界」⇒ `FindStart` 从 `extends` 那里起算，
收出 `ConditionalType[第二个 extends, never]`，而 `infer V` 落在外面成了平级单元——
`InferType.Process` 再来问时，`V` 后面已经不是 `extends` 了（那一格被条件类型吃掉了），
于是约束整格丢掉（实测缺 `ConditionalType` / `InferType` / `TypeParameter` /
`StringKeyword` / `TypeReference` / `Identifier` / `NeverKeyword` 共 8 处、多 0、漂 0）。

**修法只有一格**：把 `extends` 补进收尾期的续接表——它**起不了一条语句**
（继承子句、接口的 `extends`、泛型形参的约束、条件类型的 `A extends B` 都接着上一行写）。
`catch` / `finally` **不补**：它们虽然也起不了一条语句，但左边那一半（`try { … }`）已经写完，
「起不了一条语句」与「上一行还没写完」是两句不同的话。

**实测**：`tmp/infer-probe.mjs` 6 条探针（这一条 + 单行原形、无行尾空格、
注释夹在 `infer` 前、换行落在 `infer` 与名字之间、换行落在约束之后，五条对照）**全绿**；
全语料 `cases:tsast` **16 / 16 片**、缺 0 漂 0 多 0、已知缺口 **5 → 4**、收掉 0；
`cases:check` 1466 / 1466、`cases:tags` 4920 条断言 0 条不一致（XML 一个字节都没动）；
`coverage` **4045 → 4046 / 4228**（blocked **45 → 44**、differ 138、bad 0）、`gates` 八道全过。

### 第 877 轮：`export { a } ⏎ from("m")` 那一格——路径装在 `Method` 里（known-gap 6 → 5）

**一句话**：`export { a }` 换行 `from("m")` 收掉——那条模块路径不是平级的 `String`，
而是被 `MethodCloseRule` 收进了 `Method(name="from")` 里面。

**根子**（[print-ast-common.xl.md](typescript/print-ast-common.xl.md) 的 `namedExportClause`）：
具名导出的 `moduleSpecifier` 原来只在 `Export` 的**本层**找 `String`
（`kids.find(k => k.type === "String")`）。`from("m")` 里那个字符串在**里面**，
于是整格丢；而那一对括号连带字符串又被通用投影投成一个平级的 `ParenthesizedExpression`
（实测缺 `StringLiteral` / `ParenthesizedExpression` 各一格、字段名差 1）。
修法三格：

1. **`moduleSpecifierIn`**：本层找 `String`；找不到时**只往 `Method` 里面**再看一层
   （`allKids`）。**不能一律递归**——`export { "a-b" as c }` 的字符串名就在具名子句的
   **花括号里**，那是 `ExportSpecifier` 的名字、不是模块路径（第一版一律递归，
   `mod-export-string-name` 当场红：字段名差 1）。
2. **`moduleHolderOf`**：那个字符串**装在谁里面**；自己就在本层时给 `undefined`
   （那条路照旧直接投字符串）。
3. **那一格是 `ParenthesizedExpression`**：TS 那边 `from("m")` 的 `moduleSpecifier` 是
   **括号里**那个 `StringLiteral`，而括号那一格是 `ParenthesizedExpression`——
   区间 `[左括号, 字符串末尾)`（**不含右括号**；`endOf` 在这一层给的是闭右端，所以写 `+1`）。
   照 `Method` 自己的两端给会多出一格 `[13,22)`（把 `from` 也圈进去）。

**踩到的两格**：① `Method` 的字典把实参表**摊平**成 `children`，所以 `holder` 就是那个 `Method`、
`holder` 的子节点里**没有** `Bracket`——别去找括号（找不到）；② **`projectableKids(view(x))`
是错的**（`view` 之后再 `projectableKids` 会把已经是视图的对象再 `view` 一次 ⇒
`k instanceof Map` 全为假）。要子节点用 `allKids(view(x))` 或 `kidsOf(x, "children")`。

**实测**：`tmp/r875/exp2.mjs` 4 条探针**全绿**（这一条 + `export * as ns ⏎ from "m"`、
`export { a } ⏎ from "m"`、`export { a }` 换行 `const x = 1;` 三条对照）；
全语料 `cases:tsast` **16 / 16 片**、缺 0 漂 0 多 0、已知缺口 **6 → 5**；
`cases:check` 1466 / 1466、`cases:tags` 4920 条断言 0 条不一致；
`coverage` **4044 → 4045 / 4228**（blocked **46 → 45**、differ 138、bad 0）、`gates` 八道全过。

### 第 876 轮：`export { a } ⏎ from "m"` 那一格——「自己就完整」也要看右边那一行（known-gap 7 → 6）

**一句话**：`export { a }` 换行 `from "m"` 收掉——花括号子句到手时 `IsComplete` 就答「写完了」，
可下一行那个 `from` 说明这条声明还没写完。

**根子**（[export.xl.md](typescript/tokens/export.xl.md) + [statement.xl.md](typescript/tokens/statement.xl.md)）：
`ExportCloseRule.IsComplete` 对花括号那一支的判据是「子句到手就完整」（`from` 是可选的，
`export { a };` 就是一条完整声明）——**左边看不出来**。换行那一刻 `from` 还没读进来，
所以判据只能落在**原始字符**上：这一段有花括号、还没有 `from`、而下一行以 `from` 这个词开头
⇒ 还没写完。两处问的是同一句（语句壳 `Statement.IsPendingExportHead` 与收尾规则
`ExportCloseRule.Process`），所以本体只写一份：`NextLineStartsWithWord`。

**为什么它住在 `text-common-util.xl.md`**：`export.xl.md` 反过来被 `statement.xl.md` import
（`export_1` 那一格）⇒ 两处共用的那一格只能放在**两者共同的下层**。同一个扫描
（跳过空白与注释取下一行第一个实义字符）的三个用户一起搬过去了：
`SkipSourceTriviaFrom` / `NextLineFirstCharAt` / `NextLineStartsWithWord`；
`Statement` 那两格现在只是转发（`NextLineContinuesExpression` 的注释里一直写着它们）。

**踩到的两格**（都写进了各自的注释里，别再踩）：
① `ExportCloseRule.Process` 里那个 `i` 是**外层**的（`isPrefixOnly` 那一支用的是它）——
新建 `Source` 时要取 `newline.SourceRange.Start.Index`，拿 `i` 会从 `export` 中间开始扫；
② `IsPendingImportHead` 里 `=` 那一格的返回值**写反了**（`LineEndsWithEquals(data) === false`）——
`true` 是「还没写完」，所以直接返回它。

**实测**：`tmp/r875/remaining.mjs` 9 条探针（7 条已知缺口 + 2 条对照）里这一条转绿；
全语料 `cases:tsast` **16 / 16 片**、缺 0 漂 0 多 0、已知缺口 **7 → 6**；
`cases:check` 1466 / 1466、`cases:tags` 4920 条断言 0 条不一致（XML 一个字节都没动）；
`coverage` **4043 → 4044 / 4228**（blocked **47 → 46**、differ 138、bad 0）、`gates` 八道全过。

**同一轮里试过、**没**收掉的那一条**（`gap-r869-import-equals-newline-3`）：`import m =` 换行
`require("m")` 里 `=` 的右操作数还没到手，而 `ImportCloseRule.Process` 在换行那一格就 `break`
（它按「已经吃到 `=` 就算完整」判）。这一轮把 `IsPendingImportHead` 的那一格判据修对了
（`LineEndsWithEquals` 那一处返回值写反），语句壳那一侧现在**答得对**（实测
`IsPendingImportHead(data) === true`），可收尾规则那一侧仍然先收壳——两处的时序还没理清，
如实留着（差额从「多 4」没动）。**下一步的第一站**：`ImportCloseRule.Process` 与
`StatementBranch.Condition` 在换行那一格谁先跑（`GeneralCloseRule` 里 `Import` 排在
`Statement` 之前，而语句壳是**解析期**的 `Branch`）。

### 第 875 轮：`import type` 与 `typeof import(...)` 那两格——注释落在 `type` / `typeof` 两侧（known-gap 10 → 7）

**一句话**：三条同根的缺口一起收掉——`import /*c*/ type { A }`、`import type /*c*/ { A }`
（两条 `import-type-comment-*`）与 `typeof /*c*/ import("m")`（`import-typeof-comment-4`）。

**根子有两处，都是「相邻的那一格」这条线的第六面**（第 817 / 828 / 872 / 874 轮那条线）：

1. **`import` / `export` 后面那个 `type` 词**（[type-literal.xl.md](typescript/tokens/type-literal/type-literal.xl.md)）：
   `IsTypePosition` 里那条「`type` 前面是 `import`/`export` **而且** `type` 后面紧跟一个 `{`」
   走的是 `SkipPreviousWrapSymbol` / `SkipNextWrapSymbol`（只跳软换行）。夹一条注释时
   `afterType` 是那条 `AreaAnnotation`（`import type /*c*/ {`）、或者 `beforeType` 是它
   （`import /*c*/ type {`）⇒ 答否 ⇒ 那个 `{` 被收成 **`TypeLiteral`**、里面每个名字还成了一个
   `Field`（`import /*c*/ type { A }` 实测缺 `ImportClause` / `ImportSpecifier` / `Identifier`
   各一格、多一个 `[7,23)` 的 `ImportClause`；`-2` 缺 `ImportSpecifier` / `Identifier` 各一格）。
   **判据只写一份**：[text-common-util.xl.md](typescript/text-common-util.xl.md) 新增
   `IsImportExportTypeClauseBrace(units, index, requireBrace)`，把原来的那一句搬进去、两侧都走
   `SkipPreviousTrivia` / `SkipNextTrivia`；`DecideBracketContext` 在**开括号那一刻**问的是同一句
   （它那一趟括号还没进 `units`，所以第三个参数为 `false`——「跨过 trivia 之后后面什么都没有」）。
2. **`ImportTypeCloseRule.Process` 往左找 `typeof`**（[import-type.xl.md](typescript/tokens/import-type.xl.md)）：
   原来也走 `SkipPreviousWrapSymbol` ⇒ `typeof /*c*/ import("m")` 里 `previous` 是注释、
   `WordText` 读不出 `typeof` ⇒ 那个词留在外面、整段退回 **`TypeQuery`**
   （缺 `ImportType` / `LiteralType` / `StringLiteral` 各一格）。改成 `SkipPreviousTrivia` 之后
   注释由 `Process` 的搬运循环一起收进来——**判据跨了、搬运也跟着跨**（第 816 轮那条规矩）。

**顺带补的一格口径**（同一个现场量出来的）：`ImportClause` 的起点原来**回原文里跳空白**
（`ctx.FirstCodeAfter(source, v.start + "import".length)`）——`import /*c*/ type { A }` 里它先命中
注释 ⇒ 起点落在 `/*c*/` 上。现在**认下那一格的那一刻就把位置记下来**：
`Import` 多一个 `TypeWordAt` 字段（`ReadClause` 认出 `type` 时写，与 `NamedBraceAt` 同款），
投影从字段读、字段缺失才退回原文找。它**不进 XML**（`ToXmlString` 那五个属性照旧），
只进 `ToDictionary`——投影读的是字典，不带这一格等于没写。

**实测**：`tmp/r875/import-type.mjs` 5 条探针**全绿**（三处缺口 + `import type { A }` /
`typeof import("m")` 两条对照）；全语料 `cases:tsast` **16 / 16 片**、缺 0 漂 0 多 0、
已知缺口 **10 → 7**；`cases:check` 1466 / 1466、`cases:tags` 4920 条断言 0 条不一致
（**XML 一个字节都没动**——`TypeWordAt` 不进 XML 就是为这个）；
`coverage` **4040 → 4043 / 4228**（blocked **50 → 47**、differ 138、bad 0）、`gates` 八道全过。
三条用例的 `xl:known-gap` 行换成「第 875 轮转绿」的说明，**用例留着当守卫**。

### 第 874 轮：`infer` 的约束那一格——`IsInsideExtendsType` 的回扫跨过注释（known-gap 11 → 10）

**一句话**：`U extends /*c*/ infer V extends string ? V : never` 收掉——`infer` 的约束不再被丢掉。

**根子**（[infer-type.xl.md](typescript/tokens/infer-type.xl.md)）：`Process` 里那条判据问的是
「这个 `infer` 是不是落在某个条件类型的 `extendsType` 位置上」（是 ⇒ 后面那个 `extends` 只能是
**它自己的约束**），而 `IsInsideExtendsType` 回扫时**只跳软换行**——`U extends /*c*/ infer V …` 里
`infer` 前面紧挨着的正是那条 `AreaAnnotation` ⇒ 答否 ⇒ 判据翻向另一边 ⇒ **约束整段丢掉**
（实测 `InferType` 只到 `V` 为止、缺 `StringKeyword`，`InferType` / `TypeParameter` 两格区间一起漂）。
改成 `SkipPreviousTrivia`（与同一文件 `Previous` 里第 667 轮那一处同一个口径）之后 8 条片段探针
**7 条转绿**。

**同族没做的一格**（如实留着）：`infer V` 换行 `extends string`（`gap-r869-infer-extends-newline-7`）——
换行落在**名字与 `extends` 之间**，症状完全不同（整条 `ConditionalType` 都缺）：那一格是
**ASI 判据**的问题（左边末尾是名字 `V`、右边那行以 `extends` 开头），不是 `infer` 规则的问题。

**另外两处试过又整份撤回**（`import` 那一族，两条用例仍开着）：
`import /*c*/ type { A }` / `import type /*c*/ { A }` 的根**不在** `Import.ReadClause` 的按位置读
（把前导 trivia 跳过去之后逐字读数一个字节都没动），也**不在** `DecideBracketContext` 里
「`import` 后面的 `type` ⇒ 值位」那一支（把它的前后两格换成 trivia 口径之后同样一个字节都没动）。
真实根因是那条注释让 `{ A }` 在**开括号那一刻**被判成了**类型字面量**（XML 里是一个 `TypeLiteral`，
`imported` 因此空着）——下一轮从「谁把这个 `{` 收成类型字面量」入手。按「没被验证过的判断不留」
两处都撤掉了。

**实测**：`npm run gates` **八道全过**（墙钟 35.2s）；`cases:tsast` 八项全 0、
已知缺口 **11 → 10 条还开着、0 条已经收掉**。

**数字**：`coverage` **4039 → 4040 / 4228**（token **1442 → 1443 / 1453**、blocked **51 → 50**、
differ 138、bad 0、加权 95.0%）；用例 1466 条**没动**。

### 第 873 轮：构造签名那一族 + 两条 ASI 判据——六条收掉（known-gap 17 → 11）

**一句话**：第 869 轮普查剩下的 17 条里再收 6 条，落点是**两个根**：
构造签名 / 函数类型的 trivia 口径（4 条），以及「**头还没写完 ⇒ 换行不是语句边界**」那一族的
两个新落点（2 条）。

**根一：`new` / `abstract` 那两格也是「相邻的那一格」**（第 872 轮那条线的第六面）——
[binary-operator.xl.md](typescript/tokens/binary-operator.xl.md) 之外还有三处只看紧邻：

- [function-type.xl.md](typescript/tokens/function-type.xl.md)：`Process` 往左找形参表前面的 `new` / `abstract`
  用的是 `SkipPreviousWrapSymbol` ⇒ `abstract /*c*/ new () => X` 与 `abstract new /*c*/ () => X`
  里那两格取到的是 `AreaAnnotation` ⇒ 整条构造类型不成形（`gap-r869-abstract-construct-comment-4` / `-newline-4`）；
- [signature.xl.md](typescript/tokens/signature/signature.xl.md)：成员签名 `new /*c*/ (a: number): X`
  （`Previous` 与 `Process` 成对改）⇒ 少了它这条签名被 `MethodDeclarationCloseRule` 抢成 `MethodSignature`
  （`gap-r869-optional-call-signature-comment-8`）；
- [parameter.xl.md](typescript/tokens/parameter.xl.md)：`IsConstructSignature` 的判据**自己写的是
  「第一个实义子单元」**，代码只跳 `LineWrap` ⇒ 注释占第一格时形参表里一个 `Parameter` 都收不成。

**根二：两条 ASI 判据**（[statement.xl.md](typescript/tokens/statement.xl.md)）——
`IsLineBreakBoundary` / `LineCannotEnd` 那一族补了两个「左边一定没写完」的形状：

- `IsVariableTypeAnnotationColon`：末尾是 `:`，而它前面是**声明头那个 `Let` 单元**
  （`const` / `let` / `var` 那三个词到这一刻已经折进 `Let` 的字段里——按**词**判一次都不响，
  第 826 轮「先问那个单元现在成形了吗」在这里又验了一遍）⇒ `const s:` 换行 `string = ""` 是一条声明
  （收掉 `gap-r869-unique-symbol-newline-3` 与 `gap-r869-declare-module-wildcard-newline-6`）；
- `IsPendingTypeModifier`（住在 [text-common-util.xl.md](typescript/text-common-util.xl.md)，
  `AliasEnd` 与 `IsLineBreakIncompleteOnLeft` 共用一份实现）：末尾是**还在等操作数的类型词**
  （`keyof` / `typeof` / `readonly` / `unique` / `infer` / `asserts` / `new` / `abstract`）
  **而它前面是 `:` 或 `=`**（证据是「这两格右边一定是类型」，否则一个叫 `unique` 的变量独占一行
  也会被判成续接）⇒ 收掉 `gap-r869-unique-symbol-newline-4` / `gap-r869-abstract-construct-newline-4`；
  另按规矩补一条守卫用例 `declarations/var-type-annotation-newline`（`let s:` 换行 `string;`
  与 `const t: unique` 换行 `symbol;`——这两种排版原来的语料里一次都没出现过）。

**实测**：`npm run gates` **八道全过**（墙钟 29.8s）；`cases:tsast` 八项全 0、
已知缺口 **17 → 11 条还开着、0 条已经收掉**（6 条的 `xl:known-gap` 行按规矩删掉，用例留着当守卫）。

**数字**：`coverage` **4032 → 4039 / 4228**（token **1435 → 1442 / 1453**、blocked **57 → 51**、
differ 138、bad 0、加权 95.0%）；用例 **1465 → 1466** 条（新补的那条守卫用例）。

**没做、如实留着的两格**（都是这一轮**量到**的，不是没看见）：

- `abstract new /*c*/ () => X`（注释夹在 `new` 与形参表之间、**而前面还有一个 `abstract`**）
  仍然不成形——它不是 trivia 口径的问题（`zzz new /*c*/ () => X` / `readonly new /*c*/ ()` 都是好的），
  根在 `Keyword.IsUpgradable`（第 848 轮）那一趟：注释收尾时 `abstract` 被换成 `Keyword`，
  之后 `FunctionTypeCloseRule` 就再也轮不到。用例留着、`xl:known-gap` 留着，
  行里写的就是这条新根因；
- `coverage` 提醒里那条旧台账 `exec/statements/084-switch-case-block-blocked` 照旧没动（理由见第 872 轮）。
  **（第 886 轮补记：已撤账**——用例改名 `084-switch-case-block`，`newlyPassing` 清零。）

### 第 872 轮：二元运算符两侧的操作数改走 trivia 口径——枚举成员初始值那一族四条收掉（known-gap 21 → 17）

**一句话**：`enum E { A = 1 /*c*/ << 2 }` 那一族（4 条）收掉——运算符两侧「相邻的那一格」现在按
`IsTriviaUnit` 口径找：注释与软换行在相邻判断里**是同一件事**（第 817 / 828 轮那条线的第五面）。

**根子**（[binary-operator.xl.md](typescript/tokens/binary-operator.xl.md)）：`Previous` 判
「左右两边都是操作数」时用的是 `SkipPreviousWrapSymbol` / `SkipNextWrapSymbol`（**只跳软换行**）——
`1 /*c*/ << 2` 里取到的「左操作数」是那条 `AreaAnnotation` ⇒ `IsOperand` 判否 ⇒ **整格根本不折**
（`1 << /*c*/ 2` 是同一格的另一半：右操作数取到注释）。
症状落在**枚举成员的初始值**上最硬：`EnumMember.PrintAst` 只投 `=` 后面**那一格**，
折不出来就只剩第一个字面量 ⇒ `BinaryExpression` / 运算符 / 字面量**一起丢**（实测缺 3）。
语句那一层看着是好的（`Statement` 把整段平列表交给 `projectExpression`，投影自己会折），
所以这四条只在枚举这一侧显形——**同一个形状两处各写一遍就是两处会漂**。

**改法**：`Previous` 的左右两格、`Process` 的 `beforeIndex` / `afterIndex`（第 816 轮那条
「判据跨过什么、搬运就必须跨过什么」的成对改法），以及同一条线上的四处链走法
（NCO 链 / `as` 基名 / `PropertyAccess` 链 / `**` 右结合）一起换成 `SkipPreviousTrivia` / `SkipNextTrivia`。

**实测**：`npm run gates` **八道全过**（墙钟 33.9s）；`cases:tsast` 八项全 0、
已知缺口 **21 → 17 条还开着、0 条已经收掉**（4 条的 `xl:known-gap` 行按规矩删掉，用例留着当守卫）。

**数字**：`coverage` **4028 → 4032 / 4227**（token **1431 → 1435 / 1452**、blocked **61 → 57**、
differ 138、bad 0、加权 **94.9% → 95.0%**）；语料 1465 条**没动**。

**另记一笔（这一轮没动）**：`coverage` 的提醒里挂着一条旧台账
`exec/statements/084-switch-case-block-blocked`（**第 886 轮已撤账**，见那一轮）——它**在上一轮提交的 `report.json` 里就已经是
`newlyPassing`**（不是这一轮改出来的），这一轮如实留着，不替别人撤账。

### 第 871 轮：泛型参数表认不出「这一格是声明头」——`type /* c */ T<U>` 那三条收掉（known-gap 24 → 21）

**一句话**：`type /* c */ T<U> = …` / `type /* c */ T<U> = { … }` 那一族（3 条）收掉——
`<U>` 现在被包成 `TypeParameter`，`TypeAliasDeclaration` 的 `typeParameters` 那一格回来了。

**根子**（[type-parameter.xl.md](typescript/tokens/type-parameter.xl.md)）：参数表那三条件里有一条
`IsDeclarationHeaderBefore`——「`<T>` 前面那个名字的**再前面**是不是 `function` / `class` / `type`…」。
它两步都走 `SkipPreviousWrapSymbol`（**只跳软换行**），而 `type` 与名字之间的注释在产物里是
一条 `AreaAnnotation` ⇒ 第二步撞在注释上 ⇒ 答否 ⇒ `IsParameterList` 整条不成立 ⇒
`<U>` 不成参数表（实测缺 `TypeParameter`、`typeParameters` 字段整个没有、名字那一格漂到注释上）。
同一条线上的另外三处（`IsParameterList` 里「成员体的 `<T>` 后面紧跟 `(`」那一格、
`IsExpressionParameterList` 的左右两格）一起换成 trivia 口径——**同一件事只留一种跳过口径**。

**实测**：`npm run gates` **八道全过**（墙钟 31.2s）；`cases:tsast` 八项全 0、
已知缺口 **24 → 21 条还开着、0 条已经收掉**（3 条的 `xl:known-gap` 行按规矩删掉，用例留着当守卫）。

**数字**：`coverage` **4025 → 4028 / 4227**（blocked **64 → 61**、differ 138、bad 0、加权 94.9%）；
语料 1465 条**没动**。

### 第 870 轮：类型谓词那一族六条收掉——`x is T` / `asserts this is A` 里夹注释、返回类型的谓词跨行（known-gap 30 → 24）

**一句话**：上一轮普查登记的 30 条里，**类型谓词**那一族（6 条）先收：
`x /* c */ is string`、`asserts /* c */ this is A`、以及 `function f(x): x is string` 换行 `{`。

**根子两个，都在「相邻」这一件事上**：

1. **判据一路数下标**（[type-predicate.xl.md](typescript/tokens/type-predicate.xl.md)）：
   `IsPredicateAt` 原来写的是 `Get(units, cursor + 1)` / `Get(units, cursor + 2)`,
   `Previous` 的「容器的第一格」也只跳过 `LineWrap`（`SkipPreviousWrapSymbol`）——
   注释插在 `asserts` 与名字之间、名字与 `is` 之间、`is` 与类型之间，或落在第一格之前，
   形状就判不出来（实测 `asserts /* c */ this is A` 缺 5 多 2、`x /* c */ is string` 缺 2 多 1）。
   改法就是第 817 / 828 轮那条线的第四面：**四格全部走 `SkipNextTrivia` / `SkipPreviousTrivia`**，
   「第一格」那一段的跳过口径也从「只跳软换行」改成 `IsTriviaUnit`
   （注释与软换行在类型位里是同一件事）。
2. **声明头的往回走只给两个名字的预算**（[statement.xl.md](typescript/tokens/statement.xl.md) 的
   `IsHeaderBodyBrace`）：`function f(x: unknown): x is string` 换行 `{` 里，返回类型位是
   **三个标识符**（`x` / `is` / `string`）——判据走到第三个就答否 ⇒ 壳在换行处关掉 ⇒
   `FunctionDeclaration` 的区间少一截、多一个同名节点（实测 `type-predicate-newline-6`）。
   修法：**谓词里的 `is` / `asserts` 不占名字预算**，而见过 `is` 之后那个谓词参数名多占一格
   （返回类型位上它不是「类型名」）。预算这一条本身没放宽——`foo()` 换行 `{}` 照旧答否。

**实测**：`npm run gates` **八道全过**（墙钟 33.6s）；`cases:tsast` 八项全 0、
已知缺口 **30 → 24 条还开着、0 条已经收掉**（收掉的 6 条按规矩**删掉各自的 `xl:known-gap` 行**，
用例留在语料里当守卫——`xl:expect` 一个字没改，因为红只在 `cases:tsast` 那一侧）。

**数字**：`coverage` **4019 → 4025 / 4227**（blocked **70 → 64**、differ 138、bad 0、
加权 94.8% → 94.9%）；语料 1465 条**没动**（这 6 条是上一轮就登进来的）。

### 第 869 轮：模块声明那两处「`;` 之前没有 ASI」——`export * as ns` 的换行收掉，同一次普查把 **30 条新缺口**登进语料（known-gap 0 → 30）

**一句话**：`export * ⏎ as ns ⏎ from "m"` 这一族（四种换行排版）与 `export /* c */ as namespace Foo`
收掉；同一次普查在新一点的构造（`using` / `accessor` / `satisfies` / `infer V extends` /
`unique symbol` / `abstract new` / 模板字面量类型那一族）上量出 **30 处**与 TS 不同，
**逐条写成带 `xl:known-gap` 的用例**进语料——所以这一轮的数字是「收掉 7 处、登记 30 条」。

**普查怎么做的**：`tmp/r869/gen.mjs` 把 46 个构造（每个构造一条基线与它的每个 token 边界 ×
`/*c*/` / 换行两种变体）摊成 **689 条小片段**，交给片段探针
（`node tests/parse/ts-ast.mjs --snippets tmp/r869/snips.mjs`）：**670 条合法、19 条 TS 自己就非法、
36 条对不上**。这一轮的修法是前两条，其余按规矩进台账（见下）。

**根子（这一轮修的那两处）**：

1. **`ExportCloseRule.Process` 的「跨 trivia」判据太窄**（[export.xl.md](typescript/tokens/export.xl.md)）：
   第 669 轮那一版只在**一格都没收到**时跨过注释 / 换行（那是给 `export ⏎ { a as b }` 用的），
   而导出声明还有三种「写了一半」的形状——`export *` / `export * as ns` / `export * from`
   ——它们在换行那一格都**还不能算写完**（TS 里导出声明直到 `;` 之前没有 ASI）。
   判据换成 `IsComplete(items)`：**四种收尾形状**分三支判——星号那一支要 `from` 与路径、
   花括号那一支子句到手就算写完（写了 `from` 就等路径）、`=` / `default` 那一支要等操作数。
2. **语句分派层少一格与 `import` 对称的入口**（[statement.xl.md](typescript/tokens/statement.xl.md)）：
   第 829 轮给导入声明加过 `Statement.IsPendingImportHead`（「头还没写完 ⇒ 换行不是语句边界」），
   导出这一侧一直没有 ⇒ 壳在换行处就关了，`ExportCloseRule` 只看得到半截。
   新加的 `Statement.IsPendingExportHead` **复用收尾规则那一份 `IsComplete`**（判据只写一份），
   另加一支 `export as namespace <名字>`：第三格是 `namespace`、第四格才是名字，换行正好落在名字之前时还没写完。
3. **`export /* c */ as namespace Foo`**（[namespace-export.xl.md](typescript/tokens/namespace-export.xl.md)）：
   四段判定原来走 `SkipNextWrapSymbol`（只跳软换行）⇒ 挨着的那条注释被当成第二格。
   改成 `SkipNextTrivia`——与 `export` / `import` 那两处同一口径（判据本来就是「下一个实义单元」）。

**如实留着的一条**（登了用例、没修）：`export { a }` 换行 `from "m"`。
花括号子句**自己就完整**，而判定发生在**解析期的换行那一刻**——那一刻 `from` 还没读进来
（与 `NextLineContinuesExpression` 那条「右半截只有原始字符问得出来」同一个限制），
要修就得为这一格单开一次原始字符前瞻；形如 `export { a } ⏎ from("m")` 的 TS 纠错形态同族。

**新登的 30 条**（各带一条 `// xl:known-gap`，按落点立着；逐条根因写在文件头）：
`import /*c*/ type { A }` 与 `type /*c*/ T<U>` 那一格（`type` 与子句 / 别名之间的注释）、
`typeof /*c*/ import("m")`（`ImportType` 被收成 `TypeQuery`）、`unique ⏎ symbol`、
`abstract ⏎ new () => X`、`asserts this is A` 与 `x is string` 里注释 / 换行落在三段之间、
`infer V extends ⏎ string`、`new /*c*/ (a: number): X`（构造签名被收成 `MethodSignature`）、
枚举成员初始值里 `1 /*c*/ << 2`、`#x ⏎ in o`、`declare ⏎ global`、
环境模块体里 `const c: ⏎ string`、`import A = ⏎ require("m")`。

**实测**：`npm run gates` **八道全过**（墙钟 33.4s）；`cases:tsast` 那八项（缺 / 漂 / 多 / 字段 /
未映射 / 缺 range / 越界 / 抛异常）**全 0**、已知缺口 **0 → 30 条还开着、0 条已经收掉**。

**数字**：语料 **1429 → 1465** 条（+30 缺口用例、+6 守卫用例）；
`coverage` **4013 → 4019 / 4191 → 4227**（blocked **40 → 70**、differ 138、bad 0、加权 95.1% → 94.8%）；
`cases:tags` 一致 **0** 条；`cases:shapes` 未覆盖 **0**。

### 第 868 轮：`[` 那一格读它自己的 `Context`——元组元素位的类型字面量收掉，**已知缺口清单空**（known-gap 1 → 0）

**一句话**：`gap-type-tuple-element-literal`（`` type T = [/* c */{ a: 1 }] ``，缺 3 多 2）第三次尝试
终于收掉——`[` 里面那个 `{` 现在是 `TypeLiteral`（TS 的形状），而值位的数组字面量一处没动。

**为什么前两次不成**（第 849 / 851 / 865 轮，记在缺口文档「被否决的改法」第 5、6 条）：
那几版都在改**同一支的判据**（把「括号里的第一个 `{`」那一支从 `(` 放宽到 `[`、
或者加一道 `IsTypeBracketPosition` 闸）。这一版换了个答案来源：**`[` 自己那一格**——

```text
type T = [{ a: 1 }]        `[` ⇒ "type"   （元组类型：往回撞上 `=`、再跨过 `T`、最后是 `type`）
const a = [{ b: 1 }]       `[` ⇒ "value"  （数组字面量：往回撞上 `= const`）
f([{ a: 1 }])              `[` ⇒ "value"
const o = { b: [{ c: 1 }] } `[` ⇒ "value"
```

`Bracket.Context` 是**开括号那一刻**算好的（`DecideBracketContext`），与重组时序无关——
第 855 轮试过这条路、当时不成立，**因为它本身是错的**。这一轮把三个会给错答案的入口逐个堵上：

1. **冒号那一支**（第 865 轮记下的那一半）：跨过 `=` 之后撞上的冒号不是本括号的标注 ⇒ 值位。
   `const tree: Tree = { … }` 往回扫先撞 `=`、再跨过 `Tree`、最后才撞上标注那个 `:`。
   **这一轮才量清它单独并不出错**：光打这一半在四个「掉下去」的文件上 XML 逐字节不变
   （第 865 轮的 A/B 把补丁打到了两份拷贝上，比的是同一份）。
2. **`typeof` 后面的 `[` 要继续往前扫**：`typeof` 是那批类型位关键字里**唯一一个值位也天天出现**的
   （`typeof ([{ v: 1 }] as any)[0]` 是合法的值写法）。照判 `"type"` ⇒ 里面的 `{ v: 1 }` 成了
   `TypeLiteral`（`exec/round711/001` 红——**这一档第 865 轮没量到**）。
3. **绑定模式里的 `[`**：`const { x: [{ y }] } = o` 那个 `x:` 是**重命名**冒号、不是类型标注，
   而 `DecideBracketContext` 撞上它时 `crossedAssignment` 还是假 ⇒ 那个 `[` 的 `Context` 是 `"type"`
   （**早就错、只是没人读**）。判据用现成的 `IsBindingPatternBrace` 沿括号链往上问，
   再叠一道「外面那层花括号不是表达式括号（`BraceInExpression`）⇒ 值位」。
4. **索引签名 / 映射类型的键括号不归这一档管**：`{ [K in T]: … }` 里那个 `[` 是**键那一格**，
   它里面还能装别的 `{`（`@types/node/util.d.ts` 的 `O[K]["default"] extends {} ? K : never`
   实测被抢成 `ObjectLiteralExpression`）。判据：这个 `[` 是外面那个花括号的**第一个实义单元**。

**这一档不要求「自己是第一个实义单元」**：`type T = [{ a: 1 }, { b: 2 }]` 的第二个元素
往回撞上的是 `,`（「其它符号 ⇒ 值位」当场判死），而元组元素的位由**外层那个 `[`** 决定。

**实测**：`tmp/r868/brackets.mjs` **34 条全绿**（元组 / 数组 / 绑定模式 / `typeof` / 索引访问 /
映射类型 / 索引签名 / 类里那一格，含四条**对照**）；全语料 `cases:tsast` **16 / 16 片**、
缺 0 漂 0 多 0；`coverage` **4012 → 4013 / 4191**（blocked **41 → 40**、differ 138、bad 0）；
`npm run gates` **八道全过**（墙钟 34.0s）。

**数字**：`cases:tsast` 已知缺口 **1 → 0**——**语料里的缺口清单空了**
（用例留着当守卫，`xl:expect` 从 `ObjectLiteral` 改成 `TypeLiteral,TupleType,Field`）。

### 第 867 轮：泛型段扫描器的字母表里没有 `` ` ``——模板字面量类型整段吃掉（known-gap 2 → 1）

**一句话**：`type-param-template-literal-constraint`（缺 14 多 7，还带一处未映射 `Bracket`）收掉——
`function f<X extends `a${A}b`>(x: X): X { return x; }` 现在整条成形。

**根子**：`GenericTypeBranch.ScanArguments` 只认一张「类型实参字母表」，而 `` ` `` 与 `$`
**都在表外**（表里明写着「其余字符一律中止」）⇒ 扫描在开引号那里当场中止
⇒ `<X extends `a${A}b`>` 整段**退回比较运算符**（产物里 `<` / `>` 各自是一个符号单元）
⇒ 类型参数段认不出来、整条声明塌成 `BinaryExpression`。

**修法**：字母表补一条**模板字面量整段吃掉**的分支（[generic-type.xl.md](typescript/tokens/generic-type.xl.md)
的 `SkipTemplate` / `SkipTemplateExpression` 两个私有方法）：

```text
`   →  SkipTemplate            扫到闭合的 `，途中 \ 转义、${ 交给下一层
${  →  SkipTemplateExpression  花括号自己计数，字符串 / 注释 / 嵌套模板各自成对吃
```

**`>` 必须一起吃掉**：`` `${A extends B ? C : D}` `` 里那个 `>` 若参与尖括号计数，
`<X extends `a${A}>B`>` 这类写法会**提前收尾**、类型参数段被切成两半。
**值位一个字没动**：后继闸 `IsAllowedFollower`（表达式位里 `<…>` 后面必须紧跟 `(`）照旧兜住。

**量到的边界**（一开始把账记成了「约束位」）：探针一铺才发现根**不在约束位**——
`function f<X extends `ab`>`（**不带插值**）、`type T<X extends `a${A}b`> = X`、
`class` / `interface` / 方法 / 箭头函数**五处同根**，而 `` let v: `a${A}b` `` /
`` type U = `a${A}b` `` / 形参与返回类型标注**本来就是好的**（那些位置的 `` ` `` 不在扫描器手上）。

**实测**（`tmp/r867/template-type.mjs`，18 条）：修前 9 条红，修后**全绿**
（函数 / 方法 / 箭头 / 类 / 接口 / `type` 别名 / 联合约束 / 默认值位 / 嵌套插值，加四条对照）。
这一处改动让 `@types` / `typescript/lib` 里**成片的类型参数段**第一次成形：
投影节点 44940 → **64447**，**全部与 TS 同 kind 同区间**（16 / 16 片、缺 0 漂 0 多 0）。

**数字**：`cases:tsast` 已知缺口 **2 → 1 还开着**（收掉的那条按规矩删掉 `xl:known-gap`、
用例留着当守卫，`xl:expect` 一个字节没改）；`coverage` **4011 → 4012 / 4191**
（blocked **42 → 41**、differ 138、bad 0）；`npm run gates` **八道全过**（墙钟 30.7s）。

### 第 866 轮：`do {} while (a) b()` 那一格——`DoWhile` 补进 `IsStatementUnit`，整族 12 条一起收（known-gap 3 → 2）

**一句话**：`stmt-do-while-then-statement`（缺 3 多 1）收掉——`do … while (c)` 后面跟着的那条语句
现在**自己成一条语句**，不再与 `DoWhile` 粘成一条 `ExpressionStatement`。

**根子**：TS 的 `parseDoStatement` 收尾无条件调 `parseSemicolon()` ⇒ `)` 后面按 ASI 断句；
而产物里那个壳是 `Statement.FormTail` 在**容器关闭时**收的（`;` 与 `\n` 两档都不响），
壳里 `DoWhile` 与后面那条语句**并排**。`Statement.SplitShell` 的入口（头是不是语句级单元）
与标签那一支（`lbl: do … while (a) b()`）**都问 `Statement.IsStatementUnit`**，
而 `DoWhile` 不在那张表里 ⇒ 两处都为假 ⇒ 壳拆不开 ⇒ 投影把两条语句投成一条。

**修法一处**（[statement.xl.md](typescript/tokens/statement.xl.md) 的 `IsStatementUnit`）：
```ts
  || item.constructor.name === "DoWhile";
```
**用类名判定**：`statement.xl.md` 不 import `do-while.xl.md`（与本文件里 `StaticBlock` /
`NamespaceExport` 同款，避免绕出更深的环）。**`SplitShell` 一处都不动** ——
第 859 轮退回来的那一版多改了「尾巴那条壳的右端一律取尾巴自己的最后一格」，
那一处会打断 `stmt-declaration-body-trailing-semicolon` 的 `EmptyStatement`（缺 1）；
这一轮量到**只补表就够**。

**实测**（`tmp/r866/do-while.mjs`，20 条）：`do {} while (a) b()` / 带 `;` / 换行写法 /
`let` / `if` / `while` 体 / `do` 体 / 夹注释 / `class` / `function` / 函数体里的 `return` /
标签那一档 / 嵌套那一档**全部转绿**（修前 12 条红），四条对照（`do x++; while (x < 3);` 一族）
逐格不动。**同族缺口比登记的多**：第 859 轮只登记了这一条，实测那一族 12 条同一个根。

**副作用只量到一处**：`DoWhile` 进了表 ⇒ 它**直接站在 `Root` 下**（与 `While` / `Try` 同款），
`stmt-do-while-expr-comment` 的 `xl:expect` 里 `Statement:2 → 1`（形状变好、判定点不变）。

**数字**：`cases:tsast` 已知缺口 **3 → 2 还开着**（收掉的那条按规矩删掉 `xl:known-gap`、
用例留着当守卫）；全语料缺 0 漂 0 多 0、16 / 16 片；
`coverage` **4010 → 4011 / 4191**（blocked **43 → 42**、differ 138、bad 0）；
`npm run gates` **八道全过**（墙钟 34.1s）。

### 第 865 轮：元组元素位那一格——两半都成立，但**解构掉四条**，整份撤回（数字一位没动：known-gap 3、coverage 4010 / 4191）

**一句话**：冲 `gap-type-tuple-element-literal`（`type T = [{ a: 1 }]` 里那个 `{`）去了，
**改法本身在这两半上都实测成立，代价却落在解构上**，所以整份撤回——这一轮的产出只有账。

**改了哪两半**（第 855 轮记下的前提正是第一半）：

1. `DecideBracketContext` 的**冒号那一支**：跨过 `=` 之后撞上的冒号不是本括号的标注 ⇒ 值位。
   实测插桩：`const tree: Tree = { … }` 那个对象字面量**连它里面每一层括号**的 `Context`
   都从 `"type"` 变成 `"value"`。
2. `IsTypePosition` 里「括号里的第一个 `{`」那一支**放宽到 `[`**，`[` 直接读自己的 `Context`
   （第 849 / 855 轮「另一条路不成立」的原因正是第一半还没修）。四种排版当场都对：
   `type T = [{ a: 1 }]` 转绿，`const a = [{ b: 1 }]` / `f([{ a: 1 }])` /
   `const tree: Tree = { …, kids: [{ … }] }` 一档都没动，`cases:tsast` **缺 0 漂 0 多 0**。

**代价**（`coverage` 4010 → 4007、blocked 43 → **47**）：掉下去的四条**全是解构**——
`runtime/round762/001-destructuring-and-spread`（`unimplemented: expression TypeLiteral`）、
`runtime/values/202-nested-destructuring-defaults` 与 `e2e/scenarios/067-…`
（两条都是 `ast node BindingElement has no child name`）、`exec/round711/001-call-chain-then-member`。

**两半分不开**：把元组那一支用 `&& false` 单独关掉**照样掉**，而元组那一支又**必须**有冒号那一半
⇒ 要么一起要、要么一起不要。

**没查完的那一格**（写进 [「被否决的改法」](tests/parse/typescript-parsing-gaps.md) 第 6 条）：
掉的四条都是解构，症状是某个绑定模式的 `{ … }` 翻了面。本轮试过「逐对量括号 `Context` 序列」，
可第一版比对脚本**把补丁打到了两份拷贝上**（比的是同一份、于是「零差异」）——
下一轮的第一站是重做这一次比对：一份去掉冒号那一支、一份留着，找出**第一个翻面的括号**。

**数字**：一位没动——`cases:tsast` 已知缺口 **3 条还开着**、`coverage` **4010 / 4191**
（blocked 43、differ 138、bad 0）、用例 **1429** 条；`npm run gates` **八道全过**（墙钟 34.5s）。

### 第 864 轮：`{` 是父括号的**第一个实义单元**时——`BraceInExpression` 答不出「它在表达式里」（known-gap 4 → 3）

**一句话**：`gap-value-array-bitwise-in-object-paren`（缺 4 多 6）收掉——
`const b = ({ w: [5 | 6] });` 与 `f({ z: [3 & 4] });` 里那个 `[` 现在是**值位**，
`|` / `&` 折成位运算而不是 `UnionType` / `IntersectionType`。

**根因**：第 686 轮已经把「冒号在对象字面量里是**属性分隔符**」这一问接到
`EnclosingBraceContext` 上，可它在那两格上给的是**空串**——因为 `BraceInExpression`
（它的守卫）答「不在表达式里」。判据只看「这个 `{` 前面那一格」：

    ({ w: [5 | 6] })             `{` 是父括号 `(` 的**第一个**单元 → 前面什么都没有 → 假
    f({ z: [3 & 4] })            `{` 是实参括号的**第一个**单元     → 假
    const o = { b: [1 | 2] }     `{` 前面是 `=`（第 686 轮修的那一格）→ 真

于是花括号里那个**分隔冒号**被当成类型标注、`[` 判成类型位（实测插桩：`{` 自己的
`Context` 明明是 `"value"`）。

**修法一处**（[text-common-util.xl.md](typescript/text-common-util.xl.md) 的 `BraceInExpression`）：
**「前面一个实义单元都没有」且父单元是括号时**，改问 `{` **自己那一格**的 `Context`
（开括号那一刻由 `DecideBracketContext` 算好，而那个判定会**跨过 `(` / `[` 往上扫**，
所以这一档它照样答得出来）。四种排版实测都对：

    ({ w: [5 | 6] })            `{` ⇒ "value"
    f({ z: [3 & 4] })           `{` ⇒ "value"
    const o = [{ a: [1 | 2] }]  `{` ⇒ "value"
    type T = [{ a: 1 }]         `{` ⇒ "type"（元组成员是类型字面量，行为一字未动）

**判据收得比「父是括号」更窄**：只有「前面一个实义单元都没有」才走这一支——
类体 / 接口体 / 命名空间体的 `{` 前面是名字，落不进这里（`interface I { m: { a: [1 | 2] } }`
那一份实测一个字节没变）。

**实测**（`tmp/r863/probe*.mjs` 之外，本轮另量了 g1…g7 七份小片段：括号化对象 / 裸对象 /
实参里的对象 / 元组类型 / 数组里的对象 / 接口里的类型字面量 / 深层嵌套）：
前三格与「数组里的对象」转绿，元组类型与接口那两格逐格不动。

**数字**：`cases:tsast` 已知缺口 **4 → 3 还开着**（收掉的那条删掉 `xl:known-gap`，
`xl:expect` 从 `UnionType,IntersectionType` 重算成 `ArrayLiteral,ObjectLiteral,SymbolToken`）；
`coverage` **4007 → 4010 / 4189 → 4191**（token **1411 → 1413 / 1415 → 1416**、
blocked **44 → 43**、differ 138、bad 0）；用例 **1428 → 1429**
（token 守卫 1 条 `expr-round864-object-value-array-in-paren.ts` + exec 守卫 1 条
`exec/round864/001-…`，后者钉的是「修之前整份文件进不来」那一档）；
`npm run gates` **八道全过**（墙钟 33.8s）。

### 第 863 轮：链的续格搬进了**下一个二元单元**——`1 + o["f"]().v + 2` 收掉，顺带收掉逗号在语句层那一档（known-gap 5 → 4）

**一句话**：`gap-round744-chain-in-binary-three-operands`（缺 2 漂 1 多 3）收掉；
同一根上量出来的**逗号那一档**（`x = 1 + o["f"]().v + 2, y`，此前没登记）一并收掉。

**根因**：`1 + o["f"]().v` 的产物是

    [BinaryOperator( 1, «+», PropertyAccess(o, [f]) ), PropertyAccess(Bracket(()), ., v)]

——续格是**外面的兄弟**，0a2 那一支（第 743 轮）正是照这个形状切开的。可**再往后接一个运算符**
时 token 层换了排版：

    [BinaryOperator( 1, «+», PropertyAccess(o, [f]) ),
     BinaryOperator( PropertyAccess(Bracket(()), ., v), «+», 2 )]

续格 `().v` 与第二个 `+` **折进了同一个单元**，于是链头变成「**前一个单元的最后一个孩子**」。
0a2 的判据 `tailIsChain` 只认 `NullConditionalOperator` / `.` / `isCallFirstUnit` 三档，
而这里第二格是**二元单元**、不是链的续格 ⇒ 整支让开 ⇒ 下面那条链支接手，
把**整个第一个单元**（`1 + o["f"]`）当成链头 ⇒ `PropertyAccess( CallExpression( BinaryExpression(1 + o["f"]), [] ) )`。

**修法三处**（都在 [print-ast-common.xl.md](typescript/print-ast-common.xl.md)）：

1. `chainTailInOperator` **只是把定义往上搬**到 0a2 前面——0a2 要问的是同一个问题
   （「这一格的第一格以一次调用开头吗」），而它比链支先跑（`const` 有 TDZ，不能就地引用）。
2. 0a2 入口加一格 **`tailInOperator`**：尾巴里那个二元单元的第一格以一次调用开头时也算续接；
   尾巴用新助手 **`unwindChainTailInOperator`** 摊开——**续格那一格整格留下**，
   它自己的运算符与右操作数原样跟到后面（`foldBinaryFrom` 按「以运算符开头的一串」折）。
   与既有 `flattenChainTailInOperator` **只差这一处**：那一支要**裸的续格几格**（链支的入口判据
   不认「外面包着 `()` 的那种单元」），这一支要**续格那一格自己**（0a2 的右操作数要递回链支）。
   **递归那一档**（`o[k]().v * 2 + 1` 两层套着）一路走到最里面那层才停，沿途的运算符从里到外接上。
3. 0f（赋值后面跟着逗号）的判据从「**前一个兄弟**是赋值号」放宽成「**本层左边**有赋值号」，
   取**最左边**那一个（逗号比任何赋值都松，切点就该落在最外面那层赋值上）——
   `x = 1 + o["f"]().v, y` 里逗号单元被链推到了**隔着一个兄弟**的位置，
   旧判据为假 ⇒ 逗号被当成 RHS 的一部分（TS 是 `(x = …), y`，产物给 `x = (…, y)`）。
   `a = b + 1` 那一档照旧由「这个单元里是逗号吗」挡住。

**踩到的那一条**（第 744 轮同一处，这次又验了一遍）：续格**必须整格递回去**——
摊成平级的几格时链支的入口判据（裸的 `(` 不在名单里）不进，会折出**操作符是 `DotToken`
的 `BinaryExpression`**。

**实测**（`tmp/r863/probe.mjs` 16 条 + `probe2.mjs` 8 条，共 24 条探针全绿）：
三操作数 / 嵌套 `* 2 + 3` / 连加 `+ 2 + 3` / 逻辑 / 比较 / 三元 / 实参位 / 数组元素位 /
逗号在语句层 / `1 + 2 + o["f"]().v`（首格是纯操作数的对照）/ `o.a().b + 1 + 2`（点号链的对照）
都逐位置与 `ts.createSourceFile` 一致。

**数字**：`cases:tsast` 已知缺口 **5 → 4 还开着**（收掉的那条按规矩删掉 `xl:known-gap`，
换成本轮的说明；`xl:expect` 按新形状重算成 `BinaryOperator,PropertyAccess,Bracket`）；
`coverage` **4004 → 4007 / 4187 → 4189**（token **1409 → 1411 / 1414 → 1415**、
blocked **45 → 44**、differ 138、bad 0）；用例 **1427 → 1428**（token 守卫 1 条
`expr-round863-chain-in-binary-tail.ts` + exec 守卫 1 条 `exec/round863/001-…`）；
`npm run gates` **八道全过**（墙钟 31.4s）。

### 第 862 轮：紧贴的 `async<T>(x) => x`——第 856 轮那一支撤掉，两种排版合流（known-gap 6 → 5）

**一句话**：`expr-async-generic-arrow`（紧贴那一档，缺 2 字段 1）收掉——
`async<T>(x) => x` 与 `async <T>(x: T) => x` 现在**逐位置都完全一致**。

**第 856 轮那一支的代价**：它管「`async` 与形参表之间隔着一个泛型段」，做法是把
`rangeStart` 拉到 `async`、`IsAsync` 置真。可 `Lamda` 的**替换范围**是从 `rangeStart` 起算的
（[typescript/tokens/lamda/lamda.xl.md](typescript/tokens/lamda/lamda.xl.md) 的 `Process`）——
泛型段于是落进那段范围**却没人收**：`[async, GenericType, Lamda]` 三格被换成**一格** `Lamda`
⇒ `typeParameters` 与 `T` 那一格永远缺（实测缺 2 字段 1）。

**修法**：把那一支**整个撤掉**。第 861 轮已经在投影层收掉了
「三格 `[Identifier(async), GenericType, Lamda]`」那一档（0a'），紧贴与隔空格于是
**走同一份判据**：`async` 与泛型段照旧留在 `Lamda` 外面，投影补 `typeParameters` 与 `AsyncKeyword`。
留着那一支反而把树压成一格、让投影看不到泛型段。

**实测**：`const h = async<T>(x) => x;` 与 `const h = async <T>(x: T) => x;` 两档都是
**缺 0 漂 0 多 0 字段 0**；XML 侧紧贴这一档现在多出 `<Identifier>async</Identifier>` 与
`<GenericType>` 两格平级（`xl:expect Lamda` 不用改，`cases:tags` **0 条不一致**）。

**数字**：`cases:tsast` **16 / 16 片通过**、已知缺口 **6 → 5 还开着**
（收掉的那条按规矩删掉 `xl:known-gap`）；`coverage` **4003 → 4004 / 4187**、
blocked **46 → 45**、differ 138、bad 0；`npm run gates` **八道全过**。

### 第 861 轮：隔空格的 `async <T>(x) => x`——`async` 与泛型段谁先认领：0a 那一支抢在前面（known-gap 8 → 6）

**一句话**：`expr-async-generic-arrow-spaced`（`async <T>(x: T) => x`，缺 8 多 2）与
`gap-d-generics-tuple-mapped-02`（`async <T,>(x: T): Promise<T> => x`，缺 12 多 2）
**两条一起收掉**（现在逐位置完全一致），已知缺口 **8 → 6**。

**根因**：这一档的产物是**三格** `[Identifier(async), GenericType(<T>), Lamda(…)]`，
而 `projectExpression` 里排在最前面的 **0a**（泛型实例化表达式 `f<string>`，第 850 轮）
判据只问「头一格是 `Identifier`、第二格是 `GenericType`」——它当场把 `async <T>`
认成 `ExpressionWithTypeArguments`，剩下的 `Lamda` 走 `foldBinaryFrom`
⇒ `ArrowFunction` / `AsyncKeyword` / `Parameter` / `EqualsGreaterThanToken` 整片缺、多出两格。

**上一轮那一支为什么一次都没响**（第 856 轮把「三格」写在**第 134 轮那个两格支**旁边，
并注明「实测没有跑到」）：它写对了形，却排在 0a **后面**——控制流在 0a 就返回了。
这一轮把那一支**挪到 0a 前面**（[typescript/print-ast-common.xl.md](typescript/print-ast-common.xl.md)），
并按投影层的口径补齐两样：`typeParameters` 取泛型段里的 `TypeParameter`；
`AsyncKeyword` **自己补一个节点**（那一格平时由 `Lamda.IsAsync` 合成，而隔空格这一档
`IsAsync` 是假——`lamda.xl.md` 第 856 轮把它收窄到「`async` 与 `<` 紧贴」），
区间就取 `async` 那一格自己的两端，与 `async x => x` 合成出来的形状逐格相同。

**紧贴那一档一个字节没动**：`async<T>(x) => x` 的泛型段已经被 `lamda.xl.md` 的 `Process`
收进 `Lamda` 的替换范围，产物只有一格 `Lamda`，本条一次都不会响
（实测仍是**缺 2 字段 1**——`typeParameters` 那一格——照旧登记着）。

**数字**：`cases:tsast` **16 / 16 片通过**、已知缺口 **8 → 6 还开着**
（收掉的两条按规矩删掉各自的 `xl:known-gap` 行，两条 `xl:expect` 一个字节没改——XML 侧不受投影改动影响）；
`coverage` **4001 → 4003 / 4187**、blocked **48 → 46**、differ 138、bad 0；`npm run gates` **八道全过**。

### 第 860 轮：`do … while (…) ;` 那个尾分号的右端——第 859 轮新写的那一支是**死代码**，坐标两处各差一格

**一句话**：全语料 **9 处 `DoStatement` 漂移**（缺 0 漂 9 多 9）一次收掉；
`cases:tsast` 从 **10 / 16 片** 到 **16 / 16 片**、逐文件一致 **1817 / 1817**。

**上一轮把这一笔账记成了**「那 9 / 9 是 `dist/ts/typescript/tokens/field.ts` 一处旧漂」——
**不是**：它们是**同一根**，而且根就在上一轮新加的那一段里。

**上一轮那一支为什么一个字都没生效**（[typescript/tokens/do-while/do-while.xl.md](typescript/tokens/do-while/do-while.xl.md)，
`DoWhileCloseRule.Process` 的尾分号那一支）：判据「问原文」是对的，**坐标两处各差一格** ⇒
整段**死代码**，右端照旧停在条件括号上：

- **`SourceRange.End` 是含尾的位置**：`(x < 10)` 那个括号的 `End.Index` 就是 `)` **自己**
  （插桩实测 `tail=24`、`GetValue(24)==")"`、`compareEnd=24`），不是它后面那一格。
  于是「从 `tail.Index` 起扫」第一步看到的是 `)`、不是空白，
  循环当场 `break`、`GetValue(at) === ";"` 那一问**永远为假**。
- **`At(at + 1)` 也越了一格**：`;` 在 `at` 上时，**要签出的就是这个位置本身**（含尾口径）。

**修法**：`let at = tail.Index + 1`、`signOut = tailDoc.At(at)`——两处各一格，其余一个字没动。

**实测**（`tmp/r860/`）：`do { f() } while (x < 10);` 修之前产物 `DoStatement [0,25)`、TS `[0,26)`；
修之后逐格相同。八种排版一起量：单行体 / 体里换行 / `do f(); while (c);` / 条件竖排 /
`do while (a) x++; while (b);` / 后面接语句 / 前后带注释 / 无尾分号（ASI）——**全绿**。

**数字**：`cases:tsast` **16 / 16 片通过**（改之前 10 / 16，6 片挂在同一根上）、
逐文件完全一致 **1817 / 1817**、缺 0 漂 0 多 0、未映射 0、缺 range 0、区间越界 0；
`已知缺口` 仍是 **8 条还开着**（`stmt-do-while-then-statement` 那一半——壳没拆——这一轮没动）。

### 第 859 轮：`do { } while (a)` 后面没有分号时的右端——`DoWhile` 不再吃下一条语句

**一句话**：`do {} while (a) b()`（`stmt-do-while-then-statement`）里 `DoStatement` 的右端
比 TS 多一截（TS `[123,138)`、产物 `[123,143)`）——多出来的正是**下一条语句** `b()`。

**根子在 `DoWhileCloseRule.Process` 那一支的判据**（[typescript/tokens/do-while/do-while.xl.md](typescript/tokens/do-while/do-while.xl.md)）：
尾分号不在列表里时（`Statement.FormFrom` 把它切进壳的区间、不进 `Data`），
原来的写法是「宿主是 `Statement` 且右端比最后一格更远 ⇒ 取**宿主右端**」。
可宿主是**整条语句壳**——它里面可以装着下一条语句：`do {} while (a) b()` 里
`DoWhile` 与 `b()` 就住在**同一个**壳里（`Statement.FormTail` 把它们收在一起），
于是「宿主右端」= `b()` 的末尾 ⇒ `DoWhile` 一路撑过去。

**修法**：判据从「问宿主」改成「**问原文**」——条件括号之后跳过空白与注释，
下一个字符是不是 `;`：是就是自己的终结符（TS 的 `parseDoStatement` 收尾调 `parseSemicolon()`），
不是就是 ASI 断在括号上（`do {} while (a)` 后面接语句的排法）。
**末尾那个 `;` 自己占一格时上面那一问已经吃过了**，新写的这一支只管它不在列表里的那一档
（`do x++; while (c);` 那种形状一个字节没动）。

**四个探针**（`tmp/`）：`do {} while (a) b()` / `do {} while (a) b();` / `do {} while (a)` 换行 `b()` /
`do {} while (a) /*c*/; let y = 1`——修完 `DoStatement` 的右端分别是 15 / 15 / 15 / 15，
与 TS 逐格相同。

**还开着的那半**（登记在用例文件头）：`DoWhile` 与后面那条语句**仍然挤在同一个语句壳**里
⇒ 投影多套一层 `ExpressionStatement`（TS 是**两条**语句）。

**这一半试过、退回来了，账记在这里**（第 859 轮，两处一起改的）：

1. 把 `DoWhile` 补进 `Statement.IsStatementUnit`（`SplitShell` 只看第一格是不是语句级单元）；
2. `Statement.SplitShell` 里尾巴那条壳的右端改取**尾巴自己的最后一格**。

改完 `do {} while (a) b()` 确实对了（`stmt-do-while-then-statement` 逐位置一致、缺口收掉），
可**同一族的另外几条当场漂**：

    stmt-do-while-body-terminated  漂 2 多 2   `do x++; while (x < 3);` → TS[313,334) 产物[313,333)
                                             `do { x++; } while (x < 5);` → TS[335,361) 产物[335,360)
    stmt-do-while-semicolon        漂 1 多 1
    stmt-do-while-if-body          漂 1 多 1
    stmt-do-while-while-body       漂 1 多 1

**A/B 做过两趟**（把编译产物里那两处条件分别换成恒假，各跑一次）：两组探针的漂**一模一样**
⇒ 那 4 条漂**不是这两处改动带来的**：把 `do-while.xl.md` 也退回 HEAD 重编再量，
`stmt-do-while-body-terminated.ts` **同样是漂 2 多 2**（逐格相同）。
也就是说它们是**这一族本来就有的**另一处缺口（`DoStatement` 的右端在「内部不带裸 `;` 的体」
+ 后面还跟着别的 `do…while` 时短一格），只是**此前那一条用例的对拍没把它单列出来**。
**它没有进 `xl:known-gap`**（第 859 轮只登记了 `stmt-do-while-then-statement` 这一条）——
下一轮要先把它量清楚再登记，然后才谈把壳拆开。

**顺便记一笔机制上的坑**：壳拆开之后，尾巴那条壳的右端若照旧借壳那一格
（`unit.SourceRange.End`），会落到**头自己的终点**上（`DoWhile` 修完只到条件括号）
⇒ 投影把两条语句又粘回一条；而一律改取「尾巴最后一格」会打断
`stmt-declaration-body-trailing-semicolon.ts` 那个 `EmptyStatement`（缺 1）。
所以那一格要**按头的族分别给**，不能一刀切。

**数字**：用例文件头的期望与 doc 行按新形状重算（`Statement` 3 → 4），
`xl:known-gap` 那一行留着、措辞换成新根因；账仍是 **8 条还开着**；
全语料 `ts-ast.mjs all --jobs 1`：**1809 / 1817 份逐位置一致、缺 0 漂 9 多 9**
（与改之前**逐项相同**——那 9 / 9 是 `dist/ts/typescript/tokens/field.ts` 一处旧漂）；
`cases:check` 1427 条 **0 条不合格**、`cases:tags` **0 条不一致**。

### 第 854 轮：`typeof` 的点号名后面再接下标——known-gap **11 → 10**

**一句话**：`type A = typeof a.b[K]`（`type-typeof-qualified-index`）里 `TypeQuery` 吞下整段
（缺 `IndexedAccessType` / `QualifiedName` / `TypeReference`，`TypeQuery` 与 `Identifier` 两处漂）。
产物那一格是**平的**：`[TypeQuery(typeof a), ., IndexedAccessType(b, K)]`——那个 `IndexedAccessType`
的**左半边**（`b`）才是限定名的右半、`K` 是下标；而 `a.b` 那一条支（第 83 轮）只按名字往右套，
`[K]` 既不是名字也没人接，于是 `TypeQuery` 的区间一路撑到 `]`。

**修法**（`print-ast-common.xl.md` 的 `projectTypeExpression` + 新私有方法 `absorbIntoTypeQuery`）：
尾段**先按它自己的规矩投出来**（下标 / 数组的壳与 `<X>` 实参都在里面），再沿
`objectType` / `elementType` / `typeName` / `left` 往左走到**最左边那一格名字**，
把它接到已经收好的限定名右边折成 `QualifiedName`、写进 `query.exprName`，**把那一格换掉**；
外层各壳的起点跟着挪到 `typeof`（TS 的 `TypeQuery` 从 `typeof` 起）。
四个形状一起对上了：`typeof a.b[K]` / `typeof a.b[K][L]` / `typeof a.b[K][]` /
`typeof a.b<X>[K]`（`<X>` 那一档把实参收进 `TypeQuery.typeArguments`）。

**踩到的两处**（都留在注释里）：

- **`TypeReference` 那一支不能把递归的返回值再赋给 `exprName`**——递归返回的就是 `query` 自己
  ⇒ 自环，`kindsInAst` 当场报 `Maximum call stack size exceeded`（第一版 6 条探针全崩）。
- **`ArrayType.elementType` 在这一层是一个数组**（`ArrayType` 的 `PrintAst` 走 `ctx.Each`），
  照单节点收会落到 `return undefined` ⇒ `typeof a.b[K][]` 退回旧形状。

**探针**：`tmp/r853-typequery.mjs` 12 条（上面四个 + 不带下标的 `typeof a.b` / `typeof a.b.c`、
字面量下标 `a["k"]` / `a.b["k"]`、联合里、变量标注位、以及 `typeof a[K]` / `typeof a["k"]`
这两条**对照**——它们本来就对）；修完**全绿**。**全语料 `ts-ast.mjs all` 退出码 0**
（`@types` / `typescript/lib` / `dist/ts` / `samples` 143 份一片 × 16 片全绿）。

**数字**：那一行 `xl:known-gap` 删掉，账 **11 → 10 还开着**；`coverage` **3997 → 3998 / 4186**
（token **1402 → 1403 / 1413**、`blocked 51 → 50`、`differ 138`、`bad` **0**、`regressions` **0**）；
`npm run gates` 八道全过（墙钟 ~34s）。

### 第 853 轮：`=>` 体尾巴上那条注释——`let` 声明的终端也走 trivia 口径，known-gap **12 → 11**

**一句话**：`const f = (a, b) => a/*c*/;`（`gap-sweep-comment-arrow-01`）里
`VariableDeclarationList` / `VariableDeclaration` 的右端比 TS 多一截
（TS `[0,21)`、产物 `[0,26)`，漂 2 多 2）。**根子在「谁算最后一个单元」**：
那条注释被收进 `LamdaBody > Statement` 里（XML 实测
`<LamdaBody><Statement><Identifier>a</Identifier><AreaAnnotation>c</AreaAnnotation></Statement></LamdaBody>`），
于是 `Lamda` 自己的区间盖到了注释末尾（`[10,26)`），而 `projectLetFrom` 取的正是
**最后一个单元的原始终点**（`endOf`）——`endOf` 读的是 `range`，看不见 trivia。

**修法一处**（`print-ast-common.xl.md` 的 `projectLetFrom`）：那两处（列表的右端、
每个声明符的右端）从 `endOf(...)` 换成 `stmtEndOf(view(...), ctx)`——它就是投影层
「**节点终点从不含尾部 trivia**」的那一份既有实现（第 132 轮，投影出的每个节点都走它，
沿「区间终点正好等于当前 `end`」那条链递归找注释）。不另写一份「往回吃注释」的循环，
两处口径也就不会各漂各的。

**踩到的第一版**：`stmtEndOf` 收的是**视图**（内部读 `v.start` / `v.end`），
而这一层的 `kids` 是节点字典 ⇒ 直接把字典递进去得到 `NaN`（16 条探针一起报
`产物[0,NaN)`）。`endOf` 那个助手读的是 `range`，两者不能混——`view(...)` 一次即可。

**探针**：`tmp/r852-arrow.mjs` 16 条（`=> a` 带 / 不带注释、`x => x/*c*/`、
`async () => 1/*c*/`、`const f = 1/*c*/`、`let a = 1, b = 2/*c*/`、`(1)/*c*/`、
对象 / 数组 / 模板串 / 函数表达式那几档、以及 `a /*c*/ + 1` 那种**中间**夹注释的对照）
修完**全绿**；同族的 `const f = 1/*c*/;` 一直是好的（那条注释落在**外层 `Statement`**
里、是 `Lamda` 的**兄弟**），这一轮改的正是「落在最后一个单元**里面**」那一半。

**数字**：那一行 `xl:known-gap` 删掉（`xl:expect` 按新形状重算），账 **12 → 11 还开着**；
`coverage` **3996 → 3997 / 4186**（token **1401 → 1402 / 1413**、`blocked 52 → 51`、
`differ 138`、`bad` **0**、`regressions` **0**）；`npm run gates` 八道全过（墙钟 ~33s）。

### 第 852 轮：`?.` 之后那一格「名字 + `!`」——两条路同根，known-gap **14 → 12**

**一句话**：`a?.b!()`（`gap-c-optchain-nonnull-01`）与 `a?.b!.c!()`（`-02`）差在同一格上——
`?.` 之后的**被调用者自己带着 `!`**。产物把那一段收成
`NCO[Method name=""[NotNull(b, !), Bracket]]`（`-02` 是
`NCO[NotNull(b, !), ., Method name=""[NotNull(c, !), Bracket]]`），
而 `NullConditionalOperator` 的**两条折法**都只按 `name` 折一格属性访问：

- `chainWithOptional` 的**第一格**支（`?.name(args)`，第 107 轮）；
- `chainOnto` 的**续格**支（`.` 后面那一格是 `Method`，第 333 / 664 轮那一族）。

`name` 是空串时那两句都投出一个**名字为空**的 `PropertyAccessExpression`，
`NotNull` 于是留在外面当兄弟 ⇒ `-01` 缺一格 `NonNullExpression`、
`-02` 漂三处（`NonNullExpression` / `PropertyAccessExpression` / `Identifier`）+ 多两格
（空名属性访问 + 空 `Identifier`）。**第 166 轮只修了第三条路**（`NCO` 的第一格**就是**
`NotNull`，即 `a?.b!`）——同一个根长在三条路上、当年只接了一条。

**修法一处**：把「按那一格 `NotNull` 折出成员、再把 `!` 套在**整条链**上」收成一个私有方法
`assertedMember(left, unit, ctx, questionDot)`（`typescript/print-ast-common.xl.md`）——
第 166 轮写在第一格支里的那段逻辑**原样搬进去**，三条路共用。两处调用点各添一句：
`name` 是空串且**被调用者那一格是 `NotNull`** 时走它，外面那层调用照旧由
`projectNode(Method)` 出（只换 `expression` 与 `pos`，实参表一根手指都没动）。

**次序与坐标**（两处都是实测出来的）：先把**成员**接到 `left` 上、再把 `!` 套在整条链上
（TS 是 `NonNull(PropertyAccess(…, b))`）；`?.` 那一格挂在**内层**那个属性访问上
（TS 就这么放），所以第一格那一路传的 `questionDot` 是 **NCO 自己的起点**、
续格那一路传 `undefined`。

**探针**：`tmp/r852-notnull.mjs` 15 条变体（`a!` / `a.b!` / `a?.b!` / `a?.b!()` /
`a?.b!.c` / `a?.b!.c!` / `a?.b!.c!()` / `a!.b!` / `f()!` / `a! + 1` / `a! as any` ……）
修完**全绿**（另 1 条 TS 自己就非法），没有新登缺口。

**数字**：两行 `xl:known-gap` 删掉（用例留着当守卫，两条 `xl:expect` 按新形状重算——
注释行自己就是 `LineAnnotation` + `Statement`），账 **14 → 12 还开着**；
`coverage` **3994 → 3996 / 4186**（token **1399 → 1401 / 1413**、`blocked 54 → 52`、
`differ 138`、`bad` **0**、`regressions` **0**）；`npm run gates` 八道全过（墙钟 ~31s）。

### 第 850 轮：泛型实例化表达式 `f<string>`——四条同根，known-gap **18 → 14**

**一句话**：TS 4.7 的 instantiation expression（`const a = f<string>;`）在 TS 那边是
`ExpressionWithTypeArguments`，本工程把它读成了 `BinaryOperator(f < string)`。同一条根上挂着
四条用例：`expr-generic-instantiation` / `expr-generic-inst-let` / `expr-generic-inst-statement` /
`gap-d-generics-tuple-mapped-01`。两处各缺一半：

- **token 层**（`generic-type.xl.md` 的 `IsAllowedFollower`）：表达式位原来只放行 `(`——
  那是给**泛型调用** `f<T>(x)` 准备的（`<…>` 后面不接 `(` 就退回比较运算符，
  为的是 `f(a<b, c>d)` / `a<b>c` 那种写法）。可 `>` 后面跟着 `;` / `)` / `,` / `??` 时，
  后面那一格**接不上表达式**，`<…>` 只可能是实例化表达式（`a < b` 的右边还得要一个操作数，
  而 `a < b ?? c` 在 TS 里本身就是语法错、`??` 左边要一个完整的操作数）。
  补的就是这四个字符，判据照旧只看**配对的 `>` 后面那一个字符**——
  `a < b > c`（后面是名字）与 `f(a<b, c>d)`（后面是 `d`）一位都没动。
- **投影层**（`print-ast-common.xl.md` 的 `projectExpression` 第 0a 支）：补一格
  「`Identifier` + `GenericType` ⇒ `ExpressionWithTypeArguments`」（`expression` = 名字、
  `typeArguments` 复用现成的 `projectTypeArguments`）。产物那边这两格是**平级**的
  （泛型实参段是宿主的一个子单元），走通用支就投成 `Identifier` + `TypeReference`。
  带 `(` 的那一路不受影响：`f<string>(x)` 仍走链 / 调用那一支，还是 `CallExpression`。

**第一版多算 1 格**：`endOf` 与 `startOf` 是一对（`endOf` 已经是 TS 的 `end`），
第一版写成 `endOf(generic) + 1`，四条一起报区间漂移——改回 `endOf(generic)` 即绿。

**探针**：`tmp/r850-snippets.mjs` 量了同族 16 条变体（实参位 / 数组元素位 / `return` 位 /
括号化 / `f<Array<string>>` 嵌套 / `??` 之后 / 比较式对照那几条），修完**除 1 条 `f<string>.name`
（TS 自己就非法）之外全绿**，没有新登缺口。

**数字**：四条 `xl:known-gap` 行换成「第 850 轮转绿」的说明（用例留着当守卫），
其中 `gap-d-generics-tuple-mapped-01` 的 `xl:expect` 顺带重算（`SymbolToken:3 → 1`、
`Statement:2 → 5`，那是**老读数**——第 836 轮把模板串里的语句壳收掉之后就没再对过；
这一轮动的是投影，XML 那两格不变）。
账 **18 → 14 还开着**（`coverage` **3990 → 3994 / 4186**，blocked 58 → 54、differ 138、`bad` 0）；
8 道门全绿、`cases:tags` 0 条不一致。

### 第 849 轮：括号里的「**第一个 `{`**」要跳过 trivia——`mut-type-union-paren-object-162` 收掉 1 条、新登 1 条

**一句话**：`type T = A & (/* c */{ readonly ok: true } | { readonly no: true })` 里第一个 `{`
被收成了 `<ObjectLiteral>`（TS 是 `TypeLiteral`）。根在 `type-literal.xl.md` 的 `IsTypePosition`
入口第 2 条：**括号里的第一个 `{`** 本层回扫看不到左边，所以递归问括号自己那一格 ——
而那句「第一个」写的是 `index === 0`，注释在本层占了一格 ⇒ 这一支整条跳过 ⇒ 回扫撞上 `(`
⇒ 按值位判（保守），于是同一个联合类型里第一个是 `ObjectLiteral`、第二个靠 `|` 判对。
判据与 `IsBindingPatternBrace` / `IsObjectLiteralBrace` 那两处的「跳过 trivia 再问」同源。

- **改法一格**：`index === 0` → `SkipPreviousTrivia(units, index) < 0`
  （一路跳到底是 `-1`），括号种类仍然是 `(`。
- **试过又整份撤回的（写进「被否决的改法」）**：把这一支从 `(` 放宽到 `(`/`[`
  ——`type T = [{ a: 1 }]` 是元组类型、`let x = [{ a: 1 }]` 是数组字面量，
  分开它们确实是「外层那一格」，可放宽之后**值位的数组字面量成片被收成 `TypeLiteral`**
  （`coverage` 3989 → 3970、blocked 58 → 77，六条 e2e 报 `unimplemented: expression TypeLiteral`）。
  **元组元素那一格登记成缺口**（`gap-type-tuple-element-literal`），
  等「括号自己的 `Context`」那条线（`type-literal.xl.md` 开头那一节）启用时再一起收。
- **数字**：收掉 1 条（`mut-type-union-paren-object-162`）、新登 1 条（元组元素位），
  账 **18 → 18 还开着**（`coverage` **3989 → 3990 / 4186**，blocked 58、differ 138、`bad` 0）；
  8 道门全绿、`cases:tags` 0 条不一致。
- **同一族里没做的两条**（如实留着）：`mut-type-union-after-readonly-93`
  （`refs?/* c */: readonly (A | B)[]` 里字段的**类型段整个没成形**，是 `TypeOperator` /
  `ArrayType` 那一层的事，与「第一个 `{`」不同根）与元组元素那一格。

### 第 848 轮：**孤立的上下文关键字不升级**——`newline-decl-abstract` / `newline-mod-declare` 收掉 2 条

**一句话**：`abstract` 换行 `class A {}` 与 `declare` 换行 `module "m" {}` 在 TS 那边是
**两条语句**（`ExpressionStatement > Identifier` + 那条声明），而产物把那个词升级成了
`<Keyword>` ⇒ 投影多一个 `AbstractKeyword` / `DeclareKeyword`（各「缺 `Identifier` 1 多 1」）。
根与第 842 轮 `async`、第 383 轮 `override` **同一档**（`keyword.xl.md` 的 `Keyword.IsUpgradable`）：
这两个词都是**上下文关键字**，只有当后面确实跟着「要被修饰的东西」时才算关键字。

- **判据看后一个实义单元**（`SkipNextTrivia`）：Identifier / 关键字 / 引号名 / `New` 单元
  这一档才算「后面有个东西」；**什么都不剩**（语句层已经按 ASI 把那个词收成单独一条壳）
  与 `;` 都不是。同行写法一个字都不误伤：`abstract class A {}` / `declare module "m" {}` /
  `declare const a = 1` 里后面那个词就在同一个壳里。
- **两处实测出来的边界**：
  - `declare;` / `abstract;` 后面是 `;`——TS 那边同样只是 `Identifier`（`;` 不是
    「能被修饰的东西」），所以「列表到哪儿为止」不算数，得看**后一格是什么**；
  - `interface I { abstract new (): A }` 后面跟的是 **`New` 单元**（整条 `new (): A`）而不是词
    ——少了这一格，守卫用例 `decl-interface-abstract-construct-signature` 当场从
    `Keyword` 掉成 0 个（**改一条判据要跑全语料**这句话的现场）。
- **收掉的 2 条**：`gap-sweep-newline-decl-abstract-01`（顶层）与
  `gap-sweep-newline-mod-declare-01`（顶层 `declare`）——两行 `xl:known-gap` 删掉、
  两条 `xl:expect` 按新形状重算（`Keyword` 没了，换成 `Statement` / `Identifier`）。
  另补一条守卫用例 `decl-standalone-declare-abstract`（`declare;` / `abstract;` /
  `declare` 换行 `const a = 1;` / `abstract` 换行 `class A {}` 四条一起钉）。
- **探针量到同族 10 条**（不在语料里、这一轮一并收掉）：`declare` 换行
  `namespace` / `function` / `var` / `const`、函数体里的 `abstract` 换行 `class` 都是同一个根。
- **数字**：`cases:tsast` 的账 **20 → 18 还开着**（`coverage` **3986 → 3989 / 4185**，
  blocked **60 → 58**，`bad` 0、`regressions` 0）；8 道门全绿、`cases:tags` 0 条不一致。

### 第 847 轮：**注释不能当体的第一个单元**——`SWEEP-{comment,linecomment}/ifelse` 收掉 2 条

**一句话**：`if (a) /*c*/{ b(); } else { c(); }` 里那个 `/` 是 **trivia**，可 `IfSet` 的体是
**自己挂**的（`IfSegment.Process` → `MountBodyOrStatement`：`{` ⇒ `IfBody`、其余 ⇒ 单语句体），
于是注释一到就被当成**体的第一个单元** ⇒ `{ b(); }` 成了体**内部**的括号、`else` 也一起被吞
（实测 `FIELD IfStatement [0,34)`：产物 `[expression,thenStatement]`，TS 有 `elseStatement`；
带 `else` 时才显形——不带 `else` 的那一条因为「体内容只有一个花括号块」正好投影成 `Block`，
所以就藏在那里，是同一根的第二面）。

- **判据落成两个新方法**（`if-set.xl.md`）：`IsCommentStart`（当前这个 `/` 后面那一格是 `*`
  还是 `/`——**`/` 同时是注释与正则的开头**，两条注释分支认的都是第二个字符）
  与 `IsPendingCommentTail`（第二个字符到了：交给队列，注释分支会把那个 `/` 收回去）。
  扫原始字符的写法与 `Statement.NextLineContinuesExpression` 扫注释那一手同源。
  **正则不许误伤**：`if (a) /re/.test(x);` 的体**就是**那条表达式语句（探针 7 条全绿，
  这一格另补了守卫用例 `tests/cases/token/statements/stmt-if-body-regex-not-comment.ts`）。
- **`else` 那一侧是同一个根的第二处**：`else /*c*/{ … }` 里 `else` 那个词一留在尾巴上，
  注释读完时它就**不是**「尾巴上最后一个实义单元」了（尾巴上多了注释）⇒ 下面那条
  `tailIsElse` 与 `beforeIsElse && tail instanceof Identifier` 两支都判不到 ⇒
  **整条 `else` 段连体一起丢**（实测 `if (a) { b(); } else //c` 换行 `c();`：
  产物 `IfStatement [0,15)`，TS 是 `[0,29)`）。判据落在 `Navigate` 开头那一格：
  「`else` + trivia」当场把段签在 `else` 上、那个词摘掉，注释留在本单元里
  （与 `if (a) { b(); } /*c*/ else { c(); }` 同一形状），体等注释读完再挂。
- **踩出来的那一格：`Lex` 不是哪里都能用**（本轮第一版整份文件解析失败）。
  `MountBodyOrStatement` 里让路之后要把 `/` 词法化，而那一刻 `IfSet` 的**最后一个子单元是
  当前那一段**（`IfSegment`）——体还没挂上、段还没签出，符号分支的 `AddAndCloseLast`
  会顺手去关它 ⇒ `SourceException: SourceRange.Start == null || SourceRange.End == null`。
  改法是新加的 `LexInto(host, …)`：**同一个队列、换一个宿主**，挂到段上
  （段最后一格是已经关掉的 `IfCondition`）。注释也就近挂在段里：
  `<IfSegment><IfCondition/><AreaAnnotation/><IfBody/></IfSegment>`。
- **收掉的 2 条**：`gap-sweep-comment-ifelse-01` 与 `gap-sweep-linecomment-ifelse-01`
  （两行 `xl:known-gap` 删掉，两条 `xl:expect` 按新形状重算：`Bracket` / `IfStatement` /
  `Keyword` 那一套没了，换成 `IfBody:2` / `IfSegment:2`）。另两条守卫用例
  （`st-comment-after-head` / `st-comment-holds-brace`）的 `xl:expect` 同一条根：
  `IfStatement` → `IfBody`——它们钉的是「注释里那个 `{` 不许被回原文 `indexOf` 捡走」，
  形状变好、判定点不变。
- **数字**：`cases:tsast` 的账 **22 → 20 还开着**（`coverage` **3983 → 3986 / 4184**，
  blocked **62 → 60**，`bad` 0、`regressions` 0）；8 道门全绿、`cases:tags` 0 条不一致。

### 第 846 轮：约束位上的**条件类型**——`type-param-conditional-constraint` 收掉 1 条

**一句话**：`<X extends A extends B ? C : D>` 里那个约束是**条件类型**，而产物把
「名字 + `extends` + 条件类型」整段收成**一个** `ConditionalType` 挂在 `TypeParameter` 底下
——投影那边只摊 `UnionType` / `IntersectionType` 两种包装（第 83 / 108 / 155 轮那几笔账），
条件类型这一格没摊 ⇒ `extIndex` / `nameIndex` 双双找不到 ⇒ `TypeParameter` 的
`name` / `constraint` 全丢（实测 `FIELD TypeParameter 产物[] vs TS[constraint,name]`、缺 10）。

- **摊开的名单加上 `ConditionalType`**（`type-parameter.xl.md` 的 `wrappedIndex`）：
  摊开之后 `kids` 就是平铺的 `[X, extends, A, extends, B, ?, C, :, D]`，
  名字与 `extends` 当场就找得到。
- **约束那一段要按条件类型折，不能用 `TypeOf`**：`TypeOf`（→ `projectTypeExpression`）
  折不动平铺的 `extends` / `?` / `:`——只投出第一个 `TypeReference(A)`，
  后面 `B` / `C` / `D` 三对节点整片丢（缺 7）。判据与共享层的 `conditionalNode` 同源
  （这一段里有顶层 `?` 与 `:`、且 `extends` 前面有 checkType），折的时候调
  `ctx.ConditionalNode`。
- **两处「别把默认值当约束」的闸**（本轮实测的第二次）：`<ReturnType = F extends (…args: any) => infer T ? T>`
  里那个 `extends` 属于**默认值**。`extends` 必须落在 `=` **之前**才算约束；
  而下面那段「把被包进联合的约束补全」的收尾重建**只对联合 / 交叉两档**跑
  （它是按联合成员重切的，对条件类型会把刚折好的节点又覆盖成 `TypeReference(A)`）。
  不挡这两下时 `@types/node/test.d.ts` 当场红（两处 `FIELD`：产物 `[constraint,default,name]`
  vs TS `[default,name]`）。
- **收掉的 1 条**：`type-param-conditional-constraint`（那一行 `xl:known-gap` 删掉）。
- **数字**：`cases:tsast` 的账 **23 → 22 还开着**（`coverage` **3982 → 3983 / 4183**，
  blocked **63 → 62**，`bad` 0、`regressions` 0）；16 片全绿、`cases:tags` 0 条不一致。
- **同一族里还开着的那一条**：`type-param-template-literal-constraint`
  （`<X extends \`a${A}b\`>`）是**另一根**——那一格连整条 `FunctionDeclaration` 都不成形
  （缺 15 多 7、带一处未映射 `Bracket`），不在「投影摊开」这一层。

### 第 845 轮：泛型段 / 生成器星号的**名字闸要看实义单元**——`mut-cls-generic-*` 那一族收掉 8 条

**一句话**：一个词与它后面那段东西之间的**注释**是 trivia，而三处判据都拿「紧挨着的那一格」当答案：

- `generic-type.xl.md` 的 `IsGenericStart` 名字闸取 `unit.Last()`——`m/* c */<T>(x: T): T { … }`
  里 `<` 前面是那条注释 ⇒ 判否 ⇒ `<…>` 退回裸符号 ⇒ 参数表那一段找不到 `GenericType`
  ⇒ 整条成员散架（`mut-cls-generic-method-arrow-field-58`、`gap-sweep-comment-generic-01`）；
- `method-declaration.xl.md` 的 `GeneratorMark` 之后用 `SkipNextWrapSymbol`（只跳软换行）——
  `{ * /*c*/ g() {} }` 里 `nameIndex` 落在注释上 ⇒ 生成器方法整条不成形（`gap-a-comment-06`）；
- `IsAllowedFollower` 的「只看同一行」那一句把**块注释开头**当成这一行到此为止——
  `m<T>/* c */(x: T): T { … }` 里成员位**不是类型位** ⇒ 这次试读被判否
  （`mut-cls-generic-method-arrow-field-61`）。

- **名字闸改成「最后一个实义单元」**：`LineWrap` 与 `IsTriviaUnit` 往回跳过（写法与同文件的
  `IsDeclarationHeadHost` 同源），没有 trivia 时落点就是原来那一格。`?` 那支的两格一起改
  （`m?/* c */<T>()`）。
- **`GeneratorMark` 之后两处 `SkipNextWrapSymbol` → `SkipNextTrivia`**（`Previous` 与 `Process`）：
  与第 817 轮那三处（名字与参数表之间）同一条口径，这一格是漏网。
- **`IsAllowedFollower` 跨过块注释再看后继**：`/* … */` 只是 trivia，`>` 后面的后继就是那个 `(`；
  注释里带换行、或者没闭合，照旧按「这一行到此为止」。
- **收掉的 8 条**：`mut-cls-generic-method-arrow-field-58` / `-61`、`gap-a-comment-06`、
  `gap-sweep-comment-generic-01`、`gap-r676-generic-comment-before-args`、
  `gap-r676-call-comment-before-args-generic`、`mut-type-cond-generic-in-true-branch-152`、
  `mut-type-fn-generic-arg-90`（后两条是同一根的另一处落点）。八行 `xl:known-gap` 删掉，
  三条 `xl:expect` 按新形状重算（`SymbolToken` / `TypeLiteral` 那一套没了，换成
  `GenericType` / `Function` / `TypeParameter` / `Parameter` / `ReturnType` / `Method`）。
- **数字**：`cases:tsast` 的账 **31 → 23 还开着**（`coverage` **3974 → 3982 / 4183**，
  blocked **71 → 63**，`bad` 0、`regressions` 0）；16 片全绿、`cases:tags` 0 条不一致。

### 第 844 轮：修饰词**要看下一格**——`SWEEP-{newline,linecomment}/clsmod` 收掉 3 条，另收 1 条同族

**一句话**：修饰词原来只按**词形**认（`declaration-common.xl.md` 的 `IsDeclarationModifier` 一张表），
而 TS 那边 `parseAnyContextualModifier` 还要问**下一格**（`nextTokenCanFollowModifier`）：
`public` / `private` / `readonly` / `abstract` / `async` / `declare` 这些词，下一格**必须与它同一行**、
而且得**像个名字**（字面属性名 / `[` / `{` / `*` / `...` / `#x`）；只有
`static` / `get` / `set` / `export` / `default` / `const` 那一档**不看同一行**。
于是 `class C { …; private` 换行 `m() { } }` 里 TS 认的是「一条名叫 `private` 的属性（ASI）+ 一条方法」，
本工程把 `private` 收进了 `modifiers`（`gap-sweep-newline-clsmod-03` 缺 3 多 2、
`gap-sweep-linecomment-clsmod-04` 缺 3 多 2）；`public static` 换行 `readonly a = 1;` 里
`static` 反而是修饰词（它不看同一行），本工程却在 `static` 那里断成两条成员
（`gap-sweep-newline-clsmod-01` 漂 1 多 3）——**一根子两个方向**。

- **判据落在 `declaration-common.xl.md` 的三个新方法上**：`CanFollowDeclarationModifier`
  （TS 的 `canFollowModifier` / `canFollowGetOrSetKeyword` 两张表，外加 `#x` 那一格）、
  `IsLineBreakTrivia` / `HasDeclarationLineBreak`（trivia 里有没有换行，**块注释里的换行也算**
  ——TS 的 `hasPrecedingLineBreak` 就是这么置位的）、`ModifierFollowsDeclaration`（两半合起来）。
  `DeclarationStart` 的反向走法天然知道「下一格」——就是上一轮停下的那个 `start`。
- **`FieldCloseRule.Previous` 开头也要问同一句**：这一格是修饰词就**不是名字**
  （`public static` 换行 `readonly a = 1;` 里 `static` 后面虽然是一个换行，可它下一格是字面属性名）。
  不挡这一下，成员在 `static` 那里就断了——第 819 轮那个只看行注释的 `spaced` 特例要兜的
  正是这一根，现在两处合一条判据，那个特例删掉。
- **`MemberEnd` 的行注释那一支收窄到 `tail !== index`**：它原来是给上面那个错认兜底的；
  留着管「只有名字」那一半会把 `private //c` 换行 `m() { }` 里 `private` 那条成员整个吞掉
  （TS 那边它是**一条只有名字的字段**，注释与换行都是 trailing trivia）。
- **`MemberEnd` 另补一格「注释里面的换行」**（本轮实测的第二处）：TS 的 ASI 读的是
  `hasPrecedingLineBreak`，换行落在**块注释里面**时上面那条 `item instanceof LineWrap` 根本轮不到——
  `class C { public /*x` 换行 `y*/ m() {} }` 里成员从 `public` 一路吞到注释后面
  （产物 `PropertyDeclaration [10,31)` 而 TS 是 `[10,16)`）。判据与上一条 `afterNameWrap` 同一档：
  **只在「这一条成员目前只写了名字」且下一格不是延续符号 / `(`** 时才收尾
  （`a: /*c` 换行 `*/ number;` 那一格是类型的一部分，`a /*c` 换行 `*/ = 1` 还是一条成员）。
- **收掉的 3 条**：`gap-sweep-newline-clsmod-01` / `gap-sweep-newline-clsmod-03` /
  `gap-sweep-linecomment-clsmod-04`。三行 `xl:known-gap` 删掉，`-01` 的 `xl:expect`
  从 `Field:2` 改成一条（它原来那次分裂正是这个 bug 的另一半）。
  另补一条守卫用例 `tests/cases/token/declarations/decl-modifier-blockcomment-linebreak.ts`
  （块注释里那个换行）——语料里那三条的换行都在注释**外面**，这一格此前没人钉。
- **量到、新登的 2 条**（顶层版本，`--snippets` 量的）：
  [gap-sweep-newline-mod-declare-01.ts](tests/cases/token/modules/gap-sweep-newline-mod-declare-01.ts)
  （`declare` 换行 `module "m" {}`）与
  [gap-sweep-newline-decl-abstract-01.ts](tests/cases/token/declarations/gap-sweep-newline-decl-abstract-01.ts)
  （`abstract` 换行 `class A {}`）。**根因换了**：这两个词现在**不再**收进 `modifiers` 了，
  可它们作为**散词**被 `KeywordCloseRule` 升级成 `<Keyword>` ⇒ 投影多一个 `DeclareKeyword` /
  `AbstractKeyword`，而 TS 那边是 `ExpressionStatement > Identifier`——**顶层那个词的归宿在语句层**
  （与第 842 轮 `async` 那条同一档：`Keyword.IsUpgradable` 的例外表），不在这一轮。
- **数字**：`cases:tsast` 的账 **32 → 31 还开着**（收掉 3 条、新登 2 条；
  `coverage` **3970 → 3974 / 4183**，blocked **72 → 71**，`bad` 0、`regressions` 0、
  `newlyPassing` 没有新增）；16 片全绿、`cases:tags` 0 条不一致、`cases:shapes` 0 未覆盖。

### 第 843 轮：`do…while` 的体与 `while` 之间的 trivia——`SWEEP-{comment,linecomment}/dowhile` 收掉 2 条

**一句话**：`do-while.xl.md` 里从「体」走到「`while`」的那两步走的是 `SkipNextWrapSymbol`
（只跳软换行），而 TS 那边体与 `while` 之间**夹一条注释与夹一个换行是同一种排版**
（第 817 / 818 轮那条口径）⇒ 判据看到的是注释、`while` 认不出来 ⇒ 整条 `do` 退回
`WhileCloseRule`，产物成了「散 `do` 关键字 + 一个独立的 `While`」（各缺 6 多 2）。
三处（`BodyEnd` 取体尾 / `Previous` 认形状 / `Process` 真搬）都改成 trivia 口径，
并把跨过的注释**显式收进 `DoWhile`**（`CommentsIn`，与 `switch` 第 595 轮同一手：
注释落在被 `ReplaceCountAt` 替换掉的那一段里，不收就等于删掉）。
补上之后 `cases:tsast` 的账 **34 → 32**（`coverage` **3967 → 3970**，
`token` 那一类 blocked 74 → 72）。

- **`BodyEnd` 那一格**：`do { a(); } /*c*/while (b);` 里 `while` 前面紧挨着的是那条注释，
  照 `i - 1` 取就把注释当成体的最后一格 ⇒ 改成 `SkipPreviousTrivia`（软换行本来就跳，
  这里只是把注释并进同一档）。
- **`Previous` / `Process` 那两格**：`SkipNextWrapSymbol` → `SkipNextTrivia`
  （顶层是 `do` 词那一支，与上面壳里那一支各自一份）。
- **条件自成一条壳时，壳里第一格也可能是注释**（第 843 轮实测的第二处）：
  `do x++; /*c*/ while (c);` 里 `x++;` 的 `;` 先把体收成壳，条件那一段又收成一条壳
  —— 而**语句壳只丢软换行、不丢注释**（`Statement.FormFrom`）⇒ 条件壳是
  `[AreaAnnotation, while, (c)]`，照 `Data[0]` 取看到的是注释。
  所以取条件之前先跳过壳里的 trivia；而且条件壳**自己会被替换掉**，
  里面那条注释要单独 `CommentsIn(condShell.Data, …)` 收一遍。
- **没做的两格（如实记在这里）**：
  - **`do {} while (a) b()`**（`stmt-do-while-then-statement`，仍开着）：TS 在 `do…while` 的
    `)` 后面**无条件**按 ASI 断句（下一格是不是换行都断），我们这边那条语句与 `DoWhile`
    住**同一条壳**里 ⇒ 多一个 `ExpressionStatement [0,19)`。要收它得让语句层在
    `do…while` 形状的末尾断壳 —— 是另一笔账，不在这一轮。
  - **`do x++; //c`** 换行 **`while (c);`**：行注释**自成一条只装 trivia 的壳**
    （`Statement > LineAnnotation`）⇒ 上面那条「跳过壳里的 trivia」还得多一层
    「跳过只装 trivia 的壳」。这一格不在语料里（本轮探针量的），也留着。
- **收掉的 2 条**：`gap-sweep-comment-dowhile-01` 与 `gap-sweep-linecomment-dowhile-01`。
  两行 `xl:known-gap` 删掉、两条 `xl:expect` 按新形状重算（`While` / `WhileBody` /
  `WhileCompare` + 散 `Bracket` / `Keyword` 那一套没了，换成 `DoWhile`）。
  另补一条守卫用例 `tests/cases/token/statements/stmt-do-while-expr-comment.ts`
  （体是**表达式语句** + 块注释）——语料里那两条的体都是块，`BodyEnd` 那一格此前没人钉。

### 第 842 轮：**`async` 是上下文关键字**——`SWEEP-{newline,linecomment}/async` 那两格收掉 2 条

**一句话**：`Keyword.IsUpgradable` 的例外表里立着四档（`as const` / 装饰器名位 / 枚举成员 /
`override`），而 **`async` 漏在外面**——它同样是**上下文关键字**：TS 那边只有
「`async` 紧跟 `function`」这一种写法才把它收成修饰词（`AsyncKeyword` 节点），
其余位置那个词都是**普通 `Identifier`**。`async` 换行（或夹一条行注释）
`function f() { … }` 里语句层已经按 ASI 把 `async` 收成**单独一条壳**
（TS 那边正是 `ExpressionStatement > Identifier`），可它一升级就投成 `AsyncKeyword`
⇒ 那一格「缺 `Identifier` 1 + 多出 `AsyncKeyword` 1」。补上之后 `cases:tsast`
的账 **36 → 34**（`coverage` **3964 → 3967**，`token` 那一类 blocked 76 → 74）。

- **判据与 `override` 同一档**（`typescript/tokens/keyword.xl.md` 的 `Keyword.IsUpgradable`）：
  看**后一个实义单元**（`SkipNextTrivia`），是 `function` 才升级。
  两格都可能是 `Identifier` 或 `Keyword`（升级是一格一格跑的），所以两种形态都认
  （与 `SwitchCloseRule.WordOf` 同一个写法）。
- **为什么只看 `function`**：另外两档**都不靠这个 `Keyword` 单元**——
  箭头那一档（`async (x) => x`）由 `Lamda.IsAsync` 从**前一个 `Identifier`** 认出来
  （`lamda/lamda.xl.md` 问的正是 `instanceof Identifier`，它跑在升级之前）；
  函数头与方法那一档由 `modifiers` 那一列**按文本**收
  （`print-ast-common.xl.md` 的 `["async", "AsyncKeyword"]`）——`async function f() {}`
  的产物里那个词**根本不在 `Data` 里**（`<Function name="f" modifiers="async">`，
  子单元只剩名字 / 括号 / 体）。所以不升级一个字都不影响那两档，
  只把值位那几格**多出来的** `AsyncKeyword` 去掉。
- **同一形状还能量出三格**（本轮探针，此前不在语料里）：`async;`、`x = async;`、
  `async(1);` —— 各缺 1 多 1。这一轮**补了一条守卫用例**
  `tests/cases/token/statements/expr-async-identifier-value.ts`（调用位 + `let` 初始化位），
  照规矩带 `xl:expect`。
- **`await` 这一轮不动**：它在值位那几格（`await;` 那种裸写）同样与 TS 不符
  （探针实测：缺 `Identifier` 1 多 `AwaitKeyword` 1），可它的投影侧还有
  `AwaitExpression` 那一族靠「前导 `Keyword(await)`」成形
  （`print-ast-common.xl.md` 的三处），动它要先量清那三处 —— 如实记在这里，
  不塞进这一轮，`await` 也没有对应的 `xl:known-gap` 用例。
- **收掉的 2 条**：`gap-sweep-newline-async-01` 与 `gap-sweep-linecomment-async-01`。
  两行 `xl:known-gap` 删掉、两条 `xl:expect` 按新形状重算（`Keyword:2` → `Keyword`、
  `Identifier` → `Identifier:2`）；`gap-d-generics-tuple-mapped-02` 那一格
  （`async` 泛型箭头，仍然是已知缺口）的标签也跟着动了 —— `Keyword` 没了、`Identifier` 6 → 7，
  按新形状重算。

### 第 841 轮：`switch` 分段的两个「差一格」——`B-oneline` 那一族收掉 5 条

**一句话**：`switch` 的分段一直靠「**顶层单元里找段头**」，这一轮把它前面那两步判据各补一格。
（1）**切壳那一支只认「段头前面紧挨着 `:`」**：上一段的体收在**块**里时（`case 1: { break; }`
后面直接跟 `default:`，中间没有 `;`），段头前面那一格是 `}` 而不是 `:` ⇒ 找不到切点
⇒ 壳从 `case 1:` 一路收到末尾那个 `;` ⇒ 两段进同一条壳 ⇒ 顶层扫描只看得到第一个段头（缺 2~3 漂 1 多 3）。
（2）**`IsSwitchBodyBracket` 往回走的是 `SkipPreviousWrapSymbol`（只跳软换行）**：
`switch /* c */ (a) { … }` 里它看到的是那条注释 ⇒ 体括号认不出 ⇒ 切壳这一支**一次都不响**
（缺 5 漂 1 多 3）。两处补上之后 `cases:tsast` 的账 **41 → 36**
（`coverage` **3958 → 3964**，`token` 那一类 blocked 82 → 76）。

- **根一：切点把「上一段的体是个块」漏在外面**（`typescript/tokens/statement.xl.md` 的
  `LastClauseHeadIndex`）。这个帮手只在**终结符落下的那一刻**被 `FormFrom` 问一次
  （第 576 轮立的口径），它原来的三条判据里第三条是「前面紧挨着的实义单元是 `:`」——
  那一格是为 `case 1: case 2: y();` 这种**落穿**写法立的。可上一段的体要是块，
  段头前面就是 `}`：`switch (a) { case 1: { break; } default: break; }` 里
  那个 `;` 是**最后**一段的终结符，那一刻列表里 `default` 前面紧挨着的是块括号
  ⇒ `found = -1` ⇒ 一刀不切。补法只是**并列加一条**：前面是 `{` 开的括号也算段头前面那一格。
  原来那一档（前面是 `:`）一个字没动 —— 落穿写法与 `case 1: obj.default = 1;`
  那一档（前面是 `.`，第 574 轮实测 1027 → 1025 退回来的那一格）都还走老路。
- **为什么不改语句层**：用例头原来那句记的是「块当语句边界的改法已被否决」——
  让 `}` 结束一条语句是不行的（`f({}) g()` 那种排版在 TS 里也不是两条语句，
  而块在**值位**与**语句位**是两种东西）。这一轮**没有**动语句层：
  判据只落在 `switch` 体那一支上，而 `FormFrom` 早就把「体括号是不是 `switch` 的」
  问成了 `IsSwitchBodyBracket`（第 576 轮），所以放宽的范围天然只覆盖 `switch` 体。
- **根二：`IsSwitchBodyBracket` 该跨 trivia**（同一份文件）。它站在那个 `{` 上往回看
  「前面是不是 `switch` 再一个 `(`」，而 `SwitchCloseRule.Previous` 认这条语句时
  跨的是 **trivia**（第 595 轮：`switch /* c */ (a) { }` 与 `switch (a) /* c */ { }`
  在 TypeScript 里都是 `switch` 语句）——两处口径不一致，症状是「**认得出、切不了**」：
  `Previous` 把那一段收成 `Switch`，可切壳那一支一次不响 ⇒
  `switch /* c */ (a) { case 1: case 2: b(); break; default: c(); }` 里
  第一个 `CaseClause` 漂到 `[21,48)`、第二个 `CaseClause` 与 `b()` 整条落空。
  两处 `SkipPreviousWrapSymbol` 改成 `SkipPreviousTrivia`，与 `Previous` 一字不差。
- **收掉的 5 条**：`gap-b-oneline-0{1,2,3}`、`stmt-switch-block-then-default`、
  `stmt-switch-comment-fallthrough`。五行 `xl:known-gap` 删掉；三条 `B-oneline` 的
  `xl:expect` 按新形状重算（这一次标签真的动了：`TypeDefine` / 那个多出来的 `Identifier`
  没了，换成 `SwitchSegment:2` / `SwitchStatement:2`；`cases:tags` 0 条不一致）。
- **换行写法一直是绿的**：`case 1: { break; }` 换行 `default:` 里那个换行已经收过壳，
  两条壳本来就在顶层 ⇒ 同一形状的多行版（探针 `s8`）从来没红过 —— 这一轮补的正是
  「**单行**」那一格，`B-oneline` 这个前缀就是这么来的。

### 第 840 轮：**没体的环境模块 `declare module "mm";`**——`M-misc` 那一族收掉 2 条

**一句话**：`ScanBody` 只认「名字后面有一个 `{`」那一档，而 TS 的 `AmbientModuleDeclaration`
**允许没有体**（`declare module "mm";` / `module "mm";` 在 `ts.createSourceFile` 那边都是
`ModuleDeclaration` + `StringLiteral`、**零语法错**）——少了这一档，整条声明落成一个
`ExpressionStatement`（缺 2 多 1）。补上之后 `cases:tsast` 的账 **43 → 41**
（`coverage` **3955 → 3958**，`token` 那一类 blocked 84 → 82）。

- **根：收尾规则只认「有体」那一种形状**（`namespace/namespace.xl.md`）。
  新判据 `ShorthandEnd`：名字是 **`String`**、`ScanBody` 找不到 `{`、且名字后面
  **再没有别的东西**（或只有一个 `;`）⇒ 这是简写档，声明终点在名字上。
  `Previous` 两档并列（有体 / 简写），`Process` 那一趟按 `bracketIndex < 0` 分岔：
  没有体就不建 `NamespaceBody`，自己签出到终点。
- **收尾那一刻列表只到名字**（**踩出来的**）：这条规则在每一格新单元到达时各问一次，
  问「简写」时 `units` 正好停在名字上（那个 `;` 还没进来，实测
  `[Identifier:declare, Identifier:module, String]`）。所以「**列表到名字为止**」就是简写的
  信号；而那个 `;` 到达时它已经成了**另一格**（`Statement`），由**投影侧**按
  「没体的声明自己吃尾分号」补进区间——`Namespace.PrintAst` 走 `ctx.SemicolonEndOf`
  （第 838 轮那条口径**同一份实现**，`consumedSemicolons` 于是自然对账：
  紧跟的那一格不再投成 `EmptyStatement`）。**带体的一档不吃**：`module M { };` 里那个 `;`
  是另一条 `EmptyStatement`（`ModuleDeclaration` 在 `NO_TRAILING_SEMICOLON` 表里）。
- **`SkipNext*` 那一族每调一次都至少前进一格**（同一轮踩到的第二处）：
  `SkipNextWrapSymbol(units, SkipNextTrivia(units, nameIndex))` 会**多跨一格**
  （第一个已经落在名字后面了）⇒ `Get` 越过那个 `;` 拿回 `null`、简写判成「终点在名字上」——
  形状对了、可那个 `;` 被留成空语句（实测产物 `ModuleDeclaration[188,210)` + 多一个
  `EmptyStatement`，TS 是 `[188,211)`）。两处 `SkipNext*` 一律**从同一格出发各问一次**。
- **收掉的 2 条**：`gap-m-misc-03`（`declare module "*.css";`）与
  `mod-declare-module-shorthand`（`declare module "mm";`）。两行 `xl:known-gap` 删掉、
  `xl:expect` 按新形状重算（**这一次标签真的动了**：`declare` / `module` / 字符串
  折进 `Namespace` 之后 `Keyword` / `String` / `ConstString` 三个标签都没了，
  换成 `Namespace:1`）。另补一条用例钉住「名字与 `;` 之间夹注释」那一格：
  `mod-module-shorthand-comment`。
- **试过又退回的（如实留在这里）**：**类成员修饰词折行**那一族
  （`gap-sweep-*-clsmod-01/03/04`）。三条的根是同一个（TS 的 `parseModifiers`：那一串修饰词里
  **只有 `static` 允许被换行跟**，其余每一个后面必须在同一行跟到东西、否则那个词就是成员名），
  逐词量过（`static` ⇒ 一条成员；`public` / `private` / `protected` / `readonly` / `abstract` /
  `override` / `accessor` / `async` / `declare` ⇒ 两条）。改法落在 `Field.MemberEnd` +
  `ClassMember.Process` 的「这个换行算不算边界」上：第一版加进去之后
  **成员不再被切成两条**（`PropertyDeclaration` 区间对了），可**名字与 `modifiers` 仍然错**
  （名字成 `static`、`modifiers` 空着）——那是**更前面**那一格（谁被认成名字）决定的，
  不是这一格。改动**整份撤回**（三份文件一行不留），缺口照旧开着，
  三条的形状与量出来的读数写在这里给下一轮。
- **可复用的判据**：**「列表到哪儿为止」决定得下什么形状**。收尾规则在**每一格到达时**各跑一次，
  所以「后面还有没有东西」这一刻的答案是**当时的**答案——需要后面的信息时要么等它到达
  （第二次问），要么把那一格交给**投影**（`SemicolonEndOf` 那一档就是这么分工的）。

### 第 839 轮：**`export` 后面不可能是一行的终点**——`ns` 那一族收掉 2 条

**一句话**：第 822 / 825 / 828 / 835 轮把「这个词后面必须跟东西」逐个补进 `ExpectsOperand`
（`let` / `const` / `var`、`function` / `class` / `interface` / `enum`、`try` / `do` / `else` /
`finally`、`for` / `while` / `switch`），**漏了 `export`** —— 而导出声明里没有 ASI
（TS 的 `parseExportDeclaration` 不看换行），`export` 换行 `const a = 1;` 是**一条**声明。
补上这一个词之后 `cases:tsast` 的账 **45 → 43**（`coverage` **3952 → 3955**，
`token` 那一类 blocked 86 → 84）。

- **根：`export` 不在 `ExpectsOperand` 的词表里**（`statement.xl.md`）。
  换行那一刻 `LineCannotEnd` 判「这一行写完了」⇒ 收壳 ⇒ `export` 自己成一条
  `ExpressionStatement(Keyword)`、声明另起一条 ⇒ 前缀与声明**不在同一个壳里**，
  而列表那趟的「`export` + 一条声明」合并只认**平级的两格**、认不出「已经分家」⇒
  TS 那条带 `ExportKeyword` 的声明整条缺（实测两条：缺 1 多 2）。
- **判据与 `let` / `function` 同一条**：这个词**不可能结束一条语句**——`export` 是保留字，
  既不能当标识符、也没有「`export` 单独成句」这种写法；而它在**成员位**上
  （`a.export`）由「点号后面是成员名」那一问挡着，与 `default` / `new` 同一档。
- **`declare` 不在这一档，而且方向相反**（同一轮 `--snippets` 实测）：`declare` 是
  **上下文关键字**、可以当标识符，TS 那边 `declare` 换行之后走的是 **ASI** ——
  `declare` 自己成一条表达式语句、下一行另起。**两行排版一样、结论相反**，
  所以这一格只能按 TS 的读法分，不能按词形分。**这一族没修**（产物把那个孤零零的
  `declare` 投成了 `ExpressionStatement > DeclareKeyword`，TS 是 `> Identifier`；
  分词是对的、只是投影那一格把词当成了修饰词），也不在语料里。
- **形状覆盖**：`export` + 换行 / 行注释 + `const` / `function` / `class` / `interface` /
  `type` / `enum` / `namespace` 七种声明、顶层与 `namespace` 体内两种位置，共 **10 条片段**
  本轮一起变绿（`--snippets` 量过）。
- **收掉的 2 条**：`gap-sweep-{newline,linecomment}-ns-01`。两行 `xl:known-gap` 删掉，
  **`xl:expect` 要重算**（这一次标签真的动了：`Keyword` 那一个标签没了——
  `export` 与声明同一个壳之后它成了 `Let` 的 `modifiers`、不再单独占一格；
  `Statement` 3 → 2）。另补一条用例钉住顶层那种位置：`mod-export-newline-declaration`。
- **可复用的判据**：**「这个词后面必须跟东西」的词表要按「它能不能单独成句」判**，
  不是按「它是不是声明词」判 —— `declare` 是声明词却**能**单独成句（上下文关键字可以当
  标识符），`export` 不是声明词却**不能**。同一张表上两行排版一样的例子对着写着。
- **留下的一族**：`declare` 换行那一族（见上）、`gap-sweep-*-clsmod-*`（类成员修饰词折行）、
  `gap-sweep-*-ifelse-*`、`gap-sweep-*-dowhile-*`、`gap-sweep-*-async-*` 与 `gap-b-*` /
  `gap-c-*` 那几族本轮不动。

### 第 838 轮：**尾分号归谁，问的是「上一条语句的 kind」而不是原文那一格**——七条收掉

**一句话**：一条语句末尾那个 `;` 归不归它，TS 的判据只有一条——**这条语句自己调不调
`parseSemicolon`**；而产物这边原来有两处在**看原文的字符**：`projectStatement` 看
「`;` 前面那一格是不是 `}`」、`astNode` 看「kind 在不在 `SIGNATURE_KINDS` 里」。
两处都是把**形状**当成了**语法**（`const o = { … }` 与 `function f() {}` 的前一格都是 `}`）。
四处判据补齐之后 `cases:tsast` 的账 **52 → 45**（`coverage` **3941 → 3952**，
`token` 那一类 blocked 93 → 86）。

- **根 ①：`;` 的归属只看得到原文那一格**（`print-ast-common.xl.md`）。`projectStatement`
  那一条空语句的分支写的是 `";}{".includes(source[前一个非空白字符])` —— `}` 一律当「空语句」。
  可 `const o = { a: 1 }` 换行 `;` 里那个 `;` **归 `VariableStatement`**（它的区间含 `;`），
  而 `function f() {}` 换行 `;` 里那个是**新的空语句**（带体的声明收在 `}` 上）。
  修法是把这一问搬到**知道上一条是什么**的那一层（列表那一趟）：新判据
  `ownsTrailingSemicolon(上一条, ctx)` —— 四档：空语句不吞下一个（`;;` 是两条）、
  自己已经以 `;` 收尾的不吞（`parseSemicolon` 只吃紧跟的那一个）、带标签的问**被标的那条**、
  其余按 `NO_TRAILING_SEMICOLON` 那张表（第 663 轮定的，这里只是第一次真的按它判）。
- **根 ②：「这一格末尾那个 `;`」不能按起点找**（同一个文件）。`function f() {} /*c*/;`
  里那一格是**「注释 + `;`」**——起点在注释上、`;` 在末尾，按起点判就把整格当 trivia 丢掉
  ⇒ 空语句整格不见。新判据 `trailingSemicolonOf` 落在**这一格自己的区间末字符**上。
  **这一条当场踩了一次**：一整行注释以 `;` 收尾时（`//     : never;`，`dist/ts` 里成片都是）
  末字符也是 `;` —— 所以还要问一句「末尾那一格有没有落在某个子单元的区间里」（注释里的
  `;` 不算）。**普查里这一处多出 8 份文件各 1–4 个 `EmptyStatement`，是它逮住的。**
- **根 ③：带体的可调用签名多算一格**（`astNode`）。那条 `SIGNATURE_KINDS` 的规则
  （第 134 轮）**自己写着**「**没有函数体**的可调用签名」，可代码只看 kind ⇒
  `function f() {};` 的 `FunctionDeclaration` 多含一个 `;`、同时那条 `EmptyStatement` 又缺
  （实测 `stmt-generator-trailing-semicolon`：缺 1 漂 1 多 1）。补上 `props.body === undefined`
  之后，`;` 与 `,` 两档照旧、带体的一档交回列表那趟。
- **根 ④：自己已经有终结符了还往后找**（`semicolonEndOf`）。`f();` 换行 `;` 里第二行那个 `;`
  是**新的空语句**，而这一支一路跳过空白与注释把它算成了上一条的终结符
  （`parseSemicolon` 只吃**紧跟**的那一个）。补一句「自己已经以 `;` 收尾就原样返回」。
- **两处新出口**：关键字语句（`return` / `throw` / `break` / `continue` / `debugger`）的
  `end` 补上 `semicolonEndOf`（`for (;;) break;` 那个 `;` 被外层 `For` 收走、`break label;`
  那个落在兄弟格上，壳里**根本没有** `;`）；**没体的函数声明**（环境签名 / 重载）也补上
  （`declare function f(): void /* c */ ;` 的区间原来停在最后一个实义单元）。
- **收掉的 7 条**：`decl-declare-function-trailing-comment`、
  `gap-sweep-newline-{obj-03,export-01}`、`gap-m-misc-0{1,2}`、`gap-a-comment-01`、
  `stmt-generator-trailing-semicolon`。七条文件头的 `xl:known-gap` 逐条删掉
  （`xl:expect` 一条没动——`cases:tags` 本来就是绿的：标签计数与分号归属无关）。
  **另补 4 条新用例**钉住这次量出来的形状：`stmt-declaration-body-trailing-semicolon`、
  `stmt-empty-semicolon-next-line`、`stmt-label-block-trailing-semicolon`、
  `im-import-trailing-semicolon-next-line`。
- **可复用的判据**：**「归谁」要问语法（kind），不要问排版（字符）**。同一个字符
  （`}` / `;`）在两种构造下含义相反，而两者在原文里长得一模一样；这类判据只有放到
  **知道上下文的那一层**（列表那趟知道上一条、投影那层知道有没有体）才不会随排版漂。
- **留下的一族**：`gap-sweep-*-clsmod-*`（带体声明后面那个 `;` 已收，
  类成员修饰词折行还没动）、`gap-sweep-*-ifelse-*`、`gap-sweep-*-ns-*`、
  `gap-sweep-*-dowhile-*`、`gap-sweep-*-async-*` 与 `gap-b-*` / `gap-c-*` 那几族本轮不动。
- **量出来但没修**（不在语料里，如实留在这里）：`for (;;) break` 换行 `;` 里
  **`ForStatement` 自己的终点**没跟着体的终点走（`BreakStatement` 已对、`For` 仍差一格）。

### 第 837 轮：**「假分支还没写」那一问放开到三元**——`cond` 那一族收掉 2 条

**一句话**：第 581 轮那条判据（`IsUnfinishedConditionalType`）先找 `extends`、再从它往后找 `?`，
只为躲开 `type X<T extends U> = { … }` 换行那一族 —— 可**光看 `?` 就够了**
（声明头里不可能出现一个裸 `?`），而 `extends` 那一问把**三元整族**挡在外面。
改成 `IsUnfinishedQuestionColon`（只问「顶层有一个 `?`，而它的 `:` 还没写」）之后
`cases:tsast` 的账 **54 → 52**（`coverage` **3939 → 3941**，`token` 那一类 blocked 95 → 93）。

- **根：`LineCannotEnd` 在 `? … :` 的换行处收了壳**（`statement.xl.md`）。
  `const x = a ? b :` 换行 `c;` 里 `:` 后面那一格**一定**是假分支
  （`?` 与 `:` 之间不可能有平级 `,` / `;`，见 `ternary-operator.xl.md` 的 `Previous`）——
  可 `IsUnfinishedConditionalType` 一个 `extends` 都没找到 ⇒ 判否 ⇒ 收壳 ⇒
  列表变成 `[a, ?, b, :]` 一个壳 + `[c]` 另一个壳（实测产物 `[0,17)` vs TS `[0,21)`：
  三元整条缺、`c` 多出一个 `ExpressionStatement`）。
- **放开是安全的**：答案只在「这一行的 `?` 确实还差一个 `:`」时才为真，
  而那种行尾在 TS 里只有「还没写完」一种读法。原来那一问防的是
  `type X<T extends U> = { … }` 换行 —— 那个例子里 `{ … }` 里的 `a: string` 是
  `Bracket` 单元**内部**的内容、不在这一层的 `units` 里 ⇒ 顶层一个 `?` 都没有 ⇒ 照旧判否。
- **成形那一侧本来就是对的**：`TernaryOperatorCloseRule.Process` 的 `endIndex` 扫描
  只看 `,` / `;` / `:` 三格，**软换行与注释都不在它的终止符表里**
  ⇒ 假分支跨行时它照样一路收到 `;`。所以这一轮只需要修解析期那一问
  （与第 581 轮条件类型那一对的落点完全一样：**解析期不收壳** + **成形期跨过那个换行**）。
- **收掉的 2 条**：`gap-sweep-{newline,linecomment}-cond-03`。两条文件头的 `xl:known-gap`
  逐条删掉、`xl:expect` 按新形状逐条重算（`cases:tags` 0 条不一致）。
- **可复用的判据**：**形状判据别写成「只有某一族才有」**。第 581 轮那一问的形状是
  「顶层 `?` + 它的 `:` 没写」，`extends` 只是那一轮**量到的样本**带进来的副产品；
  样本里没出现的那一族（三元）于是被一起挡在门外，而**症状长得完全不一样**
  （条件类型是「缺一个类型节点」，三元是「整条语句分家」）。
- **留下的一族**：`gap-sweep-linecomment-cond-03` 的**另一半**仍在（假分支段首那个注释
  还在 `TernaryOperatorFalseStatement` 里，`漂 4` 是它）；`gap-sweep-*-clsmod-*`
  （类成员修饰词换行）与 `A-comment` 那一族本轮不动。

### 第 836 轮：**`${ … }` 里不收语句壳**——`tpl` 那一族收掉 3 条

**一句话**：模板串的内插段装的是**表达式**（TS 的 `TemplateSpan.expression`），不是语句 ——
所以软换行落在 `${ … }` 里时不该收 `Statement` 壳。两处成形器各补一档之后
`cases:tsast` 的账 **57 → 54**（`coverage` **3936 → 3939**，`token` 那一类 blocked 98 → 95）。

- **根：`Statement` 壳收进了 `<InterpolationString>`**（`statement.xl.md` 的 `FormFrom` / `Condition`）。
  `${b` 换行 `}` 里那个换行让壳收下去 ⇒ 内插段底下多一格 `Statement` ⇒
  投影把 `b` 投成 `ExpressionStatement`（`EXTRA ExpressionStatement [14,15) «b»`），
  而 TS 那边 `TemplateSpan` 里直接就是 `Identifier`。
  `${//c` 换行 `b}` 那一版更绕：注释先成了一条壳 ⇒ 内插段里出现
  `[Statement(LineAnnotation), Identifier]` ⇒ 投影报 `FIELD TemplateExpression [10,22)`——
  `templateSpans` 整段投不出来（四栏 `缺 3 漂 0 多 0`）。
- **判据与 `GenericType` 同一档**：`<` 与 `>` 之间装的是类型、`${` 与 `}` 之间装的是表达式，
  两处都是「软换行在这里只是排版」⇒ 两处都按 `owner === "…"` 早早退掉。
  **两处成形器要一起改**（`FormFrom` 的 `;` 那一档与 `Condition` 的换行那一档）——
  与第 583 轮泛型那一档的落点一模一样。
- **收掉的 3 条**：`gap-sweep-newline-tpl-01`、`gap-sweep-linecomment-tpl-0{3,4}`。
  三条文件头的 `xl:known-gap` 逐条删掉、`xl:expect` 按新形状逐条重算（`cases:tags` 0 条不一致）。
- **可复用的判据**：**「这里装的是语句吗」是收壳的唯一前提**。已经有三处按这个前提排掉了
  （`[` / `(` 括号、泛型实参段、对象字面量 / 绑定模式的花括号），这一轮补上第四处（内插段）；
  每加一处都要**两处成形器一起改**，只改一处就只剩一种排版是绿的。
- **留下的一族**：`gap-sweep-*-cond-03`（三元里 `:` 后面的注释）、
  `gap-sweep-*-clsmod-*`（类成员修饰词换行）与 `A-comment` 那一族本轮不动。

### 第 835 轮：**标签头后面的换行不是语句边界**——`label` 那一族收掉 4 条

**一句话**：`lbl:` 换行 `for (;;) { … }` 在解析期被拆成两个语句壳——`lbl` 与 `:` 一个、
`for` 另一个——而 `LabelCloseRule` 是**收尾期**才跑的，那时它再也看不到那一对。
两处判据补上之后 `cases:tsast` 的账 **61 → 57**（`coverage` **3932 → 3936**，
`token` 那一类 blocked 102 → 98）。

- **根 ①：`LineCannotEnd` 见 `:` 就答「这一行写完了」**（`statement.xl.md`）。
  解析期的右手边（`Condition`）在换行那一刻问「左边写完没有」，而 `:` 那一支
  （第 558 / 825 轮定的）只放行两个特例：条件类型的假分支、函数声明的返回类型。
  标签头不在里面 ⇒ 收壳 ⇒ `lbl` 与 `:` 被关进一个壳、`for` 另起一条
  （实测 `gap-sweep-newline-label-01`：`LabeledStatement` 整条缺；`-linecomment-01` 更狠——
  冒号被更晚的 `TypeDefineCloseRule` 当成类型标注，注释成了整个类型：
  `<Identifier>lbl</Identifier><TypeDefine><LineAnnotation>c</LineAnnotation></TypeDefine>`）。
  补的是「`… <名字> <:>` 收尾、且那个名字**自己**是一条语句的开头」这一问
  （`LabelCloseRule.IsPendingLabelHead`）——与第 829 / 830 轮的 `IsPendingImportHead`
  同一档：**头还没写完，换行不是语句边界**。
- **「名字自己是不是语句开头」那一问不能省**：`let a:` 换行 `B` 的行尾也是 `:`，
  可 `a` 在产物里住在 `Statement` 壳里 ⇒ `IsStatementStart` 答否 ⇒ 这一格不生效
  ⇒ 类型标注照旧交给 `TypeDefineCloseRule`（改完 1412 条用例的形状一条没动）。
- **根 ②：`for` / `while` / `switch` 不在 `ExpectsOperand` 表里**。
  第 828 轮把这三个词留在表外的理由写着「它们后面跟的是括号，那一格由『下一行以 `(` 开头』
  那一支管」—— 那条路只在**括号真的在下一行**时成立，而标签头把换行提前了：
  `lbl: for` 换行 `(;;) { … }` 死在 `for` 那一格（`(` 还没读到）⇒
  `<Label/><Keyword>for</Keyword>` 一个壳、条件括号与循环体另一个壳
  ⇒ `LabeledStatement` 只盖住 `[0,8)`（实测 `-02` 与 `-linecomment-02` 两条）。
  这三个词是**判别括号不可省**的那一档，与 `try` / `do` / `else` / `finally` 同一个理由。
  **不会误伤成员名**：`obj.for` / `a.while` 由「点号后面是成员名」那一问挡着
  （`previousIsMember`，与 `default` / `new` 同一档）。
- **踩出来的坑：解析期看不见同一行后面的单元**。第一版 `IsPendingLabelHead` 里还想问一句
  「冒号后面那一格能不能起一条语句」（复用收尾期的 `StatementStartsHere`），
  可那一刻 `Data` 只装着**已经读到的**单元 ⇒ `SkipNextTrivia(data, colonIndex)` 直接落到
  `data.length` 上、`Get` 给 `null` ⇒ 那一问恒为假（探针实测 `[lbl, :, LineWrap]`：
  `nextAt=5`、`data.length=5`）。**右边那一格也不必问**：它如果是运算符 / `.` / `(` / `[`
  之类的续接符，`Condition` 里后面那两条本来就不收壳。
- **一处抽取**：`StatementStartsHere`（`label.xl.md` 的静态方法）**只有一份**——
  收尾期的 `IsLabeledStatement` 与解析期的 `IsPendingLabelHead` 问的是同一张表
  （`LoopStatementWords`），一处写成「词表」、另一处写成「类名表」就是第二份会漂的答案。
- **收掉的 4 条**：`gap-sweep-{newline,linecomment}-label-0{1,2}`。四条文件头的
  `xl:known-gap` 逐条删掉、`xl:expect` 按新形状逐条重算（`cases:tags` 0 条不一致）。
- **可复用的判据**：**解析期那一问只看得见左边**。写「头还没写完 ⇒ 换行不是边界」这类判据时，
  别把收尾期那一问（那时整行都在 `Data` 里）原样搬过来——同一个问题在两个时期
  手里的**证据**不同：收尾期能看右边，解析期只能看左边。
- **留下的一族**：`gap-sweep-*-switch-0X`（`case` 段里的注释）与 `A-comment` 那一族
  （散在六种单元尾巴上）本轮不动。

### 第 828 轮：**「相邻的那一格」在循环里也要跨 trivia**（外加 `try` 换行那一格）——三族收掉 13 条

**一句话**：三处同型——`OptionalCallCloseRule.CalleeStart` 往左找被调者、`SpreadCloseRule` 往右找
被展开的表达式、`UnaryOperatorCloseRule` 往左右找被操作者——**循环/取格**都写成「`i ± 1`」，
注释一夹进来就判不出相邻；再加上 `Statement.ExpectsOperand` 少了 `try` 那一档。
四处补上之后 `cases:tsast` 的账 **89 → 76**（`coverage` **3903 → 3912**，`token` 那一类 blocked 85 → 76）。

- **根因 ①：`i ± 1` 的循环**（四处）。第 817 轮给「相邻的那一格」定了 trivia 口径，
  但那是**点着名改的五处判据**，而**同型的循环**（`ChainEndIndex` / `CalleeStart` /
  `WaitForNotNull` / `IsTupleRest` / 一元那一串）没人一起过一遍：
  - `a/*c*/?.b?.[c]?.(d)`：`CalleeStart` 走到注释上就停 ⇒ 被调者链只剩三个 `NullConditionalOperator`、
    `name` 空着、`a` 留在 `Method` 外面（缺 9 条）；
  - `{ .../*c*/ { a: 1 } }`：`IsOperand(注释)` 给假 ⇒ 那条 `Spread` **完全不成形**；
  - `-/*c*/ a` / `!/*c*/ a`：前缀同样判不下；
  - `a /*c*/ ++` / `i/*c*/++`：后缀那一支的 `SkipPreviousWrapSymbol` 落在注释上。
- **根因 ②：`try` 后面必须跟一个语句体**（`Statement.ExpectsOperand`）。`try` 换行 `{ … } catch …`
  在 TS 里是**一条** `TryStatement`，而 `LineCannotEnd` 在换行那一刻收壳 ⇒
  `try` 自己成一条 `ExpressionStatement(Keyword)`、`catch` 另起一条。
  同一张表上补 `try` / `do` / `else` / `finally` 四个词（**入表条件只有一个**：
  这个词**不能单独成句**——`while` / `for` 后面跟的是括号，不在这一档）。
- **成对改是硬规矩**（第 816 轮）：`Previous` 与 `Process` 各读一次「相邻那一格」，
  只改前者会让节点**判得下却搬不进来**，只改后者会让它**根本轮不到**。
- **收掉的 13 条**：`gap-sweep-{comment,linecomment}-optchain-0{1,2,3,4}`、
  `gap-a-comment-0{2,3,4,5}`、`gap-sweep-comment-for-01`、`mut-fn-decl-9{0,1}`、
  `gap-sweep-{newline,linecomment}-try-01`。前十一自带的 `xl:expect` 一个字都没改
  （注释在 `INVISIBLE` 里，标签计数不变，所以 `cases:tags` 一直是绿的）；
  两条 `try` 的期望按新形状重算（`Try` / `TryBody` / `CatchBody` / `CatchDefine` / `FinallyBody`
  取代了三个 `Keyword`，`Statement` 5 → 4、`Bracket` 4 → 0 —— 括号折进了体里）。
- **试过又退回的**：`do { … } while (b)` 换行 `c();` 那一格（`DoWhile` 的范围已经收对了，
  但语句壳仍然把 `c()` 并进来——缺口在 `LineCannotEnd` 的**左半截**，不在 `DoWhileCloseRule`），
  以及 `GenericType.IsAllowedFollower` 放开「泛型实例化表达式」（`f<string>;`）——
  后者会与 `f(a<b, c>d)` / `a<b>(c)` 这些真比较式撞车，改动面太大。两处都**没有留下半截改动**。

### 第 827 轮：**方法签名那三格**——`iface` 那一族收掉 5 条

**一句话**：方法签名（`m(): void;`）的三个位置各差一条判据——名字与形参表之间、返回类型与收尾 `;` 之间、
以及「`(` 该归谁」。三处都补上之后 `cases:tsast` 的账 **94 → 89**
（`coverage` **3894 → 3899**，`token` 那一类 blocked 94 → 89）。

- **根 ①：`(` 被无名签名抢走了**（`signature.xl.md` 的 `Previous`）。`interface I { m` 换行
  `(): void; }` 里 `(` 前面那一格是**软换行**，而那一支只跳注释（`SkipPreviousAnnotation`，
  第 817 轮定的：成员体里换行就是成员边界）⇒ 判成无名签名 ⇒ `m` 成了没有类型的 `Field`，
  `(): void;` 成了 `Signature`。补的是「**上一行只写了一个名字**」这一问：跳过 trivia 拿到那个名字，
  再看名字**自己**前面是不是一条成员的起点（体那个 `{` / `;` / `,` / 修饰词 / 列表开头）。
  **不能只看「换行前面是个名字」**：`a: number` 换行 `(): void }` 里那个 `number` 也是名字，
  而它是**真正的**无名签名（文档里写着「不跳软换行」的理由就是它）。
- **根 ②：返回类型在注释那里收尾**（`method-declaration.xl.md` 的 `SignatureTailEnd`）。
  `m(): //c` 换行 `void;` 里换行前面紧挨着的是那条 `LineAnnotation`，判「上一行写完了没有」时
  只看 `i - 1` ⇒ `continues` 为假 ⇒ 那条注释成了**整个返回类型**、`void` 掉到外面成了下一条成员。
  改成 `SkipPreviousTrivia(units, i)`（与第 819 / 820 轮那两处同一条口径：判「写完没有」看代码、不看注释）。
- **根 ③：收尾那个 `;` 跨 trivia 没认出来**（同一份文件的 `Process`）。`m(): void` 换行 `;`
  与 `m(): void//c` 换行 `;` 里 `;` 前面隔着一个软换行 / 一条行注释，而那一格只看 `memberEnd + 1`
  ⇒ 区间停在返回类型末尾、`;` 掉在外面成了平级单元（`MethodSignature` 产物 `[25,34)` vs TS `[25,39)`）。
  改成 `SkipNextTrivia`（口径与 `Field.MemberEnd` 的「换行后面只有一条注释或一个 `;` 的不算边界」同源）。
- **同一轮还补了一格同类**：`Field.MemberEnd` 里「名字后面换行、下一行以 `(` 开头」判成成员边界，
  于是 `m` 与它的形参表被切开（**这一格最后没起作用**——`(` 在 `Field` 之前就被 `Signature` 认走了，
  真正的修法在根 ①；判据留着，它挡的是规则顺序反过来时的那条路）。
- **收掉的 5 条**：`gap-sweep-linecomment-iface-0{3,5,6}`、`gap-sweep-newline-iface-0{2,3}`。
  文件头的 `xl:known-gap` 逐条删掉、5 条的 `xl:expect` 按新形状逐条重算（`cases:tags` 0 条不一致）。
- **可复用的判据**：**「这算不算无名签名」有两半** —— 「`(` 前面是不是名字」问的是**上一行**，
  而「换行是不是成员边界」问的是**这一行**。两半混在一起写时，症状是「名字留下、括号另立门户」；
  把「名字前面那一格是不是成员起点」单独问一次，两半就分开了。
- **留下的一族**：`gap-sweep-*-clsmod-*`（类成员修饰词）、`gap-sweep-*-switch-0X`、
  `gap-sweep-*-label-0X` 与 `A-comment` 那一族（散在六种单元尾巴上）本轮不动。

### 第 826 轮：**绑定模式的花括号里也不收语句壳**——`destr` 那一族收掉 7 条

**一句话**：`const { a` 换行 `, b: [c] } = o;` 里那个换行处，**解析期照常在花括号里收了一个
`Statement` 壳**——而模式里的内容是要由 `BindingElementCloseRule` 按**顶层逗号**切的。
三个语句成形器原来只问了「这花括号是不是值位的对象字面量」（`IsObjectLiteralBrace`），
没有问「是不是**绑定模式**」这一格。补上 `IsBindingPatternBrace` 之后，
`cases:tsast` 的账 **101 → 94**（`coverage` **3887 → 3894**，`token` 那一类 blocked 101 → 94）。

- **根：壳把顶层逗号吃掉了**。壳一收下去，模式的一个段就变成一格 `Statement`
  （元素的 `name` 字段整个投不出来）；更狠的是**壳里头**那条逗号规则会把 `a , b` 折成
  `BinaryOperator` ⇒ 顶层逗号一个都不剩 ⇒ 整张模式收成**一个**元素
  （实测 `const { a, b: ` 换行 `[c] } = o;` 的产物是
  `<BindingElement><Statement><BinaryOperator op=",">…`，TS 那边是两个平级 `BindingElement`）。
- **判据落在「`{` 前面那一格」上，不落在 `Parent` 上**（这一条是**踩出来的**）：
  一开始照抄 `BindingElementCloseRule` 的宿主名单（`current.Parent` 是 `Let` / `BindingElement` …），
  实测**一次都不响**——那条规则是**收尾期**跑，那时 `Let` 已经成形；而语句成形器问这一句是
  **解析期**，`const {` 里那个 `{` 的 `Parent` 还是 `Root`（打一行日志看到的：
  `[A] Bracket holder= Root obj= false pat= false`）。所以这一格问的是**词**：
  `{` 前面那个实义单元是 `const` / `let` / `var`（或已经升成 `Let` 单元的那一格）。
- **嵌套模式递归问外层括号**：`const { a: { b } }` 里内层那个 `{` 前面是 `:`，而 `:` 单独
  说明不了任何事（`case 1: { … }` / `label: { … }` 后面都是**块**）⇒ 内层问的是
  「**外面那个括号**是不是模式」（`Parent` 找到它、在它父亲的列表里再问一遍）。
  标签 / `case` 后面那个块的外层不是花括号，递归当场判否；值位那一格仍由
  `IsObjectLiteralBrace` 那一半负责（调用方是 `A || B`）。
- **三个成形器一起改**：`FormFrom`（`;` 那一档）、`FormTail`（裸块那一档）、
  `StatementBranch.Condition`（换行那一档）——三处原来都是同一句 `IsObjectLiteralBrace`，
  少改一处就只剩一种排版是绿的。
- **收掉的 7 条**：`gap-sweep-{newline,linecomment}-destr-0{2,3,4,5}`（`newline-05` /
  `linecomment-06` 本来就是绿的）。文件头的 `xl:known-gap` 逐条删掉、7 条的 `xl:expect`
  按新形状逐条重算（`cases:tags` 0 条不一致）。
- **可复用的判据**：**解析期的「宿主」还不是收尾期的那个宿主**。凡是照抄某条 `CloseRule`
  的宿主判据到解析期（语句成形器、分支 `Condition`），先问一句「那个单元**现在**成形了吗」——
  `LineWrap` / `Begin` 那一刻，`Let` / `Class` / `Import` 这些头节点**都还没出生**。
- **留下一族**：`gap-sweep-*-iface-0{2,3,5,6}`（方法签名 `m(): void;` 上那几格）与
  `gap-sweep-*-clsmod-*`（类成员修饰词）本轮不动。

### 第 825 轮：**声明头「还没到形参表」那几格**——函数声明头折行的五处落点收掉 13 条

**一句话**：函数声明的头是**四段拼起来**的（`function` + 名字 + 可选类型参数段 + 形参表 + `:` 返回类型），
而「注释 / 换行落在语法相邻位置之间」那一族在**每一段的缝上**各留了一条。这一轮把三处判据补齐：
解析期 ASI 的右半截、类型参数段自己的折行闸门、以及「`>` 后面紧跟换行」时那一问要用的位置判据。
`cases:tsast` 的账 **114 → 101**（`coverage` **3874 → 3887**，`token` 那一类 blocked 114 → 101）。

- **根 ①：解析期 ASI 的右半截不认「声明头的续行」**（`statement.xl.md` 的 `NextLineContinuesExpression`），
  四格一起补。判据是刚写进硬规矩的那一句「**先问这个字符能不能起一条语句**」：
  - **起不了一条语句**的 `extends`（与 `catch` / `finally` 同一档）：`function f<T` 换行 `extends U>…`；
  - **能起一条语句**的 `<` 与 `(`：`<T>x` 是尖括号断言、`(…)` 是括号表达式，所以这两格只能问**左边**
    ——「段首是声明词 + 末尾是名字」（`IsDeclarationHeadAwaitingParameters`，
    名字后面**允许已经有一个**类型参数段，所以 `function f<T>` 换行 `(` 也认）；
  - **`:` 那一格**：`case 1:` / `default:` / `label:` 都以 `:` 收尾，所以见 `:` 就判「没写完」是不行的；
    把它认回来的是另外两条——`:` 前面是一个**收好的形参表** `)`（排除标签与 `case`）、
    段首（跳过修饰词）是 `function`（排除变量的类型标注），见 `IsFunctionHeadReturnColon`。
- **根 ②：类型参数段的折行闸门只认「下一格是不是 `>` / `|` / `&` / `:` / `?`」**
  （`generic-type.xl.md` 的 `ScanArguments`）。`function f<T` 换行 `extends U>` 与
  `function f<T extends` 换行 `U>` 的下一格都是**字母** ⇒ 判否 ⇒ 整个 `<…>` 退回比较运算符 ⇒
  类型参数段认不出来、整条声明跟着塌。补的是 `IsDeclarationHeadHost`（`<` 前面是「声明词 + 名字」
  ⇒ 这是**类型参数表**，段里的换行没有「这条语句到此为止」那种读法）。
  **不能放宽成「下一格是字母就放行」**：`let n = a<b` 换行 `foo(bar) > x` 正是靠那三条挡住的，
  它的下一格也是字母。
- **根 ③：`IsTypePosition` 的词表里没有 `function`**（同一个文件）。`>` 后面紧跟着**换行**
  （或行尾注释）时，后继闸（`IsAllowedFollower`）只能问「这个 `<` 在不在类型位」——
  回扫撞上 `function` 时它落到「其余单元是操作数」的兜底上 ⇒ 答否。同一个词表里
  `class` / `interface` / `type` / `enum` 都在，只漏了 `function`。
- **一处踩出来的坑：`HasTypeColonBefore` 撞上前面任何一条已经成形的语句就答「上一行到此为止」**
  （`text-common-util.xl.md` 第 681 行那条口径）。语料里的用例**前面永远有几行 `// xl:…` 注释**、
  每条注释各是一层 `Statement` ⇒ `function f<T extends U>` 换行 `(x: T): T { … }` 那一格被判成边界
  （**把用例前面那三行注释删掉就正好绿**，是这一句把它按住的）。
  所以 `(` 那一格要先认「声明头的形参表」，再落到那道护栏上。
- **收掉的 13 条**：`gap-sweep-{newline,linecomment}-generic-{02,03,04,05,06}`（10 条）、
  `gap-sweep-comment-generic-02`（`>` 与 `(` 之间夹块注释）、
  `gap-sweep-{newline,linecomment}-fn-02`（`function f` 换行 `(a, b) { return a; }`）。
  文件头的 `xl:known-gap` 逐条删掉、13 条的 `xl:expect` 按新形状逐条重算（`cases:tags` 0 条不一致）。
- **可复用的判据**：写「一行以 X 开头算不算续接」时先分两档——**起不了一条语句**的
  （`extends` / `catch` / `finally` / `?` / `:` / `=` / `|` / `&` / `.`）直接答续接；
  **能起一条语句**的（`<` / `(` / `[` / `+` / `-` / 模板串 / 正则）必须问左边那一段是什么构造。
  这条写进了 [typescript-parsing-gaps.md](tests/parse/typescript-parsing-gaps.md) 的「解析层几条硬规矩」。
- **留下的一族**：`gap-sweep-comment-generic-01`（`function` 与名字之间夹**块注释**，带一处未映射）；
  同族的 `gap-sweep-*-{iface,destr,clsmod}-*`（方法签名 `m(): void;`、绑定单元尾巴上的 trivia、
  类成员修饰词）与 `gap-sweep-*-async-01`（`async` 换行 `function`）本轮不动。

### 第 824 轮：**下一行以 `=` 开头是在接着写**——`const a` 换行 `= …` 那一族收掉 22 条

**一句话**：解析期的 ASI 右半截（`NextLineContinuesExpression`，看**原始字符**）原来只认
`|` / `&` / `.` / `?` / `:` / `(` / `[` / 几个双目运算符 / `catch` / `finally` / 声明头。
`=` **起不了一条语句**（语句的开头没有以 `=` 起头的写法），所以它与 `?` / `:` 同一条理由
——出现在一行的第一个实义字符上只可能是上一行的续接。补上这一格，
`cases:tsast` 的账从 **136 → 114**（`coverage` **3852 → 3874** 通过，`token` 那一类 blocked 136 → 114）。

- **根：`NextLineContinuesExpression` 的原始字符表里没有 `=`**（`statement.xl.md`）。
  `const a` 换行 `= [1, 2, 3];` 的换行那一刻，左半截问的是 `a`（不期待操作数）⇒ 判「左边写完了」，
  右半截又不认 `=` ⇒ **收壳**：`const a` 自己成一条、`= [1, 2, 3];` 另起一条
  ⇒ 整条 `VariableStatement` / `VariableDeclaration` 缺（实测那一族各「缺 1～15、多 4～7」）。
- **收掉的 22 条**：`gap-sweep-{newline,linecomment}-{arr,arrow,cond,destr,obj,optchain,tpl,var,ns}-02`
  那一族（含 `arrow-03` / `destr-05/06` / `ns-03`），加上 `types/gap-sweep-{newline,linecomment}-typeunion-01`
  与 `modules/gap-sweep-linecomment-export-02`。**这一条比它看起来的值钱**：变化的不是「少一个节点」，
  而是整条声明从解体变回一条（`Statement` 数下降、`Let` 里终于有名字、`TernaryOperator` / `BindingElement` /
  `LamdaParameters` 那些段一起成形）。文件头的 `xl:known-gap` 逐条删掉，
  22 条用例的 `xl:expect` 按新形状逐条重算（`cases:tags` 0 条不一致）。
- **为什么护栏不需要**：`(` / `[` 那两族要护栏，是因为它们**能起一条语句**（括号表达式、数组字面量）；
  `=` / `=>` / `==` / `===` **一个语句都起不了**，与 `?` / `:` 是同一档
  （一行以 `= 2` 开头在 TS 里也是上一行的续写）。
- **可复用的判据**：写解析期那一问（**只看原始字符**）时，先问**这一行的第一个字符能不能起一条语句**——
  不能就直接答「续接」，且不必配护栏；能（`(` / `[` / `+` / `-` / 模板串）才要上下文护栏。
  这条写进了 [typescript-parsing-gaps.md](tests/parse/typescript-parsing-gaps.md) 的「解析层几条硬规矩」。
- **留下的一族**：`gap-sweep-*-async-01`（`async` 换行 `function`）、`switch` 里 `b//c` 换行 `();`、
  `destr-02/03/04` 与 `fn-02` / `generic-*`（注释或换行落在**形参 / 绑定单元自己**的尾巴上，
  区间多吃一截——与第 823 轮那条同型，落在另一族单元上）本轮不动。

### 第 823 轮：**空条件链不吃尾随 trivia**——`a?.b //c` 换行 `?.[c]?.(d)` 那一族收掉 6 条

**一句话**：`NullConditionalOperator` 从 `?.` 之后一路收到断点，而断点常常落在**后一个 `?.`**
上（中间那个换行不是语句边界）——于是**注释与换行被一起收进这一格的 `Data`**，
区间跟着盖住它们。收窄到「最后一个实义单元」为止，`cases:tsast` 的账从 **142 → 136**
（`coverage` **3846 → 3852** 通过，`token` 那一类 blocked 142 → 136）。

- **根：`NullConditionalOperatorCloseRule.Process` 的 `count` 把尾随 trivia 也算进去了**
  （`null-conditional-operator.xl.md`）。`const v = a?.b//c` 换行 `?.[c]?.(d);` 里，
  `SearchBackIndexed` 找到的断点是**第二个 `?.`**（那个换行以 `?.` 开头 ⇒ `ContinuesExpression` 判续行
  ⇒ 不是语句边界），`count = endIndex - index - 1` 于是把 `LineAnnotation` 与 `LineWrap` 都圈进
  `TakeRange`。产物 `Method` 里那一格是 `NullConditionalOperator[11,17)`（`?.b//c` + 那个换行），
  而 TS 的 `PropertyAccessExpression` 是 `[10,14)`——**差的那 4 个字符就是注释与换行**，
  另有一个「多出来」的节点同一个根。
  **改法一处**：取完 `count` 之后从尾巴往回缩，落点是 trivia 就减一
  （`IsTriviaUnit`：软换行 / 行注释 / 区域注释 / 预处理指令）。注释留在外层列表里，
  所以产物里照旧看得见它，只是它不再属于这一格。
- **收掉的 6 条**：`gap-sweep-comment-optchain-04/05`、`gap-sweep-linecomment-optchain-06/07`、
  `gap-sweep-newline-optchain-03/05`（`ElementAccessExpression` / `CallExpression` /
  `PropertyAccessExpression` 三个投影形状各一处，全是同一格的区间）。
  文件头的 `xl:known-gap` 逐条删掉；其中四条用的是块注释（`/* c */`），
  `xl:expect` 按新形状重算（`AreaAnnotation` / `LineAnnotation` 那一项按产物跟着改）。
- **可复用的判据**：**「收到断点为止」这类循环，收的是「语法上属于这一格的单元」，
  不是「断点之前的全部单元」**——断点前面挂着的那一截 trivia 属于外层。
  第 816 轮那条（判据跨 trivia、搬运也要跨）说的是**中间**的 trivia；
  这一条说的是**尾巴**上的 trivia：两者方向相反，别合成一条。
- **留下的一族**：`gap-sweep-{linecomment,newline}-optchain-02/03` 仍在台账上
  （`a?.b` 后面那半截 `?.[c]?.(d)` 的**父节点**还没成形，缺的是整条 `CallExpression` /
  `VariableStatement`，不是这一格的区间），以及 `switch` 里 `b//c` 换行 `();` 那一格
  （注释把被调用者与实参表切开，缺的是一次调用），本轮不动它们。

### 第 822 轮：**声明头的词族都「必须跟名字」**——`function` / `class` / `interface` / `enum` 换行那一族收掉 6 条

**一句话**：第 820 轮往 `Statement.ExpectsOperand` 里放了 `let` / `const` / `var`
（「这三个词后面必须跟名字」），这一轮问的是**同一个问题的其余成员**——
`function` / `class` / `interface` / `enum` 同样**语法上不可能单独成句**，
所以它们出现在换行前时那一行一定没写完。四个词一起进词表，
`cases:tsast` 的账从 **148 → 142**（`coverage` **3840 → 3846** 通过，`token` 那一类 blocked 148 → 142）。

- **根：`ExpectsOperand` 的词表只列了声明头那三个词**（`statement.xl.md`）。
  `function` 换行 `f(a, b) { return a; }` 的换行那一刻，`StatementBranch` 问的
  `LineCannotEnd` 落到 `ExpectsOperand(function)` ⇒ 判「左边写完了」⇒ **收壳**：
  `function` 自己成一条、后面整条声明另起一条（实测 `gap-sweep-newline-fn-01`：
  缺整条 `FunctionDeclaration`，多出 `Keyword` / `Statement` 各一）。
  这与第 820 轮那一族是**同一个根**，只是词表少了一档——第 820 轮只按「`const` 换行那一族」
  量到哪儿改到哪儿。
- **收掉的 6 条**：`gap-sweep-{newline,linecomment}-fn-01`、`-generic-01`、`-async-02`
  （`async` 那两条的缺口落在它后面那个 `function` 上，词表补上就一起成形了）。
  文件头的 `xl:known-gap` 逐条删掉，用例自带的 `xl:expect` 按新形状逐条重算
  （`Statement` 从 3 降到 2、`Function` / `FunctionBody` / `Parameter` 那一族补上）——
  **形状变好了，期望跟着形状走**（`cases:tags` 那一门量的正是这两者一不一致）。
- **可复用的判据**：写 `ExpectsOperand` 这类「这个词后面还得跟东西」的判据时，
  **问的是「它能不能结束一条语句」，不是「它是不是保留字」**——`as` / `default` / `new`
  在别的位置上是名字，`readonly` 在成员位上是修饰词，把它们放进去会改坏既有排版。
  这条写进了 [typescript-parsing-gaps.md](tests/parse/typescript-parsing-gaps.md) 的「解析层几条硬规矩」。
- **留下的一族**：`gap-sweep-{newline,linecomment}-optchain-*` 与 `-switch-*` 仍在台账上
  （`a//c ?.b?.[c]?.(d)` 那一族：注释夹在点号与属性名之间时区间往后多吃一段），本轮不动它。

### 第 821 轮：**两处试过又退回来的改法**（读数一条未动，`cases:tsast` 仍 148）

**一句话**：这一轮量了两处——**「修饰词单独起一行」**（`public static` 换行 `readonly a = 1;`）
与 **`import` / `export` 的尾随 `;` 另起一行**——两处都写出了判据、都改进了读数以外的部分，
但**各自都让既有的绿用例变红**，所以都退回来了。**这一轮不进任何数字**，
只把两处**已经量清的死路**记在这里（免得下一轮再走一遍）。

- **试过一：换行后面是「修饰词 + 名字 + 延续符号」时不收尾**（`field.xl.md` 的 `MemberEnd`）。
  判据本身是对的：`IsMemberBoundary` 把 `readonly` 当**名字**（它后面有 `a`、再后有 `=`），
  可修饰词不是名字。加上「跨过修饰词再看延续符号」这一问之后，
  `gap-sweep-newline-clsmod-01` 确实成形了，**但八条既有绿用例当场变红**：
  `itf-basic` / `decl-class-modifiers` / `decl-class-member-modifier-order` /
  `decl-interface-optional-readonly` / `decl-class-accessor` / `cls-declare-fields` /
  `decl-computed-field-after-generic` / `ty-object-literal`——全是 **`readonly` 当成员名**那一族：
  `b?: string` 换行 `readonly c: boolean` 在 TS 那边是**两条** `PropertySignature`，
  而这一问把第二条并进了第一条。
  **补的第二问也没救回来**：想用「这一条成员在换行前封口了没有」分开两族
  （`b?: string` 的 `?:` 封了口 / `public static` 没封口），
  可**那一刻 `units` 里能看到的是已经成形的兄弟单元**（`Field`），
  封口符号 `?:` 早被收进上一条成员里了 ⇒ 判据在 `units` 这一层问不出来。
  **要收它得换一层**：让**成员名那一格自己**回答「我后面还有没有名字」
  （`FieldCloseRule.Previous` 里 `readonly` 的 `IsNameUnit` 那一问已经是第二次问同一件事），
  而不是在 `MemberEnd` 里反扫 `units`。这条留在这里。
- **试过二：`import` / `export` 的循环遇换行时再看一眼后面那一格**（`import.xl.md` / `export.xl.md`）。
  `import { a, b as c }` 换行 `from "m";` 在 TS 那边是**一条** `ImportDeclaration`
  （实测产物只到 `{ a, b as c }`、`from "m";` 另起一条 `ExpressionStatement`），
  `export { a }` 换行 `;` 同理（TS `ExportDeclaration[13,27)`，产物 `[13,25)` + 一个 `EmptyStatement`）。
  改法写了两处（`import` 侧「换行后面还有子句单元就继续收」、`export` 侧收完之后再扫一眼 `;`），
  **两处都没让读数动一格**：`import` 那一侧改了之后读数**一字不变**
  （说明那条冲突发生在更早的地方——`from "m"` 与 `{ a, b as c }` 之间那个换行
  在收 `{ … }` 那一趟就已经把它切开了），`export` 那一侧的那个 `;`
  **根本不在 `units` 这一层**（`{ a }` 是一个括号单元，它里面的排版看不见）。
  两条都是同一个教训：**判据要问的那一格是不是还在这一层**——不在就别在这一层问。

- **可复用的判据（这一轮唯一的产出）**：**改一处之前先问「我要问的那一格还在不在这一层」**。
  两处死路的共同症状不是判据写错，而是**判据问错了地方**：
  `MemberEnd` 反扫 `units` 时封口符号已经被收进兄弟成员，
  `Export.Process` 找 `;` 时那个 `;` 在括号单元里面。
  症状是「改了读数不动」或「读数动了但别的用例红」，两种都在这一轮里各出现一次。

### 第 820 轮：**声明头那三个词等一个名字**——`const` 换行那一族收掉 19 条，另收掉 `member \n ;` 两条

**一句话**：这一轮从两个方向量——**成员尾巴**（`a: number` 换行 `;` 里那个 `;` 属于这条成员）
与**声明头**（`const` 换行 `a = 1;` 是**一条**声明，TypeScript 的 ASI 不在 `const` 后面断句）。
两处都只看「换行两边是什么」，`cases:tsast` 的账从 **169 → 148**
（`coverage` **3819 → 3840** 通过，`token` 那一类 blocked 169 → 148）。

- **根①：`IsMemberBoundary` 会把「换行 + `;`」当成新成员的开头**（`field.xl.md` 的 `MemberEnd`
  与 `class-member.xl.md` 的 `Process` 各一处）：`a: number` 换行 `;` 里，换行往后跳 trivia
  看到的是那个 `;`，再跨过名字看到 `;` ⇒ 判成「下一条成员开始了」，
  于是成员在换行前收尾、那个 `;` 被留在外面（实测 `gap-sweep-newline-iface-01`：
  `PropertySignature` 给 `[14,23)` 而 TS 是 `[14,25)`）。**改法**：换行后面紧跟的是 `;` 时
  整条边界判据跳过 —— 收不收它由扫到它的那一格决定（区间仍到它为止）。
- **根②：`ExpectsOperand` 不认声明头那三个词**（`statement.xl.md`）。`const` 换行 `a = 1;`
  的换行那一刻，`StatementBranch` 问的 `LineCannotEnd` 落到 `ExpectsOperand(const)`
  ⇒ 判「左边写完了」⇒ **收壳**：`const` 自己成一条 `Statement(Keyword)`、后面整条声明另起一条
  （实测 `gap-sweep-newline-arr-01`：缺整条 `VariableStatement` / `VariableDeclaration`）。
  可 `let` / `const` / `var` 后面**必须**跟一个名字——它们没有「单独成句」那种写法
  （保留字，也不可能是属性名 / 成员名），所以三个都在表里。
  一次收掉 19 条：`gap-sweep-{newline,linecomment}/{arr,arrow,cond,destr,ns,obj,optchain,tpl,var}`
  那一族，加上 `declarations/destr-object-newline-after-keyword` 与 `modules/gap-sweep-linecomment-export-01`。
  **这一条比它看起来的值钱**：那 19 条原来不是「少一个节点」而是**整条声明解体**
  （`Statement` 数从 2 变 1、`Identifier` 少一个、多一条孤零零的 `Keyword`）。
- **`as const` 那一格要挡**（同一个方法）：`x as const` 换行 `;` 是**写完了**的一条语句，
  而 `const` 换行 `a = 1;` 是没写完的声明头——两者词形一样，分开它们只看**前一个实义单元**
  是不是 `as`。少了这一条实测 `stmt-asi-as-const-then-statement` 当场从绿变红
  （`as const` 之后被当成续行，两条语句并成一个壳）。所以 `ExpectsOperand` 多收一个
  `before` 参数，由两个调用点各传「再往前那一格」。
- **用例自带的期望跟着改**（`xl:expect`）：18 条 `xl:expect` 逐条重算。
  这一族的变化是**形状变好了**——原来顶层那一个 `Keyword`（`const`）现在归进 `Let`
  的子单元、`Statement` 计数从 2 降到 1、名字不再被多算一次；
  `gap-sweep-*/destr-01` 那一族另把 `BindingElement` / `ObjectLiteral` / `ArrayLiteral` 补上
  （解构模式这一趟终于成形）。**期望跟着形状走**：`cases:tags` 那一门量的正是
  「用例说它该有什么、产物里真的有吗」，而**这些形状是不是对的**由 `cases:tsast` 对着
  `ts.createSourceFile` 逐节点判——两条尺子各管一半。
- **可复用的判据**：**声明头那三个词（`let` / `const` / `var`）后面必须跟名字**，
  所以它们出现在换行前时，那一行**一定没写完**；与此同时 **`as const` 是另一回事**。
  写「换行算不算边界」的判据时，这两件事必须分开问。
  这条写进了 [typescript-parsing-gaps.md](tests/parse/typescript-parsing-gaps.md) 的「解析层几条硬规矩」。
- **留下的一条**：`gap-sweep-newline-clsmod-01`（`public static` 换行 `readonly a = 1;`，
  **没有注释**）仍在台账上——它与第 819 轮收掉的那条只差「换行前面那几格算不算修饰词」，
  本轮不动它。

### 第 819 轮：**行注释吃掉它后面那个换行**——成员边界那一格收掉 5 条

**一句话**：这一轮回到最大那一族（「注释 / 换行落在语法相邻位置之间」）里的**成员边界**那一格。
`IsMemberBoundary` 判「换行后面像不像新成员」时被那条行注释挡住了：它往回取到的
「换行前那一格」正是 `LineAnnotation`（既不是续行符号、也不是名字），
于是 `public static //c` 换行 `readonly a = 1;` 在它眼里成了**两条**成员。
而 TypeScript 的 trailing trivia 把 `//` 到行尾**连同那个换行**一起收走
⇒ `static` 与 `readonly` 之间其实**没有换行**。两处判据（`FieldCloseRule.MemberEnd` 与
`ClassMember.Process` 各一处）改成这一口径，`cases:tsast` 的账从 **174 → 169**
（`coverage` **3814 → 3819** 通过，`token` 那一类 blocked 174 → 169）。

- **根①：`MemberEnd` 把「换行前那一格」当成成员尾巴**（`field.xl.md`）。两条终止都判不出来
  ⇒ 成员在注释那里收尾，真正的尾巴（`1`、那个 `;`）留在外面成了**下一条成员**。
  实测 `gap-sweep-linecomment-clsmod-03`：`PropertyDeclaration` 给 `[10,38)` 而 TS 是 `[10,43)`，
  多出一个 `SemicolonClassElement`。**改法**有两半：这一趟记住**最后一个非注释单元**（`tail`），
  边界落在换行上时返回**它**而不是 `i - 1`；而**行注释紧挨在换行前面**时整条边界判据跳过
  （`i + 1` 继续扫）。块注释后面那个换行照旧是边界（`a /* c */` 换行 `b` 是两条成员）——
  所以判据只看紧挨着的那一格是不是 `LineAnnotation`，不是 `IsAnnotationUnit` 那张整表。
- **根②：`FieldCloseRule.Previous` 把注释后面的换行当成「只有名字的字段」**（同一份规范）。
  `public static //c` 换行 `readonly a = 1;` 里 `readonly` 是**同一个成员的修饰词**，
  可 `Previous` 只看「跳过注释之后紧挨着的是不是换行」⇒ 把 `static` 认成这条成员的名字、
  把 `readonly` 认成下一条成员的名字，于是第一条连名字都判错
  （实测产物 `Field[name="static"]`，`readonly` 与 `a` 一起被当成它的孩子，
  整条 `PropertyDeclaration` 劈成 `[10,23)` + `[28,43)`）。**改法**：跳过注释之后若是换行，
  再看**那一格之前是不是行注释**——是就判否（不认成名字、让上一个成员把换行跨过去），
  不是就照旧判「名字写完了」。`private` 换行 `m() { }` 那种没有注释的排版行为不变。
- **接口那一侧同一个根**（顺带收掉三条里的两条）：`gap-sweep-linecomment-iface-01`
  （`a: //c` 换行 `number;`）与 `-02`（`a: number//c` 换行 `;`）——类型标注与那个 `;`
  原来被劈在成员外面（`PropertySignature` 给 `[14,16)` / `[14,23)` 而 TS 是 `[14,28)`）。
  文件头的 `xl:known-gap` 五条逐条删掉（`-03` 不在其中：它记的是另一处缺口，
  这一轮只是**顺带**把它的形状从「两个 `Field`」收敛成一个，用例自带的 `xl:expect` 随之改）。
- **用例自带的期望也要跟着改**：这六条用例的 `xl:expect` 与产物一起动了——
  `Field:2` → `Field`（两条成员并成一条）、去掉 `SemicolonClassElement` / `SymbolToken`
  （它们被收进成员区间里了）、`gap-sweep-linecomment-iface-01` 补上 `Identifier`
  （成员名 `a` 这一趟终于成形）。**期望跟着形状走，不是形状跟着期望走**：
  `cases:tags` 那一门量的正是「用例说它该有什么、产物里真的有吗」。
- **可复用的判据**：**行注释吃掉它后面那个换行，块注释不吃**。这一格与
  「注释与软换行在相邻判定里是同一件事」（第 817 / 818 轮）**不是同一条**：
  那里注释不挡相邻，这里注释**改变**了换行的存在。写「换行算不算边界」的判据时先问一句：
  **这个换行是不是某条注释的一部分**（往后看一格是不是 `LineAnnotation`）。
  这条写进了 [typescript-parsing-gaps.md](tests/parse/typescript-parsing-gaps.md) 的「解析层几条硬规矩」。
- **留下的一条**：`gap-sweep-linecomment-clsmod-04`（`…; private //c` 换行 `m() { }`）
  仍留在台账上——TS 在那里给一个 `[40,47)` 的 `PropertyDeclaration`（只有 `private` 的字段），
  要收它得先有「一个光秃秃的修饰词也能是一条成员」这条口径，本轮不动它。

### 第 818 轮：**判空也要用 trivia 名单**——「只有注释的形参表」收掉 12 条

**一句话**：`IsTriviaUnit` 那份名单不只在「跳过」时用，**判空**时也要用。
`m(/*c*/) { … }` 的括号里只有一个 `AreaAnnotation`，照「不是软换行就算内容」判 ⇒
规则收下一张空形参表、再包出一个**零宽的 `Parameter`**（投影出来是 `EXTRA Parameter [x,x)`
加一个多出来的 `parameters` 字段）。两处判空改成 trivia 口径，`cases:tsast` 从 **186 → 174**
（`coverage` 3802 → 3814 通过）。

- **根：判空用的是「不是软换行」而不是「不是 trivia」**（`parameter.xl.md`）。
  `Previous` 的第三问是「括号里至少有一个实义单元」，可它把**注释**算成了实义 ⇒
  空形参表也进规则；`AppendSegment` 同样把「只有注释的一段」包成一个 `Parameter`。
  两处都改成 `IsTriviaUnit(item) === false`。**`AppendSegment` 那一侧还要把注释推回 `rebuilt`**：
  落在被替换区间里的注释要么显式收下、要么推回去，直接 `return` 就是把源码里的注释删了。
- **箭头函数那一份是第二处**（`lamda.xl.md`）：`Lamda` 造 `LamdaParameters` 时自己切分括号内容
  （逗号早被折成 `BinaryOperator op=","`，要先 `CollectParameterUnits` 拆平），
  同一个「只有注释的一段」也会包出零宽 `Parameter`（实测 `(/*c*/) => 1`）。
  两处合起来把这七种排版一次收掉：`m(/*c*/) { … }` / `private m(/*c*/) { }` /
  `function f(/*c*/) { … }` / `async function f(/*c*/) { … }` / `function* g(/*c*/) { … }` /
  `interface I { m(/*c*/): void }` / `(/*c*/) => 1`。
- **收掉的 12 条**：`gap-sweep-{comment,linecomment}-{class,clsmod,async,gener,iface}` 里的 10 条、
  `mut-lex-private-field-142`、`mut-stmt-asi-return-newline-expr-115`（`mut-*` 池子 11 → 9）。
  另有 10 条用例的 `xl:expect` 去掉了 `Parameter` 那一项——**形状变好了，用例自带的期望要跟着改**。
- **可复用的判据**：写「有没有内容」这类判据时，先问**注释与软换行算不算内容**。
  这个工程里它们不承载语义（`IsTriviaUnit`），所以判空一律用它；
  只有在「注释必须留在产物里」时才要额外把注释推回原位。这条写进了
  [typescript-parsing-gaps.md](tests/parse/typescript-parsing-gaps.md) 的「解析层几条硬规矩」。

### 第 817 轮：**「相邻的那一格」一律走 trivia 口径**——五处判据跨过注释，一次收掉 23 条

**一句话**：上一轮那条根（判据跨过 trivia、搬运没跨）在**同一族里还有第二面**——「x 与 y 相邻」
这件事本身用「只看紧邻那一格」判的，于是中间夹一条注释就整条构造认不出来。五处判据改成跨 trivia，
`cases:tsast` 的账从 **209 → 186**（`coverage` 同步 3779 → 3802 通过）。

- **根①：`FunctionTypeCloseRule` 往左找形参括号只看紧邻**（`function-type.xl.md`）。
  `type F = (a: number) /* c */ => string` 里 `=>` 左边是注释 ⇒ 判据当场给否 ⇒ `FunctionType` 整条缺、
  括号留在外面当 `Bracket`。`Previous` 与 `Process` 两处一起改 `SkipPreviousTrivia`
  （第 816 轮那条「判据跨过什么、搬运就必须跨过什么」在这里同样成立）。
- **根②：`MethodDeclarationCloseRule.ParameterIndex` 往右找 `(` 只看紧邻**（`method-declaration.xl.md`）。
  `m /* c */ (): void` 里名字后面是注释 ⇒ 找不到参数表。三处改 `SkipNextTrivia`。
- **根③：`SignatureCloseRule.Previous` 与它抢同一对括号**（`signature.xl.md`）。
  这一处**不能用 `SkipPreviousTrivia`**——成员体里「一行一条成员」，软换行就是成员边界
  （跳了会漏掉真正的无名签名），所以用 `SkipPreviousAnnotation`：**只跳注释**。
  两边判据不对齐时，谁先把括号认走就决定了产物形状（症状：`MethodSignature` 缺、多一个 `CallSignature`）。
- **根④：`MethodCloseRule.NameIndex` 往左找被调用者只看紧邻**（`method.xl.md`）。
  `f /* c */ (1, 2)` 认不出这是一次调用 ⇒ 实参表被当成分组。
- **根⑤：`BinaryOperatorCloseRule` 判 `,` 是不是逗号表达式时，看的是「括号外面那一格」**（`binary-operator.xl.md`）。
  `new C /* c */ (1, 2)` 里那一格是注释 ⇒ 两条判据都不命中 ⇒ 实参被折成逗号表达式 ⇒
  **构造函数只收到一个实参（静默错值）**。改成 `GetSkipPreviousTrivia`。
- **收掉的 23 条**：`gap-r676-method-comment-before-paren{,-signature,-abstract}`、
  `gap-r676-new-comment-before-args{,-dotted}`、`gap-r676-func-type-comment-before-arrow{,-plain}`、
  `stmt-for-comment-before-paren`，加上 `gap-sweep-{comment,linecomment,newline}` 里 `call` / `fn` /
  `class` / `clsmod` / `iface` 那几族与 `mut-*` 池子里的 8 条（池子 19 → 11）。
  另有 10 条**形状变好但还差一截**的用例（如 `gap-sweep-linecomment-call-01`）留在账上，
  它们的 `xl:expect` 按新产物改过——**判据改了，用例自带的期望也要跟着改**，
  否则 `cases:tags` 会拿旧形状的期望当场判红。
- **可复用的判据**：判「相邻」时先问**注释与软换行在这里是不是同一个意思**。
  是（大多数类型位 / 实参位）就一起跳；不是（成员体的行边界、ASI 那一族）就只用 `Skip*Annotation`。
  这条写进了 [typescript-parsing-gaps.md](tests/parse/typescript-parsing-gaps.md) 的「解析层几条硬规矩」。

### 第 816 轮：**判据跨过注释、搬的那一段没跨**——类型运算符那一格收掉 8 条

**一句话**：这一轮从 `cases:tsast` 里最大的一族（「注释夹在语法相邻的两格之间」）挑出
**类型运算符那一格**：`keyof` / `typeof` / `readonly` / `unique` 与它的操作数之间夹一条注释时，
节点收下的「操作数」其实是那条注释，真正的操作数留在节点外面——**根只有一处**，
`TypePrefixCloseRule` 的判据（`Previous`）与搬运（`Process`）各跳各的 trivia。改一处，8 条一起转绿。

- **根：`Previous` 走 `SkipNextTrivia`、`Process` 走 `SkipNextWrapSymbol`**（`type-operator.xl.md`）。
  第 680 轮把判据那半改成跨注释（`readonly/* c */ (A | B)[]` 那一族），可 `Process` 取 `operand`
  那一格没跟着改：软换行被跳过、注释没有 ⇒ `operand` 落在注释上 ⇒ `SignOut` 收在注释末尾、
  `AddAndCloseLast` 收下的是注释，`ReplaceCountAt` 搬走的也只是「词 + 注释」这一小段。
  实测 `type K = keyof /* c */ T;`：产物 `TypeOperator[9,14)`（到 `keyof` 为止）而 TS 是 `[9,24)`，
  `T` 那半整条缺，还多出 `TypeReference` / `Identifier(keyof)` 两个节点。
  **改法**：`Process` 也走 `SkipNextTrivia`。注释落进 `[index, nextIndex]` 这一段、
  由 `ReplaceCountAt` 跟着搬进节点；注释不投影成节点，所以不多出东西（`keyof /* c */ typeof /* c */ T`
  这种两层嵌套也一趟成形）。
- **收掉的 8 条**：`gap-r676-{keyof,typeof,readonly,unique}-comment-operand` 四条
  （各带自己的探针读数：区间漂移 + 操作数缺 + 多出来两个节点），加上早先按别的根登记、
  其实是同一处的 `mut-type-mapped-template-key-94/95` 与 `mut-type-union-after-readonly-103/104`。
  文件头的 `xl:known-gap` 逐条删掉，`cases:tsast` 的账从 **217 → 209**（`coverage` 同步 **+8**）。
- **可复用的判据**：`CloseRule` 的 `Previous` 与 `Process` 是两处独立的「找操作数」，
  **判据跨过 trivia，搬运也必须跨**，否则两者指的不是同一个单元——这条写进了
  [typescript-parsing-gaps.md](tests/parse/typescript-parsing-gaps.md) 的「解析层几条硬规矩」。

### 第 782 轮：**接收者自己那一格**与**内建构造的原型**——收掉四处（含一处静默错值），`Error.stack` 那一格补齐，五笔旧账到期

**一句话**：这一轮从两个方向量——**属性写入的次序**（`super.x = v` 为什么静默不写）与
**错误家族自己那一族**（`console.log` 印成 `{}`、`Object.getPrototypeOf(TypeError) === Error`、
`typeof e.stack`）——四处根收掉，另把「其余内建构造的原型」那一半**如实登记**。

- **收掉的根①（静默错值）：`SetPropertySearched` 少了「接收者自己那一格」**（`props.xl.md`）。
  `super.x = v` 那一趟的起点是**原型**（`SetPropertyFrom`），于是 `found` 只看得见原型链上那一格；
  可规范的三步是「① 起点找访问器 → ② **接收者自己的**那一格就地改值 → ③ 都没有才新建」，
  本仓原来只有 ① 与 ③ ⇒ 派生实例上**已经有** `v` 时，`super.v = w` 会**再建一格重名的自有属性**
  （`Object.getOwnPropertyNames(e)` 给 `["v","v"]`），而读那一格先命中**先前那一份**
  ⇒ `e.v` 还是旧值。**症状是静默错值**（不抛、不报错、两个名字同名）。
  修法是**补上规范的第二步**（`found` 不是接收者自己那一格时，先扫一次接收者的自有属性：
  数据属性就地改值 / 访问器照调 setter / 不可写返回假）——**没有新写第二份规矩**，
  与前面「继承来的访问器」那一条同一个形状。第 780 轮 `r780b-03` 登记的四个落点之一
  （`set(w) { super.v = w }` 静默不写）**当场收掉**。
- **收掉的根②：内建构造对象自己那一格原型**（`globals.xl.md`）。本仓的内建构造是
  「普通对象 + 一格可调用载荷」，`NewPlainObject` 给的原型是 `Object.prototype` ⇒
  `Object.getPrototypeOf(TypeError) === Error` 在 Node 里为真、本仓为假（第 724 轮
  `p724a-b01` 登的、第 781 轮 `r781a-01` 又量了一遍），同一个根还有两个出口：
  `Object.getPrototypeOf(Error) === Function.prototype` 与 `Error instanceof Function`。
  修法是**一张表**：错误家族七个后代接**全局那一个 `Error` 对象**、`Error` 自己接 `protos.Function`。
- **收掉的根③：`util.inspect` 的错误那一档把名写死成 `Error`**（`inspect.xl.md`）。
  判据原来是「沿链读到的 `name` **恰好等于** `"Error"`」，而且印出来的文本**写死**成
  `"Error: " + message`——两个落点各在一半的族上露头：`console.log(new TypeError("t"))`
  落到普通对象那一支印 `{}`，而 `new RangeError("r")` 会印成 `Error: r`（**静默错值**）。
  修法是八族按名走（`IsErrorFamilyName` 那一张表，与 `Error.isError` 同一精神，
  `{ name: "Error" }` 那种普通对象被名单挡在外面）。
- **收掉的根④：`Error.stack` 那一格**（`globals.xl.md`）。Node 里它是**自有 + 不可枚举**的
  **字符串**，而本仓**没有这一格** ⇒ `typeof new Error("x").stack` 给 `"undefined"`
  （第 697 / 704 / 708 / 749 轮各登过一次，四处同一条根）。
  **这一版给的是「那一段的头一行」**（`<名>[: <消息>]`），写在明处：
  帧里的路径与行号是**本仓自己的实现细节**，照抄宿主栈会把「实现长什么样」钉进脚本看得见的值里；
  而头一行与 `util.inspect` 印的**头一行逐字相同**（判据 `r782b-01` 就是从 `stack` 与
  `console.log` 两个出口把同一句读回来比的）。**帧那一半如实登记为缺口**
  （`stdlib/error/001-console-log-error-stack` 仍是 differ）。
  **名从原型上读**（不另写一张表）、**必须在那八个之内**（`e.name = "Custom"` 不该改头一行）。
- **试过又退回来的一格（写在明处）**：`Object` / `Array` / `Date` / `Map` / `Promise` 那些
  **同一个形状**的对象接 `Function.prototype` 在 JS 里也对，第 782 轮**整批接上去之后
  `tests/runtime/check.mjs` 当场红两条**：`String(String)` 不再抛，而走**继承来的**
  `Function.prototype.toString` ⇒ `"function () { [native code] }"`（Node 给
  `"function String() { [native code] }"`）——**静默错值**比抛坏得多。
  要收它得先做出「**带可调用载荷的对象也有源码文本**」（每一格内建都要有一段自己的文本），
  所以退回**只接错误家族**，另一半登记在 `stdlib/round782/r782a-02`（`differ`，25 行照 JS 的答案写）。
- **五笔旧账到期**（`NEWLY-PASSING`，按规矩撤掉 `xl:want` / `xl:why`，用例留着当守卫）：
  `exec/round724/p724a-b01`（构造那一层的原型链）、`stdlib/error/probe697-e11` /
  `probe704-e-a38`（`typeof e.stack`）、`stdlib/round749/p749b-b06`（`Error` 家族形状旁的栈）、
  `stdlib/round781/r781a-01`（错误家族十八档里的最后两行）。
- **用例**：`stdlib/round782` 三条（**2 条通过、1 条登记**）——`r782a-01`（35 行，
  错误家族那一半的三个出口 + 「不许被带偏」的十七行）、`r782a-02`（25 行，`differ`，
  其余内建构造那一半）、`r782b-01`（24 行，八族各印各的名 + 「没有消息只印名」+ `stack` 那一格）。
  五类 7943 / 8349 → **7950 / 8352**、blocked **267**（没动）、differ 139 → **135**
  （五笔旧账转绿、新登一条）、bad 0、regressions 0，加权 **95.4%**。
  八道门全绿；runtime:check 243 条、runtime:cli 79 份一致。
- **这一轮的普查面**（两层）：**属性写入的次序**（`super.x = v` 的四个落点 / `Object.assign` /
  展开 / 内建整体操作打在原始值上 / 数组长度与下标 / 冻结与不可扩展 / 访问器与描述符）、
  **错误家族与内建对象自己那一格**（八族的形状与标签 / `instanceof` 链 / `console.log` 的印法 /
  `stack` / `name` 与 `length` / 代际的原型链）——**当场通过的那些照样进语料当守卫**。

### 第 781 轮：`Object.groupBy` 的**键**走 `ToPropertyKey`——收掉一处（符号键与对象键一起），另登记三条

**一句话**：`Object.groupBy([1, 2], () => Symbol("s"))` 在 JS 里给一个**符号键**的格子
（符号不许字符串化），而本仓那一句把键**无条件 `ValueText`** 成字符串 ⇒ 符号上**响亮地抛**
（`TypeError`）；同一句对**对象的键**也一样（`() => ({ toString() { return "k" } })` 该给 `"k"`）。

- **收掉的那一处**（`globals.xl.md` 的 `ObjectGroupBy`）：这一格原来自己写了一句
  `Value.FromString(table.CreateString(Units(ValueText(table, bucketName))))`
  ——**同一份「值 → 属性键」的规矩住着第二份**。修法是走现成的那一格：
  `text.xl.md` 的 `PropertyKeyName`（符号**原样返回**、其余 `ToString`、对象先 `ToPrimitive`），
  与 `get_index` / `set_index` **同一条路**，**没有新写第二份转换表**。
  判据 `stdlib/round781/r781b-01`：符号键（含两个同描述但不同身份的符号各占一格）、
  对象键、数字键、字符串键、空输入、null 原型六档。
- **三条登记的**：
  ① `stdlib/round781/r781a-01`（`differ`）——错误家族十八档里只剩**两行**不同，
  两行都是**旧账的新排版**：`Error.stack` 那一格（`typeof` 给 `undefined`）、
  `Object.getPrototypeOf(TypeError) === Error` 本仓给假（第 724 轮 `p724a-b01`）。
  **另注**：`class My extends Error {}` 写在**函数体**里会让**整份文件进不来**
  （`heap object is not an environment`）——那是 `r778m-01` / `r780b-04` 那一处根，
  所以这条用例**不写它**，免得把另外十六档一起带走。
  ② `r781c-01`（`differ`）——`structuredClone` 遇到**不可克隆的值**（函数、符号）抛的
  在 Node 里是 `DOMException`、本仓是 `TypeError`（本仓没有那一族）；其余十三档全对。
  ③ `r781d-01`（`differ`）——十二档里只剩 `typeof WeakRef` 一格
  （第 736 轮登记的「`Proxy` / `WeakRef` / `FinalizationRegistry` 三个全局名」，这一条
  把它与 `WeakMap` / `WeakSet` 自己的形状钉在一起）。
- **用例**：`round781` 六条（**3 条通过、3 条 differ**）——另三条当守卫：
  错误的抛出与接住（`try` / `finally` 的次序与覆盖 / 重抛 / 承诺里的抛）、
  `Object.groupBy` 与 `Map.groupBy` 的落点、新族方法（`toSorted` / `toReversed` / `toSpliced` /
  `with` / `isWellFormed` / `toWellFormed`）。
  五类 7940 / 8343 → **7943 / 8349**、blocked **267**（没动）、differ 136 → **139**、
  bad 0、regressions 0，加权 **95.4%**。八道门全绿；runtime:check 243 条、runtime:cli 79 份一致。
- **这一轮的普查面**（五层）：错误家族（`cause` / `AggregateError` / 子类 / 标签 / 原型链）、
  抛出与接住的上下文（`finally` 的覆盖、重抛、承诺里的抛）、分组（`Object.groupBy` /
  `Map.groupBy` 的键与回调形状）、`structuredClone`（共享引用 / 环 / 不可克隆的值）、
  弱集合与 `WeakRef`、新族方法——**当场通过的那些照样进语料当守卫**。

### 第 780 轮：把那张表**系统地量一遍**——`name` / `length` 剩下六处收掉，另量出 `super` 与隐式构造器两条新根

**一句话**：第 779 轮是「按家族抽查」，这一轮把 `name` / `length` 那一族**整族 dump**
（按家族逐格 `typeof` + `name` + `length`，`Math` / `JSON` / `Reflect` / `console` /
`Map`·`Set`·`Weak*` / `Promise`·`Error` / 生成器 / `Date` / `Array` / `Object` / `String` /
`Number` / `Symbol` 一共三百余格）——**剩下六处**全部收掉；同一趟另拿类语义的九个面探针，
量出 `super` 与**隐式构造器**两条新根。

- **收掉的六处**（都在 `globals.xl.md`，都是「造出来了、那两格没人写」）：
  ① `Object.getOwnPropertyDescriptors` 的 `length` 是 **`1`**、`Object.setPrototypeOf` 是 **`2`**
  （两格原来**整格不在 `BuiltinArity` 表里**）；
  ② `String.fromCharCode` / `fromCodePoint` / `raw` 三格（名字与长度都没有，都是 `1` 格）；
  ③ `Symbol.for` / `keyFor`（同一形状、`1` 格）；
  ④ `Error.isError`（`1`）与 `Error.captureStackTrace`（**`2`**）；
  ⑤ `Number.prototype.toLocaleString` 的 `length` 是 **`0`**（`toString` 是 `1`）——
  两格**共用一个能力号** ⇒ 按号查的表给不了两个答案，这一格改用 `MethodObject`
  **另造一个可调用对象**（同一格能力号、自己那一格 `length`），
  顺带把 `toLocaleString === toString` 也是假的这一条对上了；
  ⑥ 第 779 轮那几族的**守卫**（`Object` / `Array` / `Math` / `Reflect` / `console` /
  集合 / `Promise` / `Date` 的 dump）**全量进语料**，往后这一族漂一格就红。
- **新登的两条根**（都带 `xl:why`，各写明为什么不顺手收）：
  ① `runtime/round780/r780b-04`（`differ`）——**函数体里的派生类：隐式构造器那一格**。
  `class E extends Base { }`（没写构造函数）只要长在**函数体**里，`new E()` 就报
  `new_closure needs an environment or undefined`（八档里六档；**同一个形状写在模块顶层是好的**）。
  根在 `LowerClass` 第 203 轮那一句**合成**的默认构造函数（现造的普通节点，
  没有 `pos` / `parent` 这些真实节点才有的东西）——与第 778 轮
  `runtime/round778b/r778m-01`（函数体里 `class … extends` **内建**）**是同一处根**：
  **基类是不是内建无关**，缺的是隐式构造器那一格。八档一起把分界钉住
  （显式 `constructor(){ super() }` 的、不带基类的对照组都对）。
  ② `runtime/round780/r780c-03`（`blocked`）——**同一条路径上先读后声明的名字**：
  `try { new C() } catch { } class C { }` 报 `name used before its declaration: C`
  （**整份文件进不来**），而 JS 给的是运行期 `ReferenceError`（`try` 自己接得住）。
  降级期那一趟预扫只看「这一层声明过没有」、不看「这条路径先走了谁」——
  与第 778 轮 `runtime/round778b/r778l-01`（`switch` 的 `case` 里 `let`）**同一处根**，
  这一条是最小形状（四档里后两档——先调后面的函数声明、先读后面的 `let`——在 JS 里是好的）。
- **另登记两条**（`differ`）：`stdlib/round780/r780a-02`——整族 dump 里只剩
  `String.prototype.match` / `matchAll` / `search` **属性表里根本没有那一格**
  （与 `stdlib/globals/058` / `stdlib/string/135` 同一条根，`RegExp` 进来时一处点亮三行）；
  `runtime/round780/r780b-03`——**`super` 的四个落点**：类字段箭头里的 `super` 指到了自己那一层
  （Node 给 `"base"`、本仓给 `"d+base"`，**静默错值**）、对象字面量里的 `super.m.call(this)`
  本仓抛 `TypeError`、`set(w) { super.v = w }` **静默不写**、函数体里派生类的 `instanceof` 链
  走到 `r780b-04` 那一处根上；同一条用例的其余五档（方法 / 静态 / 取值器 / 显式构造 / `hasInstance`）全对。
- **用例**：`round780` 十二条（**7 条通过、4 条 differ、1 条 blocked**），
  五类 7933 / 8331 → **7940 / 8343**、blocked 266 → **267**、differ 132 → **136**、
  bad 0、regressions 0，加权 **95.5% → 95.4%**（分母涨了十二条、其中五条是新登的缺口）。
  八道门全绿；runtime:check 243 条、runtime:cli 79 份一致。
- **这一轮的普查面**（三类）：内建函数那一族的**整族 dump**、类语义九个面
  （字段初始化次序与 `static` 块 / 私有成员与访问器 / `super` 与继承 / 函数体里的派生类）、
  作用域与解构（`var` 提升 / TDZ 的 `typeof` / 块里的函数声明 / 循环闭包 / `catch` 作用域 /
  rest 与展开 / 默认值的惰性）——**当场通过的那些照样进语料当守卫**。

### 第 779 轮：**内建函数对象自己那两格**——`name` / `length` 那一张表铺到五处新落点，另登记四条

**一句话**：拿「内建函数的 `name` / `length`」这一族当尺子**普查**（第 733 / 734 轮铺过
`Math` / `Object` / `Array.prototype` / `String.prototype`），量出**五处落点**——每一处都是
「宿主引用（或可调用对象）造出来了，可没人往里写那两格」，四处当场收掉、一处如实登记。

- **收掉的根①：`Array` / `Number` / `Object` 的静态那一批走的是裸句柄**（第 779 轮）。
  `Array.isArray` / `Array.from` / `Array.of` / `Array.fromAsync` / `Object.create` /
  `Object.getPrototypeOf` / `Object.getOwnPropertyNames` / `Object.getOwnPropertySymbols` /
  `Object.fromEntries` / `Number.isInteger` / `Number.isSafeInteger` / `Number.isNaN` /
  `Number.isFinite` 十三格原来写的是 `Value.FromRef(HostRef, table.CreateHostRef(id, 0))`
  ——句柄是现造的，`name` 两格压根没人写 ⇒ 脚本读到的是「没有名字的那种内建」
  （`Array.isArray.name` 给 `""`、`.length` 给 `0`）。**修法就是第 733 轮那个收口**
  （`ObjectProtoMethod` = `BuiltinHostRef` + `DefineBuiltinName`），**没有新写一份**。
- **收掉的根②：`Date` 的三格静态与两格全局**。`Date.UTC` / `Date.parse` / `Date.now`、
  全局的 `parseInt` / `parseFloat` / `isNaN` / `isFinite` / 百分号编解码四个、
  `queueMicrotask` / `structuredClone`、`Map.groupBy`——同一形状、同一修法。
  其中 **`parseInt.length` 是 `2`**（`(文本, 基数)`，原来与 `parseFloat` 那一格**顺手归成一族**）。
- **收掉的根③：`Date.prototype` 那一族二十六个槽位一个名字都没有**（判据 `r779s-01`）：
  `Date.prototype.toISOString.name` 在 Node 里是 `"toISOString"`、本仓给空串。
  `InstallDateMethods` 多收一格 `vm`（取「有身份的那个句柄」要用它），
  循环里**造一个、挂一个、存同一个**。**八个名字共号的那几对**（`getTime` / `valueOf`、
  `toUTCString` / `toGMTString`、本地与 UTC 的 setter）**各挂各的句柄**——
  JS 里 `Date.prototype.getTime !== Date.prototype.valueOf`（实测），
  所以这里**不能**走 `ObjectProtoMethod`（按号取同一个值的话，后写的名字会把先写的顶掉）。
- **收掉的根④：生成器那三格与 `[Symbol.iterator]` 那几格**。`it.next` / `.return` / `.throw`
  是「对象 + 可调用载荷」（属性表本来就有），缺的只是名字与 `1` 格形参；
  `Array.prototype[Symbol.iterator]`（= `values`）、`String` 的、`Generator` / `AsyncGenerator` 的、
  `Map` / `Set` 的那五格原来都是裸句柄 ⇒ 名字空着，顺带把
  `[][Symbol.iterator] === [].values` / `Map.prototype[Symbol.iterator] === Map.prototype.entries`
  这两条**同一性**也对上了（按号取同一个值）。
- **`BuiltinArity` 那张表补的格**：`parseInt` 从「一格」那一列**挑出来**（是 `2`）、
  `JSON.parse` 是 `2` / `JSON.stringify` 是 `3`（原来写成一句「都是一格」）、
  `Object.getOwnPropertyDescriptor` 是 `2`、`Array.from` / `Array.isArray` 是 `1`、
  `Date.UTC` 是 `7` / `Date.parse` 是 `1`、七个 `set*` 是 `1..4`、`toJSON` 是 `1`、
  `map.groupBy` 是 `2`、`structuredClone` 是 `2`、`queueMicrotask` 是 `1`。
  **错误家族八个构造器自己的 `length`**（七个 `1`、`AggregateError` 是 `2`）——
  `Error` 那一格第 703 轮就挂了，其余七格一直空着（`TypeError.length` 给 `undefined`）。
- **新登记的两条**（各带 `xl:why`）：
  ① `runtime/round779/r779r-01`——**`arguments` 不是数组**（本仓的值就是数组，
  第 702 轮的有意取舍），四个面与 JS 不同：`typeof arguments.map` 给 `"function"`、
  原型不是 `Object.prototype`、`hasOwnProperty("length")` 给假、自有名表里多一格内部的 `__a`；
  ② `r779r-02`——**松散模式下形参与 `arguments` 的别名**（与 `exec/functions/095` 同一条根，
  这一条把严格模式那一半与函数自己的 `length` 一起钉住）。
- **另两条 `blocked`**（`stdlib/round779/r779j-01` / `j-02`）：`RegExp` 这个**全局名根本没登记**
  （`new RegExp("a")` 报 `name is not a local or a capture: RegExp`，**整份文件进不来**）
  ——它与正则字面量是**同一个缺失的两半**，两条用例把构造器那一半与「字符串方法接 RegExp 对象」
  那一半写成进来之后的判据。
- **用例**：`round779` 二十一条（**17 条通过、2 条 differ、2 条 blocked**），
  五类 7916 / 8310 → **7933 / 8331**、blocked 264 → **266**、differ 130 → **132**、
  bad 0、regressions 0，加权 **95.5%**。八道门全绿；runtime:check 243 条、runtime:cli 79 份一致。
- **这一轮的普查面**（九层）：正则（构造器 / 字符串方法接 RegExp 对象）、强制转换
  （`ToPrimitive` 两条提示、松相等十二格、加法的四种操作数）、数字格式化（进制 / 定点 / 指数 /
  精度 / 解析）、数组新族（`sort` 稳定性 / `flat` / `at` / `toReversed` / 洞与长度）、
  `JSON`（缩进 / replacer / reviver 的 `this` 与次序）、集合（`Map` / `Set` 的键与迭代）、
  字符串与日期与 `Math` 的边角、内建函数的 `name` / `length`、`arguments` 的形状
  ——**当场通过的那些也一起收进语料当守卫**。

### 第 778 轮（续）：六个面各量一遍——**一处收掉（计算键的对象那一档还开着）**，另登记四处

**一句话**：接着上面那一轮的六个面（解构 / 未接住的异常 / 对象字面量 / 字符串的 Unicode /
`switch` 的词法作用域 / 函数体里的类）各写一条**最小形状**的用例——**7 条通过、4 条登记**，
其中一处（`define_data` 的对象键）量到了**同一个落点上的两份答案**。

- **新登记的四处**（都带 `xl:why`，各写明「为什么不顺手收」）：
  ① `runtime/round778b/r778h-01`——**数组解构把迭代器抽干**：`const [a = 1, b = 2] = it`
  本仓给 `n0,n1,n2,def:p`、Node 给 `n0,def:p,n1`。根在降级层：数组模式先过
  `MaterializeIterable`（`GetIterator` + `IterDrain`，第 151 / 199 轮），
  而规范是「按位置、按需取」。数组与 `Set` 上看不出差别，**只有自定义迭代器分得开**。
  ② `runtime/round778b/r778l-01`——**跨 `case` 的 `let` 被降级期误判成 TDZ**：
  `switch (x) { case 1: return String(v); case 2: let v = "two"; }` 报
  `name used before its declaration: v`（**整份文件进不来**），而 Node 给运行时
  `ReferenceError`、脚本自己接得住。同一个 `switch` 块共用一个作用域，而那一趟预扫
  只看「声明出现过没有」、不看「这条路径先走了谁」。
  ③ `stdlib/round778b/r778j-02`——**计算键里放一个对象**：`{ [k]: 1 }`（`k` 是带
  `toString` 的对象）报 `unimplemented: ToString of this kind of value`。
  `vm.xl.md` 的 `PropertyKeyOf`（引擎侧）对对象会回调 `PropertyKeyHookId`
  （`o[k]` 那一路一直是好的），而 `define_data` 那一格把同一份规矩**照抄在语言层**、
  用的是 `RtToString`——**一句话住着两份**，收它要先挪到一处。
  ④ `runtime/round778b/r778m-01`——**函数体里 `class … extends` 一个内建**：
  `heap object is not an environment`（与第 697 轮 `probe697-e16` 同一条根，
  这一条把分界缩到最小：同一个 `extends Error` 写在顶层是对的、
  `extends` 一个**用户类**写在函数里也是对的——差别只剩「函数体 + 内建基类」）。
- **对照全对的那几档**（同一条用例里钉着，收缺口时不许连累它们）：解构的默认值触发条件与
  求值次序（`r778h-01` 的其余 18 档）、`switch` 的空转 / 落空 / `default` 位置 /
  `case` 里的块与 `var`（`r778l-01` 的其余 14 档）、对象字面量的重复键 / `__proto__` /
  键的次序 / getter-setter 配对 / 展开 / `super`（`r778j-01` 全 16 档）、
  字符串的码点与码元 / 大小写映射 / 四种正规化 / `at` / `padStart`（`r778k-01` 全 18 档）、
  函数体里的类字段 / 方法 / 构造器 / 静态字段（`r778m-01` 的 01…05）。
- 用例：`round778b` 七条（**3 条通过、4 条登记**，另 `round778` 那一批
  **4 条通过、3 条登记**）。五类 7913 / 8304 → **7916 / 8310**、blocked 262 → **264**、
  differ 129 → **130**（+4 登记）、bad 0、regressions 0，加权 **95.5%**。
  八道门全绿；runtime:check 243 条、runtime:cli 79 份一致。

### 第 777 轮：**原始值上的下标读**——收掉一句早退、一笔旧账到期，另登记一处同族的符号缺口

**一句话**：`vm.xl.md` 的 `get_index` 里有一句「**不是对象就给 `undefined`**」的早退，
于是 `n["toFixed"]` 给 `undefined`、而**同一格的 `n.toFixed`** 是好的——
JS 里两者是同一件事（先 `ToObject` 再沿原型找），那一句是**这一支自己多出来的**。

- **收掉的根**（`runtime/vm.xl.md` 的 `RtOp.GetIndex`）：点号那一路（`RtOp.GetProp`）
  **无条件**交给 `GetProperty`，而 `GetProperty` 自己会装箱（`(5).toFixed` /
  `true.toString()` 一直是对的）⇒ 两份实现漂在这一句早退上。
  改法：早退只留给**符号**（它连属性表都没有，那两格另由 `RtOp.GetProp` 特判），
  其余非对象接收者照常落到下面那次 `GetProperty`——**没有新写一份装箱**。
- **症状是静默错值**：`n["toFixed"] === Number.prototype.toFixed` 给**假**
  （读起来像「那个方法不存在」）；`n["toFixed"](2)` 直接报
  `cannot call a non-closure value`。用户看得见的那几处：
  `arr.map(Number.prototype.toFixed)`、`===` 比较、`Set` 去重。
- **一笔旧账到期**：`runtime/round750/p750a-a04`（第 750 轮登的那一格，`xl:want` 已按规矩撤，
  用例留着当守卫）。**注意它的 `xl:why` 当年把根记成了「`CreateHostRef` 每次新造句柄」——
  这一轮量出来的是另一处**（`CreateHostRef` 那条路第 733 轮就收过了，
  `Number.prototype.toFixed` 与 `n.toFixed` 本来就是同一个句柄，差的只是下标这一支根本没走到装箱）。
- **另登记一处**（`stdlib/round777/r777b-01`，`differ`）：**符号上的下标读**
  （`Symbol("s")["description"]` Node 给 `"s"`、本仓给 `undefined`；`["toString"]` 同一句）。
  它与这一轮收掉的那一格是**同一句话的两个出口**，只是符号没有目标可查 ⇒ 留在早退那一支上。
  **为什么不顺手收**：那两格的特判长在 `RtOp.GetProp` 的代码里，让两处住到一处是一次重构，
  照抄一份就是「两处会漂」——**先如实登记，不猜**。
- **用例**：`runtime/round777/r777a-01`（18 行，**通过**）——数字 / 布尔 / 字符串三档的
  下标读与点号读逐一对照，另钉两条边界（不存在的键照旧 `undefined`、对象与数组那两档不许被带偏）。
  五类 7905 / 8294 → **7907 / 8296**、blocked **262**（没动）、differ **127**
  （旧账转绿 1、新登记 1）、bad 0、regressions 0，加权 **95.6%**。八道门全绿；
  runtime:check 243 条、runtime:cli 79 份一致。
- **这一轮的普查面**（四层 9 条）：类语义（静态成员的继承与 `super` / 私有成员与品牌检查 /
  `extends` 表达式与计算成员）、承诺与 `async`（`await` 的值与次序 / `Promise` 静态与实例 /
  executor 的同步与抛）、生成器（`return` 值 / `yield*` 委托 / `throw` 进去 / 标签与 `typeof`）、
  对象（展开的落点与 getter / `Object` 取值族与相等）——**7 条当场通过**，
  另 2 条是探针自己不合法的 `nodefail`（生成器里留了没结清的承诺），**不进语料**。

### 第 776 轮：**箭头函数的体是语句列表**——收掉一处（token 层的一句白名单），三种排版一个落点

**一句话**：`text-common-util.xl.md` 的 `IsStatementList` 少了 **`LamdaBody`** 这一格——
箭头函数的体（`() => { … }`）与 `FunctionBody` / `MethodBody` **并列**、`Data` 里装的同样是语句，
可它不在白名单里 ⇒ `IsStatementStart` 给假 ⇒ `JsonObjectCloseRule` 把**语句位置的那个 `{`**
收成**对象字面量**。同一个根，三种排版三个出口：

| 写法（都在箭头体里） | 本仓以前报的错 |
| --- | --- |
| `() => { { let y = 2; } }`（裸块语句） | `unimplemented: statement ObjectLiteralExpression` |
| `() => { blk: { g(); break blk; } }`（标签块） | `unimplemented: object literal member ExpressionStatement` |
| `[1].forEach(() => { w: { … } })`（当回调） | `name is not a local or a capture: w` |

- **落点**（`typescript/text-common-util.xl.md`）：`IsStatementList` 的类名白名单补一格
  `LamdaBody`。这一问的**两个用户**（`JsonObjectCloseRule.IsObjectAt` 与两个语句成形器）
  因此同时被修正 —— 那句注释里写着「放在这一层是因为两边各写一份就会漂」。
- **为什么一直没露**：`x: { }`（**空**标签块）碰巧是好的（空花括号不走对象那条路），
  而 `lbl: for (…)` 也不走这一支（标签后面跟的不是花括号）⇒
  「箭头体里的标签块」看着像**只坏一半**；而裸块语句与回调里的标签块**整份文件跑不进来**。
- **判据只看「这个 `{` 在不在语句位」**：值位那一半一个都不许动——用例 `r776a-02`
  把箭头体里**值位**的花括号全钉了一遍（括号化对象体 / `return { … }` / 变量对象 /
  嵌套对象 / 当实参 / 类型字面量断言 / 形参解构 / `for..of` 解构）。
- **用例**：`runtime/round776/r776a-01`（15 行，**通过**）+ `r776a-02`（15 行，**通过**）
  ——前者把三种排版、嵌套标签块、`switch` 分支块、`try` 里的块一起钉住，
  另带三条哨兵（函数体 / 方法体 / 类字段箭头，那三处**本来就对**）。
  五类 7903 / 8292 → **7905 / 8294**、blocked **262**（没动）、differ **127**（没动）、
  bad 0、regressions 0，加权 **95.6%**。八道门全绿（`cases:tsast` 八项仍全 0）；
  runtime:check 243 条、runtime:cli 79 份一致。
- **这一轮的普查面**（`runtime` / `stdlib` 各一层）：控制流（标签 / `try..finally` 的次序 /
  `switch` 落空 / 循环里的闭包与 `var`·`let`）、迭代协议（自定义 `Symbol.iterator` 三写法 /
  解构默认值与 `...rest`）、访问器（类与字面量的 `get`·`set` / 描述符三档 / `for..in` 的次序）、
  数字（`toFixed` / `toPrecision` / `radix` / `parseInt`·`parseFloat` / `Math` 的边角）
  ——**24 条里 22 条当场通过**，另两条是**登记过的旧账**
  （`(1234.5).toLocaleString()` = `stdlib/number/073`；`new.target` 经 `super()` = `exec/round736/p736c-c05`），
  没有新登记的缺口。

### 第 775 轮：**函数 / 类表达式当链的头一格**——收掉一处（投影层，三种排版），两笔旧账到期

**一句话**：`function () { }.bind(o)` / `class { }.prototype` 里那条链的**头一格**是
函数 / 类表达式，而链那一支对头一格直接 `projectNode(ck[0], ctx)`——
`ctx.expressionPosition` **没人置**，于是投出 `FunctionDeclaration` / `ClassDeclaration`，
降级期报 `unimplemented: expression FunctionDeclaration`（**整份文件一个字节都不跑**，
读起来像「函数表达式还没实现」——而 `(function () { })()` 那一半一直是好的）。

- **分界是「体后面跟的是什么」**：末尾那对实参括号走投影层 3b 那一支、
  **递回 `projectExpression`**（标记照常置上）⇒ IIFE 一直是对的；
  `.bind` / `.call` / `.prototype` / `.length` 那一族走**链那一支** ⇒ 全错。
  三种排版各差一条判据，一处落点（`typescript/print-ast-common.xl.md` 的 `projectExpression`）：
  - **① 链的头一格**：新增 `projectChainHead`——**只对 `Function` / `Class` 这两个标签**
    置 `ctx.expressionPosition`，投完还回去。**判据只看这一格自己**：标记置宽了
    （留给整棵子树）会让体里的声明也被当成表达式（第 134 轮那条注释记的就是这个坑，
    症状是 `unimplemented: statement FunctionExpression`）。
  - **② 紧跟的方括号是下标**：`function () { }["length"]` 的那个 `[` 在 token 层
    被收成 **`ArrayLiteral`**（前面那一格不是「标识符 / 已折好的链」，与第 303 轮
    `o.b![1]` **同一处境**）⇒ 链入口与循环里那条「`ArrayLiteral` 也是下标」的判据
    各补一档：**链头是函数 / 类**（只可能做值的两格）。
  - **③ 续格与运算符挤在同一个二元单元里**：`() => class { static s = 1; }["s"] * 16`
    的产物是 `[Class, BinaryOperator(ArrayLiteral(s), «*», 16)]`——与第 743 轮
    `o["f"]().v + 1` 是同一副面孔，只是续格是**下标**；
    新增 `indexTailInOperator` / `flattenIndexTailInOperator`（判据与摊法照抄
    `chainTailInOperator` / `flattenChainTailInOperator`，**递归那一档同一理由**）。
    **只有链头是那两格时才走**：别的链头本来就由 token 层认成下标，放开会换掉既有形状
    （实测 `o["i"] * 2` 一直是对的）。
- **两笔旧账到期**（都是这一处根，用例留着当守卫、指令按规矩撤）：
  `exec/functions/probe693b-f26`（第 693 轮登的 `function () { }.bind(null)`）与
  `runtime/round758/p758a-01-return-then-function-declaration`（第 758 轮登的
  `return function f() {}.name`）。**第 758 轮那句「要动语句切分」是猜错了**：
  `return function` 那一格 token 层给的形状本来就是对的（`[Keyword(return), Function, …]`），
  缺的只是投影层这一格标记。
- **用例**：`runtime/round775/r775a-01`（18 行，**通过**）+ `r775a-02`（18 行，**通过**）
  ——前者钉修好的三种后缀与两条**不许被带偏**的边界（声明位照旧是声明、
  **体里的声明照旧是声明**），后者把旁边那一圈邻居一起管住
  （一元前缀后面的、当实参 / 数组元素 / `new` 目标的、连两次后缀的、括号化的）。
  五类 7899 / 8290 → **7903 / 8292**、blocked 264 → **262**（两笔旧账）、differ **127**（没动）、
  bad 0、regressions 0，加权 **95.5% → 95.6%**。八道门全绿；
  runtime:check 243 条、runtime:cli 79 份一致。

### 第 774 轮：**括号被调者**那一族——收掉两处（投影 / 降级各一处），透明壳与「不是引用」的边界钉在语料里

**一句话**：第 773 轮登记的 `stdlib/round773/r773b-01` 收掉了——**两处**：
token 层那一支「内层那次调用是被调用者」的判据太宽，降级层选分支之前**没剥透明壳**。

- **收掉的根①：`Method.PrintAst` 的「内层调用」那一支会命中实参**
  （`typescript/tokens/method.xl.md`）。那一支本来只写给 `f()()`（外面那次调用收成
  `Method(name="")`、**里面那次调用是它的第一个子单元**）——可判据写的是
  `kids.find(k => k.type === "Method")`，于是**实参**里那一个 `Method` 也算数。
  `(String)(Symbol("s"))` 的产物是
  `Method(name="", children=[Bracket(String), Method(name="Symbol")])`，
  它把**实参**当成被调用者、把**被调用者**当成实参 ⇒ 投出
  `CallExpression{ expression: Symbol("s"), arguments: [Parenthesized(String)] }`
  ——**被调者与实参整段对调**（Node 打 `ok:Symbol(s)`、本仓去打那个符号）。
  **修法与旁边那条 IIFE 支路同款**（`brace === kids[0]`，第 664 轮）：
  内层那次调用必须**就是第一个子单元**，否则让开——让开之后那条 IIFE 支路
  正好把这个形状接对（被调用者是那对括号、实参是后面那一格）。
- **收掉的根②：降级层选调用分支时没剥透明壳**（`typescript-exec/lowering.xl.md`
  的 `LowerCall`）。它按 `NodeKind(被调者)` 分三条路（成员 / 下标 / 通用），
  而**括号 / `as` / `satisfies` / `!` 这四个壳不改引用**——`([1, 2].join)("")`
  在 JS 里 `this` 仍然是那个数组，本仓却落进通用那条路（`D` 给 `-1`、
  `this` 是 `undefined`）⇒ `Array.prototype.join` 报
  `Cannot convert undefined or null to object`（判据 11 / 12 行）。
  **修法**：选分支之前把这四个壳剥掉（**与 `NamesFunctionValue` 那张名单同源**，
  两处各写一份就是两处会漂的答案）。**`(0, o.m)(1)` 不在名单里**——
  逗号那一格在 JS 里**不是引用** ⇒ `this` 是 `undefined`，它该走通用路（第 9 / 14 行钉着）。
- **用例**：`runtime/round774/r774a-01`（24 行，**通过**）——把**两半**一起钉住：
  透明壳（括号 / `as` / `!` / 双层括号 / 下标 / 字面量接收者）`this` 照旧是接收者，
  而**变量 / 逗号 / `bind`** 那几档照旧是 `undefined`；另把 `new (C)()` /
  `(new C().get)()` / `(C.prototype.get).call(…)` / 三种 IIFE / `(String)(Symbol(…))`
  那一族一起收进来。第 773 轮那条台账按规矩撤掉（用例留着当守卫）。
  五类 7897 / 8289 → **7899 / 8290**、blocked 264（**没动**）、differ 128 → **127**
  （旧账转绿 1、新用例 1 条通过）、bad 0、regressions 0，加权 **95.5%**。
  八道门全绿；runtime:check 243 条、runtime:cli 79 份一致。

### 第 773 轮：两笔旧账到期（`JSON.parse` 的实参 / `Promise` 静态那两格），另从普查里量出一处**投影层**的新根

**一句话**：这一轮把第 771 / 772 两轮登记的三条台账收掉两条（第三条的一半也收了），
另在**括号被调者**那一格上量出一条**投影层**的新根——三种症状，一个落点。

- **收掉的根①：`JSON.parse` 的实参没走 `ToString`**（`stdlib/round773/r773a-01`，
  收掉第 771 轮登记的 `stdlib/round771/r771b-02` 的一半）。JS 的第一句是
  `ToString(text)`——`JSON.parse(1)` 给 `1`（`"1"` 解析出来就是那个数）、`null` 给 `null`、
  `true` 给 `true`，而本仓**只收字符串**、别的**一律** `SyntaxError: JSON.parse needs a string`
  （判据第 2 行：Node 打 `ok:number:1`、本仓打 `throw:SyntaxError`）。
  修法与 `String(x)` **同一处**（`ToPrimitiveOf` + `JsTextUnits`，不写第二份转换表），
  **符号那一档单独挡**：`String(sym)` 有一条特例（给 `"Symbol(…)"`），
  而这里要的 `ToString(sym)` 在 JS 里**抛 `TypeError`**（`JSON.parse(Symbol())` 就是它）。
- **收掉的根②：`Promise` 那八个静态没有 `name` / `length`**（收掉第 772 轮登记的
  `stdlib/round772/r772d-01`）。第 733 / 734 轮那一张表铺到了 `Array` / `String` / `Number` /
  `Boolean` / `Error`，`Promise` 那一族**漏了**——`BuildPromise` 里是
  「宿主引用直接挂上去」，两格从来没人写过（`Promise.all.length` 给 `0`、`.name` 给 `""`）。
  修法：`InstallGlobals` 里对八个静态走 `BuiltinHostRef` + `DefineBuiltinName`，
  `BuiltinArity` 添一列（**七个是一格、`withResolvers` 是零格**，按 Node 逐个量的）。
- **新登一条**（`stdlib/round773/r773b-01`，`differ`）：**括号被调者**（`(f)(…)`）
  那一段在**投影层**整段接错。token 层给的是 `Method(name="", children=[Bracket(被调者), 实参…])`，
  而投影把它读成 `CallExpression{ expression: <实参里那一次调用>, arguments: [<被调者>] }`
  ——**被调者与实参对调**。**三种症状**：① 实参是**一次调用**时整段对调
  （`(String)(String(1))` 本仓去调那个 `1` ⇒ `cannot call a non-closure value`）；
  ② 括号里是**字面量接收者的方法访问**时接收者丢失
  （`('ab'.toUpperCase)()` 报 `String.prototype method called on null or undefined`）；
  ③ 而**标识符接收者**（`(o.m)(2)`）与**字面量实参**（`(String)("s")`）那两档本来就对
  ——用例把这一半也钉住，收的时候不许连累它们。
  **它与第 771 轮那条 `(JSON.stringify as any)(Symbol('s'))` 是同一条根**：
  那一句量到的「`JSON.stringify(Symbol())` 抛 TypeError」其实是**括号被调者**的症状，
  换成方法形态之后两边一字不差（第 1 行就是它）——台账已按现状改写。
- 用例：`stdlib/round773` 两条（**1 条通过、1 条登记**），另把第 771 / 772 那两条
  到期的台账按规矩撤掉（用例留着当守卫）。
  五类 7894 / 8287 → **7897 / 8289**、blocked 264（**没动**）、differ 129 → **128**
  （新登 1、旧账转绿 2）、bad 0、regressions 0，加权 **95.5%**。
  八道门全绿；runtime:check 243 条、runtime:cli 79 份一致。

### 第 772 轮：**空值接收者**那一族——两处根（调用位 / 写删位），另登记两处

**一句话**：接着第 771 轮那条线往**空值接收者**上量（读 / 调 / 写 / 删 / 下标），
量出**两处根**：一处让**整份脚本被引擎带走**（`u.x()`），一处把 `null` / `undefined`
上的写入与删除**静默当成成功**；另登记两处（可选调用那一格被整段跳过、
`Promise` 静态方法少了 `name` / `length`）。

- **收掉的根①：`DoCallMethod` 在 `Guard` 已经展开之后照旧往下调**
  （`runtime/round772/r772a-01` / `a02`，收掉第 771 轮登记的
  `runtime/round771/r771c-01`——那条台账按规矩撤了，用例留着当守卫）。
  `u.x()`（`u` 是 `undefined` / `null`）在 JS 里是 **TypeError、脚本自己接得住**；
  本仓**整份脚本被带走**（`cannot call a non-closure value`，退出码 1、后面的行一行都不打印）。
  **根子**：`DoCallMethod` 的第一次属性读是包在 `Guard` 里的（第 254 轮为这条读补的），
  可 `Guard` 把那一抛翻成脚本站内异常之后**控制流已经交给处理点**，而**这一句之后照旧会跑**
  ——底下那次 `DoCallValue` 拿到的是 `Value.Undefined()` ⇒ 再抛一次，
  而**处理点已经被上一次展开取走了** ⇒ 这一抛没有落点。
  **同一个根的第二个症状**（这一轮普查量到的）：**调用位上的 getter 抛错**
  （`const o = { get g() { throw new TypeError("boom") } }; o.g()`）同样被带走——
  那一抛走的是**重入**那条路，**连 `Guard` 都不经过**。
  **修法**：读完先问「帧还在不在原处」，判据是三样合起来——
  `readThrew`（那一抛是 `GetProperty` 自己抛的宿主异常，就地记一格最准）、
  `frame.Pc !== pcBeforeRead`（落点在**本帧**时改的就是它）、
  `Frames.Depth() !== depthBeforeRead`（落点在本帧**外面**时本帧被弹掉、
  `Pc` 留在原处，只剩层深说得清）。
  **为什么不能只看 `this.Throws` 变没变**（`CallNative` 里那条惯用法）：
  getter **自己接住**了它里面那一抛时它照样加一，而那一刻 `GetProperty` 是**正常返回**的
  ⇒ 会把一次正常的调用整段跳掉（**静默错值**）。用例里那两个「自己接住」的 getter
  就是这一条的哨兵（`a02` 的第 4 / 5 行）。
- **收掉的根②：`null` / `undefined` 上的写与删是静默的**（`stdlib/round772/r772b-01`）。
  规范第一句是 `RequireObjectCoercible`，而第 750 轮把「原始值接收者」那一档**整个**收进
  `return false` 之后，**空值**也被顺带当成「写不下去、一声不响」：
  `u.x = 1` / `u[0] = 1` / `delete u.x` 本仓都当成功（判据 `r772b-01` 的 01…07 行：
  Node 全给 `throw:TypeError`）。**修法三处一起**（同一句判据、三个落点）：
  `props.xl.md` 的 `SetPropertySearched`、`vm.xl.md` 的 `del_prop` 与 `set_index`
  ——空值那一档抛 `TypeError`（走 `Guard`，`Guard` 认得出宿主 `TypeError` 这一类），
  **别的原始值一个字都没动**：`(1).x = 1` / `"abc".length = 9` 仍然静默、
  `delete (1).x` 仍然给真（用例的 08…11 行钉着这一半）。
- **新登两条**（都带 `xl:why`）：
  ① `stdlib/round772/r772c-01`——**`u.x?.()` 那一读被整段跳过**（**静默错值**）：
  JS 里 `?.` 只护**它左边那一格**（`u.x` 的读要 `RequireObjectCoercible`，
  所以空值接收者上照样抛 `TypeError`），本仓把整条链当成可选的 ⇒ 给 `undefined`、
  **连 `try` 都不进**。分界由同一份用例的其余六行钉着（`u?.x()` 两边都给 `undefined`、
  `u.x.y?.()` / `u.x!()` / `u["x"]?.()` 两边都抛、`o.x?.()` 两边都给 `undefined`）。
  ② `stdlib/round772/r772d-01`——**`Promise` 静态方法少了 `name` / `length`**：
  第 733 / 734 轮那一张表铺到了 `Array` / `String` / `Number` / `Boolean` / `Error`，
  `Promise` 那一族漏了（`Promise.all.length` 该是 `1`、本仓给 `0`；`.name` 该是 `"all"`、
  本仓给 `""`），六个静态一起；`Promise.prototype.then.length`（`2`）与
  `Promise.length`（`1`）本来就是对的，用例把这两半钉在同一份语料里。
- 守卫（这一轮量下来本来全对、收进语料）：空值接收者上的**读**
  （`u.x` / `u[0]` / `u?.x` 三条路都已经是 `TypeError` 或 `undefined`）、
  原始值接收者上的写删（第 750 轮收的那一档）、`try` / `finally` / `return` /
  箭头函数四种上下文里的空值调用（`a02` 的 06…08 行）、
  一次**已经接住过**的异常之后再调方法（`Throws` 那条惯用法会误伤的形状）。
- 用例：`runtime/round772` 两条 + `stdlib/round772` 三条（**3 条通过、2 条登记**）。
  五类 7890 / 8282 → **7894 / 8287**、blocked 265 → **264**（收掉的那条）、
  differ 127 → **129**（+2 新登记）、bad 0、regressions 0，加权 **95.5%**。
  八道门全绿；runtime:check 243 条、runtime:cli 79 份一致。

### 第 771 轮：**不匹配的接收者**那一族——十三处一起换成 `TypeError`，另登记四处

**一句话**：接着第 770 轮那条线往**别的内建**上量（`String` / `Number` / 集合 / `Date` /
`JSON` / 承诺 / 符号），收掉一处**跨四个内建**的根（「接收者不对就抛笼统的 `Error`」），
另登记四处缺口——其中一条是这一轮**唯一**量到「整份脚本被带走」的那一格。

- **收掉的根**（`stdlib/round771/r771b-01`，15 行）：`Map` / `Set` / `WeakMap` 的实例方法
  与 `Date` 的实例方法在不匹配的接收者上都抛**笼统的 `Error`**——而 JS 一律 `TypeError`：
  `Map.prototype.get.call({}, 1)` 是
  `TypeError: Method Map.prototype.get called on incompatible receiver #<Object>`、
  `Date.prototype.getTime.call({})` 是 `TypeError: this is not a Date object.`。
  改法两处：`map.xl.md` 的 `ReadOwn`（`Map` / `Set` 两族的**唯一**出口，
  所以一处改完两族都好）与 `globals.xl.md` 里 `Date` 那**九处**同一句
  （`replace_all` 一次换完）。**V8 那句里的 `#<Object>` 那一截没有复现**
  （它要接收者的内部标签，这一层手上只有 `Value.Tag`）——**写在明处**：族对上了、措辞差一截。
- **顺手收掉**（`stdlib/round771/r771b-05`）：`Object.prototype.valueOf.call(null)` 在 JS 里
  先走 `RequireObjectCoercible`（`TypeError: Cannot convert undefined or null to object`），
  本仓原来**把 `null` 原样交回去了**（`ok:object:null`）。这一句与第 691 / 706 轮
  `hasOwnProperty` / `__lookupGetter__` 那两处**同一句**。
- **新登四条**（都带 `xl:why`）：
  ① `runtime/round771/r771c-01`——**成员调用落在空值接收者上**（`u.x()`，`u` 是 `undefined`）：
  JS 给 `TypeError`、**脚本自己接得住**，本仓**整份脚本被引擎带走**
  （`cannot call a non-closure value`，退出码 1、后面的行一行都不打印）。
  这一条按 `blocked` 记（**它在本仓跑不完**，比不出 stdout——与 `differ` 不是一件事）。
  ② `stdlib/round771/r771b-02`——`JSON.stringify(Symbol())` 该给 `undefined`（不抛）、
  `JSON.parse(1)` 该先 `ToString` 实参。
  ③ `stdlib/round771/r771b-03`——`Promise.all(1)` / `Promise.race({})` 在 JS 里
  **返回一个被拒的承诺**（错在微任务里），本仓**同步抛**；`Promise.resolve.call(null, 1)`
  该抛 `TypeError`（接收者不是构造函数）。
  ④ `stdlib/round771/r771a-03`——**符号包装对象**与原始值装箱：`Object.keys(Symbol())` 该给
  `[]`、`Object.getPrototypeOf(Symbol())` 该给 `Symbol.prototype`、
  `Object.prototype.valueOf.call("x")` 该给一个 String 包装对象。
- 守卫（这一轮量下来本来全对、收进语料）：`String` / `Number` / `Boolean` 原型方法在
  **原始值接收者**上的通用行为（`charAt.call(1, 0)` 给 `"1"`、`toFixed.call("1", 2)` 给 `"1.00"`）
  与实参校验（`repeat(-1)` / `toFixed(101)` / `toString(37)` 各抛哪一族）、
  `parseInt` / `Number` / `Math` 遇上符号那一族的响亮失败。
- 用例：`stdlib/round771` 七条 + `runtime/round771` 一条（**4 条通过、4 条登记**）。
  五类 7886 / 8274 → **7890 / 8282**、blocked 264 → 265（+1 那条跑不完的）、
  differ 124 → 127（+3）、bad 0、regressions 0，加权 **95.6% → 95.5%**。
  八道门全绿；runtime:check 243 条、runtime:cli 79 份一致。

### 第 770 轮：**抛出来的族**与**接收者的 `ToObject`**——三处根、两条旧账到期

**一句话**：这一轮的普查面就是上一轮新登的那两条缺口所在的族——
**内建实参校验抛的是哪个族**、以及**原始值 / 空值当接收者时那一步 `ToObject`**。
四面（数组回调 / 数组自身的实参 / `Object` 静态方法 / `Reflect` 与函数）量出三处根，
一次收掉；上一轮新登的两条当场到期。

- **收掉的根①：回调不是函数抛的是笼统的 `Error`**（`stdlib/round770/r770a-01`，14 行）。
  JS 的九处回调内建第一步都是同一件事（`If IsCallable(callback) is false, throw a TypeError`），
  而本仓九处写的是 `throw new Error("this array method needs a function and a call channel (…)")`
  ——**族错了一档**：脚本里 `catch (e) { if (e instanceof TypeError) … }` 那一支**永远走不到**。
  改法：收成 `CallbackArgOr`（`array.xl.md`），**消息也照 V8**
  （`number 1 is not a function` / `string "x" is not a function` / `object null is not a function`
  ——那一句脚本直接打得出来，所以另抽一格 `KindTextOf` 专门给这个说法）；
  「没有调用通道」是**另一档**（宿主配置错了），分两句。
  顺手收掉同一段里第二处：`reduce` 原来问的是 `args[0].IsCallable()`（**看不到可调用对象**，
  `[1, 2].reduce(String)` 会被拒——`map` 那一处第 145 轮踩过同一个坑）。
- **收掉的根②：通用数组方法遇上空值接收者给的是 `[]` / `""`**（`stdlib/round770/r770a-02`）。
  JS 的第一步是 `ToObject(this)`：`Array.prototype.slice.call(null)` 在 Node 里抛
  `TypeError: Cannot convert undefined or null to object`，本仓把它当成「`length` 读不出来」
  的类数组、**静默给空数组**。改法：在**所有类数组分支之前**挡住 `null` / `undefined`
  （此前 `concat` 那一处自己有一句、`ArrayLikeSnapshot` 那一处又有一句——**第 770 轮合成一句**，
  另外两处按 `tsc` 的「没有重叠」删掉）。
- **收掉的根③：`Object` 静态方法对原始值接收者一律抛**（`stdlib/round770/r770b-01`）。
  JS 的 `ToObject` 会把数 / 布尔 / 符号**装箱**：`Object.getOwnPropertyDescriptor(1, "x")` 给
  `undefined`、`getOwnPropertyDescriptors(1)` 给 `{}`、`getOwnPropertySymbols(1)` 给 `[]`、
  `Object.assign(1, { a: 1 })` 给一个 **`Number` 包装对象**——本仓四处都抛「unimplemented」。
  改法：三处接收者走**本文件里现成的 `BoxReceiver`**（第 710 轮给 `this` 抽的同一句），
  空值那一档抛 `TypeError`（V8 的措辞逐字）；`Object.defineProperties(1, {})` 与
  `Object.create(1)` 两条按 V8 实测**不装箱**，只把族与措辞对上
  （`Object.defineProperties called on non-object` /
  `Object prototype may only be an Object or null: 1`）。
- **两条旧账当场到期**（上一轮新登的）：`runtime/round769/r769a-03` 与 `stdlib/round769/r769b-01`
  转绿，指令已按规矩删掉。
- **一条判据随契约更新**：`runtime:check` 那一门里「标准库第三批」原来钉着
  「原始值当 `Object.assign` 的目标必须**响亮地抛**」——第 770 轮把它做掉了，
  于是那一格**从 `loud` 挪到 `out` 末尾**去断它给对（`typeof boxedAssign + '/' + boxedAssign.a`
  给 `object/1`），与第 216 轮 `Array.from` 那一格的挪法同一种。
- 守卫（这一轮量下来本来全对、收进语料）：`Reflect` 那一族（`get` / `set` / `has` / `ownKeys` /
  `defineProperty` / `getPrototypeOf` / `apply` / `construct` 的接收者与实参表）与
  `Function.prototype` 的 `call` / `apply` / `bind` 在原始值与非数组实参表上的口径。
- 用例：`stdlib/round770` 四条（**4 条全过**）。
  五类 7880 / 8270 → **7886 / 8274**、blocked 264（没动）、differ 126 → 124（**两条到期**）、
  bad 0、regressions 0、weighted **95.5% → 95.6%**。
  八道门全绿；runtime:check 243 条、runtime:cli 79 份一致。

### 第 769 轮：下标位上的访问器——**读路径**收成一对助手、**写路径**如实登记

**一句话**：这一轮的普查面是**数组的洞与复制族 / 属性描述符与访问器 / 函数对象与调用形态 /
异常出口与循环绑定**——十三组原子探针量出**一处根**（「读接收者第 `i` 格」这件事在二十来处
各写各的），收掉它、顺手收窄第 746 轮那一条过宽的 `sort` 判据，另新登三条缺口。

- **收掉的那一处根**（`runtime/round769/r769e-01`、`r769a-02`）：装访问器那一处会把数组那一格
  **摘成洞**（`props.xl.md` 的 `IndexAccessorAt` 写着为什么：元素区与属性表住不下同一格），
  于是所有「先看元素区」的读路径都读到 `undefined`。`join` 第 756 轮只补了自己那一处 ⇒
  同一件事在**二十来处**各错一遍：`slice` / `toReversed` / `toSorted` / `toSpliced` / `with` /
  `concat` / `flat` / `map` / `filter` / `forEach` / `find` 族 / `some` / `every` / `reduce` /
  `indexOf` / `lastIndexOf` / `includes` / `at` / `values` / `entries` / `take` / `drop` /
  `Array.from` / `apply` / 展开与 `for..of`。一次量出 **22 行**（`[...a]` 给 `[undefined, …]`、
  `a.slice()` 给 `[undefined, …]`——**静默错值**：一句异常都没有，只是值是洞给的那个）。
  **改法**：收成**一对**助手——`ArrayHasAt`（这一格**在不在**：元素区有值，或属性表里有访问器）
  与 `ArrayElementAt`（**读**这一格：访问器走 `GetProperty`、其余走元素区）。`AppendSlot` 与
  `FlattenInto` 的签名跟着带上 `room` / `protos` / `call`（接收者从 `HeapArray` 换成 `Value`——
  `IndexAccessorAt` 问的是那个值，光有元素那一段问不出来）；引擎那一侧数组游标（`vm.xl.md`
  的 `DoIterNext`）与语言层的 `SpreadInto` 照**同一句判据**补齐（`for..of` / `[...a]` /
  解构全都走那条引擎迭代器）。**一条旧账当场到期**：`stdlib/round721/p721a-b03`
  （第 721 轮登记的「展开与 `Array.from` 读不到下标访问器」）转绿，指令已按规矩删掉。
- **顺手收窄**（`runtime/round769/r769g-01`）：第 746 轮那条「冻结的数组 `sort` 要抛」
  写得**太宽**——它不问**有没有东西可写**。0 / 1 格的数组 `sort` 一次都不移元素，实测
  `Object.freeze([1]).sort()` 与 `Object.freeze([]).sort()` 在 Node 里都**不抛**
  （两格及以上一律抛，`p746d-d01` 钉着的正是它）⇒ 判据补上「`length > 1` 才抛」。
- **新登三条**（按规矩带 `xl:why` 进语料）：
  ① `runtime/round769/r769f-01`——**写回**那一半本轮**没有动**：往一个只有 getter 的下标写，
  JS 抛 `TypeError`（`reverse` / `sort` / `copyWithin` / `fill` / `shift` / `unshift` / `splice`），
  本仓写进元素区、**一声不响**；读路径这一轮收了，写路径要另一轮（`sort` 那一档还要连带
  「读得到的值与写得下去的值是两面」）。
  ② `runtime/round769/r769a-03`——`findLast(undefined)` 该抛 `TypeError`、本仓抛笼统的 `Error`。
  ③ `stdlib/round769/r769b-01`——`Object.getOwnPropertyDescriptor(1, "x")` 在 JS 里先把原始值
  `ToObject`（给 `undefined`）而本仓抛；`Object.getOwnPropertyDescriptors(null)` 抛错了族。
  ②③**同一个根**（内建实参校验那一族抛的是 `Error` 而不是 `TypeError`），留作下一轮的入口。
- **守卫**（这一轮量下来本来全对、收进语料）：数组的**洞**在复制族 / 查找族 / `reduce` /
  `Object.keys` 上的口径（复制族保留洞、`GetAt` 对洞给 `undefined`）；访问器下标的**定义与描述符**
  （`get` / `enumerable` / `configurable`、`Object.keys` 与 `delete`、`length` 跟着长）；
  **属性描述符那一族**（`getOwnPropertyDescriptors` 的读回、`__defineGetter__` / `__lookupGetter__`、
  `defineProperties` 的「没写的字段不改」、`freeze` / `seal` / `preventExtensions` 三档）；
  **函数对象与调用形态**（`bind` 的 `length` / `name` / `new`、`call` / `apply` 的接收者与
  原始值那一档、成员方法的名字推导、函数自己的 `prototype` / `length` 描述符）；
  **异常出口与循环绑定**（`finally` 里 `return` / `break` / `continue` 的次序、`try` 里抛 +
  `finally` 里抛、`let` 每轮一份而 `var` 只有一份、`for..of` / `for..in` 各一份）。
- 用例：`runtime/round769` 九条 + `stdlib/round769` 四条（**10 条通过、3 条登记**）。
  五类 7869 / 8257 → **7880 / 8270**、blocked 264（没动）、differ 124 → 126（+3 新登）、
  bad 0、regressions 0、moved 0，加权 **95.6% → 95.5%**（登记缺口的账，不是回归）。
  八道门全绿；runtime:check 243 条、runtime:cli 79 份一致。

### 第 768 轮：`Map` / `Set` 的 `forEach`——**第二格 `thisArg` 没人接**

**一句话**：这一轮的普查面是**字符串下标族 / 数字字面量 / 转义 / `Math` / `Object` 取值族 /
getter 抛异常 / `Symbol.toPrimitive` / `Array.from` / `splice` 的洞**——**收掉一格**
（`Map` / `Set` 的 `forEach` 第二格），其余十条量下来的形状**本来全对**，收进语料当守卫。

- **收掉的那一格**（`stdlib/round768/r768a-01`）：JS 的签名是 `forEach(回调, thisArg)`，
  而本仓两条支都把接收者**写死成 `undefined`** ⇒
  `m.forEach(function () { this.tag }, holder)` 里 `this.tag` 给 `undefined`、
  再参与运算就是 **`NaN`**（**静默错值**：一句异常都没有，看起来像「回调里的 `this` 就是这样」）。
  改法两处**同一句**（`Map.forEach` / `Set.forEach`）：接收者取「有第二格就用它」。
  **不装箱**那一档与数组那一族**同一条口径**（`stdlib/round758/p758a-02-map-thisarg-not-boxed`
  登着的那条差）——两处一起改才有意义，所以这一轮只接线、不顺手改口径。
- **这一轮量下来的十条（本来全对，收进语料）**：
  ① **字符串下标族**的三条支口径（`slice` 收负数、`substring` **不收**且会交换起终点、`at` 越界给
  `undefined` 而 `charAt` 给空串、`charCodeAt` 越界给 `NaN` 而 `codePointAt` 给 `undefined`）；
  ② **数字字面量**六种写法与 `Number("0b1010")` / `parseInt("0b1010")` 那一对（前者按二进制、
  后者只认 `0x`）；③ **转义**（`\u0041` 一格、`\u{1F600}` **两格**码元、行尾反斜杠续行不占格、
  模板里同一批）；④ **`Math`** 的半数取整（负数是向正无穷）、空实参的 `±Infinity`、
  `max(0, -0)` 用 `1 / 结果` 看正负零、`sign(-0)` 给 `-0`；
  ⑤ **`Object` 取值族**在字符串 / 数字 / `null` / 类数组上四档（`null` 那三格抛 `TypeError`）；
  ⑥ **getter 抛异常**时三条取值路各走到哪一步（`Object.keys` **一次 getter 都不进**）；
  ⑦ **`Symbol.toPrimitive` / `valueOf` / `toString`** 三档的优先级与 `hint`；
  ⑧ **`Array.from`** 的类数组 / 只有 `length` / 可迭代物三条来路；
  ⑨ **`splice` / `slice` / `concat`** 的负数参数与**洞**（前两者保留洞、`concat` 也是）；
  ⑩ 以及上面那十条里的其余分档。
- **两处探针自己不合法**（按规矩不进矩阵）：`Object.keys(null)` 与 `{ ...抛异常的 getter }`
  在 Node 里当场炸（**裁判都跑不动**），改写成 `try` 包住之后才进语料；
  `constructor(public c: number)` 那种**参数属性** Node 的类型擦除不认（`SyntaxError`），
  改成显式赋值。
- 语料 **+10 条**（全是 `stdlib/round768`；**10 条全过**），
  五类 **7859 / 8247 → 7869 / 8257**、`blocked 264`（没动）、`differ 124`（没动）、
  `bad` 仍 **0**、`regressions` **0**、`moved` 0、`newlyPassing` 0，加权 **95.6%**。

### 第 767 轮：`Date` 那一族的**两个入口**——无实参要问时钟、`Date` 实参要拷时刻

**一句话**：这一轮的普查面是**类静态那一侧 / 错误家族 / `for..in` / 可选 `catch` 绑定**
与**数组的洞 / 属性继承 / `instanceof` / 标签模板**；量出四条根，**收掉两条**
（都在 `Date` 上），另**新登两条**（各是一条独立的根）。

- **① `new Date()` 给死 `0`**（`stdlib/round767/r767a-01`）：JS 的 `new Date()` 是「现在」，
  而这一族**本来就有那条通道**——`Date.now()` 走的就是 `ClockNow`（那一号按设计由宿主回答）。
  原来构造那一支**没接上去** ⇒ `new Date().getFullYear()` 给 1970、`new Date().getTime() > 0` 给假
  ——**静默错值**，而同一台机器上 `Date.now()` 明明是对的。**不新开能力号**：
  `ClockNow` 就是那一号，这里只是**同一个号多一个调用点**（宿主要是不接，报的话与
  `Date.now()` 一字不差）；没有调用通道那一档照旧给 `0`（**不做 ≠ 换个行为**）。
- **② `new Date(另一个 Date)` 响亮地抛**（同上）：它原来把对象直接落进「毫秒数」那一支 ⇒
  `unimplemented: new Date(x) needs a number of milliseconds or an ISO string`。
  JS 的口径是先把单个实参 `ToPrimitive(hint "string")`；而本仓的 `Date.prototype.toString`
  是**我们自己按 UTC 渲染的**、`DateParseUnits` 只认 ISO 子集 ⇒ 拿自己印出来的文本再解析
  只会得到 `NaN`。**时刻的唯一来源就是那一格**，所以 `Date` 实参那一档**直接读它**
  （`new Date(d).getTime() === d.getTime()`，与 Node 一致），其余对象照旧走 `ToPrimitive`。
- **新登的一条：`yield*` 的 `throw` 不转交**（`runtime/round767/r767b-01`）：
  外层挂在 `yield*` 上时，`it.throw(e)` 在 JS 里要**转给被委托那个迭代器** ⇒ 内层 `catch`
  接得住；本仓把这一抛留在**外层帧**上展开（内层的帧不在栈上、处理点被留着但落不到）
  ⇒ 内层 `catch` **一次都不跑**、异常直接从 `it.throw()` 冒出去。**第 766 轮改好的是
  「同一个生成器自己那一层」**（`runtime/round766/001-throw-into-generator` 四种排版全过），
  跨生成器这一档要的是**在挂起点先把这一抛转交出去**（与 `.next()` 那条对称）——
  那是降级层的一条新路（认得出当前挂起点是不是 `yield*`、是就调它的 `throw`），先如实登记。
- **新登的另一条：`Function.prototype[Symbol.hasInstance]` 那一格是空的**
  （`stdlib/round767/r767b-01`）：JS 里它是**普通 `instanceof` 的正身**，所以每个函数 / 类
  都取得到；本仓没装 ⇒ `typeof C[Symbol.hasInstance]` 给 `"undefined"`、
  直接调它报 `cannot call a non-closure value`（听起来像「调用写错了」——
  与第 761 轮 `console.count` 同一副面孔）。**`instanceof` 本身照旧是对的**
  （引擎先问那一格、问不到才回落原型链）。**为什么只登记不收**：装上之后
  **每一次 `instanceof` 的右边都会先命中它**，而内建构造函数（`Array` / `Date` …）是
  **宿主引用、没有属性表**，`this.prototype` 在它们身上读不出来 ⇒ 那一格得转而问
  `ConstructorProtos` 那张登记表。**不是补一格属性，是给 `instanceof` 换入口**。
- **两处量过、按既有口径不登记**：① **内建原型上自有属性名的次序**逐个家族都不一样
  （`Array.prototype` 的 `at,concat,…` 与 V8 的插入序不同）——那是**安装次序**，
  既有用例（`runtime/round733/p733a-a04`）本来就**逐个 `typeof` 查、不比次序**；
  ② `Object.getOwnPropertyNames(new Date())`：Node 给 `[]`、本仓给 `["__t"]`
  （时刻只有那一格可放，`DateCtor` 那一段写着），新用例里**明写不量它**。
- **另有一条量过、同一台机器上本来就不同**：`new Date(2020, 0, 2)` 与
  `Date.UTC(...)` 那一对——本仓**本地时间就是 UTC**（写在明处），UTC+8 的机器上两边差一个偏移
  （已登在 `stdlib/date/042-r676-std-date-local-time` 那一条上）。
- 语料 **+12 条**（`runtime/round767` 7 条 + `stdlib/round767` 5 条；**10 条通过**、2 条登记），
  五类 **7849 / 8235 → 7859 / 8247**、`blocked 264`（没动）、`differ 122 → 124`（+2 新登）、
  `bad` 仍 **0**、`regressions` **0**、`moved` 0、`newlyPassing` 0，加权 **95.6%**。

### 第 766 轮：**展开时挑处理点按帧的层深**——生成器里 `throw` 进去的 `catch` / `finally` 一声不响

**一句话**：这一轮的普查从**数组 / 字符串 / 数字的方法面**扫到**类与访问器 / 反射 / 符号协议**，
再扫到**承诺那一族**——12 条探针只有一条红（那是早已登记的 `RegExp` 那族），
可换到**生成器注入**与**承诺**两块之后，**四条根**当场露出来；四条一起收，另新登一条。

- **① `DoThrow` 挑的是「谁后压进这一摞」，不是「谁的帧更靠里」**（判据
  `exec/iterators/probe700-i-t03`，**这一条旧台账当场转绿**）：

  ```ts
  function* g() { try { yield 1; } catch (e) { console.log("caught"); } }
  const it = g();
  it.next();                         // ← 生成器那一帧的处理点在这里压进来（深度 1）
  try { it.throw(new Error("x")); }  // ← **外层的 try** 在这里压进来（压在它上面，深度 0）
  catch (e) { console.log("escaped"); }
  ```

  Node 打 `caught`，本仓打 `escaped`——生成器体里那句 `catch` **一次都不跑**，
  异常直接从 `it.throw()` 那一句冒出去。`try { yield 1 } finally { cleanup() }`
  那一档的症状更难看：**清理一声不响**（判据 `runtime/round766/001-throw-into-generator` 四种排版一起钉）。
  **根子是挂起的帧恢复时压在别人上面，而它的处理点是更早压进这一摞的** ⇒
  数组次序与层深次序相反。**改法是两趟**：第一趟按 `DepthOfFrame` 挑层深最大的一条
  （同一帧上叠了几层 `try` 时取更靠后的那一条 = 更靠里），第二趟把落点取走、把死掉的扔掉、
  **其余原样留着**——留着的那些正是外层还开着的 `try`，`finally` 跑完 `throw saved`
  那一步要找的就是它们。**`await` 那一族是同一个形状**（帧被 `await` 摘下去时，
  调用者在它挂起之后同样可能又进了新的 `try`），所以这一处改动把两条路一起管住了
  （`runtime/round766/r766a-03` 三档一起钉）。
- **② `ToPrimitive` 给不出原始值时抛的是普通 `Error`**（`stdlib/round766/001-toprimitive-typeerror`）：
  JS 抛 `TypeError`（`Cannot convert object to a primitive value`），本仓抛普通 `Error`
  ⇒ `catch (e) { e instanceof TypeError }` 那一档**分不出来**。两处落点
  （`Symbol.toPrimitive` 给了对象、普通那两步都没给原始值）一起改成宿主 `TypeError`——
  `Guard` 按宿主异常的类折成 `ErrorKindType`、语言层再翻成脚本里的 `TypeError`
  （与第 713 轮 `in` 那一格同一个机关）。
- **③ `Promise.race` 第一个结清的是拒绝时，结果承诺照样被兑现**（`stdlib/round766/r766a-08`）：
  `race` 原来按 `wants = 2` 调度（两档都认、回调照跑），而它的回调只会**兑现**结果承诺 ⇒
  `Promise.race([Promise.reject(e), Promise.resolve(1)])` 本仓**什么都不打**（Node 打 `e`）——
  **静默错值**。改成 `wants = 0`：兑现那一档跑 `PromiseRaceStep`，
  拒绝那一档由引擎「没认这一档」那条路把**它的原因**拒绝给结果承诺。
- **④ `.finally(cb)` 丢掉回调返回的那份承诺**（`stdlib/round766/r766a-09`）：规范里
  `p.finally(cb)` 是 `then(v => Promise.resolve(cb()).then(() => v))` 拼出来的 ⇒
  回调**返回的承诺被拒绝**时结果承诺要跟着拒绝，本仓原来只把回调的返回值丢掉 ⇒
  `Promise.resolve(1).finally(() => Promise.reject(e)).catch(f)` 里那个 `f` **一声不响**。
  改法是把那一跳挂**回调返回的那份承诺**上、只认兑现那一档（它兑现 ⇒ 照常传源那一档；
  它被拒绝 ⇒ 引擎把它的原因拒绝给结果）；回调没返回承诺时照旧一个纯微任务那一跳。
- **新登的一条**（`stdlib/round766/r766a-07`）：**`.finally` 的链与另一条链谁先**——
  Node 给 `04 fin` 在 `09 keep` 之前，本仓给 `09 keep` 在 `04 fin` 之前（本仓**早一跳**）。
  **根子**：规范里「用一份承诺去解决另一个承诺」是**单独一次作业**
  （`NewPromiseResolveThenableJob`），传值那一档要**两跳**；本仓第 620 轮正是把它
  **缩到一跳**才对上 `c371-stdlib-promise-finally-passthrough` 的行序
  ⇒ 同一个模型在两格上各对一半。**要收它得让那一跳真的走 thenable 采纳那条路**，
  不是把跳数改成 2（改回两跳当场把第 620 轮那一格弄红）——
  这条边界本来就写在明处（`promise.xl.md` 的 `PromiseFinally` 与 `tests/runtime/check.mjs`
  第 8198 行「次序那一格另外说」），这一轮把它**量成一条用例**。
- **另有一条量过、写法不改**：`r766b-12` 的两种排版这一轮也转绿了（同一个 ① 的根）。
- 语料 **+14 条**（`runtime/round766` 5 条 + `stdlib/round766` 9 条；**13 条通过**、1 条登记），
  五类 **7835 / 8221 → 7849 / 8235**、`blocked 264`（没动）、`differ 122`（**+1 新登、-1 转绿**）、
  `bad` 仍 **0**、`regressions` **0**、`moved` 0、`newlyPassing` 0，加权 **95.6%**。

### 第 765 轮：`console.dir` 的 options——**第二格不是第二个要印的实参**

**一句话**：第 735 轮把九个名字并成「一份实现」，代价在 `dir` 上露出来——
它那一族的**第二格是 options**，而共用一份实现让这个差别**看不见**。

- **收掉的两格**（判据 `stdlib/round765/r765b-01`）：
  ① `console.dir({a:1}, {depth:0})` 印成 **`{ a: 1 } { depth: 0 }`**（Node 印 `{ a: 1 }`）
  ——**静默错值**，读起来像「它把两个都印了」；收法是量 options 的那几句
  **只接在 `dir` 这一支上**（别的八个名字的第二格就是第二个实参，不能一起改）；
  ② `depth` **要一路带下去**：`InspectValue` 收了上限，可**两道递归**
  （`InspectArrayBody` / `InspectObjectBody`）**没往下传** ⇒ 每一层都回落到默认的 `2`，
  `{depth:0}` 照样把整棵树印出来。**这一格是这一轮实测当场红的**——
  第一版只改了 `InspectValue` 里的四个 `if`，输出**一个字都没变**（陷阱写在下面）。
- **这一轮的陷阱写下来**（查了三轮才认出来）：一个「上限」参数**只要有一个递归点忘了传，
  它就在那一层悄悄失效**——而症状是「这个功能好像没做」（异常、日志、报错一个都没有）。
  所以那两格的说明里现在明写着「它自己不用，是**传给下一层**的」。
- **`depth: null` 是不设上限**：这一层用 `1 << 20` 表示——不用 `Infinity`（那是浮点，
  而这一格是 `int`）；**环照旧由深度上限兜住**（抬到一百万只是「比任何真实对象都深」，
  不是把兜底拆掉）。**`Date` 不收**（它是叶子，Node 实测）。
  `Map` / `Set` 两支、`depth: 1` / `2` / `null` 四档一起进语料。
- **`console.table` 是新登记的一格**（`stdlib/round765/r765b-02`，`xl:want differ`）：
  Node 画的是**框线表格**（`┌─┬─┐` 那一套，列宽按内容算、键名当列名、多出来的列叫 `Values`），
  而本仓印的是 `[ 1, 2, 3 ]`。**为什么只登记不收**：它要的是一整份表格渲染器
  （列宽测量、键的并集、`table(obj, keys)` 那第二格），**不是「补一格属性」**——
  排在它后面的顺序（`time` 那一族故意不做 → `table` → `trace` 要真帧栈）写在那一条的 `xl:why` 里。
- **一条没进语料的探针**（**用例自己不合法**）：`const other: any = {}; other.log("x")`
  在 Node 里当场 `TypeError: other.log is not a function`（`log` 是 `console` 自己的方法）
  ——裁判都跑不动，按规矩不进矩阵。
- 语料 **+2 条**（`stdlib/round765`：`r765b-01` 通过、`r765b-02` 登记缺口）。
  五类 **7834 / 8219 → 7835 / 8221**、`blocked 264`（没动）、`differ 121 → 122`（+1 新登）、
  `bad` 仍 **0**、`regressions` **0**、`newlyPassing` 0，加权 **95.6%**。

### 第 764 轮：`FormatConsoleLine` 那两格——`%c` **消耗实参**、`%j` 是 `JSON.stringify`

**一句话**：第 763 轮收 `group` 那一族时顺手钉了格式串，**当场量出第 763 轮自己的
探针量错了**——`console.log("a", "%s", "x")` 在 Node 里印 `a %s x`：
**格式串只有落在第一个实参上才生效**（那是 `console.log` 外面那一层的规矩，
不是 `util.format` 的）。这一轮把那一句量正之后，`FormatConsoleLine` 里**两格当场红**。

- **`%c` 消耗一个实参、自己换成空串**：原来它写在 `%%` 旁边（注释写着「不消耗实参」）——
  于是 `console.log("%c", "css")` 给 **`" css"`**（Node 给**空行**）、
  `console.log("%c%s", "css", "x")` 给 `"css x"`（Node 给 `"x"`）、
  `console.log(" %c", "css")` 给 `"  css"`（Node 给 `" "`）。
  修法是把它并进「消耗实参的说明符」那一列，**换出去的是空串**。
- **`%j` 一次都不换**（原来那一格写着「没做」，还写着「**要做**」）：
  它是 `JSON.stringify`——`console.log("%j", { b: 1 })` 给 `'{"b":1}'`
  （本仓给 `"%j { b: 1 }"`）、`console.log("%j", "s")` 给 `'"s"'`。
  **给不出字符串的那几档印的是 `"undefined"`**（`undefined` / 函数 / 符号，**实测**）——
  所以 `JsonText` 的 `null`（不可序列化）**回落成 `"undefined"`**。
- **量错的原因写在明处**（这一轮真正的教训）：第 763 轮的探针把格式串放在了
  **第二个实参**上（`console.log("01", "%s-%d", 7)`），于是「Node 什么都不换」
  被当成了「这一层也不该换」——而真相是那一趟根本没进格式化。
  所以这一轮**两条都收进语料**：`r764b-01` 钉「第一个实参是格式串时每一格都换」、
  `r764b-02` 钉「不是第一个就一个都不换」。
- **`assert` 的消息那一趟同源**（第 762 轮抽出来的那一格）：`r764c-01` 把 `%c` / `%j`
  在 `Assertion failed: ` 那一行上也钉住。**接不住的一份写在用例里**：
  `console.assert(false, 1, "x")` 要拿**渲染后那一行**走正则（Node 是这样判前缀的），
  而这一层没有正则 ⇒ 探针把它删掉、如实留在那一条的 `xl:note` 里。
- 语料 **+4 条**（`stdlib/round764`：`r764b-01` / `b02` / `c01` 三条新的，
  加第 763 轮那条`r763a-04` 的标题与说明**量正**——它原来把自己读成了「%s 后面还有说明符」）。
  五类 **7831 / 8216 → 7834 / 8219**、`blocked 264`（没动）、`differ 121`（没动）、
  `bad` 仍 **0**、`regressions` **0**、`newlyPassing` 0，加权 **95.6%**。

### 第 763 轮：`console.group` 那一族——缩进落在**每一行**上，所以出口收成一格

**一句话**：第 761 轮量出来的十五个缺名字里，`group` / `groupCollapsed` / `groupEnd`
三格被写在「要先有**缩进状态**，而缩进落在**每一行**上（不只 `log`）」那一档；
这一轮把那一档收了——收法不是「在 `log` 那一支里加一句」，而是**先把这一族的出口收成一格**。

- **出口收成 `ConsoleWriteLine`**（缩进 + 一次调用一行）：`log` / `error` / `warn` / `info` /
  `debug` / `dir` / `dirxml` / `table` / `count` / `countReset` / `assert` **十一支**
  共用它——**十一个调用点一起**跟着 `group` 动。在每一支里各写一句 `ConsoleIndent`
  就是**十一处会漂的答案**（第 307 / 312 / 320 轮各踩过一次同一个形状）。
- **状态挂在谁身上**（**这一轮在这里红过一次**）：第一版与 `ConsoleCount` 一样挂在
  **调用时的接收者**（`self`）上——普查当场红了一格（`r763b-01` 第 3 行）：
  `const g = console.group; g("x")` 在 Node 里**照样进一级**（紧接着的 `console.log`
  印两格空格），也就是说 Node 的 `indentLevel` 长在**模块级那个 `Console` 实例**上、
  **与 `this` 无关**。改成「先取全局那一格 `console`」（`ConsoleGroupOwner`）之后就对了。
- **同一副面孔在 `count` 那一族**（**顺带收掉的一格**，`r763c-01`）：`const c = console.count;
  c("k"); c("k")` 在 Node 里印 `k: 1` / `k: 2`，本仓原来印 `k: 2` 之后**回到 `k: 1`**
  ——解绑调用时接收者是 `undefined`，两张计数表各建一份。**静默错值**：一句异常都没有，
  症状与「计数没做」**一字不差**。收法与 `group` 同一条（共用那个 holder）。
- **实测的三格口径**（都写进 `ConsoleGroup` 那一段）：`group()` **什么都不印**、
  只进一级；`groupEnd()` 在 `0` 上**静默**（不抛、也不变成负数）；
  `groupCollapsed` 在**这一层（非 TTY）**与 `group` **逐字节相同**——所以三格共用一份实现，
  但**三个号、三个名字**（`Object.keys(console)` 与 `.name` / `.length` 都按名字走）。
- **标签那一行的渲染与 `log` 同一份**（走 `FormatConsoleLine`）：形参**不消耗** `%` 说明符
  （`console.group("%s-%d", 7)` 在 Node 里印 `7-%d`——与 `util.format` 那条怪口径一致），
  实测把它一起钉住了（`r763a-03` / `r763a-04`）。
- **顺带确认本来就是对的那一条**（`r763a-04`，**4 条里的 1 条**）：
  `%s` 后面**没有实参可消耗**时说明符**原样留着**（`console.log("%s-%d", 7)` 给 `7-%d`）
  ——`FormatConsoleLine` 早就照 Node 的口径写着，这一轮把它钉进语料当守卫。
- **三格的号是 `316` / `317` / `318`**，**只加在 `BuiltinSlots` 那一句上**：
  它们是「脚本直接调」的普通内建，**不进** `helpers` 那张「降级层会发的号」的表
  （那一张是给 700 段的家务事用的）——漏登记的症状是 `capability id is out of range: 718`。
- 语料 **+7 条**（`stdlib/round763`：`r763a-01` … `a04`、`r763b-01` / `b02`、`r763c-01`；
  **7 条全通过**）。台账 `stdlib/round761/002-console-names-differ` 那一行跟着更新（缺的名字 **15 → 11**、
  键数 **10 → 13**）。五类 **7824 / 8209 → 7831 / 8216**、`blocked 264`（没动）、
  `differ 121`（没动）、`bad` 仍 **0**、`regressions` **0**、`newlyPassing` 0，
  加权 **95.6%**。

### 第 762 轮：`console.assert`——把渲染那一趟抽成 `FormatConsoleLine`

**一句话**：第 761 轮把 `console` 的缺口量清之后，`assert` 是**代价最小的一格**——
条件为真一声不响、为假往 **stderr** 印一行，渲染那一趟与 `log` **完全一样**。
差的只是「读真假 + 挑流 + 固定前缀」，所以先把那一趟**抽出来**再接线。

- **抽出来的那一格**（`FormatConsoleLine`）：`%s` / `%d` / `%i` / `%f` / `%o` / `%O` 消耗实参、
  `%c` 与 `%%` 不消耗、字符串实参**原样**、其余走 `util.inspect`——**同一件事不写第二份**
  （第 735 轮它写在 `log` 那一支里面，那时只有一处调用方；`assert` 一来就有了第二处）。
- **前缀那两格是实测的**（**这一轮在这里红过一次**）：`Assertion failed` 后面
  **只有在一个字符串实参跟随时才补 `": "`**——`console.assert(false, { a: 1 })` 在 Node 里是
  `Assertion failed { a: 1 }`（**没有冒号**）、`console.assert(false, 1)` 是 `Assertion failed 1`，
  而 `console.assert(false, "s", { a: 1 })` 是 `Assertion failed: s { a: 1 }`。
  第一版写成「拼一个前缀再走渲染」⇒ 前两格各多一个冒号（**判据当场点出来**）。
- **新登记的缺口**（`runtime/round762/005-typeof-then-prefix-blocked`）：`typeof void 0` / `typeof !0`
  **整份文件进不来**（降级期报 `name is not a local or a capture: typeof`），而
  **`typeof -1` 一直是好的**——分界是「第二个词是**前缀词**（`void` / `!`）还是**符号**（`-` / `+`）」。
  产物那一侧量到的是：那个 `typeof` **没升成 `Keyword`**、停在 `Identifier` 上，
  于是 `projectUnary` 按 `op` 找运算符那一格找不到它、把它当**操作数**投了出去。
  根与第 550 轮 `in` / `instanceof` 停在 `Identifier` 是**同一个**（重组深度那道硬界 +
  `KeywordCloseRule` 排在最后），改它要连带重跑 1414 份 token 语料 ⇒ **先如实登记**。
- 语料 **+6 条**（`runtime/round762` 5 条 + `stdlib/round762` 1 条；**5 条通过**、
  1 条登记缺口）。五类 **7819 / 8203 → 7824 / 8209**、`blocked 263 → 264`（+1 新登）、
  `differ 121`（没动）、`bad` 仍 **0**、`regressions` **0**、`moved` 0、`newlyPassing` 0，
  加权 **95.6%**。

### 第 761 轮：`console.count` / `countReset`——那一族里唯一有状态的一对

**一句话**：`console` 那一族第 735 轮补到九个名字（`log` / `error` / `warn` / `info` /
`debug` / `dir` / `dirxml` / `table`），**共用的是一份「渲染 + 一次调用一行」的实现**；
而 `count` / `countReset` **根本没挂**——`console.count()` 报
`cannot call a non-closure value`（**那句话听起来像「调用写错了」**，其实是那一格没人挂）。

- **形状照 Node 实测写**（判据 `stdlib/round761/001-console-count-and-reset`）：标签缺省是 `"default"`
  （`console.count()` 与 `console.count("default")` 是**同一个计数**）、走 stdout、
  行文本是 `标签: 次数`、`countReset(标签)` 只清那一个、`countReset()` 清 `default`，
  **没数过的标签不报错**（Node 只在 TTY 上打一句 `Warning`，而这一层没有 TTY）。
- **状态放在哪**（这一层唯一的取舍）：`InvokeGlobal` **手里只有 `protos`、没有模块级可变量**
  （与 `Symbol.for` 那张注册表同一个理由），所以计数表**挂在接收者自己的隐藏属性上**——
  规范里 `countMap` 本来就长在那个 `Console` 实例上，而 `console.count()` 的 `this` 正是它。
- **故意不做的三格**：`time` / `timeEnd` / `timeLog` 印的是**墙钟毫秒**（`t: 0.008ms`），
  逐字节不可比 ⇒ 判据立不住，这一层**不假装能复现它**（写在 `ConsoleCount` 那一段里）。
- **还缺的十五个名字如实登记**（`stdlib/round761/002-console-names-differ`）：`assert` 只差「读真假 + 挑流 +
  固定前缀」那一小段（**下一轮可收**）、`group` 那一族要**缩进状态**（缩进落在每一行上，
  不只 `log`）、`trace` 要真帧栈（与 `Error.stack` 同一条根）、
  `_stdout` / `_times` 那一族是 Node 自己的内部件、**不在规范里**。
- 语料 **+6 条**（`runtime/round761` 4 条 + `stdlib/round761` 2 条；**5 条当场通过**、
  1 条登记缺口）。五类 **7814 / 8197 → 7819 / 8203**、`blocked 263`（**没动**）、
  `differ 120 → 121`、`bad` 仍 **0**、`regressions` **0**、`moved` 0、`newlyPassing` **0**，
  加权 **95.6%**。

### 第 760 轮：`concat` 是**通用**的——两条支都没有问 `IsConcatSpreadable`

**一句话**：`Array.prototype.concat` 在规范里对**接收者自己**与**每一个实参**都问一句
`IsConcatSpreadable`（先看 `Symbol.isConcatSpreadable`、再看「是不是数组」），
而本仓**长着两条互不相干的支**——一条只认数组接收者、一条类数组接收者——
**两条都没问那一句**：两个朝向各错一半，而且**都是静默错值**。

- **这一轮普查当场红的四条**（判据 `runtime/round760/001-concat-generic-and-spreadable`）：
  `Array.prototype.concat.call(1, 2)` 报「this method needs an array receiver」
  （Node 给 `[1, 2]`）、`concat.call({ 0: "a", length: 1 }, [2])` 也抛
  （Node 给 `[{0:"a",length:1}, 2]`）、
  `[0].concat({ [Symbol.isConcatSpreadable]: true, length: 2, 0: "x", 1: "y" })`
  给 `[0, {…}]`（Node 给 `[0, "x", "y"]`）、
  `[0].concat(Object.assign([1, 2], { [Symbol.isConcatSpreadable]: false }))`
  给 `[0, 1, 2]`（Node 给 `[0, [1, 2]]`）。
- **分成两条路的代价正好是这里**：`IsConcatSpreadable` 问的是**每一个元素**，
  而「接收者自己」也是**一个元素**——两条路各写一遍，漏掉的就是「谁去问那一句」。
  收法是**两条并成一条**（`ArrayConcat`），接收者与实参走**同一个** `spreads` 判据：
  先 `Symbol.isConcatSpreadable`（`protos.WellKnownSymbols` 那张表，**表没装就整档跳过**），
  再退到「`Tag === Array`」。
- **顺带把原型那一格补回来**：并成一条之后「原型跟着接收者走」也在**一处**了
  （数组接收者继承它的原型、其余给 `protos.Array`——与 `slice` / `join` 那两处类数组分支同一口径）。
- **两处量出来但没顺手改的**（都登在明处）：
  ① `typeof f.bind(null).prototype` 在 Node 里是 `"undefined"`、本仓给 `"object"`
  ——第 753 轮为了让 `new (F.bind(null))() instanceof F` 为真，把**目标的 `prototype` 抄到了
  绑定对象自己身上**（那一轮自己写在明处）。要收得让 `vm.xl.md` 的 `CreateInstance`
  认得「被调者是不是绑定函数」再转交目标的 `prototype`——那是**每一次 `new` 都要过的路**
  （与第 750 轮 `a.length = "2"` 同一条取舍），这一轮只登记（`runtime/round760/004-bound-function-prototype-differ`）。
  ② `String.prototype` 少三格（`match` / `search` / `matchAll`，`getOwnPropertyNames` 给 49、Node 给 52）
  ——它们不是「漏挂三个名字」：三条路都要 `RegExp` 整族，而降级层**连正则字面量都不收**
  （同一批的两条候选报的就是 `unimplemented: expression RegularExpressionLiteral`），
  与 `stdlib/string/136` / `147` 同一条根（`stdlib/round760/001-string-regexp-methods-differ`）。
- **台账**：`stdlib/array/149-concat-spreadable`（第 691 轮登的「`concat` 不认那一位」）
  **转绿、指令已撤**，用例留着当守卫。
- 语料 **+5 条**（`runtime/round760` 4 条 + `stdlib/round760` 1 条；**3 条当场通过**、
  2 条登记缺口）。五类 **7812 / 8192 → 7814 / 8197**、`blocked 263`（**没动**）、
  `differ 118 → 120`、`bad` 仍 **0**、`regressions` **0**、`newlyPassing` **1**，
  加权 **95.6%**（`95.7% → 95.6%` 是两条新登记缺口的账，不是回归）。

### 第 712 轮：`Map` / `Set` 的 `Symbol.iterator` 那一格

**一句话**：`for..of` 一条 `Map` / `Set` 一直是好的，而**显式把那格迭代器取出来自己调**
（`m[Symbol.iterator]()`）报 `cannot call a non-closure value`——**没人往原型那一格挂东西**。

- **两份账本来是同一件事**：语言层的 `GetIterator`（`install.xl.md`）按**协议**走
  （取 `Symbol.iterator` → 调它 → 收 `next()`），引擎那条 `iter_new` / `iter_next`
  只认数组、字符串、生成器。所以 `for (const [k, v] of m)` 走的是**协议路**、一直对；
  而 `m[Symbol.iterator]` 走的是**属性查找**——那一格空着就是 `undefined`。
  这与第 308 轮 `Array.prototype[Symbol.iterator]`、第 341 轮 `Map` / `Set` 的方法搬原型
  **是同一副面孔**：不是「迭代这一套没做」，是**一格没挂**。
- **挂的是已经挂出去的那个号**（**同一件事不写第二份实现**）：JS 里
  `Map.prototype[Symbol.iterator] === Map.prototype.entries`、
  `Set.prototype[Symbol.iterator] === Set.prototype.values`——所以指到 `MapEntries` /
  `SetValues`，键从知名符号那张小表取（符号按句柄比，**只造一次**）。
- **位置是实测撞出来的**（这一轮唯一的坑）：第一版写在 `install.xl.md` 的
  `InstallBuiltins` 里（与 `InstallMapPrototype` 并排，看起来最像「同一件事放一处」），
  而那一句跑在 **`BuildGlobals` 之前**（`tsrun.xl.md` 的顺序是「装库先、求值后」）——
  `protos.WellKnownSymbols` 还是 `0`，取键得 `undefined`，**静默什么都不挂**
  （症状与「没修」一字不差，没有异常、没有日志）。挪到 `BuildGlobals` 里
  `Array.prototype[Symbol.iterator]` 那一处（符号表刚填好）就对了。
- **收掉 4 条台账**（三条是本轮的根、一条是第 711 轮刚登的同族）：
  `exec/round711/p711c-c07`（`typeof (new Map())[Symbol.iterator]`）、
  `exec/round710/p710c-c01` / `runtime/iterators/probe693b-g15`（把迭代器交回来的
  `[键, 值]` 按下标读）、`runtime/iterators/probe694-g18`（`[][Symbol.iterator]().next`
  该是函数——第 711 轮那一处修好之后它一直是过的，台账没撤）。
- **只加 1 条语料**（`exec/round712/p712a-a01`：`Set` 那一半的形状，
  与第 711 轮 `p711c-c07` 成对）。五类 **7212 / 7580 → 7216 / 7581**、
  `differ 101 → 98`、`blocked 267` 没涨、`bad` 0、`regressions` 0、加权 **95.9% → 96.0%**。

### 第 713 轮：`in` 右操作数不是对象时那个 `TypeError`（外加一次**实测回退**）

**收掉的一格**（`exec/expressions/180-in-operator`）：脚本里
`try { "a" in (1 as any) } catch (e) { e.constructor.name }` 在 JS 里给 `"TypeError"`，
本仓**整份文件跑不起来**（退出码 1）、`catch` 一次都不进。

- **两处都得改，少一处都不成**：① 抛的是**普通 `Error`**（该 `TypeError`）；
  ② **没包 `Guard`**——rt 层的裸抛**从 `Run()` 直接冒出去**，脚本的 `try` **接不住**
  （`Guard` 那一段写着这条边界，第 125 轮 `a + b` 量过同一件事）。
  只改 ① 的症状最好认：**前面几行照常打印、`catch` 一次都不进、退出码 1**，
  出错那句话与「还没实现的构造或语言层错误」一起印出来——看起来像「改了个没用的东西」。
  `Guard` 把宿主异常的**类**折成 `ErrorKindType`，语言层再翻成脚本里的 `TypeError`
  （一处翻译点，与 `iter_new` / `iter_next` 一字一字一样）。
- **五类 7216 / 7581 → 7217 / 7581**、`differ 98 → 97`、`blocked 267`（没涨）、
  `bad` 0、`regressions` 0、加权 **96.0%**（两个数都在这一位）。

**试过又当场回退的一处**（账要留在明处）：`it.return(7)` 打在**一次都没跑过**的生成器上，
JS 不执行函数体、当场给 `{ value: 7, done: true }`，本仓给 `{ value: 1, done: false }`
（`runtime/iterators/probe694-g04`，**静默错值**）。收法是给 `HeapGenerator` 添一格
「函数体开始跑过没有」，在 `DoIterNext` 里拦下「没跑过」那一档。
**实测 128 条回归**（`e2e` 那一族生成器流水线一起红）：`DoIterNext` 的 `returns` 那一路
与「正常恢复」**共用同一个入口**，拦下它就把挂起那一档也打断了。
**当场回退、台账没撤**，并把量出来的话写进那一条的 `xl:why`
（要收它得让**恢复那一步**也认得「这次是 return」，那是另一处改动）。
`heap.xl.md` 与 `vm.xl.md` 一个字都没留下——只有这一页与那条 `xl:why` 记着这件事。

### 第 714 轮：`push` / `pop` 的**类数组接收者**（写回那个对象）

**收掉的一族**：`Array.prototype.push.call({ length: 0 }, 1)` 在 JS 里给 **1**（`length` 也变成 1），
本仓报 `cannot add property to a non-extensible object`——**那句话听起来像「对象被冻结了」**，
其实是 `RequireArray` 没认出这不是数组（判据 `stdlib/array/probe2-g10`）。

- **为什么先做这两格**：它们只动**尾部一格 + `length`**——一次 `Set`、一次 `Set(O, "length", …)`，
  不需要分类（`sort` 要比较器、`reverse` / `splice` 要「先读一遍再写一遍」那一套）。
  其余会改接收者的那些照旧响亮地抛、台账里登着（`IsArrayLikeMethod` 那一段写着这条分界）。
- **与只读那一支互斥**：只读那一族（`map` / `filter` / `reduce` …）是**折成快照**再走下游，
  写了快照等于白写——所以新分支的判据是「**接收者不是数组、而这一个号是在改接收者的**」。
- **次序是语义**：`push` **先写元素、后写 `length`**；`pop` **先删那一格、后写 `length`**
  （与规范 `Set(O, ToString(n), v, true)` → `Set(O, "length", …)` 同一条）。
  `length` 为 0 的那一档 **`pop` 不写 `length`**（JS 里 `{ length: 0 }` 上什么都不动）。
- **不可扩展的接收者要抛**（**实测撞到的**）：只写不查的话
  `Object.freeze({ length: 0 })` 上 `push.call` 给 `1`（Node 抛 `TypeError`）——
  JS 那个 `Set(…, true)` 的 `true` 就是「写不下去要抛」，`SetProperty` 却**静默返假**。
- **`call` 为 `null` 时就抛**：写回要走访问器（`{ set length(v) { … } }`），
  少这一句的症状是「静默什么都没写」。
- 语料 **+2 条**（`stdlib/round714/p714a-a01/a02`：元素的落点与 `length` 的走法、
  `pop` 的尾部一格与空那一档、冻结对象那一抛），台账 `probe2-g10` 撤掉。
  五类 **7217 / 7581 → 7220 / 7583**、`differ 97 → 96`、`blocked 267`（没涨）、
  `bad` 0、`regressions` 0、加权 **96.0%**。

### 第 715 轮：数组方法的**类数组接收者**整族（写回那个对象）

第 714 轮只收了 `push` / `pop` 两格（「只动尾部一格 + `length`」），其余会改接收者的
照旧响亮地抛。这一轮把**整族补齐**：`shift` / `unshift` / `reverse` / `fill` /
`copyWithin` / `splice`（判据 `probe2-g11` 的 `reverse`、`probe2-g14` 的 `sort` 就是这么登着的）。

- **收法不是「每格写一遍通用语义」**：下面那一段真实现有一千多行——交换怎么写、
  比较器怎么调、`from` / `to` 的正负下标怎么归一、洞怎么跟着走全在里面，
  照着接收者再写一遍就是**第二份会漂的判据**（第 307 / 312 / 320 轮各踩过一次）。
  新的分支是**折成快照 → 走下面同一段 → 把结果写回 `O`**：`ArrayLikeSnapshot` 折出来的
  是**同构**的（`HeapArray` 表达得了洞），所以「先在快照上跑、再写回去」与「就在 `O` 上跑」
  在值上是同一件事。判据收成一个新方法 `IsArrayLikeWriter`（与只读那一张表**互斥**——
  重叠的话先折快照、再写回快照，写的是快照自己，症状与「没修」一字不差）。
- **四件写回时才露出来的事**（都是实测撞到的）：
  - **尾部多出来的格要删掉**：结果比原来短时（`shift` / `splice` 收了尾巴），
    不删的话那几个值**留在接收者上**——`shift` 之后最后一格还在，**静默错值**；
  - **洞跟着走**：快照里是洞的那一格在接收者上要 `DeleteProperty`（写成 `undefined`
    会把洞变成真值，与 `reverse` / `copyWithin` 写回时同一条）；
  - **写不下去就是 `TypeError`**：JS 这一路全是 `Set(…, true)`，而 `SetProperty`
    对不可扩展的接收者**静默返假**（第 714 轮 `Object.freeze({ length: 0 })` 上 `push.call`
    该抛就是这一格）——上一版那一句 `Extensible` 自查因此并进了写回那一句；
  - **返回接收者的那四格**（`reverse` / `sort` / `fill` / `copyWithin`）：JS 的返回值是
    `O` **本人**，而快照是另一个对象——照搬快照就是把这四格判反（`probe2-g11` 量的正是它）。
- **`failed` 那一格不写回**：脚本抛了 / 预算用尽时下面那一段已经收摊，快照是**半成品**，
  写回去就是把「跑了一半的状态」当成结果（与那九处回调循环同一条纪律）。
- **原始值接收者仍走响亮的那一抛**（写在明处）：JS 里它们先 `ToObject`，而**写回包装对象
  那一步一定失败**（字符串的下标是只读的）⇒ 两边都以 `TypeError` 收场，
  本仓那句话是 `RequireArray` 说的——差额照旧登在台账里，不在这里静默近似。
- **台账 `probe2-g11`（`reverse`）/ `probe2-g14`（`sort`）转绿、已撤**。
- **语料 +15**：6 条钉写回那一族（`stdlib/round715/p715a-a01` … `a06`：元素怎么挪、
  `length` 怎么走、洞与短了的那一档），另 9 条钉**属性枚举次序**那一批
  （`exec/round715/p715b-b01` … `b09`）——整数键在前、派生键按**数值**而不是字典序、
  `-1` / `1.5` 不是整数键、`delete` 之后重新插入排到最后、`JSON.stringify` /
  `Object.values` / `entries` / `getOwnPropertyNames` 与 `Object.keys` **同一次序**。
  这一批 **9 条全 pass**（这一层本来就是对的），用例把它钉住。
- **这一轮新量到、但根已经在台账里的三条**（所以**没有新登记**）：`Reflect` 整族没装
  （`probe703-o-a25` … `a28` 四条登着）、`Array.prototype.toString` 要**现读** `this.join`
  （`140` / `145` 两条登着）、`for..of` 一个长大的 `Map` 看不见新键（`110` 登着）。
- 五类 **7220 / 7583 → 7237 / 7598**、`differ 96 → 94`、`blocked 267`（没涨）、
  `bad` 0、`regressions` 0、加权 **96.0%**。

### 第 716 轮：`Array.prototype.toString` 要**现读** `this.join`

第 193 轮把 `Array.prototype.toString` **指到 `ArrayJoin` 那一格能力号**上
（理由是「JS 的它就是 `join(",")`」）——那句话只对了**一半**：规范里它是
`ToObject(this)` → `Get(O, "join")` → **可调就带 `this = O` 调一次**，
`join` 不可调才转交 `Object.prototype.toString`。指到静态那一格之后，
**在实例上换掉 `join` 没有用**：`a.join = () => "J"` 之后
`String(a)` / `a + ""` / `a.toString()` 一个字都不变
（判据 `stdlib/array/140-array-tostring-custom-join`、`145-array-tostring-join-dynamic`）。

- **它是 `ToPrimitive` 那条路上的一格，不是旁路**：数组的 `ToPrimitive(o, "string")`
  沿原型链找 `toString`，找到的就是它——所以这一处改对，`String(a)` 与 `a + ""`
  **一起**跟着动（**实测**：给实例挂一个自己的 `toString` 时两边本来就跟着走，
  只有 `join` 那一格是死的；第 193 轮那次「`toString` 就是 `join`」的观察正是因为
  `join` 的缺省分隔符恰好是 `,`）。
- **收成一个自己的能力号**（`ArrayToString = 42`，与 `ArrayJoin` 分开）：
  里面走一次 `GetProperty(self, "join")` + `IsCallableValue`，
  可调就 `call(join, self, [])`；**不可调**才转交 `Object.prototype.toString`
  （这一份文件向上 import `globals.xl.md` 会绕出环，所以那一档只认
  「数组 ⇒ `[object Array]`」与「其余 ⇒ 那个对象自己的 `toString`，没有就是
  `[object Object]`」两档，**已知差写在明处**）。
- **它排在 `RequireArray` 前面**：接收者可以是**任何对象**
  （`Array.prototype.toString.call({ join: () => "X" })` 在 JS 里给 `"X"`），
  过一遍 `RequireArray` 会当场抛；`null` / `undefined` 仍按 `RequireArray` 那句话抛 `TypeError`。
- **`call` 为 `null` 时退回旧的静态那一路**（写在明处）：装库期有些地方拿不到调用通道，
  而那时要的正是「就是 `join(",")`」——退回它与第 193 轮一字不差，不把「没有通道」变成一声抛。
- **文末 `InstallArray` 的表里那一格指针跟着改**（`"toString"` 从 `ArrayJoin` 换成 `ArrayToString`）。
- 台账 `140` / `145` **两条转绿、已撤**。语料 **+15 条**（`stdlib/round716/p716a-a01` … `a15`：
  `join` 覆写走的三条路、`call` 到带 `join` 的对象、`join` 当 `this` 用、没有 `join` / `join` 不可调
  两档的转交、原型链上的 `join`、嵌套与空洞的渲染、`toString` 抛出去接得住）。
  普查里 **16 条过了 15 条**，唯一没过的 `p716a-t10`（`Array.prototype.toString.length` / `.name`
  给 `undefined`）量的那个根第 706 轮已经登在台账里（宿主引用那两档没有 `name` / `length`），
  所以**没有新登记**、也没有收进语料。
- 五类 **7237 / 7598 → 7254 / 7613**、`differ 94 → 92`、`blocked 267`（没涨）、
  `bad` 0、`regressions` 0、加权 **96.0%**。

### 第 717 轮：`Reflect` 那一族（13 格，号 `685..697`）

**它原来一格都没有**：降级期就报 `name is not a local or a capture: Reflect`
（判据 `stdlib/object/probe703-o-a25` … `a28` 四条登着——一句话里没有一个字提到「没装」）。
它与 `Proxy` 是同一批「元编程那一层」的构造，本仓一律没有。

- **名单与挂载是同一份约定**：`GlobalNames()` 里加 `"Reflect"`、`BuildGlobals` 里
  造一个普通对象把 13 个方法**隐藏挂上**（`SetHiddenProperty`——JS 里
  `Object.keys(Reflect)` 是 `[]`，与第 709 轮给 `Math` / `JSON` 改的那一格同一条）。
  **两张表按下标一一对齐**（名字与号错一格就是静默换语义，第 275 轮那条纪律）。
- **实现落在 `install.xl.md`**（新方法 `InvokeReflect`）**而不是 `globals.xl.md`**：
  `Reflect.construct` 要走 `ConstructApply`（`new C(...xs)` 的落点），而那一格住在
  `install.xl.md`——依赖方向只允许它 import `globals`，反过来会绕出环。
  分派那一句**必须排在 `id >= 200` 之前**（`685..697` 落在全局段里，
  排在后面就会被 `InvokeGlobal` 接走）。
- **能转交的就转交**（同一个能力号，不写第二份扫描）：`ownKeys` 转给
  `Object.getOwnPropertyNames` + `Object.getOwnPropertySymbols` 再把两份接起来
  （JS 的次序就是这样：整数键在前、其余字符串键按插入次序、符号键最后），
  `getOwnPropertyDescriptor` 转给同名的那一格。其余各走一处现成的助手
  （`GetProperty` / `SetProperty` / `DeleteProperty` / `FindProperty` / `PrototypeOfValue` /
  `RtSetProto` / `IsUnextensible` / `MarkUnextensible` / `DefineOwnFromDescriptor`）。
- **两条纪律**：① **除 `apply` / `construct`，第一个实参必须是对象**（JS 的口径——
  `Reflect.get(1, "x")` 抛，而 `Object.getPrototypeOf(1)` 答得出来：那一族先做 `ToObject`）；
  ② **没有调用通道就响亮地抛**（`get` / `set` 要走访问器、`apply` 要真调）。
- **`Reflect.apply` / `construct` 的实参表**收成两个助手（`ReflectListOf` / `ReflectArrayOf`）：
  JS 里两处走的都是 `CreateListFromArrayLike`（数组、类数组都认），
  长度与每一格仍是 `ArrayLikeLength` / `ArrayLikeAt` 那两个现成的助手。
  `ownKeys` 那一趟**要把新数组挂根**（两趟之间会跑脚本，不挂会被收走）。
- **三处已知差写在明处**（都是「JS 给假 / 本仓给抛」那一类，宁可响也不静默）：
  `defineProperty` 写不下去那一格、`set` 撞上不可写属性那一格、
  以及 `get` 的第三格 `receiver` / `construct` 的第三格 `newTarget`（那两格**给了就抛**）。
- **收掉 6 条台账**：`stdlib/object/probe703-o-a25` … `a28`（`ownKeys` / `get` / `has` /
  `deleteProperty` 四条）之外，`stdlib/globals/059-reflect-basics` 与
  `stdlib/object/probe705-o-b22` 也**一起转绿**（它们量的就是同一格），`blocked 267 → 261`。
- 语料 **+15 条**（`stdlib/round717/p717a-a01` … `a15`）：13 格的形状与边界
  （`ownKeys` 的符号键、`set` 在不可写属性上给假、非对象第一个实参要抛、
  `Reflect` 与 `Object` 两边同一件事两种口径）。
- 五类 **7254 / 7613 → 7275 / 7628**、`blocked 261`、`differ 92`、
  `bad` 0、`regressions` 0、加权 **96.0% → 96.1%**。

### 第 718 轮：`String.prototype` 的 HTML 包装那一族（13 格，号 `136..148`）＋ 接收者那一关

**这一轮把一条台账拆成两半**：`stdlib/string/147-names-string-proto` 原来一行记着
**19 个取不到的名字**，而它们的代价差着数量级——13 个 HTML 包装只要**字符串拼接**，
`match` / `search` / `matchAll` 要 `RegExp` 整族。**记在同一行里读不出「还差多少」**：
能做但没做、与做不了，看起来一样。

- **十三个号、一份实现**（规范的 `CreateHTML`）：`(tag, attribute)` 两张表**按 `id` 查**，
  `anchor`=`a`+`name`、`fontcolor`=`font`+`color`、`fontsize`=`font`+`size`、
  `link`=`a`+`href`，其余九格没有属性。**十三格各写一遍拼接**就是十三份会漂的判据。
- **转义只有一处**：属性值里的 `"` 换成 `&quot;`（`"a".link('x"y')`）。
  **`&` / `<` / `>` 一律不动**——把「看起来更安全」的那一步加上去，答案就与 Node 不同了。
- **属性值缺实参当 `undefined`**（`"a".anchor()` 是 `<a name="undefined">a</a>`）：
  第 700 轮给实参那一族立的口径，这里**照用**。
- **接收者那一段原样搬**（不是过一趟宿主字符串）：落单的代理码元会被换成 `U+FFFD`，
  而 `"\ud800".bold()` 在 JS 里**原样带着那一格**。
- **`trimLeft` / `trimRight` 是别名、不是新实现**：JS 里
  `String.prototype.trimLeft === String.prototype.trimStart` **为真**，所以照抄同一个号
  （另开两个号写第二份实现会让那条判等给假，而两个实现日后一定会漂）。
- **`String.prototype.length` 是 `0`**（三个标志全假，与第 709 轮 `Math.PI` 那八格同一条）
  ——它与 `"abc".length` **不是同一条路**：字符串**值**的 `length` 由码元个数算，不走属性表。

**同一批探针当场量到的第二个根**（判据 `p718a-h05` / `p718b-r01` … `r10`）：
**字符串方法的接收者不是非得是字符串**。`RequireString` 原来只有一句
`self.Tag !== ValueTag.String` 就抛，于是 `String.prototype.bold.call(12)` 报
「this method needs a string receiver」——而 JS 的答案是 `<b>12</b>`。
规范里每个 `String.prototype` 方法都是 `RequireObjectCoercible(this)` 之后 **`ToString(this)`**，
**同一条根盖着三十来个方法**。修法：那一格改成收 `(room, call, protos, table, self)`
并**交出码元**，走的是**实参那一族同一句 `ToString`**（`ToPrimitiveOf` + `JsTextUnits`
——两份转换表一定会漂，而漂出来的正是「接收者」与「实参」两个只差一个字的答案）；
**两处自己抛**：`null` / `undefined`（`RequireObjectCoercible`）与**符号**，
而且**抛的种类一起改对**——原来抛的是普通 `Error`，Node 抛 `TypeError`。
两处调用点（`InvokeString` 与 `String.split` 那条独立的路）一起换。

- **收掉台账**：`stdlib/string/147-names-string-proto` 由 19 个名字改写为 3 个（正则那一族）；
  第 717 轮**忘了撤**的两行（`stdlib/globals/059-reflect-basics`、
  `stdlib/object/probe705-o-b22`）这一轮一起撤掉（它们报的是 `NEWLY-PASSING`）。
- 语料 **+25 条**（`stdlib/round718/p718a-h01` … `h15` 十五格形态与边界、
  `p718b-r01` … `r10` 十格专钉接收者那一关：数值 / 布尔 / 浮点 / 对象 / 包装对象 /
  符号 / `null` / 函数，以及 `split` 那条独立的路）。
- 五类 **7275 / 7628 → 7300 / 7653**、`blocked 261`（没涨）、`differ 92`（没涨）、
  `bad` 0、`regressions` 0、`moved` 0、`newlyPassing` **2**，加权 **96.1%**。

### 第 719 轮：数字那一族的**接收者**与**实参**（`Number` / `Boolean` 的方法组）

这一轮问的是「数字格式化与 `Math` 的边角」——26 条原子探针里**5 条当场红**，
红出来的三个根**一个都不是格式化本身**：格式化的算术借宿主那一份（第 290 轮）
一直是好的，坏的是**它门口那两步**。

- **① `-0` 经 `+` 拼出来是 `"-0"`**（**静默错值**，判据 `p719a-n13` / `p719a-m01`）：
  `parseInt("-0") + ""` 与 `Math.min(0, -0) + ""` 在 Node 里都给 `"0"`，本仓给 `"-0"`。
  根子是**同一句判断有两个落点**：JS 的 `String(-0)` 是 `"0"`，而线形态那一份
  （`NumberToHostText`）必须给 `"-0"`（`Object.is(-0, 0)` 为假，常量池存成 `0` 就是换值）。
  第 290 轮把「JS 那一份」写成了语言层的 `NumberToJsText`，可 `+` 那条路走的是**引擎**的
  `RtAdd` → `TextUnitsOf`，而**引擎 import 不到语言层** ⇒ 引擎那一份给 `"-0"`。
  修法：`NumberToJsText` **搬到 `runtime/host-text.xl.md`**（两份数字文本口径并排住，
  差别只有 `-0` 一格、判断只有一处），`TextUnitsOf` 的 `Float64` 那一支改走它。
  `text.xl.md` 第 114 轮那句「`+` 那条路（要动引擎）留给下一轮」说的正是这一处。
- **② 接收者的类型一次都不问**（**两处静默错值**，判据 `p719a-c01` … `c05`）：
  `Number.prototype.valueOf.call("x")` 给 `"x"`、`Boolean.prototype.toString.call(1)`
  给 `"true"`——Node 两处都抛 `TypeError`。根子在那三格（`valueOf` 两支 + `Boolean.toString`）
  各自只看载荷：`valueOf` **原样把接收者交回去**、`toString` 直接 `AsBool()`。
  修法：按标签判一次（`Int32` / `Float64` / `Bool`——本仓的接收者本来就是**原始值**，
  不装箱），不是的抛 **`TypeError`**；顺带把 `NumericOf` 那一抛的种类也改对
  （`Number.prototype.toFixed.call("1.5", 1)` 原来抛普通 `Error`，Node 抛 `TypeError`）。
- **③ 三格的实参不走 `ToNumber`**（判据 `p719a-n04` / `p719a-n08`）：
  `(1.5).toFixed(null)` / `.toFixed(true)` / `(5).toString("16")` / `(5).toString(10.9)`
  原来一律抛（`NumericOf` 只认数值标签），Node 给 `"2"` / `"1.5"` / `"5"` / `"5"`。
  规范那一步是 `ToIntegerOrInfinity`：**先 `ToNumber` 再向零截断**。修法是把位数与基数
  两格改走**共用那一份** `NumArgOr`（第 702 轮给「可选实参」立的，`array.xl.md`）
  加一句 `Math.trunc`——**不写第二份 `ToNumber`**。
  **`NaN` 故意原样交给宿主**：`(1.5).toFixed(NaN)` 是 `"2"`（`NaN` → 0 位），
  而 `toPrecision(NaN)` 抛 `RangeError`——折成缺省反而会把后一档变成静默错值。
- 语料 **+26 条**（`stdlib/round719/p719a-n01` … `n16`、`p719a-m01` … `m10`）：
  16 条钉格式化（`toFixed` / `toPrecision` / `toExponential` / `toString(radix)` 的
  进位、越界、`ToIntegerOrInfinity`、大数与 `-0`），10 条钉 `Math` 与 `Number` 的边角。
  其中 `p719a-m09`（内建函数的 `name` / `length`）**如实登记为缺口**
  ——与 `p709b-b17` / `b18` 同一条根。
- 五类 **7300 / 7653 → 7325 / 7679**、`blocked 261`（没涨）、`differ 92 → 93`
  （那一条就是 `p719a-m09`，**新登记**的账）、`bad` 0、`regressions` 0、
  `moved` 0、`newlyPassing` 0，加权 **96.1%**。

### 第 720 轮：`Object.setPrototypeOf` 与 `Reflect.setPrototypeOf` 的那三档口径

这一轮的普查（35 条，跨数组 / 对象 / 函数 / `Map` / `Set` / `JSON` / 数字格式化）
只红 4 条，且**全是「整块还没做」**（`JSON.rawJSON`、`Symbol.prototype`、
`WeakMap.prototype`、宿主全局），一条**静默错值**都没有——于是把注意力放到
**同一条根的另一个面**上：`set_proto` 那一格的**两个内建入口**。

根子是**内部口径与规范口径混用**：`RtSetProto`（第 278 轮为 `extends` 写的）
定的是「接收者不是对象就抛、原型不是对象就**不做事**」——那是**降级层内部**的约定，
而 `Object.setPrototypeOf` 那一格**直接把规范的三档交给了它**（第 304 轮的注释
甚至写着「那里已经定了两格的口径」）。实测 Node（判据 `p720a-s01` … `s10`）：

| 写法 | Node | 本仓原来 |
| --- | --- | --- |
| `Object.setPrototypeOf({}, 1)` / `"x"` / `true` / `Symbol()` | `TypeError` | **静默返回那个对象** |
| `Object.setPrototypeOf(1, {})` / `"s"` / `true` | **原样返回那个原始值** | 抛普通 `Error` |
| `Object.setPrototypeOf(null, {})` | `TypeError` | 抛普通 `Error` |
| `Reflect.setPrototypeOf({}, 1)` | **`TypeError`** | **给 `false`** |

- **`Object.setPrototypeOf` 添三档**：`null` / `undefined` 接收者抛 `TypeError`、
  原型不是对象且不是 `null` 抛 `TypeError`、**原始值接收者原样返回**。
  「接收者必须是对象」是 `RtSetProto` 的**内部**约定，不是这一格的语义
  ——JS 在这一格先 `RequireObjectCoercible`，再对原始值接收者**原样返回**。
- **`Reflect.setPrototypeOf` 那一格原来是错的**：注释里写着「原型不是对象也不是 `null`
  时给假（JS 的 `Reflect` 口径）」——**那句话与规范相反**。
  `Reflect` 里给假的是 `defineProperty` / `set` / `deleteProperty` **那几格**，
  而 `setPrototypeOf` 在第一步就抛。**给假等于把一个该抛的错变成一个看起来正常的返回值**。
- **原型的判据两处都多认 `HostRef` 一格**：内建构造函数在本仓是**宿主引用值**
  （`IsObject()` 对它是假），而 JS 里它就是对象——按原始值抛掉就等于把
  `Object.setPrototypeOf(o, Error)` 判成错的（第 278 轮那条账的同一个坑）。
- **对象字面量与赋值那一格照旧不抛**（`({ __proto__: 1 })` / `o.__proto__ = 1`
  在 JS 里都是**静默不做事**）：它们走的是**另一条路**（`set_proto` 那条内部约定），
  这一轮**一个字都没动**——一处判据管两个入口正是这条根原来长出来的样子。
- **收掉台账一条**：`stdlib/object/probe697-q32`（第 697 轮登记的
  「`Object.setPrototypeOf({}, 1)` 静默不做事」，当时判的是「要收得先把
  『内建构造函数得是个真对象』补上」——`HostRef` 那一格一认，这一条就通了）。
- 语料 **+20 条**：`stdlib/round720/p720a-s01` … `s10`（那两个入口的三档口径与
  宿主引用值那一格）、`p720b-b01` … `b10`（同一批普查里**过掉的那些**照收进矩阵：
  类数组接收者的 `push` 写回、`sort` 的洞与逐码元比较、函数的 `name` / `length`、
  `Object.keys` 的次序、`Array.from` / 展开 / `concat`、`slice` / `indexOf` /
  `includes` 的实参、`Object.assign` 的空实参、`Map` / `Set` 的遍历面、
  `JSON.stringify` 的三档、代理对与数字格式化）。
- 五类 **7325 / 7679 → 7346 / 7699**、`blocked 261`（没涨）、`differ 93 → 92`
  （`probe697-q32` 转绿）、`bad` 0、`regressions` 0、`moved` 0、`newlyPassing` 0，
  加权 **96.1%**。

### 第 721 轮：数组下标那一格——**值在元素区、标志位在属性表**

这一轮的普查专门问**数组下标那一格**（34 条原子探针：`defineProperty` 的数据属性 /
访问器 / 三个标志位 / `length` 描述符 / `delete` / `in` / `slice`），**34 条里 22 条红**——
第 706 轮把「下标上 `defineProperty` 要落进元素区」修好之后，**那一格剩下的四件事**
一次全露出来了：

| 写法 | Node | 本仓原来 |
| --- | --- | --- |
| `defineProperty(a, "1", { enumerable: false })`（**没写 `value`**） | 值还是 `9` | **值被抹成 `undefined`**（JSON 给 `null`） |
| 同上（`{ value: 9, writable: false }` 之后 `a[1] = 42`） | 静默不动，还是 `9` | 照写，变 `42` |
| `{ value: 9, configurable: false }` 之后 `delete a[1]` | `false`，那一格还在 | **`true`**，那一格变洞 |
| 下标上的**访问器**：`a[1]` / `a.join()` / `JSON.stringify(a)` | 调 getter | 读元素区（旧值） |
| `defineProperty(a, "length", { value: 1 })` | 截到 1 | 原样不动 |

**根子是一条内部约定**：元素区（`HeapArray` 的 `Elements` / `Holes`）**没有逐格标志位**，
所以属性表里那一份（第 706 轮为「不可枚举」造的 `IndexKeyShadowed`）是**标志位的唯一落点**，
而**四条路原来各自不知道这件事**：

- **`DefineOwnFromDescriptor` 只分了一档**（第 706 轮按 `enumerable` 分流）：
  `writable` / `configurable` 一律按描述符的缺省（假）算 ⇒ `{ enumerable: false }` 顺手把
  那一格变成**不可写 + 不可配置**；而不写 `value` 时又**无条件回写** `fieldOf("value")`
  （没写就是 `undefined`）⇒ **值被抹掉**。现在三格各自一档
  （**没写的沿用元素那一格的性质**：可写 + 可枚举 + 可配置），`value` 没写就**不动值**；
  只要有一位不是元素的常态，就在属性表里留一份。
- **`SetIndex`（`a[i] = v`）从来不问属性表**：不可写那一格照样写得进去。
  现在先扫**自有那一摞**（`a[i] = v` 是热路径，所以不顺原型链走）：
  不可写 ⇒ **一声不响**（非严格赋值的口径，与 `SetPropertySearched` 一字不差）、
  可写 ⇒ **值两摞一起写**（不然 `a[1]` 与描述符里的 `value` 会各说各话）。
- **`DeleteProperty` 先走元素那一段、无条件成功**：不可配置那一格删得掉。
  现在**属性表那一摞先看**——不可配置 ⇒ 给假、那一格留着；可配置 ⇒ 两份一起删。
- **描述符那一趟只在「不可枚举」时才认属性表**：`writable: false` 是可枚举的，
  于是答「三个全真」。判据改成「**有没有那一份**」，并且**访问器那一份也一并认**
  （下标上的 getter 现在读得到 `descriptor.get`）。
- **顺手收掉一处同族的静默错值**：`slice` 把洞接成了**显式的 `undefined`**
  （`const a = [1,2,3]; delete a[1]; 1 in a.slice()` 从假变真）——`concat` 早就用
  `AppendSlot` 处理过同一件事，这一处是同一个坑的另一半。
- **仍然开着的三个根**（都登在用例里，`p721a-b01` … `b08`）：
  ① **下标上的访问器调不到**（读、写、展开、`map` / `reduce`、`JSON` 全走元素区）——
  `get_index` / `set_index` 这两条快路径的签名里**没有调用通道**，要收得把 `NativeCall`
  一路递进去、并让元素区那三十来处读取都问一遍属性表；
  ② **`length` 那一格的描述符语义**（削短 / 加长 / `writable: false` 之后赋值与 `push`）——
  与 `stdlib/object/125` / `exec/round707/p707b-d06` 同根，要 `HeapArray` 上多一格标志位；
  ③ **`Object.seal` / `freeze` 管不到元素区**（本轮给下标补的标志位只覆盖
  「`defineProperty` 显式写了标志位」那一档）。
- 语料 **+25 条**（`stdlib/round721/p721a-a01` … `a17` 过掉的、
  `p721a-b01` … `b08` 登记的缺口）；**收掉台账一条**（`stdlib/array/144` 转绿）。
- 五类 **7346 / 7699 → 7364 / 7724**、`blocked 261`（没涨）、`differ 92 → 99`、
  `bad` 0、`regressions` 0，加权 **96.1% → 96.0%**。

### 第 722 轮：数组 `length` 那一格的描述符语义（收掉第 721 轮登记的第 ② 条根）

第 721 轮把「下标那一格」修好之后，同一族里剩下的三条根有一条**最窄也最日常**：
**`length` 它在 JS 里是一个真的自有属性**，可本仓**不住在属性表里**（是 `HeapArray`
的结构属性）——于是 `DefineOwnFromDescriptor` 把它当**普通属性**写：
造一格三个标志全假的 `Props` 项（值取描述符的 `value`），**既不截短也不加长**。
而 `RequireArrayGrowable`（`array.xl.md`）正好读那一份的「可写」位，
所以「锁长度」那一半**碰巧是过的**（`c305-std-array-length-nonwritable` 一直在绿），
错的只有另一半。

| 写法 | Node | 本仓原来 |
| --- | --- | --- |
| `defineProperty(a, "length", { value: 1 })` | 截到 1（`a[1]` / `a[2]` 没了、键只剩 `0`） | **原样不动** |
| `defineProperty(a, "length", { value: 4 })` | 加长到 4（补洞，JSON 给 `[1,2,null,null]`） | 原样不动 |
| `{ writable: false }` 之后 `a.length = 5` | 静默（长度停在 2） | **写成 5** |
| `{ value: "2" }` / `{ value: true }` / `{ value: null }` | `ToNumber` 之后按 2 / 1 / 0 | **一律 `RangeError`** |
| `delete a.length` | `false` | **`true`** |
| `Object.freeze(a)` 之后 `a.length = 5` | 静默 | **写成 5** |
| `{ enumerable: true }` / `{ configurable: true }` / `{ get() {} }` | 三档都 `TypeError` | 造一格访问器 / 改标志位 |

- **那一格现在有完整的一支**（`DefineOwnFromDescriptor`）：`{ value: n }` 削短 / 加长
  （削短时碰到**不可配置**的元素就抛 `TypeError`，而且**先判完再动手**——
  删到一半才发现挡路的会留下一个「删了一半」的数组）、非法长度值给 **`RangeError`**
  （先过 `ToNumber`：`"2"` 是 2、`true` 是 1、`null` 是 0、`undefined` 是 `NaN`）、
  `{ writable: false }` 那一档落在属性表里那一份上（`RequireArrayGrowable` 与描述符
  两处读的就是它）、`{ enumerable: true }` / `{ configurable: true }` / 访问器描述符
  三档都抛、**不可写之后 `writable: true` 与改值都抛**（同值可以）。
- **两条顺手收掉的静默错值**：① `delete a.length` 原来给 `true`（它不住在属性表里，
  两趟都扫不到它 ⇒ 落到最后那句「本来就没有」）；② `Object.freeze(a)` 之后
  `a.length = 5` 照样改（冻结那一趟扫不到它）——现在冻结时**先把那一份造出来**
  再照常清标志位。`Object.getOwnPropertyNames` 也不再给出**两个** `length`。
- **一处口径写在明处**：`{ value: 对象 }` 在 JS 里会给它过 `ToPrimitive`，而这一格的
  签名里没有调用通道 ⇒ 这里仍然抛 `RangeError`（宁可响也不静默）。
- **收掉 5 条台账**：`stdlib/object/125-array-length-descriptor`、
  `exec/round707/p707b-d06`（两行量的都是这一格），以及第 721 轮登的三条
  （`stdlib/round721/p721a-b04` / `b05` / `b06`，削短 / 加长 / `writable: false`）。
- 语料 **+14 条**（`stdlib/round722/p722a-a01` … `a14`，**全过**：`delete` /
  `getOwnPropertyNames` / `freeze` / 三档非法描述符 / 不可写之后的来回 / 值的四种形态 /
  不可配置的元素挡住削短 / `Reflect.defineProperty` 两档 / 字符串与数组的描述符旁证）。
- 五类 **7364 / 7724 → 7383 / 7738**、`blocked 261`（没涨）、`differ 99 → 94`、
  `bad` 0、`regressions` 0、`newlyPassing` 清空，加权 **96.0% → 96.1%**。

### 第 723 轮：`freeze` / `seal` / `preventExtensions` 与**元素区**那一摞

第 721 轮给「下标那一格」补的标志位落点（属性表里那一份）只覆盖
**`defineProperty` 显式写了标志位**那一档；`freeze` / `seal` 是**整体操作**——
它们走的是「扫一遍属性表、把标志位清掉」那两趟，而**元素区不在属性表里**，
于是那一趟**一格元素都扫不到**：

| 写法 | Node | 本仓原来 |
| --- | --- | --- |
| `Object.freeze(a); a[1] = 9` | 静默，还是 `2` | **写成 `9`** |
| `Object.freeze(a); delete a[1]` | `false`，那一格还在 | **`true`**，那一格变洞 |
| `Object.seal(a); delete a[1]` | `false`（写还写得进去） | **`true`** |
| `Object.freeze(a)` 之后 `getOwnPropertyDescriptor(a, "1")` | `可写 / 可配置` **都假** | **都真** |
| `Object.freeze(a); a[3] = 4`（新下标） | 静默，长度不变 | **`[1,2,3,4]`** |
| `Object.freeze(a); a.sort()` | `TypeError` | 照样排好 |

- **补法与第 721 轮同一个形状**：新方法 `MaterializeElementShadows`
  （`globals.xl.md`）在 `freeze` / `seal` 时给**现在有的每一格元素**补一份
  「标志位影子」（可枚举；`seal` 再多一位可写），随后那两趟循环照常清标志位——
  「不可写」与「不可配置」两问从此都有落点。**洞不补**（洞里根本没有那一格）。
  `Object.freeze` 第 722 轮已经为 `length` 造过一份，这一轮同一句话覆盖元素那一摞。
- **`a[新下标] = v` 在不可扩展的数组上要静默**：`SetIndex`（`props.xl.md`）现在先问
  「那一格在不在」（元素区有、或属性表里有那一份），不在且 `!Extensible`
  ⇒ **一声不响**。**在的那一格照旧可以写**——`Object.preventExtensions(a)` 之后
  `a.length = 1` **照样可以**（那条判据 `p723a-a06` 量着它），所以判据是「在不在」，
  不是「可不可扩展」。
- **仍开着一条**（`stdlib/round723/p723a-b01`）：**原地改元素的那两格
  （`sort` / `reverse`）不问「这一格可写吗」**——`Object.freeze(a); a.sort()`
  在 JS 里抛 `TypeError`（规范里它写元素走 `Set(…, true)`）。它与 `push` 那一档
  **不是同一条**：`push` 走 `RequireArrayGrowable`（问的是「可扩展吗」），
  而 `sort` 不新增格子——`Object.preventExtensions(a); a.sort()` 在 JS 里是**好的**，
  所以那一句不能顺手搬过来。
- **收掉台账 1 条**：`stdlib/round721/p721a-b07`（第 721 轮登的「`seal` 管不到元素区」）。
- 语料 **+12 条**（`stdlib/round723/p723a-a01` … `a11` 过掉的 + `p723a-b01` 登记的）。
- 五类 **7383 / 7738 → 7395 / 7750**、`blocked 261`（没涨）、`differ` **94**
  （+1 新登记、-1 转绿）、`bad` 0、`regressions` 0，加权 **96.1%**。

### 第 724 轮：展开实参后面跟 `as`——**两层套反了**（静默错值，一条根盖住整族）

这一轮的普查问的是「集合运算 / 复制族 / 迭代器助手 / 描述符批量口 / JSON 的两个钩子」
（52 条），红出来 17 条；隔离探针（16 条）一跑，**14 条红的是同一件事**：
**`f(...xs as T)` 这条实参根本不展开**。

| 写法 | Node | 本仓原来 |
| --- | --- | --- |
| `rest(...[1, 2, 3] as any)`（`function rest(...a)`） | `3:1\|2\|3` | **`1:1,2,3`**（那个数组被当成**一个**实参） |
| `fixed(...[1, 2, 3] as any)`（`(a, b, c)`） | `1:2:3` | **`1,2,3:undefined:undefined`** |
| `Math.max(...[1, 5, 3] as any)` | `5` | **`NaN`** |
| `o.m(...[1, 2] as any)` / `arrow(...[1, 2] as any)` | `2:1\|2` | **`1:1,2`** |
| `[...xs as any].length` | `3` | **`1`** |

- **根子在投影那一层，不在降级层**：token 层把 `...xs as T` 记成**两个平级单元**
  （`<Spread>…xs</Spread>` + `<As>T</As>`，`as` 比 `...` 松），而 TS 那边是
  `SpreadElement{ expression: AsExpression }`。投影按「左边那一格 + `as`」折，
  折出来的是 **`AsExpression{ expression: SpreadElement }`——两层套反**。
- **症状为什么是静默错值**：降级层看 `arguments` 里那一格是 `AsExpression`
  （不是 `SpreadElement`）⇒ **`HasSpread` 为假** ⇒ 走定长那条路，
  整个数组被原样当成一个实参递进去。**没有一个字提到「展开」**。
- **括号化那一档一直是对的**（`...([1, 2] as any)` 产物把它装在同一格里）——
  也就是说这不是「没做展开」，是**同一件事的两种排版走了两个形状**。
- **修法只有一处**（`print-ast-common.xl.md` 的 `as` / `satisfies` 那一支）：
  左边那一格是 `Spread` 时，先照常投影（`[Spread]` 给的正是 `SpreadElement{ expression }`），
  **把里面那个操作数取出来**当 `as` 的左操作数，再把整条 `as` 链**套回 `SpreadElement` 里面**。
  `satisfies` 同一条路（两支共用一个分支）。
- **一次量下来的另一件事**：这一格修好之后，`f(...new Set([1, 2]))` /
  `f(...gen())` / `f(...arr.values())` / `f(...m.keys())` **一起转绿**——
  它们原来那几条差额也全是那个 `as any` 造成的（普查里看着像「可迭代物不能展开」，
  实际是 `...x as any` 那一格）。
- 语料 **+9 条**：6 条钉这一族（`exec/round724/p724a-a01` … `a06`：形参三档、
  内建与方法的接收者、`satisfies` 与括号化、数组字面量元素、`new` / `call` / `apply` / `bind`、
  六种来路的展开），另**一条 token 用例**（`token/expressions/expr-spread-as.ts`：
  产物里 `Spread` 与 `As` 是平级两格，投影的折法交给 `cases:tsast` 对拍）与
  **两条新登记的缺口**（`p724a-b01`：内建错误构造自己那一格的原型链没接过；
  `p724a-b02`：稀疏数组的复制族把洞留着、JS 把它变成 `undefined`）。
- 五类 **7395 / 7750 → 7402 / 7759**、`blocked 261`（没涨）、`differ 94 → 96`
  （两条新登记的账）、`bad` 0、`regressions` 0，加权 **96.1%**（两个数都在这一位）。

### 第 725 轮：迭代器助手的三个名字（`take` / `drop` / `toArray`）

这一轮的普查（33 + 20 条：稀疏数组的整片语义 / 强制转换与比较 / 类与访问器形状 /
枚举次序 / 文本与数字的边角 / 异步生成器 / 承诺协议 / 知名符号协议）**大部分是绿的**——
洞、`ToPrimitive`、枚举次序、类字段与访问器、`Symbol.toPrimitive` / `toStringTag`、
私有字段与品牌检查、`new.target` 在普通函数里、标签模板的 `raw` 这些层**一条都没红**。
红的是**迭代器助手那一族**：

- `[1, 2, 3].values().map` / `filter` / `flatMap` / `reduce` / `forEach` / `some` / `every` /
  `find` **都有**，而 **`take` / `drop` / `toArray` 三个 `undefined`**——听起来像
  「迭代器助手没做」，实际是：**本仓的迭代器就是那个数组**（第 279 / 331 轮的取舍，
  游标 `__i` 与 `next` 挂在数组身上），于是前八个名字**恰好与 `Array.prototype` 同名**、
  沿原型链命中了数组那一格，而这三个**数组上没有**。
- **补法**：`AttachArrayIterator`（一处，四个用户共用）再挂三格隐藏属性 + 三个新号
  （`ArrayIteratorTake` / `Drop` / `ToArray` = 43 / 44 / 45，`install.xl.md` 的 `helpers` 名单同步）。
  语义按「**当下那个游标**起的剩下那一段」切片：`take(n)` 取前 n、`drop(n)` 跳过 n、
  `toArray()` 把剩下那一段收成**普通数组**（**不挂 `next`**——JS 里它也不是迭代器）；
  `take` / `drop` 的结果**照挂 `next`**，所以 `it.take(2).next()` 也是对的。
- **一处写在明处的差别**：JS 的助手是**惰性**的，而这一层拿不到「等被消费」那个时机
  ⇒ 这里**当场抽干**、接收者的游标按「这份结果被走完」推进。**消费掉结果的那条路两边一致**。
- 语料 **+7 条**（`stdlib/round725/p725a-a01` … `a05` 过掉的五条、
  `p725a-b01` / `b02` 两条登记的缺口）：`b01` 钉的是**模型差本身**
  （`Array.isArray(迭代器)` 真、`constructor.name` 是 `"Array"`、`it.map` 是急切的数组方法），
  `b02` 钉的是 **`Iterator` 这个全局对象没登记**（`typeof Iterator` 给 `undefined`，
  `Iterator.from` 用不了）——与第 717 轮 `Reflect` 是同一形状的活。
- 五类 **7402 / 7759 → 7407 / 7766**、`blocked 261`（没涨）、`differ 96 → 98`
  （两条新登记）、`bad` 0、`regressions` 0，加权 **96.1%**。

### 第 726 轮：`await` / `yield` / `delete` 后面跟括号字面量——**整份文件跑不起来**

上一轮那批探针里剩下的两条红（`await { v: 1 }` 报 `unimplemented: expression Block`、
`await [1, 2]` 报 `unimplemented: expression Bracket`）是**同一族**：
**前缀运算符后面那个括号字面量没被认出来**。两条都不是「值算错了」——
它们在**降级期**就断，整份文件一行都不打印。

| 写法 | Node | 本仓原来 |
| --- | --- | --- |
| `await { v: 1 }`（当语句 / 初始化式 / 箭头体 / `return` 后面） | 那个对象 | **`unimplemented: expression Block`** |
| `await [1, 2]` | 那个数组 | **`unimplemented: expression Bracket`** |
| `yield { v: 1 }` | 那个对象 | **`unimplemented: expression Block`** |
| `delete o["a"]` 那一格（方括号跟在 `delete` 后面） | 下标删除 | 同上那一族的接线 |

- **两个落点，同一个形状**（两张「前面是标识符 ⇒ 这不是字面量」的表）：
  - `text-common-util.xl.md` 的 `IsObjectLiteralBrace`：**任何名字**后面那个 `{` 都判成**块**
    （`class A {` / `else {` / `do {` 靠的正是它）——豁免名单里只有
    `return` / `throw` / `typeof` 与类型位那五个词；
  - `tokens/json/array-literal.xl.md` 的 `IsArrayAt`：前面是标识符 ⇒ 那个 `[` 是**下标**
    ——豁免名单里只有 `return` / `typeof` / `of` / `in` 与声明词。
  两个名单都漏了**只可能做前缀的那几个词**，于是 `await { … }` 被收成块
  （`v: 1` 成了标签 + 表达式语句）、`await [ … ]` 被收成下标
  （链在 `await` 上起头 ⇒ `PropertyAccess[Keyword(await), Bracket[]]`）。
- **补法**：两张名单各加 `delete` / `await` / `yield`——与已经在名单里的
  `return` / `throw` / `typeof` **同源**（词法位置上它们都只可能做前缀）。
- **`void` 故意没收**（**实测撞到的**）：它在 TypeScript 里还是**类型位的一个词**——
  `function f(): void {` 与 `on(…): () => void {` 那两处的 `{` 是**函数体**。
  第一版把 `void` 一起加进去，**当场坏掉 64 条**（函数体变成对象字面量 ⇒
  `unimplemented: statement Identifier`；`coverage` 从 7407 掉到 7347）。
  改成「看 `void` 前面那一格是不是 `:`」之后**还剩 `() => void {` 那一档**（前面是 `=>`），
  所以这一轮把 `void` **原样退回**、缺口登在用例台账里（`p726a-b01`：
  `void { … }` / `void [ … ]` 照旧是那两条 `unimplemented`）。
- 语料 **+5 条**（`runtime/round726/p726a-a01` … `a04` 过掉的四条 + `p726a-b01` 登记的缺口）。
- 五类 **7407 / 7766 → 7411 / 7771**、`blocked 261 → 262`（`void` 那一格新登的）、
  `differ 98`（没涨）、`bad` 0、`regressions` 0，加权 **96.0%**。

### 第 727 轮：`void` 后面跟括号字面量——**把第 726 轮退回的那一格补上**

第 726 轮把 `delete` / `await` / `yield` 收进两张「前面是前缀词 ⇒ 这是字面量」的豁免名单，
`void` **原样退回**（无条件加进去**当场坏掉 64 条**），缺口登在 `p726a-b01`。
这一轮补的就是那一格：**`void` 多一道闸，闸门是它左边那一格**。

| 写法 | `void` 左边 | 判 | 后面那个 `{` / `[` |
| --- | --- | --- | --- |
| `function f(): void {` / `m(): void {` / `readonly cb: () => void {` | `:` | 类型位 | **函数体**（照旧） |
| `let xs: void[]` | `:` | 类型位 | 类型括号（照旧） |
| `const g = (): () => void {` | `=>` | 问 `IsFunctionTypeArrow` | 函数类型的体 |
| `console.log(void { v: 1 })` / `const a = void { v: 1 }` | `(` / `=` | **值位** | 对象字面量（**这一轮收的**） |
| `return void [1]` / `void void 0` | `return` / 值位那一格 | **值位** | 数组字面量 / 一元运算 |

- **一处新判据**：`text-common-util.xl.md` 的 `IsValuePositionPrefix`（第 727 轮）——
  从那个词**自己那一格**往回扫（口径与 `HasTypeColonBefore` 同源）：
  撞上 `:` ⇒ 类型位；撞上 `=` ⇒ 值位；撞上 `=>` ⇒ 交给 `IsFunctionTypeArrow`
  （函数类型的箭头左边是形参表、形参表左边是那个冒号）；
  撞上 `;` / `,` / `(` / `[` / `{` / `}` ⇒ 值位（类型那一截到不了这些符号）。
  一路上只跳 trivia，**最多扫 64 格、不递归**，所以不可能绕圈；**答否 = 保持今天的行为**。
- **两个落点各接一次这一问**（判据只有一份）：
  `IsObjectLiteralBrace` 的豁免名单加 `void`（值位才放行）、
  `IsArrayAt` 的豁免名单加 `void`（同样只在值位放行）。
- 语料 **+6 条**：`runtime/round727/p727a-a01` … `a05`（五条量出来的形状，
  其中 `a04` 是**类型位那一半的守卫**——收掉 `void { … }` 不许连累 `(): void {`）、
  外加 `token/expressions/expr-void-literal-operand`（token 层钉同一格）。
  第 726 轮登记的那条缺口 **`p726a-b01` 当场转绿**，`xl:want blocked` / `xl:why` 按规矩删掉。
- 五类 **7411 / 7771 → 7418 / 7777**、`blocked 262 → 261`（`void` 那一格收掉）、
  `differ 98`（没涨）、`bad` 0、`regressions` 0，加权 **96.0% → 96.1%**。

### 第 728 轮：`?.` 与 `[` / `(` 之间夹注释或换行——**方括号的宿主换了人**

语料里躺着 19 条 `SWEEP-*/optchain`（第 657 轮审计语料）的登记缺口，根子是同一条：
`a?./*c*/[c]` 与 `a?.[c]` **词法上只差一条注释**，产物却一个是数组字面量、一个是对下标。
这一轮把那一族收掉。

| 写法 | 原来 | 现在 |
| --- | --- | --- |
| `a?.[c]` | NCO 里一格**裸方括号**（对） | 不变 |
| `a?./*c*/[c]` | NCO 里一格 **`ArrayLiteral`** ⇒ 链断 | NCO 里一格裸方括号 |
| `a?.b?./*c*/[c]?.(d)` | 缺 `ElementAccessExpression` | 与没有注释的那一版同形 |

- **量出来的根**：`NullConditionalOperatorCloseRule` 从 `?.` 往后收时，`?.[c]` 的那个
  `[` **被收进 NCO 的 `Data` 里**（投影那一层正好把「NCO 里一格裸方括号」读成下标访问，
  所以这个形状一直是对的）。而 `JsonArrayCloseRule` 排在它**之后** ⇒ 轮到数组规则时，
  那个方括号的**宿主已经是 NCO**，`IsArrayAt` 里那句 `parent instanceof NullConditionalOperator
  && index === 0` 靠的是「它是 NCO 的第一个子单元」——**夹一条注释就不是 0 了**
  ⇒ 落进下面那条链 ⇒ 判成 `ArrayLiteral`。
- **改法两处**（都不动既有形状）：
  ① `IsArrayAt` 里那一格从「`index === 0`」改成「**它前面没有别的实义子单元**」
  （`GetSkipPrevious(parent.Data, at, IsTriviaUnit) === null`）——`?.` 自己留在**外层**列表上、
  不在 `Data` 里，所以「前面什么都没有」与「紧跟 `?.`」是同一件事，有无注释走同一句；
  ② `IsArrayAt` 的「前一个实义单元」那一问从**只跳软换行**改成**跳 trivia**
  （与 `IsStatementStart` / `IsObjectLiteralBrace` 同一个跳过口径），并补两条：
  前一个单元是 `.` / `?.` 符号时那个 `[` 也是下标（`a?./*c*/[c]` 里 `?.` 还没成形）。
- **收掉 3 条登记缺口**（`cases:tsast` 报「已经收掉」、按规矩删掉 `xl:known-gap`）：
  `gap-sweep-comment-optchain-03`、`gap-sweep-linecomment-optchain-05`、
  `gap-sweep-newline-optchain-04`（三处的 `xl:expect` 里那个 `ArrayLiteral` 也要撤掉）。
- **语料 +3 条**：`runtime/round728/p728a-a01` … `a03`（`?.[` / `?.(` / 三处注释换行落点的
  端到端读数——`node` 那一侧逐字节对上）。
- 五类 **7418 / 7777 → 7424 / 7780**、`blocked 261 → 258`、`differ 98`（没涨）、
  `bad` 0、`regressions` 0，加权 **96.1%**（两个数都在这一位）。

### 第 729 轮：可选链 / 非空断言**后面跟调用**那一格——两条新根，都登在语料里

这一轮换一处问法（`new` / 非空断言 / 可选链在**调用**那一格的接线），量出两条真缺口：
两条都是**合法的 TS**，一条**静默给错值**、一条**整份脚本断掉**。

| 写法 | Node | 本仓 | 形态 |
| --- | --- | --- | --- |
| `o?.m?.()` | `1` | **`undefined`**（静默） | 收成**两个平级 NCO**：`o` + `NCO(m)` + `NCO(括号)` |
| `o!.m!()` | `1` | **`cannot call a non-closure value`**（整份文件进不来） | `NCO(Method(m, NotNull, 括号))` |

- **两条的根是同一处**：实参括号与**已经折好的那一格**（NCO / `NotNull`）之间没有接线。
  `OptionalCallCloseRule` 的 `IsCalleeEnd` / `IsChainLink` **认得** `NotNull` 与 `NCO`
  （那两条注释就是为它们写的），但真正成形的那一趟落在 `?.` 的**另一侧**——
  `MethodCloseRule` 与它各收各的，于是括号要么被当成第二个 NCO 的实参表、
  要么被折进 `Method` 的 `arguments` 里而**被调者那一格是空的**。
- **为什么不在这一轮修**：这一格的判据横跨 `MethodCloseRule` / `OptionalCallCloseRule` /
  `print-ast-common` 三处（第 153 轮试过两次、都写明了「形状一点没变，说明那一格根本没被问到」），
  改它要先量清楚**是谁先把括号收走的**。所以这一轮把两条**原样登进语料**
  （`runtime/round729/p729a-a01`，`xl:want differ` + `xl:why` 写清根子），
  剩下的形状另立 `p729a-a02` / `a04` 钉住（`new` / 下标 / 非空断言在**成员**那一格都对）。
- **同批量到的一条**：`void` 的更多位置（分组 / 嵌套 / 与 `typeof` 并排 / 数组元素）
  全部照旧——第 727 轮那一格没有漏（`p729a-a03`）。
- **语料 +4 条**（`runtime/round729/p729a-a01` … `a04`）。
- 五类 **7424 / 7780 → 7427 / 7784**、`blocked 258`（没涨）、`differ 98 → 99`（新登的那条）、
  `bad` 0、`regressions` 0，加权 **96.1%**（两个数都在这一位）。

### 第 730 轮：生成器 / `async` 那一族的**标签与原型**——12 条登记缺口一起转绿

这一轮问的是**函数值自己那一格**：一个闭包出生时 `[[Prototype]]` 是谁指的是谁。
本仓从第 228 轮起**一律**指 `Function.prototype`，而 JS 里它按**种类**分四档
（`function` / `function*` / `async function` / `async function*`）——
标签与 `.constructor.name` **两处都长在那条链上**。六条实测：

| 写法 | Node | 本仓（改前） |
| --- | --- | --- |
| `Object.prototype.toString.call(function* () {})` | `"[object GeneratorFunction]"` | `"[object Function]"` |
| `Object.prototype.toString.call(async function () {})` | `"[object AsyncFunction]"` | `"[object Function]"` |
| `Object.prototype.toString.call(async function* () {})` | `"[object AsyncGeneratorFunction]"` | `"[object Function]"` |
| `(function* () {}).constructor.name` | `"GeneratorFunction"` | `"Function"` |
| `console.log(function* gen() {})` | `"[GeneratorFunction: gen]"` | `"[Function: gen]"` |
| `Object.prototype.toString.call((function* () {})())` | `"[object Generator]"` | `"[object Object]"` |

- **引擎那两半**：`HeapClosure` 添 `IsGenerator` / `IsAsync` 两位（与 `IsClass` /
  `IsStrict` / `HasRestricted` **同一处来**——降级层在造闭包那一刻盖上），
  `new_closure` 第四格的**步长 8 → 32**（`EmitClosure` 同步改，两边是同一份规约的两半）；
  `Protos` 添 `GeneratorFunction` / `AsyncFunction` / `AsyncGeneratorFunction` 三格原型
  （都接在 `Function.prototype` 下面），`MakeClosure` 按那两位挑原型。
- **语言层那一半**：三格原型上挂 `constructor` 与 `Symbol.toStringTag`、三格构造对象挂
  `name` / `length` / `prototype`（`typeof` 给 `"function"`——载荷**借 `FunctionCtor` 那一格**：
  「动态造函数」本来就是**同一个缺口**，新开一格只会让同一件事有两种说法）；
  `Generator` / `AsyncGenerator` 两格也补上 `Symbol.toStringTag`；
  `inspect` 认四档（生成器 / `async` 排在**类**之前）。
- **一处次序**：`props.xl.md` 里可调用接收者原来「先自有、再 `protos.Function`、
  最后才是闭包载荷」——这一轮给**闭包**添一句「自己那条链先走」，
  但**判据收成「原型是那三格之一」**。第一版给所有闭包走，**实测红三条**：
  `class E extends Error {}` 的静态链指的就是**父类那个值**（它的 `Proto` 是 `Object.prototype`），
  于是 `E.name` 从 `"E"` 变成 `"Error"`、`(class extends Array {}).toString()` 从
  `"class extends Array {}"` 变成 `"[object Function]"`、`class Named` 的 `this.name`
  被一次静默失败的赋值顶掉——**那三处在第 730 轮之前都只是「碰巧对」**。
- **试过又退回来的一版**：把「带可调用载荷的对象」在 `ObjectTagOf` 里答成 `"Function"`。
  单看 `Object.prototype.toString.call(String)` 是**对的**（Node 给 `"[object Function]"`），
  可这一档**不是只有那一处在用**：`String + 1` / `String(String)` 走 `ToPrimitive` → `toString`，
  而本仓 `String.toString` 命中的**正是这一格** ⇒ 那一句从**响亮地抛**变成 `"[object Function]1"`
  （Node 给 `"function String() { [native code] }1"`）——**静默错值**。
  `tests/runtime/check.mjs` 第 8643 条那一档当场把它拦下来，**改动全部撤回**
  （要收它得先把「带可调用载荷的对象也走 `protos.Function` 那一趟」做出来，那是另一件事）。
- **两处剩下的一档照旧登在语料里**：`p730a-a09`（V8 给 `%GeneratorFunction.prototype%`
  **多造**一格规范里没有的 `prototype`）、`p730a-a10`（`%GeneratorFunction%("a", "yield a")`
  那一档动态造函数——与 `new Function` **同一条根**）。
- **语料 +12 条**（`runtime/round730/p730a-a01` … `a12`），收掉 12 条登记缺口
  （`differ` 那一栏 −10：收 12 条、新登 2 条）。
- 五类 **7427 / 7784 → 7449 / 7796**、`blocked 258`（没涨）、`differ 99 → 89`、
  `bad` 0、`regressions` **0**，加权 **96.1% → 96.2%**。

### 第 731 轮：闭包那两格属性与 `Function.prototype`（coverage 7449/7796 → **7457/7806**）

这一轮接着第 730 轮那一处（闭包与它的原型），问的是**函数身上那几格属性**。

- **收掉一条**：`Function.prototype.length`（`0`）与 `name`（`""`）取不到
  （`stdlib/object/122-names-function-proto`，第 678 轮就登着的账）。**两半一起做才成立**：
  ① 语言层把这两格**隐藏挂**到 `protos.Function` 上（第 690 轮挂过一次、**实测 40 条回归**）；
  ② `props.xl.md` 的 `GetProperty` 把**闭包载荷那两格**（`Arity` / `Name`）**提到**
  「借 `protos.Function` 找一次」那一趟**之前**——JS 里它们是函数的**自有属性**，
  原型上的同名格永远排在后面。**只做①就是那 40 条回归**，两半都在这一轮里。
  `f.length = 5` / `f.name = "renamed"` 也因此照旧静默失败（判据 `p731a-a04` 钉着它）。
- **这一轮加宽的 10 条**（`runtime/round731/p731a-a01` … `a10`）里，7 条直接过
  （四种函数的 `length` / `name` 与形参口径、`bind` 出来的那两格、
  `getOwnPropertyDescriptor`、类那两格、计算键以外的方法名、以及**那 40 条回归的哨兵**）。
- **新登 3 条**（都是**同一族的两半**，各自钉住一个不同的代价）：
  - `p731a-a03`：**内建函数没有 `name`**——`Function.prototype.call.name` 那一族是
    **带可调用载荷的对象**（`MethodObject` 的签名里没有名字参数），而 `Math.max.name`
    那一族是**宿主引用值**（连属性表都没有，要给几百个内建配一张表）。
    与 `p709b-b17` / `p719a-m09` / `p706c-x20` **同一条根**，这一条把「已经能挂的那一半」也点出来了。
  - `p731a-a08`：**计算键方法的 `name`**（`({ ["c"]() {} }).c.name` 在 Node 里是 `"c"`、
    本仓给空串）——根子在降级层：名字那一格只从**标识符**取，计算键是 `ComputedPropertyName`。
  - `p731a-a10`：`Function.prototype` 自己那两格受限属性（`arguments` / `caller`）——
    按规范它**自有**这两格（它本身是松散函数对象），本仓那两格是**按闭包载荷**答的，
    而 `protos.Function` 是个普通对象。
- 五类 **7449 / 7796 → 7457 / 7806**、`blocked 258`（没涨）、`differ 89 → 91`（收 1 条、新登 3 条）、
  `bad` 0、`regressions` **0**，加权 **96.2% → 96.1%**（新登记缺口的账，不是回归）。

### 第 732 轮：计算键成员的 `name`（coverage 7457/7806 → **7460/7810**）

这一轮收的是第 731 轮刚登下的那条（`p731a-a08`），根子一句话就能说清：
**两半各自以为对方会取名**。

- **对象字面量的计算键方法**（`{ ["c"]() {} }`）：`LowerObjectLiteral` 传的是占位符
  `"<computed>"`（以 `<` 开头 ⇒ `LowerFunctionValue` 按**匿名**处理），
  而运行期那一半（`EmitComputedFunctionName`）又因为 `StaticKeyText` **非空**提前返回
  （那一句的用意是「静态键由**上面那条提示**取名」——可这一支**没有**那条提示）。
  两半都在等对方 ⇒ 名字是空串（Node 给 `"c"`）。
- **修法**：静态键那一档**当场**把 `StaticKeyText` 的结果当名字传下去
  （`{ [5]() {} }` 给 `"5"`、动态键照旧走 `"<computed>"` 由运行期补）；
  **访问器那一支同一个根**（`{ get ["g"]() {} }` 要的是带前缀的 `"get g"`），一起改了。
- 判据 `p731a-a08` 转绿、台账已撤；新语料 `p732a-a01` / `a04` 两半都钉着
  （字面量键 / 数字键 / 动态键 / 属性赋值那一档）。
- **新登 2 条**（都是「同一条根上的另一半」）：
  `p732a-a02`（**动态键的访问器**名字：运行期那个辅助函数写的是**键本身**，
  而访问器要带 `get `/`set ` 前缀）、`p732a-a03`（**类成员那条路**的名字还是只从标识符取
  ——同一个形状在对象字面量与类两条路上，第 620 / 732 两轮只接了前者）。
- 五类 **7457 / 7806 → 7460 / 7810**、`blocked 258`（没涨）、`differ 91 → 92`（收 1 条、新登 2 条）、
  `bad` 0、`regressions` **0**，加权 **96.1%**（两个数都在这一位）。

### 第 733 轮：内建函数自己那两格（`name` / `length`）（coverage 7460/7810 → **7468/7813**）

第 731 轮把**闭包**那两格与 `Function.prototype` 那两格接上了，**内建这两档一直空着**——
这一轮收的是同一条根上的另外两档（`p731a-a03` 那一行点名的「已经能挂的那一半」）。

- **一句话的根**：**本仓的内建有两种壳，两种都没人给名字**。
  ① **宿主引用**（`Math.max` / `Object.prototype.__lookupGetter__` / `Reflect.get` 那一族）
  **连属性表都没有**（`HeapHostRef` 只有两个 int）⇒ `GetProperty` 走到它就是「找不到」；
  ② **带可调用载荷的对象**（`Function.prototype` 那四格、`Promise.prototype` 那一族）
  有表、`length` 第 350 轮就挂上了，**缺的只是「有没有人把名字传进来」**
  （`MethodObject` 的签名里没有名字那一格）。
- **修法两处，一小一大**：
  - `props.xl.md` 的 `GetProperty`：**宿主引用也先看自有那一摞**。
    「宿主引用没有属性表」**不是一条结构事实**——`HeapObject.Props` 本来就长在每一格上
    （`heap.xl.md`），只是**从来没人往里写过**。**次序要紧**：这一段必须排在
    「借 `protos.Function` 找一次」**之前**——`protos.Function` 自己第 731 轮挂了
    `name`（空串）与 `length`（`0`），排在后面的话每个内建的 `name` 都会读到原型上那一格
    （静默错值，与第 731 轮那 40 条回归**同一个形状**）。
  - `globals.xl.md` 新增 `DefineBuiltinName` / `BuiltinHostRef` / `BuiltinArity` /
    `ObjectProtoMethod` 四件，`MethodObject` 多收一格 `name`（缺省空串 = 老行为一字不改）。
    标志位按 Node 量出来的那一档（`{ writable: false, enumerable: false, configurable: true }`）
    ⇒ 只给 `PropertyFlagConfigurable` 一位，**不走 `SetHiddenProperty`**（那个三格全开，
    `writable` 是**真**——静默可写）。
- **`BuiltinHostRef` 是这一轮真正的坑**：`CreateHostRef` **每次都 `AllocateRaw`**
  （第 1081 轮写着它为什么不能按对驻留）⇒ 同一个内建号上可以同时存在好几个句柄、
  而它们**不是同一个值**。就地新造一个再往上挂 `name`，脚本读到的是**另一个句柄**
  ⇒ `Math.max.name` 照旧 `undefined`（**静默无效**，一句异常都没有）。
  所以取能力表里那一个（`vm.HostTable[id - BuiltinBase]`，装载时按号注册过、只读）。
- **判据五条转绿、台账已撤**：`p706c-x20`（`__lookupGetter__.name` / `.length`）、
  `p709b-b17` / `p709b-b18` / `p719a-m09`（`Math` 那一族的名字与形参个数）、
  `p731a-a03`（`Function.prototype.call.name` 那一行）。
- **新语料 3 条**（`runtime/round733/p733a-a01` / `a02` / `a03`）：三分宿主引用那一档
  （`Math` / `__lookupGetter__` / `Reflect` / `Object.keys`）、四格 `Function.prototype`
  自己那一档、以及**那两格的标志位**（`Object.keys(Function.prototype)` 与
  `Object.keys(Object.prototype)` 都必须是空数组——挂错标志位就是静默漏出去）。
- 五类 **7460 / 7810 → 7468 / 7813**、`blocked 258`（没涨）、`differ 92 → 87`
  （收 5 条、新语料 0 条挂账）、`bad` 0、`regressions` **0**，加权 **96.1% → 96.2%**。

### 第 733 轮（其二）：`WeakMap` / `WeakSet` 各自一格原型与 `Map` / `Set` 那两格的名字（coverage 7468/7813 → **7471/7814**）

同一轮的第二批：**第 295 / 681 轮那个取舍的账单**。

- **收掉两条**：`stdlib/map-set/103-names-weakmap-proto` / `104-names-weakset-proto`。
  第 295 轮让 `WeakMap` 与 `Map` **共用 `protos.Map`**（为省一整套方法安装代码），
  代价是 `WeakMap.prototype` **就是** `Map.prototype` ⇒ `constructor` 是 `Map`
  （在 **Node** 里 `WeakMap.prototype.constructor === WeakMap` 是 `true`）。
- **链是量出来的、不是推出来的**（**实测 Node**）：
  `Object.getPrototypeOf(WeakMap.prototype) === Object.prototype` 给 `true`、
  `=== Map.prototype` 给 `false`；`Object.getOwnPropertyNames(WeakMap.prototype)`
  是 `constructor,delete,get,set,has`（**五格自有**），`WeakSet` 那边是
  `constructor,delete,has,add`（**四格**）。
  **第一版写的是「接在 `Map.prototype` 下面」**（想省掉复制方法）：五格名字都取得到、
  `Object.keys` 也仍是 `[]`，**但 `WeakMap.prototype.size` 会跟着继承过来**
  （JS 里是 `undefined`）——判据只量那五个名字，所以这一处会**静默留下**。
  改成**并列**（两格各自接 `Object.prototype`，方法各自挂一份）之后那一格才不存在。
- **`Map` / `Set` 那两格的 `name` / `length` 也一起补上**（第 733 轮那件工具的复用）：
  `Map.prototype.get.name` 在 Node 里是 `"get"`，本仓原来给 `""`。
  **形参个数按逐个量出来的表写**——`Map.prototype.set.length` 是 **`2`**、
  `get` / `has` / `delete` / 两个 `forEach` 是 `1`、`entries` / `keys` / `values` / `clear` 是 `0`。
  **第一版把整族写成「一格」**（想当然），新语料 `p733a-a04` 最后一行当场把它量了出来。
- **新语料 1 条**：`p733a-a04`（两格原型的成员、`size` **不该**跟着来、`instanceof`、
  以及 `Map` / `Set` 那两格的名字与长度）。
- 五类 **7468 / 7813 → 7471 / 7814**、`blocked 258`（没涨）、`differ 87 → 85`、
  `bad` 0、`regressions` **0**，加权 **96.2%**。

### 第 734 轮：`Array` / `String` / `Number` / `Boolean` / `Error` 那五族的 `name` / `length`（coverage 7471/7814 → **7472/7815**）

第 733 轮做出那件工具（`DefineBuiltinName` + `BuiltinArity` + `BuiltinHostRef`）之后，
**同一件事在别的族上还没做**——这一轮把它铺到原型方法那五族上。

- **一句话**：`Array.prototype.push.name` 在 Node 里是 `"push"`、`.length` 是 `1`，
  而本仓那两格**根本不存在**（内建方法全是宿主引用，`GetProperty` 走到它就是「找不到」）。
  第 733 轮只接了 `Function.prototype` 四格、`Math` / `Reflect` / `Object` / `JSON`
  与 `Object.prototype` 那一摞——**`Array` / `String` / `Number` / `Boolean` / `Error`
  那五族这一轮才铺到**（`Object.proto` 里 `valueOf` / `toString` 那几格也一起）。
- **量出来的表是这一轮的全部工作量**（`BuiltinArity` 从 40 行长到 130 行）：
  **同一族里两种长度**是常态——`String.prototype.toUpperCase.length` 是 **`0`**
  （不收实参），HTML 包装十三格里 `big` / `blink` / `bold` / `fixed` / `italics` /
  `small` / `strike` / `sub` / `sup` 是 `0`、而 `anchor` / `fontcolor` / `fontsize` /
  `link` 是 `1`；`Array.prototype.toString` 是 `0` 而 **`join` 是 `1`**（两格共用
  `ArrayJoin` 那个号 ⇒ 长度**不能按号查**，那两格按名字写死）。
  **第一版把 `toUpperCase` / `toLowerCase` 归进「一格实参」那一档**，
  **这一轮新语料的第一行就把它量出来了**（本仓给 `1`、Node 给 `0`）。
- **别名那一档的 `name` 跟号走**：`String.prototype.trimLeft` 在 Node 里**就是**
  `trimStart`（同一个函数对象、`===` 为真）⇒ 它的 `.name` 是 **`"trimStart"`**，
  不是 `"trimLeft"`——`DefineBuiltinName` 那一处按名字写死了这两个别名。
- **`Number` / `Boolean` / `Error` 三族的挂载点也改用 `ObjectProtoMethod`**：
  它们原来是就地 `CreateHostRef` 造的，与第 733 轮那条「取能力表里那一个有身份的」
  同一个坑（就地造的那个句柄上挂名字，脚本读到的是另一个）。
- **新语料 1 条**（`runtime/round734/p734a-a01`）：十四行把五族的名字与长度、
  以及别名那一格钉住。
- 五类 **7471 / 7814 → 7472 / 7815**、`blocked 258`（没涨）、`differ 85`（持平）、
  `bad` 0、`regressions` **0**，加权 **96.2%**。
  **这一轮没有收掉任何台账**——它铺的是一个**没有任何现成判据在量**的形状
  （这正是「加宽语料」那一条的用处：先量出来，再谈收）。

### 第 736 轮：元编程那一层的**四格口径**——`Reflect` 的形参个数、两个标签、两个 `TypeError`（coverage 7483/7827 → **7504/7853**）

这一轮先**普查**（47 条原子探针：符号 / 标签 / `instanceof` 的钩子 / `JSON` 的 replacer /
`Object` 的描述符 / `class` 的那几格），**36 条当场 pass、11 条没过**，
把没过的分成「这一轮能收的」与「另一条根，登记」两堆。

- **`Reflect` 那四格的形参个数**（`p736a-a14` 逐格 `typeof` + `.length` 打出来的表）：
  `getPrototypeOf` / `isExtensible` / `ownKeys` / `preventExtensions` 在 Node 里
  **都是 `1`**，而 `BuiltinArity` 把它们与「目标 + 键」那一族一起写成了 `2`
  ——**错在一个「顺手归族」上**：真正的分界是**收几个实参**，不是名字像不像邻居
  （`setPrototypeOf` / `deleteProperty` / `has` / `get` / `getOwnPropertyDescriptor`
  那五格才是两格）。四个号从 `2` 挪到 `1`。
- **`WeakMap` / `WeakSet` 的标签**（`p736a-a07`）：两族的原型直到第 733 轮才**各自成格**，
  而 `Symbol.toStringTag` 那一趟没跟着铺过去 ⇒ `Object.prototype.toString.call(new WeakMap())`
  走到「缺 `Symbol.toStringTag`」那条**响亮的一抛**（Node 给 `"[object WeakMap]"`）。
  补法与 `Map` / `Set` / `Date` / `Promise` / 生成器那几族**同一处、同一张表**（两个名字两格）。
- **两个 `TypeError`**：
  - `Object.getPrototypeOf(null)` 原来落进「这一档还没做」那一抛（**普通 `Error`**）——
    规范里它是 `RequireObjectCoercible` 挡下的（`({}).__proto__` 的 getter 同一处），
    所以两个调用点一起改对（`p736b-b13`）。`"a"` / `1` / `true` 那三档照旧给原型。
  - `Object.setPrototypeOf(不可扩展的对象, 别的原型)` 原来**静默成功**（`p736b-b14`）：
    规范第一条是「不可扩展 ⇒ 给假」，而 `Object.setPrototypeOf` 拿到假就抛
    （`Reflect.setPrototypeOf` **不是同一档**——那一格给假，第 720 轮定的分界）。
    **同一个原型那一档不抛**（规范的第二句），所以先比原型、再问可扩展性。
- **五条如实登记**（都是另一条根，**不与上面那四格混着修**）：
  `JSON.rawJSON` / `isRawJSON` 要「这个值不许动」那一档；`Proxy` / `WeakRef` /
  `FinalizationRegistry` 三个全局名（后两个背后是 GC 的观察者时机）；
  `JSON.stringify` 看不见**元素区上的访问器**（与第 721 / 722 轮那条总根同一处——
  序列化那一趟也直读元素区）；私有字段漏进 `Object.getOwnPropertyNames`；
  基类构造里经 `super()` 调用时 **`new.target` 丢了**（降级层的一处接线）。
- **新语料 26 条**（`stdlib` / `runtime` / `exec` 各一个 `round736/`）：四格修好的各一条，
  加 17 条把这一批**本来就是对的**钉住（符号的注册表与 `description`、
  `Symbol.hasInstance` 与 `instanceof`、`Symbol.toStringTag` 覆写、符号键的可见性、
  `JSON` 的 replacer / reviver / `space` / `getter` 次序、描述符与原型、
  类表达式的名字、`try`/`finally` 的 `return`、`switch` 落空、`throw` 非 `Error`）。
- 五类 **7483 / 7827 → 7504 / 7853**、`blocked 258`（没涨）、`differ 91`
  （`+5` 是本轮登记的缺口、`-4` 是收掉的四格）、`bad` 0、`regressions` 0，加权 **96.1%**。

### 第 737 轮：迭代协议那一层——两格收掉、`yield` 后面跟逻辑运算符那一格登进来（coverage 7504/7853 → **7531/7886**）

这一轮的普查问的是**迭代协议**（36 条：数组 / 字符串 / `Map` / `Set` 的迭代器、
**码点迭代**、生成器的四种交互、`async` 与 `for await`、`Promise` 的形状），
29 条当场 pass、7 条没过，其中两条是**这一轮能收的**。

- **`WeakMap.prototype` 多挂了五格**（`p737d-d01`，**静默多给了功能**）：
  第 733 轮把 `WeakMap.prototype` 做成**并列的另一格对象**，可那五格
  `keys` / `values` / `entries` / `clear` / `forEach` 是 `Map` 独有的——
  实测 Node 的 `Object.getOwnPropertyNames(WeakMap.prototype)` 是
  **`constructor,delete,get,set,has`**（五格），`new WeakMap().keys` 就是 `TypeError`。
  收法是给 `InstallMapMethods` **加第四个形参 `weak`**（分界只有一条，不另写一张名单）。
  **顺带撞出来的第二处**：那一趟的「挂名字」借的是 `ReadOwn`，而它是「**缺这一格就抛**」
  ⇒ 少挂五格之后**装库当场抛**（`not a Map receiver (no keys)`，整份脚本一行都没跑）——
  换成与 `Map` 那一半同一形状的「`FindProperty` + 判空」。
- **私有字段不是一个属性名**（`p737d-d02`，第 736 轮登记的缺口）：
  降级层把 `#p` 存进属性表（不可枚举），而 `Object.getOwnPropertyNames` 这一支
  **恰恰不管 `enumerable`** ⇒ 实例列出 `["#p"]`，Node 给 `[]`。
  收法是那一趟加一句过滤，**两问一起问**：以 `#` 开头 **且** 不可枚举
  （只看开头会把用户真的 `{ "#p": 9 }` 也藏掉；只看不可枚举又收不掉它）。
  代价写在明处：`defineProperty(o, "#p", …)` 那种不可枚举的会被一起藏掉。
- **`yield` 后面跟逻辑运算符**（`p737b-b06`，**新登的缺口**）：`yield 1 && 2`
  **整份文件跑不进来**（`name is not a local or a capture: yield`）——
  投影出来的是 `BinaryExpression(left: Identifier "yield", &&, 2)`，
  那个 `1` 一个字都没留下。**分界是运算符的类**：`yield 1 + 2` / `yield a ? b : c` /
  `yield arr.length` 都对，只有逻辑那一族（`&&` / `||` / `??`）出这一格
  ——它们在 token 层是 `LogicalOperator` 那一支，链子成形时把前面的 `yield` 单元
  当成了自己的左操作数（JS 的读法是**整条链待在 `yield` 的操作数格里**）。
- **同一批又量到四条老根**（都登在已有的账上，**不重复登记**，只把新排版收进语料）：
  **迭代器就是那个数组**那一族（`[1,2].values()` 的 `JSON.stringify` / `Array.isArray`、
  取出 `next` 再 `call` 不推进游标——与 `p725a-b01` 同根）、
  **未启动的生成器上 `it.return(9)`**（与 `probe694-g04` 同根，第 713 轮 128 条回归那一条）、
  **`await` 一个 thenable 不调它的 `then`**（与 `runtime/async/041-await-thenable` 同根），
  以及**承诺续链的微任务格数与 Node 差一格**（`finally` 之后那一档早一格、
  `await` 已拒绝承诺走 `catch` 那一档晚一格——两支的读数都写进 `xl:why`）。
- **新语料 33 条**（`stdlib` 7 / `runtime` 19 / `exec` 7），另把第 736 轮
  `p736c-c03` 的台账撤掉（它转绿了）。
- 五类 **7504 / 7853 → 7531 / 7886**、`blocked 258 → 259`、`differ 91 → 96`
  （`+6` 新登记、`-1` 收掉）、`bad` 0、`regressions` 0，加权 **96.0%**。

### 第 738 轮：`yield` / `throw` 后面跟逻辑运算符那一格收掉，`await` 那一格登进来（coverage 7531/7886 → **7552/7908**）

这一轮的普查问的是**前缀词后面跟逻辑那一族**（`yield` / `await` / `return` / `throw` /
`typeof` / `void` / `!` / `delete`、以及它们在括号 / 实参 / 三元里的排版），
16 条起手，6 条**整份文件跑不进来**——**五条是同一条根**（`p738a-a01` / `a03` / `a06` /
`a07` / `b05`），而它正是第 737 轮刚登下的那一格。

- **根在 token 层的一句名单上**（`logical-operator.xl.md` 的 `IsLogicalOperatorStart`）：
  它认 `return` 是「逻辑段的起点」（`return` **自己不是一个操作数**、后面那一段才是），
  却没认 `yield` / `await` / `throw`——于是那三个词被卷进链子当左操作数：
  `yield 1 && 2` 的产物是 `LogicalOperator[yield, 1, &&, 2]`，
  投影取 `kids[0]`（那个词）当 `left`、**那个 `1` 一个字都没留下**，
  而那个词在链子里是 `Identifier`（不是 `Keyword`）⇒ 投影层给 `yield` / `await`
  准备的那两支（`kids[0].get("type") === "Keyword"`）**够不着它**
  ⇒ 降级期报 `name is not a local or a capture: yield`（整份文件进不来）。
- **收法是一句判定加三个词**（`return` 那一格补成 `return` / `yield` / `await` / `throw`）：
  段从**那个词的后面一格**开始、词自己留在外面当兄弟——`yield 1 + 2` 早就是这个形状
  （`Keyword(yield)` + `BinaryOperator`），`throw` 那一边在 `KEYWORD_STATEMENT_KINDS` 里
  本来就有 `ThrowStatement` 一格，缺的只是不让它被卷进逻辑段。
  **`yield` / `throw` 的操作数本来就该是整段表达式**（`AssignmentExpression` / `Expression`），
  所以这一改**两边一起对**。
- **`await` 不一样，登记在明处**（`p738a-a14` / `a16`，**静默错值**）：
  `await` 是**一元**前缀、比 `&&` 与 `+` 都紧（JS 里 `await x && y` 是 `(await x) && y`），
  而本仓把 `await` **后面那一整个单元**当成它的操作数。实测两条对照：
  `await Promise.resolve(1) + 1` 在 Node 里给 `2`、本仓给 `[object Promise]1`；
  `await Promise.resolve(0) && "T"` 在 Node 里给 `0`、本仓给 `"T"`。
  **它不是逻辑那一族的问题**（`+` 那一支一模一样）——根在投影层那句「`await` 收
  `kids.slice(1)`」，正确的读法是「只吃紧随其后的那**一个**操作数、剩下的照常折链」
  （第 711 轮收 `typeof o[k]().v` 用的就是这个形状）。
- **新语料 22 条**（`runtime` 16 / `exec` 6），另把第 737 轮 `p737b-b06` 的台账撤掉
  （它转绿了，用例留着当守卫）。
- 五类 **7531 / 7886 → 7552 / 7908**、`blocked 259 → 258`、`differ 96 → 98`
  （`+2` 新登记、`-1` 收掉，另有一条从 blocked 转成 pass）、`bad` 0、`regressions` 0，
  加权 **96.0%**。

### 第 739 轮：`await` 是一元前缀——**只吃紧随其后的那一格**（coverage 7554/7908 → **7575/7930**）

这一轮的普查问的是**`await` 的操作数**那一族（`await` 后面跟算术 / 逻辑 / 关系 / 三元 /
下标 / 成员链 / 一元前缀 / 实参 / 循环条件 / 承诺套承诺），22 条（`runtime` 16 / `exec` 6）
——同一轮里**收掉三格**（三条根，其中两条是第 738 轮刚登下的），另**新登一条**。

- **根一：投影层那句「`await` 收 `kids.slice(1)`」**（第 738 轮登记的 `p738a-a14` / `a16`，
  **静默错值**）：`await` 是一元前缀、比 `&&` 与 `+` 都紧（JS 里 `await x + 1` 是
  `(await x) + 1`），而 token 层**已经把后面那一整段折进了一个单元**
  （`BinaryOperator(x + 1)`）——照原样投就是把二元那一段整个塞进 `await` 的操作数。
  收法：**沿那个单元最左边那条脊摊平**，摊到第一个运算符处切开，剥出来的当 `await` 的操作数、
  剩下的（连同本层后面的兄弟）交给 `foldBinaryFrom` 照常折。
  平铺的形态（`await x > 0` 是 `[await, x, >, 0]`，关系运算符那一族不折进单元）走同一条路。
  **尾巴里有 `As` / `Satisfies` 时原样回落**（那两格的结合性本仓另有口径，抢过来会丢掉那一格）。
- **根二：`x && await y` 里那个内层 `await` 在产物里是 `Identifier`**（`p739a-a02`，
  **整份文件跑不进来**）：逻辑段是从**外层那个前缀词**后面起算的，内层那一个还没被
  `KeywordCloseRule` 升上去——而投影那一支只认 `kids[0].get("type") === "Keyword"`
  ⇒ 那一格投成**一个光秃秃的标识符**、它的操作数一个字都不留下 ⇒
  降级期报 `name is not a local or a capture: await`。
  收法与 `isOperatorUnit` 按文本认 `in` / `instanceof` **是同一个手法**：同一个词两态都要认。
- **根三：`typeof await p`——两层前缀叠在同一个一元单元里、操作数却掉在外面**
  （`p739a-a09`，**整份文件跑不进来**，报 `unimplemented: expression AwaitKeyword`）：
  产物是 `[UnaryOperator(typeof await), PropertyAccess(p)]`，而链那一支的入口条件
  （`kids[1]` 是 `.` / 下标 / **以调用开头**）一个都不成立 ⇒ 这个一元单元被单独投出去。
  两处一起补：① 入口多认「**一元单元 + 链尾**」这一形状（判据提到入口那儿，与里面那一支同一句）；
  ② 剥到末尾那个词时**往回退一格**（它自己也是要吃操作数的）；
  ③ 那个一元单元的 `expression` 本来就是 `undefined`（操作数缺），所以字段名要**按 `op` 文本定**
  （`typeof` / `void` / `delete` 那三格是 `expression`，其余是 `operand`）。
- **新登记 1 条**（`p739a-a14`，`differ`）：`await o?.p + 1` —— `?.` 那一条链的接线
  （第 729 轮那一族的邻居），同一条用例里 `as` 与 `!` 两格都过了。
- 另把第 738 轮 `p738a-a14` / `a16` 的台账撤掉（它们当场转绿，用例留着当守卫）。
- 五类 **7554 / 7908 → 7575 / 7930**、`blocked 258`（没涨）、`differ 96 → 97`
  （`+1` 新登记、`-2` 收掉）、`bad` 0、`regressions` 0，加权 **96.0%**。
- **一条自测的教训**：第一版在一个 `if` 里套了一个**裸块** `{ … }`，`cases:tsast` 当场红
  ——`dist/ts/typescript/print-ast-common.ts` **自己就是那一门语料的一份**（缺 61 漂 6 多 14）。
  改成直接展开之后就绿了。

### 第 740 轮：一元前缀 / 后缀与**链**的接线——`?.` 那一格、`.` 不是切点、`delete` 的四个壳（coverage 7575/7930 → **7599/7954**）

这一轮的普查问的是**一元前缀 / 后缀打在链上**那一族（成员 / 下标 / 调用 / 可选链 /
字面量 / 嵌套一元 / 前后缀 `++` `--` 的写回 / 实参与模板里的一元），24 条
（`runtime` 18 / `exec` 6）——**24 条全过**，而同一轮里**收掉三处**：
两条是新量出来的根，另一处是**第 739 轮自己留下的回归**（这一轮的候选当场红出来的）。

- **根一：`?.` 接在一元前缀后面那一格只认 `expression`**（`p740a-a07`，**静默错值**）：
  `!o?.p` / `-o?.p` / `~o?.p` / `+o?.p` 全都错——本仓给 `undefined`、Node 给 `false` / `-1`。
  第 178 轮那一支（「一元前缀 + `?.`」）**只认 `TypeOfExpression` 那一族的字段名**
  （`expression`），而 `!` / `~` / `+` / `-` / `++` / `--` 是 `PrefixUnaryExpression`
  （字段叫 **`operand`**）⇒ 整支不进、掉到通用路：`?.p` 被接到**那个一元节点的结果**上
  （`(!o)?.p`）。这与第 711 / 739 两轮在链那一支踩到的是**同一格**
  （同一个形状两处各写一遍就会漂）。
- **根二：`.` 不是切点**（`p740b-b06`，**第 739 轮的回归**）：`typeof (await Promise.resolve("s"))`
  里那对括号的子单元是**平铺的一串** `[await, Promise, ., resolve(…)]`（链没折成
  `PropertyAccess` 单元），而第 739 轮那句「在第一个运算符处切开」把 `.` 也当成了运算符
  ⇒ 折出 `(await Promise) . resolve` ⇒ 降级期报 `name is not a local or a capture: resolve`。
  修法两处：**`.` 跳过不算切点**（它是成员访问的续接），且**尾巴里出现平铺的 `.` 时也回落**
  （`operatorRank` 给不出名字的一律 7，`foldBinaryFrom` 会把那个 `.` 当运算符）。
- **根三：`delete` 打在括号 / `as` / `!` 包着的成员上**（`p740a-a12`，**整份文件进不来**）：
  `delete (o.b as any)` 的表达式最外层是 `ParenthesizedExpression`（里面还套着
  `AsExpression`），而降级那一支只看最外层那一格 ⇒ 报
  `unimplemented: delete of ParenthesizedExpression`。**四个透明壳先剥掉**
  （括号 / `as` / `satisfies` / `!`）——它们都不改变「删的是哪一格」。
- 五类 **7575 / 7930 → 7599 / 7954**、`blocked 258`（没涨）、`differ 97`（没涨）、
  `bad` 0、`regressions` 0，加权 **96.0%**。
- **又一条自测的教训**（与第 739 轮那次同一处）：这一轮第一版把「两个字段名」写成了
  **嵌套三元** `a ? b : c ? d : e`，`cases:tsast` 又当场红（缺 `ConditionalExpression` +
  `ColonToken`，13 缺 1 漂 2 多）——**产物自己是那一门的语料**，所以**嵌套条件表达式那一格
  本仓还没认全**这件事，是写这一层代码时踩得到的。改成一条条 `if` 就没有这一格。

### 第 741 轮：可选调用 `?.()` 那一族的普查——收掉 `await` 的一条，登记六条（coverage 7600/7954 → **7614/7974**）

这一轮的普查问的是**可选调用**那一族（`?.` 链上的调用、`?.[]` 之后的调用、
可选调用与一元 / 二元 / `await` / 实参 / 条件 / `delete` 的排布），20 条
（`runtime` 14 / `exec` 6）——**14 条过、6 条登记**（5 `differ` + 1 `blocked`），
同一轮里**收掉第 739 轮登记的那一条**（`p739a-a14`）。

- **收掉的一格：`await o?.p + 1`**（第 739 轮登记的 `differ`，**静默错值**）：
  产物是 `[Keyword(await), Identifier(o), BinaryOperator(+( NCO(p), +, 1 ))]`——
  `?.p` 属于 **`await` 的操作数**那一截链（JS 里是 `(await (o?.p)) + 1`），
  而它长在**那个二元单元的第一个孩子**上（与 `t?.get(k) ?? d` 那一族同一形状）。
  修法两处：① 找切点那一趟要**把「运算符单元」本身也算切点**（摊平那一趟只摊**头一格**，
  所以它留在了平铺串里）；② 切出来之后把那个 `NCO` 接到操作数上、`await` 套在外面，
  剩下的交给 `foldBinaryFrom`。少了这一支，老路会把 `?.p` 接到**整个 `await` 节点的结果**上
  （`(await o)?.p`）⇒ 本仓给 `[object Promise]1`、Node 给 `3`。
- **登记六条，一条根**（第 729 轮登记过的那一族，这一轮量到了它的另外五种排版）：
  **实参括号与「已折好的那一格」之间没有接线**——
  `o?.["m"]()` 的产物把**下标括号与实参括号一起**装进同一个 `NCO`，
  而投影只认两种形状（`NCO` 第一格是 `Method`，或第一格是 `PropertyAccess` 且头一格是
  实参括号）⇒ 落回「按成员名折属性访问」⇒ **交出方法本身**（`p741a-a02` / `p741b-b05`）；
  `o.a?.m?.()` 的第二个 `NCO`（实参括号那一个）落成**平级**⇒ 静默给 `undefined`（`p741a-a03`）；
  `o?.m() * 2 + o?.m()` 的右操作数那半截掉在**二元单元外面**当兄弟（第 145 轮那一族，`p741a-a07`）；
  `(await o?.m)()` 与 Node 差一整层（`p741a-a06`）；`o?.m()()` 报
  `cannot call a non-closure value`（`p741a-a09`，**整份文件断在这里**）。
- 五类 **7600 / 7954 → 7614 / 7974**、`blocked 258 → 259`、`differ 96 → 101`
  （`+5` 新登记、`-1` 收掉）、`bad` 0、`regressions` 0，加权 **96.0% → 95.9%**
  （分子 +14、分母 +20）。

### 第 742 轮：`switch` 那一族与语句 / 循环的角落普查——收掉基类的 `super`（coverage 7614/7974 → **7658/8017**）

这一轮的普查分两批：**`switch` 那一族**（fallthrough、`default` 在中间、
未匹配的 `case` 表达式**不求值**、`switch (true)`、带标签的 `switch`、`case` 里的块与闭包、
嵌套 `switch`、严格相等下的 `NaN` / `-0` / `"1"` 对 `1`）与**语句 / 循环**那一族
（`do...while` 的 `continue`、无头 `for`、悬垂 `else`、空语句、带标签的块、
`finally` 的顺序与 `return` 覆盖、非 `Error` 的 `throw`、`for...in` / `for...of` 的跳出），
共 **42 条**（`runtime` 35 / `exec` 7）——**42 条全过**（这一族本仓已经扎实，
量下来一条缺口都没有）。

- **收掉的一格：没有 `extends` 的类里的 `super`**（第 693 轮登记的 `differ`，
  `exec/classes/probe693b-k32`，**静默错值**）：`class A { m() { return super.toString } }`
  本仓给 `undefined`，Node 给 `Object.prototype.toString` 那个函数。
  根子是**一个字段承担了两件事**——`SuperName` 是父类的**名字**，
  而基类「父类叫 `Object`、没有名字」⇒ 空串同时表示「基类成员」与「根本不是类成员」
  （普通函数里写 `super`），`SuperStartSlot` 只能一律给 `-1`。
  修法：给排队函数加第三位 **`SuperBase`**（有没有家对象）与对应的 `InSuperBase`，
  与 `SuperName` / `SuperStatic` **同一处设、同一处恢复**；`SuperStartSlot` 里空串先问这一位，
  是基类就交给新的 `SuperBaseFromThis`——**从 `this` 反推家对象**
  （实例成员 `get_proto` 走**两层**：`this` → `C.prototype` → `Object.prototype`；
  静态成员走**一层**：`this` 就是 `C` → `Function.prototype`）。
  `super.m()` 那一支也接上同一个起点（**基类里 `super.m()` 现在与 Node 一样抛 `TypeError`**，
  以前会找到自己 ⇒ 无限递归）；`super.x = v` 那一半共用 `SuperStartSlot`，跟着一起对了。
  **类降级那两处盖章**从「只有 `baseName !== ""` 才盖」改成**一律盖**——
  `SuperStatic` 一并挪出那个 `if`（基类静态成员的起点是 `Function.prototype`，
  不盖的话会和实例成员走同一个层数）。
  **已知差别写在明处**（与对象字面量那一支同一条口径）：JS 的家对象是**词法**绑定的，
  这里是**从 `this` 反推**⇒ `C.prototype.m.call({})` 换了接收者就换了起点。
- **`switch` 那一族量到的一条本仓做对、值得钉住的语义**（新用例当守卫）：
  匹配上之后**后面的 `case` 表达式不再求值**（`p742c-c03`：`t("e")` 一次都没跑）、
  `default` 写在中间也**最后才匹配**、匹配到了再往下落（`p742c-c02`）、
  判别式**只求值一次**（`p742b-b02`）、`switch` 里的 `break` 只出 `switch`
  而 `continue` 出循环（`p742a-a08`）、`case` 的引用相等与 `-0` / `NaN` 那两格
  （`p742a-a05` / `p742a-a06` / `p742c-c10`）。
- 五类 **7614 / 7974 → 7658 / 8017**（**+43 条新用例、+1 条收掉**）、
  `blocked 259`（没动）、`differ 101 → 100`（`-1` 收掉）、`bad` 0、`regressions` 0、
  `moved` 0，加权 **95.9% → 95.9%**。

### 第 743 轮：**下标调用链落进二元单元**那一族——收掉第 711 轮登记的三条（coverage 7658/8017 → **7669/8027**）

这一轮问的是**「以一次下标开始的调用链」落在二元操作数位上**那一族
（第 692 轮收了 `o["f"]().v` 单独出现、第 711 轮收了一元前缀那一半，剩下二元这一半）：

- **收掉的三格**（第 711 轮登记的 `differ`，**静默错值** + 一处**整条报错**）：
  `exec/round711/p711b-b01`（`o[k]().v + ""`）、`b02`（`1 + o[k]().v`）、
  `b03`（`o[k]().v === 1`）。根是**同一个形状的两个朝向**——token 层把链的**下一截**
  （调用括号 + 后缀，见 `isCallFirstUnit`）折进了**那个二元单元**：
  · **续格在二元单元里面**（`o["f"]().v + 1` 的产物是
    `[PropertyAccess(o,[f]), BinaryOperator( PropertyAccess(Bracket(()), ., v), «+», 1 )]`）——
    链那一支的入口只认「第二格是点号 / 下标 / 以调用开头」，这里第二格是**二元单元**
    ⇒ 整支让开；尾巴那一支又把这一格当成「以运算符开头的一串」递给 `foldBinaryFrom`，
    可它是一格**单元** ⇒ `rest.length < 2` 直接返回 `left` ⇒ 交出**那个函数自己**。
    修法：入口加一条判据 `chainTailInOperator`（二元 / 逻辑单元，且**第一格**以调用开头，
    **要递归**——`o[k]().v * 2 + 1` 是两层套着），摊平那一趟把续格摊成平级、
    运算符与右操作数**原样留在后面**交给尾巴那一支。
  · **续格掉在二元单元外面**（`1 + o["f"]().v` 的产物是
    `[BinaryOperator( 1, «+», PropertyAccess(o,[f]) ), PropertyAccess(Bracket(()), ., v)]`）——
    「二元单元在头」那一支的 `tailIsChain` 只认 `.` 与 `?.` ⇒ 右操作数只到 `o["f"]` 为止。
    修法就是把这一个判据扩成「`isCallFirstUnit` 也算续接」。
- **顺带量到的两条**（都登着台账，不在这一轮的收成里）：
  `typeof o["f"]().v + ""`（一元那一支要的是「操作数只到第一个更松的运算符为止」，
  而链那一支进去之后把尾随的 `+ ""` 也折进了操作数）与
  `o["f"]().v + o["f"]().v`（两半在同一个表达式里同时出现时第二截没接上，
  降级期报 `name is not a local or a capture: v`）。
- 五类 **7658 / 8017 → 7669 / 8027**（+6 条 token 用例、+4 条 `exec` 用例、+3 条收掉）、
  `blocked 259 → 261`（+2 条新登的缺口）、`differ 100 → 97`（-3 收掉）、
  `bad` 0、`regressions` 0、`moved` 0，加权 **95.9% → 96.0%**。

### 第 744 轮：**一元前缀 + 下标调用链 + 更松的二元**——收掉第 743 轮登记的那一条（coverage 7669/8027 → **7673/8031**）

这一轮接着上一轮把**同一个形状的第三个出口**收掉：`typeof o["f"]().v + ""`
（第 743 轮登记，也见 `!o["f"]().v + ""` 与 `typeof o["f"]().v === "number"`）。

- **收掉的那一格**：产物是
  `[UnaryOperator(typeof o["f"]), BinaryOperator( PropertyAccess(Bracket(()), ., v), «+», "" )]`
  ——一元单元里装的是**操作数的头**，而**续格与更松的运算符一起**在下一个单元里。
  第 743 轮那条链支进去之后会把 `+ ""` 一起折进操作数 ⇒ 那个一元单元盖住整段
  （TS 只盖 `o["f"]().v`：缺 1 漂 1 多 2）。**一元比二元紧**，所以修法是**把那个单元拆开**：
  新助手 `splitChainTailInOperator` 给出「续格那一格」与「运算符 + 右操作数」两段——
  续格递回 `projectExpression`（并且**给的是那一格单元本身、不是摊平的几格**：
  链那一支认的是没摊开的形状，裸的 `(` 兄弟不在它的入口判据里——**这一条踩过一次**，
  第一版递了摊平的那一份，症状是折出一个 `操作符是 DotToken 的 BinaryExpression`），
  运算符那一段交给 `foldBinaryFrom` 在外层折。顺带把「操作数挂回一元节点」那段
  （`expression` 与 `operand` 两个字段名 + 按 `op` 兜底）抽成 `attachToUnary`，两个调用点共用。
- **仍开着的一条**（新登记）：`1 + o["f"]().v + 2`——中间那一格收掉了，可**再往后接一个运算符**
  时 token 层换了形状（缺 2 漂 1 多 3）；`o["f"]().v + o["f"]().v`（第 743 轮登记的
  两个朝向同时出现）也还开着。
- 五类 **7669 / 8027 → 7673 / 8031**（+3 条 token、+1 条 `exec`、+1 条收掉、+1 条新登）、
  `blocked 261`（没动：撤一条、登一条）、`differ 97`、`bad` 0、`regressions` 0、`moved` 0，
  加权 **96.0%**。

### 第 745 轮：**边界口径普查**——四处真错值收掉、一条新登（coverage 7673/8031 → **7683/8042**）

这一轮不追形状（前几轮追的是 token 层的投影），而是**把内建的边界口径整片量一遍**：
74 条原子探针（`flat` 的深度、`repeat`/`padStart` 的巨值、`reduce` 的消息、
`lastIndexOf` 的负零、以及 `fill`/`copyOut`/`splice`/`sort`/`split`/`toFixed`/`Math` 那一族的边角），
量出来的**通过 65 条**照原样进矩阵，**四处真错值**在这一轮收掉：

1. **`flat` 的深度实参走 `IntArgOr`（共用那一份），不再手写第二张表**。
   手写那一段是第 274 轮留下的，理由写着「`IntArgOr` 走 `AsInt()`、`Infinity` 会与 1 分不开」
   ——**那一句在第 702 轮就过期了**（`IntArgOr` 现在走 `NumArgOr` + `IntOfNumber`，
   `Infinity` 明明白白折成 2³¹-1）。代价是**它比共用那一份窄**：
   `flat("2")` 与 `flat({ valueOf: () => 2 })` **静默不摊**（JS 各摊两层）。
   收法：`const depth = IntArgOr(room, call, protos, table, args, 0, 1)`——
   **`fallback` 递 1、不是 0**：这一族只有 `flat` 的缺省是 1，
   第一版递了 0（照抄 `slice`/`charAt` 的缺省）⇒ `flat(undefined)` 一层都不摊。
2. **`repeat` / `padStart` / `padEnd` 的乘积溢出**（新常量 `MaxTextUnits`）。
   `room` 收的字节数是 `CodeUnitCharge * total`，那个乘积在 32 位 `int` 里算——
   总长到 2³⁰ 那一格乘积就是 2³¹、**绕成负数**，于是「问房间」问的是**一个负数**（当然放行），
   接着逐码元 `push` 进一个几亿格的 JS 数组，**把宿主进程压死**
   （症状是宿主 OOM，**不是**一条能被脚本接住的错）。
   界取 **2³⁰-1**——**按乘积算，不按直觉的「10 亿」算**：第一版取 2³⁰，
   实测 `"abcd".repeat(2 ** 28)`（总长恰好 2³⁰）**照样压死**。
   `padStart` 那一格的判据写成 `total > MaxTextUnits - units.length`
   （写成 `units.length + total > MaxTextUnits` 的话，**防溢出的那一句自己溢出**）。
3. **`reduce` 空数组的消息逐字对上 `node`**：`"Reduce of empty array with no initial value"`
   ——原来写的是 `"reduce of an empty array with no initial value"`（族对、**文本不对**，
   而 `e.message` 是脚本直接看得见的东西）。
4. **`lastIndexOf` 的负零起点**：`[1,2,3].lastIndexOf(1, -0)` 在 JS 里 `from` 是 `+0`，
   本仓给 **`-0`**（`console.log` 打出 `-0`，而 `-0 === 0` 为真——最难被当成错的那一种）。
   根子在 `IntOfNumber` 那一句向零截断（规范要的正是 `ToIntegerOrInfinity(-0) = -0`），
   所以夹在调用点：`from = from + 0`（唯一能把 `-0` 折成 `+0` 的写法），
   且必须在 `from < 0` 那一判**之前**（`-0 < 0` 是假，负零会原样活过那一支）。

- **新登记一条**（`stdlib/round745/gap745-float-literal-eats-nan`）：
  `flat(NaN)` 与同一语句里的一个数值字面量一起喂给同一个内建时，
  **后一个调用点的实参被前一个顶掉**（`a.flat(1.9), a.flat(NaN)` 里第二格拿到 `1.9` 的折值）。
  边界已量清：拆成两个 `console.log` 就对；`NaN` 先存进 `const` 再传照样错；
  整数实参（`flat(2)`）也照样错——所以是**语句内**的实参落格，不是 `flat` 那一支。
  与上面四处不是同一处，如实登着、**不猜**。
- 用例：`stdlib/round745` 9 条（`array` 的 `flat` 深度两档 + `Array` 构造的非法长度、
  `string` 的巨值 `pad/repeat`、`lastIndexOf` 负零、`reduce` 消息、数组 / 字符串数字 Math /
  Object Map Set JSON 迭代三份普查收编）+ 1 条 `xl:want differ` 的台账。
- 五类 **7673 / 8031 → 7683 / 8042**（+11 条 stdlib）、`blocked 261`（没动）、
  `differ 97 → 98`（+1 新登）、`bad` 0、`regressions` 0、`moved` 0、`newlyPassing` 0，
  加权 **96.0%**（分子 +10、分母 +11——新登的那一条是分母）。

### 第 746 轮：**运行时那一侧的边界普查**——四处收掉、两条新登（coverage 7683/8042 → **7695/8052**）

上一轮量的是内建函数的边界，这一轮换一组面：**生成器 / 访问器 / 迭代协议 / Date / 描述符**。
30 条原子探针量出**四处真错值**，全在这一轮收掉：

1. **`it.return(v)` / `it.throw(v)` 打在还没跑过的生成器上**（`runtime/round746/p746a-a01`）。
   JS 的生成器有一个本仓没有的 `suspendedStart` 状态：体一次都没跑过时
   `GeneratorResumeAbrupt` **不执行体、也不跑 `finally`**，直接把生成器关掉
   （`throw` 把值抛给调用方、`return` 把它当完成值）。本仓三档
   （`Suspended` / `Running` / `Done`）把「还没开始」记成了「挂起」⇒
   `function* g() { yield 1; }` 的 `g().return(9)` 给 `{value: 1, done: false}`
   （Node 给 `{value: 9, done: true}`），**而且体里的副作用真的跑了**
   （`g().return(9)` 会执行 `console.log("body")`，Node 一个字都不打）。
   修法：`HeapGenerator.Started` 一格（`heap.xl.md`）+ `DoIterNext` 里那一档。
   **这就是第 713 轮试过、因为 128 条回归而撤回的那一处**——当时的判据只写「函数体开始跑过没有」，
   于是**正常恢复那一档也被拦了**；这一版把闸门收在 `(raises || returns)` 上，
   实测回归 0（那一族的账留在 `probe694-g04` / `p737a-a10` 两条用例的历次 `xl:why` 里）。
   顺带把**完成值**记下来（`HeapGenerator.CompletedValue`，GC 那一趟也要标记）：
   `it.return(8)` 问两次给同一个答案，`yield* g()` 那个表达式的值才不是静默的 `undefined`。
   两条旧台账因此转绿并撤掉指令（`differ 98 → 96`）。
2. **方法调用那一侧的 `return()` 漏了一档**（第 336 轮做的 `return()` 只接在
   `DoCallValue` 上）。`CallNative`（重入路）原来对 `stepKind === 2` **响亮地抛**——
   而第 336 轮把 `return()` 做掉之后那一句**没有跟着改**，于是它变成了
   **另一句话**：把 `return(9)` 当成 `next(9)` 跑。两条路的修法现在一字不差。
3. **数组下标位上的访问器**（`stdlib/round746/p746b-b01`）。数组的元素住在**独立的一段**里，
   而访问器只能住在属性表里 ⇒ 两摞都在时访问器**永远读不到**：
   `Object.defineProperty([1,2,3], 1, { get: () => 99 })` 的 `a[1]` 本仓给 `2`。
   三处一起修：① 装访问器那一处（`DefineAccessor` 与 `DefineOwnFromDescriptor`）
   把元素那格**摘成洞**（越界那一档先把数组撑长）；② 读那一趟（`RtOp.GetIndex`）
   用新判据 `IndexAccessorAt` 问一句，是访问器就改走 `GetProperty`（只有它调 getter）；
   ③ `JSON.stringify` 那一趟同理（原来洞读成 `undefined` ⇒ `[1,null,3]`）。
   顺带把**枚举次序**修对：整数键要**合并排序**再push（`Object.keys` 与
   `getOwnPropertyNames` 各一处），`length` 排在全部整数键之后——`p721a-a15` 当场红过。
4. **冻结的数组上 `sort()` 该抛 `TypeError`**（判据 `p746d-d01`）。排序要写每一格，
   而冻结之后没有一格可写——本仓原来**一声不响地把整趟跑完**。判据用 `Extensible`
   （与 `RequireArrayGrowable` 同一处），只管**就地**那一档（`toSorted` 跑在副本上）。

- **两条新登记**（都量清了根子、都写了 `xl:why`）：
  `gap746-forof-early-exit-not-lazy`（`for..of` 的**惰性**：本仓 `GetIterator` 对
  `Symbol.iterator` 那一档是「跑干再当数组用」，于是 `next()` 的次数、
  提前退出时的 `return()`、以及**无限迭代器**三件事都错——收它要引擎侧一个新载具，
  不是接线）；`gap746-array-accessor-out-of-range-enumerable`（**越界**下标访问器的可枚举位：
  已有的那一格缺省是真、越界那一格缺省是假，本仓两条都按真走——**差的是一个键不是一个值**）。
- 用例：`runtime/round746` 3 条（生成器两档 + 迭代协议）、`stdlib/round746` 8 条
  （访问器读 / Date / 描述符 / 展开解构 / 迭代 / 冻结与 `structuredClone` + 两条台账）。
- 五类 **7683 / 8042 → 7695 / 8052**（+1 exec、+9 stdlib、+2 runtime）、
  `blocked 261`（没动）、`differ 97 → 96`（−2 收掉、+1 新登，另两条是这一轮自己量的）、
  `bad` 0、`regressions` 0、`moved` 0、`newlyPassing` **2**，加权 **96.0%**。

### 第 747 轮：**控制流与承诺那一侧的普查**——19 条探针全过、一条新登（coverage 7695/8052 → **7711/8069**）

第三轮的探针换到**控制流与承诺**这一面：类（字段 / 静态块 / 私有品牌 / `super` 四条路）、
闭包捕获（`let` / `const of` / 计数器 / `while` 里的 `const`）、`this` 的四种绑定、
`try`/`catch`/`finally` 与 `return` / `continue` 的次序、`switch` 的贯穿与 `default` 位置、
标签（嵌套循环 / 裸块 / `try`）、`&&`/`||`/`??`/`?.` 的短路范围、解构与默认值、
`console.log` 的渲染、数字到文本的三方一致、字符串三兄弟、`sort` 的稳定性与 `to*` 族、
`Object.keys` 族在数组 / 字符串 / 类数组上。**19 条探针 16 条当场通过**，
这一轮的用例基本是**把已经对的形状钉住**（回归网），另外量出一条新缺口：

- **新登记一条**（`runtime/round747/gap747-promise-chain-order`）：
  **两条互不相干的承诺链同时在飞时，后两行的次序反了**。
  `node` 给 `… / fin / chain caught:boom2 / after fin 2`，本仓给 `… / fin / after fin 2 / chain caught:boom2`。
  **单独跑每一条链，两边的次序都对**（内容一字不差）——差的只是
  「两条链同时排着时谁先落到队列尾」，也就是**每一次 `then` 恢复到底让出几个微任务**。
  规范里 `PromiseReactionJob` 是**一个**任务，而本仓的 `SettlePromise` / `MakePromise`
  那几处（第 285 / 318 轮）在每一跳上排了几个——数一遍才能说清，而「数一遍」
  正是收它的第一步。**这不是「先后无所谓」**：`await` 的次序是脚本看得见的东西。
- 用例：`runtime/round747` 13 条（类两条 / 闭包 / `this` / 承诺 / `async` /
  `try` / `switch` / 标签 / 逻辑与可选链 / 解构 / 渲染 + 一条台账）、
  `stdlib/round747` 4 条（数字到文本 / 字符串三兄弟 / `sort` 与 `to*` / `Object.keys` 族）。
- 五类 **7695 / 8052 → 7711 / 8069**（+12 runtime、+4 stdlib、另 1 条进分母是新登的台账）、
  `blocked 261`（没动）、`differ 98 → 97`（+1 新登，两条旧台账上一轮收掉了）、
  `bad` 0、`regressions` 0、`moved` 0、`newlyPassing` 0，加权 **96.0%**。

### 第 748 轮：**词法绑定 / 抛出的形状 / 集合迭代 / 渲染**那一侧的普查——收掉两处、新登 6 条（coverage 7711/8069 → **7731/8095**）

这一轮的探针换到**词法绑定与「跑不进来」的那一类**上（TDZ / `typeof` / 提升 /
标签 / 抛出的形状 / `in` / 实例判定 / 删除 / 集合成员在迭代中的流向 / 渲染的深度与环），
26 条探针 **20 条当场通过**，收掉**两处根**、新登 **6 条**：

- **`delete` 打在原始值接收者上**（**整份文件进不来**，判据 `p748a-a08`）：
  `delete (s as any)[0]` / `delete (1 as any).x` 在 JS 里**恒给 `true`**——
  `ToObject` 造出来的那个包装对象当场被丢掉，规范那一步
  （`DeletePropertyOrThrow`）只看「成功了吗」。而 `runtime/vm.xl.md` 的 `del_prop`
  那一支**响亮地抛**（`unimplemented: delete on a primitive receiver`）⇒
  整份文件一行都跑不了。**这不是「静默收下」**：`true` 正是 JS 的答案。
  修法是一支分流（`if (!slots[base].IsObject()) return Value.FromBool(true)`），
  排在 `ToPropertyKey` **之前**（键的求值照旧发生——那是实参的求值）。
- **`Object.assign(null, {})` 抛的是普通 `Error`**（判据 `p748b-b05`）：
  规范第一句是 `ToObject(target)`，它对这个值**只抛 `TypeError`**
  （Node 的 `e instanceof TypeError` 为真），而 `globals.xl.md` 那一支把
  「`null` / `undefined`」与「原始值目标（装箱那一层本仓没做）」**合在一句里**抛。
  修法是 `null` / `undefined` 单开一档抛 `TypeError`；**原始值目标照旧响亮地抛**
  ——给一个假的装箱结果比抛坏得多（这一条写在用例的期望里）。

**新登的 6 条**（各是一条独立的根，根因写在每条用例自己的 `xl:why` 里）：

1. **TDZ 那一格的 `typeof`**（`p748a-a01`）：块里 `let x` 在**声明之前**被 `typeof`
   读到，JS 抛 `ReferenceError`、本仓给 `"undefined"`（**静默错值**）。
   根在 `NameIsUnreachable`：它只回答「这个名字在不在作用域链上」，
   **不分「找不到」与「还压在 TDZ 里」**——那一处的注释第 149 轮就写着这条缺口。
   **普通读不受影响**（`ResolveAccess` 照旧抛）。
2. **块里的函数声明在声明之前调用**（`p748a-a03`）：JS 把它提升到**块顶**（Node 照常打出
   `block decl`），本仓报 `cannot call a non-callable value`——本仓的提升只到**函数层**。
3. **`delete` 字符串下标**（`p748a-a08` 的第三行）：JS 给 **`false`**
   （那一格是字符串异质对象上**不可配置**的一格），本仓给 `true`。
   **与第 1 条修法不是同一件事**：`delete (1).x` / `delete s.missing` 两边都是 `true`，
   只有「字符串的下标」这一档要答 `false`——本仓没有那一层（下标是现算的）。
4. **`console.log` 打自引用对象**（`p748a-a11`）：Node 给 `<ref *1> { a: 1, self: [Circular *1] }`
   （按**已见过的引用**截断），本仓给三层展开之后 `[Object]`（按**深度**截断）。
   **值本身是对的**（`o.self.self === o` 两边一样为真），差的只是渲染口径。
5. **`.then(undefined)` 不把源那一档传下去**（`p748a-a16`）：规范里
   `onFulfilled` 不是 callable 就换成 `Identity` / `Thrower`，于是 Node 给
   `skip`（后面那一跳收到 **`1`**），本仓给 `skip undefined`。
   **这一轮把它量到底了一层**：不是「有没有传」，而是**结清值到不了任务上**——
   `.then(f)` 挂在**已经结清**的承诺上时 `ScheduleTask` 把值接进 `args`，
   而队列里那一格**可能当轮就被跑掉**、随后**同一个槽被下一个任务复用**
   （`FindFreeTask` 的判据是 `Callback` 不是引用）⇒ 那一次的结清值跟着被冲掉
   （实测：跑 `.then(5)` 那一格时 `args` **是空的**）。**试过两版都退回了**
   （一版在 `IsRef` 那一句旁边分流、`tsc` 报 `carried` 用在声明之前；
   一版给 `NativeTask` 添一格 `Settled`——那一版连 `Promise.resolve(1).then(undefined)`
   都没通，说明结清根本没走到 `ResolvePromise`），**为了不带崩承诺那一族，工作树里
   没有留下任何一版的痕迹**。下一步是把「已经结清那一支」与 `DrainMicrotasks`
   的**交错**量清楚。
6. **`for…of` 一个遍历中改动的 `Map` / `Set`**（`p748b-b01`）：迭代器是**活的**——
   删掉的那格跳过、新加的看得见；本仓的 `for..of` 走 `GetIterator`，而它交出来的
   是**一份快照数组**。**这是第 687 轮就登记的那条根**
   （`stdlib/map-set/110-forof-live-view-not-taken`），这一条把「删掉」与「新加」
   两个方向钉在同一份语料里。

用例：`runtime/round748` 16 条、`stdlib/round748` 10 条。
五类 **7711 / 8069 → 7731 / 8095**（+15 runtime、+9 stdlib、另 2 条是新登记的台账）、
`blocked 261`（**没动**）、`differ 97 → 103`（+6 新登）、`bad` 0、`regressions` 0、
`moved` 0、`newlyPassing` 0，加权 **96.0% → 95.9%**（新登记缺口的账，不是回归）。

### 第 749 轮：**生成器与迭代协议 / `for await` / 模板 / 属性次序**那一侧的普查——零收、三登、两条旧账到期（coverage 7731/8095 → **7754/8121**）

这一轮的探针换到**生成器与迭代协议**那一面，外加模板字面量、属性次序与描述符、
`for…in`、`call`/`apply`/`bind`、`do…while` 与逗号表达式。26 条探针 **23 条当场通过**，
**这一轮没有收掉任何一处根**：新登 3 条，另把两条**旧台账**按规矩撤掉。

- **两条旧台账到期**（`coverage` 报 `NEWLY-PASSING`、这一轮撤掉那两行指令）：
  `runtime/round736/p736b-b08`（`JSON.stringify` 看不见**元素区上**的访问器：
  `Object.defineProperty(arr, "1", { get })` 之后 `JSON.stringify(arr)` 该给 `[1,"g"]`）
  与 `stdlib/round721/p721a-b08`（**空数组**上装下标访问器时 `length` 该跟着顶到 `2`）。
  两条都是第 721 / 736 轮登的，此后的轮次把它们修好了、台账没跟着撤——
  **这正是「登记过的照样每次真跑」这条纪律的用处**：它们自己会喊。
- **新登 3 条**（根因逐条写在用例的 `xl:why` 里）：
  ① **松散模式下形参与 `arguments` 的别名**（`p749a-a12`）：
     `function h(a) { a = 99; return arguments[0] }` 在 Node 里给 **`99`**、本仓给 `1`
     （反方向 `arguments[0] = 42; return a` 同样给 `1`）。根在**值模型**：
     形参住在**帧的槽**里，而 `arguments` 是开帧时（`SetupArguments`）**另造的一个数组**
     ——**两份存储**，写一份看不见另一份。收它要么让下标读写成**转发**、
     要么在形参赋值那一趟写回，而「哪些形参被别名」还要按**松散 / 严格**分档
     （严格模式与箭头函数**不**别名）。同一族的另一处（`arguments` 是数组、
     `Array.isArray` 为真）第 702 轮已经登在
     `stdlib/object/138-object-tostring-arguments-gap`。
  ② **两级可选链 + 二元运算符**（`p749a-a15`，**静默错值**）：
     `o.a?.b?.c + 1` 本仓给 `[object Object]1`（拿到的是 `o.a` 那个**对象**）、
     `o.a?.b?.c ?? 9` 给 `{ c: 1 }`——Node 两处都给 `2` / `1`。
     **分界这一轮量清了**：`o.a?.b`（一级）对、`o.a.b?.c`（点号链后一级）对、
     `o.a?.b?.c` **单独用（不带运算符）也对**——只有「**两级 `?.` 再接一个运算符**」错。
     根在 token 层的 `BinaryOperatorCloseRule.Process`（`binary-operator.xl.md`）：
     第 156 轮给「`?.` 链是一条链」加的往前多走那一趟，判据是「前面是 NCO、
     NCO 前面**还是** NCO」——从 `NCO(c)` 退到 `NCO(b)` 就停了，
     于是**链的起点**取成了 `a`，而 `o` 与那个 `.` **留在 `BinaryOperator` 外面**
     （实测 XML：`[Identifier(o), Symbol(.), BinaryOperator(??)( Identifier(a), NCO(b), NCO(c), ??, 9 )]`）。
     **这一轮没有动那一支**：它上面压着可选链那一整片判据（第 156 轮的第一版
     「对所有 NCO 都往前收」当场掉了两条 `cases:tsast`，退回之后才收紧成今天这一条）。
  ③ **`Error.stack` 那一格**（`p749b-b06`）：Node 给**字符串**、本仓给 `undefined`
     ——与第 697 / 704 / 708 轮登记的是**同一条根**（`stackTraceLimit` /
     `captureStackTrace` 第 704 轮挂上了，**栈本身**没有）。本用例把它钉在
     `Error` 家族形状的旁边（`message` / `name` / `instanceof` 链 /
     `Object.prototype.toString.call(e)` 那几格**都是对的**）。
- 用例：`runtime/round749` 16 条、`stdlib/round749` 10 条。
- 五类 **7731 / 8095 → 7754 / 8121**（+14 runtime、+9 stdlib、另 3 条是新登记的台账）、
  `blocked 261`（**没动**）、`differ 103 → 106`（+3 新登；两条旧账转绿是**分子**那一侧）、
  `bad` 0、`regressions` 0、`moved` 0、`newlyPassing` **2 → 0**（撤掉那两行），
  加权 **95.9% → 95.8%**（新登记缺口的账，不是回归）。

### 第 750 轮：**原始值接收者 / 装箱 / 数组的洞 / 对象整体操作**那一侧的普查——收掉四处、新登 5 条（coverage 7754/8121 → **7775/8147**）

这一轮的探针换到**「原始值与对象边界」**那一面：原始值接收者上的
`setPrototypeOf` / `defineProperty` / `keys` / `hasOwn` / `freeze` / `preventExtensions`、
装箱三兄弟、数组的洞与 `length`、`Reflect` 两套口径、`NaN` 与 `-0`、
`==` 的七种组合、字符串的代理对与正规化、描述符在四类接收者上、`Date` / `WeakMap` 形状。
26 条探针 **21 条当场通过**，**收掉四处根**、新登 5 条：

- **对象键的 `ToPropertyKey`**（判据 `p750b-b02` / `p750b-b03`，**整份文件跑不起来**）：
  `t[new Set()] = "x"` 在 JS 里给 `"[object Set]"`（`Object.keys(t)` 是一格），
  而本仓在**取键那一步**就抛（`unimplemented: ToString of this kind of value`）
  ——`get_index` / `set_index` 的键落到 `RtToString` 上，而 `TextUnitsOf` 对**对象**
  是**响亮地抛**（那一处的注释写着「对象要 `ToPrimitive`，那是建库层的事」，
  而这一层**就是**建库层）。`Object.keys(t)` 那一句本来也跑不到。**修法**是
  **开一格语言层能力号**（`PropertyKeyId = 714`）+ `PropertyKeyName`
  （`text.xl.md`：对象先走 `ToPrimitiveOf`，若 `Symbol.toPrimitive` 给出的**是符号**
  就原样当键返回），引擎那一侧添 `PropertyKeyHookId` / `RegisterPropertyKeyHook` /
  `PropertyKeyOf`（`get_index` 与 `set_index` 两处调用点同改）。
  **没登记钩子（`0`）就照旧抛**——「不做」不等于「换个行为」，与 `ThenableHookId`
  那条纪律同源。
- **`Object.freeze` / `Object.seal` 打在原始值上**（判据 `p750a-a02`，**整份文件进不来**）：
  JS 的 `Object.freeze(1)` 给 **`1`**（`ToObject` 造出来的包装对象当场丢掉、
  返回值是**实参本身**），本仓**响亮地抛**。`preventExtensions` 那一格第 304 轮
  就是这么写的（「原始值原样返回」），**只有这两格漏了**——修法是同一条
  （非对象 ⇒ 原样返回）。
- **`console.log("%i", …)` 是 `parseInt`、`%d` 是 `Number`**（判据 `p750b-b08`）：
  Node 的 `util.format` 里 `%i` 走 `parseInt(value, 10)`、`%d` 走 `Number(value)`，
  两者**只在小数上分岔**（`%i` 接 `"42.9"` 给 `42`、`%d` 给 `42.9`），
  而本仓把 `i` 与 `d` **并成了一句**（`globals.xl.md` 那一支）。
- **往原始值上写属性**（判据 `p750a-a04`，**整份文件进不来**）：
  `let s = "abc"; s.x = 1` 在 JS 里**一声不响**（那一格建在临时的包装对象上、
  随它一起丢掉；`"abc".length = 1` 同样是静默失败），而本仓报
  `assigning a property on a primitive receiver`。修法是 `props.xl.md` 的
  `SetPropertySearched` 那一支**返回假**（「没写下去」——与「不可写的属性」
  那一格同一条口径，而不是抛）。
- **新登 5 条**（根因逐条写在用例的 `xl:why` 里）：
  ① **原始值目标该抛 `TypeError`、本仓抛普通 `Error`**（`p750a-a01`：
     `Object.defineProperty(1, …)` / `Object.setPrototypeOf(1, …)` /
     `Reflect.defineProperty(1, …)` 三处——与第 748 轮收掉的
     `Object.assign(null, {})` 是**同一条根**，这一轮只量清了另外三个落点）；
  ② **内建方法不是同一个对象**（`p750a-a04` 第五行：
     `n["toFixed"] === Number.prototype.toFixed` Node 给**真**、本仓给假
     ——`CreateHostRef` 每次都新造句柄那条教训（第 733 轮）的同族，
     只是落在 `Number.prototype` 这一格上）；
  ③ **`a.length = "2"` 该截到 2**（`p750a-a06`：规范在 `ArraySetLength` 里先走
     一步 `ToNumber`，本仓对非数字一律抛——**这一轮没有收**：`ToNumber` 的对象那一档
     要 `ToPrimitive`，而 `SetPropertySearched` 的签名里没有 `protos`，
     `ToNumberOf` 的三处调用点**全都要跟着加一格**，而那是**每一次属性写入**都要过的路，
     得先量清副作用）；
  ④ **`Reflect.setPrototypeOf` 在不可扩展对象上该给假**（`p750a-a08`：
     Node 给假**且不改原型**，本仓给真**且改了**——它与第 720 轮收掉的
     `Object.setPrototypeOf` 那一族**不是同一句**，那一格要求抛）；
  ⑤ **内建函数的描述符**（`p750b-b03`：`d(Math, "max")` 本仓抛、`d(Math, "PI")`
     两边都对——缺的是**宿主引用**那一档的读值，与第 733 轮那一族同根、落点不同）。
- 用例：`runtime/round750` 16 条、`stdlib/round750` 10 条。
- 五类 **7754 / 8121 → 7775 / 8147**（+12 runtime、+9 stdlib、另 5 条是新登记的台账）、
  `blocked 261`（**没动**）、`differ 106 → 111`（+5 新登）、`bad` 0、`regressions` 0、
  `moved` 0、`newlyPassing` 0，加权 **95.8% → 95.7%**（新登记缺口的账，不是回归）。

### 第 751 轮：**内建成员的「整张表」普查**——收掉一处（`Array.prototype.at.length`）、新登 8 条（coverage 7775/8147 → **7777/8156**）

这一轮的探针换了量法：不再「一条问一件事」，而是**一条问一个面**
（`Array.prototype` 全族 / `String.prototype` 全族 / `Map`·`Set` 全族 /
`Promise` 与函数·错误族 / 内建构造的静态面），每一格都打
`typeof` + `Object.prototype.toString` 标签 + 一次真调用的结果——
差异于是**成片**地露出来；最后再拿**整张 `length` 表**（150 行，覆盖
Array / String / Object / Number / Math / JSON / Map / Set / Promise / Reflect
的每一个成员）对 Node 核一遍。9 条定稿探针：**1 条当场通过**、8 条登记缺口。

- **收掉一处**（判据 `p751a-01`，**整表核一遍逼出来的**）：
  **`Array.prototype.at.length` 该是 `1`、本仓给 `0`**。`BuiltinArity` 那张表
  （第 733 / 734 / 736 轮逐个量出来的）里 `at` **不在**「收一个实参」那一列，
  于是落进了下面「零个形参」的名单。**价值不在那一格**，而在
  「**这张表只能逐个量、不能按号段一把抓**」：`at` 的名字与
  `values` / `keys` / `entries` 排在同一段能力号里（`array.xl.md`），
  当初顺手归族就漏了它——与第 736 轮 `Reflect` 那四格、
  第 734 轮 `String` 的 HTML 包装十三格是**同一条教训**。
  修法是把 `ArrayAt` 加进那一列，并把它的号补进 `globals.xl.md` 的 import
  （`ArrayAt` 原来只住在 `array.xl.md` 里）。
- **新登 8 条**（根因逐条写在各用例的 `xl:why` 里）：
  ① **三种迭代器的标签都少一层**（`p751a-02`）：`[object Array Iterator]` /
     `[object Map Iterator]` / `[object Set Iterator]` 在本仓都是 `[object Array]`
     ——迭代器**就是一个数组**，`AttachArrayIterator` 没挂 `Symbol.toStringTag`；
     而修法要穿过三份文件（那一格是语言层的符号，那个方法的签名里没有 `protos`，
     却被 `Map` / `Set` 两处调用点共用）；
  ② **`globalThis` 上的 `setTimeout` / `process`**（`p751a-04`）：与第 678 轮
     那条 97 个名字的账同源，这里只挑**唯一两个有语义可做的**单钉一条——
     其余 95 个是宿主面；**补一个假的不如不补**（`setTimeout(f, 0)` 同步跑掉是静默错值）；
  ③ **`JSON.isRawJSON`**（`p751b-01`）：要先把 `JSON.rawJSON` 造出来；
  ④ **`Symbol.prototype`**（`p751b-02`）：那一格空着，而 JS 里**裸的符号值借的就是它**
     ——补它要连**符号的包装对象**一起做（`Object(sym)` 今天还响亮地抛着）；
     `Symbol.dispose` / `asyncDispose` 同族（名字进了名单、缺的是 `using` 语法）；
  ⑤ **`Error` 实例的 `stack`**（`p751b-03`）：与第 697 / 704 / 708 / 749 轮同一条根，
     这一条把它钉在**最普通的那句读法**上；
  ⑥ **`console.Console`**（`p751b-04`）：与第 733 轮 `stdlib/console/020` 同一条账；
  ⑦ **裸的 `BigInt` 不在全局名单里**（`p751b-05`）：降级期就报
     `name is not a local or a capture: BigInt`——与第 145 轮 `Boolean`、
     第 228 轮 `Function` 两条一字不差；**只添一个名字不算收账**（要连大整数那一档一起做）。
- 用例：`runtime/round751` 4 条、`stdlib/round751` 5 条。
- 五类 **7775 / 8147 → 7777 / 8156**、`blocked 261`（**没动**）、
  `differ 111 → 118`（8 条新登）、`bad` 0、`regressions` 0、`moved` 0、
  `newlyPassing` 0，加权 **95.7%**（两个数都在这一位）。

### 第 754 轮：**标签模板的对象 / 全局与命名空间的标签 / `async function*` 的承诺**——收掉五处（coverage 7793/8173 → **7799/8179**）

这一轮的探针换到**三处「语言层的形状」**：13 条原子探针分五面问
（迭代器助手与新的内建面 / 标签模板对象 / 全局与命名空间的 `Symbol.toStringTag` /
内建原型自己的标签 / `async function*` 的 `next()`）。
**9 条当场通过**（`Map`·`Set` 那一族、`Array`·`Object`·`String` 的成员表、
生成器的 `throw` / `return` / 委托、`this` 的十四种绑定形态、
`for` 系的绑定与作用域**一条不差**），**五处收掉**、三条新登。

- **收掉一处：标签模板对象两处都是冻的**（`p754b-01`，**静默错值**）。
  规范 §13.2.8.3 的 `GetTemplateObject` 造出来的那个数组
  `Object.isFrozen(parts)` 与 `Object.isFrozen(parts.raw)` 在 Node 里**都是真**，
  而 `raw` 那一格的描述符是 `{ writable: false, enumerable: false, configurable: false }`
  ——本仓原来挂的是**普通属性**（三个标志全真、`Object.keys(parts)` 多出一格 `"raw"`）。
  修法落在 `lowering.xl.md` 的 `LowerTaggedTemplate`：`raw` 改走
  `EmitHiddenSet(…, 6)`（可写 + 可配置、**不可枚举**），紧接着两句
  `Object.freeze`（先冻 `raw`、再冻段落数组）。
  **这一处量出两个坑，都写在了代码注释里**：
  ① `Release` 是**退水位**不是「还一格」——第一版在拿到 `freeze` 之后
  `Release(objectSlot)`，下一次 `Reserve` 把**同一个槽**给了实参数组 ⇒
  被调的值成了实参数组自己（症状是标签函数的第一个实参变成数组、
  `s.raw` 报 `cannot call a non-closure value`，**报错离现场很远**）；
  ② **全局名有两条取法**——`ResolveAccess("Object")` 会先在 `DeclaredNames` 上问，
  而全局名**不在那份名单里** ⇒ 报 `name used before its declaration: Object`
  （**七条语料当场红**）；只问 `FindLocal` 又**看不见内层函数**（全局名的值住在
  入口帧的环境格里）⇒ 最常见那种写法（`const tag = …; tag\`x\``）会**静默跳过冻结**。
  最后两条路都试：槽里先找、找不到再问环境链，**都没有就跳过**（跳过的后果与改动前一字不差）。
- **收掉一处：全局对象与三个命名空间的 `Symbol.toStringTag`**（`p754c-01`）。
  `Object.prototype.toString.call(globalThis)` 在 Node 里是 `"[object global]"`、
  `Math` / `JSON` / `Reflect` 各给 `"[object Math]"` 那一族——而
  `Object.prototype.toString.call(x)` 是真实 `.ts` 里**遍地都是**的判型写法。
  四格一起补进 `globals.xl.md` 的 `tagTargets`，**全局对象那一格是特殊的**：
  它的描述符是 `{ writable: false, enumerable: false, configurable: true }`
  （只有它是可配置的），所以它走 `SetHiddenProperty(…, 4)`、其余三格照旧。
  **这一处一开始被误读成「`this` 绑定错了」**：同一个探针里
  `o.m.apply(undefined)` 的**绑定**是对的（`=== globalThis` 为真），
  错的只是**标签**——`show()` 那句把 `this` 打成 `"[object Object]"` 才露出来。
- **收掉一处：`async function*` 的 `next()` 给的是一格承诺**（`p754e-01`）。
  规范 §27.6 的 `%AsyncGeneratorPrototype%.next` 走 `AsyncGeneratorEnqueue`——
  它把 `{ value, done }` **包成承诺**再交出去。本仓原来给裸的那一对
  （理由写在 `DoIterNext` 那一段：「`await` 一个不是承诺的值就是它自己」），
  对 `await` / `for await` 是对的，可**脚本直接摸那一格**就露出来了：
  `g().next().constructor.name` 在 Node 里是 `"Promise"`、本仓给 `"Object"`，
  `typeof g().next().then` 给 `"undefined"`（**静默错值**：`.then(…)` 报的是
  「调了一个不是函数的东西」，听起来像脚本写错了）。
  修法在 `vm.xl.md` 的 `NextStepOf`：判据是**这个迭代器是不是异步生成器**
  （原型链上有没有 `protos.AsyncGenerator`，用 `RtChainHas` 而不是等号——
  `class G extends (async function* () {})` 那一档要一起算），是就
  `MakeAsyncPromise(Fulfilled, answer)`。**同步生成器一格都不动**。
- **收掉两处：四个包装原型自己的标签，以及 `Symbol.prototype` 那一格**
  （`p754d-01`）。`Object.prototype.toString.call(String.prototype)` 在 Node 里是
  `"[object String]"`（`Number` / `Boolean` / `Symbol` 同理），本仓原来给
  `"[object Object]"`；而 `Symbol.prototype` **连对象都没有** ⇒
  取任何一格都响亮地抛（`p751b-02` / `stdlib/symbol/036` / `037` 三条**一起转绿**，
  `newlyPassing` 就是它们）。
  **这里试过错、也量到了账**：第一版把四格挂成 `Symbol.toStringTag` 属性，
  当场红了 `stdlib/object/137-object-create-is-not-box`——那一格是**沿原型链取**的，
  于是 `Object.create(Number.prototype)`（Node 给 `[object Object]`）继承到了它。
  最终改成在 `ObjectTagOf` 里按**句柄相等**答（`value.Ref === protos.String` 那一族），
  **一格属性都不挂**：`Object.create(…)` 的句柄不是它，照旧落到「普通对象」。
  `Symbol.prototype` 另在 `props.xl.md` 里立了一格（`Protos.Symbol`，
  与 `String` / `Number` / `Boolean` 三格并列，`ObjectCharge * 23 → * 24`）。
- **新登三条**：`p754d-01` 留下的那一格——`Object.prototype.toString.call(Object.prototype)`
  在 Node 里是 `[object Object]`、本仓给 `[object Function]`（根子在 `GetProperty`
  那条「接收者是 `protos.Object` / `protos.Function` 时先到 `protos.Function` 上找一次」
  的兜底：那个 `||` 一成立就算「可调用接收者」；**旁证**是 `typeof Object.prototype`
  早就是 `"object"`——同一件事两处口径正好相反）；
  `p754f-01`（`Array.prototype[Symbol.unscopables]` 那一张 13 个名字的表没人挂，
  而它**没有消费者**：`with` 那一族今天连降级都走不顺）；
  `p754g-01`（裸的 `BigInt` 不在全局名单里，降级期就报——与第 751 轮 `p751b-05` 同一条根，
  这里只把它钉在**最短的那一句**上）。
- 用例：`runtime/round754` 6 条（4 pass / 1 differ / 1 blocked）。
- 五类 **7793 / 8173 → 7799 / 8179**（+6 条语料）、`blocked 261 → 262`、
  `differ 119 → 118`、`bad` 0、`regressions` **0**、`moved` 0、
  `newlyPassing` **3**（第 751 轮 `p751b-02` 与 `stdlib/symbol/036` / `037`
  三条旧台账**到期**，指令已按规矩撤掉、用例留着当守卫）。
  加权 **95.7% → 95.6%**（分子 +6、分母 +6，而三条旧账转绿走的是**分子**）。

### 第 755 轮：**函数与访问器的名字推导**——收掉一处（计算键成员的名字）、两条旧账到期（coverage 7799/8179 → **7804/8183**）

这一轮的探针换到**名字那一侧**：17 条原子探针问
「函数与访问器的 `name`」（16 个形态）、属性枚举的次序（12 个形态）、
数组的洞与新方法（17 个）、字符串与数字的格式化（20 个）。
**三条探针全 pass**（枚举次序、洞与新方法、格式化**一条不差**——80 行读数逐字相同），
名字那一条 16 行里 15 行对、**一处收掉**。

- **收掉一处：计算键成员的名字**（判据 `runtime/round755/001-function-and-accessor-names` 第 8 / 12 行，**两条旧台账一起到期**：
  第 732 轮的 `p732a-a02` / `p732a-a03`）。
  `class C { ["m" + 1]() {} }.prototype.m1.name` 在 Node 里是 **`"m1"`**、
  `{ get ["x" + 1]() {} }` 的 getter 叫 **`"get x1"`**，而本仓两处都给**空串**。
  **根子**：名字有两个来源——**静态键**当场算得出来（对象字面量那半第 620 / 732 轮
  就接上了），**动态键**只能由运行期的 `EmitComputedFunctionName` 补写；
  而**类成员走的是另一条路**（`LowerClass`），`memberDisplay` 原来无条件给
  `"<computed>"`（以 `<` 开头 ⇒ `LowerFunctionValue` 按匿名处理）——
  同一个形状两条路只接了一条。
  修法：类成员那一支照对象字面量那一处**一字不差**地补上（静态键给
  `memberDisplay`、动态键调 `EmitComputedFunctionName`），访问器再多一个
  `get ` / `set ` 前缀。
- **这一处量出两个坑，都写进了代码注释**：
  ① **`TextOf` 不能在计算键上调**——第一版把 `memberDisplay` 的初值写成
  `TextOf(memberName)` 放在 `if (computedName)` **之前**，于是**整份文件在降级期就挂**
  （`ast node ComputedPropertyName has no text`，第 1 行就报）；
  ② **`JumpIfFalse` 那条路走不通**——「键不是字符串就不取名」这一问本来想写成
  `typeof 键 === "string"` + 一条 `JumpIfFalse`，实测**把三条语料当场打成
  `slot out of range`**（那一段的槽账与两处 `PatchTarget` 撞上了）。
  最后**单开一格语言层能力号**（`SetFunctionNameId = 715`）：
  `set_function_name(闭包, 键, 前缀)` 在 `InvokeObjectHelper` 里一句话判完
  （不是字符串就不做、已经有名字的不动、有前缀就先拼）——
  **降级层一个字都不判**。这一格同时把「符号键要写名字」那 8 条的红消掉了
  （`SetProperty` 那条快路只认字符串，符号键会落到 `RtToString(符号)` 上响亮地抛）。
- **新登一条**（`runtime/round755/001-function-and-accessor-names` 留下的那一行）：**解构默认值里的函数值不取名**——
  `const { a = function () {} } = {}` 的 `a.name` 在 Node 里是 `"a"`（解构默认值
  **也是命名位置**），本仓给空串（`Destructure` 那条路一格名字提示都没挂）。
- 用例：`runtime/round755` 4 条（3 pass / 1 differ，pass 的那三条各钉一面）。
- 五类 **7799 / 8179 → 7804 / 8183**（+4 条语料）、`blocked 262`（**没动**）、
  `differ 118 → 117`、`bad` 0、`regressions` **0**、`moved` 0、`newlyPassing` 0
  （两条旧台账到期走的是**分子**，指令已按规矩撤掉、用例留着当守卫）。
  加权 **95.6% → 95.7%**。

### 第 756 轮（收尾轮）：**下标访问器 / 属性描述符**那一侧——收掉一处（`join` 读不到装在数组下标上的访问器）、两条旧账到期（coverage 7804/8183 → **7807/8185**）

这一轮的探针换到**下标与描述符那一侧**：32 条原子探针分两面问
（数组下标位上的访问器与洞、属性描述符的默认值与冻结 / 密封 / 不可扩展）。
**一面 16 行全对**、另一面 16 行里 15 行对、**一处收掉**。

- **收掉一处：`join` 在装了访问器的下标上读不到那一格**（判据 `runtime/round756/001-index-accessors-and-holes` 第 3 行，
  **两条旧台账一起到期**：`stdlib/array/143-getter-array-index` 与
  `stdlib/round721/p721a-b01`）。`Object.defineProperty(a, 0, { get() { return 9 } })`
  之后 `a.join(",")` 在 Node 里是 `"9,2"`、本仓给 `",2"`（**静默错值**）。
  **根子**：`ArrayJoin` 那一支原来按 `source.GetLength()`——**元素区的格子数**——
  循环，而装访问器会把那一格**摘成洞**（`props.xl.md` 的 `IndexAccessorAt` 那一段
  写着为什么：元素区与属性表两处住不下同一格）⇒ 元素区仍是 0 格 ⇒ **循环一次都不进**。
  而 `length` **本来就已经跟着长**（`defineProperty(a, 1, …)` 之后 `a.length` 是 2，
  那一条读数一直是对的）。
  修法两处：上界换 `ArrayLikeLength`（对数组接收者取的是同一格 `length`）、
  **装了访问器的那一格改走 `GetProperty`**（判据是 `IndexAccessorAt`——
  与 `vm.xl.md` 的 `RtOp.GetIndex` 那一处**同一句**；`call === null` 时退回元素区那条老路）。
- **新登一条**（`runtime/round756/002-property-descriptors-differ` 第 11 行）：**严格代码里写只读属性该抛 `TypeError`**。
  `"use strict"; const o = {}; Object.defineProperty(o, "a", { value: 1, writable: false }); o.a = 2;`
  在 Node 里抛 `TypeError`、本仓**静默不写**（**静默错值**）。
  `ir.xl.md` 的 `case SetProp` 那一行**本来就写着这一句**（「严格模式下的只读 /
  不可扩展要抛 `TypeError`」），缺的是**写那一趟不知道「这一段是不是严格」**：
  严格性今天只喂给「`this` 的绑法」（`vm.xl.md` 的 `DoCallValue` 读闭包的 `IsStrict`），
  而 `set_prop` 那条算子的签名里**没有这一位**。
  **要收它得动引擎**（`rt.xl.md` 的 `SetPropertySearched` 那一支返回假之后，
  由调用方按严格性决定抛不抛），而它与 700+ 条语料的「松散模式静默失败」
  **共用一条路**——**收尾轮不顺手动那一处**。
  那一条探针的**前 10 行与后 5 行**（描述符默认值、冻结 / 密封、重新定义、不可扩展）
  **全对**，所以用例留着当守卫。
- 用例：`runtime/round756` 2 条（1 pass / 1 differ）。
- 五类 **7804 / 8183 → 7807 / 8185**（+2 条语料）、`blocked 262`（**没动**）、
  `differ 117 → 116`、`bad` 0、`regressions` **0**、`moved` 0、`newlyPassing` 0
  （两条旧台账到期走的是**分子**，指令已按规矩撤掉、用例留着当守卫）。
  加权 **95.7%**（两个数都在这一位）。

### 第 757 轮：**数组那一侧的两处响度**——`sort` 的比较器与 `Array.from` 的空值（coverage 7807/8185 → **7810/8188**）

这一轮的探针换到**数组那一侧**：46 条原子探针分三面问
（`sort` / `toSorted` 的比较器与稳定性、`Array.from` 的类数组与迭代器、对象复制与键序）。
**两面全对**、`Array.from` 那一面 16 行里 15 行对，**两处收掉**——两处都不是「缺一块功能」，
而是**响得不对**：一处该抛的没抛、一处抛错了族。

- **收掉一处：`sort` 的比较器不是函数时要抛 `TypeError`**（判据 `stdlib/round757/p757a-01-sort-comparator`）。
  `[1, 2, 3].sort(1)` / `.sort("x")` / `.sort({})` 在 Node 里都抛 `TypeError`
  （规范：`If comparator is not undefined, then If IsCallable(comparator) is false, throw a TypeError`），
  本仓原来把它写成一个**三目**——「不可调用就当没给」⇒ 静默按文本比。
  `a.sort(null)` 更隐蔽：它与 `a.sort()` 给出**同一个答案**，看着「对」，其实换了一条语义。
  修法一行：`hasArgument && !IsCallableValue(...)` ⇒ 抛（`builtins/array.xl.md` 的
  `ArraySort` / `ArrayToSorted` 那一支，`toSorted` 与它共用这一格）。
- **收掉一处：`Array.from(null)` / `Array.from(undefined)` 要给 `TypeError`**（判据 `p757a-02-array-from-nullish`）。
  规范的第一步就是 `If items is undefined or null, throw a TypeError`——本仓原来没有这一句，
  于是 `Array.from(null)` 一路走到下面那条「有没有迭代器」（要读 `Symbol.iterator` 那一格）
  才撞在引擎的「读空值的属性」上，而那一抛是**笼统的 `Error`**
  （`props.xl.md` 第 136 轮那一处自己写着「本仓抛的是装了工厂的那种错误，
  `instanceof TypeError` 那一层还没有」）⇒ `catch (e) { e instanceof TypeError }` 接不着。
  **这一句补在语言层、不补在引擎**：引擎那一处的口径是全语言共用的（700+ 条语料钉着
  「松散模式读空值给笼统错误」），改它要动所有读属性的路；而 `Array.from` 这一格
  **规范本来就单独要求 `TypeError`**——补的是**规范明写的那一步**。
  顺手把「数 / 布尔 / 符号 ⇒ 空数组」写成了明处的规矩（原来靠「原始值接收者读 `length`
  得 `undefined`」顺带对上）。
- **一次实测的坑（记在这里，省下一次重踩）**：第一版把那句空值检查放在 `ArrayFromValues`
  **后半段**（`drained` 出来之后）——**永远不会执行**：`null` 在更早的
  「有没有迭代器」那一分支就撞在引擎那句 `cannot read properties of null` 上了。
  探针的报错文字与**第一版的推论**一模一样，所以「改完还是红」看着像没生效——
  **判据红的是位置，不是写法**。第二版把它挪到**一切属性读之前**（`source` 一取到就问）。
- **一处 TS 的坑**：`!drained.IsObject()` 会把 `Null` / `Undefined` 从联合类型里摘掉，
  之后再问 `Tag === ValueTag.Null` 是 `tsc` 的 **TS2367**（「两个分支没有交集」）——
  顺序要照着「先问空值、再问 `IsObject`」写。
- 用例：`stdlib/round757` 3 条（**全 pass**）。
- 五类 **7807 / 8185 → 7810 / 8188**（+3 条语料、+3 条通过）、`blocked 262`（**没动**）、
  `differ 116`（**没动**）、`bad` 0、`regressions` **0**、`moved` 0、`newlyPassing` 0。
  加权 **95.7%**（两个数都在这一位）。

### 第 758 轮：**这一轮的普查只量不修**——两条新缺口（`return` 后面的函数表达式、回调 `thisArg` 装箱）（coverage 7810/8188 → **7810/8190**）

这一轮的探针换到**数组的复制 / 查找族**、**函数的形状与调用族**、**String 的静态面**、
**对象描述符 / 解构 / 展开**四面（共 130 条原子探针）。**四面里三面全对**
（对象描述符 / 原型 / 键序、解构 / 剩余 / 展开、String 的静态面各 20+ 行逐行相同），
量出**两条新缺口**——两条都要动那一层的**公共路**，所以本轮**只登记、不修**。

- **新登一条：`return` 后面紧跟的**函数表达式**被读成了函数**声明（判据 `runtime/round758/p758a-01-return-then-function-declaration`）。
  `(function () { return function f() {}.name; })()` 在 Node 里是 `"f"`（那是**函数表达式**），
  本仓的语句切分把 `function` 三个字读成**声明**的开头 ⇒ 降级期报
  `unimplemented: expression FunctionDeclaration`、**整份文件一个字节都不跑**。
  **同一格里三种写法只有这一种红**：`return (function f() {})`（带括号）过、
  `const x = function f() {}` 过、声明自己一行过——差的只是「`return` 与 `function` 紧挨着」。
  修它要 token 层的语句切分先有「表达式位里的 `function` 按表达式读」这条判据
  （与 `IsLineBreakBoundary` 同一处）——牵连 1414 份 token 语料。
- **新登一条：回调的 `thisArg` 是原始值时**不装箱（判据 `stdlib/round758/p758a-02-map-thisarg-not-boxed`）。
  规范（`OrdinaryCallBindThis`）说松散模式下把原始值 `ToObject` 一次
  （`[1].map(function () { return this }, 5)[0]` 在 Node 里是 `Number` 包装对象），
  **同一件事第 710 轮已经收过一半**：`Function.prototype.call` / `apply` / `bind` 三条路走
  `globals.xl.md` 的 `BoxReceiver`；而 `xs.map(fn, thisArg)` 把 `thisArg` 原样递进
  `vm.xl.md` 的 `CallNative`，那一处只兜 `null` / `undefined`（换全局对象）、不装箱原始值。
  **缺的不是一行、是重入那条路整条**：19 行探针里 **8 行不同**（回调族六格各有一条），
  其中三条最响——`filter(function () { return this === 5 }, 5)` 在 Node 里是**空**、
  本仓给**一项**（`this` 是那个数本身、`=== 5` 成立），**静默的错答案**。
  收它要给 `CallNative` 补一次 `ToObject`，而 `BoxReceiver` 住在语言层
  （要 `Protos` 与隐藏键 `BoxKey`、还要分配），引擎 import 不了它。
- **两条都记在这里、都带守卫**：它们量的是**那一层公共路**上的行为，
  谁动了 `CallNative` 或语句切分，`coverage` 会当场红。
- 用例：`runtime/round758` 1 条（blocked）+ `stdlib/round758` 1 条（differ）。
- 五类 **7810 / 8188 → 7810 / 8190**（+2 条语料、通过数没动）、`blocked 262 → 263`、
  `differ 116 → 117`、`bad` 0、`regressions` **0**、`moved` 0、`newlyPassing` 0。
  加权 **95.7% → 95.6%**（分母长了两条、分子没动——**登记缺口本来就会让这个数往下走**，
  而口径是「红只红在比昨天差」）。

### 第 759 轮：**集合与格式化那一侧**——收掉一处（`Number.prototype.toLocaleString` 印成 `[object Number]`）（coverage 7810/8190 → **7810/8192**）

这一轮的探针换到**Set / Map 的方法面**、**JSON 的边界**、**数字与日期的格式化**三面
（70 条原子探针）。量出**一处收掉、一处新登**，外加一条被 `BigInt` 挡住的探针
（那三个字本身还没做，会把**整份文件**拦下来——所以 JSON 那一面拆开重跑后**其余全对**）。

- **收掉一处：`Number.prototype.toLocaleString` 把数字印成了 `[object Number]`**
  （判据 `stdlib/round759/p759a-01-number-and-date-format` 的第 1 / 2 / 5 行）。
  `(123456.789).toLocaleString()` 在 Node 里是 `"123,456.789"`、本仓给 `"[object Number]"`——
  **根子**：`Number.prototype` 上**没有那一格**，于是沿原型链落到
  `Object.prototype.toLocaleString`，而它的算法只有一句「`Invoke(O, "toString")`」，
  调的是承接对象的 **`Object.prototype.toString`** ⇒ **一个数字被印成了一个标签**。
  修法一格：`Number.prototype.toLocaleString` 指到 `NumberToStringRadix`
  （与 `toString` **同一个号**），先例是第 689 轮 `Object.prototype.toLocaleString` 指到
  `ObjectToString`、`Array.prototype.toLocaleString` 指到 `ArrayJoin`
  （本仓没有区域设置表，两格给的一定是同一个串）。
  **剩下的一半如实留着**：千分位（`"123,456.789"` 对 `"123456.789"`）要 ICU 的区域表，
  与 `toDateString` / `Intl` 同一件事——这一条用例留着当那一格的守卫。
- **新登一条：`Map` / `Set` 的内部载荷是可见的自有属性**（判据 `p759a-02-map-internal-payload-visible`）。
  `new Map([[1, 2]])["__k"]` 在 Node 里是 `undefined`、本仓拿得到那个内部表
  （`Map` / `Set` 在本仓是「带几格隐藏属性的普通对象」，而**隐藏**只做到「不进 `Object.keys`」）。
  与旧台账 `stdlib/map-set/probe703-m-d10` **同一条根**，这一条把那 24 行里其余 23 行的
  正确形状一并钉住（键相等、迭代顺序、`forEach` 的三个实参、`WeakMap` / `WeakSet`）。
- 用例：`stdlib/round759` 2 条（1 differ 收账 + 1 differ 登记）。
- 五类 **7810 / 8190 → 7810 / 8192**（+2 条语料、通过数没动）、`blocked 263`（**没动**）、
  `differ 117 → 119`、`bad` 0、`regressions` **0**、`moved` 0、`newlyPassing` 0。
  加权 **95.6%**（两个数都在这一位）。

### 第 901 轮：**类型位与值位那三格「没写完的 `:`」**——`xl:known-gap` 4 → 1（coverage 4090/4263 → **4093/4263**、blocked 43 → 40）

这一轮量的是**第 900 轮片段普查留下的那 4 条 `xl:known-gap`**——它们量的是 **token 树（XML）**，
而 `cases:tsast`（投影成 TS 形状那把尺子）一直是绿的。逐条看下来**三条同根**：
**末尾停在一个「后面一定是类型」的 `:` 上时，解析期把它当成了行尾**。

- **收掉 `token/expressions/gap-r900-arrow-return-type-newline`**（`const f = (a: string):` 换行
  `number => 1;`）：`Statement.IsVariableTypeAnnotationColon` 原来只认「`:` 前面是 `Let`」这一格
  （变量声明的类型标注）。值位箭头那一格**同样是「后面一定是类型」**——它靠新加的
  `IsValueArrowReturnColon` 认：`:` 前面是 `(` 括号、括号前面是 `=`、括号里有实义内容。
  **不引 `LamdaCloseRule.IsLambdaParameters`**（那一问与 `StatementBranch` / `LetBranch` /
  `LabelCloseRule` 互相引用，而本判据同时挂在解析期与收尾期两处 ⇒ 一引就是环）——
  实际也不需要：`.ts` 里「`)` 之后紧接 `:`、且这个 `)` 左边是 `=`」只有值位箭头一种读法。
  收掉后四方向 **缺 3　漂 3　多 8 → 全 0**。
- **收掉 `token/types/gap-r900-signature-return-newline`**（`type T = { (a: string)` 换行 `: void };`）：
  解析期这一格由新加的 `Statement.IsPendingSignatureReturnColon` 兜住——**换行后面那一格就是 `:`**
  时不收壳（`.ts` 里没有一条语句或一个成员以 `:` 开头）。收尾期还要让 `SignatureTailEnd`
  跨过那个换行（它与 `SignatureTailIsColon` 是同一句判据，两处必须一致）。
  收掉后四方向 **缺 2　多 1 → 全 0**。
- **收掉 `token/types/gap-r900-call-signature-no-return-type`**（`type T = { (a: string) };`）：
  `HasSignatureTail` 原来**要求那个 `:` 存在**，理由是「把 `(f())` 这类括号表达式挡在外面」——
  可**括号表达式不可能住在 `InterfaceBody` / `ClassBody` / `TypeLiteralBody` 里**
  （那三个容器装的只能是成员），而 `MethodDeclaration` 那一侧**早就是这个口径**
  （`IsMemberSignature` 的 `tailEnd < 0` 那一支）。新加的 `IsBareParameters` 把这一格补齐：
  **形参表之后没有实义单元、或只有一个软换行** ⇒ 裸形参表签名。
  `Process` 同步改成「没有尾部时不建 `ReturnType` 段」。
  收掉后四方向 **缺 2　多 1 → 全 0**。
- **实测撞到一次回归、当场量清根因**：`IsBareParameters` 第一版放进 `HasSignatureTail` 之后，
  `@types/node/dgram.d.ts` / `https.d.ts` / `stream.d.ts` / `http.d.ts` / `http2.d.ts` 等
  **11 份 `.d.ts` 从绿变红**（16 片里 8 片失败）。根因是**括号套括号**：
  `interface I { lookup?: ((hostname: string, …) => void) | undefined }` 里，
  本方法拿到的「形参表」是**外层**那个 `(`，而它的内容是一整段**函数类型**——
  于是 `SignatureTailIsColon` 与 `SignatureTailEnd` 都从**内层形参自己的类型标注**那个 `:`
  上算出了尾部（探针实测：`parametersIndex+1` 的下一格是联合类型的 `|`，而尾部停在内层冒号上）。
  判据补两句、**都是同一件事**：**形参表右端到尾部之间出现过 `=>` ⇒ 这是函数类型、不是签名**
  （调用签名的返回类型位里不可能有平级箭头）。补完 16 片全绿。
- **仍然开着的那一条**：`token/types/gap-r900-infer-constraint-newline`
  （`U extends Array<infer V extends` 换行 `string> ? V : never`）：约束段里的换行让
  `infer V extends string` 先成了一次形，外层条件类型的回扫仍差一步——**这一轮量清了它不在
  上面三条根上**（`InferType` 那一格已经放行，剩下的一步在约束段自己的边界上），如实留着。
- **数字**：`cases:tsast` 已知缺口 **4 → 1 还开着、0 条已经收掉**（三条按规矩删掉
  `xl:known-gap`、用例留着当守卫）；`cases:tags` **0 条不一致**、`cases:check` **0 条不合格**、
  `cases:astjson` 六项全 0、`cases:shapes` 未覆盖 0；`coverage` **4090 / 4263 → 4093 / 4263**、
  `blocked 43 → 40`、`differ 130`（没动）、`bad` 0。**九道门一次全绿**（墙钟 ~30s）。

### 第 902 轮：**最后一格 `xl:known-gap` 收掉**——`infer` 的约束跨行（缺口清单**又空了**）（coverage 4093/4263 → **4094/4263**）

第 901 轮留下那一条（`token/types/gap-r900-infer-constraint-newline`）这一轮收掉了，
**`cases:tsast` 的缺口清单第二次清空**（上一次是第 881 轮）。

- **形状**：`type T<U> = U extends Array<infer V extends` 换行 `string> ? V : never;`
  ——四方向 **缺 10**（`ConditionalType` / `TypeReference` / `InferType` / `TypeParameter` /
  `StringKeyword` … 全丢）。
- **根因量清了、而且不是上一轮猜的那一处**：`LineWrap` 不是问题所在。真正卡住的是
  **`InferTypeCloseRule.Previous` 要求父单元是「已经成形的类型容器」**
  （`IsTypeContainerUnit` 的白名单：`TypeDefine` / `TypeAssign` / `TypeParameter` / `GenericType` …），
  可 `infer` 是在**根那一趟**被问到的——那一刻 `Array<…>` 的尖括号与整条条件类型**都还没成形**，
  父单元是 `Statement` ⇒ 判否 ⇒ `InferType` 一个都不成形 ⇒ 外层条件类型的回扫跟着失败。
  **同类先例就在 `IsTypeContainerUnit` 自己的文档里**：`Bracket` 那一支（`(infer U)`）
  就是为同一个「时序」问题补的（那里括号先成形、类型容器后认）。
- **修法一格**：新加 `InferTypeCloseRule.IsPendingTypePosition`——父单元是 `Root` / `Statement`、
  且从 `infer` **往回扫**（不跨语句边界）撞到 `extends` / `=` / `=>` 三者之一 ⇒ 这一段在**类型位**上。
  三格够用：`infer` 只可能出现在类型里，而「还没成形的 `infer`」只可能落在
  `X extends …` / `= …` / `=> …` 三种类型的**右边**；值位里 `infer` 只是一个普通标识符，
  它前面是 `.` / `(` / `,` / 运算符，三格都不命中 ⇒ 判否，照旧留给标识符规则。
  **不 import `Statement` 的 `IsStatementBoundary`**（那个方向会成环），边界按 `;` / `Statement` /
  `Root` 三格的**词形**认。
- **数字**：`cases:tsast` 缺口 **1 → 0 还开着、1 条已经收掉**（那一行 `xl:known-gap` 按规矩删掉，
  用例留着当守卫）；`cases:tags` / `cases:check` / `cases:astjson` / `cases:shapes` 全 0；
  `coverage` **4093 / 4263 → 4094 / 4263**、`blocked 40 → 39`、`differ 130`（没动）。
  **九道门一次全绿**（墙钟 ~30s）。

### 第 903 轮：**把第 900 轮「待登记」那一栏的四格逐个真跑**——收掉一格（`catch` 形参的尾部注释），登记三格（coverage 4094/4263 → **4095/4267**）

第 900 轮收工时在 gaps 文档的「待登记」栏里留了 **E–H 四格**（当轮只登记了前四条）。
这一轮拿 `tests/parse/ts-ast.mjs --snippets` 把它们**逐条真跑一遍**，
四格**全部还在**——于是按规矩：**能收的收、不能收的登记成 `xl:known-gap`**。

- **收掉第 G 格（`catch (e: unknown/*c*/)`）**：四方向 **漂 1 + 多 1**——
  TS 的 `VariableDeclaration` 是 `[14,24)`（`e: unknown`），本仓给 `[14,29)`（带上了那条注释）。
  根因**不在** `CatchDefine` 上（我先把区间修在那里、实测**没用**：`TryToClose` 重算之后
  右界又回到注释尾巴上），而在 **`TypeDefineCloseRule.Process` 的终点**：
  它取 `items[items.length - 1].SourceRange.End`，而**尾部注释也是一格 item**
  （产物 XML 里那条注释**确实**在 `<TypeDefine>` 里，收进来是对的，只有**区间**不该带它）。
  改法一行：终点**跳过尾部注释**（`IsAnnotationUnit`；只跳注释、**不跳软换行**——
  换行落在类型段里是排版而不是尾部注释）。同轮把 `Try/catch` 那处试探改动撤掉，
  最后只落在这一格上。用例 `token/statements/try-catch-define-comment` 留着当守卫。
- **登记三格**（各带一条 `// xl:known-gap <根因>`，`cases:tsast` 每趟真跑；
  **根因未量清的不猜**）：
  - `gap-r902-abstract-method-newline`：`abstract class A { abstract m` 换行 `<T>(): void; }`
    ——`abstract m` 落成 `PropertyDeclaration`、`<T>(): void;` 落成一个无名 `CallSignature`
    （缺 1、多 2）。
  - `gap-r902-new-typeargs-newline`：`const a = new A` 换行 `<B>();`——ASI 在换行处断句，
    `new A` 一条、`<B>()` 另起一条（落成 `TypeAssertionExpression`；漂 4、多 7）。
  - `gap-r902-throw-no-argument-newline`：`function f(): never { throw` 换行 `}`——
    `ThrowStatement` 的 `expression` 本仓给 `[]`，TS 补一个零宽 `Identifier`
    （缺 1、字段名不符 1）。
- **数字**：`cases:check` **1497 → 1501**（+4 份语料：1 份守卫 + 3 份登记）、0 条不合格；
  `cases:tags` **0 条不一致**；`cases:astjson` / `cases:shapes` 全 0；
  `cases:tsast` 已知缺口 **0 → 3 还开着**（新登记的三条；第 901–902 轮清空的那一页不受影响）；
  `coverage` **4094 / 4263 → 4095 / 4267**、`blocked 39 → 42`（三条登记）、
  `differ 130`（没动）、`bad` 0。**九道门一次全绿**（墙钟 ~31s）。

### 第 904 轮：抽象方法的**泛型参数表换行**那一格——根因在 `SignatureCloseRule` 的泛型支，两支共用一份判据（缺口 3 → 2）

第 903 轮登记的三格里，这一格是唯一**根因量得清**的（另两格要动解析期，见后）。
量下来的结论与登记时写在文件头的那句话**不一样**：缺口不在 `MethodDeclarationCloseRule`
的扫描上（那里从头到尾都跨得过换行），而在**排在它前面的 `SignatureCloseRule`**。

- **最小片段把根因钉死**（`tmp/r904/` 六格，一个进程一格）：
  `class A { m` 换行 `<T>(): void; }` 与 `class A { m` 换行 `<T>(): void { } }` **只差一个体**，
  前者红、后者绿——体在不在决定了 `SignatureCloseRule` 收不收，而这条规则的位次
  **在 `MethodDeclarationCloseRule` 之前**（`parse-pipeline.xl.md` 的 `GeneralCloseRule`）。
  产物形状因此分得很清：红的是 `Field(m)` + `Signature(<T>(): void;)`，
  绿的是一个 `MethodDeclaration`——**`m` 被 `Field` 收走，是因为它的参数表已经被签名规则消费掉了**。
- **根因一格**：`SignatureCloseRule.Previous` 的**泛型那一支**（`<T>` 作起点）有一条
  「前一个是名字 ⇒ 让给方法声明」的守卫，而它读的是 `SkipPreviousAnnotation`
  （**只跨注释、不跨软换行**）。`m` 换行 `<T>` 里那个 `<T>` 前面**正好是软换行**
  ⇒ 守卫整格失效 ⇒ 本规则把 `<T>(): void;` 收成一条无名签名。
  **`(` 那一支没有这个问题**：换代 827 已经为它写过同一件事
  （「上一行只写了一个名字」，`interface I { m` 换行 `(): void; }`）。
  **同一条规矩只长在两个支的一支里**，就是这一格。
- **改法：抽成一份**（`NameOnPreviousLine`）——判据一字不动地照抄 `(` 那一支那一块
  （往前跳过 trivia 拿到名字，再看名字**自己**前面是不是成员起点：体那个 `{`、
  `;` / `,` / `}`、修饰词、或列表开头），两支各问它一次。
  名字那一档按 `(` 那一支的既有口径收 `Identifier` **与 `String`**（同形：`interface I { "a"`
  换行 `<T>(x: T): T }`）。
  **`abstract` / `public` / `static` 三个修饰词与不带修饰词的四种写法同一个根**——
  `head` 落在修饰词表里就答「上一行只写了一个名字」，四种一起转绿（实测四格全绿）。
- **收掉 1 条**：`tests/cases/token/declarations/gap-r902-abstract-method-newline`
  （`xl:known-gap` 按规矩撤掉、用例留着当守卫，并补上 `xl:expect MethodDeclaration:1`）。
- **实测**：九道门全绿（墙钟 31.8s）——`cases:tsast` 已知缺口 **3 → 2 还开着、1 条已经收掉**、
  `cases:astjson` 六项全 0（1489 份 / 35424 个节点）、`cases:check` 1501 / 1501、
  `cases:tags` 4998 条断言 0 条不一致、`cases:shapes` 未覆盖 0、
  `samples` / `runtime:*` 全过；`coverage` **4095 / 4267 → 4096 / 4267**、
  `blocked 42 → 41`（token 那一栏 3 → 2）、`differ 130`、`bad 0` 一处没动，加权 95.4%。
- **可复用的判据**：**「这条规则该不该收」要按队列位次问，不能按「谁的名字被漏了」问**。
  登记时写下的根因（「名字与类型参数段的扫描跨不过换行」）听起来完全合理，
  也**确实是**一个真扫描——只不过它在这一格上一次都没被问到：
  **同一个形状上有两条规则，先被问到的那条答错了，后面那条连开口的机会都没有**。
  找这一格的顺序是「先按队列位次列出会认这个形状的规则，再逐条问它为什么答是」。

### 第 905 轮：**换行后以 `<` 开头**那一族——解析期 ASI 的右半截补一格，加 `NewCloseRule` 的跨行（缺口 2 → 1，顺带收掉一条**没登记过**的同根缺口）

第 904 轮留下的两格里，`new` 那一格（`gap-r902-new-typeargs-newline`）的登记根因
写的是「那个 `<` 跨行不在解析期的续接表里」——这一轮真跑下来，**这句话对了一半**：
续接表确实缺它，但只补续接表**不够**，还有第二处（`NewCloseRule` 自己的扫描）。

- **先量「缺哪几处」**（`tmp/r904/`）：最小片段 `const a = b` 换行 `<C>d;`（与 `new` 无关）
  在 TS 那边是**一条**比较链 `((b < C) > d)`，本仓给一条声明 + 一条类型断言语句
  ——**与 `new` 那一格同一个根**，而且它**从来没被登记过**（第 900 轮的片段普查没量到这一格）。
  于是这一轮收的是**一族两格**：`new A` 换行 `<B>()` 与 `b` 换行 `<C>d`。
- **第一处：解析期 ASI 的右半截**（`Statement.NextLineContinuesExpression` 的原始字符表，第 568 轮那一份）。
  表里原来有 `|` / `&` / `.` / `(` / `[` / `?` / `:` / `=` / `+` / `-` / `*` / `%` / `^`，
  **没有 `<`** ⇒ 换行处收壳 ⇒ 后半截落进另一个 `Statement`。
  补的那一句与 `+` / `-` 同一档（见 `statement.xl.md` 那一格）：**`<` 接在一条写完了的表达式后面永远是关系运算符**
  ——类型断言 `<T>x` 只出现在**表达式开头**，而这个 `<` 前面刚写完一条表达式；
  真的另起一条语句时（`foo();` 换行 `<T>x;`），上一格已经是 `;` / `}` 那样的语句级单元，
  上面那句 `IsStatementBoundary` 早退了，走不到这一格。
- **第二处：`NewCloseRule.Process` 的类型扫描在软换行处停**（`new/new.xl.md`）。
  它原来只认「同一行的类型名」——这是**故意的**（注释里写着反例：`const b = new A` 换行
  `const c = new B()` 不该把下一行的括号当成自己的实参表）。
  补法**不是**「下一个字符是 `<` 就跨过去」——那会把 `new A` 换行 `< B` 这种比较链也并进来；
  判据是「下一格是**已经成形的 `GenericType`**」：`<B>` 在跳转那一趟就挂成了单元
  （名字闸往回看时软换行是透明单元），四道闸门全过它才会在那里。
  反例照旧：那一行的下一格是 `const`（既不是括号也不是 `GenericType`）⇒ 照旧停。
  跨过去的那格软换行不进 `NewType`（`Process` 的搬运循环里跳掉）。
- **收掉 2 条**：`tests/cases/token/expressions/gap-r902-new-typeargs-newline`
  （`xl:known-gap` 按规矩撤掉、用例留着当守卫）与**新登记的守卫**
  `tests/cases/token/expressions/expr-newline-angle-compare`（`const a = b` 换行 `<C>d;`
  ——它是**收掉之后**才登记进语料的，与第 869 轮那三族同一口径）。
- **实测**：九道门里只有 `cases:tsast` 那道**按设计红**（它报了「1 条已经收掉，去删指令」，
  删掉那行 `xl:known-gap` 之后转绿）；`cases:tsast` 16 片全过、六项 0；
  `cases:astjson` 六项全 0（1489 份 / 35411 个节点）、`cases:check` 1502 / 1502、
  `cases:tags` 5004 条断言 0 条不一致、`cases:shapes` 未覆盖 0、`samples` / `runtime:*` 全过；
  `coverage` **4096 / 4267 → 4098 / 4268**（+1 收掉、+1 新语料）、`blocked 41 → 40`
  （token 那一栏 2 → 1）、`differ 130`、`bad 0` 一处没动，加权 95.4%。
  **`<` 进续接表没有引起任何回归**（全语料 16 片、五万多节点、`cases:tags` 五千条断言一处没动）
  ——这一档的风险面（「上一行真的写完了、下一行真的以 `<` 起一条类型断言」）
  正是上面那句 `IsStatementBoundary` 早退挡住的那一格。
- **可复用的判据**：**一条缺口登记时写下的根因，是「当时的怀疑」，不是「量过的结论」。**
  第 903 轮给这一格写的是「续接表里没有它」——那是一处**真的**缺失，也确实要补，
  但**补完仍然红**：同一件事在解析期（收壳）与收尾期（`NewCloseRule` 的扫描）各有一处，
  而且**外面还有一条同根、从没登记过的缺口**（`b` 换行 `<C>d`）在同一个最小片段上露出来。
  收一格的正确姿势仍然是那句话：**先把它缩到最小片段，再问「这条路上有几个地方各答了一次」**。

### 第 906 轮：没有表达式的 `throw`——**零宽 `Identifier`** 补在「下一个实义单元」那一格（缺口 1 → 0，**缺口清单第三次清空**）

第 900 轮「待登记」栏留下、第 903 轮登记进来的三格（E / F / H），第 904 / 905 轮收掉前两格，
这一轮收最后一格。**登记时那句根因也要改**：它写的是「非法 TS 的报错恢复形状」——
这一轮量下来，**换行那种写法在 TS 那边一条诊断都不报**（只有同一行那种 `throw }` / `throw;`
才报 "Expression expected."），所以它不是「坏了以后」的恢复，而是一条可以进普通语料的形状。

- **量清 TS 到底建了什么**（`ts.createSourceFile` 逐档转储）：`throw` 后面没有表达式时，
  `ThrowStatement.expression` 是一个**零宽 `Identifier`**（`forEachChild` 会访问它）。
  位置**不是行尾、也不是关键字末尾**，而是**下一个实义单元**那一格：
  - `function f(){ throw` 换行 `}` ⇒ `ThrowStatement [13,19)`、`Identifier [19,19)`（`}` 那一格）；
  - `function f(){ throw` 换行 ` x; }` ⇒ `Identifier [19,19)`（`x` 那一格——
    这里同时有另一条 `ExpressionStatement [19,23)`，两者**同起点**）；
  - `const a = 1; throw;` ⇒ `Identifier [18,18)`（`;` 那一格）；
  - 文件末尾的 `throw` ⇒ `[5,5)`。
- **本仓缺的只是这一格**：产物在 `print-ast-common.xl.md` 的关键字语句那一支里
  只按「有没有兄弟单元」给 `expression` ⇒ 一个 `Keyword(throw)` 时给空字段，
  尺子上是 `FIELD ThrowStatement 产物[] vs TS[expression]` 加一个 `MISS Identifier`。
- **补法一格**：`kind === "ThrowStatement"` 且没有兄弟单元时，
  补 `[{ kind: "Identifier", pos: E, end: E }]`，**`E` 取 `stmtEndOf(v, ctx)`**
  （语句自己那一段的末尾，**不含**尾分号那一格）。
  上面四档实测**全部对上**——因为本仓的语句壳本来就不含尾随 trivia，
  那一格正好就是 TS 说的「下一个实义单元」。
  **与数组的洞补 `OmittedExpression` 是同一个先例**（第 176 轮）：
  产物里那一格什么都没有时，补一个零宽节点把「这一段是空的」说出来。
  **只有 `throw` 补**——`return` / `break` / `continue` 没有表达式 / 标签时 TS 那边**就没有**这一格。
- **收掉 1 条、补 1 条守卫**：`gap-r902-throw-no-argument-newline` 的 `xl:known-gap` 按规矩撤掉
  （用例留着）；另加 `tests/cases/token/statements/stmt-throw-no-argument-then-statement`
  ——它钉的是**位置那一格**（零宽 `Identifier` 落在**下一条语句的起点**、不是行尾），
  这是「补在语句末尾」与「补在行尾」两个写法唯一分开的地方。
- **实测**：**九道门全绿**（墙钟 29.9s）——`cases:tsast` **已知缺口清单空的（第三次清空）**、
  16 片全过；`cases:astjson` 六项全 0（1493 份 / 35511 个节点）、`cases:check` 1503 / 1503、
  `cases:tags` 5007 条断言 0 条不一致、`cases:shapes` 未覆盖 0、`samples` / `runtime:*` 全过；
  `coverage` **4098 / 4268 → 4100 / 4269**（+1 收掉、+1 新语料）、`blocked 40 → 39`、
  `differ 130`、`bad 0` 一处没动，加权 95.4%。
- **可复用的判据**：**「这是错误恢复、没法对齐」这句话本身要量一下**。
  登记时把这一格判成「TS 坏了以后补的东西」——听起来合理，也**确实**是一个凭空出现的节点；
  可一量 `parseDiagnostics`，同一行那种写法报错、换行这种写法**不报**
  ⇒ 它是一条正常路径上的「缺失节点」。**先量「裁判自己怎么说的」，再决定这一格要不要做**：
  这一格从「不猜、挂着」变成「一格改法」，靠的就是那一句 `parseDiagnostics`。

### 第 907 轮：缺口清单空着时再开一轮普查——**换掉那 48 个构造**（364 条新片段量出 **17 格**，当轮收掉 5 格）

**一句话**：第 906 轮把缺口清单第三次清空之后，这一轮照第 900 轮的老办法再普查一次，
但**换了一批构造**（第 900 轮的 `probe5` 扫过的那 48 个不再扫）——所以这是一次
「同一把尺子、另一片地形」的普查，不是把老片段再跑一遍。

- **做法与第 900 轮一模一样**：每个构造的**每一个相邻位置**各插一遍 `/*c*/` 与换行
  （`tmp/r907/probe-r907.mjs` 的 `spots`），一次只插一处。构造按三层分：
  - **类型层**：模板字面量类型的 `infer`、映射类型的 `as` 子句、`in` / `out` 变型标注、
    `const` 类型参数、`unique symbol`、`readonly` 数组、下标访问、`typeof import`、
    `abstract new`、`this` 类型、`import(...)` 类型、`import.meta`、嵌套模板、标签模板；
  - **表达式层**：`??=`、`**`、逗号、`delete` / `void` / `typeof`、`in`、私有名 `#x in o`、
    `super.x` / `super()`、`new.target`、`<T,>` 箭头、`new (f())()`、`a!.b`、`a?.#x`、`as const`；
  - **成员 / 语句层**：`override`、`accessor`、私有名、枚举计算成员、具名类表达式、
    `static readonly`、`abstract override`、`catch` 无绑定、`else if`、`debugger`、
    `export default 1`、`case 1: { … }`、异步生成器、`do` 体。
- **364 条片段里 TS 自己判非法的 11 条跳过，353 条合法里 17 条对不上**——
  **17 格逐条登记进语料**（`tests/cases/token/**/gap-r907-*.ts`，各带一条
  `// xl:known-gap <根因>`，`cases:tsast` 每趟真跑；实测那 17 条的
  「缺 / 漂 / 多」三个数与探针逐条相同）。

**当轮收掉 5 格**（都在 `import` 这一族上，改法只有一句话：**判据跨 trivia，搬运也跨同一跳**）：

- **类型位的限定名尾巴**：`import("m")/*c*/.A` / `typeof import("m")./*c*/A` 四条——
  `ImportTypeCloseRule.IsNameTailAt` 的两跳都走 `SkipNextWrapSymbol`（只跳软换行），
  注释挡在 `)` 与 `.` 之间（或 `.` 与名字之间）时判据给否 ⇒ `ImportType` 的区间只到 `)`、
  `qualifier` 整段丢；`Process` 的搬运循环也从 `endIndex` 起跨**同一跳**。
  这与第 875 轮那几格同源：**判据跨了、搬运必须跟着跨**。
- **元属性**：`import/*c*/.meta.url`——`ImportCloseRule.Previous` 的两道护栏
  （「紧跟 `(`」= 动态导入、「紧跟 `.`」= 元属性）都走 `SkipNextWrapSymbol`，
  注释一夹两道都不响 ⇒ 整段被收成一条**假导入声明**（缺 `MetaProperty` /
  `PropertyAccessExpression` / `Identifier`，多出 `ImportDeclaration` / `ImportClause`）。
  改成 `SkipNextTrivia` 之后形状回到 `[Keyword(import), ., PropertyAccess(meta . url)]`。
- **五条用例当场转绿**（`xl:known-gap` 按规矩撤掉、用例留着当守卫，各补一条 `xl:expect`；
  元属性那一份另加 `xl:absent Import`——那正是「没有被当成声明头」这条事实的判据）。

**另有一格「待登记」当轮销账**：第 900 轮那张表里最后剩的
「`asserts` 与名字之间换行」——这一轮**真跑了一次**：`function f(x: unknown): asserts` 换行
`x is string {}` 在 TS 那边**报三条诊断**（`Unexpected keyword or identifier.` 与
「A type predicate is only allowed in return type position…」），`asserts /*c*/ x` 那种
**夹注释**的写法才是合法的（而且一直是绿的）。所以这一格**不是缺口，是口径边界**——
它进不了 `xl:known-gap`（那一条账只收「TS 说得通、我们收不出」的形状）。
第 900 轮记它时只记了「量出了它」，没记「量的是合法还是不合法」；**这一轮补上那句话，
`probe6` 那张表的余量至此走空**。

**实测**：`cases:check` **1520**（+17 条新语料）、`cases:tags` **1520 条 / 5028 条断言 0 条不一致**
（+5 条期望 / +21 条断言）、`cases:astjson` **1498 份 / 35637 个节点六项全 0**、
`cases:shapes` 未覆盖 0（用例 1507 份）、`cases:tsast` **已知缺口 12 条还开着、0 条已经收掉**；
`coverage` **4100 / 4269 → 4105 / 4286**（+5 格转绿算分子、+17 条新语料进分母）、
`blocked 39 → 51`（新登记的 12 条按「登记即 blocked」的老口径算）、`differ 130`、
`bad 0`、加权 95.4% → **95.3%**。

**可复用的判据**：**普查要换地形，不要换尺子**。第 900 轮那一趟把「注释 / 换行插进每一个
相邻位置」问遍了 48 个构造，收完之后清单空了——看起来像「这一片已经没缺口了」，
其实只是**那 48 个构造**没缺口了；同一句话换 47 个新构造再问一遍，一次就量出 17 格。
**「清单空了」是清单的性质，不是语法的性质**。

### 第 908 轮：接着那 12 格往下走——**当轮又收掉 3 格**（缺口 12 → 9）

**一句话**：第 907 轮登记的那 12 格里，有 3 格是同一族的「**判据只看紧邻那一格，没跨 trivia**」——
与第 907 轮收掉的 `import` 那 5 格同源。三格一起收，各自只改一句话。

- **`else if/*c*/ (b)`**（`gap-r907-else-if-comment-before-paren`）：`IfSet.Navigate` 里
  「`else` 后面接里层 `if`」那一支要求 `tail instanceof Identifier`，而注释到达时
  `if` 已经读完、`(` 还没到 ⇒ 尾巴是**那条注释** ⇒ 判不到 ⇒ 整条 `else if` 落进
  「`else` 后面是一条以 `if` 开头的语句」那一支。补一格
  「`else` + `if` + trivia + `(`」：**只在当前这一格确实是 `(` 时才签**
  （那正是 `else if` 唯一可能的后继），跨过 trivia 往回找那一对（`SkipPreviousTrivia` 两跳）。
- **`case 1:/*c*/ { break; }`**（`gap-r907-switch-block-comment-before-brace`）：
  根因**不在 switch 那一族**，而在 `text-common-util.xl.md` 的 `IsCaseClauseColon`——
  它往左那一跳只跳软换行 ⇒ 注释挡住 `:` ⇒ 判否 ⇒ `IsStatementStart` 判否
  ⇒ `BlockCloseRule` 不给这个块**补语句队列** ⇒ 块里的 `break;` / `let x = 1;` 全成散单元
  （缺 `BreakStatement`，多出 `Identifier` + `SemicolonToken`）。第一跳改成 `SkipPreviousTrivia`。
  **同一个函数的第二跳下面那句 `continue` 早就把注释当透明**——一处跨、一处不跨，正是这一族的形状。
- **`do/*c*/ f(); while (1);`**（`gap-r907-do-body-comment-range`）：
  `do-while.xl.md` 的 `Process`「体先断句」那一支取壳的起点时用的是 `unit.Data[0]`，
  而那一格可能是注释 ⇒ 体的区间从注释起（实测 `ExpressionStatement [2,12)`，TS 是 `[8,12)`）。
  改成取**第一格非 trivia**——同一段代码上面那句 `bodyUnits`（判空体）用的就是同一口径。
  另把另一支的 `bodyStart` 也改成 `SkipNextTrivia`（那支只跳软换行），跳过的注释按第 843 轮
  那一手用 `CommentsIn` 显式收下。

**实测**：`cases:tsast` **已知缺口 12 → 9 条还开着**（收掉的 3 条按规矩删掉 `xl:known-gap`、
用例留着当守卫并各补一条 `xl:expect`）；**九道门全绿**（墙钟 33.1s）——
`cases:check` 1520 / 0、`cases:tags` 1520 条（1454 条带期望、**5047** 条断言）0 条不一致、
`cases:astjson` **1501 份 / 35717 个节点**六项全 0、`cases:shapes` 未覆盖 0、
`samples` / `runtime:*` 全过；`coverage` **4105 / 4286 → 4108 / 4286**（`blocked 51 → 48`）、
`differ 130`、`bad 0`、加权 95.3% 一位没动。

**可复用的判据**：**「判据跨 trivia、搬运也跟着跨」是一条可以照着扫的线**。
第 907 轮它落在 `import` 那一族，这一轮落在 `if` / `switch` / `do` 三族上——
三处的症状各不相同（少一条 `else` 段 / 块里没有语句壳 / 区间起点多一格），
根因却是同一句话：**判据只看紧邻那一格**。收完一族的经验要拿回同一族里再问一遍，
问法就是「这附近还有谁在只看紧邻那一格」。

### 第 909 轮：再收 3 格（缺口 9 → 6）——**投影的区间 / 空段判据 / 续接表各一格**

**一句话**：第 907 轮登记、第 908 轮收剩的那 9 格里，这一轮挑三格——它们分别在
**投影那一层**、**收尾期那一层**与**解析期那一层**，所以正好把「查缺口要往哪一层看」这件事
再走一遍。

- **`<T,/*c*/>` 多出一个零宽 `TypeParameter`**（`gap-r907-arrow-generic-comment-before-close`）：
  根因在 `type-parameter.xl.md` 的 `AppendSegment` —— 它滤掉 `LineWrap` 之后按
  **单元个数**判「这一段是不是空的」，而逗号后面那一段**只有一条注释**
  ⇒ 也包出一个零宽的 `TypeParameter`（实测 `EXTRA TypeParameter [13,13)`）。
  改成先数一遍**非 trivia** 的单元；一个都没有就把那些注释**原样 push 回列表**
  （注释照旧进树，只是不包进参数）。
- **`export default 1/*c*/;` 的区间**（`gap-r907-export-default-assignment-trailing-comment`）：
  尾分号那一问看的是「`end` 那一格是不是 `;`」，而 `end` 后面紧挨着的**是注释的开头**
  ⇒ 区间停在 `1` 之后（产物 `[0,16)`、TS `[0,22)`）。先把空白与注释跳过再问一次
  （**换行也一起跳**：`export default 1` 换行 `;` 在 TS 那边同样是 `[0,18)`、含那个 `;`——
  这一档是**量出来的**，不是照 TS 的 `finishNode` 推的）。
- **`tag` 换行 `` `a${b}c` ``**（`gap-r907-tagged-template-newline`）：
  解析期那张续接表（`NextLineContinuesExpression`）里**没有模板串那一档**，
  而收尾期的 `IsLineBreakBoundary` 里一直有 ⇒ 换行处收壳、整条断成两条语句。
  现在 `head === "`"` 直接答「续接」——`` ` `` 接在一条表达式后面**永远是**标签模板，
  与 `<` 那一条同一个理由。

**实测**：`cases:tsast` **已知缺口 9 → 6 条还开着**；**九道门全绿**（墙钟 33.2s）——
`cases:check` 1520 / 0、`cases:tags` 1520 条（1457 条带期望、**5059** 条断言）0 条不一致、
`cases:astjson` **1504 份 / 35805 个节点**六项全 0、`cases:shapes` 未覆盖 0、
`samples` / `runtime:*` 全过；`coverage` **4108 / 4286 → 4111 / 4286**（`blocked 48 → 45`）、
`differ 130`、`bad 0`、加权 95.3% 一位没动。

**可复用的判据**：**同一格缺口可以住在三层里的任何一层**。这三格的症状都是一句
「产物与 TS 差一格」，可根因分别是**投影取区间**（`print-ast-common`）、
**收尾期判空段**（`type-parameter`）、**解析期续接表**（`statement`）——
**先问「这一格是在哪一层定形的」，再去找那一层的判据**；在三层里乱翻是这一族最贵的走法。

### 第 946 轮：`new ns` 换行 `[a]()` 那一格——**「下标段后面接不接得上一次调用」决定它归谁**（缺口 1 → 0，第九次清空）

**一句话**：第 937 轮把 `[` 从 `NewArguments` 里放了出来（那一半是对的），
这一轮补上另一半——**`[` 后面接得上一次调用时，整段下标就是被构造者的一部分**
（TS 的 `parseMemberExpressionOrHigher` 先把 `.成员` 与 `下标` 整段取成构造者，再看末尾是不是 `(`）。

- **根因一句话**：`new ns[a]()` 与 `new ns(a)` / `new ns[a]` 是**三种不同的形状**，
  而本仓当时只能收出第一种与第三种之外的**第四种**——`New` 只盖住 `ns`、
  下标被 `PropertyAccessCloseRule` 挂到它外面、末尾那对括号又成了对那条链的又一次调用
  （`CallExpression[ElementAccessExpression[New, a]]`，实测缺 `ElementAccessExpression` 1、漂 1、多 3）。
- **修法**（一处，两格新方法）：`NewCloseRule` 的扫描遇到 `[` 时先问一句
  「这一整段后置下标**后面**那一格是不是 `(`」——
  - 是：整段下标收进 `NewType`（括号由下一圈照旧扫进 `NewArguments`）；
  - 不是：照第 937 轮的路走（下标留给链规则）。
  两格方法是 `IsClosedBracket`（「这一格是不是一个**已经收好的** `[ … ]`」）与
  `PostfixIndexRunEnd`（「这一段下标到哪结束」）。
- **第一版写错了、当场撤**（如实记）：`PostfixIndexRunEnd` 最初写成「沿列表找配对的 `]`」，
  实测给出 6 而不是 5——**内层括号在自己成形时已经把 `]` 吃掉了**，
  列表里根本没有那个符号，深度永远减不到 0。改成「下一格是不是又是一个**收好的** `[ … ]`」之后
  一次就对：**括号由 `BracketBranch` 自己成组，这一点决定了下标段的边界只能用 `Closed` 问**。
- **收掉 1 条**：`token/expressions/gap-r937-new-index-callee-newline.ts` 的 `xl:known-gap`
  按规矩撤掉、改名成 [`expr-new-callee-postfix-chain.ts`](tests/cases/token/expressions/expr-new-callee-postfix-chain.ts)
  留着当守卫（八格排版：换行落在 `[` 前、行注释落在 `[` 前、`.b` / `.b()` / `[b]()` /
  模板串 / 表达式下标 / 两段下标各一次）。
- **（二）同一批探针量出来的另外两格也一并收掉**：那一问从「后面那一格是不是 `(`」
  放宽成「**这一段下标后面那一格还能不能接下去**」——`.成员` / `(` 实参表 / `[` 下标 / 模板串
  都是 TS 的 `parseMemberExpressionRest` 会贪心吞下去的后缀，于是
  `new ns[a].b` 与 `new ns[a]`` ` `` 也各归位（前者 `NewExpression > PropertyAccessExpression > …`，
  后者 `NewExpression > TaggedTemplateExpression > …`）。
  模板那一格还带出投影层 0b 支的一处放宽（标签从「恰好两个单元」放宽成「末尾是反引号 `String`」），
  **放宽当场撞到一条回归**（`expr-template-tagged-in-operator`：`tag`a${x}b` === tag`a${x}b``
  也满足那句话，整条比较式被收成一个标签模板）——补上「模板前面那一串必须是**后缀链**」
  这条守卫之后两处都对。**「放宽一条判据」与「给它配一条守卫」是同一件事的两个动作。**
- **仍然没收的那一格（TS 自己读散的）**：`new ns<T>[a]()` —— TS 把它读成
  `BinaryExpression` + `CallExpression`（`<` 是关系运算符那一派），**没有可对齐的目标形状**，
  按口径边界留在门外（不是缺口）。
- **（三）同一片家族还剩一格，这一轮按规矩登记、不动手**：`new A[0]`（后缀里**没有一次调用**）
  在 TS 那边是 `NewExpression(A)` 再被 `[0]` 挂一次，两个区间不同；本仓投成
  `ElementAccessExpression(NewExpression(new A), 0)`——**层数对了、区间错了**。
  它是（一）（二）收掉的那一族的**补集**，而且**不是加一句判据能收的**：`new.xl.md` 的扫描
  一路往前、`Process` 返回之后那一格已经不在它手里，得把「下标归谁」挪到投影层。
  这一格是**普查量出来的**：`tmp/r946/sweep.mjs`（20 个 `new` 底样 × 每个相邻缝隙 ×
  `/*c*/` / 行注释 / 换行，TS 合法的 **630 条**）里 **68 条**对不上，**68 条全是同一格**——
  **「对不上的条数」不等于「缺口的个数」**，按条数排优先级会把一件事做成 68 件。
  守卫用例 `token/expressions/gap-r946-new-postfix-index-without-call.ts` 带着 `xl:known-gap`
  进语料 ⇒ `cases:tsast` 报「1 条还开着」（门照旧绿）。
  **这一条的两句诊断第 947 轮都推翻了**（「是补集」与「不是加一句判据能收的」），
  见下面第 947 轮那一节——**原文留在这里不改**，是因为「当时量到了什么」与
  「后来证明那是什么」要能对得上。
- **实测**：九道门全绿（墙钟 34.6s）——`cases:tsast` **1 条还开着、0 条已经收掉**（就是登记的那一条；
  其余 **562 条逐节点一致**）、`cases:astjson` 六项全 0（1574 份 / 39153 个节点）、
  `cases:check` 1585 / 1585、`cases:tags` 5276 条断言 0 条不一致、`cases:shapes` 未覆盖 0、
  `coverage **4185 / 4351**`（加权 95.5%，`blocked 28` / `differ 138` / `bad 0`）。
- **可复用的判据**：**「括号已经成组」是这一层的地基**。
  沿平坦列表数配对符号那种写法（栈式深度）在这里**永远不成立**——
  内层括号把收尾字符收进了自己，列表里剩下的只是「一个已经收好的单元」。
  下次要问「这一段到哪结束」，先问「这里的边界是一个**单元**还是一个**符号**」。

### 第 947 轮：`new` 那一族一次量到底——**第 946 轮的判据整个推翻**（缺口 1 → 0，第十次清空；顺带收 4 条、登记 1 条）

**一句话**：第 946 轮（三）登记的那一格（`new A[0]` 的下标该留在 `New` 外面）**不用收**——
它不是缺口，是**那一轮把 TS 的读法读反了**：TS 的 `new` 一律**先整段取「构造者」**
（`.` 与 `[]` 一起贪心走完、换行也不让路），**再看末尾是不是 `(`**；
那对实参括号只决定 `arguments` 挂不挂，**不决定下标归谁**。
于是 `new ns[a]` 与 `new ns[a]()` 本来就是同一条路，第 946 轮那一支判据
（「后面接不接得上后缀」）整个是多余的——**删掉它**，两格一起变绿。
**「量出来的结论」也要能被下一轮推翻**：这一轮第一件事就是拿最小片段去问 TS。

- **推翻的实测**：`const a = new A` 换行 `[1]();` 在 TS 那边是**一条** `NewExpression`
  （`expression` 是 `ElementAccessExpression(A, 1)`、`arguments` 是 `()`），
  不是第 946 轮记的「两个 `NewExpression` / `CallExpression`」。挡得住的是**分号**
  （`const a = new A;` 换行 `[1]();` 才是两条语句），不是换行。
- **修法**（一处，净删）：`NewCloseRule.Process` 的 `[` 那一支只剩一问——
  这一段下标**收好了**没有（`IsClosedBracket`）；收好了就整段跨过去、落进 `NewType`。
  `PostfixIndexRunEnd` 留着（「这一段到哪结束」还是它答），`afterIndex` 与
  「后面接不接得上 `(` / `.` / `[` / 模板」那三问一起删掉。
- **同一把尺子换成「真门那一条」口径再量**（第 946 轮的普查：20 个 `new` 底样 ×
  每个相邻缝隙 × `/*c*/` / 行注释 / 换行 = 630 条 TS 合法片段）：
  **修前 28 条对不上、修完 630 条一条不剩**（`tmp/r947/gate-sweep.mjs` 直接调
  `tests/parse/ts-ast.mjs` 的 `compareSource`）。第 946 轮那句「68 条全是同一格」要打个折：
  那 68 是**旧口径**的读数（把 `TemplateTail` / `LastTemplateToken` 这种同名别名、
  以及字段顺序也算成对不上），真门口径下其中 **40 条本来是对的**。
  **「探针报的条数」不等于「门报的条数」，量缺口先对齐口径。**（那 28 条里 24 条是下标那一格、
  4 条是下面这一格。）
- **顺带收掉第二格**（真门口径量出来的那 4 条）：**下标与模板串之间隔着换行 / 行注释**
  （`new A[0]` 换行 `` `t` ``）。TS 那边换行挡不住标签模板（`const v = new A` 换行 `` `t` ``
  是一条 `NewExpression > TaggedTemplateExpression`），而 `new.xl.md` 换行那一支原来的三问
  都不管模板 ⇒ 扫描停在换行上、模板留在 `New` 外面。
  补第四问时**判据要判到反引号上**：新加共用判据 `IsTemplateString`
  （[text-common-util.xl.md](typescript/text-common-util.xl.md)）——它与 `StartsWithTemplate`
  只差一问「引号本身」，因为**换行两侧**的相邻关系里 `new A` 换行 `"x"` 在 TS 那边是
  **两条语句**（下一格接不上 ⇒ ASI 插分号，实测），只看类名会把那个普通字符串并进被构造者。
- **登记新的一格**：这一族收干净之后又量到一族——**被构造者是标签模板、模板后面还接着后缀**
  （`new A` 换行 `` `t` `` `.b`）：token 层把整段平铺收进 `NewType`
  （`[Identifier(A), String, ., Identifier(b)]`），而投影的 0b 支要「**末尾**那一格是模板」、
  0c 支要「模板与后缀**已经折成** `PropertyAccess`」，两条都不成立 ⇒ 剩下的 `[., b]`
  被当成二元运算符的尾巴折成 `BinaryExpression`（实测 `new A` 换行 `` `t` `` `.b` 缺 1 多 2；
  `new A[0]` 换行 `` `t${x}` `` `.b` 缺 8）。守卫用例
  [`gap-r947-new-template-then-postfix.ts`](tests/cases/token/expressions/gap-r947-new-template-then-postfix.ts)
  带着 `xl:known-gap` 进语料。
- **用例的账**：`gap-r946-new-postfix-index-without-call.ts` 按规矩撤掉 `xl:known-gap`、
  留着当守卫（五档：数字 / 标识符 / 字符串下标，以及下标后面再接 `.成员` / 再接下标）；
  `expr-new-callee-postfix-chain.ts` 的注记按新读数改写（那一族只剩「收好了没有」一条判据）。
- **（一）实测**：九道门全绿（墙钟 32.6s）——`cases:tsast` **1 条还开着、0 条已经收掉**（就是新登记的那一条）、
  `cases:astjson` 六项全 0（**1575 份 / 39231 个节点**）、`cases:check` **1586 / 1586**、
  `cases:tags` **1586 条用例 / 1508 条带期望 / 5279 条断言**，0 条不一致、`cases:shapes` 未覆盖 0、
  `coverage **4186 / 4352**`（加权 95.5%，`blocked 28` / `differ 138` / `bad 0`）。
- **（二）上一条登记的那一格当轮收掉**（`new A` 换行 `` `t` `` `.b`）：投影那一侧一处——
  0b 的判据从「**末尾**那一格是模板」放宽成「**链里有一格是模板**」（模板前面那一串仍要过后缀链那一问），
  模板后面那一串交给 `chainOnto`（与 0c 走同一段代码）。
  **尾巴必须整段都是链的续格**（新加的 `IsChainTail`）：混着运算符就整个让开，
  交回通用那一支——宁可维持原来的错，也不把「模板不在这一格的末尾」当成标签模板。
- **（二）同一批底样（815 条）又量出两族，两族一起收**（`tmp/r947/gate-sweep2.mjs`，
  换了一批**标签模板**的底样：21 个 `new` / 非 `new` 的模板排版 × 每个相邻缝隙 × 三种 trivia）：
  - **标签是平铺的一条链**（`o/*c*/.tag`t`.b`）：那条注释把 `o.tag` 拆平了，产物是
    `[Identifier(o), ., Identifier(tag), PropertyAccess(String, ., b)]`，而 0c 卡在 `kids[1]` 上
    （它现在是**点号**）⇒ 模板与后缀整片丢（缺 3 漂 1）。修法：0c 先**找出那一格装着模板的
    `PropertyAccess`**，标签取它**前面全部**。
  - **点号不在后缀链的词表里**（`new A.B` 换行 `` `t` `` `.c` 那一族 27 条）：
    `tagIsPostfixChain` 原来只认 `Identifier` / `PropertyAccess` / `Method` / `Bracket` / `String`，
    而平铺的链里点号是**自己一格**（`[Identifier(A), ., Identifier(B)]`）⇒ 整条判否。补上点号
    （这一问要挡的是**运算符**，点号与名字不在其中）。
  - **读数**：这一族从 **261 条对不上 → 0 条**（815 条 TS 合法片段全过）；
    另一把尺子（`new` 那一族 630 条）照旧全过。守卫写进
    [`expr-template-tagged-suffix.ts`](tests/cases/token/expressions/expr-template-tagged-suffix.ts)（加三档）
    与 [`gap-r947-new-template-then-postfix.ts`](tests/cases/token/expressions/gap-r947-new-template-then-postfix.ts)
    （`xl:known-gap` 按规矩撤掉、加两档）。
- **（二）仍然留着的一族**（**没登记、如实写在台账里**）：`o/*c*/.tag`t` + 1`——
  **模板单元跟在运算符单元后面**那一族（第 176 轮就写在 0d 的注记里：「本轮不做」），
  它量的是投影的左脊柱怎么折，与本轮这两处不是同一格。
- **（二）实测**：九道门全绿（墙钟 31.7s）——`cases:tsast` **缺口清单是空的**（**第十一次清空**，
  距上一次登记只隔一个 commit）、`cases:astjson` 六项全 0（**1576 份 / 39348 个节点**）、
  `cases:check` **1586 / 1586**、`cases:tags` **5279** 条断言 0 条不一致、`cases:shapes` 未覆盖 0、
  `coverage **4187 / 4352**`（加权 95.5%，`blocked 27` / `differ 138` / `bad 0`）。
- **（三）缺口清单空着的时候再开一轮普查**（第 907 轮那个手法）：换一批底样——**声明 / 语句 / 模块**
  那一侧（表达式那一侧前两轮已经量了两遍），32 个底样 × 每个**词的边界** × 三种 trivia
  = **1430 条 TS 合法片段**（`tmp/r947/gate-sweep3.mjs`）。量出两族，两族当轮收掉：
  - **类型参数表另起一行**（`type Y` 换行 `<T> = { a: T }`）：TS 那边是**一条** `TypeAliasDeclaration`，
    而收尾期从 `=` 右边那个 `{` 回扫会先撞上 `Y` 与 `<T>` 之间那个换行——`IsLineBreakBoundary`
    只看形状（`Y` 不要操作数、`<T>` 也不在它的续接表里）⇒ 答「是边界」⇒ 那个 `{` 被收成
    **对象字面量**（实测缺 `TypeLiteral` / `PropertySignature` / `TypeReference` 各一、
    多 `ObjectLiteralExpression` / `PropertyAssignment` 各一）。**解析期那一半本来就问过这一句**
    （`StatementBranch.Condition` 把 `IsDeclarationHeadAwaitingParameters` 排在 ASI 判据**之前**
    ⇒ 壳一直开着，这也是为什么这一格只坏在类型位判定上），收尾期补问**同一句**即可：
    两半从此同口径。
  - **泛型箭头的返回类型标注跨行**（`const g = <T,>(x: T):` 换行 `T => x;`）：
    `IsValueArrowReturnColon` 原来只认「`)` 左边是 `=`（或 `async`）」，而泛型箭头那里
    `)` 左边是**类型参数段**、`=` 还在它更左边 ⇒ 换行处收壳 ⇒ 整条箭头分家
    （实测缺 5 漂 3 多 8：第一条壳停在 `:` 上、余下那段被读成一条 `Lamda`）。
    修法是把第 928 轮那一档扩成**一格一格往回跳**：`async` 与类型参数段两格都认
    （`= async <T,>(x: T):` 与 `= <T,> async …` 两种排版都在）。
  - **读数**：这一族 **2 条 → 0 条**（1430 条一条不剩）；另两把尺子（`new` 那一族 630 条、
    标签模板那一族 815 条）照旧全过。守卫写进
    [`type-alias-params-newline.ts`](tests/cases/token/types/type-alias-params-newline.ts)
    与 [`expr-generic-arrow-return-newline.ts`](tests/cases/token/expressions/expr-generic-arrow-return-newline.ts)。
- **（三）一条量法上的教训**：这一批最初报出 **18 条**，可它**全是同一个假缺口**——
  探针把 trivia 插到了**词的中间**（`Number` 被切成 `n` 换行 `Number`），量的是**另一个程序**。
  把缝隙收到「**词的边界**」（前后两个字符都是 `[A-Za-z0-9_$]` 就跳过）之后，那 18 条一条不剩。
  **探针报 FAIL 时先问「这个片段在 TS 里到底读成什么」**（第 894 轮那条）在这里的版本是
  「**这个片段还是原来那个程序吗**」。
- **（三）实测**：九道门全绿（墙钟 31.4s）——`cases:tsast` **缺口清单是空的**、
  `cases:astjson` 六项全 0（**1578 份 / 39445 个节点**）、`cases:check` **1588 / 1588**、
  `cases:tags` **1588 条用例 / 1510 条带期望 / 5286 条断言**，0 条不一致、`cases:shapes` 未覆盖 0、
  `coverage **4189 / 4354**`（加权 95.5%，`blocked 27` / `differ 138` / `bad 0`）。
- **可复用的判据**：**「上一轮的诊断」是一条要复核的读数，不是前提**。
  第 946 轮（三）写下两句很有把握的话（「是补集」「不是加一句判据能收的」），
  而这两句都建立在一个**没被真问过的 TS 读法**上；一问就散。
  另一条：**「上一条用例改绿了」不等于「那一族收干净了」**——
  换成真门口径之后，同一族里还剩 4 条从没进过任何用例（第 946 轮那 68 的读数把它们盖住了）。
  第三条（（二））：**换一批底样比放宽一条判据更能找缺口**——
  同一个 0b 支，用「模板 + 后缀」那 21 个底样一量，又量出两族（平铺的标签链、点号不在词表里）。
  第四条（（三））：**收尾期与解析期那句「这一行写完了吗」要问同一份判据**——
  这一轮那两族都是「解析期早就问对了、收尾期自己又判了一遍」。

### 当前状态（最近一次全量实测）






| 判据 | 结果 |
| --- | --- |
| `cases:tsast` | **四方向 0、未映射 0、缺 range 0、区间越界 0、抛异常 0**（登记的那些已知缺口走另一条账）；`xl:known-gap` **0 条还开着**（**第 984 轮**：清单空着就换**第九批底样**（声明头与类型位那一侧——`using` / type-only 子句 / 条件类型与 `infer` / 签名与成员 / `super` / 可选 `catch`，908 条合法片段）量出 **4 条**、**当轮全部收掉**（三格同根，全在 `import … = …` 那一族，见下面第 984 轮那一节）⇒ 这一栏照旧是空的、**这一轮一条都没登记**；第 983 轮不动清单）（**第 980 轮**：最后那一格 `` new f<T>`t` `` 收掉 ⇒ **清单第十八次清空**——根因不在表达式位的后继闸（第 977 轮已收下反引号），而在 **`IsTypePosition` 把 `new f<T>` 判成类型位**（`new` 在那张类型词表里，为构造签名）+ **`New.PrintAst` 把 `<…>` 收成了外层 `NewExpression` 的 `typeArguments`**；两处各补一格、同族 35 条片段修前 12 条对不上修后 0 条；**4 条已经收掉**）。**第 979 轮**：第 978 轮登记的那一族三条**全部收掉**——根因不在 0b 的链词表（第 977 轮那两格补对了），而在 **0a 那一支先响**：`callee<…>` 一进来就被投成 `ExpressionWithTypeArguments`、模板串交给 `foldBinaryFrom` 时整片丢；0a 里补一档「`callee<…>` 后面紧跟模板串 ⇒ `TaggedTemplateExpression`」+ 尾巴三档（0b / 0c / 0d 同一个接法）+ `chainOnto` 收下「紧跟一格反引号模板」。两批 26 条同族片段：修前 12 条对不上、修后只剩 `` new f<T>`t` ``（token 层 `new` 那一趟不认后继是反引号），按规矩登记进语料 ⇒ **1 条还开着、3 条已经收掉**。**第 978 轮**：清单空着就按规矩换第六批底样普查——值位的 `as` / `satisfies` / 实例化表达式 / 泛型箭头 / 类表达式，**1430 条片段里 39 条对不上**，而它们**全部出自同一个底样的一个后继格**（`f<T>`t``）；当轮把那一格的**前半**收掉（表达式位后继闸收下反引号 + 投影的链词表收下投出来的节点名），**三条按规矩登记进语料**：`gap-r977-inst-tagged` / `-two-args` / `-template-expr`。**0 条已经收掉**；**第 979 / 980 两轮**把那一族连同 `` new f<T>`t` `` 一起收干净（⇒ **0 条还开着**、4 条已经收掉））（**第 976 轮按实测订正这一格**：下面是第 974 轮那一节留下的现场账，而第 975 轮（四~六）已把那 13 格连同同轮普查新量的 6 格一起收干净 ⇒ 一行 `xl:known-gap` 都不剩。**第 974 轮**：第 972 / 973 两轮把第 971 轮登记的两格收掉（`a!()()().c` 是入口判据 `isCallFirstUnit` 的 `Method` 那一支不认「头一格又是一格 `Method`」+ 链循环里「空名字 `Method` 套空名字 `Method`」那一档少一层；`a?.b![0].c` 是 `chainOnto` 的子链那一支住在 `isDot` 段里面 + 子链循环缺下标那一支），清单**第十五次清空**；清单空着就按规矩换一批底样——30 条同族片段（层数更深）里 **13 条对不上**，逐条登记进语料 ⇒ 0 → **13 条还开着**）。再往前：**第 971 轮**先把第 964 轮那三格一起收掉（3 → 0、清单清空：`a!()().c` 是入口判据 `isCallFirstUnit` 只认平级实参括号、`a?.b()()()` 是 `chainWithOptional` 只读第一格 `Method` 的名字、`a?.b!.c.d` 是 `chainOnto` 子链循环跳过落单的第一格名字），同一轮又拿 30 条同族片段普查，**量出两格新的**（`a!()()().c` 缺 5、`a?.b![0].c` 缺 3 漂 1）并**按规矩登记进语料**（0 → 2 条还开着）。再往前是 **第 964 轮**换一批底样（47 条）普查量出 11 格——10 格按规矩登记进 `tests/cases/token/expressions/gap-r964-*.ts`、1 格真门量下来当场就是对的所以撤掉指令；清单上一次是空的，在第 960 轮。**第 962 / 963 轮**补的是同一族那几条路——入口判据、四处同形副本与下标那一格的续接，全在**投影层**，token 语料**逐节点一字未动**，所以 16 片照旧全过）。**第 960 轮**把第 955 轮登记的最后一格收掉（`yield` / `await` 的「第三态」：**裸的那个词才按上下文分**，带操作数的一律是表达式——判据是新增的 `functionContextOf`，两条反向守卫各钉一半）。**第 959 轮**把第 958 轮登记的最后那一格收掉（谓词那个括号落在**带体的类成员返回类型位**时 `BodyIndex` 往回走那一趟认错形参表——判据转发给谓词那条规则的同一份实现，缺口 2 → 1）。此前：**第 951 轮**把第 949 轮登记的第一条按「**同一份位置判据**」收掉：折叠发生在键括号**关掉那一刻**，那时外层 `{` 还没关闭、且已经在宿主自己的平列表里（`BracketBranch.Success` 的 `AddToMounted` 挂的），所以位置问得出来——`type M<T> = {`（`=` 前隔着 `GenericType`）与 `Promise<{ … }>`（泛型实参）这两种 `Bracket.Context` 答 `"value"` 的排版，`TypeLiteralCloseRule.IsTypePosition` 都答「类型位」，第 949 轮撤回时坏掉的那六条**一条没坏**；**第 952 轮**把「值位对象字面量里嵌一层」那一族收掉（位置沿「直接嵌着的表达式花括号」链往上爬，**声明体与标签块那里断**）⇒ 清单第十二次清空；**第 950 轮**把第 949 轮登记的第二条按「窄判据」收掉（缺口 2 → 1）；**第 947 轮**把 `new` 那一族一次量到底：换成「真门那一条」口径之后 630 条片段全过，收掉第 946 轮（三）登记的那一格**并推翻它的两句诊断**——TS 的 `new` 一律**先整段取「构造者」、再看末尾是不是 `(`**，于是 `new ns[a]` 与 `new ns[a]()` 是同一条路；同一轮还收掉「下标与模板串之间隔着换行 / 行注释」那 4 条；**（二）**把同一轮登记的那一格也收掉（投影 0b 放宽成「链里有一格是模板」）并换一批**标签模板**底样（815 条）再量，又收掉两族——平铺的标签链（`o/*c*/.tag`t`.b`）与「点号不在后缀链词表里」（`new A.B` 换行 `` `t` `` `.c`），那一族 **261 条对不上 → 0 条**；**（三）**换一批**声明 / 语句 / 模块**底样（1430 条 TS 合法片段）再量，量出并当轮收掉两族——类型参数表另起一行（`type Y` 换行 `<T> = { … }`，收尾期补问解析期那一句）与泛型箭头的返回类型标注跨行（`<T,>(x: T):` 换行 `T => x`），读数 **2 条 → 0 条**。**第 946 轮**收掉第 937 轮登记的那一格 ⇒ **第九次清空**，判据是 `NewCloseRule` 的 `IsClosedBracket` + `PostfixIndexRunEnd`；第 941–945 轮逐格收掉了第 941 轮登记的那条导入属性子句。**第 934 轮**把第 933 轮登记的四格**全部收掉 ⇒ 缺口清单第八次清空**，四份用例撤掉 `xl:known-gap`、留着当守卫；另补 4 份守卫用例，语料 1570 → 1574。第 933 轮那次：换第三批构造再普查一次，770 条片段里 755 条合法，量出 **4 格**、另有**一族当轮收掉**——数组的洞 `OmittedExpression` 的位置；那 4 格按规矩登记进语料，见下面「开着的缺口」那一段。此前的账：第 931 轮量出 6 格、三族当轮收掉三格登记，**第 932 轮把那三格也收掉 ⇒ 第七次清空**）。更早那一串账：第 869 轮普查量出的 30 条由第 870–881 轮收完、第 900 轮片段普查量出的 4 条由第 901–902 轮收完、第 900 轮「待登记」栏里的 3 条由第 904–906 轮收完；第 907 轮换地形再普查一次，量出 17 格、当轮收掉 5 格，第 908 轮收 3 格、第 909 轮收 3 格；第 926 轮登记的 1 格由第 927 轮收掉 ⇒ **第四次清空**；第 927 轮（二）登记「柯里化的函数类型里层不成形」、第 927 轮（三）收掉它并登记「箭头的返回类型是带括号的函数类型」、**第 928 轮连它那一族一起收掉 ⇒ 缺口清单第五次清空**；第 929 轮把标签那一族又普查一遍、登记 5 格，其中「标签链中间换行」当轮收掉 ⇒ 4 格，**第 930 轮三趟把余下 4 格全收掉，其中最后两格当轮转绿 ⇒ 缺口清单第六次清空**；**第 931 轮又登记 3 格、第 932 轮全部收掉 ⇒ 第七次清空**；**第 933 轮换第三批构造再量一次，量出 4 格、登记 4 条；第 934 轮把那四格全收掉 ⇒ 第八次清空**） |
| `cases:astjson` | 出口 2 与出口 1 说的同一棵树：**1640 份 / 42516 个节点**，标签 / 属性 / 坐标 / 键名登记 / 命令行 / 抛异常**六项全 0** |
| `cases:tsast:cli` | 发布路径（慢，按需跑）：真开 `cjcli … --ts-ast` 进程逐文件对拍，与库路径同一条口径 |
| `samples` | hello / declarations / generic 三份 TS 形状夹具**逐字节**一致，且「命令行 = 库 API」 |
| `cases:check` | **1655** 条 token 用例，0 条不合格（这一道只走 `tests/cases/token`；执行那一侧的四类由 `coverage` 全覆盖） |
| `cases:tags` | **1655 条**（1527 条带期望，共 **5367** 条断言），0 条不一致；产物抛异常 **0** 条；标签表 **117** 种全被产出过，幽灵标签 **67** 种一个都没漏进产物；**结构不变式**（`Label` 必须包住它标的语句）0 条违反 |
| `cases:shapes` | 外部语料 **229 份**（用例 1642 份）里出现过的 kind / 形状签名**全部有用例覆盖**，未覆盖 **0** |
| `runtime:check` | **243 / 243** |
| `runtime:cli` | 直接执行 `.ts`：**79 / 79** 份与 `node` 逐字节相同 |
| `coverage` | **五类 4257 / 4421**，加权 **95.7%**。差的那些是**真缺口**（`blocked` 30 / `differ` 134），全都登在用例文件头的台账里；`bad` **0 条**、`regressions` **0 条**（第 985 轮：换轴（**嵌套宿主**：24 个客人 × 24 个宿主 + 接缝 trivia，1452 条合法片段）量出 **86 条 / 8 族**，当轮收掉最大的一族（**返回类型是复合类型时体换行**，26 条 ⇒ 新增 `Statement.IsFunctionHeadAwaitingBody`）⇒ 一条守卫用例进语料（分子 +1、分母 +1），其余 5 族按规矩登记 ⇒ 分母 +5、`blocked 25 → 30`、`differ 134` 一处没动（4256 → **4257** / 4415 → **4421**）、加权 95.7% 不变。第 984 轮：清单空着就换第九批底样（声明头与类型位那一侧，908 条合法片段）量出 4 条、**当轮全部收掉** ⇒ 三条守卫用例进语料（分子 +3、分母 +3，4253 → **4256** / 4412 → **4415**）、`blocked 25` 与 `differ 134` 一处没动、加权 95.7% 不变；这一轮改的是 **token 层（`import` 的头部与解析期续接表）+ 投影的判据**，`cases:tsast` 与 `cases:astjson` 两道门是它最要紧的守卫。第 981 轮：清单空着就换第七批底样（前缀单元 / 展开的操作数后面紧跟模板串或实参段，62 条片段）量出**五格、当轮全部收掉** ⇒ **分子 +1、分母 +1**（4248 → **4249** / 4407 → **4408**，那一条 13 条守卫的普通用例）、`blocked 25` 与 `differ 134` 一处没动、加权 95.7% 不变。第 980 轮：最后那一格 `` new f<T>`t` `` 收掉 ⇒ **分子 +1**（4247 → **4248**）、`blocked 26 → 25`、`differ 134` 一处没动、分母一处没动（那一份用例本来就进分母，只是走 `known-gap` 那条账），加权 95.7% 不变；这一轮改的是 token 层与 `new` 的投影，`cases:tsast` 的 16 片与 `runtime` 两道门是它最要紧的守卫。第 979 轮：那一族的三条登记用例**全部转绿** ⇒ **分子 +1**（4246 → **4247**）、另加一条十条守卫的普通用例（分子 +1、分母 +1）与一条新登记的缺口用例（分母 +1）⇒ 分母 4405 → **4407**、`blocked 25 → 26`（新登记那一格）、`differ 134` 一处没动、加权 95.7% 不变；这一轮改的是**投影层**，`cases:tsast` 的 16 片与 `runtime` 两道门是它最要紧的守卫。第 978 轮：解析层那三条登记用例进语料 ⇒ 分母 4402 → **4405**、分子一处没动（那三条本来就对不上）、`blocked 25 → 28`、`differ 134` 一处没动、加权 95.7% 不变。第 977 轮：绑定函数构造（`new (F.bind(null))()`）那一格收掉 ⇒ **分子 +1**（4242 → **4243**）、`blocked 25` 一处没动、`differ` **135 → 134**、分母一处没动、加权 95.7% 不变；这一轮改的是**宿主调用通道 + 三条开帧路**，`runtime:check 243 / 243` 与 `runtime:cli 79 / 79` 是它最要紧的守卫。第 976 轮：这一行此前停在 **4223 / 4396**、`blocked 38`——分母与 38 那个数是**第 974 轮普查当场写下的预估值**，而第 975 轮（四~六）把第 974 轮登记的 13 格与同轮普查的 6 格**全部收掉**（`xl:known-gap` 一处不剩、清单第十七次清空），于是 4396 → **4402**（9 份守卫用例）、`blocked 38 → 25`、分子 4223 → **4242**、加权 95.6% → **95.7%**。第 971 / 973 轮那两格的账在同一条线上：分子各 +1、`blocked` 各 −1。分类读数：`token 1623/1623`（100%，`xl:known-gap` 清单空）、`exec 756/792`、`runtime 736/776`、`stdlib 886/966`、`e2e 241/245`） |
| `npm run gates` | 上面各道一次跑完（实测墙钟 **~33s**） |



### 口径与已知缺口

**口径外**（不进分母，也不当缺口）只剩两种：**JSX / TSX**（独立于 TypeScript 的语法扩展）
与**故意写非法 TS**的 9 份（`xl:ts-invalid`，判据要量的正是错误处理）；
另有**装饰器**那一格因为 `node` 三种模式全拒收而**量不了**（裁判给不出来）。

**其余全是待做项**（用户口径，第 685 轮）：`RegExp` / `BigInt` / 多文件模块加载 /
动态 `import()` / `eval` / `console.log(new Error(…))` 的栈——`tsrun` 现在的**单文件口径是现状，不是口径**。
整张清单与理由见 [tests/parse/typescript-parsing-gaps.md](tests/parse/typescript-parsing-gaps.md)
与 [docs/runtime-architecture.md](docs/runtime-architecture.md) §15。

**开着的缺口**（只剩这些）：

- **`xl:known-gap` 那本账：5 条还开着**（**第 985 轮第十批底样量出并登记**——这一栏自第 981 轮以来
  第一次不为空）。五条各自一个判定点、都带实测差额与入手处：
  `types/gap-r985-jsdoc-nonnull-in-type-position`（类型位里的 `!` 是 `JSDocNonNullableType`）、
  `expressions/gap-r985-paren-object-inside-object-value`（对象字面量属性值里的 `({ … })` 被收成
  `TypeLiteral`）、`declarations/gap-r985-heritage-optional-chain`（继承子句里的可选链）、
  `declarations/gap-r985-heritage-tagged-template`（继承子句里的标签模板）、
  `declarations/gap-r985-heritage-template-expression`（继承子句里的模板串——整条类没成形）。
  第 979 轮登记的那一族三条
  （`gap-r977-inst-tagged` / `-two-args` / `-template-expr`，根因是 **0a 那一支先响**）
  与第 979 轮新登记的那一条（`` gap-r979-new-inst-tagged ``，根因是 **`new f<T>` 被 `IsTypePosition`
  判成类型位** + `New.PrintAst` 把 `<…>` 收成了外层 `NewExpression` 的 `typeArguments`）
  **第 979 / 980 两轮全部收掉**，四条都改成 `xl:note`、用例留着当守卫。
  **第 981 轮**清单空着就按规矩换第七批底样普查（前缀单元 / 展开的操作数后面紧跟模板串或类型实参段，
  62 条片段），量出**五格**（`typeof f<T>`、`...tag`t``、`...f<T>`、`...tag`t`()`、`...a?.b`）
  **当轮全部收掉** ⇒ 清单照旧是空的（这一轮一条都没登记）。
  **第 984 轮**清单空着就按同一个规矩换**第九批底样**（声明头与类型位那一侧，908 条合法片段），
  量出 **4 条**（**三格同根**，全在 `import … = …` 那一族：头部的 trivia 被当成头部、
  `import type A = …` 里那个 `type` 被读成类型别名的头、`import A = foo` 换行 `("m")` 被当成一次调用）
  **当轮全部收掉** ⇒ 清单照旧是空的（这一轮也一条都没登记，第 983 轮同样不动这本账）。
  **第 985 轮**又换**第十批底样**（换轴：**嵌套宿主**，1452 条合法片段），量出 **86 条 / 8 族**，
  最大的一族当轮收掉（**返回类型是复合类型时体换行**，26 条），其余 **5 族 / 7 个判定点**
  **按规矩登记进语料** ⇒ 这一栏 0 → **5 条**（上面那五条，第 981 轮以来的第一次不为空）。
  上一次为空是**第 975 轮（第十七次清空）**，第 976 / 977 / 978 三轮不动清单。第 974 轮换一批更深的底样
  （调用 / 可选链 / 非空断言 / 下标，30 条同族片段）普查量出 13 格、逐条登记进语料；
  **第 975 轮（一~六）把那 13 格收干净**（入口判据 `isCallFirstUnit` 认下「`PropertyAccess` 头一格是
  `NotNull` 盖着调用」并摊成两格、`NotNull` 核是 `Method` / 断言那个核是实参括号、`innermostCallee`
  递归问到底、`chainOnto` 子链抬出 `isDot` 段并补下标那一支），**同一轮又换 48 条更深的底样**
  普查量出 6 格、**当轮也全部收掉**（清单第十六、十七次清空）。上一次为空是**第 960 轮**（第十四次），
  第 972 / 973 两轮清掉的是第十五次。**`yield` / `await` 那一格收掉了**：判据是「**带操作数的一律是
  表达式，只有裸的那个词才看上下文**」——`print-ast-common.xl.md` 的 `functionContextOf` 从 `yield` 那一格
  沿 token 的 `Parent` 链找最近的那一层函数体。两半各有一条守卫（`expr-yield-await-context.ts` /
  `mod-top-level-await-context.ts`），因为**只看一半都会红**（见下面第 960 轮那一节）。
- **ASI 是按形状预判的**：判据在 [typescript/tokens/statement.xl.md](typescript/tokens/statement.xl.md) 的
  `Statement.IsLineBreakBoundary`（前一个单元不再要操作数、后一个单元也不能续接 ⇒ 断句，
  加上 `return` / `throw` / `break` / `continue` / `yield` 与后缀 `++` / `--` 的受限产生式）。
  规范里 ASI 还有一条「**语法不允许时**才插分号」，本工程不看完整文法、只看形状，
  所以个别极端排版仍可能与 TS 不同——这类情况由 `cases:tsast` 巡检。
- **语言配置带来的两处差异**（不是解析器缺陷，是这套语言这么定义）：
  `\a` 解成响铃字符而不是字母 `a`；`@'…'` / `@"…"` 是逐字字符串前缀、不是装饰器。
- **块与表达式之间没有分隔符时**（`{ A }a += 1`：块紧跟着表达式，中间既没有 `;` 也没有换行），
  产物里块与后一条语句仍然**并进同一个 `<Statement>`**（与 TypeScript 的「两条语句」不一致）——
  这一条在 token 树（XML）上仍然是缺口，但**投影到 TS 形状时按 TS 的划分出节点**，
  所以 `cases:tsast` 是绿的。**被否决的改法**：把块当语句边界——切断了复合赋值的展开，
  **整段内容丢失**，比边界不合严重；不要再试。两条形状已经收进用例语料。
- **第 929 轮复核过、已经不是缺口的**两条：**`Label` 不再是「前缀标记」**——它现在**包住**
  它标的那条语句（`<Label label="outer"><While>…</While></Label>`，与 TS 的 `LabeledStatement` 同形）。
  原来那条时序限制没有被推翻（`LabelCloseRule` 必须排在 `TypeDefine` 之前，那一刻被标的语句还没成形）
  ——包那一步排在**容器的规则跑完之后**（`Statement.AbsorbLabels`，紧挨着 `Statement.SplitShell`）；
  守卫是 `tests/cases/token/statements/stmt-label-absorbs-statement.ts` 与 `cases:tags` 里那条
  结构不变式（产物里不许再有自闭合的 `<Label … />`）。另一条是**嵌套解构**：
  `const [[a, b], [, c = 0]] = m` / `const { a: { b }, c } = m` / `const [x, { y: [z] }] = m`
  的产物都是嵌套的 `BindingElement`、投影都是嵌套的 `ArrayBindingPattern` / `ObjectBindingPattern`，
  名字一格不丢（那句「进的是同一张逗号分隔表」的说法已经过期）。
- 其余仍开着的解析缺口**都在语料里**（各带一条 `// xl:known-gap <根因>`；**第 985 轮这一栏是 5 条**
  ——第 985 轮第十批底样量出的五族按规矩登记（见上一节），第 978 轮登记的三条与第 979 轮登记的一条
  已在第 979 / 980 两轮收掉，
  第 981 轮换第七批底样量出的五格当轮收掉、一条都没登记，
  上一次里有 10 条 ——
  **第 964 轮**换一批底样（调用 / 可选链 / 非空断言 / 下标，47 条）普查量出来的 11 格里
  登记进去的 10 格；第 11 格（`member-chain-call-twice`）真门量下来当场就是对的，
  指令按规矩撤掉、用例留着当守卫。这一批**只写了症状、没写根因**：
  本仓的规矩是「如实登记，不猜」。第 **934 轮**把**第 933 轮**换第三批构造（45 个构造 × 每个相邻位置 × `/*c*/` / 换行 = 770 条片段，
  755 条合法）普查量出来的那四格**全部收掉 ⇒ 缺口清单第八次清空**，四份用例撤掉
  `xl:known-gap`、留着当守卫。四格的根因各一句话（都记在
  [typescript-parsing-gaps.md](tests/parse/typescript-parsing-gaps.md) 的「解析层几条硬规矩」里）：

  - **`typeof import` 与形参表之间换行**（`token/types/gap-r933-typeof-import-newline.ts`）：
    解析期那张「哪些词结束得了一条语句」的表（`Statement.ExpectsOperand`）里**没有 `import`**
    —— 而它是保留字、后面必须跟东西（子句 / 名字 / `(`）⇒ 补进那张表，换行处不再收壳。
    **同一族的第二面**（成员位：`type T = { f: typeof import` 换行 `("m") }`）另有一格：
    `SignatureCloseRule` 会把括号抢成**无名签名**（`NameOnPreviousLine` 在那一格答否，
    因为 `typeof` 不是成员的开头）⇒ 新增 `IsImportTypeArguments` 让路。
  - **重载方法的类型参数表与形参表之间换行**（`token/declarations/gap-r933-overload-generic-newline.ts`）：
    `NameOnPreviousLine`（`SignatureCloseRule` 与「名字 + `(`」那条分工线共用的**唯一一份**判据）
    原来只看「换行前面那一格是不是名字」，而 `m<T>` 换行 `(a:T):void;` 里那一格是**类型参数段**
    ⇒ 名字在再往前一格也要认。少了它，`(a:T):void;` 被抢成无名 `CallSignature`、
    `m` 只剩给类型位（`GenericType` 投成 `TypeReference`）。
  - **连着写的两个 `case` 标签、第二个冒号后换行**
    （`token/statements/gap-r933-switch-case-newline.ts`）：`;` 那一档的成形器
    （`Statement.FormFrom`）早就会在 `switch` 体里按**最后一个段头**切壳
    （`LastClauseHeadIndex`），而**换行那一档**（`StatementBranch.Success`）漏了同一句 ⇒
    两个段头进了同一条壳。**两处成形器对齐**（第 836 / 928 轮那条「一处加、两处改」）。
  - **映射类型的值那一格换行**（`token/types/gap-r933-mapped-value-newline.ts`）：两半——
    ① TypeScript 的 `parsePostfixTypeOrHigher` 只在**同一行**上吃 `[`
    （`while (!scanner.hasPrecedingLineBreak())`）⇒ 换行之后的方括号**不是**下标访问
    （`type-bracket` 的 `Previous` 让路，判据按**原始字符**问：`HasLineBreakBetween`）；
    ② 映射类型在值类型之后照样 `parseTypeMembers()`（`parseMappedType`）⇒ 那个 `[K]` 是一条
    `PropertySignature`（`field` 的成员体白名单收下 `MappedType`，判据是「值类型之后 **且**
    换行或 `;` 之后」，投影那一侧 `MappedType` 多出 `members` 一格）。
    **同族顺手收掉的一格**：成员位里的**空方括号**（`{ a: A` 换行 `[] }`）在 TS 那边是
    **没有形参的** `IndexSignature`（`IsIndexSignatureName` 多一条「空括号也是索引签名」）。

  **同一轮的第四批普查**（`tmp/r934/gen2.mjs`：45 个构造 × 每个相邻位置 ×
  `/*c*/` / 换行 / **行注释+换行** = 912 条合法片段）又量出**两族**、当轮收掉：
  ① **映射类型 `-readonly … -?` 那一格**（`{ -readonly [K in keyof U]-?:U` 换行 `[K] }`）——
  可选标记与冒号在词法上是**一个** `SymbolToken("?:")`，而成员的位置判据只认裸 `:` ⇒
  判否 ⇒ 成员不成形；② **类型段尾巴上的行注释**那一族（28 个宿主，见
  `token/types/type-tail-linecomment.ts`）——行注释把它后面那个换行一起吃进来（TS 的
  trailing trivia），而第 902 轮在 `TypeDefine` 上只跳了注释、**没跳软换行** ⇒ 区间多一格，
  装它的 `NamedTupleMember` / `Parameter` 跟着多一格；`Parameter` 那一侧同一条口径
  （右端取最后一个实义单元）。

  **第五批普查**（`tmp/r934/gen3.mjs`：47 个构造 × 三种插法 = 880 条合法片段，
  选的是装饰器 / 模块与导出 / 类表达式 / 形参默认值 / 类型运算符那些族）再量出**两族**、
  当轮收掉：① **整条语句之后的前缀 `++` / `--` / `!`**（`let a = 1; a++; --` 换行 `a;`
  在 TS 那边是一条 `PrefixUnaryExpression`）——`Statement.EndsOperand` 原来只问「是不是
  运算符」，而解析期 `;` 收壳之后左边那一格已经是**一条成形的 `Statement`**
  （整条语句**不是**操作数）⇒ 加了「语句级单元不算操作数」那一条（`IsStatementUnit`）；
  ② **可选标记写在名字与形参表之间**（`interface I { b?` 换行 `(): E }`）——
  `NameOnPreviousLine`（`SignatureCloseRule` 与 `MethodDeclaration` 的分工线）
  原来只认「换行前面那一格是名字 / 类型参数段」，`?` 那一格落空 ⇒ 签名让路、
  `FieldCloseRule` 把 `b?` 与 `():E` 一起收成一条 `PropertySignature`。
  此前的账：**第 931 轮**换一批构造（52 个构造 × 每个相邻位置 × `/*c*/` / 换行 = 710 条片段，
  697 条合法）普查一次，量出 6 格；**三族当轮收掉、三格按规矩登记**，
  而**第 932 轮把那三格也一起收掉 ⇒ 缺口清单第七次清空**，三份用例撤掉 `xl:known-gap`、
  留着当守卫（`token/expressions/gap-r931-new-arguments-newline.ts` /
  `token/types/gap-r931-asserts-is-newline.ts` /
  `token/expressions/gap-r931-typeof-regex-range.ts` → `expr-typeof-regex-range.ts`）。
  **同一轮收掉的一族**（守卫 `token/expressions/expr-array-holes-trivia.ts`）：
  **数组的洞 `OmittedExpression` 是零宽节点，位置是「上一个逗号之后那一格」**——
  原来写的是 `lastEnd + 1`（上一个**元素**的终点 + 1），元素与逗号之间夹一条注释 / 一个换行时
  它停在注释开头（`[1/*c*/, , 2]` 的洞 TS 给 `[18,18)`、产物给 `[13,13)` ⇒ 漂 1 多 1）；
  头一个洞 `[, 1]` 的位置是**紧跟 `[` 之后那一格**（不是再 +1）。
  两处实现（`tokens/json/array-literal.xl.md` 与 `print-ast-common.xl.md` 的 `projectEachIn`）
  同一份口径一起改。
  此前的账：**第 931 轮**换一批构造（52 个构造 × 每个相邻位置 × `/*c*/` / 换行 = 710 条片段，
  697 条合法）普查一次，量出 6 格；**三族当轮收掉、三格按规矩登记**，
  而**第 932 轮把那三格也一起收掉 ⇒ 缺口清单第七次清空**，三份用例撤掉 `xl:known-gap`、
  留着当守卫（`token/expressions/gap-r931-new-arguments-newline.ts` /
  `token/types/gap-r931-asserts-is-newline.ts` /
  `token/expressions/gap-r931-typeof-regex-range.ts` → `expr-typeof-regex-range.ts`）。
  **第 932 轮那三格的根因各一句话**：
  - **`new` 的实参表在下一行**（`new Error` 换行 `("x")` / `new C<T>` 换行 `(x)`）：
    TS 那边实参表可以另起一行（parser 只问「紧跟在这一格后面的是不是 `(`」），
    而 `NewCloseRule.Process` 的扫描在换行那一格只跨「已成形的 `GenericType`」（第 905 轮）
    ⇒ 括号被折成对刚收好的 `NewExpression` 的又一次调用。**修法**：那一支多认「下一格是 `(`」，
    顺带把跨过的软换行从类型段的尾巴上摘掉（`typeEnd` 往回退）。
  - **类型谓词的名字与 `is` 之间换行**（`asserts x` 换行 `is string`）：`is` 是**上下文关键字**
    （`is;` 是一条合法语句），所以它不能像 `in` / `instanceof` 那样无条件进解析期那张续接表；
    这一档多问一句**形状**——这一段的尾巴正好是 `asserts` + 一个名字
    （`Statement.IsPendingTypePredicate`）⇒ 下一行那个 `is` 只可能是这条谓词的。
  - **正则字面量的区间多一格**（`typeof /re/;` 的 `TypeOfExpression` 是 `[10,22)`）：
    `RegexToken.ExitOrPre` 的签出落在**紧跟字面量后面**那一格上（走到那一支时当前字符
    已经在正则外面了）⇒ 单元区间比字面量多一个字符 ⇒ 走 `v.end` 的**父节点**跟着多一格。
    **修法**：签出改落在正则的最后一个字符上（`SignOut(source.Pre()!)`）；
    `PrintAst` 那道「从 `/` 扫到配对的 `/`」的重新量留着当保险。
  - **第 931 轮收掉的三族**（各留一份守卫用例）：
    **除号左边那一格**（`token/expressions/expr-division-after-comment.ts`）：
    `x/*c*/ / 2 / 3` / `"s" / 2 / 3` / `` `t` / 2 / 3 `` / `/re/ / 2 / 3` / `i++ / 2 / 3` /
    `this / 2 / 3` 六种写法在 TS 里都是**除法**，而 `RegexTokenBranch.Condition` 原先
    ① 只看倒数第二格（夹一条注释时那一格正是注释）、② 「不是 `Identifier` 也不是 `Bracket`」
    的单元一律答正则 ⇒ 除号被读成正则的开头，`<RegexToken>` 把 ` 2 ` 当正文吞掉
    （六族各缺两条 `BinaryExpression`）。修法两处：往回找「上一个实义单元」改走
    `SkipPreviousTrivia`（与第 817 轮那条「相邻的那一格一律走 trivia 口径」同源）、
    新增 `RegexTokenBranch.IsOperandUnit`（`String` / `RegexToken` / 后缀 `++` `--`，
    按类名判以免绕出环），`this` / `super` 两个**操作数关键字**单独放行
    （与 `binary-operator.xl.md` 的 `IsOperand` 里那句同源）；顺带把 `RegexToken`
    补进 `binary-operator.xl.md` 的 `IsOperand`（`/re/ / 2 / 3` 那条链因此能折）。
    **下一行以 `/` 开头**（`token/statements/stmt-asi-division-newline.ts`）：
    `Statement.NextLineContinuesExpression` 表里没有 `/` ⇒ `const a = 1` 换行 `/ 2 / 3;`
    在换行处收壳、后半截还被读成一条正则；`/` 接在**写完的表达式**后面永远是除号
    （与 `<` / 模板串那两条同一个理由），而 `NextLineFirstCharAt` 本来就把注释当 trivia 跳过。
  更早那些「注释 / 换行落在语法相邻位置之间」的账**已经逐族收完**（第 679–930 轮）；
  **第 929 轮**把标签那一族（刚改过形状）又普查了一遍：822 条片段里 820 条合法、量出 5 个根，
  逐条登记进 `tests/cases/token/statements/gap-r929-*.ts`
  （标签链中间换行 / 被标语句的体与头之间换行 / 被标语句是调用时那两格换行 /
  名字与冒号之间夹注释后还有一条语句 / 注释落在语句壳的第一格）——
  那 5 个根**都在第 929 轮之前就存在**（同一批片段在改动前的构建上量出 32 条对不上、
  改动后 26 条：6 条被这一轮顺手收掉、0 条新增）；**第 929 轮（三）把「标签链中间换行」那一格收掉**
  （`IsPendingLabelHead` 顺着标签链往左走，链上任意一个名字在语句开头整串就是标签头）
  ⇒ **5 → 4**，那一份用例留着当守卫；**第 930 轮把「被标语句是调用时那两格换行」收掉**
  （`done: f` 换行 `()` 里 `HasTypeColonBefore` 往回扫先撞上的那个 `:` 是**标签冒号**，
  可它一律照类型标注答 ⇒ `(` 那一格被判成新起一条语句 ⇒ 调用劈成两条；
  现在那一支问一句 `IsLabelColon`，与 `IsObjectLiteralBrace` 里原来内联的那一份收成同一格）
  ⇒ **4 → 3**；**第 930 轮（二）把「被标语句的头与体之间换行」那一族收掉**
  （`iface: interface I` 换行 `{ … }` / `en: enum E` 换行 `{ A }` —— 认「声明头里的换行不是语句边界」
  那一支是**从段首**看第一个词的，而段首是**标签名** ⇒ 词表问不到 `interface` / `enum`；
  现在它先跳过标签头，判据 `LabelCloseRule.SkipLabelHeads` 与 `Previous` 同源）⇒ **3 → 2**；
  **第 930 轮（三）把最后两格（同一族）一起收掉**——「名字与冒号之间夹注释、后面还跟着一条语句」
  与「注释落在语句壳的第一格上」：`LabelCloseRule.Process` 把那条注释搬到 `Label` **左边**
  （位置只能放左边），壳的**第一格**于是成了注释 ⇒ `SplitShell` 的「头是不是标签」当场为否
  ⇒ 尾巴不拆、`g();` / `h(x);` / `return 1;` 被一起吞进标签那一格；现在找头那一格时
  **跳过前导 trivia**，且只为「头是空 `Label`」那一档放行 ⇒ **2 → 0，缺口清单第六次清空**，
  两份用例按规矩撤掉 `xl:known-gap`、留着当守卫；
  **第 901–902 轮把第 900 轮量出的 4 条收完了，第 903 轮又把第 900 轮「待登记」栏里的
  E / F / H 三格登记进来，第 904–906 轮把这三格也收完，`cases:tsast` 的缺口清单第三次清空**；
  **第 907 轮换了一批构造再普查一次**（364 条新片段），量出 **17 格**并逐条登记，
  当轮收掉 **5 格**（`import` 那一族的 `SkipNextWrapSymbol` → `SkipNextTrivia`）；
  **第 908 轮又收掉 3 格**（`if` / `switch` / `do` 三族，同一句话：判据只看紧邻那一格）；
  **第 909 轮再收 3 格**（投影的区间 / 收尾期的空段判据 / 解析期的续接表各一格）；
  第 910–925 轮把余下 6 格逐格收完；**第 926 轮登记 1 格**（返回类型是「带注释的函数类型」时
  体里的语句不包 `Statement`）、**第 927 轮收掉它** ⇒ **缺口清单第四次清空**
  （第 927 轮量出的余量只剩「柯里化的函数类型里层不成形」那一格，**与注释无关、病在投影**，
  第 927 轮（二）顺同一条线又收掉两格——`type /*c*/ T = () => void;` 与
  「箭头的返回类型是函数类型」——并把柯里化那一格按规矩**登记成 `xl:known-gap`**；
  第 927 轮（三）从**投影**那一层收掉柯里化那格（平铺的 `( … ) => T` 段要投成里层
  `FunctionType`，`functionTypeProps` 与 `FunctionType.PrintAst` 共用一份），
  同轮把探针量到的**下一格**登记进来：箭头的返回类型是**带括号**的函数类型
  （`gap-arrow-return-parenthesized-function-type`）；**第 928 轮把它连那一族一起收掉**
  （根因是**三处判据各自近似地回答同一个问题**——`FindParameters` / `IsFunctionTypeArrow` /
  `TypeLiteral.IsTypePosition`——收成共用层一份 `IsArrowReturnTypeBracket` 之后全族转绿，
  同族的守卫立成 `expr-arrow-return-parenthesized-family`；**同轮第二趟把这一族的每个相邻位置
  各插一条 `/*c*/` / 换行再普查一次**（780 条，534 条合法），量出 3 格、一根收掉
  （`IsWrappedByTypeContext` 的回扫只跳软换行 ⇒ 撞上注释就答「值位」，
  守卫 `expr-arrow-return-parenthesized-comment`）；**第三趟换一批构造再插一遍**（872 条，
  783 条合法），量出 4 格、四根全收（泛型函数类型那一格的 trivia、类型别名右值等着形参表的
  换行、`async` 后面的返回类型换行、`async` 与形参表之间夹注释的投影两格），
  守卫见第 928 轮那一节 ⇒ **缺口清单第五次清空**；
  逐条根因见
  [tests/parse/typescript-parsing-gaps.md](tests/parse/typescript-parsing-gaps.md) 第 927 / 928 轮各节）。
  **它们与「已知缺口 0 条」不矛盾，量的是两把尺子**（第 881 轮清空的是后者）：
  `cases:tsast` 量的是**投影成 TS 形状**之后的对拍，而这一批缺口在 **XML 产物（token 树）**上——
  投影那一层按 TS 的划分出节点，所以 `cases:tsast` 是绿的、`xl:known-gap` 却照旧挂着
  （与上面「块与表达式之间没有分隔符」那一条同一个形状）。**第 881 轮起 `cases:tsast`
  一把尺子上已经没有登记的缺口了**；**第 900 轮片段普查量出 4 条**（都在 token 树这一把尺子上，
  量的是「类型位 / 值位那个没写完的 `:`」与「没有返回类型的调用签名」），
  **第 901–902 轮全部收掉**：
  `gap-r900-{arrow-return-type-newline,signature-return-newline,call-signature-no-return-type,infer-constraint-newline}`
  （各自的根因与实测账见上面第 901 / 902 两节）。**缺口清单第二次清空**（第一次是第 881 轮）；
  **第 903 轮又新登记三条**（`gap-r902-{abstract-method,new-typeargs,throw-no-argument}-newline`，
  第 900 轮「待登记」栏里 E / F / H 三格真跑确认之后登记，根因都尚未量清）。
  更早那些「主力是注释 / 换行落在语法相邻位置之间」的账**已经逐族收完**（第 679–881 轮），
  逐条根因见 [tests/parse/typescript-parsing-gaps.md](tests/parse/typescript-parsing-gaps.md)；
  `TypePredicateCloseRule` 的起点原来只认「容器第一格」与「紧跟 `=>`」，
  而 `type T = asserts x is A`（`=` 右边）与 `<X extends asserts x is A>`（`extends` 右边）
  同样是类型位；`TypeBracketCloseRule` 与 `IsEmptyContentUnit` 原来把**注释**当成实义内容
  （`readonly (A | B)/* c */[]` 与 `(A | B)[/* c */]`）。
  一张表 + 逐条根因见 [tests/parse/typescript-parsing-gaps.md](tests/parse/typescript-parsing-gaps.md)；
  执行侧那几条（对象字面量的值是一对括号里的二元表达式、`setTimeout` 这个全局名没登记、
  `using` / `await using` 的降级、`new Object(null)` 该造 `{}`，以及第 677 轮从
  **AST 语料**里量出的三条：类体空成员 `;`、对象解构的计算属性名 `{ [k]: v }`、
  嵌套模板里内插与 `}` 之间的空白——**第三条同一轮就收掉了**（投影里 `TemplateTail`
  的 `text` 起点算错），另外「按名字逐个点名」那一批还量出 `eval` 没登记与
  正则字面量会把整份文件带断）**也已经进矩阵**；
  **第 678 轮**又用三批语料把**内建成员表**这一层量了一遍（名字 → 行为 → 符号键），
  新量出的根子是：`length` / `name` / `constructor` 三格从来没人装、`WeakMap` / `WeakSet`
  的原型表**整张没装**、`Promise.prototype` 的 `then` / `catch` / `finally` 没装、
  `[[Prototype]]` **没有「改它」的那条路**（`setPrototypeOf` 换不动、`__proto__` 没装）、
  `defineProperty` 只收字符串键（连累 `Symbol.hasInstance` 这类协议）、盒子对象没有内部标签、
  well-known symbol 缺 7 格（含与 `RegExp` 无关的 `isConcatSpreadable` / `unscopables`）、
  `console` 缺 30 格、`Date.prototype` 缺 11 格、`String.prototype` 缺 19 格——
  每一格的症状与根子逐条登在
  [tests/coverage/README.md](tests/coverage/README.md) 的台账里。
  **第 679 轮**同样不写新片段，而是拿**已有的两份语料**各量一遍：**解析侧**用
  `tests/cases/token/**`（那 4 条 `gap-crash-try-*` 的同一族，全在 `try.xl.md` / `statement.xl.md` 上收掉），
  **执行侧**从**已在矩阵里的用例**里挑出还没验过的参数位，
  `String.prototype.includes` 的 `fromIndex` 是其中唯一一格，当轮就收掉了。
  **第 681 轮**换了问法（不问名字、不问行为，只问**参数位与边界**）：45 条一次进矩阵
  （`fromIndex` / `limit` / `radix` / 负下标 / 半值取整 / 空实参 / `$&` 那类替换模式），
  **45 条全部 pass**；同批量出的三条在**语言层**，当轮全部收掉——
  形参默认值带括号时投影成**未映射的 `Bracket`**（`b: number = (1)`、`enum E { A = (1) }`
  都**整份文件进不来**）、标签模板 `` o.tag`…` `` 少了 `this`（**静默错值**）、
  `new WeakMap().set(1, 2)` 该抛 `TypeError` 却静默收下（`WeakMap` / `WeakSet` 现在有
  各自的构造号与一格 `__w`，`get` / `has` / `delete` 照旧不抛）。
  **第 682 轮**再换一层问（`this` 与函数协议 / 数值与字符串边界 / 承诺与生成器的次序），
  34 条里 33 条 pass，量出的三条**全在语法层**、且都是「同一格判据差一点」：
  `b++ + 1` 把**后缀 `++` 读成前缀**（降级层只算到后半截，`n++ + ++n` 给 `1:1`、Node 给 `4:3`）、
  值位数组里的 `|` / `&` 被折成**联合 / 交叉类型**（元组 `[A | B]` 与值位数组共用
  `ArrayLiteral` 一个节点）、解构的**计算键**只在赋值那一半收下（`const { [k]: v = 1 } = o`
  报 `ast node ComputedPropertyName has no text`，台账里那条 `l677-*` 就是这个根）。
  另有一条**表示法边界**（私有名是普通属性键 ⇒ 错接收者读不到时给 `undefined`，不抛）
  留在矩阵里看得见。
  **第 683 轮**先把 **AST 语料**整批量了一遍（**1350 份里一份都收不了**：
  它们一行都不打印，而这条判据的硬规矩是「必须打印」——全语料用 `console.` 的只有
  第 677 轮那 57 份，**这份语料对 coverage 是封闭的**），再写 24 条探针
  （迭代协议 / 承诺组合子 / 对象内部件 / 类与 `new.target`），23 条 pass；
  另收掉一条**引擎级**缺口：`for..of` 里**抛出去**时的 **IteratorClose**
  （`EmitIteratorClose` 的注释写着「break / return / 抛出去三档都要调」，
  代码只铺了两条 ⇒ 自定义可迭代物的 `return()` 在异常路径上一次都不被调；
  for-of 的循环体现在外围套一张处理点，出事时两个 close 各跑一遍再原样抛出去）。
  **第 686 轮**换了一层问（**值位 vs 类型位**），量出并收掉一族**静默错树**：
  `IsTypeBracketPosition` 是按「前一个实义单元是什么符号」判类型位的，而 `:` 在
  **对象字面量**里是**值的分隔符**——于是 `const o = { b: [1 | 2] }` 里的 `|` / `&`
  折成 `UnionType` / `IntersectionType`，降级层报
  `unimplemented: expression UnionType`（**整份文件进不来**）。
  两处修法，各自管一半：`[` / `{` 那一半在 `type-union.xl.md` 的 `IsTypeContainer`
  （宿主是 `ObjectLiteral` ⇒ 值位，不依赖时序）；括号那一半在 `text-common-util.xl.md` 的
  `IsTypeBracketPosition`（撞上 `:` 时先问一次 `EnclosingBraceContext`——与
  `DecideBracketContext` 冒号那一支**同一句话、同一个依据**，对象字面量里的 `:` 是属性分隔符）。
  **已收**：裸对象值位、嵌套对象、计算键、`{ v: (7 | 8) }`、括号化对象里的**裸数组**。
  **还开着一格**（登在 `tests/cases/token/expressions/gap-value-array-bitwise-in-object-paren`）：
  **实参里的对象 / 括号化对象**里被包住的数组（`f({ z: [3 & 4] })`、`({ w: [5 | 6] })`）——
  招待那一格时外层 `{` 的 `Context` 还是空串，`EnclosingBraceContext` 因此给不出答案
  （它跳过 `Context` 为空的那个括号），宿主槽位也还不是 `ObjectLiteral`；
  要收它得让「包着我的那个 `{` 处在哪一位」在那两格上**当场**答得出来。
  **第 687 轮**换了一层问（**遍历中改集合**，一次 62 条候选、58 条 pass），
  量出并收掉一族**「长度被快照一次」的静默错值**——`Map` / `Set` / `Array` 三族
  **七处**同一个根子（`forEach` 与 `keys` / `values` / `entries` 那几支都把长度在进入时读一次）：
  - `m.forEach((v, k) => { if (k === "a") m.delete("b") })` 打出 `"a,b,"`（**尾巴上多一个空键**），
    Node 给 `"a,c"`；`delete` 把后面的往前挪、**尾部留一个洞**，而循环按旧长度又转了一圈；
  - 遍历中 `set` / `add` 进来的那一格**一层都走不到**（`m.keys()`、`s.values()` 同上）；
  - `[1, 2, 3]` 的 `forEach` 里 `pop()` 之后**还要空转一轮**（Node 只跑两次）。
  修法**七处同一句**：把长度从「进入时读一次」改成**每一步现读**（洞照旧跳过）；
  `Array` 那边**只有 `forEach` 跟着当下的长度走**——`map` / `filter` 收的仍是进入时那一份
  （三条台阶在 JS 里不是同一条，用例把两半都钉住了）。
  同一次普查还量到 **`Map.prototype.size` / `Set.prototype.size` 这两个访问器被实例上的
  同名数据格遮住**：`set` / `delete` / `clear` 三处各写一份 `size`（第二份账），
  于是 `delete` 之后 `s.size` **停在旧数上**（第 613 轮把它们改成 getter 时漏了这三处）——
  三处一起删掉，读数回到「`__k` / `__v` 的长度就是它」。
  **另有两格原样登着**：`for…of` 一个遍历中长大的 `Map` **看不见新键**
  （`map.keys()` 交出来的是一份**快照数组**，「取迭代器」那一半还没做成活视图，
  登在 `[111-clear-then-readd-slots](tests/cases/stdlib/map-set/111-clear-then-readd-slots.ts)`
  与 `[110-forof-live-view-not-taken](tests/cases/stdlib/map-set/110-forof-live-view-not-taken.ts)`；
  后者正是 `109` 收掉的那一件事的另一半）。
  **第 688 轮**沿「名字 → 行为」那一层再问一次**内建构造自己那几格**（38 条候选）：
  - **`length` 从来没人装**——`Array.length` / `Date.length`（7）/ `Map.length`（0）…
    十四格全是 `undefined`，而 **七条 `names-*` 用例一起红**（`113-names-array` /
    `099-names-map` / `101-names-set` / `064-names-number` / `146-names-string` /
    `117-names-object` / `044-names-date`）——它们各问一个名字，看起来像七件事，
    实际是**同一格**。挂在 `name` 那一格的旁边（**位置相同、标志位不同**：
    Node 的 `length` 是 `不可写 + 可配置`，而 `SetHiddenProperty` 的缺省是「可写 + 可配置」，
    少给那一位就是 `d.writable` 答真）；`Promise` 不在那张变量表里，单独补一格。
  - **`Object.getOwnPropertyDescriptor(f, "length")` 原来**响亮地抛**（「function length / name
    are not modelled」）**——可 `GetProperty` 第 291 轮就把 `f.length` / `f.name` 接上了，
    断的只有**描述符**这一条路，于是一句异常把整份文件带走；现在按 JS 的形状答
    （两格都是 `值 / 不可写 / 不可枚举 / 可配置`），找不到的键照旧给 `undefined`（不再抛）。
  - `Object.getOwnPropertyNames(函数)` 跟着把 `length` / `name` 算进自有属性。
  **还开着一片**（登在 `[128-function-prototype-layer-gap](tests/cases/stdlib/object/128-function-prototype-layer-gap.ts)`）：
  **函数不是真函数对象**——不自以 `Function.prototype` 为原型 ⇒ 少了 `arguments` / `caller`。
  那片原来还挂着两格（`typeof Object.prototype` 给 `function`、`Object.prototype.toLocaleString` 没装），
  第 689 / 690 两轮各收掉一格，只剩 `arguments` / `caller` 这一格。
  **第 689 轮**再沿着**原型方法表**问一次（20 条候选）：`Array.prototype` 那一张**一格不缺**，
  差的全在别处——收掉 `Object.prototype.toLocaleString`（规范里它的算法只有一句
  `Invoke(O, "toString")`，所以**不写第二份实现**，转交给 `ObjectToString` 那一支；
  **号落在 `504` 不是 `713`**：`700..799` 是 `InvokeObjectHelper` 那一段，
  写进去报的是 `unimplemented: object helper 713`——这一轮**实测撞到**）。
  **另外几格原样登着**（同源）：`Number.prototype.toLocaleString`（带**千分位分组**，
  没有区域设置那一层就补不了，补成 `toString` 反而**静默错**）、
  `String.prototype.match` / `search`（实参位要收**正则对象**，走 `Symbol.match` / `Symbol.search`
  那条协议，与台账里 `RegExp` 那 7 条同源）；`Object.prototype.toLocaleString` 自己
  **「转交给接收者」那一半**也还差（数字接收者该给 `"1"`、带自定义 `toString` 的对象该给 `"T"`），
  登在 `[130-tolocalestring-forwarding-gap](tests/cases/stdlib/object/130-tolocalestring-forwarding-gap.ts)`。
  **第 690 轮**换到**内建构造的调用形状**那一层问（`Object` 那两个入口 + 两条原型读数），
  收掉三处**静默错值**：
  - **`Object(null)` / `Object(undefined)` 原来原样返回那个原始值**（`global-array-object-ctors`
    只量了 `new Object(null)`，那一半早就对；`Object(null)` 这一半写的是「JS 里 `Object(null)`
    是 `null`」——**那不是 JS 的口径**：`Object(value)` 里 `null` / `undefined` 走
    `OrdinaryObjectCreate(%Object.prototype%)`，与无实参那一档**同一句**）。
    症状是 `Object(x) === null` 这种守卫在**传了 `null` 的那一次**判反。
  - **`Object.groupBy` 的分组表带 `Object.prototype`**：第 295 轮写的理由是「`Object.create(null)`
    本仓表达不了」——那句话第 299 轮就过期了（`ObjectCreate` 那一支把 `Proto = 0` 真写了进去）。
    现在照同一条路补一句，`"toString" in g` 与 Node 一样是**假**。
  - **`typeof Object.prototype` 给 `"function"`**：第 228 轮在 `RtTypeOf` 里把
    `Object.prototype` 与 `Function.prototype` **一起**认成函数对象，理由是「JS 里两个都报
    `function`」——**前半句是错的**。`Function.prototype` 在 JS 里确实可调用，
    `Object.prototype` 是**普通对象**（`typeof` 给 `"object"`）。两者同根不同命，
    认错了会让 `typeof x === "function"` 这种守卫对 `Object.prototype` 判真。
  - **同一轮的第二批**（包装对象那一格与知名符号名单）：`Object.prototype.toString.call(箱)`
    三族（`new Number` / `new String` / `new Boolean`）原来一律给 `"[object Object]"`，
    而 JS 的算法里那三个**内部格**（`[[NumberData]]` 等）就是三个标签。
    收法**不是照原型认**——本仓的箱在造的时候就把原值存进 `__box` 那一格了（`MakeBox`），
    判据就是「**自有**那一格在不在」（`UnwrapBox`）：照原型认会把
    `Object.create(Number.prototype)` 也答成 `"Number"`，而 JS 给 `"Object"`
    （这一条另立了用例 `137-object-create-is-not-box` 钉住）。
    位置也有讲究：它必须**排在 `Symbol.toStringTag` 之后**（JS 是先问 `@@toStringTag`），
    用例 `136-object-tostring-box-override` 量的就是这一句。
    知名符号那一张名单补齐七个（`isConcatSpreadable` / `unscopables` 与
    `match` / `replace` / `search` / `split` / `matchAll`）——**名字与协议是两件事**：
    名字是规范里的值（JS 里永远在），用到它们的那几个方法仍是待做项；
    顺带把那张名单收成**一个局部量**（原来 `Symbol` 自己与「知名符号表」两处各写一遍，
    漂了看不出）。
  - **同一轮的第三批**（`Promise.prototype` 那三格，以及一次**被量回来的改动**）：
    `then` / `catch` / `finally` 在 JS 里**就在原型上**，而本仓只在每个实例上挂一份
    （`MakePromise`），于是原型空着 ⇒ `typeof Promise.prototype.then` 给 `undefined`、
    `Object.create(Promise.prototype).then` 也给 `undefined`。补上之后另立一条用例钉**形状**
    （非枚举、`length` 2 / 1 / 1、`Object.create` 拿得到），因为「名字在不在」与
    「那三格长得对不对」是两件事。
    **同一次动手还撞出一处次序问题**：`Function.prototype` 自己的 `length` / `name`
    （`0` / `""`）照同一手法挂上去确实能让 `122-names-function-proto` 转绿，
    可 `props.xl.md` 里**可调用接收者**取属性的次序是「先自有、再 `protos.Function`、
    最后才是闭包载荷」，而 `f.length` / `f.name` 住在**闭包载荷**上
    （`Arity` / `Name`，第 291 轮）——原型上多了同名两格就先命中，
    于是**每一个函数**的 `name` 变 `""`、`length` 变 `0`：实测 **40 条用例一起红**
    （`089-function-tostring-and-name`：node `named 2 true` vs 本仓 ` 0 true`）。
    那一格**放回去了**，量出来的话写在代码注释与那一条用例的台账里：
    要收它得先把「闭包载荷那两格」提到 `protos.Function` 之前判，不是补一格属性的事。

**第 699 轮**（一批原子探针 202 份新语料：强制转换与相等 71 + 类与成员形状 66 + 字符串边界 65）
量出并收掉两处，另把两条**已经登在台账里**的缺口一起收掉：

- **类字段写的是「赋值」而不是 `[[DefineOwnProperty]]`**（**静默错值**，第 128 轮就写在明处的那条已知差异）：
  `class A { get x() { return 1; } }` + `class B extends A { x = 2 }` 之后 `new B().x`
  本仓给 **`1`**、Node 给 **`2`**（字段被原型上的 getter 拦住 ⇒ 实例上根本没有那一格）。
  同一根的反面是 `class A { set x(v) { this.got = v; } }` + `class B extends A { x = 2 }`：
  JS 在实例上造一格 `x`，走赋值会去**调父类的 setter**。
  修法是给语言层添一格内部调用 `define_data`（号 713）落在 `props.xl.md` 的
  `CreateDataProperty` 上（第 697 轮给 `JSON.parse` 立的那一格）——
  **实例字段、静态字段、计算键字段三条路一起换**，私有字段（`#n`）仍走 `set_hidden`
  （它不是一个属性）。顺手把 `set_hidden` 的键也过一遍 `ToPropertyKey`：
  `class A { [1 + 1]() { … } }` 那种**数字计算键**原来报
  `set_hidden with a key that is not a string or a symbol`（整个类进不来，
  台账里 `exec/classes/probe2-k14` 就是这个根，已撤）。
- **具名类表达式那层环境没开**（**整份文件进不来**，第 332 轮那套机关只接了一半）：
  `const A = class Named { static y = 2 }` 报 `env_leave with no parent environment`
  ——`EnterFunctionBody` 判「这一帧要不要开环境」用的是 `HasNamedExpression`，
  而它只认 `FunctionExpression`（类的体只是被**走进去**找具名函数），
  于是 `LowerClass` 里那三步的最后一步当场抛。加上 `ClassExpression` 之后，
  静态字段里的类名也**当场可读**：`class Named { static y = Named.name }` 原来读成
  `undefined`（报 `cannot read properties of undefined`），因为 `env_set` 排在
  **静态成员之后**——写值那一步挪到构造函数出来之后、`env_leave` 留在最后
  （规范里内层绑定在静态元素求值之前就指向那个构造函数）。
  两条台账（`exec/classes/probe-c09`、`exec/classes/probe2-k14`）转绿、已撤。

本批另登记 4 条新缺口（`blocked` +3 / `differ` +1）：`class A extends Array { }`
（内建构造当基类，`super(...)` 报 `heap object is not an environment`，与
`class M extends Error {}` 同根）、`class B extends null {}`（继承目标那一趟只按名字解析）、
派生类构造函数里 `super()` 之前读 `this` 该抛 `ReferenceError` 而本仓给 `undefined`、
以及字符串搜索族的实参（`"abc".includes({ toString() { return "k"; } })` 该走 `ToPrimitive`，
本仓直接拿 `JsTextUnits` ⇒ `unimplemented: ToString of this kind of value`）。
加权 **95.7% → 95.8%**（分子 +199、分母 +202）。

**第 700 轮**（第十一批原子探针 158 份新语料：字符串方法的实参形状 50 + 函数与闭包形状 57 +
迭代协议与生成器 51）量出并收掉一族**静默错值**——**字符串方法一次都没转换自己的实参**：

- **文本实参那一半**（`searchString` / `pattern` / `replacement` / `separator` /
  `localeCompare` 的那个 `that` / `concat` 的每一项）：它们直接走 `JsTextUnits`
  （**引擎的** `TextUnitsOf`，对对象当场抛），于是
  `"abc".includes({ toString() { return "b"; } })` 报
  `unimplemented: ToString of this kind of value`（Node 给**真**）、
  `"abc".concat({ toString() { return "T"; } })` 给 `"abc[object Object]"`（Node 给 `"abcT"`）；
  **「缺实参」还当成了空串**——JS 里那是 `ToString(undefined)` = `"undefined"`，
  所以 `"abc".includes()` / `indexOf()` / `startsWith()` / `endsWith()` **四条一起答反**
  （空串恒为真 / 恒给 0）。
  修法：添一格 `TextArgUnits`（**缺实参当 `undefined`**，对象那一档走
  `ToPrimitiveOf` + `JsTextUnits`——与 `String(x)` **同一处**，不写第二份转换表），
  并把 `protos` 灌进 `InvokeString`：这一族有九个调用点，**再开九个号就是把同一件事抄九遍**，
  而 `InvokeString` 的调用点**只有一处**（`install.xl.md` 的分派那一行）。
  顺带把 `replace` 的「不收正则」判据改成 JS 的 `IsRegExp`（`Symbol.match` 那一格可调才是正则）——
  原来「不是字符串就抛」，把「不该静默当字面量」这件事**过度执行**成了「连普通对象也不收」。
- **数值实参里的 `true` / `null` 那一格**：共用的取值器 `ArgOr` 原来把**非数字一律**当成
  「缺省值」，而 JS 那一步是 `ToIntegerOrInfinity(ToNumber(v))`——
  `"abc".slice(true)` 给整串（Node 给 `"bc"`）、`"abc".repeat(true)` 给空串（Node 给 `"abc"`）。
  现在布尔与 `null` 各自认一档；`undefined` **仍然**走缺省值
  （规范里可选实参「给了 `undefined`」与「没给」是同一档，不许按 `ToNumber(undefined) = NaN ⇒ 0` 折）。

**已收**：第 699 轮登记的那条（`stdlib/string/probe699-s-t08`）转绿、台账已撤。
本批另登记 20 条新缺口（`differ` +20）：
**`ArgOr` 不做 `ToNumber`**（字符串 / 对象实参，13 条：`charAt("1")` / `charCodeAt({valueOf})` /
`at("1")` / `slice({valueOf})` / `substring` / `substr` / `repeat({valueOf})` / `padStart({valueOf})` /
`indexOf("b", {valueOf})` / `lastIndexOf`——`ToNumber` 要 `room` / `call` / `protos`，
而这个取值器被**十几个内建共用**，是另一处活）、**`arguments` 那一族**（松散模式的形参双向别名、
`arguments.callee`、函数自己的 `f.arguments`）、函数体开头的 `"use strict"` 没认、
`call` / `apply` 的原始值接收者没装箱、形参默认值里的 TDZ，
以及**往生成器里 `throw` 不走 `try/finally`**（`it.throw(err)` 该先把挂起点外面的 `finally`
跑完再抛，本仓直接把它标成结束 ⇒ 清理一次都不跑）。
加权 **95.78% → 95.62%**（分子 +139、分母 +158：新收的 138 条通过是分子，20 条登记缺口也是分母）。

**第 701 轮**（第十二批原子探针 100 份新语料：严格性那一格 10 + 控制流与异常 40 +
数值与 `Math` 边界 50）量出并收掉两处：

- **函数体开头的 `"use strict"` 从来没认过**（**静默错值**，第 620 轮那条注释写着
  「本仓只认**类体**这个严格源」）：`(function () { "use strict"; return this === undefined; })()`
  在 JS 里是**真**，本仓给假（`this` 还是全局对象）。修法：降级层添一格
  `HasUseStrictDirective`（只认**开头那串**「字符串字面量且是表达式语句」——`("use strict")`
  与放在别的语句之后的都**不是**指令，JS 的口径），在**函数值**与**函数声明**两条路上
  一起记进 `item.IsStrict`。**函数声明那条路原来一格都不设** ⇒ 类体里嵌套的
  `function f() { … }` 一直被当成松散（JS 的严格性沿词法继承）。
  **箭头不给指令序言这一档**：它的 `this` 是**词法**的（从外层环境格读），
  标成严格只会让引擎给帧一个 `undefined`。引擎一侧一个字都没改——它认的一直是这一位。
- **`break` / `continue` 会把**外层** `try` 的 `finally` 也跑一遍**（**静默多跑**）：
  `try { for (const x of [1, 2]) { s += x; if (x === 1) continue; } } finally { s += "f"; }`
  在 JS 里给 `"12f"`（`continue` 的目标**在 `try` 里面**，这次 abrupt completion
  没有离开那个 `try`），本仓给 `"1f2f"`。根子：`LowerContinue` / `LowerBreak` 调的
  `EmitPendingFinalies()` 发的是**当前词法位置在册的全部** `finally`，
  它分不清「在循环**里面**」（该跑）与「在循环**外面**」（不该跑）。
  修法：`LoopContext` / `BlockLabelContext` 各添一格 `FinallyDepth`（进那一层时外面挂着几层），
  `EmitPendingFinalies(from)` 只发 `>= from` 那几层；`return` 走缺省 `0`（它离开的是整个函数）。

**已收**：两条台账转绿、已撤——`exec/functions/probe693b-f17`（第 692 轮登记的
「函数体开头的 `"use strict"`」）与 `exec/functions/probe700-f-e24`（第 700 轮登记的同一个根）。
本批另登记 2 条新缺口：**没声明过的名字**在降级期就抛（JS 要到运行期才抛 `ReferenceError`，
第 692 轮那条的同一个根）、**模块顶层的 `this` 是 `undefined`**（裁判按 CJS 跑，
那里 `this` 是 `module.exports`；本仓按 ESM 的口径给——箭头那一半本轮已经对齐）。
加权 **95.62% → 95.66%**（分子 +100、分母 +100：新收的 98 条通过 + 2 条旧台账转绿）。

执行侧只剩这一条（**已经在矩阵里、登在台账上**，见 `coverage` 那一行）：

- **`using` / `await using` 只在 token 层成形，降级层不认它**：`using r = new Res()` 被当成普通
  `const` 降级，块结束时**不会**调 `r[Symbol.dispose]()`（`await using` 同理欠 `Symbol.asyncDispose`）——
  `node` 对这两个声明有运行期语义，`tsrun` 静默少一次释放。上面的 `Symbol.dispose` /
  `Symbol.asyncDispose` 与符号键计算名的方法都已经能用（用例
  [`stdlib/symbol/032-symbol-keyed-method`](tests/cases/stdlib/symbol/032-symbol-keyed-method.ts)），
  缺的只是**声明本身的降级**。
  解析侧的用例在 [`decl-using-basic.ts`](tests/cases/token/declarations/decl-using-basic.ts)；
  执行侧两格是 [`exec/expressions/110-ex-using-declaration-dispose`](tests/cases/exec/expressions/110-ex-using-declaration-dispose.ts)
  与 [`111-ex-await-using-declaration-dispose`](tests/cases/exec/expressions/111-ex-await-using-declaration-dispose.ts)
  （第 651 轮普查过：`node` 给 `new a|new b|body|dispose b|dispose a`，本仓只给前三段）。投影那一格
  （`VariableDeclarationList.flags` 的 `Using` / `AwaitUsing`）第 655 轮已经补上，
  降级层可以直接读它。

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
- 改完跑这几步（也可以直接 `npm run gates` 一次跑完全部门）：

  ```bash
  xl check                     # 结构与规则检查（应该是 0 error / 0 warning）
  npm run build                # xl build && tsc
  npm run samples              # TS 形状夹具逐字节对照；产物本该变化时用 -- --update 重写夹具
  npm run cases:check          # 用例体检
  npm run cases:tags           # 用例自带的期望（`xl:expect` / `xl:absent`）对产物核实
  npm run cases:shapes         # 用例覆盖了哪些形状（外部语料有、用例没有的签名会红）
  npm run cases:tsast          # **主判据**：与 ts.createSourceFile 逐节点对拍（八条全 0）
  npm run cases:tsast:cli      # 发布路径那一把（慢，改到 cjcli / 序列化时才需要）
  node tests/parse/ts-ast.mjs --snippets <片段.mjs>   # 普查缺口：一个进程里把 N 条小片段逐条对拍
                               # （`{ id, src }` 的数组；TS 非法的片段跳过、产物抛异常报 CRASH）
  ```

  动了**投影的键序或坐标**时，`samples` 是唯一看得见的那把尺子（`cases:tsast` 只比
  kind / 区间 / 字段名）；动了 token 层时反过来，`cases:tsast` 会告诉你形状还对不对。

- **这条链上有两个 `xl`，走错一个就等于什么都没改**（第 968 轮实测，务必先读这一条）：

  | 名字 | 是什么 | 这台机器上有没有 |
  | --- | --- | --- |
  | `xl` | `npm run build` / `npm run check` 里调的那个可执行 | **没有**——`npm run build` 当场报 `'xl' is not recognized`，`node_modules/.bin` 里只有 `tsc` |
  | `xl_build` / `xl_check` | **DSH 的 xl 插件工具**（本会话里可用的工具） | 有 |

  所以**改规范的完整一条链是这三步**，缺一步数字都不会动：

  ```text
  *.xl.md  --xl_build-->  dist/ts/**/*.ts  --npx tsc-->  build/ts/**/*.js  -->  九道门
              （工具调用）        （不跟踪）      （tsc）        （不跟踪）        （量的是 build/）
  ```

  - **`dist` 与 `build` 都在 `.gitignore` 里**（`.gitignore` 第 2/3 行）：尺子量的是
    **`build/`**（`tests/parse/ts-ast.mjs` 那一行 `require(build/…/print-ast-common.js)`），
    所以「只改 `.xl.md`」对九道门**一点影响都没有**——`dist/ts/` 是脏的还是别人留下的旧产物，
    `build/` 就跟着是旧的，门却照报全绿。**第 968 轮实测**：只改规范不重新生成，
    `cases:tsast` 的已知缺口与 `coverage` 的每一个数**逐字不变**。
  - **`xl_build` 的缓存会误判「已是最新」**：它按源指纹跳过已满足的产物，
    而 `dist/` 是不跟踪的 ⇒ 换一台机器 / 清过目录之后很容易落在「hash 对得上、
    文件其实不对」那一格。要它真重新生成，传 `force: true`；只想动一份规范时传
    `paths: ["typescript/…xl.md"]`（不传就是整仓，慢得多）。
  - **一条可复现的范例**（第 968 轮实测的墙钟）：

    ```text
    xl_build{paths:["typescript/print-ast-common.xl.md"],targets:["ts"],force:true}
      → 1 written, 0 error(s)
    npx tsc                → exit 0
    npm run gates          → 9 道通过、0 道失败，墙钟 33.2s
    ```

  - **为什么这条值得写进 README**：`git log` 里那一串「第 N 轮：…缺口 6 → 3」的结论，
    有一部分是**只改了 `.xl.md`、没有重新生成**就写下的（第 967 轮自己记着
    「真门量下来一处没动」）。这类结论不是错的，而是**没验证过**——
    排查一层没动之前，先确认 `dist/ts/` 与 `build/` 确实是从手头这份规范生成的。

- **第 968 轮：把上一条走通之后，三格 `xl:known-gap` 的现状**（**只量不修**，数字一处没动）：

  ```text
  gap-r964-nonnull-call-twice-member   a!()().c      缺 4　漂 0
  gap-r964-opt-assert-member-member    a?.b!.c.d     缺 0　漂 2
  gap-r964-opt-call-triple             a?.b()()()    缺 2　漂 1　字段 1
  ```

  三格**都不是「构建没跟上」造成的**（同上一条那三步走完再量的），逐格如下：

  - **`a?.b!.c.d`（漂 2）**：token 树是
    `[Identifier(a), NCO([NotNull([b, !]), ., PropertyAccess([c, ., d])])]`——
    走 `chainWithOptional` 的 `NotNull` 那一支，`assertedMember` 折出
    `NonNull(PropertyAccess(a, ?.b))`，剩下的 `[., PropertyAccess]` 交给 `chainOnto`。
    `chainOnto` 的循环在那一格 `PropertyAccess` 上既不是 `.`、也不是下标 / 括号 / `Method`
    ⇒ `break`。**试过两版修法、都按规矩撤回**：把这一格摊成平级
    （`units.splice(i, 1, …projectableKids(view(unit)))`）**逐字不动**；
    改成无条件摊（去掉 `i + 1 < units.length` 那个闸门）也**逐字不动**。
    再往下要量的是**那一格到底由谁吃掉的**（`assertedMember` 第 4349 起那一段自己也在
    逐格接 `PropertyAccess`，两条路都够得着同一个形状）。
  - **`a?.b()()()`（缺 2 漂 1）**：token 树是
    `NCO([Method(name=""[Method(name=""[Method(name="b")])])])`——
    **三个 `Method` 单元**，而 `chainWithOptional` 收到的 `kids` 是**两个**
    （`[Identifier(a), NCO]`）。`Method` 的 `PrintAst` 自己会递归投出 `CallExpression@3-6`
    → 再套成 `@3-8`，可 `chainWithOptional` 的「内层 `Method`」那一支把
    `projectNode(calleeKid)` 的**受体换成了 `left`**，中间那一层于是被压掉。
    **下一处入手处**：那一支要问一句「这一格自己盖着几层」——`Method` 的
    `PrintAst` 第 968 轮改过的那句（把 `Math.max(ctx.StmtEndOf(v), argsClose + 1)`
    改成 `argsClose + 1`）**实测让 `f()()` / `f()()()` / `a!()()` / `a?.b()()` /
    `o?.m()()` 五格全绿、没有回归**，但**没动这三格**（NCO 那一路上够不着），
    按本仓「一处不动的改动不算收口」的规矩撤回了——它值一次单独的验证。
  - **`a!()().c`（缺 4）**：token 树是
    `[NotNull([a, !]), PropertyAccess([Method(name=""[Method(name=""[Bracket(())]])]), .,
    Identifier(c)])]`——**没有 NCO**，所以走的是 `projectExpression` 的链那一支；
    实测投出来只剩一个 `NonNullExpression@0-2`，**链循环一次都没进**
    （插桩在 `while (i < ck.length)` 上没有打印）。下一处入手处是先量清楚
    「这个形状到底进了 `projectExpression` 的哪一支」。

- **第 970 轮：三格 `xl:known-gap` 的根因逐格量到现场**（**只量不修**，数字一处没动）。
  第 968 轮留下的三个「下一处入手处」这一轮各走了一步；三处的现场笔记已经写进**用例自己**
  （那三份 `tests/cases/token/expressions/gap-r964-*.ts` 的头部注释就是现场，数字与这里一字不差）：

  ```text
  gap-r964-nonnull-call-twice-member   a!()().c      缺 4　漂 0　多 0　字段 0   （一处没动）
  gap-r964-opt-assert-member-member    a?.b!.c.d     缺 0　漂 2　多 0　字段 0   （一处没动）
  gap-r964-opt-call-triple             a?.b()()()    缺 2　漂 1　多 0　字段 1   （一处没动）
  ```

  逐格的新读数（**都是插桩或 `cjcli` 实测，不是推断**）：

  - **`a!()().c`**：第 968 轮那句「链循环一次都没进」**被这一轮的插桩推翻**——
    `projectExpression` 的入口实测到的是 `PE kids=[NotNull(2-2) PropertyAccess(3-8)]`，
    链那一支**进得去**（入口判据里 `isCallFirstUnit(kids[1], ctx)` 答真）。
    **（第 971 轮修正：这一句仍然不对——`isCallFirstUnit` 对那一格答的是「否」，
    链那一支根本进不去；现场以用例头部那份与第 970 轮（二）/ 第 971 轮两条为准。）**
    真正卡住的是**摊开之后**：`kids[1]` 那一格 `PropertyAccess` 的第 3992 行判据
    （要求 `isIndexFirstUnit`）答否、第 4002 行答真 ⇒ 摊成
    `[NotNull, Method(name=""), ., Identifier(c)]`，而 `chainOnto` 的续格循环只认
    「下标括号 / 圆括号 / 点号」⇒ 在那格 `Method` 上 `if (!isDot(unit, ctx)) break`。
    **下一处入手处**：让循环遇到 `Method` 时接着折（第 966 轮那几支空名字 `Method` 的
    分支正是按区间判「外面还有一层」），`.c` 作为下一个兄弟由循环接上。
  - **`a?.b!.c.d`**：第 968 轮记的两版修法「逐字不动」这一轮找到了原因——
    **那一格 `PropertyAccess` 由 `chainWithOptional` 自己的成员循环吃掉**，
    而那个循环**只接一格就收工**（接完 `.c` 就 `j += 2`，`.d` 前面没有点号了 ⇒
    那个 `isDot(member, ctx) && j + 1 < members.length` 判据不成立）。
    **（第 971 轮修正：吃掉那一格的是 `chainOnto` 的 `PropertyAccess` 子链那一支，
    不是 `chainWithOptional` 自己的成员循环；而且丢的是 `.c`、留下的是 `.d`
    ——第 971 轮那一条里有重量过的读数。）**
    **下一处入手处**：整格交给 `chainOnto` 走一遍，但**判据不能放宽到
    「头一格以一次调用开头」**——第 970 轮试过，`a?.b.c`（无断言那一族）会当场回归
    （`PropertyAccessExpression` 漂 3 / 多 2），已整份撤回。
  - **`a?.b()()()`**：**不在投影层**。`cjcli` 实测 token 树确实是三个 `Method`，
    但根因在 `tokens/method.xl.md` 的 `PrintAst`：最外层那格走「括号是被调用者」那条
    支路时要过一道闸门 `ctx.Kids(brace).length > 0`（第 419 行），而 `a?.b()()`
    最外层**实参表是空的** ⇒ 闸门答否 ⇒ 那条支路不进。第 968 轮说的
    `Math.max(ctx.StmtEndOf(v), argsClose + 1)` 是**同一条支路里的另一句**（第 391 行）。
    **（第 971 轮修正：这一段整个方向是错的——根因**就在投影层**，在 `chainWithOptional`
    的「被调用者是 `Method`」那一支（它只读第一格 `Method` 的名字），
    `tokens/method.xl.md` 一字未动。）**
    **下一处入手处**：在 `method.xl.md` 里量那道闸门该不该对「空实参表」放开，
    以及放开会不会带偏 `f!(1)` 那一族（第 414–418 轮记的正是这个风险）。

  **这一轮真正想留下来的一句话**：第 968 轮那三格里有**两格的方向是错的**
  （`a!()().c` 的「进不去链那一支」、`a?.b()()()` 的「投影层压掉中间那层」）——
  错在**只看产物、没插桩**。所以这一轮的现场笔记一律写上**读到的那一行原文**
  （`PE kids=[…]` / `ICFU …` / `cjcli` 的 XML），而不是「应该是」。
  第 970 轮试过一版修法（`a!()().c` 那一格的摊开判据 + `chainWithOptional` 的
  子链成员循环整格交给 `chainOnto`），门量下来**两格一处没动、另在 `a?.b.c` 上量出回归**，
  已按本仓「一处不动的改动不算收口」的规矩**整份撤回**：`print-ast-common.xl.md` 与
  第 970 轮开工前**逐字节相同**（`git diff` 干净）。

- **第 970 轮（二）：上一轮自己的第一条现场笔记是错的，已当场改正**（数字仍然一处没动）。
  这一轮的现场笔记里有**两格**都写了「`a!()().c` 进了链那一支、卡在摊开/`break` 上」，
  而按它去改（在 `chainOnto` 的续格循环里补一条「空名字 `Method`」的分支）**门一处没动**。
  于是回去把插桩**打在链支条件那一条 `if` 上**（不再打在它内部），读到的原文是：

  ```text
  PE kids=[NotNull(0-1) PropertyAccess(2-7)]
  （链支的摊开循环一次都没打印 —— 入口判据那一段就没通过）
  ```

  **错在哪**（值得抄下来的一条排查教训）：第一版把 `const ck = [];` 当锚点，
  而那个字面量在**别的支路**里也有一份（`flattenChainTailInOperator`），
  于是打印插进了死代码、看起来像「进了支、没进循环」。
  **锚点要选那一段独有的字符串**，或者干脆打在判据那一行本身上。
  这一格的 `xl:known-gap` 用例头部已按实况重写（旧结论划掉留着当反例），
  下一处入手处改成：在 `projectExpression` **开头到链支条件之间**量清楚是谁先吃掉这一格。

  这一轮**没有动 `print-ast-common.xl.md`**（两版修法都按规矩撤回），
  留下来的东西是**两条真读数 + 一条被打掉的自己的错结论**。

- **第 971 轮：第 964 轮那三格一起收掉（缺口 3 → 0，清单清空）+ 同一轮普查再收一格、登记两格**。
  第 968 / 970 两轮给这三格写的「根因」**有三处是错的**，这一轮逐格拿片段探针与
  `cjcli` 的 XML 重量，再按量到的那一处改；三格的修法都在 `print-ast-common.xl.md`
  的**投影层**，token 层一字未动（`tokens/method.xl.md` 这一轮根本没开）：

  ```text
  gap-r964-nonnull-call-twice-member   a!()().c      缺 4 → 0
  gap-r964-opt-assert-member-member    a?.b!.c.d     漂 2 → 0
  gap-r964-opt-call-triple             a?.b()()()    缺 2 漂 1 字段 1 → 0
  ```

  - **`a!()().c`**：第 970 轮（二）把现场量到「链那一支根本没进」上是对的，
    可同一段里还留着「入口判据里 `isCallFirstUnit(kids[1])` **答真**」这句**没核实过的话**——
    反着量一遍：那一格是 `PropertyAccess(Method(name=""[Bracket(())]), ., c)`，
    实参括号在 `Method` **里面**，而 `isCallFirstUnit` 的 `PropertyAccess` / `NotNull`
    那一支只认**平级的** `Bracket` ⇒ **答否**。修法就是那一句：多问一句
    「头一格是 `Method` 外壳的那一次调用吗」，判据转交给 `Method` 那一支（**不写第二份**）。
  - **`a?.b()()()`**：第 970 轮归到 `tokens/method.xl.md` 的 `PrintAst` 闸门
    （`ctx.Kids(brace).length > 0`）上——**也是错的**：三层 `CallExpression` 都是
    `projectNode(那一格 Method)` 投出来的，闸门只管最外层那次的 `end` 从哪儿扫，
    而这一格的 `end` 最后由 NCO 自己那一格给（`endOf(unit)`）。真正丢层的是
    `chainWithOptional` 的「被调用者是 `Method`」那一支：它只读**第一格**的名字
    （`a?.b()()()` 的第一格是 `Method(name="")`）⇒ 当成「被调用者就是 `left`」。
    新增两格共用件：`innermostMethod`（一路走到最里面那一格 `Method`）、
    `graftCallee`（把被调用者换在**最里面**那一层调用上，`?.` 也挂在那里）——
    `chainOnto` 的 Method 分支原来也只换最外层那份 `expression`，一并换成同一份实现。
  - **`a?.b!.c.d`**：第 970 轮记的「那一格 `PropertyAccess` 由 `chainWithOptional`
    自己的成员循环吃掉」**方向也记反了**——它由 `chainOnto` 的 `PropertyAccess` 子链那一支接，
    而那个成员循环只认「点号 + 名字」成对形状：这一格的子链是 `PropertyAccess([c, ., d])`，
    **第一格就是名字 `c`**（不从点号开头），落单的第一格走到循环末尾那句空转的 `j += 1`
    上被跳过 ⇒ `c` 整格丢、`.d` 顶了它的位置（第 970 轮那句「`.c` 接上了、`.d` 没有了」
    正是反的；漂移报告里 `Identifier` 那一行「TS[6,7) vs 产物[8,9)」说的就是它）。
    补法与 `chainWithOptional` 子链分支末尾那一句**一字不差**（名字接一格，
    「先把手上的 `!` 套成 `NonNullExpression`」的顺序也一致）。

  **同一轮的普查（按「清单空着就换一批底样再量一遍」的规矩）**：拿 30 条同族片段
  （两层到四层的调用 / 可选链 / 非空断言 / 下标）跑片段探针，**量出两格新的**，
  按规矩登记进语料（`xl:known-gap`，清单 0 → 2 条还开着）：

  ```text
  gap-r971-nonnull-call-thrice-member   a!()()().c    缺 5　漂 0　多 0　字段 0
  gap-r971-opt-assert-index-member      a?.b![0].c    缺 3　漂 1　多 0　字段 0
  ```

  - **`a!()()().c`**：症状与这一轮收掉的 `a!()().c` 一样，但卡得**低一层**——
    它的链那一支进不来，因为 `isCallFirstUnit` 的 `Method` 那一支只认「第一格是实参括号 /
    断言盖着实参括号」，而这一格的第一格**又是 `Method`**（token 树只有两格 `Method`
    加一格 `Bracket`，可它说的是**三次调用**）。
  - **`a?.b![0].c`**：`!` 后面**没有点号**、直接跟一条下标子链
    （`NCO[NotNull(b), PropertyAccess([Bracket([0]), c])]`）——`chainOnto` 在
    `!isDot(unit, ctx)` 上就 `break`，而子链那一支住在 `isDot` 那一段**里面**，
    第 971 轮补的「第一格是名字」那一档根本轮不到。

  普查里还顺带收掉一格：**`a?.b()()().c`**（`chainWithOptional` 子链分支里那两处
  「两层调用」的分支也只读第一格的名字）——同一对共用件（`innermostMethod` /
  `graftCallee`）补上去就绿了，30 条里 28 条对得上。

  **实测**：九道门全绿（墙钟 32.3s）——`cases:tsast` 16/16 片、
  **已知缺口 3 → 0（清空）之后同一轮又登记 2 格**（2 条还开着、0 条已经收掉）；
  `cases:astjson` 六项全 0（1605 份 / 41032 个节点）；`cases:check` 1617 / 1617；
  `cases:tags` 1617 条用例、5326 条断言 0 条不一致；`cases:shapes` 未覆盖 0（用例 1604 份）；
  `coverage 4217 / 4380 → 4221 / 4383`（分子 +4：三格转绿 + 普查收掉的那一格补的守卫用例；
  分母 +3：两条登记用例 + 一条守卫用例，`blocked 28 → 27`、
  `differ 135` 没动、加权 95.7% 不变）。
  六份用例的 `xl:known-gap` / `xl:note` 都按规矩改过，被推翻的旧结论留在头部当反例。

  **这一轮留下的判据**：**「已经量到的下一处入手处」也要当真门再量一遍**——
  第 970 轮写下的三处里有三处是「读代码读出来的」，真的插桩一量，方向就翻了两处。
  量到的现场一律写成**读到的那一行原文**（`PE kids=[…]` / `cjcli` 的 XML / 产物的树），
  不写「应该是」。

- **一轮一提交**：一轮的改动跑完尺子之后 `git commit`，提交信息按轮次写
  （`第 N 轮：…（coverage X -> **Y / Z**）`，正文写根因 / 修法 / 数字）。
  攒着不提交的话，「哪一轮把哪个数字动了」在 `git log` 里就查不到了。

- **临时脚本与它们的输出不进仓库**：排查用的一次性脚本、探针、以及它们的输出
  （`.txt` / `.json` / `.log` / `.err`）都不提交（`.gitignore` 挡着）。
  仓库根目录历史上堆过五六百个临时脚本，所以这条是硬规矩：**能复现的才进仓库**
  （进仓库的形态是尺子或用例，不是某次排查的脚本）。

- **临时东西一律放 `tmp/`，根目录只留九个文件**（第 685 轮收口）：根目录现在是
  `.gitattributes` / `.gitignore` / `package.json` / `package-lock.json` / `tsconfig.json` /
  `xl.json` / `README.md` / `cjcli.xl.md` / `tsrun.xl.md`——**多出来的就是放错了地方**。
  `tmp/` 下的分层与来历：

  | 目录 | 是什么 |
  | --- | --- |
  | `tmp/root-probes/` | **从仓库根目录收进来的 133 个一次性探针**（`tmp-*` 前缀那批，第 685 轮）——留着是给 git 历史做旁证，**不要再往里加** |
  | `tmp/refactor/` | 第 685 轮那次语料搬迁的脚本与读数（`plan.mjs` / `emit.mjs` / `verify.mjs` / 基线快照） |
  | `tmp/survey/` | 普查脚本与它们的 JSON 读数 |
  | `tmp/<轮次或名字>/` | 每一轮自己那个现场（`tmp/r678/`、`tmp/c637/` 这种） |

  **`tmp/` 里的一切都可以随时删**（`.gitignore` 里 `tmp/` 与 `tmp-*` 两条都在）——
  它的用途是「这一轮的现场别丢」，不是「留一份要维护的东西」。
  真值得留下的**要么变成尺子、要么变成用例**（见上一条）。

- **改「谁吃掉换行」之前先读 `declaration-common.xl.md` 里那一节**：
  本工程的 `LineWrap` 不只是排版，它还是语句边界本身。历史上 `DeclarationEnd`
  就是因为「吃掉它」而制造了一整类语句合并缺口。

- 产物头里的 `xl:sha256` 是源指纹：规范一变，产物就会重新生成。
