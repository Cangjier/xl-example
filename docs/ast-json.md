# AST JSON 出口

> 本文是 **token 树的第二个出口**（AST JSON）的规格：形状、字段表、与 XML 出口的同源关系，
> 以及与上游 Cangjie 的逐条差异。
> 解析层本身见 [README](../README.md) 与 [`typescript/parse-pipeline.xl.md`](../typescript/parse-pipeline.xl.md)。
>
> **树现在有三个出口**：XML（默认）、AST JSON（本文）、**TS 形状**
> （`cjcli --ts-ast`，规格见 [ts-ast.md](ts-ast.md)）。第三个出口挂在
> [`typescript/print-ast-common.xl.md`](../typescript/print-ast-common.xl.md) 的 `projectRoot` 上——
> 它读的是同一棵树的 `ToList()`，不是本文这份 JSON 的再加工。

---

## 1. 三个出口里的第二个

同一棵 token 树有三个出口：XML 与 AST JSON 挂在 `core/syntax/token.xl.md` 的 `Token` 上，
TS 形状挂在 `typescript/print-ast-common.xl.md` 的 `projectRoot` 上（core 不依赖 typescript，
所以第三个不在 `Token` 上）。

| 出口 | 入口 | 形态 | 给谁 |
| --- | --- | --- | --- |
| XML（默认） | `Token.ToXmlString()` / `Root.ToString()` | 元素树；`cjcli` 打印时按嵌套缩进 | 给人读 |
| AST JSON | `Token.ToDictionary()` / `ToList()` / `ToJsonString()` | 紧凑单行 JSON | 给下游程序读 |
| TS 形状 | `projectRoot()` / `ToJsonText()` | `ts.createSourceFile` 同形（`kind` 用名字 + `pos` / `end`） | 与 TS 原生 AST 对拍 / diff |

命令行侧由 `cjcli` 的 `--ast-json` 切换：

```bash
node build/ts/cjcli.js samples/hello.ts --ast-json            # 打到标准输出
node build/ts/cjcli.js samples/hello.ts --ast-json -o out.json  # 写文件
```

**换的是出口，不是解析**：`CjcliParse` 造出根单元之后就分叉，两个出口看的是同一棵树
（见 [cjcli.xl.md](../cjcli.xl.md) 的 `CjcliParseXml` / `CjcliParseAstJson`）。
JSON 不经过 `CommonUtil.FormatXml`：那个函数只认 XML。

**从代码里取**（不走命令行）：

```ts
const context = new TextContext(new Template());
context.Process(new TextDocument(source));
const json = context.Root.ToJsonString();  // 紧凑单行
const array = context.Root.ToList();       // 还没序列化的那一层（Map）
```

---

## 2. 形状

```
[{ "type": "Statement", "children": [ … ], "range": [0, 14] }, …]
```

| 约定 | 规则 |
| --- | --- |
| 顶层 | `Root.ToList()` 的返回值：**数组**（每个子单元一个节点），不是单个对象 |
| `type` | 运行时类型名，与 XML 标签名同源（两处都是 `this.constructor.name`） |
| 属性 | 键名与**该 token 在 XML 里的属性名同名**，值取同一个字段 |
| 值的类型 | JSON 用原生类型：`bool` 是真布尔，`int` 是真数字，`Array<string>` 用 `","` 拼成字符串（与 XML 属性逐字一致） |
| `children` | `Data` 非空时写，元素是子单元的 `ToDictionary()`；**为空时不写这个键** |
| `value` | 叶子节点（只有文本的元素）写它，**不写** `children` |
| 具名分段 | 有分段结构的节点不写扁平 `children`，而是每段一个键（值是该段的 `ToList()`），例如 `For` 的 `initial` / `compare` / `next` / `body` |
| `range` | 闭区间的 `[起始下标, 结束下标]`，**每个节点都有**：`ToList()` 用 `Token.WithRange()` 取子单元，而 `WithRange` 又递归处理它自己的子节点（见 [core/syntax/token.xl.md](../core/syntax/token.xl.md) 的 `WithRangeOf`）。`ToDictionary` 本身不带坐标——它是「形状」，与 XML 的标签/属性一一对应；坐标是给**投影成 TypeScript AST** 用的（TS 的每个节点都带 `pos` / `end`） |
| `range` 在 XML 侧 | **第 987 轮起，XML 出口的每个开标签上也印 `range="[起,止]"`**（`Token.RangeOf()`，与这一份同源）。两边**同一个名字、两种形状**：XML 属性只能是字符串，这一份是数组——所以 `cases:astjson` 那一项按**两个整数**比，不是按字符串比，而「数值必须同一个」照样是硬判据。`ToXmlString` 的开标签因此多一个属性，覆写了它的 token 各自补上这一格 |

几个直接例子（同一段源码的两个出口）：

```xml
<Statement>
  <Let fieldName="answer" modifiers="let" />
  <SymbolToken>=</SymbolToken>
  <Identifier>0</Identifier>
</Statement>
```

```json
{"type":"Statement","children":[{"type":"Let","fieldName":"answer","modifiers":"let"},{"type":"SymbolToken","value":"="},{"type":"Identifier","value":"0"}],"range":[0,14]}
```

### 为什么必须显式做 `Map` → 普通对象

`ToDictionary` 返回的是 `Map<string, any>`，而 `JSON.stringify` 对 `Map` **一律给 `{}`**
（条目不在自有可枚举属性里）。这不是可以绕过的风格问题，是**会静默打出 `[{},{},{}]` 的坑**——
`Token.ToJsonString` 因此先过一遍 `Token.ToPlain`（深转，不就地改），再 `JSON.stringify`。

---

## 3. 字段表

逐个 token 的键；「XML 属性」一列是 `ToXmlString` 里拼的那些属性，两列**必须同名**。

| token | JSON 的键 | 说明 |
| --- | --- | --- |
| 基类（`Token`） | `type` `children` | 容器节点的默认形状；`children` 仅在 `Data` 非空时写 |
| `BlockToken` 族（`Identifier` / `SymbolToken` / `ConstString` …） | `type` `value` | 文本块；`value` 是**未转义**的原文本（转义是 XML 出口自己的事） |
| `AreaAnnotation` / `LineAnnotation` / `PreprocessorDirectives` | `type` `value` | 同上，文本来自 `Tmp` |
| `Keyword` | `type` `value` | |
| `TypeDefine` | `type` + 可选 `questionAt` + `children` | `questionAt` 是这个类型标注前面那个 `?` 的**下标**（第 996 / 998 轮加）：`a?: T` 的 `?` 与 `:` 被词法并成**一格** `SymbolToken("?:")`、**不进 `Data`**，所以只有这一格记得住它；不是可选标注时**不写**。消费它的是 `Field` / `Parameter` / `MappedType` 的直出版——它们手上只有**子单元的视图**，所以这一格必须经字典递过去（XML 那边一个字不动） |
| `Bracket` | `type` `startBracket` `endBracket` + `children` | `Context`（类型位 / 值位判定）**不进 JSON**——它也不进 XML，那是解析期结论，不是节点形状 |
| `GenericType` | `type` `startBracket` `endBracket` + `children` | |
| `BinaryOperator` / `UnaryOperator` | `type` `op` + `children` | |
| `LogicalOperator` | `type` `op` + `children` | `op` 的值与 XML 同一处表达式：`this.op === "\|\|" ? "Or" : "And"` |
| `Class` | `type` `name` `extends` `implements` `modifiers` + 可选 `nameStart` `nameEnd` `modifierSpans` + `children` | `implements` 用 `","` 拼；名字有区间时才写那对下标 |
| `Enum` / `Function` / `MethodDeclaration` | `type` `name` `modifiers` + 可选 `nameStart` `nameEnd` `modifierSpans` + `children` | `Enum` / `MethodDeclaration` 写名字那对下标（`Function` 还没记，见下）；**字符串名记的是引号里那一段**（第 646 轮起，与 `Field` 同口径），投影按「左边一格是不是引号」判出 `StringLiteral`，不再回原文 `indexOf`；有修饰词时才写 `modifierSpans` |
| `Interface` | `type` `name` `extends` `export` `modifiers` + 可选 `nameStart` `nameEnd` `modifierSpans` + `children` | `export` 是真布尔（XML 出口的拼法）；`modifiers` 是投影要的那串文本，两者由**同一次**声明头扫描定出来 |
| `Namespace` | `type` `namespace` `modifiers` + 可选 `modifierSpans` `nameAt` `nameEnd` `nameRange` + `children` | `nameAt` / `nameEnd` 是**名字那一格**的整段闭区间（第 646 轮起三种名字共用）：引号模块名指向那个 `String` 单元（**含引号**）、`global` 指向那个词、标识符名（点号名的**第一段**）指向那一段；`nameRange` 是同一对下标的 `"起,止"` 拼法（第 645 轮），「声明名」那条共用路只读它——按「开头是引号 ⇒ 取引号之间」自己推文本区间，不再回原文 `indexOf`（点号名的全名在原文里根本不连续）。修饰词只写在外层那一格，点号名的里层不写（与 TS 的 `ModuleDeclaration` 一致） |
| `Field` | `type` `name` `modifiers` `nameStart` `nameEnd` + 可选 `nameAt` `nameRange` `modifierSpans` + `children` | 字符串名的 `nameStart` / `nameEnd` 是**引号里那一段**（第 645 轮），`nameAt` / `nameRange` 是名字那一格（含引号）；计算名 / 索引签名 / 私有名的两对下标按各自口径给 |
| `Method` | `type` `name` + `children` | 名字为空时**照样写 `name`**：与 `<Method name="">` 一致 |
| `Decorator` | `type` `name` + `children` | |
| `Signature` | `type` `kind` + `children` | |
| `TypeAssign` | `type` `alias` `modifiers` `nameStart` `nameEnd` + 可选 `modifierSpans` + `children` | |
| `Export` | `type` `From` `typeOnly` `namespace` `exported` + `children` | `From` 的兜底与 XML 同一处：`null` ⇒ `""` |
| `Import` | `type` `From` `typeOnly` `defaultImport` `namespace` `imported` + 可选 `typeWordAt` `namedBraceAt` + `children` | `From` 的兜底与 XML 同一处：`null` ⇒ `""`；`typeWordAt` 是 `import /*c*/ type { A }` 里那个 `type` 词的下标（第 875 轮）——投影拿它当 `ImportClause` 的起点，少了它就退回「回原文跳空白」、从注释起。`namedBraceAt` 是**具名子句那个左花括号**的下标（第 999 轮进字典）：投影拿它当 `NamedImports` 的起点并借它分出默认名，原来退回 `source.indexOf("{")`——`import /* { */ { A } from "m"` 会先命中注释里那个假括号。没有具名子句时**不写**。**两个都不进 XML** |
| `Let` | `type` + 三选一（`fieldName` / `arrayPattern` / `objectPattern`）+ `modifiers` `nameStart` `nameEnd` + 可选 `modifierSpans` + `children` | 分支判据与 XML 同一处 `LetType` 链；两个出口共用同一套形态，最后那个 `throw new Error("形态不成立")` 也各有一份 |
| `Label` | `type` `label` + `children` | 被标的语句**包在里面**（第 929 轮：`<Label label="outer"><While>…</While></Label>`，与 TS 的 `LabeledStatement` 同形）；还没包住时是自闭合标签，`children` 不写 |
| `NamespaceExport` | `type` `name` + 可选 `nameStart` `nameEnd` | 同上；名字那一格由 token 记下（第 646 轮），投影不再回原文 `indexOf` |
| `While` / `DoWhile` | `type` `compare` `body` | 两个键都是 `ToList()` 的数组；`DoWhile` 的键序是 `body` → `compare` |
| `For` | `type` `initial` `compare` `next` `body` `emptyBodyAt` `bodyBraceAt` `headerCloseAt` | `emptyBodyAt` 是**体为那条空语句（`for (…);`）时那个 `;` 的下标**，否则 `-1`；`bodyBraceAt` 是**体那个 `{` 的下标**（体不是花括号块时 `-1`）；`headerCloseAt` 是**头部那个 `)` 的下标**（第 634 轮加，`While` / `Foreach` 同名同义）——三格都让投影**直接读**，不再按原文重扫 |
| `Foreach` | `type` `define` `enumable` `body` `emptyBodyAt` | 同上（另有 `bodyBraceAt` `isForIn` `headerCloseAt`） |
| `While` / `DoWhile` 的位置格 | 同上 | `While` 有 `emptyBodyAt` `bodyBraceAt` `headerCloseAt`；`DoWhile` 有 `bodyBraceAt` `emptyBodyAt`（`do ; while (…)` 那个 `;`，第 635 轮加） |
| **体那一对花括号**（`For` / `Foreach` / `While` / `DoWhile` / `Lamda`） | 可选 `bodyBraceAt` + `bodyBraceRange` | `bodyBraceAt` 是**体那个 `{` 的下标**（体不是花括号块时不写）；`bodyBraceRange` 是 `"起,止"`（**闭区间**，第 641 轮加，`Lamda` 第 647 轮跟上；`Format` 与 `modifierSpans` 同一款）。**只有体是花括号块时才写**：两端都是**挂体那一刻**的事实，所以投影拿到它就**直接**给出那个 `Block`（空块 `while (c) {}` 也在内），连「找 `{` + 配对」都不走。体是单语句 / 空语句时这两格不写，那两档照旧读 `emptyBodyAt` / `headerCloseAt` |
| `Try` | `type` `body` + 可选 `catches` `finally` | `catches` 非空才写；`finally` 非 null 才写 |
| `Switch` | `type` `compare` `segments` + 可选 `bodyAt` | `segments` 是 `SwitchSegment` 数组；`bodyAt` 是**体那个 `{` 的下标**（第 634 轮那一族，不是 `switch` 时不写这一格），投影直接读，不再按原文重扫 |
| `IfSegment` | `type` `key` + 可选 `condition` `statement` `ifWordAt` | 两个可选段各自非 null 才写；`ifWordAt` 只在 `else if` 这一档写，是那个 `if` 的下标（投影直接读它，不再 `indexOf` 回原文找） |
| `TernaryOperator` | `type` `condition` `trueStatement` `falseStatement` + `questionPos` `colonPos` | 键名沿用上游（`condition` / `trueStatement` / `falseStatement`），比 XML 的 `condtion` 那个拼写更好认；`questionPos` / `colonPos` 是 `?` 与 `:` 两个标点的下标——投影直读它合成 `questionToken` / `colonToken`，不再回原文扫 |
| `Lamda` | `type` `async` + `parameters` `body` + 可选 `returnType` `bodyBraceAt` `bodyBraceRange` `arrowAt` | `async` 是真布尔，而且**只在 JSON 里有**（`<Lamda>` 不写这个属性，不收它就分不出 `async x => x` 与 `x => x`）；`body` 取 `ToList()`，与其它段一致；`arrowAt` 是那个 `=>` 的下标（投影合成 `equalsGreaterThanToken` 时直读） |
| `New` | `type` `name` `arguments` | `name` 装 `this.Type` 段——`type` 这个键已经被类型名占了，沿用上游的写法 |
| `SwitchSegment` | `type` `key` `colonPos` + `children` | 与 `IfSegment` 同款的分段节点；`colonPos` 是那个 `:` 的下标（投影直读，不再回原文 `lastIndexOf` 猜） |
| `SwitchSegment` / `IfCondition` / `ForBody`…（各分段类） | `type` + `children` | 分段类本身是普通容器 |
| `StaticBlock` | `type` + 可选 `braceAt` + `children` | 形状与基类那一份**只差 `braceAt` 一格**：体那个 `{` 的下标；`-1`（不是静态块）时**不写这一格**，与 `LineWrap` 那种自闭合节点同一口径。**它没有 XML 属性**，所以这一格只活在这一节里（见第 6 节第 2 条） |

### `nameStart` / `nameEnd`：声明名的位置

投影要合一个声明名节点（`class A` 的 `A`、`const f` 的 `f`、`type T = …` 的 `T`），而产物只把名字
记成**属性**（`name` / `fieldName` / `alias`）——位置是另一件事，属性里没有。这对下标就是位置的答案：

- **闭区间**，token 在认下名字那一刻写下（`SourceRange` 本来就在手上），所以它是**一份答案**，
  不是投影按文本猜的第二份；
- `-1` 表示这一档还没记（计算名那一档，以及 `Function` / `Decorator`）；
- 字符串名（`"a-b" = 2` / `declare module "m"`）记的是**引号里那一段**（第 645 轮）：投影拿它
  加一减一就推出 `StringLiteral` 的整段，不必回原文 `indexOf("a-b")` 猜（带转义时根本找不到）；
- 私有名 `#x` 的区间**从 `#` 算起**（名字就是 `#x` 一个 `PrivateIdentifier`）；
- **整段名字**另有一格 `nameAt` / `nameRange`（第 645 轮，见下）：那才是「名字是怎么写出来的」，
  引号名与普通名共用一格；
- 投影**优先读它**，没有才回原文 `indexOf` 猜（见 [`print-ast-common.xl.md`](../typescript/print-ast-common.xl.md) 的 `synthName`）。

### `nameAt` / `nameRange`：名字那一格的整段区间

`nameStart` / `nameEnd` 说的是**名字文本**（引号名不含引号），而「这个名字是怎么写出来的」
是另一件事——`nameRange` 是**那个单元自己的区间**（闭区间 `"起,止"`，与 `bodyBraceRange` 同一款）：
引号名的引号也在里面。投影的 `synthName` 拿到它就自己推出文本区间（开头是引号 ⇒ 取引号之间），
`memberNameOf` 也凭它断定这一格是 `StringLiteral` 还是 `Identifier`——**一处事实、两处直读**。

- `Field` / `Namespace` 在认下名字那一刻写下（第 645 轮）；计算名与索引签名不走这一格
  （它们各自成形），私有名 `#x` 也不走（那是**两格**，没有哪一格单独说得清 `#x`）；
- `Namespace` 的 `nameAt` / `nameEnd` 与它同一对下标（含引号），`nameRange` 是它们的 `"起,止"` 拼法。

### `modifierSpans`：修饰词各自的位置

修饰词同样**不进 `Data`**（折成 `modifiers` 属性），所以「哪个词在哪儿」是另一格：
`"起:止"` 用 `,` 连接、**闭区间**、与 `modifiers` **同序同长**；没有修饰词时不写这个键。

- 认下声明那一刻由 token 写下（`DeclarationModifierSpans` 一次取全；`Let` / `Namespace` 的修饰词是逐个攒的，就在那几处顺手记）；
- **声明头整段归声明自己**：`Class` / `Interface` / `Namespace` / `TypeAssign` 都用 `DeclarationStart`
  往前吃修饰词与装饰器——`@dec export interface I {}` 的 `InterfaceDeclaration` 从 `@` 起
  （TS 口径），装饰器是带子树的节点所以照旧进 `Data`，修饰词则折进这一格；
- 投影读它合成 `ExportKeyword` / `ReadonlyKeyword` 这些节点。**今天每个声明层 token 都写了这一格**，
  `addModifiers` 里那条「回原文 `indexOf` 猜」只剩给布尔属性那一档（`Lamda.async`）兜底。

**为什么 `Interface` 的 `modifiers` 与 `export` 并存**：两个出口要的是两种拼法——
XML 的开标签上写 `export="true"`（读 XML 的人按布尔读），投影要的是一串关键字词。
两样都由 `InterfaceBranch.Success` 那一次 `DeclarationModifiers` 走出来，不是两份近似。

---

## 4. 与上游 Cangjie 的差异

形状与 API 名称照上游的 `Cangjie.Core.Syntax.Token`：

| 项 | 上游 | 本工程 | 为什么 |
| --- | --- | --- | --- |
| 方法名 | `ToDictionary()` / `ToList()` | 同名同签名 | 同一个契约 |
| 根 | `code.analyse` 取 `Root.ToList()` | `Root.ToJsonString()` 内取 `Root.ToList()` | |
| 坐标 | `ToList` 给每个节点补 `range` | 同（只是本工程**递归铺满**：每个节点都有坐标，而不仅仅是 `ToList` 直接收的那一层——TS 的每个节点都带 `pos` / `end`，投影要用） | |
| 属性键名 | 一部分与 XML 漂开了（`MethodName` → `methodName`、`StartBracketChar` → `startBracketChar`、`IsSupportInterpolation` → `isSupportInterpolation`） | **一律与 XML 属性同名** | 本工程的口径是「两个出口说同一棵树」，同名才可校验 |
| 覆盖范围 | 只有 17 个类覆写 `ToDictionary`，其余走基类的 `{type, children}` | 同样只覆写「XML 里有属性」的类 | 与上游同一取舍 |
| 额外字段 | `String` 的 JSON 比 XML 多 5 个字段（`stringChar` / `rawIndent` / `isRawIndentFormated` …） | **不多写**：JSON 的键以 XML 属性为准 | 多写的键等于第二个事实来源 |
| 例外 | —— | JSON 比 XML **多几个键**，全是投影要直读的事实：`Lamda.async`（不收它就分不出 `async x => x` 与 `x => x`）、`For` / `Foreach` / `While` / `DoWhile` 的 `emptyBodyAt` 与 `bodyBraceAt`、那四者与 `IfSegment` / `Lamda` 的 `bodyBraceRange`（整对花括号）、`For` / `Foreach` / `While` 的 `headerCloseAt`、`Foreach` 的 `isForIn`、`IfSegment` 的 `ifWordAt`、`Lamda` 的 `arrowAt`、`Namespace` 的 `nameAt` / `nameEnd` / `nameRange`、`Field` 的 `nameAt` / `nameRange`、`Interface` 的 `modifiers`（XML 那边只有布尔 `export`）、`Import` 的 `typeWordAt` / `namedBraceAt`、`Switch` 的 `bodyAt`、`SwitchSegment` 的 `colonPos`、`TernaryOperator` 的 `questionPos` / `colonPos`、`TypeDefine` 的 `questionAt`（第 996 / 998 轮：`a?: T` 那个 `?` 的位置，`Field` / `Parameter` / `MappedType` 的直出版要直读它）、`StaticBlock` 的 `braceAt`，以及声明名的 `nameStart` / `nameEnd` 与修饰词各格的 `modifierSpans`（见下一节）。**这张表不是备忘、是判据的一半**：`cases:astjson` 的 ④ 按第 2–4 节有没有提到这个键名来判，所以**加一格坐标就要补一次这里**（第 884 轮补这一门时，这张表已经漂了 5 格） | 这些键都只有投影读；XML 读者要的坐标在子单元的 `SourceRange` 上 |
| 结构 bug | `TernaryOperator.ToDictionary()` 漏掉了 `type`（它没调基类也没自己写），于是 JSON 里出现没有类型名的节点 | **保留 `type`** | 那是缺陷，不是口径 |

**一句话**：形状、方法名、`range` 的层级与上游一致；**字段名以本工程自己的 XML 出口为准**——
因为上游的 XML 出口与本工程的 XML 出口本来就不是同一套名字（`MethodName` vs `name`、
`StartBracketChar` vs `startBracket`、「字面量块」叫 `Common` 而我们叫 `Identifier`），
JSON 跟着上游的键名只会让**同一棵树的两个出口在本工程内部对不上**。

---

## 5. 验收

**第 884 轮起这个出口有专属的尺子**：`npm run cases:astjson`
（[tests/parse/ast-json.mjs](../tests/parse/ast-json.mjs)，`npm run gates` 里的第 9 道门）。
它把本文的形状约定逐节点核成六项，**全 0 才退出码 0**：

| 判据 | 量的是什么 |
| --- | --- |
| ① 标签名 === `type` | 两个出口的类型名同源（都是 `this.constructor.name`） |
| ② XML 的每个属性都在 JSON 里**同名同值** | **这一条就是「两个出口说同一棵树」那句断言的本体**（属性值先按 `CommonUtil.XmlDecode` 的同一张表解回来再比） |
| ③ 每个节点都有合法的 `range` | 第 2 节那条「每个节点都有」（trivia 的越界单记一栏、不进退出码，与 `cases:tsast` 同口径） |
| ④ JSON 多出来的键**必须在本文第 2–4 节登记过** | 键名表只有本文一份；**加了一格坐标却忘了写规格会当场红** |
| ⑤ 命令行 === 库 API | `cjcli <文件> --ast-json` 的 stdout 逐字节等于 `Root.ToJsonString()` |
| ⑥ 不抛异常 | 解析 / 两个出口本身都不许抛 |

**④ 是这一门真正防的那件事**。这个出口的唯一事实来源是**同一个文件里的两处拼串**
（`ToXmlString` 与 `ToDictionary`），而「多出来的键」从前只靠本文那张例外表记着——
补这一门之前它已经漂了 **5 格**（`Import.typeWordAt`、`Switch.bodyAt`、`SwitchSegment.colonPos`、
`TernaryOperator.questionPos` / `colonPos`、`StaticBlock.braceAt`：`ToDictionary` 里写了、
本文一个字没提），这一轮把这 5 格补进第 3 / 4 节、判据同时上锁。

**语料是「用例 + `samples`」**，不吃 `node_modules` / `dist/ts`：`cases:shapes` 已经证明
用例侧是外部语料那 260 种形状签名的**超集**（444 种），而这一门量的「同一个节点两个出口对不对」
与形状种类一一对应；整份外部语料单进程要 ~37s、用例那一份只要 ~2s——没有理由为同一句话多花 35s 墙钟。

**新增的坐标字段走的是这条出口**（例如第 634 轮的 `headerCloseAt`）：`ToDictionary` 里写了、
投影才读得到（见第 3 节的字段表）——**同时也要写进那张表**，否则 ④ 会红。

---

## 6. 改这个出口时要动的地方

1. 给某个 token 加/改 XML 属性 → **同一个文件里**的 `ToDictionary` 必须一起改（两处同名同值）。
2. 加一个全新的 token 类 → 如果它有 XML 属性，就补 `ToDictionary`；**没有 XML 属性但有坐标格**
   （`StaticBlock` 的 `braceAt` 那种「只给投影读」的事实）**也要覆写**，而且**同样要写进第 3 节的字段表**
   ——这一档两个出口都看不出来，只有 ④ 会替你发现；两样都没有才不必覆写（基类形状已经对）。
3. 加一个分段结构 → 在 `ToDictionary` 里按段名写 `ToList()`，不要摊成 `children`。
4. 改完跑 **`npm run cases:astjson`**（见第 5 节）：`cjcli <文件>` 与 `cjcli <文件> --ast-json` 说的必须是
   同一棵树——**这一门替你核**（① 标签 / ② 属性 / ③ 坐标 / ⑤ 命令行 / ⑥ 抛异常），
   而**新加的坐标键还要写进第 3 节的字段表**，否则 ④ 红；`npm run samples` 只覆盖 TS 形状出口。
