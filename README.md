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

### 当前状态（最近一次全量实测）

| 判据 | 结果 |
| --- | --- |
| `cases:tsast` | **四方向 0、未映射 0、缺 range 0、区间越界 0、抛异常 0**；另有 **219 条 `xl:known-gap` 还开着**（每条的差额逐条印出来，**0 条是产物直接抛异常**） |
| `cases:tsast:cli` | 发布路径（慢，按需跑）：真开 `cjcli … --ts-ast` 进程逐文件对拍，与库路径同一条口径 |
| `samples` | hello / declarations / generic 三份 TS 形状夹具**逐字节**一致，且「命令行 = 库 API」 |
| `cases:check` | **1416** 条用例，0 条不合格 |
| `cases:tags` | **1416 条**（1416 条带期望、核过 4800 条断言），0 条不一致；产物抛异常 **0** 条；标签表 **117** 种全被产出过，幽灵标签 **12** 种一个都没漏进产物 |
| `cases:shapes` | 外部语料 **260 种签名 / 140 种 kind** 全部有用例覆盖（用例 1403 份），未覆盖 **0** |
| `runtime:check` | **243 / 243** |
| `runtime:cli` | 直接执行 `.ts`：**79 / 79** 份与 `node` 逐字节相同 |
| `coverage` | **五类 7275 / 7628**，加权 **96.1%**：token 1184/1403（另有 219 条登记缺口走另一条账）、exec 2105/2158、runtime 806/815、stdlib 2938/3006、e2e 242/246。差的那些是**真缺口**（`blocked` 261 / `differ` 92），全登在用例文件头的台账里；`bad` **0 条**、`regressions` **0 条** |
| `npm run gates` | 上面各道一次跑完（实测墙钟 **~48s**） |

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
