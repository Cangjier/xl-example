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
  runtime/                 运行时作用域模型
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

cjcli.xl.md              命令行入口（不属于语法层本体）
```

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
npm run samples      # 三个样本与各自 *.expected.xml 对照
node build/ts/cjcli.js samples/hello.ts
```

`npm run build` 是前两步的串联（`xl build && tsc`）。

**产物路径镜像规范路径**：`typescript/tokens/class/class.xl.md` → `dist/ts/typescript/tokens/class/class.ts`。

**打印出来的 XML 是缩进形态**：`cjcli` 走 `CommonUtil.FormatXml`——每个元素一行、按嵌套缩进两格，
只有文本没有子元素的**叶子**留在同一行（否则每个标识符都要占三行，反而更难读）。
缩进只动空白、不动任何标签或属性值；`Root.ToString()` 仍然返回**紧凑单行**形态，
测试与差分脚本用它。`samples/check.mjs` 比对前会把标签之间的空白去掉，所以两边的缩进怎么排都不影响判定。

改完规范之后，验收是这五步：

```bash
xl check               # 结构与规则检查
npm run build          # xl build && tsc
npm run samples        # 样本夹具逐字节对照
npm run cases:check    # 用例体检（用例本身合不合格）
npm run cases:run      # 用例对解析器（台账必须仍然是空的）
```

再跑七把「不需要期望值」的尺子（CI 判据，有问题退出码 1）：

```bash
npm run cases:diff        # 与 TypeScript 自带 AST 的构造数差分（净额）
npm run cases:dashboard   # 正 / 负差额分开统计（净额会互相抵消，这个不会）
npm run cases:matrix      # 上下文 × 构造 全组合
npm run cases:lossless    # 名字与字面量的值有没有被吃掉
npm run cases:structure   # 嵌套形状：括号归属与源码一致吗（带 --self-test 变异自检）
npm run cases:boundaries  # 语句边界：相邻两条语句有没有被并成一条（带 --self-test）
npm run cases:noise       # 噪声：产物里有没有空的 <Statement></Statement>
```

另有一把「广谱构造普查」的探针，只报可疑项、不当判据：

```bash
npm run cases:sweep       # 198 个 TS 构造片段，逐条打印 TS AST 与产物并标出可疑项
```

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
- **token 树只产出 XML**，没有 `ToDictionary` / `ToList` 那样的动态字典投影：
  那种形状（`Map<string, any>` / `Array<any>`）对多语言目标是负担，要别的形状就在调用方自己遍历 `Data`。

## 解析优先级在哪

token 层的公共契约——**跳转优先级**与**重组优先级**——只在
[typescript/parse-pipeline.xl.md](typescript/parse-pipeline.xl.md) 里：

- `ParsePipeline.CreateGeneralQueue()`：每处理一个字符，按这个顺序问每个 `Branch` 要不要接手；
- `ParsePipeline.GeneralReorganize`：每个单元关闭时，按这个顺序把子单元合并成更高层结构；
- `ParsePipeline.Install(template)`：往模板上装这两张表**与语言配置**（关键字表、禁用方法名表）。
  `TextContext` 构造时调它，所以调用方只需要 `new Template()`。

要看「这个语言的解析优先级是什么」，读这一个文件就够了；新增 token 的改动点也在这里。
队首是声明层、队尾是关键字兜底，**顺序本身就是语义**：

```text
Decorator → Class → Function → Enum → MethodDeclaration → Label → Let → Field → New → Method → …
… → TypeAssign → Lamda → TypeDefine → Ternary → Try → Switch → IfSet → For → Foreach → While → …
… → LineWrap → CompoundAssignment → NotNull → Keyword
```

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
| `type X = { a: number }` / `let x: { m(): void }`（**类型位**的对象类型） | `<TypeLiteral>` + `<TypeLiteralBody>`（成员是 `Field` / `MethodDeclaration` / `Signature`） | — |
| `interface I { (a: number): string }` / `new (a: number): I` / `abstract new (a: number): I` | `<Signature kind="call">` / `<Signature kind="construct">`（`abstract` 作为签名的第一个子单元收进来） | `kind` |
| `import('./m').A` / `typeof import('./m')`（类型位） | `<Method name="import">`（动态 `import()` 是调用，不是声明） | — |
| 泛型实参段与类型参数段（`Array<T>` / `<T extends X = Y>`） | `<GenericType>` | `startBracket` `endBracket` |
| 字符串（常量 / 内插 / 逐字 / 原始 / 模板） | `<String>` + `<ConstString>` / `<InterpolationString>` | `interpolation` `verbatim` `raw` `interpolationCount` `rawQuoteCount` |
| `async` / `await` / `return` / `throw` / `readonly` … | `<Keyword>` | — |

`modifiers` 是声明前面那一串修饰词按源码顺序 `join(",")`（`export` / `declare` / `default` / `abstract` /
`async` / `public` / `private` / `protected` / `static` / `readonly` / `override` / `accessor` / `get` / `set` / `const`）。

### 叶子标签的名字

三个「字面量块」原先叫 `Common` / `Symbol` / `WrapSymbol`——名字说的是**实现**（通用字符块、符号块、包装符号），
不是**语义**。现在按它到底是什么命名，下游（差分脚本、多语言目标）读产物时不必先查表：

| 旧标签 | 新标签 | 是什么 |
| --- | --- | --- |
| `<Common>` | `<Identifier>` | 标识符与数字、布尔字面量的文本块（`<Identifier>0</Identifier>` 就是数字 `0`） |
| `<Symbol>` | `<SymbolToken>` | 符号块：运算符、标点、括号字符 |
| `<WrapSymbol>` | `<LineWrap>` | 软换行，**不是符号**：它不吐文本，只是相邻判定的透明单元 |
| `<JsonObject>` | `<ObjectLiteral>` | 值位的对象字面量 `{ … }` |
| `<JsonArray>` | `<ArrayLiteral>` | 值位的数组字面量 `[ … ]` |
| `<Temp>` | **删除** | 这个类没有任何 `new Temp(` 被创建过，是死代码 |

`Bracket`（`( )` / `{ }` / `[ ]` 三种括号共用）与 `Keyword`（关键字兜底身份）保留原名：它们说的就是自己的语义。

[samples/declarations.ts](samples/declarations.ts) 把上表逐项走了一遍，产物是
[samples/declarations.expected.xml](samples/declarations.expected.xml)。

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
  「一个已经删掉的收尾口径」那一节，以及 `npm run cases:noise`）。

## 已知缺口

> 完整的缺口清单（可回归、可逐步清空）在 [tests/parse/known-gaps.json](tests/parse/known-gaps.json)：
> `npm run cases:run` 会报告「新增缺口 / 台账过期」，`npm run cases:diff` 用 TypeScript 自带 AST 做差分找缺口。
> 下面只列结构性的那几条。

**八把尺子**（互相补位，任何一把红都不算「完整解析」）：

| 命令 | 口径 |
| --- | --- |
| `npm run cases:run` | 手写期望值：已经想到的构造有没有做对 |
| `npm run cases:diff` | 源码构造数 − 产物节点数：哪一类节点整片没产出（净额） |
| `npm run cases:dashboard` | 正 / 负差额分开统计：净额互相抵消时看真相 |
| `npm run cases:matrix` | `上下文 × 构造` 全组合：同一构造换到别的上下文会不会翻车 |
| `npm run cases:lossless` | 名字与字面量的值：产物里有没有内容被吃掉 |
| `npm run cases:structure` | **嵌套形状**：产物的括号归属与源码文本是否一致 |
| `npm run cases:boundaries` | **语句边界**：相邻两条语句有没有被并成一条（对着 TS 自己的 AST） |
| `npm run cases:noise` | **噪声**：产物里有没有空的 `<Statement></Statement>` |

后六把不需要维护期望值（候选先交给 TypeScript 判定是否合法 TS）。
`structure.mjs` 与 `boundaries.mjs` 各带一个 `--self-test`：故意把产物改坏 / 把两条语句并成一条，
尺子必须报警——**一个永远绿的尺子比没有尺子更危险**，所以两把尺子的牙口都是被证明过的。

### 当前状态（实测，`npm run` 十三个脚本全绿）

| 判据 | 结果 |
| --- | --- |
| `cases:run` | 924 条用例全部通过，台账在案缺口 **0** 条（`_notes` 是信息性记录，不占用例） |
| `cases:diff` | 1285 个文件，**没有任何一项差额为正**（全部是 0 或负数，负数属另一侧口径） |
| `cases:dashboard` | **真缺 0 个节点** |
| `cases:lossless` | 1272 个文件、抛异常 0、内容丢失 0 |
| `cases:structure` | 1272 个文件、括号归属不符 **0**（12 个文件因对齐不可信被跳过，见下） |
| `cases:boundaries` | 真实语料 + 用例语料，**边界被横跨 0 处**（对齐不可信的文件如实跳过并报数） |
| `cases:noise` | 1272 个文件，空 `<Statement>` **0** 个 |
| `cases:matrix` | 候选 13889 条，合法并跑通 13303 条，**有问题 0 条** |
| `samples` | declarations / generic / hello 三份一致（夹具是紧凑单行，比对忽略标签之间的空白） |

结构性缺口（**只剩这些，且都是「标签表表达不了」或语言配置**）：

- **`Label` 只是标记节点**，不包含它标的那条语句（产物形如 `<Label label="outer" /><While>…</While>`）：
  标签规则必须排在 `TypeDefine` 之前，那时后面那条语句还没成形，认不出边界。
- **类里的 `static { … }` 块**没有专属标签（TS 里是 `ClassStaticBlockDeclaration`）：内容完整收在
  `<Statement><Keyword>static</Keyword><Bracket>{…}</Bracket></Statement>` 里——**内容没丢**，只是没有标签。
- **`export as namespace Foo`**（TS 里是 `NamespaceExportDeclaration`）没有专属节点，
  产物是 `<Keyword>export</Keyword>` + `<As>namespace Foo</As>`——**内容没丢**，归类不同。
- **`import type x = require('y')`** 的 `typeOnly="true"` 是对的，但那个 `type` 词还作为
  `<Identifier>type</Identifier>` 留在 `Import` 里（冗余、不是丢失）。
- **ASI 是按形状预判的**：判据在 [typescript/tokens/statement.xl.md](typescript/tokens/statement.xl.md) 的
  `Statement.IsLineBreakBoundary`（前一个单元不再要操作数、后一个单元也不能续接 ⇒ 断句，
  加上 `return` / `throw` / `break` / `continue` / `yield` 与后缀 `++` / `--` 的受限产生式）。
  规范里 ASI 还有一条「**语法不允许时**才插分号」，本工程不看完整文法、只看形状，
  所以个别极端排版仍可能与 TS 不同——这类情况由 `cases:boundaries` 持续巡检，当前 0 处不符。
- **JSX / TSX** 没有支持（四个 `.tsx` 用例只钉住「不抛异常 / 不吞掉后面的代码」）。
  这是**独立于 TypeScript 的语法扩展**，不在 `.ts` 范围内。
- **嵌套解构的绑定名进的是同一张逗号分隔表**（`arrayPattern`），丢的是**结构**而不是名字：
  `const [[a, b], [, c = 0]] = m` 记成 `a,b,c,0`。
- **`<RegexToken>` 是空标签**：正则正文与标志在单元的 `Temp` / `Flags` 字段上、刻意不渲染进 XML
  （见 [typescript/tokens/regex-token.xl.md](typescript/tokens/regex-token.xl.md)）。
- **语言配置带来的两处差异**（不是解析器缺陷，是这套语言这么定义）：
  `\a` 解成响铃字符而不是字母 `a`；`@'…'` / `@"…"` 是逐字字符串前缀、不是装饰器
  （见台账 `_notes.escape-a-bell` / `_notes.at-before-string-is-verbatim`）。

### `structure.mjs` 为什么要跳过一部分文件

它要靠「产物叶子 ≈ 源码 token」这条对应关系把括号落回源码。有一批文件的对应率低于 60%
（`@types/node/cluster.d.ts`、`typescript/lib/lib.es2016.array.include.d.ts`、`lib.es2017.object.d.ts`、
`lib.es2019.object.d.ts`、`lib.es2020.promise.d.ts`、`lib.es2022.array.d.ts`、`lib/typescript.d.ts` 等），
原因是这批文件里注释碎片与模板串把叶子链拉得很稀疏，对齐会滑。
尺子对这种情况**主动跳过**并如实报告数量——
**宁可少查，也不要拿错的对齐去报假缺口**。其余文件（含全部回归用例、
全部实现文件、绝大部分 `.d.ts`）逐个对账通过。

`cases:boundaries` 用的是同一套对齐，并把「两遍贪心结果不一致」的叶子也剔掉，
所以它跳过的文件更多（真实语料约一半）——**判不了就报「跳过」，不报「通过」**。

### 按 `structure.mjs` 修掉的两处真缺口（第 50 轮）

形状尺子第一次跑起来就抓到两处**六个计数器都看不见**的结构错位：

| 缺口 | 根因 |
| --- | --- |
| 类成员的 `accessor` 修饰符（TS 4.9 自动访问器）不认 | 它不在修饰词表里，于是被当成裸名字，成员退化成 `<Statement><Identifier>accessor</Identifier><Field …/></Statement>`——**多包一层 `Statement`**，而「Field 在不在」「有几个」这类计数完全不变。`static accessor` / `abstract accessor` 同理 |
| `@dec x = 1` 把字段名吞进装饰器 | 装饰器的名字扫描把任何非关键字 `Identifier` 都吃下去，`x` 被拼成 `name="dec.x"`，**字段整个消失**（只剩 `<SymbolToken>=</SymbolToken><Identifier>1</Identifier>`）。判据改成「名字之间必须有 `.`」：`@ns.dec` 才是多段名字 |

两处都有回归用例：`decl-class-accessor`（三条 `Field` 计数）、`cls-accessor-keyword`、
`cls-decorator-field`、`cls-decorator-qualified-name`。

### 按 `boundaries.mjs` 修掉的语句合并（第 51 轮）

语句边界尺子第一次跑起来就抓到**八把尺子里另外七把都看不见**的一整类缺口：两条相邻的 TS 语句
被收进**同一个** `Statement`。计数不变（节点都还在）、无损性不变（名字都还在）、
括号归属也不变（那对括号的包含关系恰好没动），所以前面七把全绿。

| 缺口 | 根因 |
| --- | --- |
| `@types/node` 里成片的 `declare module "x" { … }` 换行 `declare module "node:x" { … }` 被并成一条 | 声明规则（`Class` / `Function` / `Enum` / `Interface` / `Namespace` / `MethodDeclaration` / `Signature` / `Field` / `Switch` / `DoWhile`）用 `DeclarationEnd` 把**尾随软换行**并进了自己的替换范围。那道换行正是 `SearchFrontIndexed` 往回找语句头时的「墙」；墙没了，搜索一路退到列表开头。**真实语料 217 个文件里 30 个中招（48 处）** |
| `const a = [1, 2] as const` 换行 `const o = …` | `as const` 里的 `const` 被 `LetReorganization` 当成声明头，于是 `SkipNext` 跨过换行找到**下一行**的 `const`，三个单元一起被替换成一个 `Let fieldName="const"` |
| `const a = x as { b: number }` 换行 `const b = …` | `IsInStatement` 只看换行**两侧**有没有非语句符号；下一行是 `Let` 而再往后是 `=`，于是被判成「语句内部」，`As` 的类型扫描把第二个 `Let` 吞掉 |
| `a?.b` 换行 `c?.d` | 空条件运算符的扫描只在运算符处断开，不认换行 |
| `let a!: number` 换行 `class C { … }` | `TypeDefine` 只认「成员边界」，不认语句边界，整个类被收进类型 |
| `a` 换行 `++b`；`x++` 换行 `continue`；`return` 换行 `-1` | ASI 之前**完全没做**：换行只在成员边界与声明尾部被当成边界 |

修法：

- **删掉 `DeclarationEnd`**（`Class` / `Function` / `Enum` / `Interface` / `Namespace` /
  `MethodDeclaration` / `Signature` / `Field` / `Switch` / `DoWhile` 十处）：它当初的理由
  （避免空的 `<Statement></Statement>`）**今天已经由语句重组自己的早退承担**，
  而它的代价正是上面第一行那条。删掉之后空 `Statement` 仍是 0（`cases:noise` 钉住）。
- **把 ASI 写成一条判据**：`Statement.IsLineBreakBoundary` —— 换行前一个单元不再要操作数、
  且换行后一个单元也不能续接这个表达式 ⇒ 断句；另有 `return` / `throw` / `break` / `continue` /
  `yield`（受限产生式）与后缀 `++` / `--` 两条更早的结论。它同时被 `StatementReorganization2`、
  `IsStatementEnd`（`As` 的收尾）与 `TypeDefine` / `NullConditionalOperator` 复用，**只有一份规则**。
- **`declare module "…"` 不再按点号拆嵌套命名空间**：字符串名字是模块路径的整体（`"./m"` / `"*.css"`），
  只有标识符形式的 `namespace A.B.C` 才拆（`gap-dashboard` 里那 4 个 `ModuleDeclaration 真多` 就是它）。

回归用例 10 条：`stmt-asi-class-expression-then-statement`、`stmt-asi-as-const-then-statement`、
`stmt-asi-as-then-statement`、`stmt-asi-type-annotation-then-class`、`stmt-asi-return-newline`、
`stmt-asi-prefix-increment-after-statement`、`stmt-asi-postfix-then-continue`、
`expr-asi-optional-chain-then-statement`、`mod-declare-module-pair`、`mod-declare-module-string-name`。

### 实测规模

`node_modules` 下 226 个真实 `.d.ts` + 本项目产物 `.ts` + 924 条用例
**全部解析成功、零异常、零内容丢失**（`npm run cases:lossless` 覆盖 1272 个文件）。
TypeScript 自带的那份 8MB **打包 JS**（`typescript.js`）仍会在个别
JavaScript 专有形状上抛内部错误——那是 JS 而不是 TypeScript，不在当前范围内。

## cjcli

[cjcli.xl.md](cjcli.xl.md) → `dist/ts/cjcli.ts` → `build/ts/cjcli.js`。它是命令行入口，不属于语法层本体。

**产物是自执行的**：`cjcli.xl.md` 末尾的 `# statement` 段把 `Main(process.argv.slice(2))` 原样写进产物，
所以 `node build/ts/cjcli.js` 直接就是命令行工具——没有加载器、没有包装进程、没有第三方运行时。

```
cjcli <文件>              解析源文件，缩进 XML 打到标准输出
cjcli <文件> -o <文件>    解析后写入指定文件（同一份缩进文本）
cjcli                    从标准输入读源码
cjcli -h, --help         打印本说明
cjcli -v, --version      打印版本
```

退出码：`0` 成功；`1` 表示用法错误 / 读不到文件 / 解析抛错。

```bash
node build/ts/cjcli.js samples/hello.ts
echo "let x = 1" | node build/ts/cjcli.js
node build/ts/cjcli.js samples/hello.ts -o out.xml
```

## 样本验收

[samples/check.mjs](samples/check.mjs)：`samples/*.ts` 与同名 `*.expected.xml` 对照。

```bash
npm run samples                 # 比对，全部一致时退出码 0
node samples/check.mjs --update # 用当前产物重写夹具
```

夹具是**紧凑单行**（`--update` 写的是归一化之后的那一份，不是 `cjcli` 打出来的缩进形态）。
`normalize()` 在比对前把标签之间的空白全部去掉，所以判据是「标签、属性、文本内容是否逐字节相同」，
**缩进怎么排不参与判定**；
属性值里的空白不受影响（`CommonUtil.XmlDecode` 把换行 / 制表符都写成了 `\n` / `\t` 转义）。
两端都在文件层读写、不经过控制台编码，中文注释不会在比对里被搅坏。

[samples/diag.mjs](samples/diag.mjs) 打印完整的诊断链：`cjcli` 只打最外层 `SyntaxException` 的位置，
真正的原因在内层异常里（`Token.Process` 会把任何异常包一层，可能包好几层）。

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
- 改完跑这四步（**再跑一遍上面八把尺子**）：

  ```bash
  xl check                     # 结构与规则检查（应该是 0 error / 0 warning）
  npm run build                # xl build && tsc
  npm run samples              # 对照；产物本该变化时用 --update 重写夹具
  npm run cases:run            # 台账必须仍然是空的
  npm run cases:boundaries     # 语句边界没被改坏（这条最容易在改收尾口径时踩到）
  ```

- **改「谁吃掉换行」之前先读 `declaration-common.xl.md` 里那一节**：
  本工程的 `LineWrap` 不只是排版，它还是语句边界本身。历史上 `DeclarationEnd`
  就是因为「吃掉它」而制造了一整类语句合并缺口。

- 产物头里的 `xl:sha256` 是源指纹：规范一变，产物就会重新生成。
