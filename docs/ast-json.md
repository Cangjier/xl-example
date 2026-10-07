# AST JSON 出口

> 本文是 **token 树的第二个出口**（AST JSON）的规格：形状、字段表、与 XML 出口的同源关系，
> 以及与上游 Cangjie 的逐条差异。
> 解析层本身见 [README](../README.md) 与 [`typescript/parse-pipeline.xl.md`](../typescript/parse-pipeline.xl.md)。
>
> **树现在有三个出口**：XML（默认）、AST JSON（本文）、**TS 形状**
> （`cjcli --ts-ast`，规格见 [ts-ast.md](ts-ast.md)）。第三个出口挂在
> [`typescript/ts-ast.xl.md`](../typescript/ts-ast.xl.md) 的 `projectRoot` 上——
> 它读的是同一棵树的 `ToList()`，不是本文这份 JSON 的再加工。

---

## 1. 三个出口里的第二个

同一棵 token 树有三个出口：XML 与 AST JSON 挂在 `core/syntax/token.xl.md` 的 `Token` 上，
TS 形状挂在 `typescript/ts-ast.xl.md` 的 `projectRoot` 上（core 不依赖 typescript，
所以第三个不在 `Token` 上）。

| 出口 | 入口 | 形态 | 给谁 |
| --- | --- | --- | --- |
| XML（默认） | `Token.ToXmlString()` / `Root.ToString()` | 元素树；`cjcli` 打印时按嵌套缩进 | 给人读；测试夹具（`samples/*.expected.xml`） |
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
| `Bracket` | `type` `startBracket` `endBracket` + `children` | `Context`（类型位 / 值位判定）**不进 JSON**——它也不进 XML，那是解析期结论，不是节点形状 |
| `GenericType` | `type` `startBracket` `endBracket` + `children` | |
| `BinaryOperator` / `UnaryOperator` | `type` `op` + `children` | |
| `LogicalOperator` | `type` `op` + `children` | `op` 的值与 XML 同一处表达式：`this.op === "\|\|" ? "Or" : "And"` |
| `Class` | `type` `name` `extends` `implements` `modifiers` + `children` | `implements` 用 `","` 拼 |
| `Enum` / `Function` / `MethodDeclaration` | `type` `name` `modifiers` + `children` | |
| `Interface` | `type` `name` `extends` `export` + `children` | `export` 是真布尔 |
| `Namespace` | `type` `namespace` `modifiers` + `children` | |
| `Field` | `type` `name` `modifiers` + `children` | |
| `Method` | `type` `name` + `children` | 名字为空时**照样写 `name`**：与 `<Method name="">` 一致 |
| `Decorator` | `type` `name` + `children` | |
| `Signature` | `type` `kind` + `children` | |
| `TypeAssign` | `type` `alias` `modifiers` + `children` | |
| `Export` | `type` `From` `typeOnly` `namespace` `exported` + `children` | `From` 的兜底与 XML 同一处：`null` ⇒ `""` |
| `Import` | `type` `From` `typeOnly` `defaultImport` `namespace` `imported` + `children` | 同上 |
| `Let` | `type` + 三选一（`fieldName` / `arrayPattern` / `objectPattern`）+ `modifiers` + `children` | 分支判据与 XML 同一处 `LetType` 链；两个出口共用同一套形态，最后那个 `throw new Error("形态不成立")` 也各有一份 |
| `Label` | `type` `label` | 自闭合标签，无子单元 |
| `NamespaceExport` | `type` `name` | 同上 |
| `While` / `DoWhile` | `type` `compare` `body` | 两个键都是 `ToList()` 的数组；`DoWhile` 的键序是 `body` → `compare` |
| `For` | `type` `initial` `compare` `next` `body` `emptyBodyAt` | `emptyBodyAt` 是**体为那条空语句（`for (…);`）时那个 `;` 的下标**，否则 `-1`；投影侧直接读它，不再按原文重扫 |
| `Foreach` | `type` `define` `enumable` `body` `emptyBodyAt` | 同上 |
| `While` 的 `emptyBodyAt` | 同上 | `While` 行的补充：那个字段与 `For` / `Foreach` 同一个来由 |
| `Try` | `type` `body` + 可选 `catches` `finally` | `catches` 非空才写；`finally` 非 null 才写 |
| `Switch` | `type` `compare` `segments` | `segments` 是 `SwitchSegment` 数组 |
| `IfSegment` | `type` `key` + 可选 `condition` `statement` `ifWordAt` | 两个可选段各自非 null 才写；`ifWordAt` 只在 `else if` 这一档写，是那个 `if` 的下标（投影直接读它，不再 `indexOf` 回原文找） |
| `TernaryOperator` | `type` `condition` `trueStatement` `falseStatement` | 键名沿用上游（`condition` / `trueStatement` / `falseStatement`），比 XML 的 `condtion` 那个拼写更好认 |
| `Lamda` | `type` `async` + `parameters` `body` + 可选 `returnType` | `async` 是真布尔，而且**只在 JSON 里有**（`<Lamda>` 不写这个属性，不收它就分不出 `async x => x` 与 `x => x`）；`body` 取 `ToList()`，与其它段一致 |
| `New` | `type` `name` `arguments` | `name` 装 `this.Type` 段——`type` 这个键已经被类型名占了，沿用上游的写法 |
| `SwitchSegment` | `type` `key` + `children` | 与 `IfSegment` 同款的分段节点 |
| `SwitchSegment` / `IfCondition` / `ForBody`…（各分段类） | `type` + `children` | 分段类本身是普通容器 |

---

## 4. 与上游 Cangjie 的差异

形状与 API 名称照上游的 `Cangjie.Core.Syntax.Token`：

| 项 | 上游 | 本工程 | 为什么 |
| --- | --- | --- | --- |
| 方法名 | `ToDictionary()` / `ToList()` | 同名同签名 | 同一个契约 |
| 根 | `code.analyse` 取 `Root.ToList()` | `Root.ToJsonString()` 内取 `Root.ToList()` | |
| 坐标 | `ToList` 给每个节点补 `range` | 同（只是本工程**递归铺满**：每个节点都有坐标，而不仅仅是 `ToList` 直接收的那一层——TS 的每个节点都带 `pos` / `end`，投影要用） | |
| 属性键名 | 一部分与 XML 漂开了（`MethodName` → `methodName`、`StartBracketChar` → `startBracketChar`、`IsSupportInterpolation` → `isSupportInterpolation`） | **一律与 XML 属性同名** | 本工程的口径是「两个出口说同一棵树」，同名才可校验（钉它的 `cases:astjson` 已于第 200 轮随测试集收窄删除） |
| 覆盖范围 | 只有 17 个类覆写 `ToDictionary`，其余走基类的 `{type, children}` | 同样只覆写「XML 里有属性」的类 | 与上游同一取舍 |
| 额外字段 | `String` 的 JSON 比 XML 多 5 个字段（`stringChar` / `rawIndent` / `isRawIndentFormated` …） | **不多写**：JSON 的键以 XML 属性为准 | 多写的键等于第二个事实来源 |
| 例外 | —— | 只有一处 JSON 比 XML 多键：`Lamda.async` | 不收它就分不出 `async x => x` 与 `x => x`；它逐条登记在尺子的 `JSON_ONLY_ATTRS` 里，**没登记的「多一个键」照样会红** |
| 结构 bug | `TernaryOperator.ToDictionary()` 漏掉了 `type`（它没调基类也没自己写），于是 JSON 里出现没有类型名的节点 | **保留 `type`** | 那是缺陷，不是口径 |

**一句话**：形状、方法名、`range` 的层级与上游一致；**字段名以本工程自己的 XML 出口为准**——
因为上游的 XML 出口与本工程的 XML 出口本来就不是同一套名字（`MethodName` vs `name`、
`StartBracketChar` vs `startBracket`、「字面量块」叫 `Common` 而我们叫 `Identifier`），
JSON 跟着上游的键名只会让**同一棵树的两个出口在本工程内部对不上**。

---

## 5. 验收

> **第 200 轮起测试集只留 AST 相关的判据**（`cases:tsast` / `cases:tsast:cli` / `samples` / `cases:check`）：
> 下面这一节里的 `cases:astjson` 与 `cases:run` **已经随测试集收窄删除**（脚本在 git 历史里）。
> **这个出口本身仍然在**（`cjcli --ast-json`、`Token.ToDictionary` / `ToJsonString` 照旧），
> 只是当下没有一把「两个出口同源」的尺子在跑了——要重新钉它，把
> `tests/parse/ast-json.mjs`（第 200 轮之前的 HEAD）取回来即可。

| 判据 | 命令 | 口径 |
| --- | --- | --- |
| 两个出口同源（**已删**） | `npm run cases:astjson` | 逐文件取 `ToXmlString()` 与 `ToJsonString()`，折算成同一种形状后**逐节点**比对：节点名、属性、文本、子单元个数。不一致即退出码 1 |
| 尺子有牙（**已删**） | `npm run cases:astjson -- --self-test` | 故意改坏 JSON（节点名错位 / 内容被改 / 属性键被删）与 XML（标签名被改），四种都必须被抓到 |
| 回归用例（**已删**） | `npm run cases:run` | 用例期望值仍以 XML 为准；JSON 由 `cases:astjson` 全语料巡检 |

折算用的类型表（哪些键是布尔、哪些是数字）原先写在 `tests/parse/ast-json.mjs` 顶部，
它是**两边的契约**：表里写错一个字段，那把尺子立刻红，而不是悄悄放过。

---

## 6. 改这个出口时要动的地方

1. 给某个 token 加/改 XML 属性 → **同一个文件里**的 `ToDictionary` 必须一起改（两处同名同值）。
2. 加一个全新的 token 类 → 如果它有 XML 属性，就补 `ToDictionary`；没有属性就不必覆写（基类形状已经对）。
3. 加一个分段结构 → 在 `ToDictionary` 里按段名写 `ToList()`，不要摊成 `children`。
4. 改完**自己拿两个出口对一眼**（那一把尺子已删）：`cjcli <文件>` 与 `cjcli <文件> --ast-json`
   说的必须是同一棵树；`npm run samples` 现在只覆盖 TS 形状出口。
