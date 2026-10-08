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

**主判据是 `npm run gates` 一次跑完的那几道门**（墙钟 ~25s；门名单只有 `tests/gates/run.mjs` 的 `GATES` 一处）：

| 门 | 口径 |
| --- | --- |
| `cases:tsast` | 逐节点对 `ts.createSourceFile` 比 **kind / 区间 / 字段名**，外加未映射 / 缺 range / 区间越界 / 抛异常——**八条全 0 才退出码 0**；语料里带 `xl:known-gap` 的那些用例走**另一条账**（见下） |
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

### 当前状态（最近一次全量实测）

| 判据 | 结果 |
| --- | --- |
| `cases:tsast` | **四方向 0、未映射 0、缺 range 0、区间越界 0、抛异常 0**；另有 **218 条 `xl:known-gap` 还开着**（每条的差额逐条印出来，**0 条是产物直接抛异常**） |
| `cases:tsast:cli` | 发布路径（慢，按需跑）：真开 `cjcli … --ts-ast` 进程逐文件对拍，与库路径同一条口径 |
| `samples` | hello / declarations / generic 三份 TS 形状夹具**逐字节**一致，且「命令行 = 库 API」 |
| `cases:check` | **1427** 条 **token** 用例，0 条不合格（这一道只走 `tests/cases/token`；执行那一侧的四类由 `coverage` 全覆盖） |
| `cases:tags` | **1427 条**（带期望的逐条核过，共 **4835** 条断言），0 条不一致；产物抛异常 **0** 条；标签表 **117** 种全被产出过，幽灵标签 **12** 种一个都没漏进产物 |
| `cases:shapes` | 外部语料 **229 份**（用例 1414 份）里出现过的 kind / 形状签名**全部有用例覆盖**，未覆盖 **0** |
| `runtime:check` | **243 / 243** |
| `runtime:cli` | 直接执行 `.ts`：**79 / 79** 份与 `node` 逐字节相同 |
| `coverage` | **五类 7731 / 8095**，加权 **95.9%**：token 1196/1414、exec 2171/2216、runtime 998/1023、stdlib 3124/3196、e2e 242/246。差的那些是**真缺口**（`blocked` 261 / `differ` 103），全登在用例文件头的台账里；`bad` **0 条**、`regressions` **0 条** |
| `npm run gates` | 上面各道一次跑完（实测墙钟 **~39s**） |
### 口径与已知缺口

**口径外**（不进分母，也不当缺口）只剩两种：**JSX / TSX**（独立于 TypeScript 的语法扩展）
与**故意写非法 TS**的 9 份（`xl:ts-invalid`，判据要量的正是错误处理）；
另有**装饰器**那一格因为 `node` 三种模式全拒收而**量不了**（裁判给不出来）。

**其余全是待做项**（用户口径，第 685 轮）：`RegExp` / `BigInt` / 多文件模块加载 /
动态 `import()` / `eval` / `console.log(new Error(…))` 的栈——`tsrun` 现在的**单文件口径是现状，不是口径**。
整张清单与理由见 [tests/parse/typescript-parsing-gaps.md](tests/parse/typescript-parsing-gaps.md)
与 [docs/runtime-architecture.md](docs/runtime-architecture.md) §15。

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
- **块与表达式之间没有分隔符时**（`{ A }a += 1`：块紧跟着表达式，中间既没有 `;` 也没有换行），
  产物里块与后一条语句仍然**并进同一个 `<Statement>`**（与 TypeScript 的「两条语句」不一致）——
  这一条在 token 树（XML）上仍然是缺口，但**投影到 TS 形状时按 TS 的划分出节点**，
  所以 `cases:tsast` 是绿的。**被否决的改法**：把块当语句边界——切断了复合赋值的展开，
  **整段内容丢失**，比边界不合严重；不要再试。两条形状已经收进用例语料。
- 其余仍开着的解析缺口**都在语料里**（各带一条 `// xl:known-gap <根因>`，当前 **220** 条）：
  主力是「**注释 / 换行落在语法相邻位置之间**」那一族——按落点逐条立着
  （`optchain` / `generic` / `destr` / `clsmod` / `iface` / `import` / `export` / `tpl` /
  `cond` / `arrow` / `async` / `obj` / `arr` / `switch` / `try` / `label` / `ns` / `var` / `fn` …），
  另有解构模式前换行、无体声明的尾随 `;`、泛型约束里的三族类型、`switch` 单行块后跟 `default`、
  `typeof a.b[K]`、`f<string>`、简写环境模块（**第 679 轮起没有一条是产物直接抛异常的**：
  `catch (e)` / `finally` 与它的体之间夹一条行注释或一个换行的那 4 条已经收掉）。
  **第 680 轮又收掉 6 条**，两个根都在「**类型谓词 / 类型运算符靠相邻单元找操作数**」这一片上：
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
